import { useEffect, useState, useMemo } from "react";
import { Package, CreditCard, Search } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { createPortal } from "react-dom";
import api from "../api/axios";
import AdminDashboard from "./AdminDashboard";
import ManagerDashboard from "./ManagerDashboard";
import { useLocation } from "react-router-dom";
import "../styles/Alerts.css";
import "../styles/Procurement.css";
import "../styles/ProcurementPages.css";
import DetailModal from "../components/DetailModal";
import ProductDetailContent from "../components/ProductDetailContent";
import PODetailContent from "../components/PODetailContent";
import { useChequeAlerts, useUpdateChequeStatus, useRecordPayment } from "../services/procurementApi";
import { subscribeToEvent } from "../services/socketSingleton";
import { formatPurchaseOrderNumber } from "../utils/purchaseOrderNumber";

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
    <div className="proc-modal-overlay" onClick={onClose}>
      <div className="proc-modal" onClick={e => e.stopPropagation()}>
        <div className="proc-modal-header">
          <h2>🗑 Dispose Expired Stock</h2>
          <button className="proc-modal-close" onClick={onClose} disabled={disposing}>✕</button>
        </div>
        <div className="proc-modal-body">
          <div className="proc-view-grid">
            <div className="proc-view-row">
              <span className="proc-view-label">Product</span>
              <span className="proc-view-value">{product.product_name || "—"}</span>
            </div>
            {product.batch_no && (
              <div className="proc-view-row">
                <span className="proc-view-label">Batch No.</span>
                <span className="proc-view-value">{product.batch_no}</span>
              </div>
            )}
            <div className="proc-view-row">
              <span className="proc-view-label">Available Qty</span>
              <span className="proc-view-value" style={{ color: "#991b1b", fontWeight: 800 }}>{available}</span>
            </div>
          </div>
          <div className="proc-field" style={{ marginTop: "1rem" }}>
            <label htmlFor="dispose-qty">Dispose Qty</label>
            <input
              id="dispose-qty"
              type="number"
              min={1}
              max={available}
              value={qty}
              onChange={e => setQty(Math.min(available, Math.max(1, parseInt(e.target.value) || 1)))}
              className="proc-input"
              disabled={disposing}
            />
          </div>
          {invalid && (
            <p style={{ color: "#c62828", fontSize: "0.85rem", marginTop: "0.5rem" }}>Quantity must be between 1 and {available}.</p>
          )}
        </div>
        <div className="proc-modal-footer">
          <button className="proc-btn-outline" onClick={onClose} disabled={disposing}>Cancel</button>
          <button
            className="proc-btn-primary"
            style={{ background: "#c62828" }}
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

const PAYMENT_ALERT_FILTERS = [
  { key: "",         label: "All Payment Alerts" },
  { key: "due-soon",  label: "Cheques Due Soon" },
  { key: "due-today", label: "Cheques Due Today" },
  { key: "overdue",   label: "Cheques Overdue" },
  { key: "bounced",   label: "Cheques Bounced" },
];

const PAYMENT_ALERT_COLORS = {
  "Due Soon":  "#d97706",
  "Due Today": "#c62828",
  "Overdue":   "#991b1b",
  "Bounced":   "#7c3aed",
};

function ChequeDetailContent({ cheque }) {
  if (!cheque) return null;
  const fmtD = (d) => d ? new Date(d).toLocaleDateString("en-GB") : "—";
  const fmt  = (n) => `LKR ${Number(n || 0).toLocaleString("en-LK", { minimumFractionDigits: 2 })}`;
  const color = PAYMENT_ALERT_COLORS[cheque.alert_type] || "#6b7280";
  const daysLabel = cheque.days_remaining === null ? null
    : cheque.days_remaining < 0  ? `${Math.abs(cheque.days_remaining)} day${Math.abs(cheque.days_remaining) !== 1 ? "s" : ""} overdue`
    : cheque.days_remaining === 0 ? "Due today"
    : `${cheque.days_remaining} day${cheque.days_remaining !== 1 ? "s" : ""} remaining`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.9rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
        <span className="alert-type-pill" style={{ background: color }}>{cheque.alert_type}</span>
        {daysLabel && <span style={{ fontWeight: 700, color }}>{daysLabel}</span>}
      </div>
      {[
        ["Supplier",       cheque.supplier_name],
        ["Cheque Number",  cheque.cheque_number],
        ["Bank",           cheque.bank_name],
        ["Amount",         fmt(cheque.amount)],
        ["Cheque Date",    fmtD(cheque.cheque_date)],
        ["Clearing Date",  fmtD(cheque.clearing_date)],
        ["Status",         cheque.cheque_status],
        ["PO Reference",   formatPurchaseOrderNumber(cheque.po_number, cheque.po_id)],
      ].filter(([, v]) => v).map(([label, value]) => (
        <div key={label} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1e7e5", paddingBottom: "0.4rem" }}>
          <span style={{ color: "#5e4a48", fontWeight: 600 }}>{label}</span>
          <span style={{ fontWeight: 700, color: label === "Status" ? color : "#2b2b2b" }}>{value}</span>
        </div>
      ))}
    </div>
  );
}

