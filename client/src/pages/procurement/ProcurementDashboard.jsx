import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, PieChart, Pie, Cell, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Plus, RefreshCw, AlertTriangle, CheckCircle, Clock,
  TrendingUp, TrendingDown, Package, CreditCard, Users,
  ClipboardList, ChevronRight, Bell,
} from 'lucide-react';
import {
  useProcurementDashboard, useReorderSuggestions,
  useConvertSuggestionToPO, useForecasts, useSuppliers, usePayments,
} from '../../services/procurementApi';
import '../../styles/Procurement.css';
import '../../styles/ProcurementPages.css';

const STATUS_COLORS = {
  Pending: '#e65100', Approved: '#1565c0',
  Shipped: '#7b1fa2', Received: '#1d7e42', Cancelled: '#c62828',
};

const SEV_COLOR = { Critical: '#c62828', Low: '#e65100', Safe: '#1d7e42' };
const SEV_BG    = { Critical: '#fdecea', Low: '#fff3e0', Safe: '#e5f7eb' };

function KpiCard({ icon: Icon, label, value, color, sub, delay, onClick }) {
  return (
    <motion.div className="pd-kpi"
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay }} whileHover={{ y: -2, boxShadow: '0 6px 20px rgba(0,0,0,0.1)' }}
      onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div className="pd-kpi-icon" style={{ background: `${color}18`, color }}>
        <Icon size={18} />
      </div>
      <div className="pd-kpi-body">
        <div className="pd-kpi-value" style={{ color }}>{value}</div>
        <div className="pd-kpi-label">{label}</div>
        {sub && <div className="pd-kpi-sub">{sub}</div>}
      </div>
    </motion.div>
  );
}

