import { Outlet } from 'react-router-dom';
import ProcurementTopNav from './ProcurementTopNav';
import DashboardLayout from '../DashboardLayout';
import '../../styles/ProcurementWorkspace.css';

export default function ProcurementWorkspace() {
  return (
    <DashboardLayout active="procurement">
      <div className="procurement-workspace">
        <ProcurementTopNav />
        <div className="procurement-workspace-content">
          <Outlet />
        </div>
      </div>
    </DashboardLayout>
  );
}
