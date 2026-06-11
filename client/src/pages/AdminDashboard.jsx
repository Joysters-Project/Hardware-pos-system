import DashboardLayout from "../components/DashboardLayout";
import AnalyticalDashboard from "../components/AnalyticalDashboard";
import AlertStatCard from "../components/AlertStatCard";
import "../styles/Dashboard.css";

function AdminDashboard({ children, active }) {
  return (
    <DashboardLayout active={active || "home"}>
      {children ? (
        children
      ) : (
        <>
          <AlertStatCard />
          <AnalyticalDashboard />
        </>
      )}
    </DashboardLayout>
  );
}


export default AdminDashboard;