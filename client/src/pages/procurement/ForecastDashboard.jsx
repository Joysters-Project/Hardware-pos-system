import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { RefreshCw, Download, AlertTriangle, Clock, CheckCircle, TrendingDown } from 'lucide-react';
import {
  useForecasts, useDownloadForecastReport,
  useReorderSuggestions, useConvertSuggestionToPO, useTriggerReorderCheck,
} from '../../services/procurementApi';
import '../../styles/Procurement.css';
import '../../styles/ProcurementPages.css';

const SEV_COLOR = { Critical: '#c62828', Low: '#e65100', Safe: '#1d7e42' };
const SEV_BG    = { Critical: '#fdecea', Low: '#fff3e0', Safe: '#e5f7eb' };
const SEV_ICON  = { Critical: AlertTriangle, Low: Clock, Safe: CheckCircle };

function SeverityBadge({ severity }) {
  const Icon = SEV_ICON[severity] || CheckCircle;
  return (
    <span className="pp-severity-badge"
      style={{ background: SEV_BG[severity], color: SEV_COLOR[severity] }}>
      <Icon size={11} /> {severity}
    </span>
  );
}

function DaysBar({ days }) {
  if (!isFinite(days)) return <span style={{ color: '#1d7e42', fontWeight: 700 }}>∞</span>;
  const pct = Math.min((days / 60) * 100, 100);
  const color = days <= 7 ? '#c62828' : days <= 14 ? '#e65100' : '#1d7e42';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '100px' }}>
      <div style={{ flex: 1, height: '6px', background: '#f0f0f0', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 0.4s' }} />
      </div>
      <span style={{ fontSize: '0.82rem', fontWeight: 700, color, minWidth: '30px' }}>{Math.round(days)}d</span>
    </div>
  );
}

