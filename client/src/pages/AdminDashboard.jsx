import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import "../styles/Dashboard.css";

function AdminDashboard({ children, active }) {

  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const userName = user?.name || "Admin User";

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

          <li className={active === "employees" ? "active" : ""}>
            <Link to="/employees">👤 Employees</Link>
          </li>

          <li className={active === "catalog" ? "active" : ""}>
            <Link to="/catalog">📋 Catalog</Link>
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
