import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, XCircle, CheckCircle, Truck, Package, Download } from 'lucide-react';
import { usePurchaseOrder, useUpdatePurchaseOrder, useCancelPurchaseOrder, useExportPurchaseOrderPDF, useActiveSuppliers } from '@/services/procurementApi';
import '@/styles/Procurement.css';

const STEPS = ['Pending', 'Approved', 'Shipped', 'Received'];

function StatusStepper({ status }) {
  const idx = STEPS.indexOf(status);
  const cancelled = status === 'Cancelled';
  if (cancelled) return (
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

function PurchaseOrderDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason,    setCancelReason]    = useState('');

  const { data: po, isLoading } = usePurchaseOrder(id);
  const { data: suppliers = [] } = useActiveSuppliers();
  const updateMutation  = useUpdatePurchaseOrder();
  const cancelMutation  = useCancelPurchaseOrder();
  const exportMutation  = useExportPurchaseOrderPDF();

  const supplier = suppliers.find(s => s.supplier_id === po?.supplier_id) || po?.supplier;
  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
  const isOverdue = po?.expected_delivery && !['Received','Cancelled'].includes(po.status) && new Date(po.expected_delivery) < new Date();

  const handleStatus = (status) => updateMutation.mutateAsync({ id: parseInt(id), data: { status } });
  const handleCancel = async () => {
    if (!cancelReason.trim()) return;
    await cancelMutation.mutateAsync({ id: parseInt(id), notes: cancelReason });
    setShowCancelModal(false);
    setCancelReason('');
  };

  if (isLoading) return <div className="proc-container"><p className="proc-empty">Loading...</p></div>;
  if (!po)       return <div className="proc-container"><p className="proc-empty">Purchase order not found.</p></div>;

  return (
    <div className="proc-container">
      {/* Header */}
      <div className="proc-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="proc-back-btn" onClick={() => navigate('/procurement/orders')}><ArrowLeft size={16} /></button>
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {po.po_number}
              <span className={`proc-status-pill ${po.status?.toLowerCase()}`}>{po.status}</span>
              {isOverdue && <span className="proc-status-pill cancelled">Overdue</span>}
            </h1>
            <p>Purchase Order Details</p>
          </div>
        </div>
        <div className="proc-header-actions">
          <button className="proc-btn-outline" onClick={() => exportMutation.mutate(id)} disabled={exportMutation.isPending}>
            <Download size={14} /> {exportMutation.isPending ? 'Exporting...' : 'Export PDF'}
          </button>
        </div>
      </div>

      {/* Status Stepper */}
      <div className="proc-card">
        <div className="proc-card-header"><h2>Order Status</h2></div>
        <div className="proc-card-body">
          <StatusStepper status={po.status} />

          {!['Received','Cancelled'].includes(po.status) && (
            <div className="proc-action-bar">
              <span style={{ fontWeight: 700, color: '#2c2c2c' }}>Order Actions:</span>
              {(po.status === 'Pending') && (
                <button className="proc-btn-approve" onClick={() => handleStatus('Approved')} disabled={updateMutation.isPending}>
                  <CheckCircle size={14} /> {updateMutation.isPending ? '...' : 'Approve Order'}
                </button>
              )}
              {po.status === 'Approved' && (
                <button className="proc-btn-ship" onClick={() => handleStatus('Shipped')} disabled={updateMutation.isPending}>
                  <Truck size={14} /> {updateMutation.isPending ? '...' : 'Mark as Shipped'}
                </button>
              )}
              {po.status === 'Shipped' && (
                <button className="proc-btn-receive" onClick={() => handleStatus('Received')} disabled={updateMutation.isPending}>
                  <Package size={14} /> {updateMutation.isPending ? '...' : 'Mark as Received'}
                </button>
              )}
              <button className="proc-btn-cancel-action" onClick={() => setShowCancelModal(true)} disabled={cancelMutation.isPending}>
                <XCircle size={14} /> Cancel Order
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Details Grid */}
      <div className="proc-detail-grid">
        <div className="proc-detail-main">
          {/* Order Info */}
          <div className="proc-card">
            <div className="proc-card-header"><h2>Order Information</h2></div>
            <div className="proc-card-body">
              <div className="proc-info-grid">
                {[
                  ['PO Number',         <span className="proc-po-number">{po.po_number}</span>],
                  ['PO Date',            fmt(po.po_date)],
                  ['Expected Delivery',  <span style={{ color: isOverdue ? '#c62828' : '#2c2c2c' }}>{fmt(po.expected_delivery)}{isOverdue ? ' ⚠ Overdue' : ''}</span>],
                  ['Actual Delivery',    fmt(po.actual_delivery_date)],
                  ['Supplier',           supplier?.supplier_name || '—'],
                  ['Supplier Phone',     supplier?.phone || '—'],
                ].map(([label, value]) => (
                  <div className="proc-info-row" key={label}>
                    <span className="proc-info-label">{label}</span>
                    <span className="proc-info-value">{value}</span>
                  </div>
                ))}
              </div>
              {po.notes && (
                <div className="proc-notes-box">
                  <span className="proc-info-label">Notes</span>
                  <p>{po.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Line Items */}
          <div className="proc-card">
            <div className="proc-card-header">
              <h2>Line Items</h2>
              <span className="proc-badge-count">{po.po_items?.length || 0} items</span>
            </div>
            <div className="proc-table-wrap">
              <table className="proc-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Product</th>
                    <th style={{ textAlign: 'center' }}>Quantity</th>
                    <th style={{ textAlign: 'right' }}>Unit Price</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(po.po_items || []).length === 0 ? (
                    <tr><td colSpan="5" className="proc-empty">No items found.</td></tr>
                  ) : (po.po_items || []).map((item, i) => (
                    <tr key={item.id || i}>
                      <td><span className="proc-row-num">{i + 1}</span></td>
                      <td className="proc-name-cell">{item.product?.product_name || `Product #${item.product_id}`}</td>
                      <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right' }}>LKR {Number(item.unit_price).toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}><strong>LKR {Number(item.total_price).toFixed(2)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="proc-detail-sidebar">
          <div className="proc-card">
            <div className="proc-card-header"><h2>Order Summary</h2></div>
            <div className="proc-card-body">
              <div className="proc-supplier-chip">
                <div className="proc-supplier-chip-label">Supplier</div>
                <div className="proc-supplier-chip-name">{supplier?.supplier_name || '—'}</div>
              </div>
              <div className="proc-summary-rows">
                <div className="proc-summary-row">
                  <span className="proc-summary-label">Total Items</span>
                  <span className="proc-summary-value">{po.po_items?.length || 0}</span>
                </div>
                <div className="proc-summary-row">
                  <span className="proc-summary-label">Total Quantity</span>
                  <span className="proc-summary-value">{(po.po_items || []).reduce((s, i) => s + i.quantity, 0)}</span>
                </div>
              </div>
              <div className="proc-grand-total">
                <span>Grand Total</span>
                <strong>LKR {Number(po.total_amount).toFixed(2)}</strong>
              </div>
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
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="proc-modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="proc-modal" onClick={e => e.stopPropagation()}>
            <div className="proc-modal-header">
              <h2>Cancel Purchase Order</h2>
              <button className="proc-modal-close" onClick={() => setShowCancelModal(false)}>✕</button>
            </div>
            <div className="proc-modal-body">
              <p style={{ color: '#666', fontSize: '14px', marginBottom: '12px' }}>
                Are you sure you want to cancel <strong>{po.po_number}</strong>? This cannot be undone.
              </p>
              <div className="proc-field">
                <label>Cancellation Reason <span className="req">*</span></label>
                <textarea className="proc-input proc-textarea" rows={3} value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder="Enter reason for cancellation..." />
              </div>
            </div>
            <div className="proc-modal-footer">
              <button className="proc-btn-outline" onClick={() => setShowCancelModal(false)}>Keep Order</button>
              <button className="proc-btn-danger" onClick={handleCancel} disabled={!cancelReason.trim() || cancelMutation.isPending}>
                {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PurchaseOrderDetail;
