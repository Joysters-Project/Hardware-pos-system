import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, XCircle, CheckCircle, Truck, Package, Download, Mail, MessageSquare, Send, X } from 'lucide-react';
import {
  usePurchaseOrder, useUpdatePurchaseOrder, useCancelPurchaseOrder,
  useExportPurchaseOrderPDF, useActiveSuppliers, useSendPOEmail,
  useUpdateItemComment, useSendItemCommentEmail,
} from '@/services/procurementApi';
import '@/styles/Procurement.css';

const STEPS = ['Pending', 'Approved', 'Shipped', 'Received'];

function StatusStepper({ status }) {
  const idx = STEPS.indexOf(status);
  if (status === 'Cancelled') return (
    <div className="proc-stepper-cancelled">
      <XCircle size={20} /> Order Cancelled — cannot be modified
    </div>
  );
  return (
    <div className="proc-stepper">
      {STEPS.map((step, i) => (
        <div key={step} className={`proc-step ${i < idx ? 'done' : i === idx ? 'current' : 'pending'}`}>
          <div className="proc-step-dot">{i < idx ? '✓' : i + 1}</div>
          <div className="proc-step-label">{step}</div>
          {i < STEPS.length - 1 && <div className="proc-step-line" />}
        </div>
      ))}
    </div>
  );
}

