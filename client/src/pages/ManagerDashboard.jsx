import React from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import "../styles/Dashboard.css";

function ManagerDashboard({ children, active }) {
  const navigate = useNavigate();
  const userName = localStorage.getItem("userName") || "Manager User";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    localStorage.removeItem("role");
    toast.success("Logged out successfully!");
    navigate("/");
  };

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
