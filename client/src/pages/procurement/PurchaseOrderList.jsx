import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, RefreshCw, Eye, Trash2 } from 'lucide-react';
import { usePurchaseOrders, useDeletePurchaseOrder } from '@/services/procurementApi';
import '@/styles/Procurement.css';

export default function PurchaseOrderList() {
  const navigate = useNavigate();
  const [search, setSearch]             = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const { data: orders = [], isLoading, refetch } = usePurchaseOrders();
  const deleteMutation = useDeletePurchaseOrder();

  const filtered = useMemo(() =>
    orders.filter(po => {
      const term = search.toLowerCase();
      const matchSearch = !term ||
        (po.po_number || '').toLowerCase().includes(term) ||
        (po.supplier?.supplier_name || '').toLowerCase().includes(term) ||
        (po.status || '').toLowerCase().includes(term);
      return matchSearch && (!filterStatus || po.status === filterStatus);
    }).sort((a, b) => new Date(b.po_date) - new Date(a.po_date)),
  [orders, search, filterStatus]);

  const stats = useMemo(() => ({
    total:      orders.length,
    pending:    orders.filter(p => p.status === 'Pending').length,
    approved:   orders.filter(p => p.status === 'Approved').length,
    received:   orders.filter(p => p.status === 'Received').length,
    totalValue: orders.reduce((s, p) => s + Number(p.total_amount || 0), 0),
  }), [orders]);

  const handleDelete = (id, num) => {
    if (!window.confirm(`Delete ${num}? Only Pending orders can be deleted.`)) return;
    deleteMutation.mutate(id);
  };

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '—';

  const STAT_DATA = [
    { label: 'Total Orders', value: stats.total,    color: '#8b3a3a' },
    { label: 'Pending',      value: stats.pending,  color: '#e65100' },
    { label: 'Approved',     value: stats.approved, color: '#1565c0' },
    { label: 'Received',     value: stats.received, color: '#1d7e42' },
  ];

  return (
    <div className="proc-container">

      {/* Header */}
      <motion.div className="proc-header"
        initial={{ opacity: 0, y: -24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div>
          <h1>Purchase Orders</h1>
          <p>{orders.length} total purchase orders</p>
        </div>
        <div className="proc-header-actions">
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            className="proc-btn-outline" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw size={14} className={isLoading ? 'proc-spin' : ''} /> Refresh
          </motion.button>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            className="proc-btn-primary" onClick={() => navigate('/procurement/orders/create')}>
            <Plus size={15} /> Create PO
          </motion.button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="proc-stats">
        {STAT_DATA.map(({ label, value, color }, i) => (
          <motion.div key={label} className="proc-stat-card"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            whileHover={{ scale: 1.03, boxShadow: '0 6px 20px rgba(0,0,0,0.1)' }}>
            <div className="proc-stat-value" style={{ color }}>{value}</div>
            <div className="proc-stat-label">{label}</div>
          </motion.div>
        ))}
      </div>

      {/* Total Value Banner */}
      <motion.div className="proc-value-banner"
        initial={{ opacity: 0, scaleX: 0.95 }} animate={{ opacity: 1, scaleX: 1 }}
        transition={{ delay: 0.32, duration: 0.35 }}>
        <span>Total Purchase Value</span>
        <strong>LKR {stats.totalValue.toFixed(2)}</strong>
      </motion.div>

      {/* Toolbar */}
      <motion.div className="proc-toolbar"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.38 }}>
        <div className="proc-search-wrap">
          <input className="proc-search" placeholder="Search by PO number, supplier, status..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="proc-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Shipped">Shipped</option>
          <option value="Received">Received</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </motion.div>

      {/* Table */}
      <motion.div className="proc-table-wrap"
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}>
        <table className="proc-table">
          <thead>
            <tr>
              <th>PO Number</th><th>Supplier</th><th>PO Date</th>
              <th>Expected Delivery</th><th>Status</th>
              <th style={{ textAlign: 'right' }}>Total Amount</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="7" className="proc-empty">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="7" className="proc-empty">No purchase orders found.</td></tr>
            ) : (
              <AnimatePresence>
                {filtered.map((po, i) => (
                  <motion.tr key={po.po_id}
                    initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    transition={{ duration: 0.22, delay: i * 0.04 }}>
                    <td><span className="proc-po-number">{po.po_number || `#${po.po_id}`}</span></td>
                    <td className="proc-name-cell">{po.supplier?.supplier_name || '—'}</td>
                    <td>{fmt(po.po_date)}</td>
                    <td>{fmt(po.expected_delivery)}</td>
                    <td><span className={`proc-status-pill ${po.status?.toLowerCase()}`}>{po.status}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="proc-amount">LKR {Number(po.total_amount || 0).toFixed(2)}</span>
                    </td>
                    <td>
                      <div className="proc-action-btns">
                        <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                          className="proc-icon-btn view" title="View"
                          onClick={() => navigate(`/procurement/orders/${po.po_id}`)}>
                          <Eye size={14} />
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                          className="proc-icon-btn delete" title="Delete"
                          onClick={() => handleDelete(po.po_id, po.po_number)}
                          disabled={deleteMutation.isPending}>
                          <Trash2 size={14} />
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            )}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
}
