import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import AlertSummaryCard from "../components/AlertSummaryCard";
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
          <li className={active === "alerts" ? "active" : ""}>
            <Link to="/alerts">🚨 Alerts</Link>
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
            <div className="dashboard-hero">
              <span className="dashboard-kicker">Control Center</span>
              <h1>Welcome back, {userName}</h1>
              <p>Track operations, monitor teams, and move quickly between core management tasks.</p>
            </div>

            <div style={{ marginTop: "1.25rem" }}>
              <AlertSummaryCard />
            </div>

            <div className="dashboard-home-grid">
              <Link className="dashboard-tile" to="/departments">
                <span className="tile-icon">🏢</span>
                <h3>Departments</h3>
                <p>Manage structure and ownership of every section.</p>
              </Link>

              <Link className="dashboard-tile" to="/products">
                <span className="tile-icon">📦</span>
                <h3>Products</h3>
                <p>Update inventory listings and maintain pricing accuracy.</p>
              </Link>

              <Link className="dashboard-tile" to="/employees">
                <span className="tile-icon">👤</span>
                <h3>Employees</h3>
                <p>Assign roles, review staffing, and keep records up to date.</p>
              </Link>

              <Link className="dashboard-tile" to="/catalog">
                <span className="tile-icon">📋</span>
                <h3>Catalog</h3>
                <p>Organize product visibility and streamline browsing flow.</p>
              </Link>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}

export default AdminDashboard;
