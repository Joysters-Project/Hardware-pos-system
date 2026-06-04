import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

const alertDotColor = (type) => {
  switch (type) {
    case "Out of Stock":
      return "#ef4444";
    case "Low Stock":
      return "#f97316";
    case "Reorder Needed":
      return "#eab308";
    case "Near Expiry":
      return "#a855f7";
    default:
      return "#6b7280";
  }
};

export default function AlertBell() {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);
  const ref = useRef(null);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const response = await api.get("/alerts", {
        params: { unresolved: "true" },
      });
      setAlerts(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const resolveAlert = async (alertId) => {
    setResolvingId(alertId);
    try {
      await api.put(`/alerts/${alertId}/resolve`);
      await fetchAlerts();
    } catch (error) {
      await fetchAlerts();
    } finally {
      setResolvingId(null);
    }
  };

  const activeCount = alerts.length;
  const topAlerts = alerts.slice(0, 5);

  return (
    <>
      <style>{`
        .alert-bell-wrapper {
          position: relative;
          display: inline-flex;
          align-items: center;
        }

        .alert-bell-button {
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: 1.35rem;
          line-height: 1;
          padding: 0.35rem;
          position: relative;
          color: #2f1f1f;
        }

        .alert-bell-badge {
          position: absolute;
          top: -5px;
          right: -5px;
          min-width: 20px;
          height: 20px;
          border-radius: 999px;
          background: #dc2626;
          color: white;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0 6px;
        }

        .alert-bell-dropdown {
          position: absolute;
          right: 0;
          top: 42px;
          width: 320px;
          background: white;
          border-radius: 18px;
          box-shadow: 0 22px 55px rgba(22, 22, 22, 0.16);
          z-index: 999;
          border: 1px solid rgba(231, 228, 225, 0.75);
          overflow: hidden;
        }

        .alert-bell-header {
          padding: 16px 18px;
          border-bottom: 1px solid #f3f2f1;
          font-weight: 700;
          font-size: 0.95rem;
          color: #1f1f1f;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .alert-bell-list {
          max-height: 340px;
          overflow-y: auto;
        }

        .alert-bell-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.85rem;
          padding: 12px 16px;
          border-bottom: 1px solid #f3f2f1;
        }

        .alert-bell-item:last-child {
          border-bottom: none;
        }

        .alert-bell-item-info {
          min-width: 0;
        }

        .alert-bell-dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          display: inline-block;
          margin-right: 8px;
        }

        .alert-bell-product {
          font-size: 0.93rem;
          font-weight: 700;
          color: #221f1f;
          margin-bottom: 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 185px;
        }

        .alert-bell-type {
          font-size: 0.8rem;
          color: #5e5460;
        }

        .alert-bell-resolve {
          border: none;
          background: #8b3a3a;
          color: #fff;
          border-radius: 12px;
          padding: 0.5rem 0.75rem;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
        }

        .alert-bell-resolve:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .alert-bell-footer {
          padding: 14px 18px;
          border-top: 1px solid #f3f2f1;
          text-align: center;
          background: #faf8f7;
        }

        .alert-bell-footer a {
          color: #8b3a3a;
          font-weight: 700;
          text-decoration: none;
        }

        .alert-bell-empty {
          padding: 18px;
          color: #5b5253;
          text-align: center;
          font-weight: 600;
        }
      `}</style>

      <div className="alert-bell-wrapper" ref={ref}>
        <button
          type="button"
          className="alert-bell-button"
          onClick={() => setOpen((current) => !current)}
          aria-label="Toggle alerts dropdown"
        >
          <span aria-hidden="true">🔔</span>
          {activeCount > 0 && <span className="alert-bell-badge">{activeCount}</span>}
        </button>

        {open && (
          <div className="alert-bell-dropdown">
            <div className="alert-bell-header">
              <span>Alerts</span>
              <span>{activeCount}</span>
            </div>

            <div className="alert-bell-list">
              {loading && (
                <div className="alert-bell-empty">Loading alerts…</div>
              )}

              {!loading && topAlerts.length === 0 && (
                <div className="alert-bell-empty">No active alerts ✅</div>
              )}

              {!loading && topAlerts.length > 0 &&
                topAlerts.map((alert) => {
                  const product = alert.product || alert.Product || {};
                  return (
                    <div className="alert-bell-item" key={alert.alert_id}>
                      <div className="alert-bell-item-info">
                        <div className="alert-bell-product">
                          <span className="alert-bell-dot" style={{ background: alertDotColor(alert.alert_type) }} />
                          {product.product_name || "Unknown product"}
                        </div>
                        <div className="alert-bell-type">{alert.alert_type}</div>
                      </div>
                      <button
                        type="button"
                        className="alert-bell-resolve"
                        onClick={() => resolveAlert(alert.alert_id)}
                        disabled={resolvingId === alert.alert_id}
                      >
                        Resolve
                      </button>
                    </div>
                  );
                })}
            </div>

            <div className="alert-bell-footer">
              <Link to="/alerts">View All</Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
