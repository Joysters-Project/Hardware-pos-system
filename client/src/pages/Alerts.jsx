import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../api/axios";
import "../styles/Alerts.css";
import { useLocation } from "react-router-dom";
import AdminDashboard from "./AdminDashboard";
import ManagerDashboard from "./ManagerDashboard";

function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [search, setSearch] = useState("");
  const [alertType, setAlertType] = useState("");
  const [unresolvedOnly, setUnresolvedOnly] = useState(true);
  const [loading, setLoading] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const params = {
        unresolved: unresolvedOnly ? "true" : undefined,
        alert_type: alertType || undefined,
        search: search.trim() || undefined,
      };

      const response = await api.get("/alerts", { params });
      setAlerts(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast.error("Unable to load alerts. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [search, alertType, unresolvedOnly]);

  const resolveAlert = async (alertId) => {
    setResolvingId(alertId);
    try {
      await api.put(`/alerts/${alertId}/resolve`);
      toast.success("Alert resolved successfully.");
      loadAlerts();
    } catch (error) {
      toast.error(error.response?.data?.error || "Unable to resolve alert.");
    } finally {
      setResolvingId(null);
    }
  };

  const badgeClass = (resolved) =>
    resolved ? "alert-pill resolved" : "alert-pill unresolved";

  const typeLabel = (type) => {
    switch (type?.toLowerCase()) {
      case "out of stock":
        return "stock-alert";
      case "low stock":
        return "low-stock-alert";
      case "reorder needed":
        return "reorder-alert";
      case "near expiry":
        return "expiry-alert";
      default:
        return "neutral-alert";
    }
  };

  const formatDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="alerts-container">
      <div className="alerts-header">
        <div>
          <h1>Stock Alert Center</h1>
          <p className="alerts-subtitle">
            Monitor low-stock, reorder, and near-expiry product alerts in one place.
          </p>
        </div>
        <button className="alerts-refresh" onClick={loadAlerts}>
          Refresh
        </button>
      </div>

      <div className="alerts-controls">
        <div className="alerts-filter-group">
          <label htmlFor="alertType">Alert type</label>
          <select
            id="alertType"
            value={alertType}
            onChange={(e) => setAlertType(e.target.value)}
          >
            <option value="">All types</option>
            <option value="Out of Stock">Out of Stock</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Reorder Needed">Reorder Needed</option>
            <option value="Near Expiry">Near Expiry</option>
          </select>
        </div>

        <div className="alerts-filter-group">
          <label htmlFor="unresolvedOnly">Unresolved only</label>
          <button
            type="button"
            className={unresolvedOnly ? "toggle-button active" : "toggle-button"}
            onClick={() => setUnresolvedOnly((current) => !current)}
          >
            {unresolvedOnly ? "Yes" : "No"}
          </button>
        </div>

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
              <th>Type</th>
              <th>Stock</th>
              <th>Min Qty</th>
              <th>Reorder</th>
              <th>Batch</th>
              <th>Expiry</th>
              <th>Product Status</th>
              <th>Alert Status</th>
              <th>Action</th>
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
                const product = alert.product || alert.Product || {};
                return (
                  <tr key={alert.alert_id}>
                    <td>{alert.alert_id}</td>
                    <td>{product.product_name || "Unknown"}</td>
                    <td>
                      <span className={`alert-type-pill ${typeLabel(alert.alert_type)}`}>
                        {alert.alert_type}
                      </span>
                    </td>
                    <td>{product.stock_quantity ?? "-"}</td>
                    <td>{product.min_stock_quantity ?? "-"}</td>
                    <td>{product.reorder_level ?? "-"}</td>
                    <td>{product.batch_no || "-"}</td>
                    <td>{formatDate(product.expiry_date)}</td>
                    <td>
                      <span className={`product-status ${product.status || "unknown"}`}>
                        {product.status || "Unknown"}
                      </span>
                    </td>
                    <td>
                      <span className={badgeClass(alert.is_resolved)}>
                        {alert.is_resolved ? "Resolved" : "Unresolved"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="resolve-button"
                        type="button"
                        disabled={alert.is_resolved || resolvingId === alert.alert_id}
                        onClick={() => resolveAlert(alert.alert_id)}
                      >
                        {alert.is_resolved ? "Resolved" : "Resolve"}
                      </button>
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

export default function Alerts(){
const location = useLocation();
const isManagerRoute = location.pathname.startsWith("/manager/");
const role = (localStorage.getItem("role") || "admin").toLowerCase();
const DashboardLayout = isManagerRoute || role === "manager" ? ManagerDashboard : AdminDashboard;

return(
<DashboardLayout active="alerts">
<AlertsPage/>
</DashboardLayout>
);
}
