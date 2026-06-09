import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Pencil } from 'lucide-react';
import { useSupplier, useUpdateSupplierRating, useUpdateSupplierStatus } from '../../services/procurementApi';
import '../../styles/Procurement.css';

function StarRating({ value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      {[1,2,3,4,5].map(s => (
        <motion.button key={s} type="button"
          onClick={() => onChange(s)}
          whileHover={{ scale: 1.3 }} whileTap={{ scale: 0.85 }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
            color: s <= value ? '#f59e0b' : '#d1d5db', fontSize: '24px', lineHeight: 1 }}>
          ★
        </motion.button>
      ))}
      {value > 0 && <span style={{ fontSize: '13px', color: '#888', marginLeft: '4px' }}>{value}/5</span>}
    </div>
  );
}

const cardVariants = {
  hidden:  { opacity: 0, y: 20 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.35 } }),
};

export default function SupplierDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { data: supplier, isLoading } = useSupplier(id);
  const ratingMutation = useUpdateSupplierRating();
  const statusMutation = useUpdateSupplierStatus();

  if (isLoading) return (
    <div className="proc-container">
      <div className="proc-loading-wrap">
        {[...Array(4)].map((_, i) => (
          <motion.div key={i} className="proc-skeleton proc-skeleton-card"
            animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }} />
        ))}
      </div>
    </div>
  );

  if (!supplier) return (
    <div className="proc-container">
      <p className="proc-empty">Supplier not found.</p>
      <button className="proc-btn-primary" onClick={() => navigate('/suppliers')}>Back to Suppliers</button>
    </div>
  );

  const orders     = supplier.purchase_orders || [];
  const totalSpend = orders.filter(o => o.status === 'Received').reduce((s, o) => s + Number(o.total_amount), 0);

  return (
    <div className="proc-container">

      {/* Header */}
      <motion.div className="proc-header"
        initial={{ opacity: 0, y: -24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <motion.button className="proc-back-btn" onClick={() => navigate('/suppliers')}
            whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}>
            <ArrowLeft size={16} />
          </motion.button>
          <div>
            <h1>{supplier.supplier_name}</h1>
            <p style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span className="proc-code-badge">{supplier.supplier_code}</span>
              <motion.span className={`proc-status-pill ${supplier.status === 'Active' ? 'active' : 'inactive'}`}
                initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
                {supplier.status}
              </motion.span>
            </p>
          </div>
        </div>
        <div className="proc-header-actions">
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            className={`proc-btn-outline ${supplier.status === 'Active' ? 'warn' : 'success'}`}
            onClick={() => statusMutation.mutate({ id, status: supplier.status === 'Active' ? 'Inactive' : 'Active' })}
            disabled={statusMutation.isPending}>
            {statusMutation.isPending ? 'Updating...' : supplier.status === 'Active' ? 'Deactivate' : 'Activate'}
          </motion.button>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            className="proc-btn-primary" onClick={() => navigate(`/suppliers/edit/${id}`)}>
            <Pencil size={14} /> Edit Supplier
          </motion.button>
        </div>
      </motion.div>

      <div className="proc-detail-grid">
        {/* Left */}
        <div className="proc-detail-main">

          {/* Contact Info */}
          <motion.div className="proc-card" custom={0} variants={cardVariants} initial="hidden" animate="visible">
            <div className="proc-card-header"><h2>Contact Information</h2></div>
            <div className="proc-card-body">
              <div className="proc-info-grid">
                {[
                  ['Contact Person', supplier.contact_person || supplier.contact],
                  ['Phone',          supplier.phone],
                  ['Email',          supplier.email],
                  ['Address',        supplier.address],
                  ['Company Reg',    supplier.company_reg],
                  ['Tax ID / VAT',   supplier.tax_id],
                ].map(([label, value], i) => (
                  <motion.div className="proc-info-row" key={label}
                    initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.05 }}>
                    <span className="proc-info-label">{label}</span>
                    <span className="proc-info-value">{value || '—'}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* PO History */}
          <motion.div className="proc-card" custom={1} variants={cardVariants} initial="hidden" animate="visible">
            <div className="proc-card-header">
              <h2>Purchase Order History</h2>
              <span className="proc-badge-count">{orders.length} orders</span>
            </div>
            <div className="proc-table-wrap">
              <table className="proc-table">
                <thead>
                  <tr>
                    <th>PO Number</th><th>Date</th><th>Status</th>
                    <th style={{ textAlign: 'right' }}>Total</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr><td colSpan="5" className="proc-empty">No purchase orders yet.</td></tr>
                  ) : (
                    <AnimatePresence>
                      {orders.map((po, i) => (
                        <motion.tr key={po.po_id}
                          initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 + i * 0.04 }}>
                          <td><span className="proc-po-number">{po.po_number || `#${po.po_id}`}</span></td>
                          <td>{po.po_date}</td>
                          <td><span className={`proc-status-pill ${po.status?.toLowerCase()}`}>{po.status}</span></td>
                          <td style={{ textAlign: 'right' }}>LKR {Number(po.total_amount).toFixed(2)}</td>
                          <td><button className="proc-link-btn" onClick={() => navigate(`/procurement/${po.po_id}`)}>View</button></td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>

        {/* Right Sidebar */}
        <div className="proc-detail-sidebar">

          {/* Financial */}
          <motion.div className="proc-card" custom={2} variants={cardVariants} initial="hidden" animate="visible">
            <div className="proc-card-header"><h2>Financial Details</h2></div>
            <div className="proc-card-body">
              {[
                ['Payment Terms', supplier.payment_terms || '—'],
                ['Credit Limit',  supplier.credit_limit ? `LKR ${Number(supplier.credit_limit).toFixed(2)}` : '—'],
                ['Total Orders',  orders.length],
                ['Total Spend',   `LKR ${totalSpend.toFixed(2)}`],
              ].map(([label, value], i) => (
                <motion.div className="proc-summary-row" key={label}
                  initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + i * 0.07 }}>
                  <span className="proc-summary-label">{label}</span>
                  <span className="proc-summary-value">{value}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Rating */}
          <motion.div className="proc-card" custom={3} variants={cardVariants} initial="hidden" animate="visible">
            <div className="proc-card-header" style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}>
              <h2>Performance Rating</h2>
            </div>
            <div className="proc-card-body">
              <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>Click stars to update rating</p>
              <StarRating
                value={supplier.performance_rating || 0}
                onChange={(rating) => ratingMutation.mutate({ id, rating })}
              />
              <AnimatePresence>
                {ratingMutation.isPending && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>
                    Saving...
                  </motion.p>
                )}
              </AnimatePresence>
              <div style={{ marginTop: '14px', borderTop: '1px solid #f0e0e0', paddingTop: '10px' }}>
                {[['1 ★','Poor'],['2 ★','Fair'],['3 ★','Average'],['4 ★','Good'],['5 ★','Excellent']].map(([s,l]) => (
                  <div key={s} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#888', padding: '3px 0' }}>
                    <span>{s}</span><span>{l}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
