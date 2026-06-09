import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Building2, 
  ClipboardList, 
  Wallet, 
  TrendingUp, 
  LineChart, 
  Bell 
} from 'lucide-react';
import { useUnreadNotificationsCount } from '../../services/procurementApi';
import '../../styles/ProcurementWorkspace.css';

export default function ProcurementTopNav() {
  const navigate = useNavigate();
  const { data: countData } = useUnreadNotificationsCount();
  const unreadCount = countData?.count || 0;

  const navItems = [
    { label: 'Overview', path: '/procurement', icon: LayoutDashboard, end: true },
    { label: 'Suppliers', path: '/procurement/suppliers', icon: Building2 },
    { label: 'Purchase Orders', path: '/procurement/orders', icon: ClipboardList },
    { label: 'Payments', path: '/procurement/payments', icon: Wallet },
    { label: 'Analytics', path: '/procurement/analytics', icon: TrendingUp },
    { label: 'Forecast', path: '/procurement/forecast', icon: LineChart },
  ];

  return (
    <header className="procurement-header">
      <div className="procurement-title-block">
        <h1>Procurement Workspace</h1>
        <p>Manage store inventory replenishment, supplier tracking, and accounts payable.</p>
      </div>

      <div className="procurement-actions">
        {/* Top Navigation Tabs */}
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
                <Icon size={16} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Notification Bell */}
        <button 
          className="procurement-bell-btn"
          onClick={() => navigate('/procurement/notifications')}
          title="Procurement Notifications"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="procurement-bell-badge">{unreadCount}</span>
          )}
        </button>
      </div>
    </header>
  );
}
