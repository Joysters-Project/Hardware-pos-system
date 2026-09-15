import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import api from '../api/axios';
import { buildTableHtml, escapeHtml, printWithTemplate } from '../utils/printTemplate';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, Area, AreaChart,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Calendar, BarChart2, Package,
  FolderOpen, AlertTriangle, CheckCircle, Info, ArrowUp, ArrowDown,
  ShoppingCart, Lightbulb, Target, FileDown,
  Eye, EyeOff,
} from 'lucide-react';
import '../styles/AnalysisReport.css';

const fmt = (v) => `Rs. ${Number(v ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtShort = (v) => {
  const n = Number(v ?? 0);
  if (n >= 1_000_000) return `Rs. ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `Rs. ${(n / 1_000).toFixed(1)}K`;
  return `Rs. ${n.toFixed(0)}`;
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const COLORS = [
  '#8b3a3a', '#c06060', '#d9896a', '#d4a0a0',
  '#1d7e42', '#2e8b57', '#1565c0', '#4f86d8',
  '#e65100', '#f59e0b', '#7b1fa2', '#8e44ad',
  '#00838f', '#20b2aa', '#6f4e37', '#b08968'
];
const PIE_COLORS = ['#c62828', '#1565c0', '#2e7d32', '#8b3a3a', '#e65100', '#6a1b9a'];

