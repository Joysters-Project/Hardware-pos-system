import { useAuth } from "../context/AuthContext";
import DashboardLayout from "../components/DashboardLayout";
import AnalyticalDashboard from "../components/AnalyticalDashboard";
import "../styles/Dashboard.css";

function ManagerDashboard({ children, active }) {
  return (
    <DashboardLayout active={active || "home"}>
      {children ? children : <AnalyticalDashboard />}
    </DashboardLayout>
  );
}

export default ManagerDashboard;
