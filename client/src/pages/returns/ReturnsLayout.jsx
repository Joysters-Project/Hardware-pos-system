import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { RotateCcw, ClipboardList, Wrench, Package, ShieldCheck } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import '../../styles/Returns.css';
import '../../styles/ProcurementWorkspace.css';
import '../../styles/Procurement.css';
import '../../styles/Catalog.css';

export default function ReturnsLayout() {
  const location = useLocation();
  const basePath = location.pathname.startsWith('/cashier-panel') ? '/cashier-panel/returns' : '/returns';

  const navItems = [
    { label: 'Process Return', path: `${basePath}/process`, icon: RotateCcw },
    { label: 'Return History', path: `${basePath}/history`, icon: ClipboardList },
    { label: 'Supplier Repairs & Warranty', path: `${basePath}/supplier-services`, icon: Wrench },
    { label: 'Inventory Status', path: `${basePath}/inventory`, icon: Package },
  ];

  return (
    <DashboardLayout active="returns">
      <div className="proc-container">
        {/* Header bar inside the container */}
        <div className="proc-header" style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
            <div className="proc-header-icon">
              <ShieldCheck size={22} color="#fff" />
            </div>
            <div>
              <h1 style={{ margin: 0 }}>Return &amp; Warranty Management</h1>
              <p style={{ margin: 0, color: "var(--proc-text-muted, #666)", fontSize: "0.85rem" }}>
                Customer returns, supplier warranty repairs, replacements, and stock status tracking
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher - Billing counter style */}
        <div className="pos-tab-switcher">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isItemActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`pos-tab-btn ${isItemActive ? 'active' : ''}`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Content of sub-routes */}
        <div key={location.pathname} style={{ width: '100%' }}>
          <Outlet />
        </div>
      </div>
    </DashboardLayout>
  );
}
