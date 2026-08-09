import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import DashboardLayout from "../components/DashboardLayout";
import {
  DollarSign,
  ShoppingCart,
  RotateCcw,
  Clock,
  TrendingUp
} from "lucide-react";
import "../styles/Dashboard.css";
import "../styles/AnalyticalDashboard.css";

function CashierDashboard() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [userName] = useState(user?.name || "Cashier User");
  
  const [stats, setStats] = useState({
    salesToday: 0,
    itemsSold: 0,
    returnsCount: 0,
    transactionsCount: 0
  });

  const [shiftTime, setShiftTime] = useState("0h 0m");

  useEffect(() => {
    // Fetch Stats
    const fetchStats = async () => {
      try {
        const userId = localStorage.getItem('userId') || '';
        const res = await api.get(`/dashboard/cashier?userId=${userId}`);
        setStats(res.data);
      } catch (err) {
        console.error("Failed to fetch dashboard stats", err);
      }
    };
    
    fetchStats();

    // Shift time tracker based on login time
    let startTime = localStorage.getItem('loginTime');
    if (!startTime) {
      startTime = Date.now().toString();
      localStorage.setItem('loginTime', startTime);
    }
    
    const updateShiftTime = () => {
      const elapsedMs = Date.now() - parseInt(startTime, 10);
      const hours = Math.floor(elapsedMs / (1000 * 60 * 60));
      const minutes = Math.floor((elapsedMs % (1000 * 60 * 60)) / (1000 * 60));
      setShiftTime(`${hours}h ${minutes}m`);
    };

    updateShiftTime();
    const interval = setInterval(updateShiftTime, 60000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully!");
    navigate("/", { replace: true });
  };

  const kpiCards = [
    {
      id: 1,
      title: "Sales Today",
      icon: DollarSign,
      renderValue: () => (
        <div className="kpi-value-wrapper">
          <span className="kpi-currency">Rs</span>
          <span className="kpi-number">{(stats?.salesToday || 0).toFixed(2)}</span>
        </div>
      ),
      trend: "+Today",
      label: `${stats?.transactionsCount || 0} transactions`
    },
    {
      id: 2,
      title: "Items Sold",
      icon: ShoppingCart,
      renderValue: () => <div className="kpi-value">{stats.itemsSold}</div>,
      trend: "This shift",
      label: "units dispatched"
    },
    {
      id: 3,
      title: "Returns",
      icon: RotateCcw,
      renderValue: () => <div className="kpi-value">{stats.returnsCount}</div>,
      trend: "Today",
      label: "processed returns"
    },
    {
      id: 4,
      title: "Shift Time",
      icon: Clock,
      renderValue: () => <div className="kpi-value">{shiftTime}</div>,
      trend: "Active",
      label: "time elapsed"
    }
  ];

  return (
    <DashboardLayout active="home">
      <div className="analytics-container">

        {/* Page Header */}
        <div className="analytics-header">
          <div>
            <h1>Welcome, {userName}!</h1>
            <p>Cashier Dashboard &mdash; real-time shift overview</p>
          </div>
          <div className="analytics-timeframe-badge">
            <Clock size={15} />
            <span>Shift: {shiftTime}</span>
          </div>
        </div>

        {/* KPI Cards — same design as Admin Dashboard */}
        <div className="kpi-grid">
          {kpiCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.id} className="kpi-card">
                <div className="kpi-card-header">
                  <span className="kpi-title">{card.title}</span>
                  <span className="kpi-icon-wrapper">
                    <Icon size={18} />
                  </span>
                </div>
                {card.renderValue()}
                <div className="kpi-card-footer">
                  <span className="trend-badge up">
                    <TrendingUp size={12} />
                    {card.trend}
                  </span>
                  <span className="trend-lbl">{card.label}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent Transactions — same ledger panel style as Admin Dashboard */}
        <div className="ledger-panel">
          <div className="ledger-panel-header">
            <h3>Recent Transactions</h3>
          </div>

          <div className="ledger-list">
            {(!stats.recentTransactions || stats.recentTransactions.length === 0) ? (
              <div className="empty-message-wrapper">
                <p className="empty-message">No transactions today yet.</p>
              </div>
            ) : (
              stats.recentTransactions.map((txn, index) => {
                const s = (txn.status || "").toLowerCase();
                const formattedTime = txn.rawTime 
                  ? (!isNaN(new Date(txn.rawTime).getTime()) 
                    ? new Date(txn.rawTime).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) 
                    : txn.time)
                  : (txn.time || 'N/A');
                return (
                  <div
                    key={txn.bill_id}
                    className="ledger-row stagger-item"
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    <div className="ledger-left">
                      <span className="ledger-id-badge">#{txn.bill_id}</span>
                      <span className="ledger-customer-name">{txn.customer}</span>
                    </div>
                    <div className="ledger-center">
                      <span className="ledger-timestamp">{formattedTime}</span>
                    </div>
                    <div className="ledger-right">
                      <span className="ledger-amount">
                        <span className="ledger-currency">Rs</span>
                        {" "}{txn.amount.toFixed(2)}
                      </span>
                      <span className={`ledger-status ${statusClass}`}>
                        {txn.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}

export default CashierDashboard;