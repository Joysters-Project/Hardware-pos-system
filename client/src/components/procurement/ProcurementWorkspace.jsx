import { Outlet, useLocation } from 'react-router-dom';
import ProcurementTopNav from './ProcurementTopNav';
import '../../styles/ProcurementWorkspace.css';

export default function ProcurementWorkspace() {
  const location = useLocation();
  return (
    <div className="procurement-workspace">
      <ProcurementTopNav />
      <div key={location.pathname} className="procurement-workspace-content">
        <Outlet />
      </div>
    </div>
  );
}
