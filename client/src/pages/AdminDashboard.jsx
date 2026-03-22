import React from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import "../styles/Dashboard.css";

function AdminDashboard({ children, active }) {

  const navigate = useNavigate();
  const userName = localStorage.getItem("userName") || "Admin User";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    localStorage.removeItem("role");
    toast.success("Logged out successfully!");
    navigate("/");
  };

  return (
    <div className="dashboard">

      {/* Sidebar */}
      <div className="sidebar">

        <div className="sidebar-header">
          <h2>Admin Panel</h2>
        </div>

        <ul className="sidebar-menu">

          <li className={active === "home" ? "active" : ""}>
            <Link to="/dashboard/admin">📊 Dashboard</Link>
          </li>

          <li className={active === "departments" ? "active" : ""}>
            <Link to="/departments">🏢 Departments</Link>
          </li>

          <li className={active === "products" ? "active" : ""}>
            <Link to="/products">📦 Products</Link>
          </li>

          <li className={active === "customers" ? "active" : ""}>
            <Link to="/customers">👥 Customers</Link>
          </li>

          <li className={active === "bills" ? "active" : ""}>
            <Link to="/bills/create">🧾 Bills</Link>
          </li>

        </ul>

        <button className="logout-btn" onClick={handleLogout}>
          🚪 Logout
        </button>

      </div>

      {/* Main Content */}
      <div className="main-content">

        {children ? (
          children
        ) : (
          <div className="dashboard-home">
            <h1>Welcome, {userName}! 👋</h1>
            <p>Admin Dashboard</p>
          </div>
        )}

      </div>

    </div>
  );
}

export default AdminDashboard;
