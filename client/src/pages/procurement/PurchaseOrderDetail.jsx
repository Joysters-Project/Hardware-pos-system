import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, XCircle, CheckCircle, Truck, Package, Download, Mail, MessageSquare, Send, X, PackageCheck } from 'lucide-react';
import {
  usePurchaseOrder, useUpdatePurchaseOrder, useCancelPurchaseOrder,
  useExportPurchaseOrderPDF, useActiveSuppliers, useSendPOEmail,
  useUpdateItemComment, useSendItemCommentEmail, useReceiveOrderItem,
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
    updateComment.mutate({ poId, itemId: item.product_id, comment: draft.trim() || null });
    setEditing(false);
  };

  const handleSendEmail = (e) => {
    e.stopPropagation();
    if (!item.comment?.trim()) return;
    sendCommentEmail.mutate({ poId, itemId: item.product_id });
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

const TODAY = new Date().toISOString().split('T')[0];

function ReceiveItemModal({ item, po, onClose }) {
  const receiveMutation = useReceiveOrderItem();
  const [form, setForm] = useState({
    supplier_batch_number: '',
    expiry_date: '',
    received_date: TODAY,
    received_quantity: item.quantity,
  });
  const [error, setError] = useState('');

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.supplier_batch_number.trim()) return setError('Supplier Batch Number is required.');
    if (!form.expiry_date) return setError('Expiry Date is required.');
    if (!form.received_quantity || Number(form.received_quantity) <= 0) return setError('Received Quantity must be greater than zero.');

    try {
      await receiveMutation.mutateAsync({
        po_id:                 po.po_id,
        product_id:            item.product_id,
        supplier_batch_number: form.supplier_batch_number.trim(),
        expiry_date:           form.expiry_date,
        received_date:         form.received_date || TODAY,
        received_quantity:     Number(form.received_quantity),
      });
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to receive order.');
    }
  };

  return (
    <motion.div className="proc-modal-overlay"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}>
      <motion.div className="proc-modal" style={{ maxWidth: 500 }}
        initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.93, opacity: 0 }}
        onClick={e => e.stopPropagation()}>

        <div className="proc-modal-header" style={{ borderBottomColor: '#d4edda' }}>
          <h2 style={{ color: '#1d7e42', display: 'flex', alignItems: 'center', gap: 8 }}>
            <PackageCheck size={18} /> Receive Order Item
          </h2>
          <button className="proc-modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="proc-modal-body">
            {/* Read-only info */}
            <div style={{ background: '#f8fdf9', border: '1px solid #d4edda', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: '#666', fontWeight: 600 }}>Product</span>
                <span style={{ fontWeight: 700, color: '#2c2c2c' }}>{item.product?.product_name || `#${item.product_id}`}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: '#666', fontWeight: 600 }}>PO Number</span>
                <span style={{ fontWeight: 700, color: '#8b3a3a', fontFamily: 'monospace' }}>{po.po_number}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: '#666', fontWeight: 600 }}>Ordered Quantity</span>
                <span style={{ fontWeight: 700 }}>{item.quantity}</span>
              </div>
            </div>

            {error && (
              <div className="proc-error-banner" style={{ marginBottom: '0.85rem' }}>{error}</div>
            )}

            <div className="proc-form-grid">
              <div className="proc-field proc-field-full">
                <label>Supplier Batch Number <span className="req">*</span></label>
                <input
                  className="proc-input"
                  placeholder="e.g. AP240701, LOT-2026-015"
                  value={form.supplier_batch_number}
                  onChange={e => set('supplier_batch_number', e.target.value)}
                  autoFocus
                />
              </div>

              <div className="proc-field">
                <label>Received Quantity <span className="req">*</span></label>
                <input
                  className="proc-input"
                  type="number" min="1" max={item.quantity}
                  value={form.received_quantity}
                  onChange={e => set('received_quantity', e.target.value)}
                />
              </div>

              <div className="proc-field">
                <label>Received Date <span className="req">*</span></label>
                <input
                  className="proc-input"
                  type="date"
                  value={form.received_date}
                  onChange={e => set('received_date', e.target.value)}
                />
              </div>

              <div className="proc-field proc-field-full">
                <label>Expiry Date <span className="req">*</span></label>
                <input
                  className="proc-input"
                  type="date"
                  value={form.expiry_date}
                  onChange={e => set('expiry_date', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="proc-modal-footer">
            <button type="button" className="proc-btn-outline" onClick={onClose}>Cancel</button>
            <motion.button type="submit" className="proc-btn-receive"
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              disabled={receiveMutation.isPending}>
              <PackageCheck size={14} />
              {receiveMutation.isPending ? 'Receiving…' : 'Receive'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

export default function PurchaseOrderDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason,    setCancelReason]    = useState('');
  const [receiveItem,     setReceiveItem]     = useState(null);

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
                <span style={{ fontSize: '0.82rem', color: '#1d7e42', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <PackageCheck size={15} /> Use the <strong>Receive</strong> button on each line item below.
                </span>
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
                    {po.status === 'Shipped' && <th style={{ textAlign: 'center' }}>Receive</th>}
                  </tr>
                </thead>
                <tbody>
                  {(po.po_items || []).length === 0 ? (
                    <tr><td colSpan={po.status === 'Shipped' ? 7 : 6} className="proc-empty">No items found.</td></tr>
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
                      {po.status === 'Shipped' && (
                        <td style={{ textAlign: 'center' }}>
                          <motion.button
                            className="proc-btn-receive"
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', gap: 5 }}
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            onClick={() => setReceiveItem(item)}>
                            <PackageCheck size={13} /> Receive
                          </motion.button>
                        </td>
                      )}
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

        {/* Receive Item Modal */}
        {receiveItem && (
          <ReceiveItemModal
            item={receiveItem}
            po={po}
            onClose={() => setReceiveItem(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
