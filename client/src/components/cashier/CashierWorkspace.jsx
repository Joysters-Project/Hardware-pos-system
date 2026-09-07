import { Outlet, useLocation } from 'react-router-dom';
import CashierTopNav from './CashierTopNav';
import '../../styles/ProcurementWorkspace.css';

export default function CashierWorkspace() {
  const location = useLocation();
  return (
    <div className="procurement-workspace">
      <CashierTopNav />
      <div key={location.pathname} className="procurement-workspace-content cashier-workspace-content">
        <Outlet />
      </div>
    </div>
  );
}
