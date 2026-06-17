import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import { RefreshCw, TrendingUp, ShoppingCart, Users, Package } from 'lucide-react';
import { useProcurementDashboard, useSupplierPerformanceReport, usePurchaseSummaryReport } from '../../services/procurementApi';
import '../../styles/Procurement.css';
import '../../styles/ProcurementPages.css';

const COLORS = ['#8b3a3a', '#1565c0', '#1d7e42', '#e65100', '#7b1fa2', '#b45309', '#c62828', '#0288d1'];

const STATUS_COLORS = {
  Pending: '#e65100', Approved: '#1565c0', Shipped: '#7b1fa2', Received: '#1d7e42', Cancelled: '#c62828',
};

function KpiCard({ icon: Icon, label, value, color, delay }) {
  return (
    <motion.div className="pp-kpi-card"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay }} whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
      <div className="pp-kpi-icon" style={{ background: `${color}18`, color }}>
        <Icon size={20} />
      </div>
      <div>
        <div className="pp-kpi-value" style={{ color }}>{value}</div>
        <div className="pp-kpi-label">{label}</div>
      </div>
    </motion.div>
  );
}

export default function AnalyticsDashboard() {
  const { data, isLoading: dl, refetch: rd } = useProcurementDashboard();
  const { data: performance = [], isLoading: pl, refetch: rp } = useSupplierPerformanceReport();
  const { data: purchases = [], isLoading: ql, refetch: rq } = usePurchaseSummaryReport();

  const { cards = {}, statusChart, monthlyVolume, topSuppliers } = useMemo(() => {
    if (!data) return { cards: {}, statusChart: [], monthlyVolume: [], topSuppliers: [] };
    return {
      cards:         data.cards        || {},
      statusChart:   data.charts?.poStatusDistribution || data.statusChart  || [],
      monthlyVolume: data.charts?.monthlyVolume        || data.monthlyVolume || [],
      topSuppliers:  data.charts?.topSuppliers         || data.topSuppliers  || [],
    };
  }, [data]);

  const fmt = (n) => `LKR ${Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;

  const totalSpend = useMemo(() =>
    purchases.reduce((s, r) => s + Number(r.total_value || 0), 0), [purchases]);

  const avgOnTime = useMemo(() => {
    if (!performance.length) return 0;
    return (performance.reduce((s, r) => s + Number(r.on_time_pct || 0), 0) / performance.length).toFixed(1);
  }, [performance]);

  return (
    <div className="proc-container">
      {/* Header */}
      <motion.div className="proc-header"
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <h1>Procurement Analytics</h1>
          <p>Spend analysis, supplier performance and purchasing trends</p>
        </div>
        <motion.button className="proc-btn-outline" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          onClick={() => { rd(); rp(); rq(); }} disabled={dl || pl || ql}>
          <RefreshCw size={14} className={dl ? 'proc-spin' : ''} /> Refresh
        </motion.button>
      </motion.div>

      {/* KPIs */}
      <div className="pp-kpi-grid">
        <KpiCard icon={Users}       label="Total Suppliers"   value={cards.totalSuppliers  ?? 0} color="#8b3a3a" delay={0.05} />
        <KpiCard icon={ShoppingCart} label="Total Orders"     value={(cards.pendingOrders ?? 0) + (cards.receivedOrders ?? 0)} color="#1565c0" delay={0.1} />
        <KpiCard icon={TrendingUp}  label="Total Spend"       value={fmt(totalSpend)}              color="#1d7e42" delay={0.15} />
        <KpiCard icon={Package}     label="Avg On-Time %"     value={`${avgOnTime}%`}              color="#e65100" delay={0.2} />
      </div>

      {/* Row 1: Monthly Volume + Status Pie */}
      <div className="pp-charts-row">
        <motion.div className="proc-card" style={{ flex: 2 }}
          initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}>
          <div className="proc-card-header"><h2>Monthly Purchase Volume</h2></div>
          <div className="proc-card-body">
            {monthlyVolume.length === 0 ? (
              <div className="proc-empty" style={{ height: 220 }}>No monthly data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={monthlyVolume}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left"  tickFormatter={v => `LKR${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v, name) => name === 'total' ? [fmt(v), 'Value'] : [v, 'Orders']} />
                  <Legend />
                  <Bar yAxisId="left"  dataKey="total" name="Purchase Value" fill="#8b3a3a" radius={[4,4,0,0]} />
                  <Bar yAxisId="right" dataKey="count" name="Orders"         fill="#a84545" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        <motion.div className="proc-card" style={{ flex: 1 }}
          initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.28 }}>
          <div className="proc-card-header"><h2>PO Status Distribution</h2></div>
          <div className="proc-card-body">
            {statusChart.length === 0 ? (
              <div className="proc-empty" style={{ height: 220 }}>No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusChart} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={78} innerRadius={40}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}>
                    {statusChart.map(entry => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>
      </div>

      {/* Row 2: Top Suppliers Spend + Supplier On-Time Performance */}
      <div className="pp-charts-row">
        <motion.div className="proc-card" style={{ flex: 1 }}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}>
          <div className="proc-card-header"><h2>Top Suppliers by Spend</h2></div>
          <div className="proc-card-body">
            {topSuppliers.length === 0 ? (
              <div className="proc-empty" style={{ height: 220 }}>No received orders yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topSuppliers} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={v => `LKR${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="supplier_name" width={100} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={v => [fmt(v), 'Spend']} />
                  <Bar dataKey="total_spend" fill="#8b3a3a" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        <motion.div className="proc-card" style={{ flex: 1 }}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }}>
          <div className="proc-card-header"><h2>Supplier On-Time Delivery %</h2></div>
          <div className="proc-card-body">
            {performance.length === 0 ? (
              <div className="proc-empty" style={{ height: 220 }}>No performance data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={performance.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="supplier_name" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={v => [`${v}%`, 'On-Time']} />
                  <Bar dataKey="on_time_pct" radius={[4, 4, 0, 0]}>
                    {performance.slice(0, 8).map((r, i) => (
                      <Cell key={i} fill={r.on_time_pct >= 80 ? '#1d7e42' : r.on_time_pct >= 50 ? '#e65100' : '#c62828'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>
      </div>

      {/* Spend by Supplier table */}
      <motion.div className="proc-card"
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
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
                <th style={{ textAlign: 'right' }}>Received</th>
                <th style={{ textAlign: 'center' }}>On-Time %</th>
                <th>Rating</th>
              </tr>
            </thead>
            <tbody>
              {ql ? (
                <tr><td colSpan="6" className="proc-empty">Loading...</td></tr>
              ) : purchases.length === 0 ? (
                <tr><td colSpan="6" className="proc-empty">No data available</td></tr>
              ) : purchases.map((row, i) => {
                const perf = performance.find(p => p.supplier_id === row.supplier_id);
                return (
                  <motion.tr key={row.supplier_id}
                    initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}>
                    <td>
                      <div className="proc-name-cell">{row.supplier_name}</div>
                      <div style={{ fontSize: '11px', color: '#888', fontFamily: 'monospace' }}>{row.supplier_code}</div>
                    </td>
                    <td style={{ textAlign: 'center' }}>{row.total_orders}</td>
                    <td style={{ textAlign: 'right' }}><span className="proc-amount">{fmt(row.total_value)}</span></td>
                    <td style={{ textAlign: 'right' }}><span className="proc-amount" style={{ color: '#1d7e42' }}>{fmt(row.received_value)}</span></td>
                    <td style={{ textAlign: 'center' }}>
                      {perf ? (
                        <span style={{ fontWeight: 700, color: perf.on_time_pct >= 80 ? '#1d7e42' : perf.on_time_pct >= 50 ? '#e65100' : '#c62828' }}>
                          {perf.on_time_pct}%
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      {[1,2,3,4,5].map(s => (
                        <span key={s} style={{ color: s <= (row.performance_rating || 0) ? '#f59e0b' : '#d1d5db', fontSize: '12px' }}>★</span>
                      ))}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
