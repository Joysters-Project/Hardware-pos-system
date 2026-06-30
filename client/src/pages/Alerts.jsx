import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/axios";
import AdminDashboard from "./AdminDashboard";
import ManagerDashboard from "./ManagerDashboard";
import { useLocation } from "react-router-dom";
import "../styles/Alerts.css";

const THEME = "#8b3a3a";

const ALERT_FILTERS = [
  { key: "", label: "All Alerts" },
  { key: "out-of-stock", label: "Out Of Stock" },
  { key: "low-stock", label: "Low Stock" },
  { key: "reorder", label: "Reorder" },
  { key: "near-expiry", label: "Near Expiry" },
  { key: "expired", label: "Expired" },
  { key: "purchase-ordered", label: "Purchase Ordered" },
];

const ALERT_TYPE_MAP = {
  "out-of-stock": "Out of Stock",
  "low-stock": "Low Stock",
  "reorder": "Reorder",
  "near-expiry": "Near Expiry",
  "expired": "Expired",
  "purchase-ordered": "Purchase Ordered",
};

function AlertCenterPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);
  const [search, setSearch] = useState("");

  const activeFilter = searchParams.get("type") || "";

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [activeFilter, search]);

  const fetchSummary = async () => {
    try {
      const res = await api.get("/alerts/summary");
      setSummary(res.data || {});
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const params = { unresolved: "true" };
      if (activeFilter) {
        if (activeFilter === "purchase-ordered") {
          params.status = "Purchase Ordered";
        } else {
          const alertType = ALERT_TYPE_MAP[activeFilter] || activeFilter;
          params.alert_type = alertType;
        }
      }
      if (search.trim()) params.search = search.trim();

      const res = await api.get("/alerts", { params });
      setAlerts(Array.isArray(res.data) ? res.data : res.data?.alerts || []);
    } catch (err) {
      toast.error("Unable to load alerts.");
    } finally {
      setLoading(false);
    }
  };

  const setFilter = (key) => {
    if (key) {
      searchParams.set("type", key);
    } else {
      searchParams.delete("type");
    }
    setSearchParams(searchParams);
  };

  const resolveAlert = async (alertId) => {
    setResolvingId(alertId);
    try {
      await api.put(`/alerts/${alertId}/resolve`);
      toast.success("Alert resolved successfully.");
      fetchAlerts();
      fetchSummary();
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to resolve alert.");
    } finally {
      setResolvingId(null);
    }
  };

  const daysRemaining = (expiryDate) => {
    if (!expiryDate) return "—";
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    const diff = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    if (diff < 0) return `${Math.abs(diff)}d overdue`;
    return `${diff}d`;
  };

  const statusColor = (type) => {
    switch (type) {
      case "Out of Stock": return "#ef4444";
      case "Low Stock": return "#f97316";
      case "Reorder": return "#d97706";
      case "Near Expiry": return "#a855f7";
      case "Expired": return "#991b1b";
      default: return "#6b7280";
    }
  };

  const counts = useMemo(() => {
    if (!summary) return {};
    return {
      "": summary.total || 0,
      "out-of-stock": summary["Out of Stock"] || 0,
      "low-stock": summary["Low Stock"] || 0,
      "reorder": summary["Reorder"] || 0,
      "near-expiry": summary["Near Expiry"] || 0,
      "expired": summary["Expired"] || 0,
      "purchase-ordered": summary["Purchase Ordered"] || 0,
    };
  }, [summary]);

  return (
    <div className="alerts-container">
      <div className="alerts-header">
        <div>
          <h1>Stock Alert Center</h1>
          <p className="alerts-subtitle">
            Monitor and manage inventory alerts in one place.
          </p>
        </div>
      </div>

      <div className="alert-chips">
        {ALERT_FILTERS.map((f) => {
          const isActive = activeFilter === f.key;
          const count = counts[f.key] || 0;
          let chipColor = THEME;
          if (f.key === "out-of-stock") chipColor = "#ef4444";
          else if (f.key === "low-stock") chipColor = "#f97316";
          else if (f.key === "reorder") chipColor = "#d97706";
          else if (f.key === "near-expiry") chipColor = "#a855f7";
          else if (f.key === "expired") chipColor = "#991b1b";
          else if (f.key === "purchase-ordered") chipColor = "#3b82f6";

          return (
            <button
              key={f.key || "all"}
              onClick={() => setFilter(f.key)}
              className={`alert-chip ${isActive ? "alert-chip--active" : ""}`}
              style={
                isActive
                  ? {
                      background: chipColor,
                      color: "#fff",
                      border: `1.5px solid ${chipColor}`,
                      boxShadow: `0 4px 12px ${chipColor}40`,
                    }
                  : {
                      background: "#fff",
                      color: "#4b5563",
                      border: "1.5px solid #e5e7eb",
                    }
              }
            >
              <span style={{ fontWeight: 700 }}>{f.label}</span>
              <span
                className="alert-chip-count"
                style={
                  isActive
                    ? { background: "rgba(255,255,255,0.2)", color: "#fff" }
                    : { background: `${chipColor}14`, color: chipColor }
                }
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="alerts-controls">
        <input
          type="search"
          className="alerts-search"
          placeholder="Search by product, batch or alert type"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="alerts-table-wrap">
        <table className="alerts-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Product</th>
              <th>Alert Type</th>
              <th>Current Stock</th>
              <th>Min Stock</th>
              <th>Reorder Level</th>
              <th>Batch</th>
              <th>Expiry Date</th>
              <th>Days Remaining</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="loading-row">
                <td colSpan="11">Loading alerts...</td>
              </tr>
            ) : alerts.length === 0 ? (
              <tr className="empty-row">
                <td colSpan="11">No alerts found.</td>
              </tr>
            ) : (
              alerts.map((alert) => {
                const product = alert.product || {};
                const type = alert.alert_type;
                const color = statusColor(type);
                const needsPO = ["Out of Stock", "Low Stock", "Reorder"].includes(type);

                return (
                  <tr key={alert.alert_id}>
                    <td>{alert.alert_id}</td>
                    <td>
                      <button
                        onClick={() => navigate(`/products/edit/${product.product_id}`)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: THEME,
                          fontWeight: 700,
                          cursor: "pointer",
                          padding: 0,
                          textDecoration: "underline",
                        }}
                      >
                        {product.product_name || "Unknown"}
                      </button>
                    </td>
                    <td>
                      <span className="alert-type-pill" style={{ background: color }}>
                        {type}
                      </span>
                    </td>
                    <td>{product.stock_quantity ?? "-"}</td>
                    <td>{product.min_stock_quantity ?? "-"}</td>
                    <td>{product.reorder_level ?? "-"}</td>
                    <td>{product.batch_no || "-"}</td>
                    <td>{product.expiry_date ? new Date(product.expiry_date).toLocaleDateString() : "-"}</td>
                    <td>
                      <span style={{
                        fontWeight: 700,
                        color: (() => {
                          if (!product.expiry_date) return "#6b7280";
                          const today = new Date(); today.setHours(0,0,0,0);
                          const diff = Math.ceil((new Date(product.expiry_date) - today) / 86400000);
                          if (diff < 0) return "#991b1b";
                          if (diff <= 30) return "#a855f7";
                          return "#374151";
                        })(),
                      }}>
                        {daysRemaining(product.expiry_date)}
                      </span>
                    </td>
                    <td>
                      <span className="product-status" style={{
                        background: alert.status === 'Purchase Ordered' ? 'rgba(59,130,246,0.12)' : 'rgba(239,68,68,0.12)',
                        color: alert.status === 'Purchase Ordered' ? '#3b82f6' : '#ef4444',
                        border: `1px solid ${alert.status === 'Purchase Ordered' ? 'rgba(59,130,246,0.35)' : 'rgba(239,68,68,0.35)'}`,
                      }}>
                        {alert.status || 'Active'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {needsPO ? (
                          <button
                            className="action-btn action-btn--po"
                            onClick={() => navigate(`/procurement/orders/create?productId=${product.product_id}`)}
                          >
                            Create Purchase Order
                          </button>
                        ) : (
                          <button
                            className="action-btn action-btn--view"
                            onClick={() => navigate(`/products/edit/${product.product_id}`)}
                          >
                            View
                          </button>
                        )}
                        <button
                          className="action-btn action-btn--resolve"
                          disabled={resolvingId === alert.alert_id || alert.is_resolved}
                          onClick={() => resolveAlert(alert.alert_id)}
                        >
                          {alert.is_resolved ? "Resolved" : resolvingId === alert.alert_id ? "Resolving…" : "Resolve"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Alerts() {
  const location = useLocation();
  const isManagerRoute = location.pathname.startsWith("/manager/");
  const role = (localStorage.getItem("role") || "admin").toLowerCase();
  const DashboardLayout = isManagerRoute || role === "manager" ? ManagerDashboard : AdminDashboard;

  return (
    <DashboardLayout active="alerts">
      <AlertCenterPage />
    </DashboardLayout>
  );
}
