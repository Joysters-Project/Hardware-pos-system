import React from "react";
import DashboardLayout from "../components/DashboardLayout";
import AnalyticalDashboard from "../components/AnalyticalDashboard";

function ManagerDashboard({ children, active }) {
  return (
    <DashboardLayout active={active || "home"}>
      {children ? children : <AnalyticalDashboard />}
    </DashboardLayout>
  );
}

export default ManagerDashboard;