export default function ProcurementDashboard() {
  const navigate = useNavigate();

  const { data, isLoading: dl, refetch: rd } = useProcurementDashboard();
  const { data: suggestions = [], isLoading: sl } = useReorderSuggestions();
  const { data: forecasts = [], isLoading: fl }   = useForecasts();
  const { data: suppliers = [], isLoading: spl }  = useSuppliers();
  const { data: payments = [], isLoading: pl }    = usePayments();
  const convertMutation = useConvertSuggestionToPO();

  const { cards = {}, statusChart = [], monthlyVolume = [], topSuppliers = [] } = useMemo(() => {
    if (!data) return {};
    return {
      cards:        data.cards        || {},
      statusChart:  data.charts?.poStatusDistribution || data.statusChart || [],
      monthlyVolume: data.charts?.monthlyVolume       || data.monthlyVolume || [],
      topSuppliers:  data.charts?.topSuppliers        || data.topSuppliers  || [],
    };
  }, [data]);

  const fmt  = (n) => `LKR ${Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 0 })}`;
  const fmtD = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—';

  const criticalForecasts = useMemo(() =>
    forecasts.filter(f => f.severity === 'Critical' || f.severity === 'Low').slice(0, 5),
    [forecasts]);

  const pendingSuggestions = useMemo(() =>
    suggestions.filter(s => !s.status || s.status === 'Pending').slice(0, 4),
    [suggestions]);

  const overduePayments = useMemo(() =>
    payments.filter(p => p.payment_status !== 'Paid')
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date)).slice(0, 4),
    [payments]);

  const topLeaderboard = useMemo(() =>
    [...suppliers].sort((a, b) => (b.performance_score || 0) - (a.performance_score || 0)).slice(0, 5),
    [suppliers]);

  return (
    <div className="proc-container">

      {/* Header */}
      <motion.div className="proc-header"
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <h1>Procurement Overview</h1>
          <p>Suppliers, purchase orders, payments and inventory health at a glance</p>
        </div>
        <div className="proc-header-actions">
          <motion.button className="proc-btn-outline" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => rd()} disabled={dl}>
            <RefreshCw size={14} className={dl ? 'proc-spin' : ''} /> Refresh
          </motion.button>
          <motion.button className="proc-btn-outline success" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => navigate('/procurement/suppliers')}>
            <Users size={14} /> Suppliers
          </motion.button>
          <motion.button className="proc-btn-primary" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => navigate('/procurement/orders/create')}>
            <Plus size={15} /> Create PO
          </motion.button>
        </div>
      </motion.div>

      {/* KPI Row */}
      <div className="pd-kpi-grid">
        <KpiCard icon={Users}        label="Total Suppliers"   value={cards.totalSuppliers  ?? 0} color="#8b3a3a" delay={0.04} onClick={() => navigate('/procurement/suppliers')} />
        <KpiCard icon={CheckCircle}  label="Active Suppliers"  value={cards.activeSuppliers ?? 0} color="#1d7e42" delay={0.07} />
        <KpiCard icon={Clock}        label="Pending Orders"    value={cards.pendingOrders   ?? 0} color="#e65100" delay={0.1}  onClick={() => navigate('/procurement/orders')} />
        <KpiCard icon={ClipboardList} label="Approved Orders"  value={cards.approvedOrders  ?? 0} color="#1565c0" delay={0.13} onClick={() => navigate('/procurement/orders')} />
        <KpiCard icon={CheckCircle}  label="Received Orders"   value={cards.receivedOrders  ?? 0} color="#1d7e42" delay={0.16} />
        <KpiCard icon={AlertTriangle} label="Overdue Orders"   value={cards.overdueOrders   ?? 0} color="#c62828" delay={0.19} sub={cards.overdueOrders > 0 ? 'Needs attention' : 'All on track'} />
      </div>

      {/* Charts Row */}
      <div className="pd-charts-row">
        {/* Monthly Volume */}
        <motion.div className="proc-card pd-chart-main"
          initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.22 }}>
          <div className="proc-card-header">
            <h2>Monthly Purchase Volume</h2>
            <button className="proc-link-btn" onClick={() => navigate('/procurement/analytics')}>
              Full Analytics <ChevronRight size={13} />
            </button>
          </div>
          <div className="proc-card-body">
            {monthlyVolume.length === 0 ? (
              <div className="proc-empty" style={{ height: 200 }}>No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={monthlyVolume} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#8b3a3a" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#8b3a3a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={v => `LKR${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={v => [`LKR ${Number(v).toLocaleString()}`, 'Purchase Value']} />
                  <Area type="monotone" dataKey="total" stroke="#8b3a3a" strokeWidth={2} fill="url(#grad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* PO Status Pie */}
        <motion.div className="proc-card pd-chart-side"
          initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}>
          <div className="proc-card-header"><h2>PO Status</h2></div>
          <div className="proc-card-body">
            {statusChart.length === 0 ? (
              <div className="proc-empty" style={{ height: 200 }}>No orders yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusChart} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={75} innerRadius={36}>
                    {statusChart.map(e => (
                      <Cell key={e.name} fill={STATUS_COLORS[e.name] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>
      </div>

      {/* Main Content Grid */}
      <div className="pd-main-grid">

        {/* LEFT COLUMN */}
        <div className="pd-col-left">

          {/* Auto-Reorder Suggestions */}
          <motion.div className="proc-card"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
            <div className="proc-card-header">
              <h2>Auto-Reorder Suggestions</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {pendingSuggestions.length > 0 && (
                  <span className="proc-badge-count">{pendingSuggestions.length} pending</span>
                )}
                <button className="proc-link-btn" onClick={() => navigate('/procurement/forecast')}>
                  View All <ChevronRight size={13} />
                </button>
              </div>
            </div>
            {pendingSuggestions.length === 0 ? (
              <div className="proc-card-body">
                <div className="pd-empty-state">
                  <CheckCircle size={28} style={{ color: '#1d7e42' }} />
                  <p>All stock levels are healthy</p>
                </div>
              </div>
            ) : (
              <div className="proc-table-wrap">
                <table className="proc-table">
                  <thead>
                    <tr><th>Product</th><th>Supplier</th><th style={{ textAlign: 'center' }}>Qty</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {sl ? (
                      <tr><td colSpan="4" className="proc-empty">Loading...</td></tr>
                    ) : pendingSuggestions.map((s, i) => (
                      <motion.tr key={s.suggestion_id || i}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
                        <td className="proc-name-cell">{s.product?.product_name || `#${s.product_id}`}</td>
                        <td style={{ fontSize: '0.82rem', color: '#666' }}>{s.supplier?.supplier_name || '—'}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{s.suggested_quantity}</td>
                        <td>
                          <motion.button className="proc-btn-approve"
                            style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem' }}
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            onClick={() => convertMutation.mutate(s.suggestion_id)}
                            disabled={convertMutation.isPending}>
                            Convert to PO
                          </motion.button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>

          {/* Inventory Forecast Alerts */}
          <motion.div className="proc-card"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}>
            <div className="proc-card-header">
              <h2>Inventory Risk Forecast</h2>
              <button className="proc-link-btn" onClick={() => navigate('/procurement/forecast')}>
                View All <ChevronRight size={13} />
              </button>
            </div>
            {criticalForecasts.length === 0 ? (
              <div className="proc-card-body">
                <div className="pd-empty-state">
                  <Package size={28} style={{ color: '#1d7e42' }} />
                  <p>No stock risk detected</p>
                </div>
              </div>
            ) : (
              <div className="proc-card-body" style={{ padding: '0.75rem 1.25rem' }}>
                {fl ? (
                  <div className="proc-empty">Loading...</div>
                ) : criticalForecasts.map((f, i) => {
                  const days = isFinite(f.days_remaining) ? Math.round(f.days_remaining) : null;
                  return (
                    <motion.div key={f.product_id} className="pd-forecast-row"
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}>
                      <div className="pd-forecast-info">
                        <span className="proc-name-cell" style={{ fontSize: '0.875rem' }}>{f.product_name}</span>
                        <span style={{ fontSize: '0.75rem', color: '#888' }}>
                          Stock: {f.stock_quantity} · {Number(f.avg_daily_sales).toFixed(1)}/day
                        </span>
                      </div>
                      <div className="pd-forecast-right">
                        {days !== null && (
                          <span style={{ fontSize: '0.8rem', color: SEV_COLOR[f.severity], fontWeight: 700 }}>
                            {days}d left
                          </span>
                        )}
                        <span className="pd-sev-badge"
                          style={{ background: SEV_BG[f.severity], color: SEV_COLOR[f.severity] }}>
                          {f.severity}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Outstanding Payments */}
          <motion.div className="proc-card"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }}>
            <div className="proc-card-header">
              <h2>Outstanding Payments</h2>
              <button className="proc-link-btn" onClick={() => navigate('/procurement/payments')}>
                View All <ChevronRight size={13} />
              </button>
            </div>
            {overduePayments.length === 0 ? (
              <div className="proc-card-body">
                <div className="pd-empty-state">
                  <CheckCircle size={28} style={{ color: '#1d7e42' }} />
                  <p>All accounts are settled</p>
                </div>
              </div>
            ) : (
              <div className="proc-table-wrap">
                <table className="proc-table">
                  <thead>
                    <tr>
                      <th>Supplier</th>
                      <th>Due</th>
                      <th style={{ textAlign: 'right' }}>Balance</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pl ? (
                      <tr><td colSpan="4" className="proc-empty">Loading...</td></tr>
                    ) : overduePayments.map((p, i) => {
                      const isOverdue = p.due_date && new Date(p.due_date) < new Date();
                      return (
                        <motion.tr key={p.payment_id}
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
                          <td className="proc-name-cell">{p.supplier?.supplier_name || '—'}</td>
                          <td style={{ fontSize: '0.82rem', color: isOverdue ? '#c62828' : '#333' }}>
                            {fmtD(p.due_date)}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <span className="proc-amount" style={{ color: '#c62828' }}>
                              {fmt(p.balance_amount)}
                            </span>
                          </td>
                          <td>
                            <span className={`proc-status-pill ${isOverdue ? 'cancelled' : 'pending'}`}>
                              {isOverdue ? 'Overdue' : p.payment_status}
                            </span>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="pd-col-right">

          {/* Top Suppliers by Spend */}
          <motion.div className="proc-card"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div className="proc-card-header">
              <h2>Top Suppliers by Spend</h2>
              <button className="proc-link-btn" onClick={() => navigate('/procurement/analytics')}>
                Analytics <ChevronRight size={13} />
              </button>
            </div>
            <div className="proc-card-body">
              {topSuppliers.length === 0 ? (
                <div className="proc-empty" style={{ height: 160 }}>No received orders yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={topSuppliers.slice(0, 6)} layout="vertical" margin={{ left: 4, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tickFormatter={v => `LKR${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="supplier_name" width={90} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={v => [`LKR ${Number(v).toLocaleString()}`, 'Spend']} />
                    <Bar dataKey="total_spend" fill="#8b3a3a" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>

          {/* Supplier Leaderboard */}
          <motion.div className="proc-card"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 }}>
            <div className="proc-card-header">
              <h2>Supplier Leaderboard</h2>
              <button className="proc-link-btn" onClick={() => navigate('/procurement/suppliers')}>
                View All <ChevronRight size={13} />
              </button>
            </div>
            <div className="proc-card-body" style={{ padding: '0.5rem 1.25rem' }}>
              {spl ? (
                <div className="proc-empty">Loading...</div>
              ) : topLeaderboard.length === 0 ? (
                <div className="pd-empty-state"><Users size={24} /><p>No suppliers yet</p></div>
              ) : topLeaderboard.map((s, i) => (
                <motion.div key={s.supplier_id} className="pd-leader-row"
                  initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => navigate(`/procurement/suppliers/${s.supplier_id}`)}>
                  <div className="pd-leader-rank"
                    style={{ color: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : '#8b3a3a' }}>
                    {i === 0 ? '🏆' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </div>
                  <div className="pd-leader-info">
                    <span className="pd-leader-name">{s.supplier_name}</span>
                    <span className="pd-leader-score">Score: {Number(s.performance_score || 0).toFixed(1)}</span>
                  </div>
                  <span className="pd-tier-badge" style={{
                    background: s.performance_tier === 'Gold' ? '#fef3c7' : s.performance_tier === 'Silver' ? '#f1f5f9' : '#fdf4ee',
                    color:      s.performance_tier === 'Gold' ? '#b45309' : s.performance_tier === 'Silver' ? '#475569' : '#92400e',
                  }}>
                    {s.performance_tier || 'Bronze'}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div className="proc-card"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}>
            <div className="proc-card-header"><h2>Quick Actions</h2></div>
            <div className="proc-card-body">
              <div className="pd-quick-actions">
                {[
                  { label: 'Create Purchase Order', icon: Plus,         color: '#8b3a3a', path: '/procurement/orders/create' },
                  { label: 'Add Supplier',           icon: Users,        color: '#1d7e42', path: '/procurement/suppliers' },
                  { label: 'View Payments',          icon: CreditCard,   color: '#1565c0', path: '/procurement/payments' },
                  { label: 'Forecast & Reorder',     icon: TrendingUp,   color: '#e65100', path: '/procurement/forecast' },
                  { label: 'Procurement Reports',    icon: ClipboardList, color: '#7b1fa2', path: '/procurement/reports' },
                  { label: 'Notifications',          icon: Bell,         color: '#b45309', path: '/procurement/notifications' },
                ].map(({ label, icon: Icon, color, path }) => (
                  <motion.button key={label} className="pd-quick-btn"
                    whileHover={{ scale: 1.02, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigate(path)}>
                    <div className="pd-quick-icon" style={{ background: `${color}15`, color }}>
                      <Icon size={16} />
                    </div>
                    <span>{label}</span>
                    <ChevronRight size={14} style={{ color: '#ccc', marginLeft: 'auto' }} />
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}

export default ProcurementDashboard;
