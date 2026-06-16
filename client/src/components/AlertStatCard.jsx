import React, { useEffect, useState } from "react";
import { subscribeToEvent } from "../services/socketSingleton";
import { AlertTriangle, Package, RefreshCw, Clock3, Bell } from "lucide-react";
import api from "../api/axios";
import toast from "react-hot-toast";

const THEME       = "#8b3a3a";
const THEME_BG    = "rgba(139,58,58,0.08)";
const THEME_BORDER = "rgba(139,58,58,0.20)";
const THEME_GLOW  = "rgba(139,58,58,0.15)";

const ALERT_CONFIG = [
  {
    key: "Out of Stock",
    Icon: AlertTriangle,
    color: "#ef4444",
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.18)",
    statusLabel: "Critical",
    statusBg: "rgba(239,68,68,0.10)",
    statusColor: "#ef4444",
  },
  {
    key: "Low Stock",
    Icon: Package,
    color: "#f97316",
    bg: "rgba(249,115,22,0.08)",
    border: "rgba(249,115,22,0.18)",
    statusLabel: "Warning",
    statusBg: "rgba(249,115,22,0.10)",
    statusColor: "#f97316",
  },
  {
    key: "Reorder",
    Icon: RefreshCw,
    color: "#d97706",
    bg: "rgba(217,119,6,0.08)",
    border: "rgba(217,119,6,0.18)",
    statusLabel: "Attention",
    statusBg: "rgba(217,119,6,0.10)",
    statusColor: "#d97706",
  },
  {
    key: "Near Expiry",
    Icon: Clock3,
    color: "#a855f7",
    bg: "rgba(168,85,247,0.08)",
    border: "rgba(168,85,247,0.18)",
    statusLabel: "Normal",
    statusBg: "rgba(168,85,247,0.10)",
    statusColor: "#a855f7",
  },
];

// ── Individual Alert Card ──────────────────────────────────────────────────────
function AlertCard({ config, count, loading, onClick }) {
  const { Icon, color, bg, border, statusLabel, statusBg, statusColor, key } = config;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#ffffff",
        border: `1px solid ${hovered ? border : "#e5e7eb"}`,
        borderRadius: "var(--radius-card, 16px)",
        padding: "24px 20px 20px",
        cursor: "pointer",
        boxShadow: hovered
          ? `0 10px 30px rgba(0,0,0,0.10), 0 0 0 1px ${border}`
          : "var(--shadow-card, 0 2px 8px rgba(0,0,0,0.06))",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        transition: "all 0.3s cubic-bezier(0.25,1,0.5,1)",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: "14px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative corner — top-left (matches kpi-card::before) */}
      <span style={{
        position: "absolute", top: 0, left: 0,
        width: 12, height: 12,
        borderTop: `2px solid ${color}`,
        borderLeft: `2px solid ${color}`,
        opacity: hovered ? 1 : 0,
        transition: "opacity 0.3s ease",
      }} />
      {/* Decorative corner — bottom-right */}
      <span style={{
        position: "absolute", bottom: 0, right: 0,
        width: 12, height: 12,
        borderBottom: `2px solid ${color}`,
        borderRight: `2px solid ${color}`,
        opacity: hovered ? 1 : 0,
        transition: "opacity 0.3s ease",
      }} />

      {/* Icon circle */}
      <div style={{
        width: 48, height: 48,
        borderRadius: "50%",
        background: hovered ? color : bg,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
        transition: "background 0.3s ease",
      }}>
        <Icon size={22} color={hovered ? "#fff" : color} strokeWidth={2} />
      </div>

      {/* Title */}
      <span style={{
        fontSize: "0.88rem",
        fontWeight: 700,
        color: "#666666",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        lineHeight: 1.2,
      }}>
        {key}
      </span>

      {/* Count — main focus */}
      <span style={{
        fontSize: "2.4rem",
        fontWeight: 800,
        color: loading ? "#d1d5db" : color,
        lineHeight: 1,
        letterSpacing: "-1px",
      }}>
        {loading ? "—" : count}
      </span>

      {/* Status badge */}
      <span style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 12px",
        borderRadius: "999px",
        fontSize: "0.75rem",
        fontWeight: 700,
        background: statusBg,
        color: statusColor,
        border: `1px solid ${border}`,
        letterSpacing: "0.3px",
      }}>
        {statusLabel}
      </span>
    </div>
  );
}

