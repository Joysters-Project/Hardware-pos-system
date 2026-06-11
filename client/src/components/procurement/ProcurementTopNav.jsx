import { NavLink, useNavigate } from 'react-router-dom';
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
import { useUnreadNotificationsCount } from '../../services/procurementApi';
import '../../styles/ProcurementWorkspace.css';

export default function ProcurementTopNav() {
  const navigate = useNavigate();
  const { data: countData } = useUnreadNotificationsCount();
  const unreadCount = countData?.count || 0;

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

      <div className="procurement-actions">
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

        <button 
          className="procurement-bell-btn"
          onClick={() => navigate('/procurement/notifications')}
          title="Procurement Notifications"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="procurement-bell-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
          )}
        </button>
      </div>
    </header>
  );
}
