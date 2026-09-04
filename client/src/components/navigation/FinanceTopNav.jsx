import { NavLink, useLocation } from 'react-router-dom';
import { Receipt, Wallet } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import '../../styles/ProcurementWorkspace.css';

export default function FinanceTopNav() {
  const location = useLocation();
  const { user } = useAuth();
  const isManager = location.pathname.startsWith('/manager/');
  const prefix = isManager ? '/manager' : '';

  const navItems = [
    { label: 'Expenses', path: `${prefix}/expenses`, icon: Receipt, roles: ['admin', 'manager'] },
    { label: 'Salary',   path: `${prefix}/salary`,   icon: Wallet,  roles: ['admin'] },
  ];

  const visible = navItems.filter((item) => item.roles.includes(user?.role));

  return (
    <header className="procurement-header">
      <div className="procurement-title-block">
        <h1>Finance</h1>
        <p>Track business expenses and employee salaries</p>
      </div>

      <nav className="procurement-top-nav">
        {visible.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end
              className={({ isActive }) => `procurement-nav-item${isActive ? ' active' : ''}`}
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