const CHEQUE_COLORS = {
  Pending:   { bg: "#fff8e1", color: "#b45309", border: "#fde68a" },
  Cleared:   { bg: "#f0fdf4", color: "#1d7e42", border: "#bbf7d0" },
  Bounced:   { bg: "#fff1f2", color: "#c62828", border: "#fecaca" },
  Cancelled: { bg: "#f5f5f5", color: "#666",    border: "#e0e0e0" },
};

function resolvePaymentAlertAction(payment) {
  if (!payment) return "view-only";

  const paymentMethod = String(payment.payment_method || "").trim();
  const paymentStatus = String(payment.payment_status || "").trim();
  const chequeStatus = String(payment.cheque_status || "").trim();
  const alertStatus = String(payment.alert_status || "").trim();

  if (alertStatus === "Resolved" || alertStatus === "Closed" || alertStatus === "Completed") {
    return "view-only";
  }

  if (paymentMethod === "Cheque") {
    if (chequeStatus === "Bounced") return "resolve-bounced";
    if (paymentStatus === "Paid" || chequeStatus === "Cleared") return "view-only";
    if (paymentStatus === "Pending" || chequeStatus === "Pending" || !chequeStatus) return "mark-cleared";
    return "view-only";
  }

  if (paymentStatus === "Paid" || paymentStatus === "Completed") return "view-only";
  if (paymentStatus === "Pending Confirmation" || paymentStatus === "Pending" || paymentStatus === "Partially Paid") {
    return "confirm-payment";
  }

  return "view-only";
}

/**
 * Inline payment modal — reuses the same logic as PaymentDashboard.
 * For Pending cheques: marks cheque as Cleared (= paid).
 * For Bounced cheques: records a replacement payment.
 */
