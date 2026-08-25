import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

const THEME = "#8b3a3a";

const TYPE_CONFIG = {
  "Out of Stock": { color: "#ef4444", dot: "🔴", sub: "Stock is completely depleted" },
  "Low Stock":    { color: "#f97316", dot: "🟠", sub: "Current stock is below minimum level" },
  "Reorder":      { color: "#d97706", dot: "🟠", sub: "Reorder level reached" },
  "Near Expiry":  { color: "#a855f7", dot: "🟣", sub: (a) => a.product?.expiry_date ? `Expires on ${new Date(a.product.expiry_date).toLocaleDateString("en-GB")}` : "Expiring soon" },
  "Expired":      { color: "#991b1b", dot: "🔴", sub: (a) => a.product?.expiry_date ? `Expired on ${new Date(a.product.expiry_date).toLocaleDateString("en-GB")}` : "Product has expired" },
};

// Priority order for sorting
const PRIORITY = ["Out of Stock", "Expired", "Low Stock", "Near Expiry", "Reorder"];

export default function ActionRequiredWidget() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { fetchRecent(); }, []);

  const fetchRecent = async () => {
    setLoading(true);
    try {
      const res = await api.get("/alerts?limit=20&unresolved=true");
      const data = Array.isArray(res.data) ? res.data : res.data?.alerts || [];
      // Sort by priority, take top 4
      const sorted = [...data].sort((a, b) =>
        (PRIORITY.indexOf(a.alert_type) === -1 ? 99 : PRIORITY.indexOf(a.alert_type)) -
        (PRIORITY.indexOf(b.alert_type) === -1 ? 99 : PRIORITY.indexOf(b.alert_type))
      );
      setAlerts(sorted.slice(0, 4));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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
            Action Required
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "#6b7280" }}>
            Important alerts needing immediate attention
          </p>
        </div>
        <button
          onClick={() => navigate("/alerts")}
          style={{
            background: "rgba(139,58,58,0.07)", color: THEME,
            border: "1px solid rgba(139,58,58,0.18)", borderRadius: 10,
            padding: "7px 14px", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          View All Alerts →
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 24, textAlign: "center", color: "#9ca3af", fontSize: "0.85rem" }}>Loading…</div>
      ) : alerts.length === 0 ? (
        <div style={{ padding: 24, textAlign: "center", color: "#6b7280", fontSize: "0.85rem" }}>
          No active alerts — all clear!
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {alerts.map((a, idx) => {
            const product = a.product || {};
            const cfg = TYPE_CONFIG[a.alert_type] || { color: "#6b7280", dot: "⚪", sub: "" };
            const subText = typeof cfg.sub === "function" ? cfg.sub(a) : cfg.sub;
            const typeKey = a.alert_type.toLowerCase().replace(/\s+/g, "-");
            return (
              <div
                key={a.alert_id}
                onClick={() => navigate(`/alerts?type=${typeKey}`)}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 12,
                  padding: "12px 20px", cursor: "pointer",
                  borderBottom: idx < alerts.length - 1 ? "1px solid #f3f4f6" : "none",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#fff6f4"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <span style={{ fontSize: "1rem", lineHeight: 1.5, flexShrink: 0 }}>{cfg.dot}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#2c2c2c" }}>
                      {product.product_name || "Unknown Product"}
                    </span>
                    <span style={{
                      padding: "2px 8px", borderRadius: 999,
                      fontSize: "0.72rem", fontWeight: 700,
                      background: `${cfg.color}14`, color: cfg.color,
                    }}>
                      {a.alert_type}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#6b7280", marginTop: 2 }}>
                    {a.batch_number ? `Batch ${a.batch_number} • ` : ""}{subText}
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
