import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import api from '../api/axios';
import { buildTableHtml, escapeHtml, printWithTemplate } from '../utils/printTemplate';
import { useAuth } from '../context/AuthContext';
import '../styles/ReportsPage.css';
import '../styles/Returns.css';
import ProcurementReports from './procurement/ProcurementReports';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';

/* ─── helpers ─── */
const fmt = (v) => `Rs. ${Number(v ?? 0).toFixed(2)}`;
const fmtNum = (v) => Number(v ?? 0).toFixed(2);
const csvEscape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
const dateStamp = () => new Date().toISOString().slice(0, 10);
const printReportWithTemplate = (title, headers, rows, subtitle = '') => {
  const tableHtml = buildTableHtml({
    columns: headers,
    rows: rows.map((row) => row.map((cell) => escapeHtml(cell))),
    emptyMessage: 'No records found',
  });

  return printWithTemplate({
    title,
    subtitle,
    contentHtml: tableHtml,
  });
};
const downloadBlob = (filename, data, type) => {
  const blob = new Blob([data], { type });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};
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

const TIMEFRAME_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'this_year', label: 'This Year' },
];

const getTimeframeRange = (value) => {
  if (!value || value === 'all') return null;
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (value === 'today') {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (value === 'this_week') {
    const day = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - day);
    start.setHours(0, 0, 0, 0);
    end.setTime(start.getTime());
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (value === 'this_month') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setMonth(end.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (value === 'this_year') {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    end.setMonth(11, 31);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  return null;
};

const matchesTimeframe = (value, timeframe) => {
  const range = getTimeframeRange(timeframe);
  if (!range) return true;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date >= range.start && date <= range.end;
};

const buildTimeSeriesData = (records, timeframe, dateAccessor, amountAccessor) => {
  const range = getTimeframeRange(timeframe);
  if (!range) return [];

  const buckets = [];
  if (timeframe === 'today') {
    for (let hour = 0; hour < 24; hour += 1) {
      buckets.push({ key: `${String(hour).padStart(2, '0')}:00`, label: `${String(hour).padStart(2, '0')}:00`, total: 0 });
    }
  } else if (timeframe === 'this_week') {
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(range.start);
      d.setDate(range.start.getDate() + i);
      buckets.push({ key: d.toISOString().slice(0, 10), label: d.toLocaleDateString('en-GB', { weekday: 'short' }), total: 0 });
    }
  } else if (timeframe === 'this_month') {
    const daysInMonth = range.end.getDate();
    for (let day = 1; day <= daysInMonth; day += 1) {
      buckets.push({ key: `${String(day).padStart(2, '0')}`, label: `${String(day).padStart(2, '0')}`, total: 0 });
    }
  } else if (timeframe === 'this_year') {
    for (let month = 0; month < 12; month += 1) {
      const labelDate = new Date(range.start.getFullYear(), month, 1);
      buckets.push({ key: `${labelDate.getFullYear()}-${String(month + 1).padStart(2, '0')}`, label: labelDate.toLocaleDateString('en-GB', { month: 'short' }), total: 0 });
    }
  }

  records.forEach((record) => {
    const valueDate = new Date(dateAccessor(record));
    if (Number.isNaN(valueDate.getTime()) || valueDate < range.start || valueDate > range.end) return;

    let key = '';
    if (timeframe === 'today') {
      key = `${String(valueDate.getHours()).padStart(2, '0')}:00`;
    } else if (timeframe === 'this_week') {
      key = valueDate.toISOString().slice(0, 10);
    } else if (timeframe === 'this_month') {
      key = `${String(valueDate.getDate()).padStart(2, '0')}`;
    } else {
      key = `${valueDate.getFullYear()}-${String(valueDate.getMonth() + 1).padStart(2, '0')}`;
    }

    const bucket = buckets.find((item) => item.key === key);
    if (bucket) bucket.total += Number(amountAccessor(record) || 0);
  });

  return buckets.map((bucket) => ({ label: bucket.label, total: Number(bucket.total.toFixed(2)) }));
};

function TimeframeSelector({ value, onChange }) {
  return (
    <div className="rp-timeframe-row">
      {TIMEFRAME_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`rp-timeframe-btn${value === option.value ? ' active' : ''}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SALES REPORT TAB
═══════════════════════════════════════════════════════════ */
function SalesReport() {
  const { role, isAuthenticated } = useAuth();
  const location = useLocation();
  const isCashier = role?.toLowerCase() === 'cashier';
  const initialTimeframe = location.state?.initialTimeframe || (isCashier ? 'today' : 'this_month');
  const [bills, setBills] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [timeframe, setTimeframe] = useState(initialTimeframe);
  const [page, setPage] = useState(1);
  const [expandedBill, setExpandedBill] = useState(null);
  const PAGE = 10;

  useEffect(() => {
    if (isCashier) {
      setTimeframe('today');
      return;
    }
    if (location.state?.initialTimeframe) {
      setTimeframe(location.state.initialTimeframe);
    }
  }, [isCashier, location.state?.initialTimeframe]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        if (!isAuthenticated) {
          setError('Not authenticated. Please log in.');
          return;
        }
        const [bRes, cRes] = await Promise.all([api.get('/bills'), api.get('/customers')]);
        setBills(Array.isArray(bRes.data) ? bRes.data : (bRes.data?.data || []));
        setCustomers(Array.isArray(cRes.data) ? cRes.data : (cRes.data?.data || []));
      } catch (e) {
        if (e.response?.status === 401) {
          setError('Authentication failed. Please log in again.');
        } else {
          setError('Failed to load sales data.');
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAuthenticated]);

  const custMap = useMemo(() =>
    customers.reduce((m, c) => { m[c.customer_id] = c; return m; }, {}), [customers]);

  const getName = (b) => b.customer?.customer_name || custMap[b.customer_id]?.customer_name || 'Walk-in';
  const getPhone = (b) => b.customer?.phone_no || custMap[b.customer_id]?.phone_no || '–';
  const getAddress = (b) => b.customer?.address || custMap[b.customer_id]?.address || '–';

  const filtered = useMemo(() => {
    return [...bills]
      .sort((a, b) => new Date(b.bill_date) - new Date(a.bill_date))
      .filter(b => {
        const q = search.toLowerCase();
        const matchSearch = !q || String(b.bill_no || '').includes(q) ||
          getName(b).toLowerCase().includes(q) ||
          getPhone(b).includes(q);
        const matchFrom = !dateFrom || dateKey(b.bill_date) >= dateFrom;
        const matchTo = !dateTo || dateKey(b.bill_date) <= dateTo;
        const statusMatch = !statusFilter || (b.status || '').toUpperCase() === statusFilter;
        const matchTimeframe = matchesTimeframe(b.bill_date, timeframe);
        return matchSearch && matchFrom && matchTo && statusMatch && matchTimeframe;
      });
  }, [bills, customers, search, dateFrom, dateTo, statusFilter, timeframe]);

  const salesChartData = useMemo(() => {
    return buildTimeSeriesData(filtered, timeframe, (b) => b.bill_date, (b) => b.total_amount);
  }, [filtered, timeframe]);

  const totalRevenue = filtered.reduce((s, b) => s + Number(b.total_amount || 0), 0);
  const totalPaid = filtered.reduce((s, b) => s + (Number(b.total_amount || 0) - Number(b.balance_due || 0)), 0);
  const totalDue = filtered.reduce((s, b) => s + Number(b.balance_due || 0), 0);
  const totalBorrows = filtered.filter(b => (b.status || '').toUpperCase() === 'PARTIAL').length;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const rows = filtered.slice((safePage - 1) * PAGE, safePage * PAGE);

  const fmtDateTime = (v) => {
    if (!v) return '–';
    const d = new Date(v);
    return isNaN(d) ? v : d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const reset = () => { setSearch(''); setDateFrom(''); setDateTo(''); setStatusFilter(''); setTimeframe(initialTimeframe); setPage(1); };

  const handleDownloadSalesCsv = () => {
    const csvHeaders = [
      'Bill No', 'Date', 'Customer', 'Phone', 'Address',
      'Total Amount', 'Paid Amount', 'Balance Due', 'Status',
      'Product Name', 'Qty', 'Unit Price', 'Discount', 'Item Total',
      'Payment Method', 'Payment Date', 'Collected By'
    ];
    const csvRows = [];
    filtered.forEach((b) => {
      const baseRow = [
        b.bill_no, fmtDate(b.bill_date), getName(b), getPhone(b), getAddress(b),
        fmt(b.total_amount),
        fmt(Number(b.total_amount || 0) - Number(b.balance_due || 0)),
        fmt(b.balance_due),
        b.status || '–',
      ];
      if (!b.bill_items || b.bill_items.length === 0) {
        csvRows.push([...baseRow, '–', '–', '–', '–', '–', '–', '–', '–']);
      } else {
        b.bill_items.forEach((item, idx) => {
          const payment = b.payments?.[idx] || null;
          csvRows.push([
            ...baseRow,
            item.product?.product_name || `Product #${item.product_id}`,
            item.quantity,
            fmt(item.price_per_unit),
            Number(item.discount || 0) > 0 ? fmt(item.discount) : '–',
            fmt(item.total_price),
            payment?.payment_method || '–',
            payment ? fmtDate(payment.payment_date) : '–',
            payment?.collected_by ? `User #${payment.collected_by}` : '–',
          ]);
        });
      }
    });
    const csv = [csvHeaders, ...csvRows].map((row) => row.map(csvEscape).join(',')).join('\r\n');
    downloadBlob(`sales-report-${dateStamp()}.csv`, csv, 'text/csv;charset=utf-8;');
  };

  const handleDownloadSalesPdf = () => {
    const pdfHeaders = ['Bill No', 'Date', 'Customer', 'Phone', 'Total Amount', 'Paid Amount', 'Balance Due', 'Status', 'Items'];
    const pdfRows = filtered.map((b) => [
      b.bill_no,
      fmtDate(b.bill_date),
      getName(b),
      getPhone(b),
      fmt(b.total_amount),
      fmt(Number(b.total_amount || 0) - Number(b.balance_due || 0)),
      fmt(b.balance_due),
      b.status || '–',
      b.bill_items?.length || 0,
    ]);
    const opened = printReportWithTemplate('Sales Report - All Bills', pdfHeaders, pdfRows, `Export Date: ${dateStamp()}`);
    if (!opened) window.alert('Allow pop-ups to export the report as PDF.');
  };

  return (
    <div className="rp-section">
      <div style={{ marginBottom: '12px' }}>
        {isCashier ? (
          <div style={{ padding: '9px 14px', background: '#fdf2f2', borderRadius: '6px', border: '1px solid #e09090', color: '#800000', fontSize: '13px', fontWeight: '600' }}>
            Viewing Today&apos;s Sales Only
          </div>
        ) : (
          <TimeframeSelector value={timeframe} onChange={setTimeframe} />
        )}
      </div>
      {/* Sales Revenue Chart */}
      <div className="chart-container" style={{ height: '300px', marginBottom: '20px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={salesChartData} margin={{ top: 8, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#2c2c2c', fontSize: 11, fontWeight: 600 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#2c2c2c', fontSize: 11, fontWeight: 600 }} />
            <Tooltip contentStyle={{ backgroundColor: '#2c2c2c', border: '1px solid #8b3a3a', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
            <Line type="monotone" dataKey="total" stroke="#8b3a3a" strokeWidth={3.5} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6, strokeWidth: 2, fill: '#fff' }} name="Revenue (Rs)" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {/* Summary cards */}
      <div className="rp-stats-row">
        <div className="rp-stat-card">
          <div className="rp-stat-label">Total Bills</div>
          <div className="rp-stat-value">{filtered.length}</div>
        </div>
        <div className="rp-stat-card">
          <div className="rp-stat-label">Total Billed</div>
          <div className="rp-stat-value">{fmt(totalRevenue)}</div>
        </div>
        <div className="rp-stat-card">
          <div className="rp-stat-label">Amount Paid</div>
          <div className="rp-stat-value green">{fmt(totalPaid)}</div>
        </div>
        <div className="rp-stat-card">
          <div className="rp-stat-label">Balance Outstanding</div>
          <div className="rp-stat-value red">{fmt(totalDue)}</div>
        </div>
        <div className="rp-stat-card">
          <div className="rp-stat-label">Borrowed (Partial)</div>
          <div className="rp-stat-value">{totalBorrows}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="rp-filters">
        <input id="search" name="search" placeholder="Search Bill No / Customer / Phone" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        {!isCashier && (
          <>
            <div className="rp-date-group">
              <label>From</label>
              <input id="dateFrom" name="dateFrom" type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} />
            </div>
            <div className="rp-date-group">
              <label>To</label>
              <input id="dateTo" name="dateTo" type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} />
            </div>
          </>
        )}
        <select id="statusFilter" name="statusFilter" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="PAID">Paid</option>
          <option value="PARTIAL">Partial (Borrowed)</option>
        </select>
        <button className="rp-reset-btn" onClick={reset}>Reset</button>
      </div>

      <div className="rp-export-row">
        <span className="rp-export-label">Export report:</span>
        <button type="button" className="rp-export-btn pdf" onClick={handleDownloadSalesPdf} disabled={filtered.length === 0}>
          Download PDF
        </button>
        <button type="button" className="rp-export-btn csv" onClick={handleDownloadSalesCsv} disabled={filtered.length === 0}>
          Download CSV
        </button>
      </div>

      {loading && <div className="rp-status">Loading sales data…</div>}
      {error && <div className="rp-status error">{error}</div>}
      {!loading && !error && (
        <div className="rp-table-wrap">
          <table className="rp-table">
            <thead>
              <tr>
                <th>Bill No</th><th>Date</th><th>Customer</th><th>Phone</th>
                <th className="right">Total Amount (Rs.)</th><th className="right">Paid (Rs.)</th>
                <th className="right">Balance Due (Rs.)</th><th>Status</th><th>Items</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={9} className="rp-empty">No records match your filters.</td></tr>
              ) : rows.map(b => (
                <React.Fragment key={b.bill_id}>
                  <tr
                    style={{ cursor: b.bill_items?.length ? 'pointer' : 'default' }}
                    onClick={() => b.bill_items?.length && setExpandedBill(expandedBill === b.bill_id ? null : b.bill_id)}
                  >
                    <td className="bold">#{b.bill_no}</td>
                    <td>{fmtDate(b.bill_date)}</td>
                    <td>{getName(b)}</td>
                    <td>{getPhone(b)}</td>
                    <td className="right">{fmtNum(b.total_amount)}</td>
                    <td className="right green">{fmtNum(Number(b.total_amount) - Number(b.balance_due))}</td>
                    <td className="right red"><strong>{fmtNum(b.balance_due)}</strong></td>
                    <td>
                      <span className={`rp-badge ${(b.status || '').toLowerCase()}`}>
                        {b.status || '–'}
                      </span>
                    </td>
                    <td>
                      {b.bill_items?.length || 0}
                      {b.bill_items?.length ? (expandedBill === b.bill_id ? ' ▲' : ' ▼') : ''}
                    </td>
                  </tr>
                  {expandedBill === b.bill_id && b.bill_items?.length > 0 && (
                    <tr className="rp-expanded-row">
                      <td colSpan={9}>
                        <div className="rp-vertical-details">
                          {/* 1. Customer & Bill Info */}
                          <div className="rp-details-col">
                            <h3>Customer &amp; Bill Info</h3>
                            <div className="rp-detail-line"><strong>Bill Number:</strong> <span>#{b.bill_no}</span></div>
                            <div className="rp-detail-line"><strong>Bill Date:</strong> <span>{fmtDateTime(b.bill_date)}</span></div>
                            <div className="rp-detail-line"><strong>Status:</strong> <span className={`rp-badge ${(b.status || '').toLowerCase()}`}>{b.status || '–'}</span></div>
                            <div className="rp-detail-line"><strong>Customer:</strong> <span>{getName(b)}</span></div>
                            <div className="rp-detail-line"><strong>Phone:</strong> <span>{getPhone(b)}</span></div>
                            <div className="rp-detail-line"><strong>Address:</strong> <span>{getAddress(b)}</span></div>
                          </div>

                          {/* 2. Financial Summary & Payment History */}
                          <div className="rp-details-col">
                            <h3>Financial Summary</h3>
                            <div className="rp-detail-line"><strong>Original Bill Amount:</strong> <span>{fmt(b.total_amount)}</span></div>
                            <div className="rp-detail-line"><strong>Paid So Far:</strong> <span style={{ color: '#2e7d32', fontWeight: 'bold' }}>{fmt(Number(b.total_amount || 0) - Number(b.balance_due || 0))}</span></div>
                            <div className="rp-detail-line"><strong>Balance Outstanding:</strong> <span style={{ color: '#b71c1c', fontWeight: 'bold' }}>{fmt(b.balance_due)}</span></div>

                            <div style={{ marginTop: '15px' }}>
                              <h4 style={{ fontSize: '13px', color: '#800000', borderBottom: '1px solid #f0dada', paddingBottom: '4px', marginBottom: '8px', fontWeight: 'bold' }}>Payment History</h4>
                              {b.payments && b.payments.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {b.payments.map((p, pIdx) => (
                                    <div key={pIdx} style={{ fontSize: '12px', background: 'white', padding: '6px 10px', borderRadius: '4px', border: '1px solid #eee' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <strong>{fmt(p.amount_paid)}</strong>
                                        <span style={{ color: '#888', fontWeight: '600' }}>{p.payment_method}</span>
                                      </div>
                                      <div style={{ color: '#999', fontSize: '10px', marginTop: '2px' }}>
                                        {fmtDate(p.payment_date)}{p.collected_by ? ` · Collected by User #${p.collected_by}` : ''}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div style={{ fontStyle: 'italic', fontSize: '12px', color: '#999' }}>No payments recorded.</div>
                              )}
                            </div>
                          </div>

                          {/* 3. Products Details */}
                          <div className="rp-details-col rp-details-col--wide">
                            <h3>Products Details</h3>
                            <div className="rp-prod-table-wrap">
                              <table className="rp-prod-table">
                                <thead>
                                  <tr>
                                    <th>#</th>
                                    <th>Product Name</th>
                                    <th className="center">Qty</th>
                                    <th className="right">Unit Price (Rs.)</th>
                                    <th className="right">Discount (Rs.)</th>
                                    <th className="right">Total (Rs.)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {b.bill_items.map((item, idx) => (
                                    <tr key={idx}>
                                      <td className="muted">{idx + 1}</td>
                                      <td className="bold">{item.product?.product_name || `Product #${item.product_id}`}</td>
                                      <td className="center">{item.quantity}</td>
                                      <td className="right">{fmtNum(item.price_per_unit)}</td>
                                      <td className="right">{Number(item.discount || 0) > 0 ? fmtNum(item.discount) : '–'}</td>
                                      <td className="right green">{fmtNum(item.total_price)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot>
                                  <tr>
                                    <td colSpan={5} className="right"><strong>Bill Total</strong></td>
                                    <td className="right"><strong>{fmtNum(b.total_amount)}</strong></td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>
                        </div>
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
   RETURNS LOGS TAB
═══════════════════════════════════════════════════════════ */
function ReturnsReport() {
  const { role, isAuthenticated } = useAuth();
  const location = useLocation();
  const isCashier = role?.toLowerCase() === 'cashier';
  const initialTimeframe = location.state?.initialTimeframe || (isCashier ? 'today' : 'this_month');
  const [returnsData, setReturnsData] = useState([]);
  const [filter, setFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [timeframe, setTimeframe] = useState(initialTimeframe);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [expandedReturn, setExpandedReturn] = useState(null);
  const PAGE = 10;

  const isManagerOrAdmin = ['manager', 'admin'].includes(role?.toLowerCase());
  const isCashierRole = role?.toLowerCase() === 'cashier';
  const isAuthorized = isManagerOrAdmin || isCashierRole;

  useEffect(() => {
    if (isCashierRole) {
      setTimeframe('today');
      return;
    }
    if (location.state?.initialTimeframe) {
      setTimeframe(location.state.initialTimeframe);
    }
  }, [isCashierRole, location.state?.initialTimeframe]);

  useEffect(() => {
    if (isCashierRole && dateFilter !== 'today') setDateFilter('today');
  }, [isCashierRole, dateFilter]);

  useEffect(() => {
    if (!isAuthenticated) {
      setError('Not authenticated. Please log in.');
      return;
    }
    if (!isAuthorized) return;
    fetchReturns();
  }, [filter, dateFilter, isAuthorized, isAuthenticated]);

  const fetchReturns = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filter) params.destination = filter;
      const effectiveDateFilter = isCashier ? 'today' : dateFilter;
      if (effectiveDateFilter === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        params.from_date = today.toISOString();
      } else if (effectiveDateFilter === 'this_month') {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        params.from_date = startOfMonth.toISOString();
      }
      const response = await api.get('/returns', { params });
      setReturnsData(response.data?.data || []);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else {
        setError(err.response?.data?.message || err.response?.data?.error || 'Unable to load return logs');
      }
      setReturnsData([]);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setFilter(''); setSearch(''); if (!isCashier) setDateFilter('all'); setTimeframe(initialTimeframe); setPage(1); };

  // Filter returns based on search query — must be before any conditional return
  const filteredReturns = useMemo(() => {
    const q = search.toLowerCase().trim();
    return returnsData.filter((r) => {
      const matchSearch = !q ||
        String(r.return_id || '').includes(q) ||
        (r.bill?.bill_no || r.bills?.bill_no || r.bill_number || '').toLowerCase().includes(q) ||
        (r.bill?.customer?.customer_name || '').toLowerCase().includes(q) ||
        (r.bill?.customer?.phone_no || '').includes(q);
      const destinationValue = (r.destination || '').toUpperCase();
      const hasDestinationMatch = !filter || destinationValue === filter || (r.items || []).some((item) => (item.destination || '').toUpperCase() === filter);
      const matchTimeframe = matchesTimeframe(r.return_date, timeframe);
      return matchSearch && hasDestinationMatch && matchTimeframe;
    });
  }, [returnsData, search, filter, timeframe]);

  const returnsChartData = useMemo(() => {
    return buildTimeSeriesData(filteredReturns, timeframe, (r) => r.return_date, (r) => r.total_refund_amount);
  }, [filteredReturns, timeframe]);

  if (!isAuthorized) {
    return (
      <div className="rp-section">
        <div className="rp-status error">
          <h2>Access Denied</h2>
          <p>Return logs are only available to authorized personnel.</p>
        </div>
      </div>
    );
  }

  const totalRefunded = filteredReturns.reduce((s, r) => s + Number(r.total_refund_amount || 0), 0);
  const totalItems = filteredReturns.reduce((s, r) => s + (r.items?.length || 0), 0);

  const totalPages = Math.max(1, Math.ceil(filteredReturns.length / PAGE));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const rows = filteredReturns.slice((safePage - 1) * PAGE, safePage * PAGE);

  const handleDownloadReturnsCsv = () => {
    const csvHeaders = [
      'Return ID', 'Date', 'Status', 'Processed By', 'Customer Name', 'Customer Phone',
      'Bill No', 'Original Bill Amount', 'Paid Amount', 'Total Refunded', 'Should Return', 'Remaining Balance',
      'Product', 'Return Qty', 'Item Refund', 'Reason', 'Destination', 'Notes'
    ];

    const csvRows = [];
    filteredReturns.forEach((r) => {
      const fs = r.financial_summary;
      const billNo = r.bill?.bill_no || r.bills?.bill_no || r.bill_number || '–';
      const totalBillAmount = r.bill?.total_amount || 0;
      const originalBill = fs?.total_bill || totalBillAmount;
      const paidAmount = fs?.total_paid || 0;
      const remainingBalance = Math.max(0, (originalBill - paidAmount) - r.total_refund_amount);

      if (!r.items || r.items.length === 0) {
        csvRows.push([
          r.return_id,
          fmtDateTime(r.return_date),
          r.status || '–',
          r.processed_by || '–',
          r.bill?.customer?.customer_name || 'Walk-in',
          r.bill?.customer?.phone_no || '–',
          billNo,
          fmt(originalBill),
          fmt(paidAmount),
          fmt(r.total_refund_amount),
          fmt(fs?.refundable_amount || 0),
          fmt(remainingBalance),
          '–', '–', '–', '–', '–', '–'
        ]);
      } else {
        r.items.forEach((item) => {
          csvRows.push([
            r.return_id,
            fmtDateTime(r.return_date),
            r.status || '–',
            r.processed_by || '–',
            r.bill?.customer?.customer_name || 'Walk-in',
            r.bill?.customer?.phone_no || '–',
            billNo,
            fmt(originalBill),
            fmt(paidAmount),
            fmt(r.total_refund_amount),
            fmt(fs?.refundable_amount || 0),
            fmt(remainingBalance),
            item.product?.product_name || `Product #${item.product_id}`,
            item.return_quantity,
            fmt(item.refund_amount),
            item.return_reason || '–',
            item.destination,
            item.destination_note || '–'
          ]);
        });
      }
    });

    const csv = [csvHeaders, ...csvRows].map((row) => row.map(csvEscape).join(',')).join('\r\n');
    downloadBlob(`returns-logs-${dateStamp()}.csv`, csv, 'text/csv;charset=utf-8;');
  };

  const handleDownloadReturnsPdf = () => {
    const pdfHeaders = ['Return ID', 'Bill No', 'Customer', 'Date', 'Status', 'Refunded', 'Remaining Bal', 'Products (Qty)'];
    const pdfRows = filteredReturns.map((r) => {
      const fs = r.financial_summary;
      const billNo = r.bill?.bill_no || r.bills?.bill_no || r.bill_number || '–';
      const totalBillAmount = r.bill?.total_amount || 0;
      const originalBill = fs?.total_bill || totalBillAmount;
      const paidAmount = fs?.total_paid || 0;
      const remainingBalance = Math.max(0, (originalBill - paidAmount) - r.total_refund_amount);

      const productsStr = r.items && r.items.length > 0
        ? r.items.map(item => `${item.product?.product_name || `Product #${item.product_id}`} (${item.return_quantity})`).join(', ')
        : '–';

      return [
        r.return_id,
        billNo,
        r.bill?.customer?.customer_name || 'Walk-in',
        fmtDate(r.return_date),
        r.status || '–',
        fmt(r.total_refund_amount),
        fmt(remainingBalance),
        productsStr
      ];
    });

    const opened = printReportWithTemplate('Returns Logs', pdfHeaders, pdfRows, `Export Date: ${dateStamp()}`);
    if (!opened) window.alert('Allow pop-ups to export the report as PDF.');
  };

  // Helper for displaying time in return logs cards
  const fmtDateTime = (v) => {
    if (!v) return '–';
    const d = new Date(v);
    return isNaN(d) ? v : d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="rp-section">
      <div style={{ marginBottom: '12px' }}>
        {isCashierRole ? (
          <div style={{ padding: '9px 14px', background: '#fdf2f2', borderRadius: '6px', border: '1px solid #e09090', color: '#800000', fontSize: '13px', fontWeight: '600' }}>
            Viewing Today&apos;s Returns Only
          </div>
        ) : (
          <TimeframeSelector value={timeframe} onChange={setTimeframe} />
        )}
      </div>
      {/* Summary cards */}
      <div className="rp-stats-row">
        <div className="rp-stat-card">
          <div className="rp-stat-label">Total Returns</div>
          <div className="rp-stat-value">{filteredReturns.length}</div>
        </div>
        <div className="rp-stat-card">
          <div className="rp-stat-label">Total Refunded</div>
          <div className="rp-stat-value red">{fmt(totalRefunded)}</div>
        </div>
        <div className="rp-stat-card">
          <div className="rp-stat-label">Items Returned</div>
          <div className="rp-stat-value">{totalItems}</div>
        </div>
      </div>
      {/* Returns Refund Chart */}
      <div className="chart-container" style={{ height: '300px', marginBottom: '20px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={returnsChartData} margin={{ top: 8, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#2c2c2c', fontSize: 11, fontWeight: 600 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#2c2c2c', fontSize: 11, fontWeight: 600 }} />
            <Tooltip contentStyle={{ backgroundColor: '#2c2c2c', border: '1px solid #1d7e42', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
            <Bar dataKey="total" fill="#1d7e42" name="Refunded (Rs.)" radius={[6, 6, 0, 0]} maxBarSize={34} stroke="#166534" strokeWidth={1.2} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Filters */}
      <div className="rp-filters">
        <input id="search" name="search"
          placeholder="Search Return ID / Bill No / Customer"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={{ minWidth: '260px' }}
        />
        <select id="filter" name="filter" value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }}>
          <option value="">All Destinations</option>
          <option value="STOCK">Stock</option>
          <option value="REPAIR">Repair</option>
          <option value="SUPPLIER">Supplier</option>
          <option value="DAMAGED_STOCK">Damaged Stock</option>
        </select>

        {isManagerOrAdmin && (
          <select id="dateFilter" name="dateFilter" value={dateFilter} onChange={e => { setDateFilter(e.target.value); setPage(1); }}>
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="this_month">This Month</option>
          </select>
        )}

        {isCashier && (
          <div style={{ padding: '9px 14px', background: '#fdf2f2', borderRadius: '6px', border: '1px solid #e09090', color: '#800000', fontSize: '13px', fontWeight: '600' }}>
            Viewing Today's Returns Only
          </div>
        )}

        <button className="rp-reset-btn" onClick={reset}>Reset</button>
      </div>

      <div className="rp-export-row">
        <span className="rp-export-label">Export report:</span>
        <button type="button" className="rp-export-btn pdf" onClick={handleDownloadReturnsPdf} disabled={filteredReturns.length === 0}>
          Download PDF
        </button>
        <button type="button" className="rp-export-btn csv" onClick={handleDownloadReturnsCsv} disabled={filteredReturns.length === 0}>
          Download CSV
        </button>
      </div>

      {/* Error */}
      {error && <div className="rp-status error">{error}</div>}

      {/* Loading & Data Presentation */}
      {loading && <div className="rp-status">Loading return logs…</div>}
      {!loading && !error && (
        <div className="rp-table-wrap">
          <table className="rp-table">
            <thead>
              <tr>
                <th>Return ID</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Phone</th>
                <th>Bill No</th>
                <th className="right">Refunded (Rs.)</th>
                <th className="right">Remaining Bal (Rs.)</th>
                <th>Status</th>
                <th>Items</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={9} className="rp-empty">No return records found.</td></tr>
              ) : (
                rows.map((record) => {
                  const fs = record.financial_summary;
                  const billNo = record.bill?.bill_no || record.bills?.bill_no || record.bill_number || '–';
                  const totalBillAmount = record.bill?.total_amount || 0;
                  const originalBill = fs?.total_bill || totalBillAmount;
                  const paidAmount = fs?.total_paid || 0;
                  const remainingBalance = Math.max(0, (originalBill - paidAmount) - record.total_refund_amount);
                  const hasItems = record.items && record.items.length > 0;

                  return (
                    <React.Fragment key={record.return_id}>
                      <tr
                        style={{ cursor: hasItems ? 'pointer' : 'default' }}
                        onClick={() => hasItems && setExpandedReturn(expandedReturn === record.return_id ? null : record.return_id)}
                      >
                        <td className="bold">#{record.return_id}</td>
                        <td>{fmtDate(record.return_date)}</td>
                        <td>{record.bill?.customer?.customer_name || 'Walk-in'}</td>
                        <td>{record.bill?.customer?.phone_no || '–'}</td>
                        <td>{billNo}</td>
                        <td className="right red">{fmtNum(record.total_refund_amount)}</td>
                        <td className="right amber"><strong>{fmtNum(remainingBalance)}</strong></td>
                        <td>
                          <span className={`rp-badge ${(record.status || '').toLowerCase().replace('_', '-')}`}>
                            {record.status}
                          </span>
                        </td>
                        <td>
                          {record.items?.length || 0}
                          {hasItems ? (expandedReturn === record.return_id ? ' ▲' : ' ▼') : ''}
                        </td>
                      </tr>
                      {expandedReturn === record.return_id && hasItems && (
                        <tr className="rp-expanded-row">
                          <td colSpan={9}>
                            <div className="rp-vertical-details">
                              {/* 1. Return Information */}
                              <div className="rp-details-col">
                                <h3>Return Information</h3>
                                <div className="rp-detail-line"><strong>Return ID:</strong> <span>#{record.return_id}</span></div>
                                <div className="rp-detail-line"><strong>Date:</strong> <span>{fmtDateTime(record.return_date)}</span></div>
                                <div className="rp-detail-line"><strong>Status:</strong> <span className={`rp-badge ${(record.status || '').toLowerCase().replace('_', '-')}`}>{record.status}</span></div>
                                <div className="rp-detail-line"><strong>Processed By:</strong> <span>User #{record.processed_by || '–'}</span></div>
                                <div className="rp-detail-line"><strong>Customer Name:</strong> <span>{record.bill?.customer?.customer_name || 'Walk-in'}</span></div>
                                <div className="rp-detail-line"><strong>Customer Phone:</strong> <span>{record.bill?.customer?.phone_no || '–'}</span></div>
                              </div>

                              {/* 2. Financial Details */}
                              <div className="rp-details-col">
                                <h3>Financial Details</h3>
                                <div className="rp-detail-line"><strong>Bill Number:</strong> <span>{billNo}</span></div>
                                <div className="rp-detail-line"><strong>Original Bill Amount:</strong> <span>{fmt(originalBill)}</span></div>
                                <div className="rp-detail-line"><strong>Paid Amount:</strong> <span>{fmt(paidAmount)}</span></div>
                                <div className="rp-detail-line"><strong>Total Refunded Value:</strong> <span style={{ color: '#b71c1c', fontWeight: 'bold' }}>{fmt(record.total_refund_amount)}</span></div>
                                <div className="rp-detail-line"><strong>Should Return:</strong> <span style={{ color: '#2e7d32', fontWeight: 'bold' }}>{fmt(fs?.refundable_amount || 0)}</span></div>
                                <div className="rp-detail-line"><strong>Remaining Balance Payable:</strong> <span style={{ color: '#e65100', fontWeight: 'bold' }}>{fmt(remainingBalance)}</span></div>
                              </div>

                              {/* 3. Returned Products Details */}
                              <div className="rp-details-col rp-details-col--wide">
                                <h3>Returned Products Details</h3>
                                <div className="rp-prod-table-wrap">
                                  <table className="rp-prod-table">
                                    <thead>
                                      <tr>
                                        <th>#</th>
                                        <th>Product Name</th>
                                        <th className="center">Qty</th>
                                        <th className="right">Refund (Rs.)</th>
                                        <th>Reason</th>
                                        <th>Destination</th>
                                        <th>Notes</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {record.items.map((item, idx) => (
                                        <tr key={item.return_item_id || idx}>
                                          <td className="muted">{idx + 1}</td>
                                          <td className="bold">{item.product?.product_name || `Product #${item.product_id}`}</td>
                                          <td className="center">{item.return_quantity}</td>
                                          <td className="right green">{fmtNum(item.refund_amount)}</td>
                                          <td>{item.return_reason || '–'}</td>
                                          <td><span className="rp-dest-badge">{item.destination}</span></td>
                                          <td className="muted">{item.destination_note || '–'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
          <div className="rp-pager">
            <span>{filteredReturns.length} records · Page {safePage} of {totalPages}</span>
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
   BORROW REPORT TAB  (Partially Paid Bills)
═══════════════════════════════════════════════════════════ */
function BorrowReport() {
  const { role, isAuthenticated } = useAuth();
  const location = useLocation();
  const isCashier = role?.toLowerCase() === 'cashier';
  const initialTimeframe = location.state?.initialTimeframe || (isCashier ? 'today' : 'this_month');
  const [bills, setBills] = useState([]);
  const [allBillsForChart, setAllBillsForChart] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [timeframe, setTimeframe] = useState(initialTimeframe);
  const [expandedBill, setExpandedBill] = useState(null);
  const [page, setPage] = useState(1);
  const PAGE = 10;

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        if (!isAuthenticated) {
          setError('Not authenticated. Please log in.');
          return;
        }

        const [bRes, cRes] = await Promise.all([
          api.get('/bills'),
          api.get('/customers')
        ]);

        const allBills = Array.isArray(bRes.data) ? bRes.data : (bRes.data?.data || []);
        const allCustomers = Array.isArray(cRes.data) ? cRes.data : (cRes.data?.data || []);

        // Keep all bills for the sales-vs-borrow chart
        setAllBillsForChart(allBills);
        // Filter for partial bills for the table
        const partialBills = allBills.filter(b => (b.status || '').toUpperCase() === 'PARTIAL');
        setBills(partialBills);
        setCustomers(allCustomers);
      } catch (e) {
        if (e.response?.status === 401) {
          setError('Authentication failed. Please log in again.');
        } else {
          setError(e.response?.data?.error || 'Failed to load partially paid bills.');
        }
      } finally { setLoading(false); }
    };
    load();
  }, [isAuthenticated]);

  const custMap = useMemo(() =>
    customers.reduce((m, c) => { m[c.customer_id] = c; return m; }, {}), [customers]);

  const getCustomerName = (b) => b.customer?.customer_name || custMap[b.customer_id]?.customer_name || 'Walk-in';
  const getCustomerPhone = (b) => b.customer?.phone_no || custMap[b.customer_id]?.phone_no || '–';
  const getCustomerAddress = (b) => b.customer?.address || custMap[b.customer_id]?.address || '–';

  const filteredChartBills = useMemo(() => {
    return [...allBillsForChart]
      .sort((a, b) => new Date(b.bill_date) - new Date(a.bill_date))
      .filter(b => {
        const q = search.toLowerCase().trim();
        const matchSearch = !q || String(b.bill_no || '').includes(q) ||
          getCustomerName(b).toLowerCase().includes(q) ||
          getCustomerPhone(b).includes(q);
        const matchFrom = !dateFrom || dateKey(b.bill_date) >= dateFrom;
        const matchTo = !dateTo || dateKey(b.bill_date) <= dateTo;
        const matchTimeframe = matchesTimeframe(b.bill_date, timeframe);
        return matchSearch && matchFrom && matchTo && matchTimeframe;
      });
  }, [allBillsForChart, customers, custMap, search, dateFrom, dateTo, timeframe]);

  const filtered = useMemo(() => {
    return [...bills]
      .sort((a, b) => new Date(b.bill_date) - new Date(a.bill_date))
      .filter(b => {
        const q = search.toLowerCase().trim();
        const matchSearch = !q || String(b.bill_no || '').includes(q) ||
          getCustomerName(b).toLowerCase().includes(q) ||
          getCustomerPhone(b).includes(q);
        const matchFrom = !dateFrom || dateKey(b.bill_date) >= dateFrom;
        const matchTo = !dateTo || dateKey(b.bill_date) <= dateTo;
        const matchTimeframe = matchesTimeframe(b.bill_date, timeframe);
        return matchSearch && matchFrom && matchTo && matchTimeframe;
      });
  }, [bills, customers, custMap, search, dateFrom, dateTo, timeframe]);

  const salesVsBorrowChartData = useMemo(() => {
    const salesSeries = buildTimeSeriesData(filteredChartBills, timeframe, (b) => b.bill_date, (b) => b.total_amount);
    const borrowSeries = buildTimeSeriesData(filtered, timeframe, (b) => b.bill_date, (b) => b.balance_due);
    const combined = [];
    const maxLength = Math.max(salesSeries.length, borrowSeries.length);
    for (let index = 0; index < maxLength; index += 1) {
      const salesPoint = salesSeries[index] || { label: '', total: 0 };
      const borrowPoint = borrowSeries[index] || { label: '', total: 0 };
      combined.push({
        label: salesPoint.label || borrowPoint.label,
        sales: Number(salesPoint.total || 0),
        borrow: Number(borrowPoint.total || 0),
      });
    }
    return combined;
  }, [allBillsForChart, bills, timeframe]);

  const totalBilled = filtered.reduce((s, b) => s + Number(b.total_amount || 0), 0);
  const totalPaid = filtered.reduce((s, b) => s + (Number(b.total_amount || 0) - Number(b.balance_due || 0)), 0);
  const totalDue = filtered.reduce((s, b) => s + Number(b.balance_due || 0), 0);

  const borrowHeaders = ['Bill No', 'Date', 'Customer', 'Phone', 'Total Amount', 'Paid Amount', 'Balance Due', 'Items'];
  const borrowRows = filtered.map((b) => [
    b.bill_no,
    fmtDate(b.bill_date),
    getCustomerName(b),
    getCustomerPhone(b),
    fmt(b.total_amount),
    fmt(Number(b.total_amount || 0) - Number(b.balance_due || 0)),
    fmt(b.balance_due),
    b.bill_items?.length || 0,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const rows = filtered.slice((safePage - 1) * PAGE, safePage * PAGE);

  const handleDownloadBorrowCsv = () => {
    const csv = [borrowHeaders, ...borrowRows].map((row) => row.map(csvEscape).join(',')).join('\r\n');
    downloadBlob(`borrow-report-${dateStamp()}.csv`, csv, 'text/csv;charset=utf-8;');
  };

  const handleDownloadBorrowPdf = () => {
    const opened = printReportWithTemplate('Borrow Report - Partially Paid Bills', borrowHeaders, borrowRows, `Export Date: ${dateStamp()}`);
    if (!opened) window.alert('Allow pop-ups to export the report as PDF.');
  };

  return (
    <div className="rp-section">
      <div style={{ marginBottom: '12px' }}>
        {isCashier ? (
          <div style={{ padding: '9px 14px', background: '#fdf2f2', borderRadius: '6px', border: '1px solid #e09090', color: '#800000', fontSize: '13px', fontWeight: '600' }}>
            Viewing Today&apos;s Borrow Only
          </div>
        ) : (
          <TimeframeSelector value={timeframe} onChange={setTimeframe} />
        )}
      </div>
      {/* Sales vs Borrow Chart */}
      <div className="chart-container" style={{ height: '320px', marginBottom: '24px' }}>
        <h3 style={{ textAlign: 'center', marginBottom: '8px', fontSize: '14px', color: '#800000', fontWeight: '700', letterSpacing: '0.4px' }}>
          📊 Monthly Sales Revenue vs Borrow Outstanding (Rs.)
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={salesVsBorrowChartData} margin={{ top: 8, right: 30, left: 20, bottom: 5 }} barCategoryGap="28%" barGap={4}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5e6e6" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#666', fontWeight: 600 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#666' }} tickFormatter={(v) => `Rs.${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(value, name) => [`Rs. ${Number(value).toFixed(2)}`, name]}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e0c0c0', fontSize: '12px', backgroundColor: '#fff' }}
            />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
            <Bar dataKey="sales" fill="#4f83cc" name="Total Sales (Rs.)" radius={[6, 6, 0, 0]} maxBarSize={34} stroke="#2563eb" strokeWidth={1.2} />
            <Bar dataKey="borrow" fill="#ff8042" name="Borrow Outstanding (Rs.)" radius={[6, 6, 0, 0]} maxBarSize={34} stroke="#ea580c" strokeWidth={1.2} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="rp-stats-row">
        <div className="rp-stat-card">
          <div className="rp-stat-label">Total Partial Bills</div>
          <div className="rp-stat-value">{filtered.length}</div>
        </div>
        <div className="rp-stat-card">
          <div className="rp-stat-label">Total Billed</div>
          <div className="rp-stat-value">{fmt(totalBilled)}</div>
        </div>
        <div className="rp-stat-card">
          <div className="rp-stat-label">Amount Paid</div>
          <div className="rp-stat-value green">{fmt(totalPaid)}</div>
        </div>
        <div className="rp-stat-card">
          <div className="rp-stat-label">Balance Outstanding</div>
          <div className="rp-stat-value red">{fmt(totalDue)}</div>
        </div>
      </div>

      <div className="rp-filters">
        <input id="search" name="search" placeholder="Search Bill No / Customer / Phone" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        {!isCashier && (
          <>
            <div className="rp-date-group">
              <label>From</label>
              <input id="dateFrom" name="dateFrom" type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} />
            </div>
            <div className="rp-date-group">
              <label>To</label>
              <input id="dateTo" name="dateTo" type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} />
            </div>
          </>
        )}
        <button className="rp-reset-btn" onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); setTimeframe(initialTimeframe); setPage(1); }}>Reset</button>
      </div>

      <div className="rp-export-row">
        <span className="rp-export-label">Export report:</span>
        <button type="button" className="rp-export-btn pdf" onClick={handleDownloadBorrowPdf} disabled={filtered.length === 0}>
          Download PDF
        </button>
        <button type="button" className="rp-export-btn csv" onClick={handleDownloadBorrowCsv} disabled={filtered.length === 0}>
          Download CSV
        </button>
      </div>

      {loading && <div className="rp-status">Loading partially paid bills…</div>}
      {error && <div className="rp-status error">{error}</div>}
      {!loading && !error && (
        <div className="rp-table-wrap">
          <table className="rp-table">
            <thead>
              <tr>
                <th>Bill No</th><th>Date</th><th>Customer</th><th>Phone</th>
                <th className="right">Total Amount (Rs.)</th><th className="right">Paid (Rs.)</th><th className="right">Balance Due (Rs.)</th><th>Items</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={8} className="rp-empty">No partially paid bills found.</td></tr>
              ) : rows.map(b => (
                <React.Fragment key={b.bill_id}>
                  <tr
                    style={{ cursor: b.bill_items?.length ? 'pointer' : 'default' }}
                    onClick={() => b.bill_items?.length && setExpandedBill(expandedBill === b.bill_id ? null : b.bill_id)}
                  >
                    <td className="bold">#{b.bill_no}</td>
                    <td>{fmtDate(b.bill_date)}</td>
                    <td>{getCustomerName(b)}</td>
                    <td>{getCustomerPhone(b)}</td>
                    <td className="right">{fmtNum(b.total_amount)}</td>
                    <td className="right green">{fmtNum(Number(b.total_amount || 0) - Number(b.balance_due || 0))}</td>
                    <td className="right red"><strong>{fmtNum(b.balance_due)}</strong></td>
                    <td>{b.bill_items?.length || 0} {b.bill_items?.length ? (expandedBill === b.bill_id ? '▲' : '▼') : ''}</td>
                  </tr>
                  {expandedBill === b.bill_id && b.bill_items?.length > 0 && (
                    <tr className="rp-expanded-row">
                      <td colSpan={8}>
                        <div className="rp-vertical-details">
                          {/* 1. Customer & Bill Info */}
                          <div className="rp-details-col">
                            <h3>Customer &amp; Bill Info</h3>
                            <div className="rp-detail-line"><strong>Bill Number:</strong> <span>#{b.bill_no}</span></div>
                            <div className="rp-detail-line"><strong>Bill Date:</strong> <span>{fmtDate(b.bill_date)}</span></div>
                            <div className="rp-detail-line"><strong>Status:</strong> <span className={`rp-badge ${(b.status || '').toLowerCase()}`}>{b.status || '–'}</span></div>
                            <div className="rp-detail-line"><strong>Customer:</strong> <span>{getCustomerName(b)}</span></div>
                            <div className="rp-detail-line"><strong>Phone:</strong> <span>{getCustomerPhone(b)}</span></div>
                            <div className="rp-detail-line"><strong>Address:</strong> <span>{getCustomerAddress(b)}</span></div>
                          </div>

                          {/* 2. Financial & Payments */}
                          <div className="rp-details-col">
                            <h3>Financial Summary</h3>
                            <div className="rp-detail-line"><strong>Original Bill Amount:</strong> <span>{fmt(b.total_amount)}</span></div>
                            <div className="rp-detail-line"><strong>Paid So Far:</strong> <span style={{ color: '#2e7d32', fontWeight: 'bold' }}>{fmt(Number(b.total_amount || 0) - Number(b.balance_due || 0))}</span></div>
                            <div className="rp-detail-line"><strong>Balance Outstanding:</strong> <span style={{ color: '#b71c1c', fontWeight: 'bold' }}>{fmt(b.balance_due)}</span></div>

                            <div style={{ marginTop: '15px' }}>
                              <h4 style={{ fontSize: '13px', color: '#800000', borderBottom: '1px solid #f0dada', paddingBottom: '4px', marginBottom: '8px', fontWeight: 'bold' }}>Payment History</h4>
                              {b.payments && b.payments.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {b.payments.map((p, pIdx) => (
                                    <div key={pIdx} style={{ fontSize: '12px', background: 'white', padding: '6px 10px', borderRadius: '4px', border: '1px solid #eee' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <strong>{fmt(p.amount_paid)}</strong>
                                        <span style={{ color: '#888', fontWeight: '600' }}>{p.payment_method}</span>
                                      </div>
                                      <div style={{ color: '#999', fontSize: '10px', marginTop: '2px' }}>
                                        {fmtDate(p.payment_date)} {p.collected_by ? `· Collected by User #${p.collected_by}` : ''}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div style={{ fontStyle: 'italic', fontSize: '12px', color: '#999' }}>No payments recorded.</div>
                              )}
                            </div>
                          </div>

                          {/* 3. Products Details — table */}
                          <div className="rp-details-col rp-details-col--wide">
                            <h3>Products Details</h3>
                            <div className="rp-prod-table-wrap">
                              <table className="rp-prod-table">
                                <thead>
                                  <tr>
                                    <th>#</th>
                                    <th>Product Name</th>
                                    <th className="center">Qty</th>
                                    <th className="right">Unit Price (Rs.)</th>
                                    <th className="right">Discount (Rs.)</th>
                                    <th className="right">Total (Rs.)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {b.bill_items.map((item, idx) => (
                                    <tr key={idx}>
                                      <td className="muted">{idx + 1}</td>
                                      <td className="bold">{item.product?.product_name || `Product #${item.product_id}`}</td>
                                      <td className="center">{item.quantity}</td>
                                      <td className="right">{fmtNum(item.price_per_unit)}</td>
                                      <td className="right">{Number(item.discount || 0) > 0 ? fmtNum(item.discount) : '–'}</td>
                                      <td className="right green">{fmtNum(item.total_price)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot>
                                  <tr>
                                    <td colSpan={5} className="right"><strong>Bill Total</strong></td>
                                    <td className="right"><strong>{fmtNum(b.total_amount)}</strong></td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>
                        </div>
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
  { key: 'sales', label: '💳 Sales Report' },
  { key: 'returns', label: '↩️ Return Logs' },
  { key: 'borrow', label: '📦 Borrow Report' },
  { key: 'procurement', label: '🛒 Procurement Report' },
];

function ReportsPage() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const isCashier = role?.toLowerCase() === 'cashier';
  const [activeTab, setActiveTab] = useState('sales');
  const [tabEnter, setTabEnter] = useState(false);

  useEffect(() => {
    if (isCashier && activeTab === 'procurement') {
      setActiveTab('sales');
    }
  }, [isCashier, activeTab]);

  useEffect(() => {
    setTabEnter(false);
    const timer = window.setTimeout(() => setTabEnter(true), 16);
    return () => window.clearTimeout(timer);
  }, [activeTab]);

  const tabs = isCashier ? TABS.filter((tab) => tab.key !== 'procurement') : TABS;

  return (
    <DashboardLayout active="reports">
      <div className="rp-container cashier-page-shell">
        {/* Header */}
        <div className="rp-header">
          <div>
            <h1>Reports &amp; Logs</h1>
            <p>View detailed Sales and Borrow reports, and Return logs with filters</p>
          </div>
          {/* <button className="rp-back-btn" onClick={() => navigate(-1)}>Back</button> */}
        </div>

        {/* Tab nav */}
        <div className="rp-tabs">
          {tabs.map(t => (
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
        <div className={`rp-body report-view-shell ${tabEnter ? "report-view-shell-active" : ""}`}>
          {activeTab === 'sales' && <SalesReport />}
          {activeTab === 'returns' && <ReturnsReport />}
          {activeTab === 'borrow' && <BorrowReport />}
          {!isCashier && activeTab === 'procurement' && <ProcurementReports />}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default ReportsPage;