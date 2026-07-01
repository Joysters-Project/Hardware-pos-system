import { Link } from "react-router-dom";
import { ShoppingCart, Wallet, RefreshCw, Receipt, TrendingUp, ArrowRight } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";

const features = [
  {
    key: "billing",
    title: "Point of Sale",
    description: "Process sales, manage cart items, and complete transactions quickly.",
    path: "/billing",
    icon: ShoppingCart,
    accent: "#8b3a3a",
  },
  {
    key: "due-collection",
    title: "Due",
    description: "Collect pending payments from customers and track outstanding balances.",
    path: "/due-collection",
    icon: Wallet,
    accent: "#1f5f3b",
  },
  {
    key: "returns",
    title: "Returns",
    description: "Handle product returns and review return details for sales records.",
    path: "/returns",
    icon: RefreshCw,
    accent: "#b45b00",
  },
  {
    key: "receipts",
    title: "Receipts",
    description: "View and manage sales receipts for completed transactions.",
    path: "/receipts",
    icon: Receipt,
    accent: "#3b82f6",
  },
  {
    key: "reports",
    title: "Reports",
    description: "Review sales and business reports from one place.",
    path: "/reports",
    state: { initialTimeframe: "today" },
    icon: TrendingUp,
    accent: "#7c3aed",
  },
];

export default function CashierPanelPage() {
  return (
    <DashboardLayout active="cashier-panel">
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 20px 40px" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: "0 0 8px", fontSize: "28px", color: "#2f1a1a" }}>Cashier Panel</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "15px" }}>
            Access all cashier operations from one place.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Link
                key={feature.key}
                to={feature.path}
                state={feature.state}
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  background: "#fff",
                  border: "1px solid #efe2e2",
                  borderRadius: 16,
                  padding: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.04)",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: `${feature.accent}14`,
                    color: feature.accent,
                  }}
                >
                  <Icon size={20} />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#2f1a1a", marginBottom: 6 }}>
                    {feature.title}
                  </div>
                  <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.5 }}>
                    {feature.description}
                  </div>
                </div>
                <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 6, color: feature.accent, fontWeight: 600 }}>
                  Open <ArrowRight size={16} />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
