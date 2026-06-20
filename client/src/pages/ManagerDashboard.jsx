import React from "react";
import DashboardLayout from "../components/DashboardLayout";
import AnalyticalDashboard from "../components/AnalyticalDashboard";

function ManagerDashboard({ children, active }) {
  return (
    <DashboardLayout active={active || "home"}>
      {children ? (
        children
      ) : (
        <>
          

          {/* ✅ ADD THIS */}
          <div style={{ marginTop: "20px" }}>
            <AlertStatCard />
            <AnalyticalDashboard />
          </div>
        </>
      )}
    </DashboardLayout>
  );
}

export default ManagerDashboard;