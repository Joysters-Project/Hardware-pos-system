import { useNavigate } from "react-router-dom";
import { useChequeAlerts } from "../services/procurementApi";

const THEME = "#8b3a3a";

const PRIORITY_ORDER = ["Overdue", "Due Today", "Due Soon", "Bounced"];

const STAT_CONFIG = [
  { key: "dueSoon",  label: "Due Soon",  alertType: "Due Soon",  color: "#d97706", bg: "rgba(217,119,6,0.08)",   border: "rgba(217,119,6,0.18)",   tabKey: "due-soon"  },
  { key: "dueToday", label: "Due Today", alertType: "Due Today", color: "#c62828", bg: "rgba(198,40,40,0.08)",   border: "rgba(198,40,40,0.18)",   tabKey: "due-today" },
  { key: "overdue",  label: "Overdue",   alertType: "Overdue",   color: "#991b1b", bg: "rgba(153,27,27,0.08)",   border: "rgba(153,27,27,0.18)",   tabKey: "overdue"   },
  { key: "bounced",  label: "Bounced",   alertType: "Bounced",   color: "#7c3aed", bg: "rgba(124,58,237,0.08)",  border: "rgba(124,58,237,0.18)",  tabKey: "bounced"   },
];

export default function PaymentAlertsWidget() {
  const navigate = useNavigate();
  const { data, isLoading } = useChequeAlerts();
  const summary = data?.summary || {};
  const allAlerts = data?.alerts || [];

  // Top 3 by priority
  const topAlerts = [...allAlerts]
    .sort((a, b) => PRIORITY_ORDER.indexOf(a.alert_type) - PRIORITY_ORDER.indexOf(b.alert_type))
    .slice(0, 3);

  const fmtD = (d) => d ? new Date(d).toLocaleDateString("en-GB") : "—";
  const fmt  = (n) => `LKR ${Number(n || 0).toLocaleString("en-LK", { minimumFractionDigits: 2 })}`;

  const daysLabel = (a) => {
    if (a.days_remaining === null) return null;
    if (a.days_remaining < 0)  return `${Math.abs(a.days_remaining)} day${Math.abs(a.days_remaining) !== 1 ? "s" : ""} overdue`;
    if (a.days_remaining === 0) return "Due today";
    return `${a.days_remaining} day${a.days_remaining !== 1 ? "s" : ""} left`;
  };

  const alertColor = (type) => STAT_CONFIG.find(s => s.alertType === type)?.color || "#6b7280";

  return (
    <div style={{
      background: "#fff",
      borderRadius: 16,
      border: "1px solid #e5e7eb",
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "18px 20px", borderBottom: "1px solid #f3f4f6",
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#2c2c2c" }}>
            Payment Alerts
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "#6b7280" }}>
            Supplier payments needing your attention
          </p>
        </div>
        <button
          onClick={() => navigate("/alerts?tab=payment")}
          style={{
            background: "rgba(139,58,58,0.07)", color: THEME,
            border: "1px solid rgba(139,58,58,0.18)", borderRadius: 10,
            padding: "7px 14px", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          View All Payment Alerts →
        </button>
      </div>

      {/* Summary stats */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
        gap: 0, borderBottom: "1px solid #f3f4f6",
      }}>
        {STAT_CONFIG.map(({ key, label, color, bg, border, tabKey }, i) => {
          const count = summary[key] || 0;
          return (
            <button
              key={key}
              onClick={() => navigate(`/alerts?tab=payment&type=${tabKey}`)}
              style={{
                background: count > 0 ? bg : "#fafafa",
                border: "none",
                borderRight: i < 3 ? "1px solid #f3f4f6" : "none",
                padding: "14px 10px",
                cursor: "pointer",
                textAlign: "center",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => { if (count > 0) e.currentTarget.style.background = bg; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = count > 0 ? bg : "#fafafa"; }}
            >
              <div style={{
                fontSize: "1.6rem", fontWeight: 800, lineHeight: 1,
                color: count > 0 ? color : "#d1d5db",
              }}>
                {isLoading ? "—" : count}
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

      {/* Top cheque alerts */}
      {isLoading ? (
        <div style={{ padding: 20, textAlign: "center", color: "#9ca3af", fontSize: "0.85rem" }}>Loading…</div>
      ) : topAlerts.length === 0 ? (
        <div style={{ padding: 20, textAlign: "center", color: "#6b7280", fontSize: "0.85rem" }}>
          No active payment alerts
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {topAlerts.map((a, idx) => {
            const color = alertColor(a.alert_type);
            const days  = daysLabel(a);
            return (
              <div
                key={a.payment_id}
                onClick={() => navigate("/alerts?tab=payment")}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  gap: 12, padding: "11px 20px", cursor: "pointer",
                  borderBottom: idx < topAlerts.length - 1 ? "1px solid #f3f4f6" : "none",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#fff6f4"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: color, flexShrink: 0,
                  }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#2c2c2c", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {a.supplier_name || "—"}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: 1 }}>
                      {a.cheque_number || "—"} • {fmt(a.amount)}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "#9ca3af", marginTop: 1 }}>
                      Clearing: {fmtD(a.clearing_date)}
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
                    {days || a.alert_type}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
