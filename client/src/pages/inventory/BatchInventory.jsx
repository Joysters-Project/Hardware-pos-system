import { useEffect, useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { RefreshCw, Trash2, Eye } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api/axios";
import AdminDashboard from "../AdminDashboard";
import ManagerDashboard from "../ManagerDashboard";
import "../../styles/Products.css";

const fmt = (d) => d ? new Date(d).toLocaleDateString("en-GB") : "—";

const STATUS_STYLE = {
  Active:      { background: "#e5f7eb", color: "#1d7e42" },
  "Low Stock": { background: "#fff3e0", color: "#e65100" },
  Expired:     { background: "#fdecea", color: "#c62828" },
  Disposed:    { background: "#f0f0f0", color: "#888" },
};

function BatchInventoryPage() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [viewBatch, setViewBatch] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/batch-inventory");
      setBatches(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Failed to load batch inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return batches.filter((b) =>
      !q ||
      String(b.batch_number).toLowerCase().includes(q) ||
      String(b.product?.product_name || "").toLowerCase().includes(q) ||
      String(b.purchase_order?.po_number || "").toLowerCase().includes(q) ||
      String(b.supplier?.supplier_name || "").toLowerCase().includes(q) ||
      String(b.status).toLowerCase().includes(q)
    );
  }, [batches, search]);

  const handleDispose = async (batch) => {
    if (!window.confirm(`Dispose batch ${batch.batch_number}? This cannot be undone.`)) return;
    try {
      await api.post(`/batch-inventory/${batch.batch_id}/dispose`);
      toast.success("Batch disposed successfully");
      load();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to dispose batch");
    }
  };

  return (
    <div className="products-container">
      <div className="products-header">
        <h1>Batch Inventory</h1>
        <div className="header-actions">
          <button className="refresh-btn" onClick={load} disabled={loading}>
            <RefreshCw size={15} />
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="search-bar-wrap">
        <input
          className="search"
          placeholder="Search by batch number, product, PO, supplier, or status..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="table-wrap">
        <table className="products-table">
          <thead>
            <tr>
              <th>Batch Number</th>
              <th>Product</th>
              <th>Purchase Order</th>
              <th>Supplier</th>
              <th>Purchase Price</th>
              <th>Received Qty</th>
              <th>Remaining Qty</th>
              <th>Received Date</th>
              <th>Expiry Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="11" className="empty-row">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="11" className="empty-row">No batches found.</td></tr>
            ) : filtered.map((b) => {
              const style = STATUS_STYLE[b.status] || {};
              return (
                <tr key={b.batch_id}>
                  <td><span className="id-badge">{b.batch_number}</span></td>
                  <td className="name-cell">{b.product?.product_name || `#${b.product_id}`}</td>
                  <td>{b.purchase_order?.po_number || "—"}</td>
                  <td>{b.supplier?.supplier_name || "—"}</td>
                  <td className="price-cell">Rs. {Number(b.purchase_price || 0).toFixed(2)}</td>
                  <td>{b.received_quantity}</td>
                  <td>
                    <span className={`stock-badge ${b.remaining_quantity === 0 ? "low" : ""}`}>
                      {b.remaining_quantity}
                    </span>
                  </td>
                  <td>{fmt(b.received_date)}</td>
                  <td>{fmt(b.expiry_date)}</td>
                  <td>
                    <span className="status-pill" style={style}>{b.status}</span>
                  </td>
                  <td>
                    <div className="action-btns">
                      <button className="icon-btn view" title="View" onClick={() => setViewBatch(b)}>
                        <Eye size={15} />
                      </button>
                      {b.status === "Expired" && (
                        <button className="icon-btn delete" title="Dispose" onClick={() => handleDispose(b)}>
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {viewBatch && (
        <div className="modal-overlay" onClick={() => setViewBatch(null)}>
          <div className="modal-box view-modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Batch Details</h2>
              <button className="modal-close" onClick={() => setViewBatch(null)}>✕</button>
            </div>
            <div className="view-section">
              <p className="view-section-title">Batch Information</p>
              <div className="view-grid">
                {[
                  ["Batch Number",   viewBatch.batch_number],
                  ["Product",        viewBatch.product?.product_name || `#${viewBatch.product_id}`],
                  ["Purchase Order", viewBatch.purchase_order?.po_number || "—"],
                  ["Supplier",       viewBatch.supplier?.supplier_name || "—"],
                  ["Purchase Price", `Rs. ${Number(viewBatch.purchase_price || 0).toFixed(2)}`],
                  ["Received Qty",   viewBatch.received_quantity],
                  ["Remaining Qty",  viewBatch.remaining_quantity],
                  ["Received Date",  fmt(viewBatch.received_date)],
                  ["Expiry Date",    fmt(viewBatch.expiry_date)],
                  ["Status",         <span key="s" className="status-pill" style={STATUS_STYLE[viewBatch.status] || {}}>{viewBatch.status}</span>],
                  ...(viewBatch.disposed_at ? [["Disposed At", fmt(viewBatch.disposed_at)]] : []),
                ].map(([label, value]) => (
                  <div className="view-row" key={label}>
                    <span className="view-label">{label}</span>
                    <span className="view-value">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BatchInventory() {
  const location = useLocation();
  const isManagerRoute = location.pathname.startsWith("/manager/");
  const role = (localStorage.getItem("role") || "admin").toLowerCase();
  const Layout = isManagerRoute || role === "manager" ? ManagerDashboard : AdminDashboard;
  return (
    <Layout active="batch-inventory">
      <BatchInventoryPage />
    </Layout>
  );
}
