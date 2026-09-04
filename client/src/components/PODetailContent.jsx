import { useEffect, useState } from "react";
import { ShoppingCart, Package, Calendar, DollarSign, Hash, Truck } from "lucide-react";
import api from "../api/axios";
import { formatPurchaseOrderNumber } from "../utils/purchaseOrderNumber";

const fmt = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : null;

const STATUS_COLORS = {
  Pending:   { bg: "rgba(245,158,11,0.12)",  color: "#b45309" },
  Approved:  { bg: "rgba(59,130,246,0.12)",  color: "#1d4ed8" },
  Shipped:   { bg: "rgba(139,92,246,0.12)",  color: "#6d28d9" },
  Received:  { bg: "rgba(34,197,94,0.12)",   color: "#15803d" },
  Cancelled: { bg: "rgba(239,68,68,0.12)",   color: "#b91c1c" },
};

function Field({ label, icon: Icon, children }) {
  return (
    <div className="dm-field">
      <span className="dm-label">
        {Icon && <Icon size={13} />}
        {label}
      </span>
      <div className="dm-value">{children ?? "—"}</div>
    </div>
  );
}

export default function PODetailContent({ poId }) {
  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/procurement/purchase-orders/${poId}`)
      .then((res) => setPo(res.data))
      .catch(() => setPo(null))
      .finally(() => setLoading(false));
  }, [poId]);

  if (loading) {
    return (
      <div className="dm-skeleton">
        {[180, "100%", "100%", "100%", "100%", "100%"].map((w, i) => (
          <div key={i} className="dm-skeleton-box" style={{ width: w, height: i === 0 ? 16 : 40 }} />
        ))}
      </div>
    );
  }

  if (!po) {
    return <p style={{ color: "#888", margin: 0 }}>Purchase order could not be loaded.</p>;
  }

  const supplier = po.supplier || {};
  const items = po.po_items || [];
  const statusStyle = STATUS_COLORS[po.status] || { bg: "rgba(107,114,128,0.12)", color: "#374151" };

  return (
    <div className="dm-section">
      <div className="dm-grid-2">
        <Field label="PO Number" icon={Hash}>{formatPurchaseOrderNumber(po.po_number, po.po_id)}</Field>
        <div className="dm-field">
          <span className="dm-label">Status</span>
          <div
            className="dm-value"
            style={{
              border: `1.5px solid ${statusStyle.color}40`,
              color: statusStyle.color,
              background: statusStyle.bg,
              fontWeight: 700,
            }}
          >
            {po.status}
          </div>
        </div>
      </div>

      <Field label="Supplier" icon={Package}>{supplier.supplier_name}</Field>

      <div className="dm-grid-2">
        <Field label="Order Date"             icon={Calendar}>{fmt(po.po_date)}</Field>
        <Field label="Expected Delivery Date" icon={Truck}>{fmt(po.expected_delivery)}</Field>
      </div>

      {items.length > 0 && (
        <div className="dm-field">
          <span className="dm-label"><Package size={13} /> Ordered Items</span>
          <div className="dm-items-wrap">
            <table className="dm-items-table">
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>#</th>
                  <th style={{ textAlign: "left" }}>Product</th>
                  <th style={{ textAlign: "center" }}>Qty</th>
                  <th style={{ textAlign: "right" }}>Unit Cost</th>
                  <th style={{ textAlign: "right" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={item.id || i}>
                    <td style={{ color: "#888" }}>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>
                      {item.product?.product_name || `Product #${item.product_id}`}
                    </td>
                    <td style={{ textAlign: "center", fontWeight: 600 }}>{item.quantity}</td>
                    <td style={{ textAlign: "right" }}>LKR {Number(item.unit_price).toFixed(2)}</td>
                    <td style={{ textAlign: "right", fontWeight: 700 }}>
                      LKR {Number(item.total_price).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="dm-grid-2">
        <Field label="Total Amount"   icon={DollarSign}>
          LKR {Number(po.total_amount).toFixed(2)}
        </Field>
        <Field label="Total Quantity" icon={Package}>
          {items.reduce((s, i) => s + (i.quantity || 0), 0)}
        </Field>
      </div>

      {po.notes && <Field label="Notes">{po.notes}</Field>}
    </div>
  );
}
