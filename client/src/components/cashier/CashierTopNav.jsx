import { NavLink, useLocation } from 'react-router-dom';
import { 
  ShoppingCart, 
  Wallet, 
  Banknote,
  RotateCcw, 
  Receipt, 
  BarChart3 
} from 'lucide-react';
import '../../styles/ProcurementWorkspace.css';

export default function CashierTopNav() {
  const location = useLocation();

  const navItems = [
    { label: 'Point of Sale',   path: '/cashier-panel/billing',         icon: ShoppingCart },
    { label: 'Due Collection',  path: '/cashier-panel/due-collection',  icon: Wallet },
    { label: 'Cheque Exchange', path: '/cashier-panel/cheque-exchange', icon: Banknote },
    { label: 'Returns',         path: '/cashier-panel/returns',         icon: RotateCcw },
    { label: 'Receipts',        path: '/cashier-panel/receipts',        icon: Receipt },
    { label: 'Reports',         path: '/cashier-panel/reports',         icon: BarChart3 },
  ];

  const isItemActive = (itemPath) => {
    if (itemPath === '/cashier-panel/billing') {
      return location.pathname === '/cashier-panel/billing' || location.pathname === '/cashier-panel';
    }
    return location.pathname.startsWith(itemPath);
  };

  return (
    <header className="procurement-header">
      <div className="procurement-title-block">
        <h1>Cashier Panel</h1>
        <p>Access point of sale, due collection, cheque exchange, returns, receipts and cashier reports</p>
      </div>

      <nav className="procurement-top-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isItemActive(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`procurement-nav-item${active ? ' active' : ''}`}
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
