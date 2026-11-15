import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Eye, Trash2, ArrowUpDown, ArrowUp, ArrowDown, RotateCcw } from 'lucide-react';
import { usePurchaseOrders, useDeletePurchaseOrder } from '../../services/procurementApi';
import { formatPurchaseOrderNumber } from '../../utils/purchaseOrderNumber';
import { useAuth } from '../../context/AuthContext';
import '../../styles/Procurement.css';

export default function PurchaseOrderList() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // User-specific storage key so each person's preference is independently stored
  const userKey = user?.name || sessionStorage.getItem('userName') || 'default_user';
  const STORAGE_KEY = `pos_procurement_po_prefs_${userKey}`;

  // Read initial preferences from localStorage or default to latest orders first
  const initialPrefs = useMemo(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          sortField: parsed.sortField || 'latest',
          sortDirection: parsed.sortDirection || 'desc',
          filterStatus: parsed.filterStatus || '',
        };
      }
    } catch (e) {
      console.warn('Failed to read PO preferences:', e);
    }
    return { sortField: 'latest', sortDirection: 'desc', filterStatus: '' };
  }, [STORAGE_KEY]);

  const [sortField, setSortField]         = useState(initialPrefs.sortField);
  const [sortDirection, setSortDirection] = useState(initialPrefs.sortDirection);
  const [filterStatus, setFilterStatus]   = useState(initialPrefs.filterStatus);
  const [search, setSearch]               = useState('');

  const { data: orders = [], isLoading } = usePurchaseOrders();
  const deleteMutation = useDeletePurchaseOrder();

  // Persist preference to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        sortField,
        sortDirection,
        filterStatus,
      }));
    } catch (e) {
      console.warn('Failed to save PO preferences:', e);
    }
  }, [sortField, sortDirection, filterStatus, STORAGE_KEY]);

  // Click handler for column headers
  const handleHeaderClick = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDirection(field === 'supplier' || field === 'status' ? 'asc' : 'desc');
    }
  };

  // Helper to render sort arrows on column headers
  const renderSortIndicator = (field) => {
    const isActive = sortField === field || (field === 'po_date' && sortField === 'latest');
    if (isActive) {
      return sortDirection === 'desc' ? (
        <ArrowDown size={13} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '4px' }} />
      ) : (
        <ArrowUp size={13} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '4px' }} />
      );
    }
    return (
      <ArrowUpDown size={11} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '4px', opacity: 0.45 }} />
    );
  };

  const filtered = useMemo(() => {
    const result = orders.filter(po => {
      const term = search.toLowerCase();
      const matchSearch = !term ||
        formatPurchaseOrderNumber(po.po_number, po.po_id).toLowerCase().includes(term) ||
        (po.supplier?.supplier_name || '').toLowerCase().includes(term) ||
        (po.status || '').toLowerCase().includes(term);
      return matchSearch && (!filterStatus || po.status === filterStatus);
    });

    result.sort((a, b) => {
      const dirMultiplier = sortDirection === 'asc' ? 1 : -1;

      if (sortField === 'latest') {
        const dateA = new Date(a.po_date || 0).getTime();
        const dateB = new Date(b.po_date || 0).getTime();
        const idA = Number(a.po_id || 0);
        const idB = Number(b.po_id || 0);
        return dirMultiplier * ((dateA - dateB) || (idA - idB));
      }

      if (sortField === 'po_number') {
        const idA = Number(a.po_id || 0);
        const idB = Number(b.po_id || 0);
        return dirMultiplier * (idA - idB);
      }

      if (sortField === 'supplier') {
        const suppA = (a.supplier?.supplier_name || '').toLowerCase();
        const suppB = (b.supplier?.supplier_name || '').toLowerCase();
        return dirMultiplier * suppA.localeCompare(suppB);
      }

      if (sortField === 'po_date') {
        const dateA = new Date(a.po_date || 0).getTime();
        const dateB = new Date(b.po_date || 0).getTime();
        const idA = Number(a.po_id || 0);
        const idB = Number(b.po_id || 0);
        return dirMultiplier * ((dateA - dateB) || (idA - idB));
      }

      if (sortField === 'expected_delivery') {
        const delA = a.expected_delivery ? new Date(a.expected_delivery).getTime() : 0;
        const delB = b.expected_delivery ? new Date(b.expected_delivery).getTime() : 0;
        return dirMultiplier * (delA - delB);
      }

      if (sortField === 'status') {
        const stA = (a.status || '').toLowerCase();
        const stB = (b.status || '').toLowerCase();
        return dirMultiplier * stA.localeCompare(stB);
      }

      if (sortField === 'total_amount') {
        const amtA = Number(a.total_amount || 0);
        const amtB = Number(b.total_amount || 0);
        return dirMultiplier * (amtA - amtB);
      }

      return 0;
    });

    return result;
  }, [orders, search, filterStatus, sortField, sortDirection]);

  const stats = useMemo(() => ({
    total:      orders.length,
    pending:    orders.filter(p => p.status === 'Pending').length,
    approved:   orders.filter(p => p.status === 'Approved').length,
    received:   orders.filter(p => p.status === 'Received').length,
    totalValue: orders.reduce((s, p) => s + Number(p.total_amount || 0), 0),
  }), [orders]);

  const handleDelete = (id, num) => {
    if (!window.confirm(`Delete ${formatPurchaseOrderNumber(num, id)}? Only Pending orders can be deleted.`)) return;
    deleteMutation.mutate(id);
  };

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '—';

  const STAT_DATA = [
    { label: 'Total Orders', value: stats.total,    color: '#8b3a3a' },
    { label: 'Pending',      value: stats.pending,  color: '#e65100' },
    { label: 'Approved',     value: stats.approved, color: '#1565c0' },
    { label: 'Received',     value: stats.received, color: '#1d7e42' },
  ];

  const isCustomState = sortField !== 'latest' || sortDirection !== 'desc' || filterStatus !== '' || search !== '';

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
            className="proc-btn-primary" onClick={() => navigate('/procurement/orders/create')}>
            <Plus size={15} /> Create
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
          <input id="search" name="search" className="proc-search" placeholder="Search by PO number, supplier, status..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Filter by Status */}
        <select id="filterStatus" name="filterStatus" className="proc-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Shipped">Shipped</option>
          <option value="Received">Received</option>
          <option value="Cancelled">Cancelled</option>
        </select>

        {/* Sort by Option (Persisted in localStorage) */}
        <select
          id="sortSelector"
          name="sortSelector"
          className="proc-select"
          value={`${sortField}_${sortDirection}`}
          onChange={(e) => {
            const [field, dir] = e.target.value.split('_');
            setSortField(field);
            setSortDirection(dir);
          }}
        >
          <option value="latest_desc">Sort: Latest Orders First (Default)</option>
          <option value="latest_asc">Sort: Oldest Orders First</option>
          <option value="po_number_desc">Sort: PO Number (Highest)</option>
          <option value="po_number_asc">Sort: PO Number (Lowest)</option>
          <option value="total_amount_desc">Sort: Amount (Highest)</option>
          <option value="total_amount_asc">Sort: Amount (Lowest)</option>
          <option value="supplier_asc">Sort: Supplier (A–Z)</option>
          <option value="supplier_desc">Sort: Supplier (Z–A)</option>
          <option value="status_asc">Sort: Status (A–Z)</option>
        </select>

        {/* Reset button to clear filters/sort back to default latest */}
        {isCustomState && (
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            type="button"
            className="proc-btn-outline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '0.45rem 0.8rem' }}
            onClick={() => {
              setSortField('latest');
              setSortDirection('desc');
              setFilterStatus('');
              setSearch('');
            }}
            title="Reset to default (Latest Orders First)"
          >
            <RotateCcw size={13} /> Reset
          </motion.button>
        )}
      </motion.div>

      {/* Table */}
      <motion.div className="proc-table-wrap"
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}>
        <table className="proc-table">
          <thead>
            <tr>
              <th onClick={() => handleHeaderClick('po_number')} style={{ cursor: 'pointer', userSelect: 'none' }} title="Click to sort by PO Number">
                PO Number {renderSortIndicator('po_number')}
              </th>
              <th onClick={() => handleHeaderClick('supplier')} style={{ cursor: 'pointer', userSelect: 'none' }} title="Click to sort by Supplier">
                Supplier {renderSortIndicator('supplier')}
              </th>
              <th onClick={() => handleHeaderClick('po_date')} style={{ cursor: 'pointer', userSelect: 'none' }} title="Click to sort by PO Date">
                PO Date {renderSortIndicator('po_date')}
              </th>
              <th onClick={() => handleHeaderClick('expected_delivery')} style={{ cursor: 'pointer', userSelect: 'none' }} title="Click to sort by Expected Delivery">
                Expected Delivery {renderSortIndicator('expected_delivery')}
              </th>
              <th onClick={() => handleHeaderClick('status')} style={{ cursor: 'pointer', userSelect: 'none' }} title="Click to sort by Status">
                Status {renderSortIndicator('status')}
              </th>
              <th onClick={() => handleHeaderClick('total_amount')} style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }} title="Click to sort by Total Amount">
                Total Amount {renderSortIndicator('total_amount')}
              </th>
              <th>Actions</th>
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
                    <td><span className="proc-po-number">{formatPurchaseOrderNumber(po.po_number, po.po_id)}</span></td>
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
