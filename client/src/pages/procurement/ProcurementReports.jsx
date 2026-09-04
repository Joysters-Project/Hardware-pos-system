import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend,
} from 'recharts';
import { TrendingUp, ShoppingCart, Users, AlertTriangle, CheckCircle } from 'lucide-react';
import {
  useSupplierPerformanceReport, usePurchaseSummaryReport, useOutstandingOrdersReport,
} from '../../services/procurementApi';
import { formatPurchaseOrderNumber } from '../../utils/purchaseOrderNumber';
import '../../styles/Procurement.css';
import '../../styles/ProcurementPages.css';

const TABS = [
  { key: 'performance', label: 'Supplier Performance' },
  { key: 'purchases',   label: 'Purchase Summary'     },
  { key: 'outstanding', label: 'Overdue Orders'        },
];

const PERF_COLOR = (pct) => pct >= 80 ? '#1d7e42' : pct >= 50 ? '#e65100' : '#c62828';

function SummaryCard({ icon: Icon, label, value, color, delay }) {
  return (
    <motion.div className="pp-kpi-card"
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      whileHover={{ y: -2, boxShadow: '0 6px 20px rgba(0,0,0,0.08)' }}>
      <div className="pp-kpi-icon" style={{ background: `${color}15`, color }}>
        <Icon size={18} />
      </div>
      <div>
        <div className="pp-kpi-value" style={{ color }}>{value}</div>
        <div className="pp-kpi-label">{label}</div>
      </div>
    </motion.div>
  );
}

