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
          <AnalyticalDashboard />

          {/* ✅ ADD ALERT CARD HERE */}
          <div style={{ marginTop: "20px" }}>
            <AlertStatCard />
          </div>
        </>
      )}
    </DashboardLayout>
  );
}

export default AdminDashboard;