function PayNowModal({ alert, onClose }) {
  const actionType = resolvePaymentAlertAction(alert);
  const isBounced = actionType === "resolve-bounced";
  const isViewOnly = actionType === "view-only";
  const isConfirmPayment = actionType === "confirm-payment";
  const [payMethod, setPayMethod] = useState("Bank Transfer");
  const [payNote, setPayNote]     = useState("");
  const [chequeNumber, setChequeNumber] = useState("");
  const [bankName, setBankName]         = useState("");
  const [chequeDate, setChequeDate]     = useState("");
  const [clearingDate, setClearingDate] = useState("");

  const updateChequeMutation = useUpdateChequeStatus();
  const recordMutation       = useRecordPayment();
  const isPending = updateChequeMutation.isPending || recordMutation.isPending;

  const fmt = (n) => `LKR ${Number(n || 0).toLocaleString("en-LK", { minimumFractionDigits: 2 })}`;

  const handleConfirm = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];

      if (isBounced) {
        const replacementAmount = Number(alert.amount ?? alert.invoice_amount ?? alert.balance_amount ?? 0);
        if (!(replacementAmount > 0)) {
          toast.error("Original cheque amount is invalid. Please check the payment record.");
          return;
        }

        const payload = {
          payment_id: alert.payment_id,
          paid_amount: replacementAmount,
          payment_method: payMethod,
          paid_date: today,
          notes: payNote,
        };
        if (payMethod === "Cheque") {
          if (clearingDate && chequeDate && clearingDate < chequeDate) {
            toast.error("Clearing date cannot be earlier than cheque date");
            return;
          }
          Object.assign(payload, {
            cheque_number: chequeNumber,
            bank_name: bankName,
            cheque_date: chequeDate,
            clearing_date: clearingDate || undefined,
            cheque_status: "Pending",
            pending_cheque_date: clearingDate || undefined,
          });
        }
        await recordMutation.mutateAsync(payload);
        toast.success("Replacement payment recorded");
      } else if (isConfirmPayment) {
        const payAmt = parseFloat(alert.balance_amount ?? alert.amount ?? alert.invoice_amount ?? 0) || 0;
        if (payAmt <= 0) {
          toast.error("Invalid payment amount");
          return;
        }

        await recordMutation.mutateAsync({
          payment_id: alert.payment_id,
          paid_amount: payAmt,
          payment_method: alert.payment_method || "Cash",
          paid_date: today,
          notes: payNote || `Confirmed payment for ${alert.supplier_name}`,
        });
        toast.success("Payment confirmed");
      } else {
        const payAmt = parseFloat(alert.balance_amount ?? alert.amount ?? 0) || 0;
        if (payAmt <= 0) {
          toast.error("Invalid payment amount");
          return;
        }

        const payload = {
          payment_id: alert.payment_id,
          paid_amount: payAmt,
          payment_method: "Cheque",
          paid_date: today,
          notes: payNote,
          cheque_number: alert.cheque_number || undefined,
          bank_name: alert.bank_name || undefined,
          cheque_date: alert.cheque_date || undefined,
          clearing_date: today,
        };

        await recordMutation.mutateAsync(payload);
        await updateChequeMutation.mutateAsync({ id: alert.payment_id, cheque_status: "Cleared" });
        toast.success("Cheque marked as Cleared");
      }
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || "Failed to process payment");
    }
  };

  const cc = CHEQUE_COLORS[alert.cheque_status] || CHEQUE_COLORS.Pending;
  const modalTitle = isViewOnly ? "Payment Details" : isBounced ? "Resolve Bounced Cheque" : isConfirmPayment ? "Confirm Payment" : "Confirm Cheque Cleared";
  const primaryActionText = isViewOnly ? "Close" : isBounced ? "Record Replacement Payment" : isConfirmPayment ? "Confirm Payment" : "Mark as Cleared";

  return createPortal(
    <div className="proc-modal-overlay" onClick={onClose}>
      <div className="proc-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="proc-modal-header">
          <h2 style={{ color: "#8b3a3a", margin: 0, fontSize: "1rem", fontWeight: 700 }}>
            {modalTitle}
          </h2>
          <button className="proc-modal-close" onClick={onClose} disabled={isPending}>✕</button>
        </div>
        <div className="proc-modal-body">
          <div style={{
            background: cc.bg, border: `1.5px solid ${cc.border}`,
            borderRadius: 10, padding: "0.85rem 1rem", marginBottom: "1rem",
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem 1rem" }}>
              <div>
                <div style={{ fontSize: "0.7rem", color: "#888" }}>Supplier</div>
                <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{alert.supplier_name}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.7rem", color: "#888" }}>Cheque No.</div>
                <div style={{ fontWeight: 700, fontSize: "0.9rem", color: cc.color }}>{alert.cheque_number || "—"}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.7rem", color: "#888" }}>Bank</div>
                <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>{alert.bank_name || "—"}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.7rem", color: "#888" }}>{alert.payment_method === "Cheque" ? "Amount" : "Amount"}</div>
                <div style={{ fontWeight: 700, fontSize: "0.9rem", color: cc.color }}>{fmt(alert.amount)}</div>
              </div>
              {(alert.clearing_date || alert.due_date) && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={{ fontSize: "0.7rem", color: "#888" }}>Due Date</div>
                  <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>{new Date(alert.clearing_date || alert.due_date).toLocaleDateString("en-GB")}</div>
                </div>
              )}
            </div>
          </div>

          {isViewOnly ? (
            <div>
              <p style={{ fontSize: "0.88rem", color: "#555", margin: "0 0 0.5rem" }}>
                Payment already completed. Current status: <strong>{alert.payment_status || alert.cheque_status || "Completed"}</strong>.
              </p>
            </div>
          ) : !isBounced && !isConfirmPayment ? (
            <p style={{ fontSize: "0.88rem", color: "#555", margin: "0 0 0.5rem" }}>
              Confirm that this cheque has been cleared by the bank. The payment status will be updated to <strong>Paid</strong>.
            </p>
          ) : isConfirmPayment ? (
            <p style={{ fontSize: "0.88rem", color: "#555", margin: "0 0 0.5rem" }}>
              This payment is still pending. Confirm the payment to complete the transaction.
            </p>
          ) : (
            <>
              <div style={{
                background: cc.bg, border: `1.5px solid ${cc.border}`,
                borderRadius: 8, padding: "0.6rem 0.9rem", marginBottom: "0.9rem",
                fontSize: "0.82rem", color: cc.color,
              }}>
                <strong>Bounced cheque:</strong> This cheque was bounced and requires a replacement or resolution before the payment can be completed.
              </div>
              <div className="proc-field" style={{ marginBottom: "0.75rem" }}>
                <label>Payment Method</label>
                <select id="payMethod" name="payMethod" className="proc-input" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                  {["Bank Transfer", "Cash", "Cheque", "Online"].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              {payMethod === "Cheque" && (
                <>
                  <div className="proc-field" style={{ marginBottom: "0.75rem" }}>
                    <label>Cheque Number</label>
                    <input id="chequeNumber" name="chequeNumber" className="proc-input" value={chequeNumber} onChange={(e) => setChequeNumber(e.target.value)} placeholder="e.g. CHQ-1001" />
                  </div>
                  <div className="proc-field" style={{ marginBottom: "0.75rem" }}>
                    <label>Bank Name</label>
                    <input id="bankName" name="bankName" className="proc-input" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. Sampath Bank" />
                  </div>
                  <div className="proc-field" style={{ marginBottom: "0.75rem" }}>
                    <label>Cheque Date</label>
                    <input id="chequeDate" name="chequeDate" type="date" className="proc-input" value={chequeDate} onChange={(e) => setChequeDate(e.target.value)} />
                  </div>
                  <div className="proc-field" style={{ marginBottom: "0.75rem" }}>
                    <label>Clearing Date</label>
                    <input id="clearingDate" name="clearingDate" type="date" className="proc-input" value={clearingDate} onChange={(e) => setClearingDate(e.target.value)} min={chequeDate || undefined} />
                  </div>
                </>
              )}
              <div className="proc-field">
                <label>Notes</label>
                <textarea id="payNote" name="payNote" className="proc-input proc-textarea" rows={2} value={payNote}
                  onChange={(e) => setPayNote(e.target.value)} placeholder="Reference number, remarks..." />
              </div>
            </>
          )}
        </div>
        <div className="proc-modal-footer">
          {isViewOnly ? (
            <button className="proc-btn-primary" onClick={onClose} disabled={isPending}>Close</button>
          ) : (
            <>
              <button className="proc-btn-outline" onClick={onClose} disabled={isPending}>Cancel</button>
              <button className="proc-btn-primary" onClick={handleConfirm} disabled={isPending}>
                {isPending ? "Processing..." : primaryActionText}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function PaymentAlertsTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeType = searchParams.get("type") || "";
  const [viewCheque, setViewCheque] = useState(null);
  const [payAlert, setPayAlert]     = useState(null);

  const { data, isLoading, refetch } = useChequeAlerts();
  const allAlerts = data?.alerts || [];
  const summary   = data?.summary || {};

  const filtered = useMemo(() => {
    if (!activeType) return allAlerts;
    const typeMap = { "due-soon": "Due Soon", "due-today": "Due Today", "overdue": "Overdue", "bounced": "Bounced" };
    return allAlerts.filter(a => a.alert_type === typeMap[activeType]);
  }, [allAlerts, activeType]);

  const setType = (key) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", "payment");
    if (key) next.set("type", key); else next.delete("type");
    setSearchParams(next);
  };

  const typeCounts = useMemo(() => ({
    "": summary.total || 0,
    "due-soon":  summary.dueSoon  || 0,
    "due-today": summary.dueToday || 0,
    "overdue":   summary.overdue  || 0,
    "bounced":   summary.bounced  || 0,
  }), [summary]);

  const fmtD = (d) => d ? new Date(d).toLocaleDateString("en-GB") : "—";
  const fmt  = (n) => `LKR ${Number(n || 0).toLocaleString("en-LK", { minimumFractionDigits: 2 })}`;

  const daysLabel = (a) => {
    if (a.days_remaining === null) return "—";
    if (a.days_remaining < 0)  return `${Math.abs(a.days_remaining)}d overdue`;
    if (a.days_remaining === 0) return "Today";
    return `${a.days_remaining}d`;
  };

  return (
    <>
      {viewCheque && (
        <DetailModal title="Cheque Alert Details" onClose={() => setViewCheque(null)}>
          <ChequeDetailContent cheque={viewCheque} />
        </DetailModal>
      )}
      {payAlert && (
        <PayNowModal alert={payAlert} onClose={() => setPayAlert(null)} />
      )}

      <div className="alert-chips">
        {PAYMENT_ALERT_FILTERS.map(({ key, label }) => {
          const isActive = activeType === key;
          const count = typeCounts[key] || 0;
          const colorMap = { "due-soon": "#d97706", "due-today": "#c62828", "overdue": "#991b1b", "bounced": "#7c3aed" };
          const chipColor = colorMap[key] || THEME;
          return (
            <button
              key={key || "all-pay"}
              onClick={() => setType(key)}
              className={`alert-chip ${isActive ? "alert-chip--active" : ""}`}
              style={isActive
                ? { background: chipColor, color: "#fff", border: `1.5px solid ${chipColor}`, boxShadow: `0 4px 12px ${chipColor}40` }
                : { background: "#fff", color: "#4b5563", border: "1.5px solid #e5e7eb" }}
            >
              <span style={{ fontWeight: 700 }}>{label}</span>
              <span className="alert-chip-count" style={isActive ? { background: "rgba(255,255,255,0.2)", color: "#fff" } : { background: `${chipColor}14`, color: chipColor }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="proc-card">
        <div className="proc-table-wrap">
          <table className="proc-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Supplier</th>
                <th>Cheque No.</th>
                <th>Bank</th>
                <th>Clearing Date</th>
                <th>Amount</th>
                <th>Days Remaining</th>
                <th>Alert</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} className="proc-empty">Loading payment alerts...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="proc-empty">No payment alerts found.</td></tr>
              ) : filtered.map((a) => {
                const color = PAYMENT_ALERT_COLORS[a.alert_type] || "#6b7280";
                const alertAction = resolvePaymentAlertAction(a);
                const actionLabel = alertAction === "mark-cleared"
                  ? "Mark as Cleared"
                  : alertAction === "resolve-bounced"
                    ? "Resolve Bounced Cheque"
                    : alertAction === "confirm-payment"
                      ? "Confirm Payment"
                      : "Payment Details";

                return (
                  <tr key={a.payment_id}>
                    <td><span className="proc-code-badge">#{a.payment_id}</span></td>
                    <td className="proc-name-cell">{a.supplier_name}</td>
                    <td style={{ fontWeight: 600, color }}>{a.cheque_number || "—"}</td>
                    <td>{a.bank_name || "—"}</td>
                    <td style={{ color: a.alert_type === "Overdue" ? "#991b1b" : "inherit" }}>{fmtD(a.clearing_date)}</td>
                    <td className="proc-amount">{fmt(a.amount)}</td>
                    <td>
                      <span style={{ fontWeight: 700, color }}>{daysLabel(a)}</span>
                    </td>
                    <td>
                      <span className="proc-status-pill" style={{ background: color + "18", color }}>{a.alert_type}</span>
                    </td>
                    <td>
                      <button className="proc-btn-outline" style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }} onClick={() => setPayAlert(a)}>
                        {alertAction === "view-only" ? "Payment Details" : alertAction === "confirm-payment" ? "Confirm Payment" : alertAction === "resolve-bounced" ? "Resolve Bounced" : "Mark Cleared"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
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

  const activeTab    = searchParams.get("tab") || "inventory";
  const activeFilter = searchParams.get("type") || "";

  // Payment alert count for tab badge (non-cashier only)
  const { data: chequeData } = useChequeAlerts();
  const paymentTabCount = isCashier ? 0 : (chequeData?.summary?.total || 0);

  const setTab = (tab) => {
    const next = new URLSearchParams();
    next.set("tab", tab);
    setSearchParams(next);
  };

  useEffect(() => {
    fetchSummary();
    if (searchParams.get("poCreated") === "1") {
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

  // Auto-refresh: socket event + 30s polling fallback
  useEffect(() => {
    const refresh = () => { fetchAlerts(); fetchSummary(); };
    const unsub = subscribeToEvent("alerts:updated", refresh);
    const timer = setInterval(refresh, 30000);
    return () => { unsub(); clearInterval(timer); };
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
      <div className="proc-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
          <div className="proc-header-icon"><Package size={22} /></div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h1 style={{ margin: 0 }}>Alert Center</h1>
              <span className="proc-count-badge">{counts[""] || alerts.length}</span>
            </div>
            <p style={{ margin: 0, color: "var(--proc-text-muted, #666)", fontSize: "0.85rem" }}>
              Monitor and manage inventory and payment alerts in one place.
            </p>
          </div>
        </div>
      </div>

      {/* Tab switcher — only show Payment Alerts tab for non-cashier */}
      {!isCashier && (
        <div className="alert-tab-switcher">
          <button
            className={`alert-tab-btn ${activeTab !== "payment" ? "alert-tab-btn--active" : ""}`}
            onClick={() => setTab("inventory")}
          >
            <Package size={16} className="alert-tab-icon" />
            Inventory Alerts
            {counts[""] > 0 && (
              <span className="alert-tab-count">{counts[""]}</span>
            )}
          </button>
          <button
            className={`alert-tab-btn ${activeTab === "payment" ? "alert-tab-btn--active" : ""}`}
            onClick={() => setTab("payment")}
          >
            <CreditCard size={16} className="alert-tab-icon" />
            Payment Alerts
            {paymentTabCount > 0 && (
              <span className="alert-tab-count">{paymentTabCount}</span>
            )}
          </button>
        </div>
      )}

      {activeTab === "payment" && !isCashier ? (
        <PaymentAlertsTab />
      ) : (
      <>
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

      <div className="proc-filters-row" style={{ marginTop: "1rem" }}>
        <div className="proc-search-wrap" style={{ maxWidth: "420px" }}>
          <Search size={14} className="proc-search-icon" />
          <input id="search" name="search"
            type="search"
            className="proc-search"
            placeholder="Search by product, batch or alert type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="proc-card">
        <div className="proc-table-wrap">
          <table className="proc-table">
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
                <tr>
                  <td colSpan={isCashier ? 10 : 11} className="proc-empty">Loading alerts...</td>
                </tr>
              ) : alerts.length === 0 ? (
                <tr>
                  <td colSpan={isCashier ? 10 : 11} className="proc-empty">No alerts found.</td>
                </tr>
              ) : (
                alerts.map((alert) => {
                  const product = alert.product || {};
                  const type = alert.alert_type;
                  const color = statusColor(type);
                  return (
                    <tr key={alert.alert_id}>
                      <td><span className="proc-code-badge">#{alert.alert_id}</span></td>
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
                        <span className="proc-status-pill" style={{ background: color + "18", color }}>
                          {type}
                        </span>
                      </td>
                      <td><strong>{product.stock_quantity ?? "-"}</strong></td>
                      <td>{product.min_stock_quantity ?? "-"}</td>
                      <td>{product.reorder_level ?? "-"}</td>
                      <td><span className="proc-mono">{alert.batch_number || "-"}</span></td>
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
                        <span className="proc-status-pill" style={{
                          background: alert.status === 'Purchase Ordered' ? 'rgba(59,130,246,0.12)' : 'rgba(239,68,68,0.12)',
                          color: alert.status === 'Purchase Ordered' ? '#3b82f6' : '#ef4444',
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
                                <button className="proc-btn-outline" style={{ padding: "0.3rem 0.65rem", fontSize: "0.8rem" }} onClick={viewPO}>
                                  View PO
                                </button>
                              </div>
                            );
                          }

                          if (type === "Expired") {
                            return (
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                <button className="proc-btn-primary" style={{ padding: "0.3rem 0.65rem", fontSize: "0.8rem", background: "#c62828" }} onClick={() => setDisposeTarget(alert)}>
                                  Dispose
                                </button>
                                <button className="proc-btn-outline" style={{ padding: "0.3rem 0.65rem", fontSize: "0.8rem" }} onClick={viewBatch}>
                                  Batch
                                </button>
                              </div>
                            );
                          }

                          if (type === "Near Expiry") {
                            return (
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                <button className="proc-btn-outline" style={{ padding: "0.3rem 0.65rem", fontSize: "0.8rem" }} onClick={viewBatch}>
                                  Batch
                                </button>
                              </div>
                            );
                          }

                          return (
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              <button className="proc-btn-primary" style={{ padding: "0.3rem 0.65rem", fontSize: "0.8rem" }} onClick={createPO}>
                                Create PO
                              </button>
                              <button className="proc-btn-outline" style={{ padding: "0.3rem 0.65rem", fontSize: "0.8rem" }} onClick={viewProduct}>
                                View
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
      </>
      )}
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
