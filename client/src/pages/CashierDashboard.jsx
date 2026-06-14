import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import DashboardLayout from "../components/DashboardLayout";
import "../styles/Dashboard.css";

function CashierDashboard() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [userName] = useState(user?.name || "Cashier User");

  const [stats, setStats] = useState({
    salesToday: 0,
    itemsSold: 0,
    returnsCount: 0,
    transactionsCount: 0,
    recentTransactions: []
  });

  const [shiftTime, setShiftTime] = useState("0h 0m");

  useEffect(() => {
    window.history.pushState(null, null, window.location.href);
    const handleBackButton = () => window.history.pushState(null, null, window.location.href);
    window.addEventListener("popstate", handleBackButton);

    const fetchStats = async () => {
      try {
        const userId = localStorage.getItem('cashierId') || localStorage.getItem('userId') || '';
        const res = await api.get(`/dashboard/cashier?userId=${userId}`);
        setStats(res.data);
      } catch (err) {
        console.error("Failed to fetch dashboard stats", err);
      }
    };
    fetchStats();

    let startTime = localStorage.getItem('loginTime');
    if (!startTime) {
      startTime = Date.now().toString();
      localStorage.setItem('loginTime', startTime);
    }
    const updateShiftTime = () => {
      const elapsed = Date.now() - parseInt(startTime, 10);
      const h = Math.floor(elapsed / 3600000);
      const m = Math.floor((elapsed % 3600000) / 60000);
      setShiftTime(`${h}h ${m}m`);
    };
    updateShiftTime();
    const interval = setInterval(updateShiftTime, 60000);

    return () => {
      window.removeEventListener("popstate", handleBackButton);
      clearInterval(interval);
    };
  }, []);

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully!");
    navigate("/", { replace: true });
  };

  const statusColor = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "paid" || s === "completed") return "#10b981";
    if (s === "partial") return "#f59e0b";
    if (s === "pending") return "#6b7280";
    return "#6b7280";
  };

  return (
    <DashboardLayout active="home">
      <div className="header">
        <h1>Welcome, {userName}! 👋</h1>
        <p>Cashier Dashboard</p>
      </div>

      {/* Horizontal stat cards */}
      <div className="cashier-stats-row">
        <div className="cashier-stat-card">
          <div className="cashier-stat-icon" style={{ background: "#ede9fe" }}>💰</div>
          <div className="cashier-stat-info">
            <span className="cashier-stat-label">Sales Today</span>
            <span className="cashier-stat-value">Rs {stats.salesToday.toFixed(2)}</span>
            <span className="cashier-stat-sub">{stats.transactionsCount} transactions</span>
          </div>
        </div>
        <div className="cashier-stat-card">
          <div className="cashier-stat-icon" style={{ background: "#dbeafe" }}>🛒</div>
          <div className="cashier-stat-info">
            <span className="cashier-stat-label">Items Sold</span>
            <span className="cashier-stat-value">{stats.itemsSold}</span>
            <span className="cashier-stat-sub">This shift</span>
          </div>
        </div>
        <div className="cashier-stat-card">
          <div className="cashier-stat-icon" style={{ background: "#fee2e2" }}>↩️</div>
          <div className="cashier-stat-info">
            <span className="cashier-stat-label">Returns</span>
            <span className="cashier-stat-value">{stats.returnsCount}</span>
            <span className="cashier-stat-sub">Today</span>
          </div>
        </div>
        <div className="cashier-stat-card">
          <div className="cashier-stat-icon" style={{ background: "#dcfce7" }}>⏱️</div>
          <div className="cashier-stat-info">
            <span className="cashier-stat-label">Shift Time</span>
            <span className="cashier-stat-value">{shiftTime}</span>
            <span className="cashier-stat-sub">Elapsed</span>
          </div>
        </div>
      </div>

      {/* Recent Transactions — newest first */}
      <div className="recent-section">
        <h2>Recent Transactions</h2>
        <div className="cashier-txn-list">
          {(!stats.recentTransactions || stats.recentTransactions.length === 0) ? (
            <div className="cashier-txn-empty">No transactions today yet.</div>
          ) : (
            stats.recentTransactions.map((txn) => (
              <div key={txn.bill_id} className="cashier-txn-row">
                <div className="cashier-txn-left">
                  <span className="cashier-txn-id">#{txn.bill_id}</span>
                  <span className="cashier-txn-customer">{txn.customer}</span>
                </div>
                <div className="cashier-txn-mid">
                  <span className="cashier-txn-time">{txn.time}</span>
                </div>
                <div className="cashier-txn-right">
                  <span className="cashier-txn-amount">Rs {txn.amount.toFixed(2)}</span>
                  <span className="cashier-txn-status" style={{ color: statusColor(txn.status) }}>
                    {txn.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default CashierDashboard;
