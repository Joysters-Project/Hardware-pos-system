import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import '../../styles/Returns.css';

export default function ReturnsLayout() {
  return (
    <DashboardLayout active="returns">
      <div className="ret-container">
        {/* Header */}
        <div className="ret-header" style={{ marginBottom: '16px' }}>
          <div>
            <h1>Return & Warranty Management</h1>
            <p>Customer returns, supplier warranty repairs, replacements, and stock status tracking</p>
          </div>
        </div>

        {/* Sub-navigation tabs */}
        <div className="rp-tabs">
          <NavLink
            to="/returns/process"
            className={({ isActive }) => `rp-tab ${isActive ? 'active' : ''}`}
          >
            🔄 Process Return
          </NavLink>
          <NavLink
            to="/returns/history"
            className={({ isActive }) => `rp-tab ${isActive ? 'active' : ''}`}
          >
            📋 Return History
          </NavLink>
          <NavLink
            to="/returns/supplier-services"
            className={({ isActive }) => `rp-tab ${isActive ? 'active' : ''}`}
          >
            🛠️ Supplier Repairs & Warranty
          </NavLink>
          <NavLink
            to="/returns/inventory"
            className={({ isActive }) => `rp-tab ${isActive ? 'active' : ''}`}
          >
            📦 Inventory Status
          </NavLink>
        </div>

        {/* Content of sub-routes */}
        <Outlet />
      </div>
    </DashboardLayout>
  );
}
