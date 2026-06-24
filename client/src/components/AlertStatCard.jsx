import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../api/axios";
import RecentAlertsWidget from "./RecentAlertsWidget";

const ALERT_TYPES = [
  {
    key: "out-of-stock",
    label: "Out Of Stock",
    backendKey: "Out of Stock",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.18)",
    Icon: () => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
    ),
  },
  {
    key: "low-stock",
    label: "Low Stock",
    backendKey: "Low Stock",
    color: "#f97316",
    bg: "rgba(249,115,22,0.08)",
    border: "rgba(249,115,22,0.18)",
    Icon: () => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
    ),
  },
  {
    key: "reorder",
    label: "Reorder",
    backendKey: "Reorder",
    color: "#d97706",
    bg: "rgba(217,119,6,0.08)",
    border: "rgba(217,119,6,0.18)",
    Icon: () => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
    ),
  },
  {
    key: "near-expiry",
    label: "Near Expiry",
    backendKey: "Near Expiry",
    color: "#a855f7",
    bg: "rgba(168,85,247,0.08)",
    border: "rgba(168,85,247,0.18)",
    Icon: () => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
    ),
  },
  {
    key: "expired",
    label: "Expired Products",
    backendKey: "Expired",
    color: "#991b1b",
    bg: "rgba(153,27,27,0.08)",
    border: "rgba(153,27,27,0.18)",
    Icon: () => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
    ),
  },
];

export default function AlertStatCard() {
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCounts();
  }, []);

  const fetchCounts = async () => {
    setLoading(true);
    try {
      const res = await api.get("/alerts/summary");
      setCounts(res.data || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const navigateToAlerts = (key) => {
    navigate(`/alerts?type=${key}`);
  };

  return (
    <div style={{ padding: "0 16px" }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "20px",
        flexWrap: "wrap",
        gap: 12,
        borderBottom: "1px solid #e5e7eb",
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
            Inventory Alerts
          </h2>
          <p style={{
            fontSize: "0.95rem",
            color: "#555555",
            marginTop: 4,
            marginBottom: 0,
          }}>
            Real-time stock, expiry and reorder signals
          </p>
        </div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: "16px",
      }}
        className="kpi-grid"
      >
        {ALERT_TYPES.map((cfg) => (
          <KpiCard
            key={cfg.key}
            config={cfg}
            count={counts[cfg.backendKey ?? cfg.label] ?? 0}
            loading={loading}
            onClick={() => navigateToAlerts(cfg.key)}
          />
        ))}
      </div>

      <RecentAlertsWidget />

      <style>{`
        .kpi-grid {
          grid-template-columns: repeat(5, 1fr);
        }
        @media (max-width: 1400px) {
          .kpi-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
        @media (max-width: 900px) {
          .kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 560px) {
          .kpi-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function KpiCard({ config, count, loading, onClick }) {
  const [hovered, setHovered] = useState(false);
  const { color, bg, border, label, Icon } = config;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#ffffff",
        border: `1px solid ${hovered ? border : "#e5e7eb"}`,
        borderRadius: "var(--radius-card, 16px)",
        padding: "22px 18px 18px",
        cursor: "pointer",
        boxShadow: hovered
          ? `0 10px 30px rgba(0,0,0,0.10), 0 0 0 1px ${border}`
          : "0 2px 8px rgba(0,0,0,0.06)",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        transition: "all 0.3s cubic-bezier(0.25,1,0.5,1)",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: "12px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <span style={{
        position: "absolute", top: 0, left: 0,
        width: 12, height: 12,
        borderTop: `2px solid ${color}`,
        borderLeft: `2px solid ${color}`,
        opacity: hovered ? 1 : 0,
        transition: "opacity 0.3s ease",
      }} />
      <span style={{
        position: "absolute", bottom: 0, right: 0,
        width: 12, height: 12,
        borderBottom: `2px solid ${color}`,
        borderRight: `2px solid ${color}`,
        opacity: hovered ? 1 : 0,
        transition: "opacity 0.3s ease",
      }} />

      <div style={{
        width: 44, height: 44,
        borderRadius: "50%",
        background: hovered ? color : bg,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
        transition: "background 0.3s ease",
        color: hovered ? "#fff" : color,
      }}>
        <Icon />
      </div>

      <span style={{
        fontSize: "0.85rem",
        fontWeight: 700,
        color: "#666666",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        lineHeight: 1.2,
      }}>
        {label}
      </span>

      <span style={{
        fontSize: "2.2rem",
        fontWeight: 800,
        color: loading ? "#d1d5db" : color,
        lineHeight: 1,
        letterSpacing: "-1px",
      }}>
        {loading ? "—" : count}
      </span>

      <span
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 12px",
          borderRadius: 999,
          fontSize: "0.75rem",
          fontWeight: 700,
          background: bg,
          color,
          border: `1px solid ${border}`,
          letterSpacing: "0.3px",
          cursor: "pointer",
        }}
      >
        View Details
      </span>
    </div>
  );
}
