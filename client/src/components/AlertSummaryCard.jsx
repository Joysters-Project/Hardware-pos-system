import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

const typeLabels = [
  { key: "Out of Stock", label: "Out of Stock", color: "#ef4444" },
  { key: "Low Stock", label: "Low Stock", color: "#f97316" },
  { key: "Reorder Needed", label: "Reorder", color: "#eab308" },
  { key: "Near Expiry", label: "Near Expiry", color: "#a855f7" },
];

export default function AlertSummaryCard() {
  const [alertCounts, setAlertCounts] = useState({
    outOfStock: 0,
    lowStock: 0,
    reorderNeeded: 0,
    nearExpiry: 0,
  });
  const [unresolvedCount, setUnresolvedCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadAlerts = async () => {
      setLoading(true);
      try {
        const response = await api.get("/alerts", {
          params: { unresolved: "true" },
        });
        const alerts = Array.isArray(response.data) ? response.data : [];
        const counts = {
          outOfStock: 0,
          lowStock: 0,
          reorderNeeded: 0,
          nearExpiry: 0,
        };

        alerts.forEach((alert) => {
          switch (alert.alert_type) {
            case "Out of Stock":
              counts.outOfStock += 1;
              break;
            case "Low Stock":
              counts.lowStock += 1;
              break;
            case "Reorder Needed":
              counts.reorderNeeded += 1;
              break;
            case "Near Expiry":
              counts.nearExpiry += 1;
              break;
            default:
              break;
          }
        });

        setAlertCounts(counts);
        setUnresolvedCount(alerts.length);
      } catch (error) {
        setAlertCounts({
          outOfStock: 0,
          lowStock: 0,
          reorderNeeded: 0,
          nearExpiry: 0,
        });
        setUnresolvedCount(0);
      } finally {
        setLoading(false);
      }
    };

    loadAlerts();
  }, []);

  return (
    <>
      <style>{`
        .alert-summary-card {
          position: relative;
          background: #ffffff;
          border-radius: 20px;
          border: 1px solid rgba(168, 69, 69, 0.15);
          box-shadow: 0 20px 45px rgba(62, 42, 46, 0.12);
          padding: 1.5rem;
          color: #1f1f1f;
          min-width: 320px;
          max-width: 100%;
        }

        .alert-summary-header {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          margin-bottom: 1rem;
        }

        .alert-summary-header span {
          font-size: 1.45rem;
        }

        .alert-summary-title {
          margin: 0;
          font-size: 1.15rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: #2f1f1f;
        }

        .alert-summary-status {
          margin-top: 0.55rem;
          color: #4f4f4f;
          font-size: 0.95rem;
          line-height: 1.45;
        }

        .alert-count-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.75rem;
          margin: 1.3rem 0 1.45rem;
        }

        .alert-count-box {
          border-radius: 16px;
          padding: 0.95rem;
          min-height: 92px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          color: #ffffff;
        }

        .alert-count-label {
          display: block;
          font-size: 0.82rem;
          opacity: 0.9;
          margin-bottom: 0.55rem;
        }

        .alert-count-value {
          font-size: 1.3rem;
          font-weight: 800;
          letter-spacing: -0.03em;
        }

        .alert-summary-total {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 1.15rem 1.2rem;
          border-radius: 18px;
          background: #f9f5f3;
          border: 1px solid rgba(232, 194, 168, 0.6);
        }

        .alert-summary-total strong {
          font-size: 2.1rem;
          color: #981b1f;
          letter-spacing: -0.05em;
        }

        .alert-summary-total span {
          color: #5b453f;
          font-size: 0.95rem;
        }

        .alert-summary-button {
          margin-top: 1.25rem;
          width: 100%;
          border: none;
          border-radius: 14px;
          padding: 0.95rem 1rem;
          background: linear-gradient(135deg, #8b3a3a 0%, #b34b4b 100%);
          color: #ffffff;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .alert-summary-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 16px 30px rgba(139, 58, 58, 0.18);
        }

        @media (max-width: 760px) {
          .alert-count-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 520px) {
          .alert-summary-card {
            padding: 1.2rem;
          }
        }
      `}</style>

      <div className="alert-summary-card">
        <div className="alert-summary-header">
          <span aria-hidden="true">🔔</span>
          <div>
            <p className="alert-summary-title">Stock Alerts</p>
            <p className="alert-summary-status">
              {loading
                ? "Refreshing counts..."
                : unresolvedCount === 0
                ? "All stock levels are healthy ✅"
                : `There are ${unresolvedCount} unresolved alerts.`}
            </p>
          </div>
        </div>

        <div className="alert-count-grid">
          {typeLabels.map((type) => {
            const value =
              type.key === "Out of Stock"
                ? alertCounts.outOfStock
                : type.key === "Low Stock"
                ? alertCounts.lowStock
                : type.key === "Reorder Needed"
                ? alertCounts.reorderNeeded
                : alertCounts.nearExpiry;
            return (
              <div
                className="alert-count-box"
                key={type.key}
                style={{ background: type.color }}
              >
                <span className="alert-count-label">{type.label}</span>
                <span className="alert-count-value">{value}</span>
              </div>
            );
          })}
        </div>

        <div className="alert-summary-total">
          <div>
            <strong>{unresolvedCount}</strong>
            <div>Unresolved alerts</div>
          </div>
          <div>
            <span>Track urgency and keep the floor stocked.</span>
          </div>
        </div>

        <button
          type="button"
          className="alert-summary-button"
          onClick={() => navigate("/alerts")}
        >
          View All Alerts
        </button>
      </div>
    </>
  );
}
