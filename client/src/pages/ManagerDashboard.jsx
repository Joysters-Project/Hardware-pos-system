import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {toast} from "react-hot-toast";
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
            <Link to="/dashboard/manager">Dashboard</Link>
          </li>

          <li className={active === "departments" ? "active" : ""}>
            <Link to="/manager/departments">Departments</Link>
          </li>

          <li className={active === "products" ? "active" : ""}>
            <Link to="/manager/products">Products</Link>
          </li>

          <li className={active === "customers" ? "active" : ""}>
            <Link to="/customers">Customers</Link>
          </li>

          <li className={active === "bills" ? "active" : ""}>
            <Link to="/bills/create">Bills</Link>
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
            <h1>Welcome, {userName}!</h1>
            <p>Manager Dashboard</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ManagerDashboard;