export default function ProcurementReports() {
  const [tab, setTab] = useState('performance');

  const { data: performance = [], isLoading: pl } = useSupplierPerformanceReport();
  const { data: purchases   = [], isLoading: ql } = usePurchaseSummaryReport();
  const { data: outstanding = [], isLoading: ol } = useOutstandingOrdersReport();

  const fmt  = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const fmtN = (n) => `LKR ${Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;

  const purchaseSummary = useMemo(() => ({
    totalValue:    purchases.reduce((s, r) => s + Number(r.total_value    || 0), 0),
    receivedValue: purchases.reduce((s, r) => s + Number(r.received_value || 0), 0),
    totalOrders:   purchases.reduce((s, r) => s + Number(r.total_orders   || 0), 0),
    supplierCount: purchases.length,
  }), [purchases]);

  const perfSummary = useMemo(() => ({
    avgOnTime: performance.length
      ? Math.round(performance.reduce((s, r) => s + Number(r.on_time_pct || 0), 0) / performance.length)
      : 0,
    topPerformer: performance.find(r => r.on_time_pct === Math.max(...performance.map(x => x.on_time_pct || 0))),
    totalOrders:  performance.reduce((s, r) => s + Number(r.total_orders || 0), 0),
  }), [performance]);

  return (
    <div className="proc-container">

      {/* Header */}
      <motion.div className="proc-header"
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <h1>Procurement Reports</h1>
          <p>Supplier performance, purchase analysis and outstanding overdue orders</p>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="proc-tabs">
        {TABS.map(t => (
          <button key={t.key} className={`proc-tab-btn ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}>
            {t.label}
            {t.key === 'outstanding' && outstanding.length > 0 && (
              <span style={{ marginLeft: '6px', background: '#c62828', color: '#fff',
                borderRadius: '999px', fontSize: '10px', padding: '1px 6px', fontWeight: 700 }}>
                {outstanding.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ── PERFORMANCE TAB ── */}
        {tab === 'performance' && (
          <motion.div key="perf"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

            {/* Summary cards */}
            <div className="pp-kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '1.1rem' }}>
              <SummaryCard icon={TrendingUp} label="Avg On-Time Delivery"  value={`${perfSummary.avgOnTime}%`}         color="#1d7e42" delay={0.05} />
              <SummaryCard icon={ShoppingCart} label="Total Orders Tracked" value={perfSummary.totalOrders}             color="#1565c0" delay={0.1}  />
              <SummaryCard icon={Users}       label="Suppliers Evaluated"  value={performance.length}                  color="#8b3a3a" delay={0.15} />
            </div>

            <div className="pp-charts-row" style={{ marginBottom: '1.1rem' }}>
              {/* On-Time Chart */}
              <motion.div className="proc-card" style={{ flex: 2 }}
                initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.18 }}>
                <div className="proc-card-header"><h2>On-Time Delivery Rate by Supplier</h2></div>
                <div className="proc-card-body">
                  {pl || performance.length === 0 ? (
                    <div className="proc-empty" style={{ height: 220 }}>{pl ? 'Loading...' : 'No data available'}</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={performance} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="supplier_name" tick={{ fontSize: 10 }} />
                        <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} />
                        <Tooltip formatter={v => [`${v}%`, 'On-Time %']} />
                        <Bar dataKey="on_time_pct" radius={[4, 4, 0, 0]}>
                          {performance.map((r, i) => (
                            <Cell key={i} fill={PERF_COLOR(r.on_time_pct)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </motion.div>

              {/* Legend */}
              <motion.div className="proc-card" style={{ flex: 1 }}
                initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                <div className="proc-card-header"><h2>Performance Scale</h2></div>
                <div className="proc-card-body">
                  {[
                    { range: '80–100%', label: 'Excellent', color: '#1d7e42' },
                    { range: '50–79%',  label: 'Acceptable', color: '#e65100' },
                    { range: '0–49%',   label: 'Poor',       color: '#c62828' },
                  ].map(({ range, label, color }) => (
                    <div key={range} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0.65rem 0', borderBottom: '1px solid #f5f5f5' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: color, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#2c2c2c' }}>{range}</div>
                        <div style={{ fontSize: '0.75rem', color: '#888' }}>{label}</div>
                      </div>
                    </div>
                  ))}
                  {perfSummary.topPerformer && (
                    <div style={{ marginTop: '1rem', background: '#e5f7eb', borderRadius: '8px', padding: '0.75rem', border: '1px solid #b7ebc9' }}>
                      <div style={{ fontSize: '0.72rem', color: '#1d7e42', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Top Performer</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#2c2c2c', marginTop: '3px' }}>{perfSummary.topPerformer.supplier_name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#1d7e42', fontWeight: 600 }}>{perfSummary.topPerformer.on_time_pct}% on-time</div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Detail Table */}
            <motion.div className="proc-card"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
              <div className="proc-card-header">
                <h2>Supplier Performance Details</h2>
                <span className="proc-badge-count">{performance.length} suppliers</span>
              </div>
              <div className="proc-table-wrap">
                <table className="proc-table">
                  <thead>
                    <tr>
                      <th>Supplier</th>
                      <th style={{ textAlign: 'center' }}>Total Orders</th>
                      <th style={{ textAlign: 'center' }}>Received</th>
                      <th style={{ textAlign: 'center' }}>On-Time %</th>
                      <th style={{ textAlign: 'center' }}>Avg Delay</th>
                      <th>Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pl ? (
                      <tr><td colSpan="6" className="proc-empty">Loading...</td></tr>
                    ) : performance.length === 0 ? (
                      <tr><td colSpan="6" className="proc-empty">No performance data available</td></tr>
                    ) : performance.map((row, i) => (
                      <motion.tr key={row.supplier_id}
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}>
                        <td>
                          <div className="proc-name-cell">{row.supplier_name}</div>
                          <div style={{ fontSize: '11px', color: '#888', fontFamily: 'monospace' }}>{row.supplier_code}</div>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{row.total_orders}</td>
                        <td style={{ textAlign: 'center' }}>{row.received_orders ?? '—'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontWeight: 700, color: PERF_COLOR(row.on_time_pct) }}>
                            {row.on_time_pct}%
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', color: row.avg_delay_days > 0 ? '#c62828' : '#1d7e42' }}>
                          {row.avg_delay_days > 0 ? `+${row.avg_delay_days}d` : '—'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {[1,2,3,4,5].map(s => (
                              <span key={s} style={{ color: s <= (row.performance_rating || 0) ? '#f59e0b' : '#e0e0e0', fontSize: '14px' }}>★</span>
                            ))}
                            {row.performance_rating > 0 && (
                              <span style={{ fontSize: '11px', color: '#888', marginLeft: '2px' }}>{row.performance_rating}/5</span>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ── PURCHASES TAB ── */}
        {tab === 'purchases' && (
          <motion.div key="purch"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

            {/* Summary cards */}
            <div className="pp-kpi-grid" style={{ marginBottom: '1.1rem' }}>
              <SummaryCard icon={TrendingUp}   label="Total Purchase Value" value={fmtN(purchaseSummary.totalValue)}    color="#8b3a3a" delay={0.05} />
              <SummaryCard icon={CheckCircle}  label="Received Value"       value={fmtN(purchaseSummary.receivedValue)} color="#1d7e42" delay={0.1}  />
              <SummaryCard icon={ShoppingCart} label="Total Orders"         value={purchaseSummary.totalOrders}         color="#1565c0" delay={0.15} />
              <SummaryCard icon={Users}        label="Suppliers"            value={purchaseSummary.supplierCount}       color="#e65100" delay={0.2}  />
            </div>

            {/* Bar chart */}
            <motion.div className="proc-card" style={{ marginBottom: '1.1rem' }}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
              <div className="proc-card-header"><h2>Purchase Value vs Received Value by Supplier</h2></div>
              <div className="proc-card-body">
                {ql || purchases.length === 0 ? (
                  <div className="proc-empty" style={{ height: 230 }}>{ql ? 'Loading...' : 'No data available'}</div>
                ) : (
                  <ResponsiveContainer width="100%" height={230}>
                    <BarChart data={purchases} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="supplier_name" tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={v => `LKR${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={v => [fmtN(v)]} />
                      <Legend />
                      <Bar dataKey="total_value"    name="Total Value"    fill="#8b3a3a" radius={[4,4,0,0]} />
                      <Bar dataKey="received_value" name="Received Value" fill="#1d7e42" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </motion.div>

            {/* Table */}
            <motion.div className="proc-card"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
              <div className="proc-card-header">
                <h2>Purchase Summary by Supplier</h2>
                <span className="proc-badge-count">{purchases.length} suppliers</span>
              </div>
              <div className="proc-table-wrap">
                <table className="proc-table">
                  <thead>
                    <tr>
                      <th>Supplier</th>
                      <th style={{ textAlign: 'center' }}>Orders</th>
                      <th style={{ textAlign: 'right' }}>Total Value</th>
                      <th style={{ textAlign: 'right' }}>Received Value</th>
                      <th style={{ textAlign: 'right' }}>Pending Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ql ? (
                      <tr><td colSpan="5" className="proc-empty">Loading...</td></tr>
                    ) : purchases.length === 0 ? (
                      <tr><td colSpan="5" className="proc-empty">No purchase data available</td></tr>
                    ) : purchases.map((row, i) => (
                      <motion.tr key={row.supplier_id}
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}>
                        <td>
                          <div className="proc-name-cell">{row.supplier_name}</div>
                          <div style={{ fontSize: '11px', color: '#888', fontFamily: 'monospace' }}>{row.supplier_code}</div>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{row.total_orders}</td>
                        <td style={{ textAlign: 'right' }}>
                          <span className="proc-amount">{fmtN(row.total_value)}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className="proc-amount" style={{ color: '#1d7e42' }}>{fmtN(row.received_value)}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className="proc-amount" style={{ color: '#e65100' }}>
                            {fmtN(row.total_value - row.received_value)}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                  {purchases.length > 0 && (
                    <tfoot>
                      <tr style={{ background: '#fdf6f6', fontWeight: 700 }}>
                        <td style={{ padding: '0.75rem 1rem', color: '#8b3a3a' }}>Total</td>
                        <td style={{ textAlign: 'center', padding: '0.75rem 1rem' }}>{purchaseSummary.totalOrders}</td>
                        <td style={{ textAlign: 'right', padding: '0.75rem 1rem', color: '#8b3a3a' }}>{fmtN(purchaseSummary.totalValue)}</td>
                        <td style={{ textAlign: 'right', padding: '0.75rem 1rem', color: '#1d7e42' }}>{fmtN(purchaseSummary.receivedValue)}</td>
                        <td style={{ textAlign: 'right', padding: '0.75rem 1rem', color: '#e65100' }}>{fmtN(purchaseSummary.totalValue - purchaseSummary.receivedValue)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ── OUTSTANDING TAB ── */}
        {tab === 'outstanding' && (
          <motion.div key="out"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

            {outstanding.length > 0 && (
              <div className="pp-kpi-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: '1.1rem' }}>
                <SummaryCard icon={AlertTriangle} label="Overdue Orders"   value={outstanding.length} color="#c62828" delay={0.05} />
                <SummaryCard icon={ShoppingCart}  label="Total Value at Risk"
                  value={fmtN(outstanding.reduce((s, p) => s + Number(p.total_amount || 0), 0))} color="#e65100" delay={0.1} />
                <SummaryCard icon={Users}         label="Suppliers Affected"
                  value={new Set(outstanding.map(p => p.supplier_id)).size} color="#8b3a3a" delay={0.15} />
              </div>
            )}

            <motion.div className="proc-card"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
              <div className="proc-card-header" style={{ background: 'linear-gradient(135deg,#c62828,#e53935)' }}>
                <h2>Overdue Purchase Orders</h2>
                {outstanding.length > 0 && <span className="proc-badge-count">{outstanding.length} overdue</span>}
              </div>
              <div className="proc-table-wrap">
                <table className="proc-table">
                  <thead>
                    <tr>
                      <th>PO Number</th>
                      <th>Supplier</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'center' }}>Expected Delivery</th>
                      <th style={{ textAlign: 'center' }}>Days Overdue</th>
                      <th style={{ textAlign: 'right' }}>Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ol ? (
                      <tr><td colSpan="6" className="proc-empty">Loading...</td></tr>
                    ) : outstanding.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="proc-empty">
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '1.5rem' }}>
                            <CheckCircle size={32} style={{ color: '#1d7e42' }} />
                            <span style={{ color: '#1d7e42', fontWeight: 600 }}>All purchase orders are on track</span>
                          </div>
                        </td>
                      </tr>
                    ) : outstanding.map((po, i) => {
                      const days = Math.floor((new Date() - new Date(po.expected_delivery)) / 86400000);
                      return (
                        <motion.tr key={po.po_id}
                          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}>
                          <td><span className="proc-po-number">{formatPurchaseOrderNumber(po.po_number, po.po_id)}</span></td>
                          <td>
                            <div className="proc-name-cell">{po.supplier?.supplier_name || '—'}</div>
                            {po.supplier?.phone && <div style={{ fontSize: '11px', color: '#888' }}>{po.supplier.phone}</div>}
                          </td>
                          <td><span className={`proc-status-pill ${po.status?.toLowerCase()}`}>{po.status}</span></td>
                          <td style={{ textAlign: 'center', color: '#c62828' }}>{fmt(po.expected_delivery)}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{ fontWeight: 700, color: '#c62828', background: '#fdecea', padding: '3px 10px', borderRadius: '999px', fontSize: '0.8rem' }}>
                              {days}d overdue
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <span className="proc-amount">{fmtN(po.total_amount)}</span>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
