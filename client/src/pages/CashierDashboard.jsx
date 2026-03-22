import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import "../styles/Dashboard.css";

function CashierDashboard() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [userName] = useState(user?.name || "Cashier User");

  const handleLogout = () => {
    // Prevent back button navigation
    window.history.pushState(null, null, window.location.href);
    window.addEventListener("popstate", () => {
      window.history.pushState(null, null, window.location.href);
    });

    logout();
    toast.success("Logged out successfully!");
    navigate("/", { replace: true });
  };

  useEffect(() => {
    // Prevent back button after logout
    window.history.pushState(null, null, window.location.href);
    const handleBackButton = () => {
      window.history.pushState(null, null, window.location.href);
    };
    
    window.addEventListener("popstate", handleBackButton);
    return () => {
      window.removeEventListener("popstate", handleBackButton);
    };
  }, []);

  return (
    <div className="dashboard">
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>Cashier Panel</h2>
        </div>
        <nav className="sidebar-nav">
          <a href="#dashboard" className="nav-item active">
            🛒 Point of Sale
          </a>
          <a href="#sales" className="nav-item">
            💳 Sales
          </a>
          <a href="#returns" className="nav-item">
            ↩️ Returns
          </a>
          <a href="#receipts" className="nav-item">
            🧾 Receipts
          </a>
        </nav>
        <button onClick={handleLogout} className="logout-btn">
          🚪 Logout
        </button>
      </div>

      <div className="main-content">
        <div className="header">
          <h1>Welcome, {userName}! 👋</h1>
          <p>Cashier Dashboard</p>
        </div>

        <div className="content-grid">
          <div className="card">
            <h3>💰 Sales Today</h3>
            <p className="number">$3,450</p>
            <small>12 transactions</small>
          </div>
          <div className="card">
            <h3>🛒 Items Sold</h3>
            <p className="number">89</p>
            <small>This shift</small>
          </div>
          <div className="card">
            <h3>↩️ Returns</h3>
            <p className="number">3</p>
            <small>Today</small>
          </div>
          <div className="card">
            <h3>⏱️ Shift Time</h3>
            <p className="number">4h 32m</p>
            <small>Elapsed</small>
          </div>
        </div>

        <div className="recent-section">
          <h2>Recent Transactions</h2>
          <div className="activity-list">
            <div className="activity-item">
              <span>Sale: $125.50</span>
              <small>5 minutes ago</small>
            </div>
            <div className="activity-item">
              <span>Return: $45.00</span>
              <small>15 minutes ago</small>
            </div>
            <div className="activity-item">
              <span>Sale: $89.99</span>
              <small>30 minutes ago</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CashierDashboard;
