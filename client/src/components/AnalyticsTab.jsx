import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

/* ── helpers ── */
const fmt  = (v) => `Rs. ${Number(v ?? 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
const fmtN = (v) => Number(v ?? 0).toLocaleString('en-LK');
const fmtDate = (v) => {
  if (!v) return '–';
  const d = new Date(v);
  return isNaN(d) ? v : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const DEFAULT_FROM = (() => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
})();
const DEFAULT_TO = new Date().toISOString().slice(0, 10);
const getDateRange = (monthsBack) => {
  const toDate = new Date();
  const fromDate = new Date(toDate);
  fromDate.setMonth(fromDate.getMonth() - monthsBack);
  return {
    from: fromDate.toISOString().slice(0, 10),
    to: toDate.toISOString().slice(0, 10),
  };
};

const CARDS = [
  { key: 'top-products',      label: 'Top-Selling Products',          color: '#8b3a3a', icon: '📦' },
  { key: 'cashier-activity',  label: 'Cashier Sales Activity',        color: '#1565c0', icon: '🧾' },
  { key: 'regular-customers', label: 'Borrowing Customers',            color: '#2e7d32', icon: '👥' },
  { key: 'regular-suppliers', label: 'Regular Suppliers',             color: '#6a1b9a', icon: '🏭' },
  { key: 'supplier-returns',  label: 'Products Returned to Suppliers',color: '#e65100', icon: '↩️' },
  { key: 'borrow-balances',   label: 'Outstanding Borrow Balances',   color: '#b71c1c', icon: '💳' },
];

/* ── detail renderers ── */
function TopProductsDetail({ rows }) {
  return (
    <table className="rp-table">
      <thead><tr><th>#</th><th>Product</th><th className="right">Qty Sold</th><th className="right">Revenue</th><th className="right">Bills</th></tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.product_id}>
            <td className="muted">{i + 1}</td>
            <td className="bold">{r.product_name}</td>
            <td className="right">{fmtN(r.total_qty)}</td>
            <td className="right green">{fmt(r.total_revenue)}</td>
            <td className="right">{r.bill_count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CashierDetail({ rows, from, to }) {
  const [selectedCashier, setSelectedCashier] = useState(null);
  const [activityRows, setActivityRows] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState('');

  const selectCashier = async (cashier) => {
    setSelectedCashier(cashier);
    setActivityLoading(true);
    setActivityError('');
    try {
      const res = await api.get(`/analytics/cashier-activity/${cashier.user_id}`, { params: { from, to } });
      setActivityRows(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setActivityRows([]);
      setActivityError(e.response?.data?.error || 'Failed to load cashier activity');
    } finally {
      setActivityLoading(false);
    }
  };

  return (
    <div className="an-cashier-report">
      <div className="an-cashier-grid">
        {rows.map((r, index) => (
          <button
            type="button"
            key={r.user_id}
            className={`an-cashier-card${selectedCashier?.user_id === r.user_id ? ' selected' : ''}`}
            style={{ '--cashier-accent': ['#1565c0', '#2e7d32', '#8b3a3a'][index % 3] }}
            onClick={() => selectCashier(r)}
          >
            <div className="an-cashier-card-heading">
              <span className="an-cashier-avatar">{(r.first_name || '?').charAt(0).toUpperCase()}</span>
              <span>
                <strong>{r.first_name} {r.last_name}</strong>
                <small>{r.role || 'Cashier'}</small>
              </span>
            </div>
            <div className="an-cashier-metrics">
              <span><b>{r.transaction_count}</b> transactions</span>
              <span><b>{fmt(r.total_billed)}</b> billed</span>
            </div>
            <div className="an-cashier-dates">
              <span>First: {fmtDate(r.first_txn)}</span>
              <span>Last: {fmtDate(r.last_txn)}</span>
            </div>
          </button>
        ))}
      </div>

      {selectedCashier && (
        <div className="an-cashier-activity-panel">
          <h3>{selectedCashier.first_name} {selectedCashier.last_name} Activity</h3>
          {activityLoading && <div className="rp-status">Loading activity…</div>}
          {activityError && <div className="rp-status error">{activityError}</div>}
          {!activityLoading && !activityError && activityRows.length === 0 && (
            <div className="rp-empty">No activity found for this cashier in the selected period.</div>
          )}
          {!activityLoading && !activityError && activityRows.length > 0 && (
            <div className="rp-table-wrap">
              <table className="rp-table">
                <thead><tr><th>Date and Time</th><th>Bill / Receipt</th><th>Status</th><th className="right">Amount Billed</th></tr></thead>
                <tbody>
                  {activityRows.map((activity) => (
                    <tr key={activity.bill_id}>
                      <td>{fmtDate(activity.bill_date)} {activity.bill_time}</td>
                      <td className="bold">{activity.bill_no}</td>
                      <td>{activity.status || '–'}</td>
                      <td className="right green">{fmt(activity.total_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CustomersDetail({ rows }) {
  return (
    <table className="rp-table">
      <thead><tr><th>Customer</th><th>Phone</th><th className="right">Visits</th><th className="right">Total Spent</th><th className="right">Outstanding</th><th>Last Visit</th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.customer_id}>
            <td className="bold">{r.customer_name}</td>
            <td>{r.phone_no || '–'}</td>
            <td className="right">{r.visit_count}</td>
            <td className="right green">{fmt(r.total_spent)}</td>
            <td className="right red">{fmt(r.total_due)}</td>
            <td>{fmtDate(r.last_visit)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SuppliersDetail({ rows }) {
  return (
    <table className="rp-table">
      <thead><tr><th>Supplier</th><th>Contact</th><th>Phone</th><th className="right">POs</th><th className="right">Total Ordered</th><th>Last Order</th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.supplier_id}>
            <td className="bold">{r.supplier_name}</td>
            <td>{r.contact_person || '–'}</td>
            <td>{r.phone || '–'}</td>
            <td className="right">{r.po_count}</td>
            <td className="right green">{fmt(r.total_ordered)}</td>
            <td>{fmtDate(r.last_order)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SupplierReturnsDetail({ rows }) {
  return (
    <table className="rp-table">
      <thead><tr><th>Product</th><th>Supplier</th><th className="right">Returns</th><th className="right">Total Qty</th><th>Status</th><th>Last Returned</th></tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            <td className="bold">{r.product_name}</td>
            <td>{r.supplier_name}</td>
            <td className="right">{r.return_count}</td>
            <td className="right">{fmtN(r.total_qty)}</td>
            <td><span className={`rp-badge ${(r.status || '').toLowerCase().replace(/_/g, '-')}`}>{r.status}</span></td>
            <td>{fmtDate(r.last_returned)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function BorrowDetail({ rows }) {
  return (
    <table className="rp-table">
      <thead><tr><th>Customer</th><th>Phone</th><th className="right">Partial Bills</th><th className="right">Outstanding</th><th className="right">Total Billed</th><th>Latest Borrow</th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.customer_id}>
            <td className="bold">{r.customer_name}</td>
            <td>{r.phone_no || '–'}</td>
            <td className="right">{r.partial_bill_count}</td>
            <td className="right red"><strong>{fmt(r.total_outstanding)}</strong></td>
            <td className="right">{fmt(r.total_billed)}</td>
            <td>{fmtDate(r.latest_borrow)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const DETAIL_MAP = {
  'top-products':      TopProductsDetail,
  'cashier-activity':  CashierDetail,
  'regular-customers': CustomersDetail,
  'regular-suppliers': SuppliersDetail,
  'supplier-returns':  SupplierReturnsDetail,
  'borrow-balances':   BorrowDetail,
};

/* ── detail view ── */
function DetailView({ card, from, to, onBack }) {
  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/analytics/${card.key}`, { params: { from, to } });
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [card.key, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const Detail = DETAIL_MAP[card.key];

  return (
    <div className="an-detail-view">
      <div className="an-detail-header" style={{ borderLeft: `4px solid ${card.color}` }}>
        <button type="button" className="an-back-btn" onClick={onBack}>← Back</button>
        <span className="an-detail-title">{card.icon} {card.label}</span>
      </div>
      {loading && <div className="rp-status">Loading…</div>}
      {error   && <div className="rp-status error">{error}</div>}
      {!loading && !error && rows.length === 0 && (
        <div className="rp-empty">No data found for the selected period.</div>
      )}
      {!loading && !error && rows.length > 0 && (
        <div className="rp-table-wrap" style={{ marginTop: 0 }}>
          <Detail rows={rows} from={from} to={to} />
        </div>
      )}
    </div>
  );
}

