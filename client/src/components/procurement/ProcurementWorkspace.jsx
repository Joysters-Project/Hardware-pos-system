import { Outlet } from 'react-router-dom';
import ProcurementTopNav from './ProcurementTopNav';
import '../../styles/ProcurementWorkspace.css';

export default function ProcurementWorkspace() {
  return (
    <div className="procurement-workspace">
      <ProcurementTopNav />
      <div className="procurement-workspace-content">
        <Outlet />
      </div>
    </div>
  );
}