function ItemCommentCell({ item, poId, supplierHasEmail }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(item.comment || '');
  const updateComment      = useUpdateItemComment();
  const sendCommentEmail   = useSendItemCommentEmail();

  const save = () => {
    updateComment.mutate({ poId, itemId: item.id, comment: draft.trim() || null });
    setEditing(false);
  };

  const handleSendEmail = (e) => {
    e.stopPropagation();
    if (!item.comment?.trim()) return;
    sendCommentEmail.mutate({ poId, itemId: item.id });
  };

  if (editing) {
    return (
      <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
        <textarea
          autoFocus
          className="proc-input proc-textarea"
          style={{ fontSize: '0.78rem', minHeight: '52px', resize: 'vertical', padding: '5px 8px' }}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Add a comment for this item..."
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save(); } }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {/* Save to DB */}
          <motion.button className="proc-icon-btn view" style={{ width: 26, height: 26 }}
            whileTap={{ scale: 0.9 }} onClick={save}
            disabled={updateComment.isPending} title="Save comment">
            <CheckCircle size={11} />
          </motion.button>
          {/* Cancel edit */}
          <motion.button className="proc-icon-btn delete" style={{ width: 26, height: 26 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => { setDraft(item.comment || ''); setEditing(false); }}
            title="Cancel">
            <X size={11} />
          </motion.button>
        </div>
      </div>
    );
  }

  return (
<<<<<<< HEAD
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      {/* Comment text — click to edit */}
      <div style={{ flex: 1, cursor: 'pointer', minWidth: 0 }} onClick={() => setEditing(true)}>
        {item.comment ? (
          <span style={{
            fontSize: '0.8rem', color: '#555', fontStyle: 'italic',
            display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {item.comment}
          </span>
        ) : (
          <span style={{ fontSize: '0.78rem', color: '#bbb' }}>Add comment…</span>
        )}
      </div>

      {/* Send comment email to supplier — only shown when comment exists and supplier has email */}
      {item.comment?.trim() && supplierHasEmail && (
        <motion.button
          className="proc-icon-btn view"
          style={{ width: 26, height: 26, flexShrink: 0 }}
          whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
          onClick={handleSendEmail}
          disabled={sendCommentEmail.isPending}
          title={`Email this note to supplier`}>
          {sendCommentEmail.isPending
            ? <span style={{ fontSize: '9px' }}>…</span>
            : <Send size={11} />}
        </motion.button>
      )}

      {/* Edit icon */}
      <motion.button
        className="proc-icon-btn edit"
        style={{ width: 26, height: 26, flexShrink: 0 }}
        whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
        onClick={() => setEditing(true)}
        title="Edit comment">
        <MessageSquare size={11} />
      </motion.button>
    </div>
  );
}

export default function PurchaseOrderDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason,    setCancelReason]    = useState('');

  const { data: po, isLoading } = usePurchaseOrder(id);
  const { data: suppliers = [] } = useActiveSuppliers();
  const updateMutation  = useUpdatePurchaseOrder();
  const cancelMutation  = useCancelPurchaseOrder();
  const exportMutation  = useExportPurchaseOrderPDF();
  const emailMutation   = useSendPOEmail();

  const supplier   = suppliers.find(s => s.supplier_id === po?.supplier_id) || po?.supplier;
  const fmt        = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
  const isOverdue  = po?.expected_delivery && !['Received','Cancelled'].includes(po?.status) && new Date(po.expected_delivery) < new Date();

  const handleStatus = (status) => updateMutation.mutateAsync({ id: parseInt(id), data: { status } });
  const handleCancel = async () => {
    if (!cancelReason.trim()) return;
    await cancelMutation.mutateAsync({ id: parseInt(id), notes: cancelReason });
    setShowCancelModal(false);
    setCancelReason('');
  };

  if (isLoading) return <div className="proc-container"><p className="proc-empty">Loading...</p></div>;
  if (!po)       return <div className="proc-container"><p className="proc-empty">Purchase order not found.</p></div>;

  const supplierHasEmail = !!(supplier?.email || po?.supplier?.email);

  return (
    <div className="proc-container">

      {/* Header */}
      <motion.div className="proc-header"
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <motion.button className="proc-back-btn" onClick={() => navigate('/procurement/orders')}
            whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}>
            <ArrowLeft size={16} />
          </motion.button>
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {po.po_number}
              <span className={`proc-status-pill ${po.status?.toLowerCase()}`}>{po.status}</span>
              {isOverdue && <span className="proc-status-pill cancelled">Overdue</span>}
            </h1>
            <p>Purchase Order Details</p>
          </div>
        </div>
        <div className="proc-header-actions">
          {/* Send to Supplier Email */}
          <motion.button className="proc-btn-outline"
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => emailMutation.mutate(id)}
            disabled={emailMutation.isPending || !supplierHasEmail}
            title={!supplierHasEmail ? 'Supplier has no email configured' : 'Send PO to supplier via email'}>
            <Mail size={14} />
            {emailMutation.isPending ? 'Sending…' : 'Send to Supplier'}
          </motion.button>
          <motion.button className="proc-btn-outline"
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => exportMutation.mutate(id)} disabled={exportMutation.isPending}>
            <Download size={14} /> {exportMutation.isPending ? 'Exporting…' : 'Export PDF'}
          </motion.button>
        </div>
      </motion.div>

      {/* Status Stepper */}
      <motion.div className="proc-card"
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="proc-card-header"><h2>Order Status</h2></div>
        <div className="proc-card-body">
          <StatusStepper status={po.status} />
          {!['Received','Cancelled'].includes(po.status) && (
            <div className="proc-action-bar">
              <span style={{ fontWeight: 700, color: '#2c2c2c', fontSize: '0.875rem' }}>Actions:</span>
              {po.status === 'Pending' && (
                <motion.button className="proc-btn-approve" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  onClick={() => handleStatus('Approved')} disabled={updateMutation.isPending}>
                  <CheckCircle size={14} /> {updateMutation.isPending ? '…' : 'Approve Order'}
                </motion.button>
              )}
              {po.status === 'Approved' && (
                <motion.button className="proc-btn-ship" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  onClick={() => handleStatus('Shipped')} disabled={updateMutation.isPending}>
                  <Truck size={14} /> {updateMutation.isPending ? '…' : 'Mark as Shipped'}
                </motion.button>
              )}
              {po.status === 'Shipped' && (
                <motion.button className="proc-btn-receive" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  onClick={() => handleStatus('Received')} disabled={updateMutation.isPending}>
                  <Package size={14} /> {updateMutation.isPending ? '…' : 'Mark as Received'}
                </motion.button>
              )}
              <motion.button className="proc-btn-cancel-action" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                onClick={() => setShowCancelModal(true)} disabled={cancelMutation.isPending}>
                <XCircle size={14} /> Cancel Order
              </motion.button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Details Grid */}
      <div className="proc-detail-grid">
        <div className="proc-detail-main">

          {/* Order Info */}
          <motion.div className="proc-card"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <div className="proc-card-header"><h2>Order Information</h2></div>
            <div className="proc-card-body">
              <div className="proc-info-grid">
                {[
                  ['PO Number',        <span className="proc-po-number">{po.po_number}</span>],
                  ['PO Date',          fmt(po.po_date)],
                  ['Expected Delivery', <span style={{ color: isOverdue ? '#c62828' : '#2c2c2c', fontWeight: isOverdue ? 700 : 400 }}>
                    {fmt(po.expected_delivery)}{isOverdue ? ' ⚠ Overdue' : ''}
                  </span>],
                  ['Actual Delivery',  fmt(po.actual_delivery_date)],
                  ['Supplier',         supplier?.supplier_name || '—'],
                  ['Supplier Email',   supplier?.email
                    ? <a href={`mailto:${supplier.email}`} style={{ color: '#8b3a3a' }}>{supplier.email}</a>
                    : <span style={{ color: '#bbb' }}>Not configured</span>],
                  ['Supplier Phone',   supplier?.phone || '—'],
                ].map(([label, value]) => (
                  <div className="proc-info-row" key={label}>
                    <span className="proc-info-label">{label}</span>
                    <span className="proc-info-value">{value}</span>
                  </div>
                ))}
              </div>
              {po.notes && (
                <div className="proc-notes-box">
                  <span className="proc-info-label">Notes / Cancellation Reason</span>
                  <p style={{ color: po.status === 'Cancelled' ? '#c62828' : '#555' }}>{po.notes}</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Line Items with Comments */}
          <motion.div className="proc-card"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="proc-card-header">
              <h2>Line Items</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="proc-badge-count">{po.po_items?.length || 0} items</span>
                <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MessageSquare size={11} /> Click to edit · <Send size={11} /> to email supplier
                </span>
              </div>
            </div>
            <div className="proc-table-wrap">
              <table className="proc-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Product</th>
                    <th style={{ textAlign: 'center' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Unit Price</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                    <th>Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {(po.po_items || []).length === 0 ? (
                    <tr><td colSpan="6" className="proc-empty">No items found.</td></tr>
                  ) : (po.po_items || []).map((item, i) => (
                    <motion.tr key={item.id || i}
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}>
                      <td><span className="proc-row-num">{i + 1}</span></td>
                      <td className="proc-name-cell">{item.product?.product_name || `Product #${item.product_id}`}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right' }}>LKR {Number(item.unit_price).toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}><strong>LKR {Number(item.total_price).toFixed(2)}</strong></td>
                      <td style={{ minWidth: '160px', maxWidth: '220px' }}>
                        <ItemCommentCell item={item} poId={parseInt(id)} supplierHasEmail={supplierHasEmail} />
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="proc-detail-sidebar">
          <motion.div className="proc-card"
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.18 }}>
            <div className="proc-card-header"><h2>Order Summary</h2></div>
            <div className="proc-card-body">
              <div className="proc-supplier-chip">
                <div className="proc-supplier-chip-label">Supplier</div>
                <div className="proc-supplier-chip-name">{supplier?.supplier_name || '—'}</div>
                {supplier?.email && (
                  <div className="proc-supplier-chip-sub" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Mail size={11} /> {supplier.email}
                  </div>
                )}
                {supplier?.phone && <div className="proc-supplier-chip-sub">{supplier.phone}</div>}
              </div>

              <div className="proc-summary-rows">
                <div className="proc-summary-row">
                  <span className="proc-summary-label">Total Items</span>
                  <span className="proc-summary-value">{po.po_items?.length || 0}</span>
                </div>
                <div className="proc-summary-row">
                  <span className="proc-summary-label">Total Quantity</span>
                  <span className="proc-summary-value">
                    {(po.po_items || []).reduce((s, i) => s + i.quantity, 0)}
                  </span>
                </div>
              </div>

              <div className="proc-grand-total">
                <span>Grand Total</span>
                <strong>LKR {Number(po.total_amount).toFixed(2)}</strong>
              </div>

              {/* Send email CTA in sidebar */}
              {supplierHasEmail && po.status !== 'Cancelled' && (
                <motion.button className="proc-btn-outline" style={{ width: '100%', justifyContent: 'center', marginTop: '0.75rem', gap: '8px' }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={() => emailMutation.mutate(id)}
                  disabled={emailMutation.isPending}>
                  <Mail size={14} />
                  {emailMutation.isPending ? 'Sending…' : 'Email PO to Supplier'}
                </motion.button>
              )}

              {/* Timeline */}
              <div className="proc-timeline">
                <div className="proc-timeline-title">Timeline</div>
                <div className="proc-timeline-item blue">
                  <div className="proc-timeline-dot" />
                  <div><div className="proc-timeline-label">Created</div><div className="proc-timeline-date">{fmt(po.po_date)}</div></div>
                </div>
                {po.expected_delivery && (
                  <div className={`proc-timeline-item ${isOverdue ? 'red' : 'amber'}`}>
                    <div className="proc-timeline-dot" />
                    <div><div className="proc-timeline-label">Expected Delivery</div><div className="proc-timeline-date">{fmt(po.expected_delivery)}</div></div>
                  </div>
                )}
                {po.actual_delivery_date && (
                  <div className="proc-timeline-item green">
                    <div className="proc-timeline-dot" />
                    <div><div className="proc-timeline-label">Delivered</div><div className="proc-timeline-date">{fmt(po.actual_delivery_date)}</div></div>
                  </div>
                )}
                {po.status === 'Cancelled' && (
                  <div className="proc-timeline-item red">
                    <div className="proc-timeline-dot" />
                    <div><div className="proc-timeline-label" style={{ color: '#c62828' }}>Cancelled</div>{po.notes && <div className="proc-timeline-date">{po.notes}</div>}</div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Cancel Modal */}
      <AnimatePresence>
        {showCancelModal && (
          <motion.div className="proc-modal-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowCancelModal(false)}>
            <motion.div className="proc-modal"
              initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.93, opacity: 0 }}
              onClick={e => e.stopPropagation()}>
              <div className="proc-modal-header">
                <h2>Cancel Purchase Order</h2>
                <button className="proc-modal-close" onClick={() => setShowCancelModal(false)}><X size={16} /></button>
              </div>
              <div className="proc-modal-body">
                <p style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>
                  Are you sure you want to cancel <strong>{po.po_number}</strong>? This cannot be undone.
                </p>
                {supplierHasEmail && (
                  <p style={{ color: '#8b3a3a', fontSize: '13px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Mail size={13} /> A cancellation email will be sent automatically to the supplier.
                  </p>
                )}
                <div className="proc-field">
                  <label>Cancellation Reason <span className="req">*</span></label>
                  <textarea className="proc-input proc-textarea" rows={3} value={cancelReason}
                    onChange={e => setCancelReason(e.target.value)}
                    placeholder="Enter reason for cancellation…" />
                </div>
              </div>
              <div className="proc-modal-footer">
                <button className="proc-btn-outline" onClick={() => setShowCancelModal(false)}>Keep Order</button>
                <motion.button className="proc-btn-danger"
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={handleCancel}
                  disabled={!cancelReason.trim() || cancelMutation.isPending}>
                  {cancelMutation.isPending ? 'Cancelling…' : 'Cancel Order'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
=======
    <PageTransition>
      <div className="space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-4">
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
              <Link to="/procurement">
                <Button variant="outline" size="icon" className="shadow-md hover:shadow-lg">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
            </motion.div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                  {po.po_number}
                </h1>
                <StatusBadge status={po.status} />
                {isOverdue() && (
                  <Badge variant="destructive" className="gap-1">
                    <Truck className="h-3 w-3" />
                    Overdue
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-slate-500">Purchase Order Details</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => exportPDFMutation.mutate(id)}
              disabled={exportPDFMutation.isPending}
            >
              {exportPDFMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Export PDF
            </Button>
          </div>
        </motion.div>

        {/* Status Stepper */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 shadow-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Order Status
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <StatusStepper currentStatus={po.status} />
              
              {/* Action Buttons */}
              {po.status !== 'Received' && po.status !== 'Cancelled' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-8 pt-6 border-t border-slate-200"
                >
                  <div className="flex flex-col gap-4">
                    <h3 className="text-lg font-semibold text-slate-800">Order Actions</h3>
                    <div className="flex flex-wrap gap-3">
                      {po.status === 'Pending' || po.status === 'Open' ? (
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button
                            onClick={() => handleStatusUpdate('Approved')}
                            className="gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/25"
                            disabled={updateMutation.isPending}
                          >
                            {updateMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                            Approve Order
                          </Button>
                        </motion.div>
                      ) : null}

                      {po.status === 'Approved' && (
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button
                            onClick={() => handleStatusUpdate('Shipped')}
                            className="gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-lg shadow-amber-500/25"
                            disabled={updateMutation.isPending}
                          >
                            {updateMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Truck className="h-4 w-4" />
                            )}
                            Mark as Shipped
                          </Button>
                        </motion.div>
                      )}

                      {po.status === 'Shipped' && (
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button
                            onClick={() => handleStatusUpdate('Received')}
                            className="gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/25"
                            disabled={updateMutation.isPending}
                          >
                            {updateMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Package className="h-4 w-4" />
                            )}
                            Mark as Received
                          </Button>
                        </motion.div>
                      )}

                      {/* Cancel Order Button */}
                      {po.status !== 'Cancelled' && po.status !== 'Received' && (
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button
                            variant="outline"
                            onClick={() => setShowCancelDialog(true)}
                            className="gap-2 text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400 shadow-md"
                            disabled={cancelMutation.isPending}
                          >
                            <XCircle className="h-4 w-4" />
                            Cancel Order
                          </Button>
                        </motion.div>
                      )}

                      {/* Export PDF Button */}
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button
                          variant="outline"
                          onClick={() => exportPDFMutation.mutate(id)}
                          className="gap-2 border-slate-300 hover:bg-slate-50 hover:border-slate-400 shadow-md"
                          disabled={exportPDFMutation.isPending}
                        >
                          {exportPDFMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                          Export PDF
                        </Button>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* PO Details Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-0 shadow-xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Order Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="space-y-1">
                      <p className="text-sm text-slate-500 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        PO Number
                      </p>
                      <p className="font-mono font-semibold text-slate-800">{po.po_number}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-slate-500 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        PO Date
                      </p>
                      <p className="font-semibold text-slate-800">{formatDate(po.po_date)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-slate-500 flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        Expected Delivery
                      </p>
                      <p className={`font-semibold ${isOverdue() ? 'text-red-600' : 'text-slate-800'}`}>
                        {formatDate(po.expected_delivery)}
                        {isOverdue() && <span className="ml-2 text-xs">(Overdue)</span>}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-slate-500 flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Supplier
                      </p>
                      <p className="font-semibold text-slate-800">
                        {supplier?.supplier_name || 'Unknown'}
                      </p>
                      <p className="text-sm text-slate-500">{supplier?.contact}</p>
                    </div>
                  </div>
                  
                  {po.notes && (
                    <div className="mt-6 pt-6 border-t border-slate-200">
                      <p className="text-sm text-slate-500 mb-2">Notes</p>
                      <p className="text-slate-700">{po.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Line Items */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border-0 shadow-xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Line Items
                    </CardTitle>
                    <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                      {po.items?.length || 0} item{(po.items?.length || 0) !== 1 ? 's' : ''}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {po.items && po.items.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/50">
                          <TableHead className="font-semibold">#</TableHead>
                          <TableHead className="font-semibold">Product</TableHead>
                          <TableHead className="font-semibold text-center">Quantity</TableHead>
                          <TableHead className="font-semibold text-right">Unit Price</TableHead>
                          <TableHead className="font-semibold text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {po.items.map((item, index) => (
                          <tr key={item.id || index} className="border-b border-slate-100 hover:bg-slate-50/50">
                            <td className="py-3">
                              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-semibold">
                                {index + 1}
                              </span>
                            </td>
                            <td className="py-3">
                              <p className="font-medium text-slate-800">Product #{item.product_id}</p>
                            </td>
                            <td className="py-3 text-center font-mono">{item.quantity}</td>
                            <td className="py-3 text-right font-mono">{formatCurrency(item.unit_price)}</td>
                            <td className="py-3 text-right font-mono font-semibold">{formatCurrency(item.total_price)}</td>
                          </tr>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="p-8 text-center text-slate-500">
                      No items found for this order.
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="sticky top-8"
            >
              <Card className="border-0 shadow-xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* Supplier Card */}
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-blue-100 p-2">
                        <Building2 className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Supplier</p>
                        <p className="font-semibold text-slate-800">{supplier?.supplier_name || 'Unknown'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Total Items</span>
                      <span className="font-semibold">{po.items?.length || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Total Quantity</span>
                      <span className="font-semibold">
                        {po.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0}
                      </span>
                    </div>
                  </div>

                  {/* Grand Total */}
                  <div className="pt-4 border-t border-slate-200">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 font-medium">Grand Total</span>
                      <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        {formatCurrency(po.total_amount)}
                      </span>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="pt-4 border-t border-slate-200">
                    <p className="text-sm font-semibold text-slate-700 mb-3">Order Timeline</p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <div>
                          <p className="text-sm font-medium">Created</p>
                          <p className="text-xs text-slate-500">{formatDate(po.po_date)}</p>
                        </div>
                      </div>
                      {po.expected_delivery && (
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${isOverdue() ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                          <div>
                            <p className="text-sm font-medium">Expected Delivery</p>
                            <p className="text-xs text-slate-500">{formatDate(po.expected_delivery)}</p>
                          </div>
                        </div>
                      )}
                      {po.actual_delivery_date && (
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                          <div>
                            <p className="text-sm font-medium">Delivered</p>
                            <p className="text-xs text-slate-500">{formatDate(po.actual_delivery_date)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Cancel Order Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <XCircle className="h-5 w-5" />
                Cancel Purchase Order
              </CardTitle>
              <CardDescription>
                Are you sure you want to cancel purchase order {po.po_number}? This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Cancellation Reason (Optional)</label>
                <Textarea
                  value={cancelNotes}
                  onChange={(e) => setCancelNotes(e.target.value)}
                  placeholder="Enter reason for cancellation..."
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCancelDialog(false);
                    setCancelNotes('');
                  }}
                  className="flex-1"
                >
                  Keep Order
                </Button>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    await cancelMutation.mutateAsync({
                      id: parseInt(id),
                      notes: cancelNotes.trim() || undefined
                    });
                    setShowCancelDialog(false);
                    setCancelNotes('');
                  }}
                  disabled={cancelMutation.isPending}
                  className="flex-1"
                >
                  {cancelMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Cancel Order
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageTransition>
  );
}

export default PurchaseOrderDetail;
>>>>>>> ee63d19 (all files are staged)
