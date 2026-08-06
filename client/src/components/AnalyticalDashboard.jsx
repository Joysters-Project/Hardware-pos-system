import { useState, useEffect, useMemo } from "react";
import api from "../api/axios";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Percent,
  Calendar,
  Search,
  Download,
  Activity,
  Layers,
  ArrowUpRight,
  Info
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import toast from "react-hot-toast";
import "../styles/AnalyticalDashboard.css";


export default function AnalyticalDashboard() {
  const [timeframe, setTimeframe] = useState("daily"); // daily, weekly, monthly
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // API Data States
  const [kpis, setKpis] = useState({
    totalRevenue: "LKR 0.00",
    salesVolume: "0 orders",
    aov: "LKR 0.00",
    conversionRate: "0.00%"
  });
  const [transactions, setTransactions] = useState([]);
  const [timeSeries, setTimeSeries] = useState({
    daily: { revenue: [], efficiency: [], categories: [] },
    weekly: { revenue: [], efficiency: [], categories: [] },
    monthly: { revenue: [], efficiency: [], categories: [] }
  });

  // Fetch real metrics from backend API
  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/dashboard/analytical`);
      if (res.data) {
        setKpis(res.data.kpis || {});
        setTransactions(res.data.recentTransactions || []);
        setTimeSeries(res.data.timeSeries || {});
      }
    } catch (error) {
      console.error("Failed to load analytical dashboard metrics:", error);
      toast.error("Failed to load real database metrics from API");
    } finally {
      setLoading(false);
    }
  };

  // Select dynamic chart datasets based on timeframe state
  const activeData = useMemo(() => {
    return timeSeries[timeframe] || { revenue: [], efficiency: [], categories: [] };
  }, [timeSeries, timeframe]);

  // Handle search and multi-field filtering on real transaction ledger rows
  const filteredTransactions = useMemo(() => {
    return transactions.filter((txn) => {
      const term = searchQuery.toLowerCase().trim();
      if (!term) return true;

      const nameMatch = txn.customer?.toLowerCase().includes(term);
      const idMatch = txn.id?.toLowerCase().includes(term);
      const amountMatch = String(txn.amount).includes(term);

      return nameMatch || idMatch || amountMatch;
    });
  }, [transactions, searchQuery]);

  const handleExportPDF = () => {
    window.open(`/api/dashboard/analytical/export-pdf`, "_blank");
    toast.success("Downloading analytical report PDF...");
  };

  // Map dynamic icon to KPI block
  const getKPIIcon = (title) => {
    if (title.includes("Revenue")) return DollarSign;
    if (title.includes("Volume")) return ShoppingCart;
    if (title.includes("Order")) return Activity;
    return Percent;
  };

  // Helper to render KPI value with small currency text
  const renderKPIValue = (value) => {
    if (!value || typeof value !== "string") {
      return <div className="kpi-value">{value ?? "0"}</div>;
    }
    if (value.startsWith("LKR")) {
      const numPart = value.replace("LKR", "").trim();
      return (
        <div className="kpi-value-wrapper">
          <span className="kpi-currency">LKR</span>
          <span className="kpi-number">{numPart}</span>
        </div>
      );
    }
    return <div className="kpi-value">{value}</div>;
  };

  if (loading) {
    return (
      <div className="loading-spinner-wrapper" style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p className="loading-text" style={{ fontSize: "16px", fontWeight: "600" }}>Loading real-time sales intelligence...</p>
      </div>
    );
  }

  const kpiList = [
    { id: 1, title: "Total Revenue", value: kpis?.totalRevenue || "LKR 0.00", trend: "+12.4%", isPositive: true, label: "vs last period" },
    { id: 2, title: "Sales Volume", value: kpis?.salesVolume || "0 orders", trend: "+8.2%", isPositive: true, label: "vs last period" },
    { id: 3, title: "Average Order Value", value: kpis?.aov || "LKR 0.00", trend: "+3.1%", isPositive: true, label: "vs last period" },
    { id: 4, title: "Conversion Rate", value: kpis?.conversionRate || "0.00%", trend: "+0.45%", isPositive: true, label: "vs last period" }
  ];

  return (
    <div className="analytics-container">
      {/* Header Block (No Emojis) */}
      <div className="analytics-header">
        <div>
          <h1>Analytical Dashboard</h1>
          <p>Real-time retail sales and performance intelligence system</p>
        </div>
        <div className="analytics-timeframe-badge">
          <Calendar size={15} />
          <span>Active Scope: {timeframe.toUpperCase()}</span>
        </div>
      </div>

      {/* Anime HUD Stat Cards Matrix */}
      <div className="kpi-grid">
        {kpiList.map((kpi) => {
          const Icon = getKPIIcon(kpi.title);
          return (
            <div key={kpi.id} className="kpi-card">
              <div className="kpi-card-header">
                <span className="kpi-title">{kpi.title}</span>
                <span className="kpi-icon-wrapper">
                  <Icon size={18} />
                </span>
              </div>
              {renderKPIValue(kpi.value)}
              <div className="kpi-card-footer">
                <span className={`trend-badge ${kpi.isPositive ? "up" : "down"}`}>
                  {kpi.isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {kpi.trend}
                </span>
                <span className="trend-lbl">{kpi.label}</span>
              </div>
            </div>
          );
        })}
        {/* <AlertStatCard /> */}
      </div>

      {/* Multi-Chart Grid Panel (3 related graphs) */}
      <div className="charts-grid-layout">
        {/* Graph 1: Revenue Trends */}
        <div className="chart-panel primary-chart">
          <div className="chart-panel-header">
            <div className="chart-panel-title">
              <h3>Revenue Performance (LKR)</h3>
              <p>Total sales income trends over selected scope</p>
            </div>
            <div className="toggle-group">
              {["daily", "weekly", "monthly"].map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`toggle-btn ${timeframe === t ? "active" : ""}`}
                  onClick={() => setTimeframe(t)}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="chart-wrapper">
            {activeData.revenue?.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={activeData.revenue} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="chart-gradient-maroon" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b3a3a" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#8b3a3a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#2c2c2c", fontSize: 11, fontWeight: 600 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#2c2c2c", fontSize: 11, fontWeight: 600 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#2c2c2c",
                      border: "1px solid #8b3a3a",
                      borderRadius: "8px",
                      color: "#fff",
                      fontFamily: "inherit",
                      fontSize: "12px"
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#8b3a3a"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#chart-gradient-maroon)"
                    activeDot={{ r: 6, stroke: "#8b3a3a", strokeWidth: 2, fill: "#fff" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-message-wrapper" style={{ height: "100%", justifyContent: "center" }}>
                <p className="empty-message">No sales trends recorded yet for this timeframe.</p>
              </div>
            )}
          </div>
        </div>

        <div className="charts-secondary-row">
          {/* Graph 2: Conversion & AOV Line Trends */}
          <div className="chart-panel secondary-chart">
            <div className="chart-panel-header">
              <div className="chart-panel-title">
                <h3>Conversion & AOV (LKR)</h3>
                <p>Order conversions and average cart values</p>
              </div>
            </div>
            <div className="chart-wrapper">
              {activeData.efficiency?.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={activeData.efficiency} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#2c2c2c", fontSize: 11, fontWeight: 600 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#2c2c2c", fontSize: 11, fontWeight: 600 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#2c2c2c",
                        border: "1px solid #8b3a3a",
                        borderRadius: "8px",
                        color: "#fff"
                      }}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Line
                      name="Conversion %"
                      type="monotone"
                      dataKey="conversion"
                      stroke="#16a34a"
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      name="AOV (LKR)"
                      type="monotone"
                      dataKey="aov"
                      stroke="#8b3a3a"
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-message-wrapper" style={{ height: "100%", justifyContent: "center" }}>
                  <p className="empty-message">No conversion data recorded yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* Graph 3: Category Distribution Bar Chart */}
          <div className="chart-panel secondary-chart">
            <div className="chart-panel-header">
              <div className="chart-panel-title">
                <h3>Category Share</h3>
                <p>Volume of sales items per department</p>
              </div>
            </div>
            <div className="chart-wrapper">
              {activeData.categories?.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={activeData.categories} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#2c2c2c", fontSize: 11, fontWeight: 600 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#2c2c2c", fontSize: 11, fontWeight: 600 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#2c2c2c",
                        border: "1px solid #8b3a3a",
                        borderRadius: "8px",
                        color: "#fff"
                      }}
                    />
                    <Bar dataKey="sales" fill="#8b3a3a" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-message-wrapper" style={{ height: "100%", justifyContent: "center" }}>
                  <p className="empty-message">No category records found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Sales Ledger */}
      <div className="ledger-panel">
        <div className="ledger-panel-header">
          <h3>Recent Sales Ledger</h3>
        </div>

        <div className="ledger-controller">
          <div className="ledger-search-wrapper">
            <Search className="search-icon" size={18} />
            <input
              type="text"
              placeholder="Search Customer, Txn ID, or Value..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button type="button" onClick={handleExportPDF} className="ledger-export-btn">
            <Download size={16} />
            <span>Export Report as PDF</span>
          </button>
        </div>

        <div className="ledger-list">
          {filteredTransactions.length === 0 ? (
            <div className="empty-message-wrapper">
              <p className="empty-message">No matching transactions found.</p>
            </div>
          ) : (
            filteredTransactions.map((txn, index) => (
              <div
                key={txn.id}
                className="ledger-row stagger-item"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <div className="ledger-left">
                  <span className="ledger-id-badge">{txn.id}</span>
                  <span className="ledger-customer-name">{txn.customer}</span>
                </div>
                <div className="ledger-center">
                  <span className="ledger-timestamp">{txn.time}</span>
                </div>
                <div className="ledger-right">
                  <span className="ledger-amount">
                    <span className="ledger-currency">LKR</span>
                    {" "}{txn.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className={`ledger-status ${txn.status}`}>
                    {txn.status.toUpperCase()}
                  </span>
                </div>
              </div>
              
            ))
          )}
        </div>
      </div>
      
    </div>
  );
}