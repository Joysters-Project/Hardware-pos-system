import { useNavigate } from "react-router-dom";
import { useCustomerDueAlerts } from "../services/procurementApi";

const STAT_CONFIG = [
  { key: "dueToday", label: "Due Today", type: "due-today", color: "#c62828", bg: "rgba(198,40,40,0.08)" },
  { key: "overdue", label: "Overdue", type: "overdue", color: "#991b1b", bg: "rgba(153,27,27,0.08)" },
  { key: "dueSoon", label: "Due Soon", type: "due-soon", color: "#d97706", bg: "rgba(217,119,6,0.08)" },
];

const PRIORITY_ORDER = ["Overdue", "Due Today", "Due Soon"];

export default function CustomerDueAlertsWidget() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useCustomerDueAlerts();
  const summary = data?.summary || {};
  const alerts = data?.alerts || [];
  const topAlerts = [...alerts]
    .sort((a, b) => PRIORITY_ORDER.indexOf(a.alert_type) - PRIORITY_ORDER.indexOf(b.alert_type))
    .slice(0, 3);

  const formatDate = (date) => date ? new Date(date).toLocaleDateString("en-GB") : "—";
  const formatAmount = (amount) =>
    `LKR ${Number(amount || 0).toLocaleString("en-LK", { minimumFractionDigits: 2 })}`;
  const alertColor = (type) => STAT_CONFIG.find((stat) => stat.label === type)?.color || "#6b7280";

  const daysLabel = (alert) => {
    if (alert.days_remaining === null || alert.days_remaining === undefined) return alert.alert_type;
    if (alert.days_remaining < 0) {
      const days = Math.abs(alert.days_remaining);
      return `${days} day${days !== 1 ? "s" : ""} overdue`;
    }
    if (alert.days_remaining === 0) return "Due today";
    return `${alert.days_remaining} day${alert.days_remaining !== 1 ? "s" : ""} left`;
  };

  return (
    <div style={{
      background: "#fff",
      borderRadius: 16,
      border: "1px solid #e5e7eb",
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      overflow: "hidden",
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "18px 20px", borderBottom: "1px solid #f3f4f6",
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#2c2c2c" }}>
            Customer Due Alerts
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "#6b7280" }}>
            Customer invoices needing your attention
          </p>
        </div>
        <button
          onClick={() => navigate("/alerts?tab=customer-due")}
          style={{
            background: "rgba(139,58,58,0.07)", color: "#8b3a3a",
            border: "1px solid rgba(139,58,58,0.18)", borderRadius: 10,
            padding: "7px 14px", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          View All Customer Due →
        </button>
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
        borderBottom: "1px solid #f3f4f6",
      }}>
        {STAT_CONFIG.map(({ key, label, type, color, bg }, index) => {
          const count = summary[key] || 0;
          return (
            <button
              key={key}
              onClick={() => navigate(`/alerts?tab=customer-due&type=${type}`)}
              style={{
                background: count > 0 ? bg : "#fafafa",
                border: "none",
                borderRight: index < STAT_CONFIG.length - 1 ? "1px solid #f3f4f6" : "none",
                padding: "14px 8px",
                cursor: "pointer",
                textAlign: "center",
              }}
            >
              <div style={{
                fontSize: "1.6rem", fontWeight: 800, lineHeight: 1,
                color: count > 0 ? color : "#d1d5db",
              }}>
                {isLoading || isError ? "—" : count}
              </div>
              <div style={{
                fontSize: "0.72rem", fontWeight: 700, marginTop: 4,
                color: count > 0 ? color : "#9ca3af",
                textTransform: "uppercase", letterSpacing: "0.4px",
              }}>
                {label}
              </div>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div style={{ padding: 20, textAlign: "center", color: "#9ca3af", fontSize: "0.85rem" }}>
          Loading…
        </div>
      ) : isError ? (
        <div style={{ padding: 20, textAlign: "center", color: "#b91c1c", fontSize: "0.85rem" }}>
          Unable to load customer due alerts
        </div>
      ) : topAlerts.length === 0 ? (
        <div style={{ padding: 20, textAlign: "center", color: "#6b7280", fontSize: "0.85rem" }}>
          No active customer due alerts
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {topAlerts.map((alert, index) => {
            const color = alertColor(alert.alert_type);
            return (
              <div
                key={alert.bill_id}
                onClick={() => navigate(`/alerts?tab=customer-due&type=${alert.alert_type === "Due Today" ? "due-today" : alert.alert_type === "Due Soon" ? "due-soon" : "overdue"}`)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  gap: 12, padding: "11px 20px", cursor: "pointer",
                  borderBottom: index < topAlerts.length - 1 ? "1px solid #f3f4f6" : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: color, flexShrink: 0,
                  }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontSize: "0.88rem", fontWeight: 700, color: "#2c2c2c",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {alert.customer_name || "—"}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: 1 }}>
                      {alert.invoice_number || "—"} • {formatAmount(alert.due_amount)}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "#9ca3af", marginTop: 1 }}>
                      Expected: {formatDate(alert.expected_payment_date)}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <span style={{
                    display: "inline-block",
                    padding: "3px 10px", borderRadius: 999,
                    fontSize: "0.72rem", fontWeight: 700,
                    background: `${color}14`, color,
                    whiteSpace: "nowrap",
                  }}>
                    {daysLabel(alert)}
                  </span>
                  <div style={{ fontSize: "0.68rem", color, marginTop: 3 }}>
                    {alert.alert_type}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
