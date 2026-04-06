import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import "../styles/Dashboard.css";

function ManagerDashboard({ children, active }) {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const userName = user?.name || "Manager User";

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
          <h2>Manager Panel</h2>
        </div>

        <ul className="sidebar-menu">
          <li className={active === "home" ? "active" : ""}>
            <Link to="/dashboard/manager">📊 Dashboard</Link>
          </li>

          <li className={active === "departments" ? "active" : ""}>
            <Link to="/manager/departments">🏢 Departments</Link>
          </li>

          <li className={active === "products" ? "active" : ""}>
            <Link to="/manager/products">📦 Products</Link>
          </li>

          <li className={active === "employees" ? "active" : ""}>
            <Link to="/manager/employees">👤 Employees</Link>
          </li>

          <li className={active === "catalog" ? "active" : ""}>
            <Link to="/manager/catalog">📋 Catalog</Link>
          </li>
        </ul>

        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>

      <div className="main-content">
        {children ? (
          children
        ) : (
          <div className="dashboard-home">
            <div className="dashboard-hero">
              <span className="dashboard-kicker">Operations Hub</span>
              <h1>Welcome back, {userName}</h1>
              <p>Stay on top of floor performance and team coordination from one place.</p>
            </div>

            <div className="dashboard-home-grid">
              <Link className="dashboard-tile" to="/manager/departments">
                <span className="tile-icon">🏢</span>
                <h3>Departments</h3>
                <p>Oversee department updates and keep data organized.</p>
              </Link>

              <Link className="dashboard-tile" to="/manager/products">
                <span className="tile-icon">📦</span>
                <h3>Products</h3>
                <p>Review item status and improve shelf readiness.</p>
              </Link>

              <Link className="dashboard-tile" to="/manager/employees">
                <span className="tile-icon">👤</span>
                <h3>Employees</h3>
                <p>Coordinate staffing and track team assignments.</p>
              </Link>

              <Link className="dashboard-tile" to="/manager/catalog">
                <span className="tile-icon">📋</span>
                <h3>Catalog</h3>
                <p>Keep listings clean and easy for teams to navigate.</p>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ManagerDashboard;
