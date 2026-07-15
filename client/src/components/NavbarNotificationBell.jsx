import { useEffect, useState, useRef } from "react";
import { Bell, X } from "lucide-react";
import api from "../api/axios";
import { useNavigate } from "react-router-dom";

const THEME = "#8b3a3a";

export default function NavbarNotificationBell() {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const ref = useRef(null);

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await api.get("/alerts/summary");
      setSummary(res.data || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const total = summary?.total || 0;
  const items = [
    { key: "out-of-stock", label: "Products Out Of Stock", emoji: "🔴", count: summary?.["Out of Stock"] || 0, color: "#ef4444" },
    { key: "low-stock", label: "Products Low Stock", emoji: "🟠", count: summary?.["Low Stock"] || 0, color: "#f97316" },
    { key: "reorder", label: "Products Need Reorder", emoji: "🟡", count: summary?.["Reorder"] || 0, color: "#d97706" },
    { key: "near-expiry", label: "Products Expiring Soon", emoji: "🟣", count: summary?.["Near Expiry"] || 0, color: "#a855f7" },
    { key: "expired", label: "Product Expired", emoji: "🚫", count: summary?.["Expired"] || 0, color: "#991b1b" },
  ];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          position: "relative",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: 8,
          borderRadius: 10,
          color: "#ffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 0.2s",
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = "#a84545"}
        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
      >
        <Bell size={30} />
        {total > 0 && (
          <span style={{
            position: "absolute",
            top: 2, right: 2,
            width: 18, height: 18,
            borderRadius: "50%",
            background: "#ef4444",
            color: "#fff",
            fontSize: "0.7rem",
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid #fff",
          }}>
            {total > 9 ? "9+" : total}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 8px)",
          right: -15,
          width: 250,
          background: "#fff",
          borderRadius: 14,
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
          border: "1px solid #e5e7eb",
          zIndex: 999,
          overflow: "hidden",
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 16px",
            borderBottom: "1px solid #f3f4f6",
          }}>
            <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "#2c2c2c" }}>
              Notifications
            </span>
            <button
              onClick={() => setOpen(false)}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "#6b7280" }}
            >
              <X size={16} />
            </button>
          </div>

          {loading ? (
            <div style={{ padding: 20, textAlign: "center", color: "#9ca3af", fontSize: "0.85rem" }}>
              Loading…
            </div>
          ) : (
            <div style={{ padding: "8px 0", maxHeight: 320, overflowY: "auto" }}>
              {items.map((item) => (
                <div
                  key={item.key}
                  onClick={() => {
                    setOpen(false);
                    navigate(`/alerts?type=${item.key}`);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    padding: "10px 16px",
                    cursor: "pointer",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#f9fafb"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: "1.1rem" }}>{item.emoji}</span>
                    <span style={{
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      color: item.count > 0 ? "#2c2c2c" : "#9ca3af",
                    }}>
                      {item.label}
                    </span>
                  </div>
                  <span style={{
                    fontSize: "0.8rem",
                    fontWeight: 800,
                    color: item.count > 0 ? item.color : "#9ca3af",
                    background: item.count > 0 ? `${item.color}14` : "#f3f4f6",
                    padding: "2px 10px",
                    borderRadius: 999,
                  }}>
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div
            onClick={() => { setOpen(false); navigate("/alerts"); }}
            style={{
              padding: "12px 16px",
              borderTop: "1px solid #f3f4f6",
              textAlign: "center",
              fontSize: "0.8rem",
              fontWeight: 700,
              color: THEME,
              cursor: "pointer",
              background: "#fff",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#faf5f5"}
            onMouseLeave={(e) => e.currentTarget.style.background = "#fff"}
          >
            View All Alerts
          </div>
        </div>
      )}
    </div>
  );
}
