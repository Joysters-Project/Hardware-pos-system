import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import "../styles/Dashboard.css";

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

    // Fetch Stats
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
      window.removeEventListener("popstate", handleBackButton);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="dashboard">
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>Cashier Panel</h2>
        </div>
        <ul className="sidebar-menu">
          <li className="active">
            <Link to="/billing">
              🛒 Point of Sale (Billing)
            </Link>
          </li>
          <li>
            <Link to="/due-collection">
              💼 Due Collection
            </Link>
          </li>
          <li>
            <a href="#sales">
              💳 Sales
            </a>
          </li>
          <li>
            <Link to="/returns">
              ↩️ Returns
            </Link>
          </li>
          <li>
            <Link to="/receipts">
              🧾 Receipts
            </Link>
          </li>
        </ul>
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
            <p className="number">Rs {stats.salesToday.toFixed(2)}</p>
            <small>{stats.transactionsCount} transactions</small>
          </div>
          <div className="card">
            <h3>🛒 Items Sold</h3>
            <p className="number">{stats.itemsSold}</p>
            <small>This shift</small>
          </div>
          <div className="card">
            <h3>↩️ Returns</h3>
            <p className="number">{stats.returnsCount}</p>
            <small>Today</small>
          </div>
          <div className="card">
            <h3>⏱️ Shift Time</h3>
            <p className="number">{shiftTime}</p>
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
