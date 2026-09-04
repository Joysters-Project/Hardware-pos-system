import { Outlet } from 'react-router-dom';
import CashierTopNav from './CashierTopNav';
import '../../styles/ProcurementWorkspace.css';

export default function CashierWorkspace() {
  return (
    <div className="procurement-workspace">
      <CashierTopNav />
      <div className="procurement-workspace-content cashier-workspace-content">
        <Outlet />
      </div>
    </div>
  );
}
