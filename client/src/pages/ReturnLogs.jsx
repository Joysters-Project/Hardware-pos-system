import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/axios';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/ReportsPage.css';

const fmt = (v) => `Rs. ${Number(v ?? 0).toFixed(2)}`;
const fmtDate = (v) => {
  if (!v) return '–';
  const d = new Date(v);
  return isNaN(d) ? v : d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

function ReturnLogs() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [returnsData, setReturnsData] = useState([]);
  const [filter, setFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isManagerOrAdmin = ['manager', 'admin'].includes(role?.toLowerCase());
  const isCashier = role?.toLowerCase() === 'cashier';
  const isAuthorized = isManagerOrAdmin || isCashier;

  useEffect(() => {
    if (isCashier && dateFilter !== 'today') setDateFilter('today');
  }, [isCashier, dateFilter]);

  useEffect(() => {
    if (!isAuthorized) return;
    fetchReturns();
  }, [filter, dateFilter, isAuthorized]);

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
      setReturnsData([]);
      setError(err.response?.data?.message || err.response?.data?.error || 'Unable to load return logs');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setFilter(''); if (!isCashier) setDateFilter('all'); };

  if (!isAuthorized) {
    return (
      <div className="rp-container">
        <div className="rp-status error">
          <h2>Access Denied</h2>
          <p>Return logs are only available to authorized personnel.</p>
          <Link to="/" style={{ color: '#800000' }}>Back to Home</Link>
        </div>
      </div>
    );
  }

  const totalRefunded = returnsData.reduce((s, r) => s + Number(r.total_refund_amount || 0), 0);
  const totalItems = returnsData.reduce((s, r) => s + (r.items?.length || 0), 0);

  return (
    <div className="rp-container">
      {/* Header */}
      <div className="rp-header">
        <div>
          <h1>Return Logs</h1>
          <p>Review all processed return transactions</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link to="/returns" className="rp-back-btn" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            + New Return
          </Link>
          <button className="rp-back-btn" onClick={() => navigate(-1)}>Back</button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="rp-stats-row">
        <div className="rp-stat-card">
          <div className="rp-stat-label">Total Returns</div>
          <div className="rp-stat-value">{returnsData.length}</div>
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

      {/* Error */}
      {error && <div className="rp-status error">{error}</div>}

      {/* Loading */}
      {loading ? (
        <div className="rp-status">Loading return logs…</div>
      ) : (
        <div className="rp-returns-list">
          {returnsData.length === 0 ? (
            <div className="rp-empty-card">No return records found.</div>
          ) : (
            returnsData.map((record) => {
              const fs = record.financial_summary;
              const billNo = record.bill?.bill_no || record.bills?.bill_no || '–';
              return (
                <div key={record.return_id} className="rp-ret-card">
                  {/* Header */}
                  <div className="rp-ret-header">
                    <div className="rp-ret-meta">
                      <div className="rp-ret-meta-item">
                        <span className="meta-label">Return ID</span>
                        <span className="meta-value">#{record.return_id}</span>
                      </div>
                      <div className="rp-ret-meta-item">
                        <span className="meta-label">Bill No</span>
                        <span className="meta-value accent">{billNo}</span>
                      </div>
                      <div className="rp-ret-meta-item">
                        <span className="meta-label">Date</span>
                        <span className="meta-value">{fmtDate(record.return_date)}</span>
                      </div>
                      <div className="rp-ret-meta-item">
                        <span className="meta-label">Status</span>
                        <span className={`rp-badge ${(record.status || '').toLowerCase().replace('_', '-')}`}>{record.status}</span>
                      </div>
                    </div>
                    <div className="rp-ret-refund">
                      <span className="meta-label">Total Refund</span>
                      <span className="meta-value">{fmt(record.total_refund_amount)}</span>
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
            })
          )}
        </div>
      )}
    </div>
  );
}

export default ReturnLogs;