/* ── main tab ── */
export default function AnalyticsTab() {
  const [from,       setFrom]       = useState(DEFAULT_FROM);
  const [to,         setTo]         = useState(DEFAULT_TO);
  const [activeRange, setActiveRange] = useState(null);
  const [activeCard, setActiveCard] = useState(null);

  useEffect(() => {
    if (!activeCard) return undefined;

    const handleKeyDown = (event) => {
      if (event.key !== 'Backspace') return;

      const target = event.target;
      const tagName = target?.tagName?.toLowerCase();
      if (
        tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'select' ||
        target?.isContentEditable ||
        target?.closest?.('[contenteditable="true"]')
      ) {
        return;
      }

      event.preventDefault();
      setActiveCard(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCard]);

  const applyDateRange = (monthsBack) => {
    const range = getDateRange(monthsBack);
    setFrom(range.from);
    setTo(range.to);
    setActiveRange(monthsBack);
  };

  return (
    <div className="rp-section an-analytics-tab">
      {/* Date filter bar */}
      <div className="rp-filters" style={{ marginBottom: 0 }}>
        <div className="rp-date-group">
          <label>From</label>
          <input id="an-from" name="an-from" type="date" value={from} max={to} onChange={e => { setFrom(e.target.value); setActiveRange(null); }} />
        </div>
        <div className="rp-date-group">
          <label>To</label>
          <input id="an-to" name="an-to" type="date" value={to} min={from} onChange={e => { setTo(e.target.value); setActiveRange(null); }} />
        </div>
        <div className="an-range-actions">
          <button className={`rp-reset-btn${activeRange === 1 ? ' active' : ''}`} aria-pressed={activeRange === 1} onClick={() => applyDateRange(1)}>
            Last 30 Days
          </button>
          <button className={`rp-reset-btn${activeRange === 3 ? ' active' : ''}`} aria-pressed={activeRange === 3} onClick={() => applyDateRange(3)}>
            Last 3 Months
          </button>
          <button className={`rp-reset-btn${activeRange === 12 ? ' active' : ''}`} aria-pressed={activeRange === 12} onClick={() => applyDateRange(12)}>
            Last Year
          </button>
        </div>
      </div>

      {activeCard ? (
        <DetailView
          card={activeCard}
          from={from}
          to={to}
          onBack={() => setActiveCard(null)}
        />
      ) : (
        <div className="an-grid">
          {CARDS.map(card => (
            <button
              key={card.key}
              type="button"
              className="an-sq-card"
              style={{ borderTop: `4px solid ${card.color}` }}
              onClick={() => setActiveCard(card)}
            >
              <span className="an-sq-icon">{card.icon}</span>
              <span className="an-sq-label">{card.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
