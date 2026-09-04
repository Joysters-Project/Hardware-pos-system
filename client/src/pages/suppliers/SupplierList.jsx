import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, FileDown, Eye, Pencil, ToggleLeft, ToggleRight, Trash2, X } from 'lucide-react';
import {
  useSuppliers, useUpdateSupplierStatus, useDeleteSupplier, useDownloadSupplierReportPDF,
} from '../../services/procurementApi';
import '../../styles/Procurement.css';
import '../../styles/ProcurementPages.css';

function StarDisplay({ value }) {
  return (
    <span>
      {[1,2,3,4,5].map(s => (
        <span key={s} style={{ color: s <= value ? '#f59e0b' : '#d1d5db', fontSize: '13px' }}>★</span>
      ))}
    </span>
  );
}

function DeleteConfirmModal({ supplier, onConfirm, onClose, isPending }) {
  return (
    <motion.div className="proc-modal-overlay"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}>
      <motion.div className="proc-modal"
        initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.93, opacity: 0 }}
        onClick={e => e.stopPropagation()}>
        <div className="proc-modal-header">
          <h2 style={{ color: '#c62828' }}>Remove Supplier</h2>
          <button className="proc-modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="proc-modal-body">
          <p style={{ fontSize: '14px', color: '#555', marginBottom: '12px' }}>
            Are you sure you want to permanently remove <strong>{supplier.supplier_name}</strong>?
          </p>
          <div style={{ background: '#fdecea', border: '1px solid #f5c6cb', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#c62828' }}>
            ⚠ This action cannot be undone. Suppliers with open purchase orders cannot be deleted.
          </div>
        </div>
        <div className="proc-modal-footer">
          <button className="proc-btn-outline" onClick={onClose}>Cancel</button>
          <motion.button className="proc-btn-danger"
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={onConfirm} disabled={isPending}>
            <Trash2 size={14} />
            {isPending ? 'Removing...' : 'Remove Supplier'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function SupplierList() {
  const navigate = useNavigate();
  const [search, setSearch]             = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: suppliers = [], isLoading } = useSuppliers();
  const statusMutation = useUpdateSupplierStatus();
  const deleteMutation = useDeleteSupplier();
  const supplierReportMutation = useDownloadSupplierReportPDF();

  const filtered = useMemo(() =>
    suppliers.filter(s => {
      const term = search.toLowerCase();
      const match = !term || [s.supplier_name, s.supplier_code, s.contact_person, s.phone, s.email]
        .some(v => (v || '').toLowerCase().includes(term));
      return match && (!filterStatus || s.status === filterStatus);
    }), [suppliers, search, filterStatus]);

  const stats = useMemo(() => ({
    total:    suppliers.length,
    active:   suppliers.filter(s => s.status === 'Active').length,
    inactive: suppliers.filter(s => s.status === 'Inactive').length,
    rated:    suppliers.filter(s => s.performance_rating).length,
  }), [suppliers]);

  const STAT_COLORS = ['#8b3a3a', '#1d7e42', '#e65100', '#1565c0'];
  const STAT_LABELS = ['Total', 'Active', 'Inactive', 'Rated'];
  const STAT_VALUES = [stats.total, stats.active, stats.inactive, stats.rated];

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.supplier_id, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  return (
    <div className="proc-container" style={{ position: 'relative' }}>

      {/* Header */}
      <motion.div className="proc-header"
        initial={{ opacity: 0, y: -24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div>
          <h1>Suppliers</h1>
          <p>{suppliers.length} total suppliers in directory</p>
        </div>
        <div className="proc-header-actions">
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            className="proc-btn-outline" onClick={() => supplierReportMutation.mutate()} disabled={supplierReportMutation.isPending}>
            <FileDown size={14} className={supplierReportMutation.isPending ? 'proc-spin' : ''} />
            {supplierReportMutation.isPending ? 'Exporting...' : 'Export PDF'}
          </motion.button>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            className="proc-btn-primary" onClick={() => navigate('/procurement/suppliers/add')}>
            <Plus size={15} /> Add Supplier
          </motion.button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="proc-stats">
        {STAT_LABELS.map((label, i) => (
          <motion.div key={label} className="proc-stat-card"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.08 }}
            whileHover={{ scale: 1.03, boxShadow: '0 6px 20px rgba(0,0,0,0.1)' }}>
            <div className="proc-stat-value" style={{ color: STAT_COLORS[i] }}>{STAT_VALUES[i]}</div>
            <div className="proc-stat-label">{label}</div>
          </motion.div>
        ))}
      </div>

      {/* Toolbar */}
      <motion.div className="proc-toolbar"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        <div className="proc-search-wrap">
          <input id="search" name="search" className="proc-search" placeholder="Search by name, code, contact, phone..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select id="filterStatus" name="filterStatus" className="proc-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </motion.div>

      {/* Table */}
      <motion.div className="proc-table-wrap"
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <table className="proc-table">
          <thead>
            <tr>
              <th>Code</th><th>Supplier Name</th><th>Contact Person</th>
              <th>Phone</th><th>Payment Terms</th><th>Status</th><th>Rating</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="8" className="proc-empty">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="8" className="proc-empty">No suppliers found.</td></tr>
            ) : (
              <AnimatePresence>
                {filtered.map((s, i) => (
                  <motion.tr key={s.supplier_id}
                    initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    transition={{ duration: 0.25, delay: i * 0.04 }}>
                    <td><span className="proc-code-badge">{s.supplier_code || '—'}</span></td>
                    <td className="proc-name-cell">{s.supplier_name}</td>
                    <td>{s.contact_person || s.contact || '—'}</td>
                    <td>{s.phone || '—'}</td>
                    <td>{s.payment_terms || '—'}</td>
                    <td>
                      <span className={`proc-status-pill ${s.status === 'Active' ? 'active' : 'inactive'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td><StarDisplay value={s.performance_rating || 0} /></td>
                    <td>
                      <div className="proc-action-btns">
                        <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                          className="proc-icon-btn view" title="View"
                          onClick={() => navigate(`/procurement/suppliers/${s.supplier_id}`)}>
                          <Eye size={14} />
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                          className="proc-icon-btn edit" title="Edit"
                          onClick={() => navigate(`/procurement/suppliers/edit/${s.supplier_id}`)}>
                          <Pencil size={14} />
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                          className={`proc-icon-btn ${s.status === 'Active' ? 'deactivate' : 'activate'}`}
                          title={s.status === 'Active' ? 'Deactivate' : 'Activate'}
                          onClick={() => statusMutation.mutate({ id: s.supplier_id, status: s.status === 'Active' ? 'Inactive' : 'Active' })}
                          disabled={statusMutation.isPending}>
                          {s.status === 'Active' ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                          className="proc-icon-btn delete" title="Remove Supplier"
                          onClick={() => setDeleteTarget(s)}
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

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deleteTarget && (
          <DeleteConfirmModal
            supplier={deleteTarget}
            onConfirm={handleDelete}
            onClose={() => setDeleteTarget(null)}
            isPending={deleteMutation.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
