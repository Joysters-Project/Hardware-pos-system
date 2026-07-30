import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Building2, 
  ClipboardList, 
  Wallet, 
  TrendingUp, 
  LineChart, 
  Bell,
  FileBarChart2
} from 'lucide-react';
import '../../styles/ProcurementWorkspace.css';

export default function ProcurementTopNav() {
  const navItems = [
    { label: 'Overview',        path: '/procurement',              icon: LayoutDashboard, end: true },
    { label: 'Suppliers',       path: '/procurement/suppliers',    icon: Building2 },
    { label: 'Purchase Orders', path: '/procurement/orders',       icon: ClipboardList },
    { label: 'Payments',        path: '/procurement/payments',     icon: Wallet },
    { label: 'Analytics',       path: '/procurement/analytics',    icon: TrendingUp },
    { label: 'Forecast',        path: '/procurement/forecast',     icon: LineChart },
    { label: 'Reports',         path: '/procurement/reports',      icon: FileBarChart2 },
    { label: 'Notifications',   path: '/procurement/notifications',icon: Bell },
  ];

  return (
    <header className="procurement-header">
      <div className="procurement-title-block">
        <h1>Procurement</h1>
        <p>Manage suppliers, purchase orders, payments and analytics.</p>
      </div>

      <nav className="procurement-top-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) => `procurement-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={15} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </header>
  );
}
