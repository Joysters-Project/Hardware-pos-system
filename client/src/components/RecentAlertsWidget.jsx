import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

const THEME = "#8b3a3a";

export default function RecentAlertsWidget() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRecent();
  }, []);

  const fetchRecent = async () => {
    setLoading(true);
    try {
      const res = await api.get("/alerts?limit=5&unresolved=true");
      const data = Array.isArray(res.data) ? res.data : res.data?.alerts || [];
      setAlerts(data.slice(0, 5));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return "—";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const typeColor = (type) => {
    switch (type) {
      case "Out of Stock": return "#ef4444";
      case "Low Stock": return "#f97316";
      case "Reorder": return "#d97706";
      case "Near Expiry": return "#a855f7";
      case "Expired": return "#991b1b";
      default: return "#6b7280";
    }
  };

  return (
    <div style={{
      marginTop: 24,
      background: "#ffffff",
      borderRadius: 16,
      border: "1px solid #e5e7eb",
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      overflow: "hidden",
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "18px 20px",
        borderBottom: "1px solid #f3f4f6",
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#2c2c2c" }}>
            Recent Alerts
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#6b7280" }}>
            Latest 5 unresolved alerts
          </p>
        </div>
        <button
          onClick={() => navigate("/alerts")}
          style={{
            background: `rgba(139,58,58,0.07)`,
            color: THEME,
            border: `1px solid rgba(139,58,58,0.18)`,
            borderRadius: 10,
            padding: "7px 14px",
            fontSize: "0.8rem",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          View All
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 24, textAlign: "center", color: "#9ca3af" }}>Loading…</div>
      ) : alerts.length === 0 ? (
        <div style={{ padding: 24, textAlign: "center", color: "#6b7280" }}>No recent alerts</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {alerts.map((a, idx) => {
            const product = a.product || {};
            const c = typeColor(a.alert_type);
            return (
              <div
                key={a.alert_id}
                onClick={() => navigate(`/alerts?type=${a.alert_type.toLowerCase().replace(/\s+/g, "-")}`)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "12px 20px",
                  cursor: "pointer",
                  borderBottom: idx < alerts.length - 1 ? "1px solid #f3f4f6" : "none",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#fff6f4"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: "50%", background: c, flexShrink: 0,
                  }} />
                  <div>
                    <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#2c2c2c" }}>
                      {product.product_name || "Unknown Product"}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: 2 }}>
                      {a.alert_type}
                    </div>
                  </div>
                </div>
                <span style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "#9ca3af",
                  whiteSpace: "nowrap",
                }}>
                  {timeAgo(a.created_at || a.resolved_date)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
