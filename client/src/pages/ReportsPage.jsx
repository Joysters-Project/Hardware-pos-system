import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import api from '../api/axios';
import { jsPDF } from 'jspdf';
import { useAuth } from '../context/AuthContext';
import '../styles/ReportsPage.css';
import '../styles/Returns.css';

/* ─── helpers ─── */
const fmt = (v) => `Rs. ${Number(v ?? 0).toFixed(2)}`;
const csvEscape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
const dateStamp = () => new Date().toISOString().slice(0, 10);
const textRowsToPdf = (pdf, headers, rows, left, top, widths, pageWidth, pageHeight) => {
  const rowHeight = 18;
  let y = top;
  const totalWidth = widths.reduce((sum, w) => sum + w, 0);

  const drawHeader = () => {
    pdf.setFillColor(248, 228, 229);
    pdf.rect(left, y - 14, totalWidth, rowHeight, 'F');
    pdf.setFontSize(10);
    pdf.setTextColor('#800000');
    let x = left + 4;
    headers.forEach((label, index) => {
      pdf.text(String(label), x, y);
      x += widths[index];
    });
    y += rowHeight;
  };

  drawHeader();

  rows.forEach((row, index) => {
    if (y + rowHeight > pageHeight - 40) {
      pdf.addPage();
      y = 40;
      drawHeader();
    }
    pdf.setFontSize(9);
    pdf.setTextColor('#333');
    let x = left + 4;
    row.forEach((cell, colIndex) => {
      const text = String(cell ?? '–');
      pdf.text(text, x, y);
      x += widths[colIndex];
    });
    y += rowHeight;
  });
};
const createReportPdf = (title, headers, rows) => {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  pdf.setFontSize(16);
  pdf.setTextColor('#800000');
  pdf.text(title, 40, 40);
  pdf.setFontSize(10);
  pdf.setTextColor('#555');
  pdf.text(`Generated on ${new Date().toLocaleString()}`, 40, 58);

  const widths = headers.map(() => Math.floor((pageWidth - 80) / headers.length));
  textRowsToPdf(pdf, headers, rows, 40, 90, widths, pageWidth, pageHeight);
  return pdf;
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

/* ═══════════════════════════════════════════════════════════
   SALES REPORT TAB
═══════════════════════════════════════════════════════════ */
function SalesReport() {
  const { isAuthenticated } = useAuth();
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
        
        if (!isAuthenticated) {
          setError('Not authenticated. Please log in.');
          return;
        }
        
        const [bRes, cRes] = await Promise.all([api.get('/bills'), api.get('/customers')]);
        setBills(Array.isArray(bRes.data) ? bRes.data : []);
        setCustomers(Array.isArray(cRes.data) ? cRes.data : []);
      } catch (e) {
        if (e.response?.status === 401) {
          setError('Authentication failed. Please log in again.');
        } else {
          setError('Failed to load sales data.');
        }
      }
      finally { setLoading(false); }
    };
    load();
  }, [isAuthenticated]);

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

  const salesHeaders = ['Bill No', 'Date', 'Customer', 'Phone', 'Total', 'Paid', 'Balance', 'Status'];
  const salesRows = filtered.map((b) => [
    b.bill_no,
    fmtDate(b.bill_date),
    getName(b),
    getPhone(b),
    fmt(b.total_amount),
    fmt(Number(b.total_amount || 0) - Number(b.balance_due || 0)),
    fmt(b.balance_due),
    b.status || '–',
  ]);

  const reset = () => { setSearch(''); setBillSearch(''); setDateFilter(''); setStatusFilter(''); setPage(1); };

  const handleDownloadSalesCsv = () => {
    const csv = [salesHeaders, ...salesRows].map((row) => row.map(csvEscape).join(',')).join('\r\n');
    downloadBlob(`sales-report-${dateStamp()}.csv`, csv, 'text/csv;charset=utf-8;');
  };

  const handleDownloadSalesPdf = () => {
    const pdf = createReportPdf('Sales Report', salesHeaders, salesRows);
    pdf.save(`sales-report-${dateStamp()}.pdf`);
  };

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
   RETURNS LOGS TAB
