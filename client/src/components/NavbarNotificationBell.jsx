import { useEffect, useState, useRef, useCallback } from "react";
import { Bell, X, ChevronRight, Package, AlertTriangle, RefreshCw, Clock, ShoppingCart } from "lucide-react";
import api from "../api/axios";
import { useNavigate } from "react-router-dom";
import { useUnreadNotificationsCount} from "../services/procurementApi";
import "../styles/NavbarNotificationBell.css";

const THEME = "#8b3a3a";

/* Relative time helper — no external dependency */
function relativeTime(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/* Per-type config — icon, color, nav key */
const INVENTORY_ITEMS = [
  { key: "out-of-stock",  label: "Out of Stock",      summaryKey: "Out of Stock",  Icon: Package,       color: "#ef4444" },
  { key: "low-stock",     label: "Low Stock",          summaryKey: "Low Stock",     Icon: AlertTriangle, color: "#f97316" },
  { key: "reorder",       label: "Need Reorder",       summaryKey: "Reorder",       Icon: RefreshCw,     color: "#d97706" },
  { key: "near-expiry",   label: "Near Expiry",        summaryKey: "Near Expiry",   Icon: Clock,         color: "#a855f7" },
  { key: "expired",       label: "Expired",            summaryKey: "Expired",       Icon: ShoppingCart,  color: "#991b1b" },
];

export default function NavbarNotificationBell() {
  const isCashier = (localStorage.getItem("role") || "").toLowerCase() === "cashier";
  const [open, setOpen]       = useState(false);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const ref      = useRef(null);

  /* Existing procurement unread count — reuses the hook already in procurementApi */
  const { data: procData } = useUnreadNotificationsCount();
  const procUnread = procData?.count || 0;

  /* ── Existing fetch (unchanged) ── */
  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/alerts/summary");
      setSummary(res.data || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  /* ── Outside-click close (unchanged) ── */
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const inventoryTotal = summary?.total || 0;
  const badgeCount     = inventoryTotal + (isCashier ? 0 : procUnread);
  const timestamp      = relativeTime(summary?.updated_at);

  const close = () => setOpen(false);

  return (
    <div ref={ref} className="nbell-root">
      {/* ── Bell button — visually unchanged ── */}
      <button
        className="nbell-btn"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
      >
        <Bell className="nbell-icon" />
        {badgeCount > 0 && (
          <span className="nbell-badge">
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        )}
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div className="nbell-dropdown">

          {/* Header */}
          <div className="nbell-dropdown__header">
            <span className="nbell-dropdown__title">Notifications</span>
            <button className="nbell-dropdown__close" onClick={close} aria-label="Close">
              <X size={15} />
            </button>
          </div>

          {loading ? (
            <div className="nbell-dropdown__loading">Loading…</div>
          ) : (
            <>
              {/* ── Section 1: Inventory Alerts ── */}
              <div className="nbell-section-label">
                <Package size={12} />
                Inventory Alerts
                {inventoryTotal > 0 && (
                  <span className="nbell-section-count">{inventoryTotal}</span>
                )}
              </div>

              <div className="nbell-inv-list">
                {INVENTORY_ITEMS.map(({ key, label, summaryKey, Icon, color }) => {
                  const count = summary?.[summaryKey] || 0;
                  return (
                    <div
                      key={key}
                      className={`nbell-inv-row ${count === 0 ? "nbell-inv-row--zero" : ""}`}
                      onClick={() => { close(); navigate(`/alerts?type=${key}`); }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && (close(), navigate(`/alerts?type=${key}`))}
                    >
                      <span
                        className="nbell-inv-icon"
                        style={{ background: `${color}18`, color }}
                      >
                        <Icon size={13} />
                      </span>
                      <span className="nbell-inv-label">{label}</span>
                      <span
                        className="nbell-inv-badge"
                        style={
                          count > 0
                            ? { background: `${color}18`, color }
                            : {}
                        }
                      >
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>

              {timestamp && (
                <div className="nbell-inv-timestamp">Updated {timestamp}</div>
              )}

              {/* ── Divider ── */}
              {!isCashier && <div className="nbell-divider" />}

              {/* ── Section 2: Procurement Summary ── */}
              {!isCashier && (
              <>
              <div className="nbell-section-label">
                <ShoppingCart size={12} />
                Procurement
                {procUnread > 0 && (
                  <span className="nbell-section-count nbell-section-count--proc">{procUnread}</span>
                )}
              </div>

              <div className="nbell-proc-card">
                {procUnread > 0 ? (
                  <>
                    <p className="nbell-proc-card__headline">
                      {procUnread} Purchase Order{procUnread !== 1 ? "s" : ""} Pending Approval
                    </p>
                    <p className="nbell-proc-card__sub">Requires your attention</p>
                  </>
                ) : (
                  <p className="nbell-proc-card__sub nbell-proc-card__sub--ok">
                    No pending procurement alerts
                  </p>
                )}
                <button
                  className="nbell-proc-card__link"
                  onClick={() => { close(); navigate("/procurement/notifications"); }}
                >
                  View Procurement <ChevronRight size={13} />
                </button>
              </div>

              {/* ── Divider ── */}
              <div className="nbell-divider" />
              </>
              )}

              {/* ── Footer ── */}
              <div
                className="nbell-footer"
                onClick={() => { close(); navigate("/alerts"); }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && (close(), navigate("/alerts"))}
              >
                View All Inventory Alerts
                <ChevronRight size={13} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
