import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { RefreshCw } from 'lucide-react';
import { useSupplierPerformanceReport, usePurchaseSummaryReport, useOutstandingOrdersReport } from '../../services/procurementApi';
import '../../styles/Procurement.css';

const TABS = ['Performance', 'Purchases', 'Outstanding'];

function ProcurementReports() {
  const [tab, setTab] = useState('Performance');
  const { data: performance = [], isLoading: pl, refetch: rp } = useSupplierPerformanceReport();
  const { data: purchases   = [], isLoading: ql, refetch: rq } = usePurchaseSummaryReport();
  const { data: outstanding = [], isLoading: ol, refetch: ro } = useOutstandingOrdersReport();

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '—';

  return (
    <div className="proc-container">
      <div className="proc-header">
        <div>
          <h1>Procurement Reports</h1>
          <p>Supplier performance, purchase analysis and outstanding orders</p>
        </div>
        <div className="proc-header-actions">
          <button className="proc-btn-outline" onClick={() => { rp(); rq(); ro(); }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="proc-tabs">
        {TABS.map(t => (
          <button key={t} className={`proc-tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {/* ── Performance Tab ── */}
      {tab === 'Performance' && (
        <div>
          <div className="proc-card" style={{ marginBottom: '1.25rem' }}>
            <div className="proc-card-header"><h2>On-Time Delivery %</h2></div>
            <div className="proc-card-body">
              {pl || performance.length === 0 ? (
                <div className="proc-empty" style={{ height: 200 }}>{pl ? 'Loading...' : 'No data available'}</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={performance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="supplier_name" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0,100]} tickFormatter={v => `${v}%`} />
                    <Tooltip formatter={v => [`${v}%`, 'On-Time %']} />
                    <Bar dataKey="on_time_pct" radius={[4,4,0,0]}>
                      {performance.map((r, i) => (
                        <Cell key={i} fill={r.on_time_pct >= 80 ? '#1d7e42' : r.on_time_pct >= 50 ? '#e65100' : '#c62828'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="proc-card">
            <div className="proc-card-header"><h2>Supplier Performance Details</h2></div>
            <div className="proc-table-wrap">
              <table className="proc-table">
                <thead>
                  <tr>
                    <th>Supplier</th>
                    <th style={{ textAlign: 'center' }}>Total Orders</th>
                    <th style={{ textAlign: 'center' }}>On Time %</th>
                    <th style={{ textAlign: 'center' }}>Avg Delay (days)</th>
                    <th>Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {pl ? (
                    <tr><td colSpan="5" className="proc-empty">Loading...</td></tr>
                  ) : performance.length === 0 ? (
                    <tr><td colSpan="5" className="proc-empty">No data available</td></tr>
                  ) : performance.map(row => (
                    <tr key={row.supplier_id}>
                      <td>
                        <div className="proc-name-cell">{row.supplier_name}</div>
                        <div style={{ fontSize: '12px', color: '#888', fontFamily: 'monospace' }}>{row.supplier_code}</div>
                      </td>
                      <td style={{ textAlign: 'center' }}>{row.total_orders}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontWeight: 700, color: row.on_time_pct >= 80 ? '#1d7e42' : row.on_time_pct >= 50 ? '#e65100' : '#c62828' }}>
                          {row.on_time_pct}%
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>{row.avg_delay_days || 0}</td>
                      <td>
                        {[1,2,3,4,5].map(s => (
                          <span key={s} style={{ color: s <= (row.performance_rating || 0) ? '#f59e0b' : '#d1d5db', fontSize: '13px' }}>★</span>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Purchases Tab ── */}
      {tab === 'Purchases' && (
        <div>
          <div className="proc-stats" style={{ marginBottom: '1.25rem' }}>
            {[
              { label: 'Total Purchase Value', value: `LKR ${purchases.reduce((s,r)=>s+r.total_value,0).toFixed(2)}`,    color: '#8b3a3a' },
              { label: 'Received Value',        value: `LKR ${purchases.reduce((s,r)=>s+r.received_value,0).toFixed(2)}`, color: '#1d7e42' },
              { label: 'Total Suppliers',       value: purchases.length,                                                   color: '#1565c0' },
            ].map(({ label, value, color }) => (
              <div className="proc-stat-card" key={label}>
                <div className="proc-stat-value" style={{ color, fontSize: '1.1rem' }}>{value}</div>
                <div className="proc-stat-label">{label}</div>
              </div>
            ))}
          </div>

          <div className="proc-card" style={{ marginBottom: '1.25rem' }}>
            <div className="proc-card-header"><h2>Purchase Value per Supplier</h2></div>
            <div className="proc-card-body">
              {ql || purchases.length === 0 ? (
                <div className="proc-empty" style={{ height: 200 }}>{ql ? 'Loading...' : 'No data available'}</div>
              ) : (
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={purchases}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="supplier_name" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={v => `LKR${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={v => [`LKR ${Number(v).toFixed(2)}`]} />
                    <Bar dataKey="total_value"    name="Total Value"    fill="#8b3a3a" radius={[4,4,0,0]} />
                    <Bar dataKey="received_value" name="Received Value" fill="#1d7e42" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="proc-card">
            <div className="proc-card-header"><h2>Purchase Summary by Supplier</h2></div>
            <div className="proc-table-wrap">
              <table className="proc-table">
                <thead>
                  <tr>
                    <th>Supplier</th>
                    <th style={{ textAlign: 'center' }}>Orders</th>
                    <th style={{ textAlign: 'right' }}>Total Value</th>
                    <th style={{ textAlign: 'right' }}>Received Value</th>
                  </tr>
                </thead>
                <tbody>
                  {ql ? (
                    <tr><td colSpan="4" className="proc-empty">Loading...</td></tr>
                  ) : purchases.length === 0 ? (
                    <tr><td colSpan="4" className="proc-empty">No data available</td></tr>
                  ) : purchases.map(row => (
                    <tr key={row.supplier_id}>
                      <td>
                        <div className="proc-name-cell">{row.supplier_name}</div>
                        <div style={{ fontSize: '12px', color: '#888', fontFamily: 'monospace' }}>{row.supplier_code}</div>
                      </td>
                      <td style={{ textAlign: 'center' }}>{row.total_orders}</td>
                      <td style={{ textAlign: 'right' }}><span className="proc-amount">LKR {row.total_value.toFixed(2)}</span></td>
                      <td style={{ textAlign: 'right' }}><span className="proc-amount" style={{ color: '#1d7e42' }}>LKR {row.received_value.toFixed(2)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Outstanding Tab ── */}
      {tab === 'Outstanding' && (
        <div className="proc-card">
          <div className="proc-card-header" style={{ background: 'linear-gradient(135deg, #c62828, #e53935)' }}>
            <h2>Overdue Purchase Orders</h2>
            {outstanding.length > 0 && <span className="proc-badge-count">{outstanding.length}</span>}
          </div>
          <div className="proc-table-wrap">
            <table className="proc-table">
              <thead>
                <tr>
                  <th>PO Number</th>
                  <th>Supplier</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Expected</th>
                  <th style={{ textAlign: 'center' }}>Days Overdue</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {ol ? (
                  <tr><td colSpan="6" className="proc-empty">Loading...</td></tr>
                ) : outstanding.length === 0 ? (
                  <tr><td colSpan="6" className="proc-empty">✓ No overdue orders</td></tr>
                ) : outstanding.map(po => {
                  const days = Math.floor((new Date() - new Date(po.expected_delivery)) / 86400000);
                  return (
                    <tr key={po.po_id}>
                      <td><span className="proc-po-number">{po.po_number || `#${po.po_id}`}</span></td>
                      <td>
                        <div className="proc-name-cell">{po.supplier?.supplier_name || '—'}</div>
                        <div style={{ fontSize: '12px', color: '#888' }}>{po.supplier?.phone || ''}</div>
                      </td>
                      <td><span className={`proc-status-pill ${po.status?.toLowerCase()}`}>{po.status}</span></td>
                      <td style={{ textAlign: 'center' }}>{fmt(po.expected_delivery)}</td>
                      <td style={{ textAlign: 'center' }}><span style={{ fontWeight: 700, color: '#c62828' }}>{days}d</span></td>
                      <td style={{ textAlign: 'right' }}><span className="proc-amount">LKR {Number(po.total_amount).toFixed(2)}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProcurementReports;
