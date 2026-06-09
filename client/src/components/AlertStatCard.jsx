import React, { useEffect, useState } from "react";
import api from "../api/axios";
import toast from "react-hot-toast";

const TYPE_META = [
  { key: "Out of Stock", color: "#ef4444" },
  { key: "Low Stock", color: "#f97316" },
  { key: "Reorder", color: "#eab308", textColor: "#000" },
  { key: "Near Expiry", color: "#a855f7" },
];

function normalizeType(t) {
  if (!t) return "";
  return t.toString().toLowerCase().replace(/[-_\s]/g, "");
}

export default function AlertStatCard() {
  const [counts, setCounts] = useState({ total: 0, byType: {} });
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [activeType, setActiveType] = useState(TYPE_META[0].key);

  useEffect(() => {
    fetchCounts();
  }, []);

  async function fetchCounts() {
    setLoadingCounts(true);
    try {
      const res = await api.get(`/alerts?unresolved=true`);
      const arr = Array.isArray(res.data) ? res.data : res.data?.alerts || [];
      const byType = {};
      TYPE_META.forEach((t) => (byType[t.key] = 0));
      let total = 0;
      arr.forEach((a) => {
        total += 1;
        const tnorm = normalizeType(a.alert_type);
        for (const meta of TYPE_META) {
          if (normalizeType(meta.key) === tnorm || tnorm.includes(normalizeType(meta.key))) {
            byType[meta.key] = (byType[meta.key] || 0) + 1;
            return;
          }
        }
        // fallback: try to match by words
        if (a.alert_type && a.alert_type.toLowerCase().includes("out") ) byType["Out of Stock"]++;
      });
      setCounts({ total, byType });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load alerts");
    } finally {
      setLoadingCounts(false);
    }
  }

  return (
    <>
      <div className="card kpi-card alert-stat-card" onClick={() => setShowModal(true)} style={{ cursor: 'pointer' }}>
        <div>
          <div className="kpi-label">STOCK ALERTS</div>
          <div className="kpi-value">{loadingCounts ? "..." : counts.total}</div>
        </div>
        <div className="kpi-icon" aria-hidden>
          <div className="bell-circle">🔔</div>
        </div>

        <div style={{ marginTop: 12, display: 'flex', gap: 12 }}>
          {TYPE_META.map((t) => (
            <div key={t.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="dot" style={{ background: t.color }} />
              <small style={{ display: 'block' }}>{t.key}: <strong>{counts.byType?.[t.key] ?? 0}</strong></small>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <AlertModal
          activeType={activeType}
          setActiveType={setActiveType}
          onClose={() => { setShowModal(false); fetchCounts(); }}
        />
      )}

      <style>{`
        .alert-stat-card .kpi-icon { top: 12px; right: 14px; }
        .bell-circle { width:48px; height:48px; border-radius:50%; background: rgba(254, 226, 226, 0.9); display:flex; align-items:center; justify-content:center; font-size:20px; }
        .alert-stat-card .dot { width:10px; height:10px; border-radius:50%; display:inline-block }
      `}</style>
    </>
  );
}

function AlertModal({ activeType, setActiveType, onClose }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchForType(activeType);
  }, [activeType]);

  async function fetchForType(type) {
    setLoading(true);
    try {
      const res = await api.get(`/alerts?unresolved=true&alert_type=${encodeURIComponent(type)}`);
      const arr = Array.isArray(res.data) ? res.data : res.data?.alerts || [];
      setAlerts(arr);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load alerts for type");
    } finally {
      setLoading(false);
    }
  }

  const filtered = alerts.filter((a) => {
    const pname = a.product?.product_name || a.product_name || "";
    return pname.toLowerCase().includes(search.toLowerCase());
  });

  async function resolveAlert(id) {
    try {
      await api.put(`/alerts/${id}/resolve`);
      toast.success("Alert resolved");
      // optimistic update
      setAlerts((s) => s.map((it) => (it.alert_id === id || it.id === id ? { ...it, is_resolved: true } : it)));
    } catch (err) {
      console.error(err);
      toast.error("Failed to resolve alert");
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header">
          <h3>🔔 Stock Alert Details</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-tabs">
          {TYPE_META.map((t) => (
            <button
              key={t.key}
              className={`tab ${t.key === activeType ? 'active' : ''}`}
              onClick={() => setActiveType(t.key)}
              style={t.key === activeType ? { borderColor: t.color, color: t.color } : {}}>
              {t.key}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <input placeholder="Search product name..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', flex: 1 }} />
        </div>

        <div style={{ marginTop: 12 }}>
          {loading ? (
            <div className="spinner" />
          ) : filtered.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center' }}>✅ No alerts for this type</div>
          ) : (
            <table className="alerts-table">
              <thead>
                <tr>
                  <th>Alert ID</th>
                  <th>Product Name</th>
                  <th>Batch No</th>
                  <th>Stock Qty</th>
                  <th>Min Qty</th>
                  <th>Reorder Level</th>
                  <th>Expiry Date</th>
                  <th>Product Status</th>
                  <th>Alert Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  const id = a.alert_id || a.id;
                  const p = a.product || {};
                  const prodName = p.product_name || a.product_name || "-";
                  const batch = p.batch_no || a.batch_no || "-";
                  const stock = p.stock_quantity ?? a.stock_quantity ?? "-";
                  const minQty = p.min_stock_quantity ?? a.min_stock_quantity ?? "-";
                  const reorder = p.reorder_level ?? a.reorder_level ?? "-";
                  const expiry = p.expiry_date || a.expiry_date || "-";
                  const prodStatus = (p.status || a.product_status || "active").toLowerCase();
                  const resolved = a.is_resolved;

                  return (
                    <tr key={id}>
                      <td>{id}</td>
                      <td>{prodName}</td>
                      <td>{batch}</td>
                      <td>{stock}</td>
                      <td>{minQty}</td>
                      <td>{reorder}</td>
                      <td>{expiry}</td>
                      <td><span className={`badge ${prodStatus === 'active' ? 'green' : 'red'}`}>{prodStatus}</span></td>
                      <td><span className={`badge ${resolved ? 'green' : 'red'}`}>{resolved ? 'Resolved' : 'Unresolved'}</span></td>
                      <td>
                        <button disabled={resolved} onClick={() => resolveAlert(id)} className="resolve-btn">Resolve</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <style>{`
        .modal-overlay { position: fixed; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.5); z-index:1000; display:flex; align-items:center; justify-content:center; }
        .modal-box { background:#fff; border-radius:12px; max-width:900px; width:92%; padding:18px; box-shadow:0 8px 24px rgba(0,0,0,0.2); }
        .modal-header { display:flex; justify-content:space-between; align-items:center; }
        .modal-header h3 { margin:0; display:flex; gap:8px; align-items:center }
        .modal-close { background:transparent; border:0; font-size:22px; cursor:pointer }
        .modal-tabs { display:flex; gap:8px; margin-top:12px }
        .tab { padding:8px 12px; border-radius:8px; border:1px solid transparent; background:#fff; cursor:pointer }
        .tab.active { box-shadow:0 1px 4px rgba(0,0,0,0.06) }
        .spinner { height:48px; display:flex; align-items:center; justify-content:center }
        .spinner:after { content:''; width:28px; height:28px; border-radius:50%; border:4px solid #ddd; border-top-color:#666; display:block; animation:spin 1s linear infinite }
        @keyframes spin { to { transform: rotate(360deg) } }
        .alerts-table { width:100%; border-collapse:collapse; margin-top:8px }
        .alerts-table thead { background:#222; color:#fff }
        .alerts-table th, .alerts-table td { padding:8px 10px; border-bottom:1px solid #eee; font-size:13px }
        .alerts-table tbody tr:nth-child(odd) { background:#fafafa }
        .badge { padding:6px 8px; border-radius:8px; color:#fff; font-size:12px }
        .badge.green { background:#16a34a }
        .badge.red { background:#ef4444 }
        .resolve-btn { padding:6px 10px; border-radius:8px; border:1px solid #ccc; background:#f4f4f4; cursor:pointer }
      `}</style>
    </div>
  );
}