// ── Main AlertStatCard ─────────────────────────────────────────────────────────
export default function AlertStatCard() {
  const [counts, setCounts] = useState({ total: 0, byType: {} });
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [activeType, setActiveType] = useState(ALERT_CONFIG[0].key);

  useEffect(() => {
    fetchCounts();
    // Singleton socket lives outside React — Strict Mode double-invoke is harmless.
    // subscribeToEvent returns socket.off — used directly as the cleanup function.
    return subscribeToEvent("alerts:updated", fetchCounts);
  }, []);

  async function fetchCounts() {
    setLoadingCounts(true);
    try {
      const res = await api.get(`/alerts?unresolved=true`);
      const arr = Array.isArray(res.data) ? res.data : res.data?.alerts || [];
      const byType = {};
      ALERT_CONFIG.forEach((t) => (byType[t.key] = 0));
      let total = 0;
      arr.forEach((a) => {
        total += 1;
        if (byType[a.alert_type] !== undefined) byType[a.alert_type] += 1;
      });
      setCounts({ total, byType: { ...byType } });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load alerts");
    } finally {
      setLoadingCounts(false);
    }
  }

  return (
    <div style={{ padding: "0 16px" }}>
      {/* ── Section Header ── */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "20px",
        flexWrap: "wrap",
        gap: 12,
        borderBottom: "1px solid var(--border-light, #e5e7eb)",
        paddingBottom: "16px",
      }}>
        <div>
          <h2 style={{
            fontSize: "1.85rem",
            fontWeight: 800,
            color: "#2c2c2c",
            letterSpacing: "-0.5px",
            margin: 0,
          }}>
            Alert Statistics
          </h2>
          <p style={{
            fontSize: "0.95rem",
            color: "#555555",
            marginTop: 4,
            marginBottom: 0,
          }}>
            Real-time inventory alerts and notifications
          </p>
        </div>

        {/* Total badge */}
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          padding: "7px 16px",
          background: THEME_BG,
          color: THEME,
          border: `1px solid ${THEME_BORDER}`,
          borderRadius: "999px",
          fontSize: "0.85rem",
          fontWeight: 700,
          whiteSpace: "nowrap",
          boxShadow: `0 2px 8px ${THEME_GLOW}`,
        }}>
          <Bell size={14} color={THEME} strokeWidth={2} />
          Total Alerts: {loadingCounts ? "…" : counts.total}
        </div>
      </div>

      {/* ── 4-Column Responsive Grid ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "20px",
      }}
        className="alert-stat-grid"
      >
        {ALERT_CONFIG.map((config) => (
          <AlertCard
            key={config.key}
            config={config}
            count={counts.byType?.[config.key] ?? 0}
            loading={loadingCounts}
            onClick={() => { setActiveType(config.key); setShowModal(true); }}
          />
        ))}
      </div>

      {/* ── Modal ── */}
      {showModal && (
        <AlertModal
          activeType={activeType}
          setActiveType={setActiveType}
          onClose={() => { setShowModal(false); fetchCounts(); }}
        />
      )}

      {/* ── Responsive grid breakpoints ── */}
      <style>{`
        @media (max-width: 1100px) {
          .alert-stat-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 560px) {
          .alert-stat-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

// ── Alert Detail Modal (unchanged logic) ──────────────────────────────────────
function AlertModal({ activeType, setActiveType, onClose }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => { fetchForType(activeType); }, [activeType]);

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

  const INVENTORY_ALERT_TYPES = ["Out of Stock", "Low Stock", "Reorder"];

  async function resolveAlert(id) {
    try {
      const res = await api.put(`/alerts/${id}/resolve`);
      toast.success(res.data.message || "Alert resolved.", { duration: 3000 });
      // Re-fetch the current tab so resolved rows disappear from the unresolved list
      await fetchForType(activeType);
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to resolve alert";
      toast.error(msg);
      if (err?.response?.status !== 409) console.error(err);
    }
  }

  const activeConfig = ALERT_CONFIG.find((c) => c.key === activeType);

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
      background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
      zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "#fff", borderRadius: 16, maxWidth: 960, width: "92%",
        padding: "24px", boxShadow: "0 20px 60px rgba(0,0,0,0.20)",
        maxHeight: "88vh", overflowY: "auto",
      }}>
        {/* Modal header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#2c2c2c", display: "flex", alignItems: "center", gap: 8 }}>
              <Bell size={18} color={THEME} strokeWidth={2} />
              Stock Alert Details
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#6b7280" }}>
              Viewing unresolved alerts — {activeType}
            </p>
          </div>
          <button onClick={onClose} style={{
            background: "transparent", border: "none", fontSize: 22,
            cursor: "pointer", color: "#6b7280", lineHeight: 1,
          }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {ALERT_CONFIG.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveType(t.key)}
              style={{
                padding: "7px 14px", borderRadius: 8, cursor: "pointer",
                fontSize: "0.85rem", fontWeight: 700,
                border: t.key === activeType ? `1.5px solid ${t.color}` : "1px solid #e5e7eb",
                background: t.key === activeType ? t.bg : "#fff",
                color: t.key === activeType ? t.color : "#6b7280",
                transition: "all 0.2s",
              }}
            >
              {t.key}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          placeholder="Search product name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={(e) => { e.target.style.borderColor = THEME; e.target.style.boxShadow = `0 0 0 3px ${THEME_GLOW}`; }}
          onBlur={(e)  => { e.target.style.borderColor = "#e5e7eb"; e.target.style.boxShadow = "none"; }}
          style={{
            width: "100%", padding: "9px 14px", borderRadius: 8,
            border: "1.5px solid #e5e7eb", fontSize: "0.9rem",
            outline: "none", marginBottom: 14, boxSizing: "border-box",
            color: "#2c2c2c", transition: "border-color 0.2s, box-shadow 0.2s",
          }}
        />

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 32, color: "#9ca3af" }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 32, color: "#6b7280" }}>✅ No alerts for this type</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: THEME, color: "#ffffff" }}>
                {["Alert ID","Product","Batch No","Stock","Min Qty","Reorder","Expiry","Product Status","Alert Status","Action"].map((h) => (
                  <th key={h} style={{ padding: "10px 12px", fontSize: "0.8rem", fontWeight: 700, textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => {
                const id = a.alert_id || a.id;
                const p = a.product || {};
                const prodStatus = (p.status || "active").toLowerCase();
                const resolved = a.is_resolved;
                return (
                  <tr key={id} style={{ background: i % 2 === 0 ? "#fafafa" : "#fff", borderBottom: "1px solid #f3f4f6" }}>
                    <td style={td}>{id}</td>
                    <td style={{ ...td, fontWeight: 600, color: "#2c2c2c" }}>{p.product_name || "—"}</td>
                    <td style={td}>{p.batch_no || "—"}</td>
                    <td style={td}>{p.stock_quantity ?? "—"}</td>
                    <td style={td}>{p.min_stock_quantity ?? "—"}</td>
                    <td style={td}>{p.reorder_level ?? "—"}</td>
                    <td style={td}>{p.expiry_date || "—"}</td>
                    <td style={td}>
                      <span style={badge(prodStatus === "active" ? "#16a34a" : "#ef4444")}>
                        {prodStatus}
                      </span>
                    </td>
                    <td style={td}>
                      <span style={badge(resolved ? "#16a34a" : "#ef4444")}>
                        {resolved ? "Resolved" : "Unresolved"}
                      </span>
                    </td>
                    <td style={td}>
                      <button
                        disabled={resolved}
                        onClick={() => resolveAlert(id)}
                        style={{
                          padding: "5px 12px", borderRadius: 7,
                          border: resolved ? "1.5px solid #e5e7eb" : `1.5px solid ${THEME_BORDER}`,
                          background: resolved ? "#f3f4f6" : THEME_BG,
                          color: resolved ? "#9ca3af" : THEME,
                          cursor: resolved ? "not-allowed" : "pointer",
                          fontSize: "0.8rem", fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        Resolve
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Shared table cell style helpers ───────────────────────────────────────────
const td = { padding: "9px 12px", fontSize: "0.82rem", color: "#374151" };
const badge = (color) => ({
  display: "inline-block", padding: "3px 9px", borderRadius: 999,
  background: `${color}18`, color, border: `1px solid ${color}30`,
  fontSize: "0.75rem", fontWeight: 700,
});
