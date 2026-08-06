import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/axios";
import AdminDashboard from "./AdminDashboard";
import ManagerDashboard from "./ManagerDashboard";
import { useLocation } from "react-router-dom";
import "../styles/Alerts.css";
import DetailModal from "../components/DetailModal";
import ProductDetailContent from "../components/ProductDetailContent";
import PODetailContent from "../components/PODetailContent";

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

const CASHIER_ALLOWED_FILTERS = ["", "out-of-stock", "low-stock", "reorder", "near-expiry", "expired"];

const CASHIER_INVENTORY_TYPES = ["Out of Stock", "Low Stock", "Reorder", "Near Expiry", "Expired"];

const ALERT_TYPE_MAP = {
  "out-of-stock": "Out of Stock",
  "low-stock": "Low Stock",
  "reorder": "Reorder",
  "near-expiry": "Near Expiry",
  "expired": "Expired",
  "purchase-ordered": "Purchase Ordered",
};

function DisposeModal({ target, onClose, onConfirm, disposing }) {
  const available = target?.product?.stock_quantity ?? 0;
  const [qty, setQty] = useState(available);

  // Reset qty whenever the target changes
  useEffect(() => { setQty(available); }, [available]);

  if (!target) return null;

  const { product } = target;
  const invalid = qty < 1 || qty > available;

  return (
    <div className="dispose-overlay" onClick={onClose}>
      <div className="dispose-modal" onClick={e => e.stopPropagation()}>
        <div className="dispose-modal-header">
          <span>🗑 Dispose Expired Stock</span>
          <button className="dispose-close" onClick={onClose} disabled={disposing}>✕</button>
        </div>
        <div className="dispose-modal-body">
          <div className="dispose-row">
            <span className="dispose-label">Product</span>
            <span className="dispose-value">{product.product_name || "—"}</span>
          </div>
          {product.batch_no && (
            <div className="dispose-row">
              <span className="dispose-label">Batch No.</span>
              <span className="dispose-value">{product.batch_no}</span>
            </div>
          )}
          <div className="dispose-row">
            <span className="dispose-label">Available Qty</span>
            <span className="dispose-value" style={{ color: "#991b1b", fontWeight: 800 }}>{available}</span>
          </div>
          <div className="dispose-row dispose-row--input">
            <label className="dispose-label" htmlFor="dispose-qty">Dispose Qty</label>
            <input
              id="dispose-qty"
              type="number"
              min={1}
              max={available}
              value={qty}
              onChange={e => setQty(Math.min(available, Math.max(1, parseInt(e.target.value) || 1)))}
              className="dispose-qty-input"
              disabled={disposing}
            />
          </div>
          {invalid && (
            <p className="dispose-error">Quantity must be between 1 and {available}.</p>
          )}
        </div>
        <div className="dispose-modal-footer">
          <button className="dispose-btn-cancel" onClick={onClose} disabled={disposing}>Cancel</button>
          <button
            className="dispose-btn-confirm"
            onClick={() => onConfirm(qty)}
            disabled={invalid || disposing}
          >
            {disposing ? "Disposing…" : "Confirm Dispose"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AlertCenterPage() {
  const isCashier = (localStorage.getItem("role") || "").toLowerCase() === "cashier";
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [disposeTarget, setDisposeTarget] = useState(null);
  const [disposing, setDisposing] = useState(false);
  const [viewProductId, setViewProductId] = useState(null);
  const [viewPoId, setViewPoId] = useState(null);

  const activeFilter = searchParams.get("type") || "";

  useEffect(() => {
    fetchSummary();
    if (searchParams.get("poCreated") === "1") {
      toast.success("Purchase Order created successfully.");
      searchParams.delete("poCreated");
      setSearchParams(searchParams, { replace: true });
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [activeFilter, search]);

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible") { fetchAlerts(); fetchSummary(); } };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
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
      let data = Array.isArray(res.data) ? res.data : res.data?.alerts || [];
      if (isCashier) data = data.filter(a => a.status !== "Purchase Ordered");
      setAlerts(data);
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

  const handleDispose = async (qty) => {
    if (!disposeTarget) return;
    const { product } = disposeTarget;
    const newStock = (product.stock_quantity ?? 0) - qty;
    setDisposing(true);
    try {
      await api.put(`/products/${product.product_id}`, { stock_quantity: newStock });
      toast.success(`Disposed ${qty} unit${qty !== 1 ? "s" : ""} of ${product.product_name}.`);
      setDisposeTarget(null);
      await Promise.all([fetchAlerts(), fetchSummary()]);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to dispose stock.");
    } finally {
      setDisposing(false);
    }
  };

  const daysRemaining = (expiryDate) => {
    if (!expiryDate) return "—";
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate); expiry.setHours(0, 0, 0, 0);
    const diff = Math.round((expiry - today) / (1000 * 60 * 60 * 24));
    if (diff > 0)  return `${diff}d`;
    if (diff === 0) return "Today";
    return `${Math.abs(diff)}d overdue`;
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
    const inventoryTotal = isCashier
      ? CASHIER_INVENTORY_TYPES.reduce((sum, t) => sum + (summary[t] || 0), 0)
      : (summary.total || 0);
    return {
      "": inventoryTotal,
      "out-of-stock": summary["Out of Stock"] || 0,
      "low-stock": summary["Low Stock"] || 0,
      "reorder": summary["Reorder"] || 0,
      "near-expiry": summary["Near Expiry"] || 0,
      "expired": summary["Expired"] || 0,
      "purchase-ordered": summary["Purchase Ordered"] || 0,
    };
  }, [summary, isCashier]);

  return (
    <div className="alerts-container">
      <DisposeModal
        target={disposeTarget}
        onClose={() => !disposing && setDisposeTarget(null)}
        onConfirm={handleDispose}
        disposing={disposing}
      />
      {viewProductId && (
        <DetailModal title="Product Details" onClose={() => setViewProductId(null)}>
          <ProductDetailContent productId={viewProductId} />
        </DetailModal>
      )}
      {viewPoId && (
        <DetailModal title="Purchase Order Details" onClose={() => setViewPoId(null)}>
          <PODetailContent poId={viewPoId} />
        </DetailModal>
      )}
      <div className="alerts-header">
        <div>
          <h1>Stock Alert Center</h1>
          <p className="alerts-subtitle">
            Monitor and manage inventory alerts in one place.
          </p>
        </div>
      </div>

      <div className="alert-chips">
        {(isCashier ? ALERT_FILTERS.filter(f => CASHIER_ALLOWED_FILTERS.includes(f.key)) : ALERT_FILTERS).map((f) => {
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
              {!isCashier && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="loading-row">
                <td colSpan={isCashier ? 10 : 11}>Loading alerts...</td>
              </tr>
            ) : alerts.length === 0 ? (
              <tr className="empty-row">
                <td colSpan={isCashier ? 10 : 11}>No alerts found.</td>
              </tr>
            ) : (
              alerts.map((alert) => {
                const product = alert.product || {};
                const type = alert.alert_type;
                const color = statusColor(type);
                return (
                  <tr key={alert.alert_id}>
                    <td>{alert.alert_id}</td>
                    <td>
                      <button
                        onClick={() => setViewProductId(product.product_id)}
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
                    <td>{alert.batch_number || "-"}</td>
                    <td>{product.expiry_date ? new Date(product.expiry_date).toLocaleDateString() : "-"}</td>
                    <td>
                      <span style={{
                        fontWeight: 700,
                        color: (() => {
                          if (!product.expiry_date) return "#6b7280";
                          const today = new Date(); today.setHours(0, 0, 0, 0);
                          const expiry = new Date(product.expiry_date); expiry.setHours(0, 0, 0, 0);
                          const diff = Math.round((expiry - today) / 86400000);
                          if (diff < 0)  return "#991b1b";
                          if (diff === 0) return "#991b1b";
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
                    {!isCashier && (
                    <td>
                      {(() => {
                        const status   = alert.status || "Active";
                        const poId     = alert.purchase_order_id;
                        const returnTo = encodeURIComponent(`/alerts${activeFilter ? `?type=${activeFilter}&` : "?"}poCreated=1`);
                        const viewProduct = () => setViewProductId(product.product_id);
                        const viewBatch   = () => setViewProductId(product.product_id);
                        const viewPO      = () => setViewPoId(poId);
                        const createPO    = () => navigate(`/procurement/orders/create?productId=${product.product_id}&returnTo=${returnTo}`);

                        if (status === "Purchase Ordered") {
                          return (
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              <button className="action-btn action-btn--view" onClick={viewPO}>
                                👁 View Purchase Order
                              </button>
                            </div>
                          );
                        }

                        if (type === "Expired") {
                          return (
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              <button className="action-btn action-btn--dispose" onClick={() => setDisposeTarget(alert)}>
                                🗑 Dispose Stock
                              </button>
                              <button className="action-btn action-btn--review" onClick={viewBatch}>
                                📦 View Batch
                              </button>
                            </div>
                          );
                        }

                        if (type === "Near Expiry") {
                          return (
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              <button className="action-btn action-btn--review" onClick={viewBatch}>
                                📦 View Batch
                              </button>
                            </div>
                          );
                        }

                        return (
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <button className="action-btn action-btn--po" onClick={createPO}>
                              🛒 Create Purchase Order
                            </button>
                            <button className="action-btn action-btn--view" onClick={viewProduct}>
                              👁 View Product
                            </button>
                          </div>
                        );
                      })()}
                    </td>
                    )}
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
