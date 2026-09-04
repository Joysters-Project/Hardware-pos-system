import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { RotateCcw, ClipboardList, Wrench, Package, ShieldCheck } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import '../../styles/Returns.css';
import '../../styles/ProcurementWorkspace.css';
import '../../styles/Catalog.css';

export default function ReturnsLayout() {
  const location = useLocation();
  const basePath = location.pathname.startsWith('/cashier-panel') ? '/cashier-panel/returns' : '/returns';

  const navItems = [
    { label: 'Process Return',              path: `${basePath}/process`,           icon: RotateCcw },
    { label: 'Return History',              path: `${basePath}/history`,           icon: ClipboardList },
    { label: 'Supplier Repairs & Warranty', path: `${basePath}/supplier-services`, icon: Wrench },
    { label: 'Inventory Status',            path: `${basePath}/inventory`,         icon: Package },
  ];

  return (
    <DashboardLayout active="returns">
      <div className="procurement-workspace">

        {/* Header bar — billing counter style */}
        <div style={{
          background: '#fff',
          borderBottom: '2px solid #e5e7eb',
          padding: '18px 24px 0',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}>

          {/* Title row with icon */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '16px' }}>
            <div style={{
              width: 48, height: 48,
              background: 'linear-gradient(135deg, #8b3a3a 0%, #a84545 100%)',
              borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(139,58,58,0.25)',
              flexShrink: 0,
            }}>
              <ShieldCheck size={24} color="white" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2b1515', margin: 0, lineHeight: 1.3 }}>
                Return &amp; Warranty Management
              </h1>
              <p style={{ fontSize: '0.875rem', color: '#666', margin: '2px 0 0' }}>
                Customer returns, supplier warranty repairs, replacements, and stock status tracking
              </p>
            </div>
          </div>

          {/* Catalog-style tab nav */}
          <nav style={{ display: 'flex', gap: '8px', paddingBottom: '0' }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  style={({ isActive: navActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 20px',
                    border: 'none',
                    background: 'transparent',
                    color: (navActive || isActive) ? '#8b3a3a' : '#555',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    borderRadius: '6px 6px 0 0',
                    textDecoration: 'none',
                    position: 'relative',
                    transition: 'all 0.25s ease',
                    backgroundColor: (navActive || isActive) ? 'rgba(139,58,58,0.08)' : 'transparent',
                    borderBottom: (navActive || isActive) ? '3px solid #8b3a3a' : '3px solid transparent',
                  })}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Content of sub-routes */}
        <div className="procurement-workspace-content" style={{ padding: '24px' }}>
          <Outlet />
        </div>
      </div>
    </DashboardLayout>
  );
}
