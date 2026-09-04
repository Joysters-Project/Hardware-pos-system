import { NavLink, useLocation } from 'react-router-dom';
import { Package, Layers, Archive, Briefcase } from 'lucide-react';
import '../../styles/ProcurementWorkspace.css';

export default function InventoryTopNav() {
  const location = useLocation();
  const isManager = location.pathname.startsWith('/manager/');
  const prefix = isManager ? '/manager' : '';

  const navItems = [
    { label: 'Products',        path: `${prefix}/products`,           icon: Package },
    { label: 'Catalog',         path: `${prefix || ''}/catalog`,      icon: Layers },
    { label: 'Batch Inventory', path: `${prefix}/inventory/batches`,  icon: Archive },
    { label: 'Assets',          path: `${prefix}/assets`,             icon: Briefcase },
  ];

  return (
    <header className="procurement-header">
      <div className="procurement-title-block">
        <h1>Inventory Management</h1>
        <p>Manage products, catalog categories, batch inventory, and company assets</p>
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
