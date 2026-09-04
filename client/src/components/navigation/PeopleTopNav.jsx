import { NavLink, useLocation } from 'react-router-dom';
import { Users, Building2 } from 'lucide-react';
import '../../styles/ProcurementWorkspace.css';

export default function PeopleTopNav() {
  const location = useLocation();
  const isManager = location.pathname.startsWith('/manager/');
  const prefix = isManager ? '/manager' : '';

  const navItems = [
    { label: 'Employees',   path: `${prefix}/employees`,   icon: Users },
    { label: 'Departments', path: `${prefix}/departments`,  icon: Building2 },
  ];

  return (
    <header className="procurement-header">
      <div className="procurement-title-block">
        <h1>People & Organization</h1>
        <p>Manage employees, staff roles, and company departments</p>
      </div>

      <nav className="procurement-top-nav">
        {navItems.map((item) => {
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
