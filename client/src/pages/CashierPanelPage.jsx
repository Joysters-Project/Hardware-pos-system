import DashboardLayout from "../components/DashboardLayout";
import CashierWorkspace from "../components/cashier/CashierWorkspace";

export default function CashierPanelPage() {
  return (
    <DashboardLayout active="cashier-panel">
      <CashierWorkspace />
    </DashboardLayout>
  );
}