export default function ForecastDashboard() {
  const [search, setSearch]       = useState('');
  const [sevFilter, setSevFilter] = useState('');
  const [activeTab, setTab]       = useState('forecast');

  const { data: forecasts = [], isLoading: fl, refetch: rf } = useForecasts();
  const { data: suggestions = [], isLoading: sl, refetch: rs } = useReorderSuggestions();
  const downloadMutation = useDownloadForecastReport();
  const convertMutation  = useConvertSuggestionToPO();
  const triggerMutation  = useTriggerReorderCheck();

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '—';

  const filtered = useMemo(() =>
    forecasts.filter(f => {
      const term = search.toLowerCase();
      return (!term || f.product_name.toLowerCase().includes(term)) &&
        (!sevFilter || f.severity === sevFilter);
    }), [forecasts, search, sevFilter]);

  const counts = useMemo(() => ({
    critical: forecasts.filter(f => f.severity === 'Critical').length,
    low:      forecasts.filter(f => f.severity === 'Low').length,
    safe:     forecasts.filter(f => f.severity === 'Safe').length,
  }), [forecasts]);

  const chartData = useMemo(() =>
    filtered.filter(f => isFinite(f.days_remaining)).slice(0, 12).map(f => ({
      name: f.product_name.length > 14 ? f.product_name.slice(0, 14) + '…' : f.product_name,
      days: Math.round(f.days_remaining),
      severity: f.severity,
    })), [filtered]);

  return (
    <div className="proc-container">
      {/* Header */}
      <motion.div className="proc-header"
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <h1>Forecast & Reorder</h1>
          <p>Inventory depletion forecasts, stockout predictions and auto-reorder suggestions</p>
        </div>
        <div className="proc-header-actions">
          <motion.button className="proc-btn-outline" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => { rf(); rs(); }} disabled={fl || sl}>
            <RefreshCw size={14} className={fl ? 'proc-spin' : ''} /> Refresh
          </motion.button>
          <motion.button className="proc-btn-outline" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => downloadMutation.mutate()} disabled={downloadMutation.isPending}>
            <Download size={14} /> {downloadMutation.isPending ? 'Exporting...' : 'Export PDF'}
          </motion.button>
          <motion.button className="proc-btn-primary" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => triggerMutation.mutate()} disabled={triggerMutation.isPending}>
            <TrendingDown size={14} /> {triggerMutation.isPending ? 'Running...' : 'Run Reorder Check'}
          </motion.button>
        </div>
      </motion.div>

      {/* Severity summary cards */}
      <div className="proc-stats">
        {[
          { label: 'Critical (≤7 days)', value: counts.critical, color: '#c62828', sev: 'Critical' },
          { label: 'Low Stock (≤14 days)', value: counts.low, color: '#e65100', sev: 'Low' },
          { label: 'Safe Stock', value: counts.safe, color: '#1d7e42', sev: 'Safe' },
          { label: 'Total Products', value: forecasts.length, color: '#8b3a3a', sev: '' },
        ].map(({ label, value, color, sev }, i) => (
          <motion.div key={label} className="proc-stat-card"
            style={{ cursor: sev ? 'pointer' : 'default', outline: sevFilter === sev && sev ? `2px solid ${color}` : 'none' }}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            whileHover={{ scale: 1.03 }}
            onClick={() => sev && setSevFilter(sevFilter === sev ? '' : sev)}>
            <div className="proc-stat-value" style={{ color }}>{fl ? '—' : value}</div>
            <div className="proc-stat-label">{label}</div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="proc-tabs">
        {['forecast', 'reorder'].map(t => (
          <button key={t} className={`proc-tab-btn ${activeTab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}>
            {t === 'forecast' ? 'Stockout Forecast' : `Reorder Suggestions ${suggestions.length > 0 ? `(${suggestions.length})` : ''}`}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'forecast' ? (
          <motion.div key="forecast"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>

            {/* Days remaining chart */}
            {chartData.length > 0 && (
              <div className="proc-card" style={{ marginBottom: '1.25rem' }}>
                <div className="proc-card-header"><h2>Days of Stock Remaining (Top Items)</h2></div>
                <div className="proc-card-body">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} label={{ value: 'Days', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                      <Tooltip formatter={v => [`${v} days`, 'Stock Duration']} />
                      <Bar dataKey="days" radius={[4, 4, 0, 0]}>
                        {chartData.map((d, i) => (
                          <Cell key={i} fill={SEV_COLOR[d.severity]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Forecast table */}
            <div className="proc-card">
              <div className="proc-card-header">
                <h2>Product Forecast Details</h2>
                <span className="proc-badge-count">{filtered.length} products</span>
              </div>
              <div className="pp-table-toolbar">
                <input className="proc-search" style={{ flex: 1 }}
                  placeholder="Search product..." value={search} onChange={e => setSearch(e.target.value)} />
                <select className="proc-select" value={sevFilter} onChange={e => setSevFilter(e.target.value)}>
                  <option value="">All Severity</option>
                  <option value="Critical">Critical</option>
                  <option value="Low">Low</option>
                  <option value="Safe">Safe</option>
                </select>
              </div>
              <div className="proc-table-wrap">
                <table className="proc-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th style={{ textAlign: 'center' }}>Stock</th>
                      <th style={{ textAlign: 'center' }}>Avg Daily Sales</th>
                      <th>Days Remaining</th>
                      <th>Stockout Date</th>
                      <th>Severity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fl ? (
                      <tr><td colSpan="6" className="proc-empty">Loading forecasts...</td></tr>
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan="6" className="proc-empty">No products match filters.</td></tr>
                    ) : filtered.map((f, i) => (
                      <motion.tr key={f.product_id}
                        initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.025 }}>
                        <td className="proc-name-cell">{f.product_name}</td>
                        <td style={{ textAlign: 'center' }}>{f.stock_quantity}</td>
                        <td style={{ textAlign: 'center' }}>{Number(f.avg_daily_sales).toFixed(2)}</td>
                        <td><DaysBar days={f.days_remaining} /></td>
                        <td style={{ color: f.severity === 'Critical' ? '#c62828' : '#333', fontWeight: f.severity === 'Critical' ? 700 : 400 }}>
                          {fmt(f.stockout_date)}
                        </td>
                        <td><SeverityBadge severity={f.severity} /></td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="reorder"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className="proc-card">
              <div className="proc-card-header" style={{ background: 'linear-gradient(135deg, #1565c0, #1976d2)' }}>
                <h2>Auto-Reorder Suggestions</h2>
                {suggestions.length > 0 && <span className="proc-badge-count">{suggestions.length}</span>}
              </div>
              <div className="proc-table-wrap">
                <table className="proc-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Supplier</th>
                      <th style={{ textAlign: 'center' }}>Reorder Qty</th>
                      <th style={{ textAlign: 'right' }}>Est. Cost</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sl ? (
                      <tr><td colSpan="6" className="proc-empty">Loading...</td></tr>
                    ) : suggestions.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="proc-empty">
                          No reorder suggestions. Click "Run Reorder Check" to generate.
                        </td>
                      </tr>
                    ) : suggestions.map((s, i) => (
                      <motion.tr key={s.suggestion_id || i}
                        initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}>
                        <td className="proc-name-cell">{s.product?.product_name || `#${s.product_id}`}</td>
                        <td>{s.supplier?.supplier_name || '—'}</td>
                        <td style={{ textAlign: 'center' }}>{s.suggested_quantity}</td>
                        <td style={{ textAlign: 'right' }}>
                          <span className="proc-amount">
                            LKR {(Number(s.suggested_quantity) * Number(s.product?.cost_price || 0)).toFixed(2)}
                          </span>
                        </td>
                        <td>
                          <span className={`proc-status-pill ${(s.status || 'pending').toLowerCase()}`}>
                            {s.status || 'Pending'}
                          </span>
                        </td>
                        <td>
                          <div className="proc-action-btns">
                            {(!s.status || s.status === 'Pending') && (
                              <motion.button className="proc-btn-approve" style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                onClick={() => convertMutation.mutate(s.suggestion_id)}
                                disabled={convertMutation.isPending}>
                                Convert to PO
                              </motion.button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