═══════════════════════════════════════════════════════════ */
function ReturnsReport() {
  const { role, isAuthenticated } = useAuth();
  const [returnsData, setReturnsData] = useState([]);
  const [filter, setFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isManagerOrAdmin = ['manager', 'admin'].includes(role?.toLowerCase());
  const isCashier = role?.toLowerCase() === 'cashier';
  const isAuthorized = isManagerOrAdmin || isCashier;

  useEffect(() => {
    if (isCashier && dateFilter !== 'today') setDateFilter('today');
  }, [isCashier, dateFilter]);

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

  const reset = () => { setFilter(''); setSearch(''); if (!isCashier) setDateFilter('all'); };

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

  const filteredReturns = returnsData.filter(r => {
    const q = search.toLowerCase();
    return !q || 
      String(r.return_id || '').includes(q) ||
      (r.bill?.bill_no || r.bills?.bill_no || r.bill_number || '').toLowerCase().includes(q) ||
      (r.bill?.customer?.customer_name || '').toLowerCase().includes(q) ||
      (r.bill?.customer?.phone_no || '').includes(q);
  });

  const totalRefunded = filteredReturns.reduce((s, r) => s + Number(r.total_refund_amount || 0), 0);
  const totalItems = filteredReturns.reduce((s, r) => s + (r.items?.length || 0), 0);

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

    const pdf = createReportPdf('Returns Logs', pdfHeaders, pdfRows);
    pdf.save(`returns-logs-${dateStamp()}.pdf`);
  };

  // Helper for displaying time in return logs cards
  const fmtDateTime = (v) => {
    if (!v) return '–';
    const d = new Date(v);
    return isNaN(d) ? v : d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="rp-section">
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

      {/* Filters */}
      <div className="rp-filters">
        <input 
          placeholder="Search Return ID / Bill No / Customer" 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          style={{ minWidth: '260px' }}
        />
        <select value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">All Destinations</option>
          <option value="STOCK">Stock</option>
          <option value="REPAIR">Repair</option>
          <option value="SUPPLIER">Supplier</option>
          <option value="DAMAGED_STOCK">Damaged Stock</option>
        </select>

        {isManagerOrAdmin && (
          <select value={dateFilter} onChange={e => setDateFilter(e.target.value)}>
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

      {/* Loading */}
      {loading ? (
        <div className="rp-status">Loading return logs…</div>
      ) : (
        <div className="rp-returns-list">
          {filteredReturns.length === 0 ? (
            <div className="rp-empty-card">No return records found.</div>
          ) : (
            filteredReturns.map((record) => {
              const fs = record.financial_summary;
              const billNo = record.bill?.bill_no || record.bills?.bill_no || record.bill_number || '–';
              const totalBillAmount = record.bill?.total_amount || 0;
              return (
                <div key={record.return_id} className="rp-ret-card vertical-card">
                  {/* Vertical Details Block with 3 columns */}
                  <div className="rp-ret-vertical-grid">
                    {/* Column 1: Return Information */}
                    <div className="rp-ret-col">
                      <h4>Return Information</h4>
                      <div className="rp-ret-row"><strong>Return ID:</strong> <span>#{record.return_id}</span></div>
                      <div className="rp-ret-row"><strong>Date:</strong> <span>{fmtDateTime(record.return_date)}</span></div>
                      <div className="rp-ret-row"><strong>Status:</strong> <span className={`rp-badge ${(record.status || '').toLowerCase().replace('_', '-')}`}>{record.status}</span></div>
                      <div className="rp-ret-row"><strong>Processed By:</strong> <span>User #{record.processed_by || '–'}</span></div>
                      <div className="rp-ret-row"><strong>Customer Name:</strong> <span>{record.bill?.customer?.customer_name || 'Walk-in'}</span></div>
                      <div className="rp-ret-row"><strong>Customer Phone:</strong> <span>{record.bill?.customer?.phone_no || '–'}</span></div>
                    </div>

                    {/* Column 2: Returned Products Details (Middle Column) */}
                    <div className="rp-ret-col">
                      <h4>Returned Products Details</h4>
                      <div className="rp-ret-items-list-vertical">
                        {record.items && record.items.map((item, idx) => (
                          <div 
                            key={item.return_item_id || idx} 
                            style={{ 
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px',
                              marginBottom: idx < record.items.length - 1 ? '16px' : '0', 
                              paddingBottom: idx < record.items.length - 1 ? '12px' : '0', 
                              borderBottom: idx < record.items.length - 1 ? '1px dashed #e5cccc' : 'none' 
                            }}
                          >
                            <div className="rp-ret-row"><strong>Product:</strong> <span>{item.product?.product_name || '–'}</span></div>
                            <div className="rp-ret-row"><strong>Qty:</strong> <span>{item.return_quantity}</span></div>
                            <div className="rp-ret-row"><strong>Refund:</strong> <span>{fmt(item.refund_amount)}</span></div>
                            <div className="rp-ret-row"><strong>Reason:</strong> <span>{item.return_reason || '–'}</span></div>
                            <div className="rp-ret-row"><strong>Destination:</strong> <span className="rp-dest-badge">{item.destination}</span></div>
                            {item.destination_note && (
                              <div className="rp-ret-row"><strong>Notes:</strong> <span>{item.destination_note}</span></div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Column 3: Financial Details */}
                    <div className="rp-ret-col">
                      <h4>Financial Details</h4>
                      <div className="rp-ret-row"><strong>Bill Number:</strong> <span>{billNo}</span></div>
                      <div className="rp-ret-row"><strong>Original Bill Amount:</strong> <span>{fmt(fs?.total_bill || totalBillAmount)}</span></div>
                      <div className="rp-ret-row"><strong>Paid Amount:</strong> <span>{fmt(fs?.total_paid || 0)}</span></div>
                      <div className="rp-ret-row"><strong>Total Returned Value:</strong> <span style={{ color: '#b71c1c', fontWeight: 'bold' }}>{fmt(record.total_refund_amount)}</span></div>
                      <div className="rp-ret-row"><strong>Should Return to Customer:</strong> <span style={{ color: '#2e7d32', fontWeight: 'bold' }}>{fmt(fs?.refundable_amount || 0)}</span></div>
                      <div className="rp-ret-row"><strong>Remaining Balance Payable:</strong> <span style={{ color: '#e65100', fontWeight: 'bold' }}>{fmt(Math.max(0, ((fs?.total_bill || totalBillAmount) - (fs?.total_paid || 0)) - record.total_refund_amount))}</span></div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   BORROW REPORT TAB  (Partially Paid Bills)
═══════════════════════════════════════════════════════════ */
function BorrowReport() {
  const { isAuthenticated } = useAuth();
  const [bills, setBills] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
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
        
        // Filter for partial bills and ensure they have customer and bill_items details
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

  const filtered = useMemo(() => {
    return bills.filter(b => {
      const q = search.toLowerCase();
      const matchSearch = !q || String(b.bill_no || '').includes(q) ||
        getCustomerName(b).toLowerCase().includes(q) ||
        getCustomerPhone(b).includes(q);
      const matchFrom = !dateFrom || dateKey(b.bill_date) >= dateFrom;
      const matchTo = !dateTo || dateKey(b.bill_date) <= dateTo;
      return matchSearch && matchFrom && matchTo;
    });
  }, [bills, customers, search, dateFrom, dateTo]);

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
    const pdf = createReportPdf('Borrow Report - Partially Paid Bills', borrowHeaders, borrowRows);
    pdf.save(`borrow-report-${dateStamp()}.pdf`);
  };

  return (
    <div className="rp-section">
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
        <input placeholder="Search Bill No / Customer / Phone" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        <div className="rp-date-group">
          <label>From</label>
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} />
        </div>
        <div className="rp-date-group">
          <label>To</label>
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} />
        </div>
        <button className="rp-reset-btn" onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); setPage(1); }}>Reset</button>
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
                <th className="right">Total Amount</th><th className="right">Paid</th><th className="right">Balance Due</th><th>Items</th>
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
                    <td className="right">{fmt(b.total_amount)}</td>
                    <td className="right green">{fmt(Number(b.total_amount || 0) - Number(b.balance_due || 0))}</td>
                    <td className="right red"><strong>{fmt(b.balance_due)}</strong></td>
                    <td>{b.bill_items?.length || 0} {b.bill_items?.length ? (expandedBill === b.bill_id ? '▲' : '▼') : ''}</td>
                  </tr>
                  {expandedBill === b.bill_id && b.bill_items?.length > 0 && (
                    <tr className="rp-expanded-row">
                      <td colSpan={8}>
                        <div className="rp-vertical-details">
                          {/* 1. Customer & Bill Info */}
                          <div className="rp-details-col">
                            <h3>Customer & Bill Info</h3>
                            <div className="rp-detail-line"><strong>Bill Number:</strong> <span>#{b.bill_no}</span></div>
                            <div className="rp-detail-line"><strong>Bill Date:</strong> <span>{fmtDate(b.bill_date)}</span></div>
                            <div className="rp-detail-line"><strong>Status:</strong> <span className={`rp-badge ${(b.status || '').toLowerCase()}`}>{b.status || '–'}</span></div>
                            <div className="rp-detail-line"><strong>Customer:</strong> <span>{getCustomerName(b)}</span></div>
                            <div className="rp-detail-line"><strong>Phone:</strong> <span>{getCustomerPhone(b)}</span></div>
                            <div className="rp-detail-line"><strong>Address:</strong> <span>{getCustomerAddress(b)}</span></div>
                          </div>

                          {/* 2. Products Details */}
                          <div className="rp-details-col">
                            <h3>Products Details</h3>
                            <div className="rp-vertical-items-list">
                              {b.bill_items.map((item, idx) => (
                                <div key={idx} className="rp-vertical-item-card">
                                  <div className="rp-item-row bold">
                                    <span>{item.product?.product_name || `Product #${item.product_id}`}</span>
                                  </div>
                                  <div className="rp-item-vertical-details">
                                    <div><strong>Qty:</strong> {item.quantity}</div>
                                    <div><strong>Unit Price:</strong> {fmt(item.price_per_unit)}</div>
                                    {Number(item.discount || 0) > 0 && <div><strong>Discount:</strong> {fmt(item.discount)}</div>}
                                    <div><strong>Total:</strong> {fmt(item.total_price)}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* 3. Financial & Payments */}
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
  { key: 'sales',   label: '💳 Sales Report'  },
  { key: 'returns', label: '↩️ Return Logs'  },
  { key: 'borrow',  label: '📦 Borrow Report'  },
];

function ReportsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('sales');

  
  return (
    <DashboardLayout active="reports">
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
    </DashboardLayout>
  );
}

export default ReportsPage;