function KpiCard({ label, value, sub, icon: Icon, color = '#8b3a3a', trend }) {
  return (
    <div className="ar-kpi-card">
      <div className="ar-kpi-icon" style={{ background: `${color}18`, color }}>
        <Icon size={20} />
      </div>
      <div className="ar-kpi-body">
        <div className="ar-kpi-value">{value}</div>
        <div className="ar-kpi-label">{label}</div>
        {sub && (
          <div className={`ar-kpi-trend ${trend === 'up' ? 'up' : trend === 'down' ? 'down' : ''}`}>
            {trend === 'up' ? <ArrowUp size={11} /> : trend === 'down' ? <ArrowDown size={11} /> : null}
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children, accent, collapsible = false, visible = true, onToggle, actions }) {
  return (
    <div className="ar-section-card">
      <div className="ar-section-header" style={accent ? { background: `linear-gradient(135deg, ${accent}, ${accent}cc)` } : {}}>
        {Icon && <Icon size={16} />}
        <span>{title}</span>
        {collapsible && (
          <button type="button" className="ar-section-toggle" onClick={onToggle} aria-expanded={visible}>
            {visible ? <EyeOff size={14} /> : <Eye size={14} />}
            <span>{visible ? 'Hide' : 'View'}</span>
          </button>
        )}
        {actions && <div className="ar-section-actions">{actions}</div>}
      </div>
      {visible && <div className="ar-section-body">{children}</div>}
    </div>
  );
}

/* ─── MONTHLY TAB ─── */
function MonthlyAnalysis() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showMonthlyTable, setShowMonthlyTable] = useState(true);
  const [showPredictionTable, setShowPredictionTable] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError('');
    api.get('/analysis/monthly', { params: { year, month } })
      .then(r => setData(r.data))
      .catch(() => setError('Failed to load monthly analysis.'))
      .finally(() => setLoading(false));
  }, [year, month]);

  const yearOptions = useMemo(() => {
    const opts = [];
    for (let y = now.getFullYear(); y >= now.getFullYear() - 4; y--) opts.push(y);
    return opts;
  }, []);

  if (loading) return <div className="ar-loading"><div className="ar-spinner" />Loading analysis…</div>;
  if (error) return <div className="ar-error">{error}</div>;
  if (!data) return null;

  const { summary, topProducts, dailyRevenue, projects, nextMonthPredictions, period } = data;
  const nextMonthName = MONTHS[(month + 1) % 12];
  const growthNum = summary.revenueGrowth !== null ? parseFloat(summary.revenueGrowth) : null;

  return (
    <div className="ar-tab-content">
      {/* Period Selector */}
      <div className="ar-period-bar">
        <div className="ar-period-selects">
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="ar-select">
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={month} onChange={e => setMonth(Number(e.target.value))} className="ar-select">
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
        </div>
        <div className="ar-period-label">
          <Calendar size={14} />
          {period.monthName} {period.year}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="ar-kpi-grid">
        <KpiCard label="Total Revenue" value={fmtShort(summary.totalRevenue)} icon={TrendingUp} color="#8b3a3a"
          sub={growthNum !== null ? `${growthNum > 0 ? '+' : ''}${growthNum}% vs prev month` : undefined}
          trend={growthNum > 0 ? 'up' : growthNum < 0 ? 'down' : undefined} />
        <KpiCard label="Total Bills" value={summary.totalBills} icon={ShoppingCart} color="#1565c0" />
        <KpiCard label="Avg Bill Value" value={fmtShort(summary.totalBills > 0 ? summary.totalRevenue / summary.totalBills : 0)} icon={Target} color="#1d7e42" />
        <KpiCard label="Prev Month" value={fmtShort(summary.prevRevenue)} icon={BarChart2} color="#e65100" />
      </div>

      {/* Daily Revenue Chart */}
      <SectionCard title={`Daily Revenue — ${period.monthName} ${period.year}`} icon={BarChart2}>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={dailyRevenue} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="arGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b3a3a" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#8b3a3a" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0e8e8" />
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888' }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={v => [fmt(v), 'Revenue']} contentStyle={{ borderRadius: 8, border: '1px solid #e0d0d0', fontSize: 12 }} />
            <Area type="monotone" dataKey="revenue" stroke="#8b3a3a" strokeWidth={2.5} fill="url(#arGrad)" dot={false} activeDot={{ r: 5, fill: '#8b3a3a' }} />
          </AreaChart>
        </ResponsiveContainer>
      </SectionCard>

      {/* Top Products — full width, each product gets its own color */}
      <SectionCard title="Top Selling Products This Month" icon={Package} collapsible visible={showMonthlyTable} onToggle={() => setShowMonthlyTable(value => !value)}>
        {topProducts.length === 0 ? (
          <div className="ar-empty">No sales data for this month.</div>
        ) : (
          <div className="ar-product-list">
            {topProducts.map((p, i) => {
              const color = COLORS[i % COLORS.length];
              return (
                <div key={i} className="ar-product-row">
                  <div className="ar-product-rank" style={{ background: `${color}18`, color }}>{i + 1}</div>
                  <div className="ar-product-info">
                    <div className="ar-product-name">{p.name}</div>
                    <div className="ar-product-meta">Qty: {p.qty.toFixed(1)}</div>
                  </div>
                  <div className="ar-product-revenue" style={{ color }}>{fmtShort(p.revenue)}</div>
                  <div className="ar-product-bar-wrap">
                    <div className="ar-product-bar" style={{ width: `${(p.revenue / topProducts[0].revenue) * 100}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* Next Month Prediction */}
      <SectionCard title={`Next Month Prediction — ${nextMonthName} ${month === 11 ? year + 1 : year}`} icon={Lightbulb} accent="#8b3a3a" collapsible visible={showPredictionTable} onToggle={() => setShowPredictionTable(value => !value)}>
        <div className="ar-prediction-intro">
          <Info size={14} />
          Based on the last 3 months of sales data, here are the products predicted to have high demand next month.
          Stock up early to avoid shortages.
        </div>
        {nextMonthPredictions.length === 0 ? (
          <div className="ar-empty">Not enough data to generate predictions.</div>
        ) : (
          <div className="ar-prediction-grid">
            {nextMonthPredictions.map((p, i) => (
              <div key={i} className={`ar-pred-card ar-pred-${p.trend}`}>
                <div className="ar-pred-rank">#{i + 1}</div>
                <div className="ar-pred-name">{p.name}</div>
                <div className="ar-pred-stats">
                  <span>Avg/month: <strong>{p.avgMonthlyQty}</strong></span>
                  <span>Predicted: <strong>{p.predictedNextMonth}</strong></span>
                </div>
                <div className={`ar-pred-badge ar-pred-badge-${p.trend}`}>
                  {p.trend === 'high' ? '🔥 High Demand' : p.trend === 'medium' ? '📈 Medium' : '📦 Low'}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

/* ─── YEARLY TAB ─── */
function YearlyAnalysis() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForecastTable, setShowForecastTable] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError('');
    api.get('/analysis/yearly', { params: { year } })
      .then(r => setData(r.data))
      .catch(() => setError('Failed to load yearly analysis.'))
      .finally(() => setLoading(false));
  }, [year]);

  const yearOptions = useMemo(() => {
    const opts = [];
    for (let y = now.getFullYear(); y >= now.getFullYear() - 4; y--) opts.push(y);
    return opts;
  }, []);

  if (loading) return <div className="ar-loading"><div className="ar-spinner" />Loading analysis…</div>;
  if (error) return <div className="ar-error">{error}</div>;
  if (!data) return null;

  const { summary, monthlyData, prevMonthlyData, topProducts, projects, prediction, nextYearMonthlyTopProducts = [], improvements, period } = data;
  const growthNum = summary.revenueGrowth !== null ? parseFloat(summary.revenueGrowth) : null;

  const combinedMonthly = monthlyData.map((m, i) => ({
    month: m.month,
    [`${period.year}`]: parseFloat(m.revenue.toFixed(2)),
    [`${period.prevYear}`]: parseFloat((prevMonthlyData[i]?.revenue || 0).toFixed(2)),
  }));

  const pieData = topProducts.slice(0, 6).map((p, i) => ({ name: p.name, value: parseFloat(p.revenue.toFixed(2)), fill: PIE_COLORS[i % PIE_COLORS.length] }));

  const handleExportYearlyPdf = () => {
    const forecastRows = nextYearMonthlyTopProducts.flatMap(({ month, products }) => {
      if (!products.length) return [[month, 'No sales data', '—', '—']];
      return products.map((product, index) => [month, `#${index + 1}`, product.name, product.predictedQty.toFixed(2)]);
    });
    const forecastTable = buildTableHtml({
      columns: ['Month', 'Rank', 'Product to Prepare', 'Predicted Qty'],
      rows: forecastRows.map(row => row.map(cell => escapeHtml(cell))),
      emptyMessage: 'No product forecast data available.',
    });
    const summaryHtml = `
      <h2 class="tpl-section-title">Annual Summary</h2>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px 18px;margin:4px 0 10px;font-size:11px;">
        <div><strong>Total Revenue:</strong> ${escapeHtml(fmt(summary.totalRevenue))}</div>
        <div><strong>Total Expenses:</strong> ${escapeHtml(fmt(summary.totalExpenses))}</div>
        <div><strong>Net Profit:</strong> ${escapeHtml(fmt(summary.netProfit))}</div>
        <div><strong>Predicted Revenue (${period.year + 1}):</strong> ${escapeHtml(fmt(prediction.nextYearRevenue))}</div>
      </div>`;
    const improvementsHtml = `
      <h2 class="tpl-section-title">Insights &amp; Improvements for ${period.year + 1}</h2>
      <div style="margin:4px 0 10px;font-size:11px;line-height:1.45;">
        ${improvements.length
          ? improvements.map(imp => `<div style="padding:5px 7px;margin-bottom:4px;border-left:3px solid #8b3a3a;background:#fcf5f5;">${escapeHtml(imp.text)}</div>`).join('')
          : '<div style="color:#64748b;font-style:italic;">No specific insights available yet.</div>'}
      </div>`;
    const opened = printWithTemplate({
      title: `Yearly Analysis Report — ${period.year}`,
      subtitle: `Annual performance and top three products to prepare for each month of ${period.year + 1}`,
      contentInset: '10mm',
      contentHtml: `${summaryHtml}${improvementsHtml}<h2 class="tpl-section-title">Top 3 Products to Prepare Each Month — ${period.year + 1}</h2>${forecastTable}`,
    });
    if (!opened) window.alert('Allow pop-ups to export the yearly report as PDF.');
  };

  return (
    <div className="ar-tab-content">
      {/* Year Selector */}
      <div className="ar-period-bar">
        <div className="ar-period-selects">
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="ar-select">
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="ar-period-label">
          <Calendar size={14} />
          Full Year {period.year}
        </div>
      </div>
      {/* KPI Strip */}
      <div className="ar-kpi-grid">
        <KpiCard label="Total Revenue" value={fmtShort(summary.totalRevenue)} icon={TrendingUp} color="#8b3a3a"
          sub={growthNum !== null ? `${growthNum > 0 ? '+' : ''}${growthNum}% vs ${period.prevYear}` : undefined}
          trend={growthNum > 0 ? 'up' : growthNum < 0 ? 'down' : undefined} />
        <KpiCard label="Total Bills" value={summary.totalBills} icon={ShoppingCart} color="#1565c0" />
        <KpiCard label="Total Expenses" value={fmtShort(summary.totalExpenses)} icon={TrendingDown} color="#e65100" />
        <KpiCard label="Net Profit" value={fmtShort(summary.netProfit)} icon={Target} color={summary.netProfit >= 0 ? '#1d7e42' : '#c62828'} />
      </div>

      {/* Year vs Year Revenue Chart */}
      <SectionCard title={`Monthly Revenue: ${period.year} vs ${period.prevYear}`} icon={BarChart2}>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={combinedMonthly} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} barCategoryGap="28%" barGap={4}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0e8e8" />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888' }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={v => [fmt(v)]} contentStyle={{ borderRadius: 8, border: '1px solid #e0d0d0', fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey={`${period.year}`} fill="#8b3a3a" radius={[5, 5, 0, 0]} maxBarSize={32} />
            <Bar dataKey={`${period.prevYear}`} fill="#d4a0a0" radius={[5, 5, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </SectionCard>

      {/* Top Products Pie — full width */}
      <SectionCard title="Revenue by Top Products" icon={Package}>
        {pieData.length === 0 ? (
          <div className="ar-empty">No product sales data.</div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={96}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="#fff"
                  strokeWidth={2}
                >
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip formatter={v => [fmt(v)]} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="ar-pie-legend" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '4px 16px' }}>
              {pieData.map((p, i) => (
                <div key={i} className="ar-pie-legend-item">
                  <span className="ar-pie-dot" style={{ background: p.fill }} />
                  <span className="ar-pie-name">{p.name}</span>
                  <span className="ar-pie-val">{fmtShort(p.value)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </SectionCard>

      {/* Next Year Prediction */}
      <SectionCard title={`Next Year Prediction — ${period.year + 1}`} icon={Lightbulb} accent="#8b3a3a">
        <div className="ar-yearly-prediction">
          <div className="ar-pred-highlight">
            <div className="ar-pred-highlight-label">Predicted Revenue for {period.year + 1}</div>
            <div className="ar-pred-highlight-value">{fmt(prediction.nextYearRevenue)}</div>
            <div className={`ar-pred-highlight-growth ${prediction.growthRate >= 0 ? 'up' : 'down'}`}>
              {prediction.growthRate >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
              {Math.abs(prediction.growthRate)}% projected growth based on current trend
            </div>
          </div>
          <div className="ar-pred-comparison">
            <div className="ar-pred-comp-row">
              <span>{period.prevYear} Revenue</span>
              <strong>{fmt(summary.prevRevenue)}</strong>
            </div>
            <div className="ar-pred-comp-row">
              <span>{period.year} Revenue</span>
              <strong>{fmt(summary.totalRevenue)}</strong>
            </div>
            <div className="ar-pred-comp-row highlight">
              <span>{period.year + 1} Predicted</span>
              <strong>{fmt(prediction.nextYearRevenue)}</strong>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Monthly product preparation forecast */}
      <SectionCard
        title={`Top 3 Products to Prepare Each Month — ${period.year + 1}`}
        icon={Package}
        collapsible
        visible={showForecastTable}
        onToggle={() => setShowForecastTable(value => !value)}
        actions={(
          <button type="button" className="ar-export-button ar-header-action" onClick={handleExportYearlyPdf}>
            <FileDown size={14} />
            <span>Export PDF</span>
          </button>
        )}
      >
        <div className="ar-prediction-intro">
          <Info size={14} />
          Seasonal ranking based on each month&apos;s sales history, adjusted by the projected annual growth rate.
        </div>
        <div className="ar-monthly-forecast-grid">
          {nextYearMonthlyTopProducts.map(({ month, products }) => (
            <div key={month} className="ar-monthly-forecast-card">
              <div className="ar-monthly-forecast-month">{month}</div>
              {products.length === 0 ? (
                <div className="ar-empty">No sales history</div>
              ) : products.map((product, index) => (
                <div key={`${month}-${product.name}`} className="ar-monthly-forecast-row">
                  <span className="ar-monthly-forecast-rank">{index + 1}</span>
                  <span className="ar-monthly-forecast-name" title={product.name}>{product.name}</span>
                  <strong>{product.predictedQty}</strong>
                </div>
              ))}
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Improvement Suggestions */}
      <SectionCard title={`Insights & Improvements for ${period.year + 1}`} icon={AlertTriangle}>
        {improvements.length === 0 ? (
          <div className="ar-empty">No specific insights available yet.</div>
        ) : (
          <div className="ar-improvements">
            {improvements.map((imp, i) => (
              <div key={i} className={`ar-improvement-item ar-imp-${imp.type}`}>
                <div className="ar-imp-icon">
                  {imp.type === 'success' && <CheckCircle size={16} />}
                  {imp.type === 'warning' && <AlertTriangle size={16} />}
                  {imp.type === 'danger' && <TrendingDown size={16} />}
                  {imp.type === 'info' && <Info size={16} />}
                </div>
                <p>{imp.text}</p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

/* ─── MAIN PAGE ─── */
const TABS = [
  { key: 'monthly', label: 'Monthly Analysis', icon: Calendar },
  { key: 'yearly', label: 'Yearly Analysis', icon: TrendingUp },
];

export default function AnalysisReport() {
  const [activeTab, setActiveTab] = useState('monthly');
  const [tabEnter, setTabEnter] = useState(true);

  const handleTab = (key) => {
    setTabEnter(false);
    setActiveTab(key);
    setTimeout(() => setTabEnter(true), 16);
  };

  return (
    <DashboardLayout active="analysis">
      <div className="proc-container">
        <div className="proc-header" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div className="proc-header-icon">
              <TrendingUp size={22} color="#fff" />
            </div>
            <div>
              <h1 style={{ margin: 0 }}>Analysis Report</h1>
              <p style={{ margin: 0, color: 'var(--proc-text-muted, #666)', fontSize: '0.85rem' }}>
                Predictive insights, sales trends, and business intelligence
              </p>
            </div>
          </div>
        </div>

        <div className="pos-tab-switcher">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                type="button"
                className={`pos-tab-btn ${activeTab === t.key ? 'active' : ''}`}
                onClick={() => handleTab(t.key)}
              >
                <Icon size={16} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        <div className={`rp-body report-view-shell ${tabEnter ? 'report-view-shell-active' : ''}`}>
          {activeTab === 'monthly' && <MonthlyAnalysis />}
          {activeTab === 'yearly' && <YearlyAnalysis />}
        </div>
      </div>
    </DashboardLayout>
  );
}
