import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import '../styles/ReportsPage.css';

/* ─── helpers ─── */
const fmt = (v) => `Rs. ${Number(v ?? 0).toFixed(2)}`;
const fmtDate = (v) => {
  if (!v) return '–';
  const d = new Date(v);
  return isNaN(d) ? v : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};
const dateKey = (v) => {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d)) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/* ═══════════════════════════════════════════════════════════
   SALES REPORT TAB
═══════════════════════════════════════════════════════════ */
function SalesReport() {
  const [bills, setBills] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [billSearch, setBillSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const PAGE = 10;

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [bRes, cRes] = await Promise.all([api.get('/bills'), api.get('/customers')]);
        setBills(Array.isArray(bRes.data) ? bRes.data : []);
        setCustomers(Array.isArray(cRes.data) ? cRes.data : []);
      } catch { setError('Failed to load sales data.'); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const custMap = useMemo(() =>
    customers.reduce((m, c) => { m[c.customer_id] = c; return m; }, {}), [customers]);

  const getName = (b) => custMap[b.customer_id]?.customer_name || 'Walk-in';
  const getPhone = (b) => custMap[b.customer_id]?.phone_no || '–';

  const filtered = useMemo(() => {
    return [...bills]
      .sort((a, b) => new Date(b.bill_date) - new Date(a.bill_date))
      .filter(b => {
        const q = search.toLowerCase();
        const nameMatch = !q || getName(b).toLowerCase().includes(q) || getPhone(b).includes(q);
        const billMatch = !billSearch || String(b.bill_no).toLowerCase().includes(billSearch.toLowerCase());
        const dateMatch = !dateFilter || dateKey(b.bill_date) === dateFilter;
        const statusMatch = !statusFilter || (b.status || '').toUpperCase() === statusFilter;
        return nameMatch && billMatch && dateMatch && statusMatch;
      });
  }, [bills, customers, search, billSearch, dateFilter, statusFilter]);

  const totalRevenue = filtered.reduce((s, b) => s + Number(b.total_amount || 0), 0);
  const totalPaid = filtered.reduce((s, b) => s + (Number(b.total_amount || 0) - Number(b.balance_due || 0)), 0);
  const totalDue = filtered.reduce((s, b) => s + Number(b.balance_due || 0), 0);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const rows = filtered.slice((safePage - 1) * PAGE, safePage * PAGE);

  const reset = () => { setSearch(''); setBillSearch(''); setDateFilter(''); setStatusFilter(''); setPage(1); };

  return (
    <div className="rp-section">
      {/* Summary cards */}
      <div className="rp-stats-row">
        <div className="rp-stat-card">
          <div className="rp-stat-label">Total Bills</div>
          <div className="rp-stat-value">{filtered.length}</div>
        </div>
        <div className="rp-stat-card">
          <div className="rp-stat-label">Total Revenue</div>
          <div className="rp-stat-value green">{fmt(totalRevenue)}</div>
        </div>
        <div className="rp-stat-card">
          <div className="rp-stat-label">Amount Collected</div>
          <div className="rp-stat-value green">{fmt(totalPaid)}</div>
        </div>
        <div className="rp-stat-card">
          <div className="rp-stat-label">Outstanding Balance</div>
          <div className="rp-stat-value red">{fmt(totalDue)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="rp-filters">
        <input placeholder="Search customer / phone" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        <input placeholder="Bill number" value={billSearch} onChange={e => { setBillSearch(e.target.value); setPage(1); }} />
        <input type="date" value={dateFilter} onChange={e => { setDateFilter(e.target.value); setPage(1); }} />
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="PAID">Paid</option>
          <option value="PARTIAL">Partial</option>
        </select>
        <button className="rp-reset-btn" onClick={reset}>Reset</button>
      </div>

      {loading && <div className="rp-status">Loading sales data…</div>}
      {error && <div className="rp-status error">{error}</div>}
      {!loading && !error && (
        <div className="rp-table-wrap">
          <table className="rp-table">
            <thead>
              <tr>
                <th>Bill No</th><th>Date</th><th>Customer</th><th>Phone</th>
                <th className="right">Total</th><th className="right">Paid</th>
                <th className="right">Balance</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={8} className="rp-empty">No records match your filters.</td></tr>
              ) : rows.map(b => (
                <tr key={b.bill_id}>
                  <td className="bold">{b.bill_no}</td>
                  <td>{fmtDate(b.bill_date)}</td>
                  <td>{getName(b)}</td>
                  <td>{getPhone(b)}</td>
                  <td className="right">{fmt(b.total_amount)}</td>
                  <td className="right green">{fmt(Number(b.total_amount) - Number(b.balance_due))}</td>
                  <td className="right red">{fmt(b.balance_due)}</td>
                  <td>
                    <span className={`rp-badge ${(b.status || '').toLowerCase()}`}>
                      {b.status || '–'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="rp-pager">
            <span>{filtered.length} records · Page {safePage} of {totalPages}</span>
            <div className="rp-pager-btns">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>Next</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   RETURNS REPORT TAB
═══════════════════════════════════════════════════════════ */
function ReturnsReport() {
  const { role } = useAuth();
  const [returnsData, setReturnsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [destFilter, setDestFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  const isManagerOrAdmin = ['manager', 'admin'].includes(role?.toLowerCase());

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const params = {};
        if (destFilter) params.destination = destFilter;
        if (dateFrom) params.from_date = new Date(dateFrom).toISOString();
        if (dateTo) { const d = new Date(dateTo); d.setHours(23, 59, 59); params.to_date = d.toISOString(); }
        const res = await api.get('/returns', { params });
        setReturnsData(res.data?.data || []);
      } catch (e) {
        setError(e.response?.data?.error || 'Failed to load return data.');
      } finally { setLoading(false); }
    };
    load();
  }, [destFilter, dateFrom, dateTo]);

  const filtered = useMemo(() => {
    if (!search) return returnsData;
    const q = search.toLowerCase();
    return returnsData.filter(r =>
      String(r.return_id).includes(q) ||
      (r.bill?.bill_no || '').toLowerCase().includes(q)
    );
  }, [returnsData, search]);

  const totalRefund = filtered.reduce((s, r) => s + Number(r.total_refund_amount || 0), 0);

  const reset = () => { setDestFilter(''); setDateFrom(''); setDateTo(''); setSearch(''); };

  return (
    <div className="rp-section">
      {/* Summary */}
      <div className="rp-stats-row">
        <div className="rp-stat-card">
          <div className="rp-stat-label">Total Returns</div>
          <div className="rp-stat-value">{filtered.length}</div>
        </div>
        <div className="rp-stat-card">
          <div className="rp-stat-label">Total Refunded</div>
          <div className="rp-stat-value red">{fmt(totalRefund)}</div>
        </div>
        <div className="rp-stat-card">
          <div className="rp-stat-label">Items Returned</div>
          <div className="rp-stat-value">{filtered.reduce((s, r) => s + (r.items?.length || 0), 0)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="rp-filters">
        <input placeholder="Search by Return ID or Bill No" value={search} onChange={e => setSearch(e.target.value)} />
        <select value={destFilter} onChange={e => setDestFilter(e.target.value)}>
          <option value="">All Destinations</option>
          <option value="STOCK">Stock</option>
          <option value="REPAIR">Repair</option>
          <option value="SUPPLIER">Supplier</option>
          <option value="DAMAGED_STOCK">Damaged Stock</option>
        </select>
        {isManagerOrAdmin && (
          <>
            <div className="rp-date-group">
              <label>From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="rp-date-group">
              <label>To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </>
        )}
        <button className="rp-reset-btn" onClick={reset}>Reset</button>
      </div>

      {loading && <div className="rp-status">Loading return data…</div>}
      {error && <div className="rp-status error">{error}</div>}
      {!loading && !error && (
        <div className="rp-returns-list">
          {filtered.length === 0 ? (
            <div className="rp-empty-card">No return records found.</div>
          ) : filtered.map(record => {
            const fs = record.financial_summary;
            return (
              <div key={record.return_id} className="rp-ret-card">
                {/* Card header */}
                <div className="rp-ret-header">
                  <div className="rp-ret-meta">
                    <div className="rp-ret-meta-item">
                      <span className="meta-label">Return ID</span>
                      <span className="meta-value">#{record.return_id}</span>
                    </div>
                    <div className="rp-ret-meta-item">
                      <span className="meta-label">Bill No</span>
                      <span className="meta-value accent">{record.bill?.bill_no || record.bills?.bill_no || '–'}</span>
                    </div>
                    <div className="rp-ret-meta-item">
                      <span className="meta-label">Date</span>
                      <span className="meta-value">{fmtDate(record.return_date)}</span>
                    </div>
                    <div className="rp-ret-meta-item">
                      <span className="meta-label">Status</span>
                      <span className={`rp-badge ${(record.status || '').toLowerCase()}`}>{record.status}</span>
                    </div>
                  </div>
                  <div className="rp-ret-refund">
                    <span className="meta-label">Refunded</span>
                    <span className="meta-value green">{fmt(record.total_refund_amount)}</span>
                  </div>
                </div>

                {/* Financial summary strip */}
                {fs && (
                  <div className="rp-fin-strip">
                    <div className="rp-fin-item">
                      <span>Total Bill</span>
                      <strong>{fmt(fs.total_bill)}</strong>
                    </div>
                    <div className="rp-fin-item">
                      <span>How Much Paid</span>
                      <strong className="green">{fmt(fs.total_paid)}</strong>
                    </div>
                    <div className="rp-fin-item">
                      <span>Requested Refund</span>
                      <strong className="red">{fmt(record.total_refund_amount)}</strong>
                    </div>
                    <div className="rp-fin-item">
                      <span>Customer Can Get</span>
                      <strong className="amber">{fmt(fs.refundable_amount)}</strong>
                    </div>
                  </div>
                )}

                {/* Items table */}
                {record.items && record.items.length > 0 && (
                  <div className="rp-ret-body">
                    <table className="rp-table">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th className="center">Qty</th>
                          <th>Reason</th>
                          <th className="center">Destination</th>
                          <th className="right">Refund</th>
                        </tr>
                      </thead>
                      <tbody>
                        {record.items.map(item => (
                          <tr key={item.return_item_id}>
                            <td>{item.product?.product_name || '–'}</td>
                            <td className="center">{item.return_quantity}</td>
                            <td>{item.return_reason}</td>
                            <td className="center"><span className="rp-dest-badge">{item.destination}</span></td>
                            <td className="right">{fmt(item.refund_amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   BORROW REPORT TAB  (Purchase Orders used as borrow tracking)
═══════════════════════════════════════════════════════════ */
function BorrowReport() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedPo, setExpandedPo] = useState(null);
  const [page, setPage] = useState(1);
  const PAGE = 10;

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get('/purchase_orders');
        setOrders(Array.isArray(res.data) ? res.data : (res.data?.data || []));
      } catch {
        setError('Failed to load borrow / purchase order data.');
      } finally { setLoading(false); }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    return orders.filter(o => {
      const q = search.toLowerCase();
      const matchSearch = !q || String(o.po_id || '').includes(q) ||
        (o.supplier?.supplier_name || '').toLowerCase().includes(q);
      const matchStatus = !statusFilter || (o.status || '').toUpperCase() === statusFilter;
      const matchFrom = !dateFrom || dateKey(o.po_date) >= dateFrom;
      const matchTo = !dateTo || dateKey(o.po_date) <= dateTo;
      return matchSearch && matchStatus && matchFrom && matchTo;
    });
  }, [orders, search, statusFilter, dateFrom, dateTo]);

  const totalValue = filtered.reduce((s, o) => s + Number(o.total_amount || 0), 0);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const rows = filtered.slice((safePage - 1) * PAGE, safePage * PAGE);

  return (
    <div className="rp-section">
      <div className="rp-stats-row">
        <div className="rp-stat-card">
          <div className="rp-stat-label">Total Orders</div>
          <div className="rp-stat-value">{filtered.length}</div>
        </div>
        <div className="rp-stat-card">
          <div className="rp-stat-label">Total Value</div>
          <div className="rp-stat-value">{fmt(totalValue)}</div>
        </div>
        <div className="rp-stat-card">
          <div className="rp-stat-label">Pending</div>
          <div className="rp-stat-value amber">{filtered.filter(o => (o.status || '').toUpperCase() === 'PENDING').length}</div>
        </div>
        <div className="rp-stat-card">
          <div className="rp-stat-label">Received</div>
          <div className="rp-stat-value green">{filtered.filter(o => (o.status || '').toUpperCase() === 'RECEIVED').length}</div>
        </div>
      </div>

      <div className="rp-filters">
        <input placeholder="Search PO ID / Supplier" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="RECEIVED">Received</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <div className="rp-date-group">
          <label>From</label>
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} />
        </div>
        <div className="rp-date-group">
          <label>To</label>
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} />
        </div>
        <button className="rp-reset-btn" onClick={() => { setSearch(''); setStatusFilter(''); setDateFrom(''); setDateTo(''); setPage(1); }}>Reset</button>
      </div>

      {loading && <div className="rp-status">Loading borrow data…</div>}
      {error && <div className="rp-status error">{error}</div>}
      {!loading && !error && (
        <div className="rp-table-wrap">
          <table className="rp-table">
            <thead>
              <tr>
                <th>PO ID</th><th>Date</th><th>Expected Delivery</th><th>Supplier</th>
                <th className="right">Total Value</th><th>Items</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={7} className="rp-empty">No records found.</td></tr>
              ) : rows.map(o => (
                <React.Fragment key={o.po_id}>
                  <tr
                    style={{ cursor: o.po_items?.length ? 'pointer' : 'default' }}
                    onClick={() => o.po_items?.length && setExpandedPo(expandedPo === o.po_id ? null : o.po_id)}
                  >
                    <td className="bold">PO-{o.po_id}</td>
                    <td>{fmtDate(o.po_date)}</td>
                    <td>{fmtDate(o.expected_delivery)}</td>
                    <td>{o.supplier?.supplier_name || '–'}</td>
                    <td className="right">{fmt(o.total_amount)}</td>
                    <td>{o.po_items?.length || 0} {o.po_items?.length ? (expandedPo === o.po_id ? '▲' : '▼') : ''}</td>
                    <td>
                      <span className={`rp-badge ${(o.status || '').toLowerCase()}`}>{o.status || '–'}</span>
                    </td>
                  </tr>
                  {expandedPo === o.po_id && o.po_items?.length > 0 && (
                    <tr className="rp-expanded-row">
                      <td colSpan={7}>
                        <table className="rp-table rp-sub-table">
                          <thead>
                            <tr>
                              <th>Product</th>
                              <th className="right">Quantity</th>
                              <th className="right">Total Price</th>
                            </tr>
                          </thead>
                          <tbody>
                            {o.po_items.map((item, idx) => (
                              <tr key={idx}>
                                <td>{item.product?.product_name || `Product #${item.product_id}`}</td>
                                <td className="right">{item.quantity}</td>
                                <td className="right">{fmt(item.total_price)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          <div className="rp-pager">
            <span>{filtered.length} records · Page {safePage} of {totalPages}</span>
            <div className="rp-pager-btns">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>Next</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN REPORTS PAGE
═══════════════════════════════════════════════════════════ */
const TABS = [
  { key: 'sales',   label: '💳 Sales Report'  },
  { key: 'returns', label: '↩️ Return Report'  },
  { key: 'borrow',  label: '📦 Borrow Report'  },
];

function ReportsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('sales');

  return (
    <div className="rp-container">
      {/* Header */}
      <div className="rp-header">
        <div>
          <h1>Reports</h1>
          <p>View detailed Sales, Return and Borrow reports with filters</p>
        </div>
        <button className="rp-back-btn" onClick={() => navigate(-1)}>Back</button>
      </div>

      {/* Tab nav */}
      <div className="rp-tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`rp-tab${activeTab === t.key ? ' active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="rp-body">
        {activeTab === 'sales'   && <SalesReport />}
        {activeTab === 'returns' && <ReturnsReport />}
        {activeTab === 'borrow'  && <BorrowReport />}
      </div>
    </div>
  );
}

export default ReportsPage;
