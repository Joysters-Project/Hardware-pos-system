import { useEffect, useState } from "react";
import { Package, Tag, DollarSign, Boxes, Hash, Calendar } from "lucide-react";
import { productService } from "../services/api";

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

export default function ProductDetailContent({ productId }) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    productService
      .getById(productId)
      .then((res) => setProduct(res.data))
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading) {
    return (
      <div className="dm-skeleton">
        {[180, "100%", "100%", "100%", "100%", "100%"].map((w, i) => (
          <div key={i} className="dm-skeleton-box" style={{ width: w, height: i === 0 ? 16 : 40 }} />
        ))}
      </div>
    );
  }

  if (!product) {
    return <p style={{ color: "#888", margin: 0 }}>Product could not be loaded.</p>;
  }

  const expiryDisplay = product.expiry_date
    ? new Date(product.expiry_date).toLocaleDateString()
    : null;

  const statusDisplay = String(product.status).toLowerCase() === 'inactive' ? 'Inactive' : 'Active';

  return (
    <div className="dm-section">
      <Field label="Product Name" icon={Tag}>{product.product_name}</Field>

      <div className="dm-grid-3">
        <Field label="Product Type"  icon={Package}>{product.type}</Field>
        <Field label="Batch Number"  icon={Hash}>{product.batch_number}</Field>
        <Field label="Expiry Date"   icon={Calendar}>{expiryDisplay}</Field>
      </div>

      <div className="dm-grid-2">
        <Field label="Cost Price"    icon={DollarSign}>
          {product.cost_price != null ? `LKR ${Number(product.cost_price).toFixed(2)}` : null}
        </Field>
        <Field label="Selling Price" icon={DollarSign}>
          {product.unit_price != null ? `LKR ${Number(product.unit_price).toFixed(2)}` : null}
        </Field>
      </div>

      <div className="dm-grid-3">
        <Field label="Category">{product.category?.category_name}</Field>
        <Field label="Brand">{product.brand?.brand_name}</Field>
        <Field label="Unit">{product.unit?.unit_name}</Field>
      </div>

      <div className="dm-grid-3">
        <Field label="Current Stock"  icon={Boxes}>{product.stock_quantity}</Field>
        <Field label="Min Stock"      icon={Boxes}>{product.min_stock_quantity}</Field>
        <Field label="Reorder Level"  icon={Boxes}>{product.reorder_level}</Field>
      </div>

      <Field label="Status">{statusDisplay}</Field>
    </div>
  );
}
