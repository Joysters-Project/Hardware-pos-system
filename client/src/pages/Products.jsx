import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Pencil, Trash2, Eye, Plus, RefreshCw, FileDown } from "lucide-react";
import toast from "react-hot-toast";
import api from "../api/axios";
import AdminDashboard from "./AdminDashboard";
import ManagerDashboard from "./ManagerDashboard";
import "../styles/Products.css";

const toNumberOrNull = (value, parser = Number) => {
  if (value === "" || value === null || value === undefined) return null;
  return parser(value);
};

const buildPayload = (form) => ({
  product_name: form.product_name.trim(),
  unit_price: toNumberOrNull(form.unit_price, parseFloat),
  cost_price: toNumberOrNull(form.cost_price, parseFloat),
  stock_quantity: toNumberOrNull(form.stock_quantity, parseInt),
  min_stock_quantity: toNumberOrNull(form.min_stock_quantity, parseInt),
  reorder_level: toNumberOrNull(form.reorder_level, parseInt),
  type: form.type.trim(),
  batch_no: form.batch_no.trim() || null,
  status: form.status || "active",
  category_id: toNumberOrNull(form.category_id, parseInt),
  brand_id: toNumberOrNull(form.brand_id, parseInt),
  unit_id: toNumberOrNull(form.unit_id, parseInt),
});

const EDIT_FIELDS = [
  { name: "product_name", placeholder: "Product Name *", type: "text" },
  { name: "unit_price", placeholder: "Unit Price *", type: "number", step: "0.01" },
  { name: "cost_price", placeholder: "Cost Price *", type: "number", step: "0.01" },
  { name: "stock_quantity", placeholder: "Stock Qty *", type: "number" },
  { name: "min_stock_quantity", placeholder: "Min Stock *", type: "number" },
  { name: "reorder_level", placeholder: "Reorder Level *", type: "number" },
  { name: "type", placeholder: "Type *", type: "text" },
  { name: "batch_no", placeholder: "Batch No", type: "text" },
];

function ProductsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isManager = location.pathname.startsWith("/manager/");

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [units, setUnits] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // Edit modal state
  const [editModal, setEditModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // View modal state
  const [viewProduct, setViewProduct] = useState(null);
  const printRef = useRef(null);

  const exportPDF = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    const win = window.open("", "_blank", "width=800,height=700");
    win.document.write(`
			<!DOCTYPE html><html><head><title>Product Details — #${viewProduct.product_id}</title>
			<style>
				* { margin: 0; padding: 0; box-sizing: border-box; }
				body { font-family: 'Segoe UI', sans-serif; background: #fff; color: #222; padding: 36px; }
				.pdf-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #8b3a3a; padding-bottom: 16px; margin-bottom: 24px; }
				.pdf-header h1 { font-size: 22px; color: #8b3a3a; font-weight: 700; }
				.pdf-header p { font-size: 12px; color: #888; margin-top: 4px; }
				.pdf-meta { text-align: right; font-size: 12px; color: #888; }
				.section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #8b3a3a; margin: 20px 0 8px; border-bottom: 1px solid #f0e0e0; padding-bottom: 4px; }
				table { width: 100%; border-collapse: collapse; }
				tr:nth-child(even) td { background: #fdf8f8; }
				td { padding: 9px 14px; font-size: 13px; border-bottom: 1px solid #f0f0f0; }
				td:first-child { color: #777; font-weight: 600; width: 42%; }
				td:last-child { color: #222; font-weight: 500; }
				.badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
				.badge.active { background: #e5f7eb; color: #1d7e42; }
				.badge.inactive { background: #f8e7e7; color: #a13232; }
				.footer { margin-top: 32px; text-align: center; font-size: 11px; color: #aaa; border-top: 1px solid #f0f0f0; padding-top: 12px; }
			</style></head><body>
			<div class="pdf-header">
				<div><h1>Product Details</h1><p>Hardware POS System</p></div>
				<div class="pdf-meta">Generated: ${new Date().toLocaleString()}</div>
			</div>
			<div class="section-title">Basic Information</div>
			<table>
				<tr><td>Product ID</td><td>#${viewProduct.product_id}</td></tr>
				<tr><td>Product Name</td><td>${viewProduct.product_name || "—"}</td></tr>
				<tr><td>Type</td><td>${viewProduct.type || "—"}</td></tr>
				<tr><td>Batch No</td><td>${viewProduct.batch_no || "—"}</td></tr>
				<tr><td>Status</td><td><span class="badge ${String(viewProduct.status).toLowerCase()}">${viewProduct.status || "active"}</span></td></tr>
			</table>
			<div class="section-title">Classification</div>
			<table>
				<tr><td>Category</td><td>${categoryMap.get(Number(viewProduct.category_id)) || "—"}</td></tr>
				<tr><td>Brand</td><td>${brandMap.get(Number(viewProduct.brand_id)) || "—"}</td></tr>
				<tr><td>Unit</td><td>${unitMap.get(Number(viewProduct.unit_id)) || "—"}</td></tr>
			</table>
			<div class="section-title">Pricing</div>
			<table>
				<tr><td>Unit Price</td><td>Rs. ${Number(viewProduct.unit_price || 0).toFixed(2)}</td></tr>
				<tr><td>Cost Price</td><td>Rs. ${Number(viewProduct.cost_price || 0).toFixed(2)}</td></tr>
			</table>
			<div class="section-title">Stock Details</div>
			<table>
				<tr><td>Stock Quantity</td><td>${viewProduct.stock_quantity ?? 0}</td></tr>
				<tr><td>Min Stock</td><td>${viewProduct.min_stock_quantity ?? 0}</td></tr>
				<tr><td>Reorder Level</td><td>${viewProduct.reorder_level ?? 0}</td></tr>
			</table>
			<div class="footer">This document was generated from Hardware POS System &bull; Product #${viewProduct.product_id}</div>
			</body></html>
		`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const loadPageData = async () => {
    setLoading(true);
    try {
      const [productsRes, categoryRes, brandsRes, unitsRes] = await Promise.all([
        api.get("/products"),
        api.get("/category"),
        api.get("/brands"),
        api.get("/units"),
      ]);
      const normalize = (res) => {
        if (Array.isArray(res.data)) return res.data;
        if (Array.isArray(res.data?.data)) return res.data.data;
        return [];
      };
      setProducts(normalize(productsRes));
      setCategories(normalize(categoryRes));
      setBrands(normalize(brandsRes));
      setUnits(normalize(unitsRes));
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPageData(); }, []);

  const categoryMap = useMemo(() => new Map(categories.map((c) => [Number(c.category_id), c.category_name])), [categories]);
  const brandMap = useMemo(() => new Map(brands.map((b) => [Number(b.brand_id), b.brand_name])), [brands]);
  const unitMap = useMemo(() => new Map(units.map((u) => [Number(u.unit_id), u.unit_name])), [units]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...products]
      .sort((a, b) => Number(a.product_id) - Number(b.product_id))
      .filter((p) => !q || (
        String(p.product_id).includes(q) ||
        String(p.product_name || "").toLowerCase().includes(q) ||
        String(p.type || "").toLowerCase().includes(q) ||
        String(p.batch_no || "").toLowerCase().includes(q)
      ));
  }, [products, search]);

  const openEdit = (p) => {
    setEditForm({
      product_name: p.product_name || "",
      unit_price: p.unit_price ?? "",
      cost_price: p.cost_price ?? "",
      stock_quantity: p.stock_quantity ?? "",
      min_stock_quantity: p.min_stock_quantity ?? "",
      reorder_level: p.reorder_level ?? "",
      type: p.type || "",
      batch_no: p.batch_no || "",
      status: p.status || "active",
      category_id: p.category_id ?? "",
      brand_id: p.brand_id ?? "",
      unit_id: p.unit_id ?? "",
    });
    setEditId(p.product_id);
    setEditModal(true);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    const required = ["product_name", "unit_price", "cost_price", "stock_quantity", "min_stock_quantity", "reorder_level", "type", "category_id", "unit_id"];
    for (const f of required) {
      if (!String(editForm[f] ?? "").trim()) {
        toast.error("Please fill all required fields.");
        return;
      }
    }
    setSubmitting(true);
    try {
      await api.put(`/products/${editId}`, buildPayload(editForm));
      toast.success("Product updated");
      setEditModal(false);
      await loadPageData();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to update product");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success("Product deleted");
      await loadPageData();
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to delete product");
    }
  };

  return (
    <div className="products-container">
      <div className="products-header">
        <h1>Products</h1>
        <div className="header-actions">
          <button className="refresh-btn" onClick={loadPageData} disabled={loading}>
            <RefreshCw size={15} />
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button className="add-product-btn" onClick={() => navigate(isManager ? "/manager/products/add" : "/products/add")}>
            <Plus size={16} />
            Add Product
          </button>
        </div>
      </div>

      <div className="search-bar-wrap">
        <input
          className="search"
          placeholder="Search by ID, name, type, or batch..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="table-wrap">
        <table className="products-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Category</th>
              <th>Brand</th>
              <th>Unit</th>
              <th>Price</th>
              <th>Stock Qty</th>
              <th>Min Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="10" className="empty-row">Loading...</td></tr>
            ) : filteredProducts.length === 0 ? (
              <tr><td colSpan="10" className="empty-row">No products found.</td></tr>
            ) : filteredProducts.map((p) => (
              <tr key={p.product_id}>
                <td><span className="id-badge">#{p.product_id}</span></td>
                <td className="name-cell">{p.product_name}</td>
                <td>{categoryMap.get(Number(p.category_id)) || "—"}</td>
                <td>{brandMap.get(Number(p.brand_id)) || "—"}</td>
                <td>{unitMap.get(Number(p.unit_id)) || "—"}</td>
                <td className="price-cell">Rs. {Number(p.unit_price || 0).toFixed(2)}</td>
                <td>
                  <span className={`stock-badge ${p.stock_quantity <= p.min_stock_quantity ? "low" : ""}`}>
                    {p.stock_quantity ?? 0}
                  </span>
                </td>
                <td>{p.min_stock_quantity ?? 0}</td>
                <td>
                  <span className={`status-pill ${String(p.status).toLowerCase() === "active" ? "active" : "inactive"}`}>
                    {p.status || "active"}
                  </span>
                </td>
                <td>
                  <div className="action-btns">
                    <button className="icon-btn view" title="View" onClick={() => setViewProduct(p)}>
                      <Eye size={15} />
                    </button>
                    <button className="icon-btn edit" title="Edit" onClick={() => openEdit(p)}>
                      <Pencil size={15} />
                    </button>
                    <button className="icon-btn delete" title="Delete" onClick={() => deleteProduct(p.product_id)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editModal && (
        <div className="modal-overlay" onClick={() => setEditModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Product</h2>
              <button className="modal-close" onClick={() => setEditModal(false)}>✕</button>
            </div>
            <form className="modal-form" onSubmit={saveEdit}>
              {EDIT_FIELDS.map((f) => (
                <div className="modal-field" key={f.name}>
                  <label>{f.placeholder}</label>
                  <input
                    name={f.name}
                    type={f.type}
                    step={f.step}
                    min={f.type === "number" ? "0" : undefined}
                    placeholder={f.placeholder}
                    value={editForm[f.name]}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))}
                  />
                </div>
              ))}
              <div className="modal-field">
                <label>Category *</label>
                <select name="category_id" value={editForm.category_id} onChange={(e) => setEditForm((p) => ({ ...p, category_id: e.target.value }))}>
                  <option value="">Select Category</option>
                  {categories.map((c) => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
                </select>
              </div>
              <div className="modal-field">
                <label>Brand</label>
                <select name="brand_id" value={editForm.brand_id} onChange={(e) => setEditForm((p) => ({ ...p, brand_id: e.target.value }))}>
                  <option value="">Select Brand</option>
                  {brands.map((b) => <option key={b.brand_id} value={b.brand_id}>{b.brand_name}</option>)}
                </select>
              </div>
              <div className="modal-field">
                <label>Unit *</label>
                <select name="unit_id" value={editForm.unit_id} onChange={(e) => setEditForm((p) => ({ ...p, unit_id: e.target.value }))}>
                  <option value="">Select Unit</option>
                  {units.map((u) => <option key={u.unit_id} value={u.unit_id}>{u.unit_name}</option>)}
                </select>
              </div>
              <div className="modal-field">
                <label>Status</label>
                <select name="status" value={editForm.status} onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="modal-cancel" onClick={() => setEditModal(false)}>Cancel</button>
                <button type="submit" className="modal-save" disabled={submitting}>{submitting ? "Saving..." : "Save Changes"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewProduct && (
        <div className="modal-overlay" onClick={() => setViewProduct(null)}>
          <div className="modal-box view-modal" onClick={(e) => e.stopPropagation()} ref={printRef}>
            <div className="modal-header">
              <h2>Product Details</h2>
              <div className="view-header-actions">
                <button className="export-pdf-btn" onClick={exportPDF} title="Export as PDF">
                  <FileDown size={15} />
                  Export PDF
                </button>
                <button className="modal-close" onClick={() => setViewProduct(null)}>✕</button>
              </div>
            </div>

            <div className="view-section">
              <p className="view-section-title">Basic Information</p>
              <div className="view-grid">
                {[
                  ["Product ID", `#${viewProduct.product_id}`],
                  ["Product Name", viewProduct.product_name],
                  ["Type", viewProduct.type || "—"],
                  ["Batch No", viewProduct.batch_no || "—"],
                  ["Status", <span key="s" className={`status-pill ${String(viewProduct.status).toLowerCase() === "active" ? "active" : "inactive"}`}>{viewProduct.status || "active"}</span>],
                ].map(([label, value]) => (
                  <div className="view-row" key={label}>
                    <span className="view-label">{label}</span>
                    <span className="view-value">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="view-section">
              <p className="view-section-title">Classification</p>
              <div className="view-grid">
                {[
                  ["Category", categoryMap.get(Number(viewProduct.category_id)) || "—"],
                  ["Brand", brandMap.get(Number(viewProduct.brand_id)) || "—"],
                  ["Unit", unitMap.get(Number(viewProduct.unit_id)) || "—"],
                ].map(([label, value]) => (
                  <div className="view-row" key={label}>
                    <span className="view-label">{label}</span>
                    <span className="view-value">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="view-section">
              <p className="view-section-title">Pricing</p>
              <div className="view-grid">
                {[
                  ["Unit Price", `Rs. ${Number(viewProduct.unit_price || 0).toFixed(2)}`],
                  ["Cost Price", `Rs. ${Number(viewProduct.cost_price || 0).toFixed(2)}`],
                ].map(([label, value]) => (
                  <div className="view-row" key={label}>
                    <span className="view-label">{label}</span>
                    <span className="view-value">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="view-section">
              <p className="view-section-title">Stock Details</p>
              <div className="view-grid">
                {[
                  ["Stock Quantity", viewProduct.stock_quantity ?? 0],
                  ["Min Stock", viewProduct.min_stock_quantity ?? 0],
                  ["Reorder Level", viewProduct.reorder_level ?? 0],
                ].map(([label, value]) => (
                  <div className="view-row" key={label}>
                    <span className="view-label">{label}</span>
                    <span className="view-value">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Products() {
  const location = useLocation();
  const isManagerRoute = location.pathname.startsWith("/manager/");
  const role = (localStorage.getItem("role") || "admin").toLowerCase();
  const Layout = isManagerRoute || role === "manager" ? ManagerDashboard : AdminDashboard;

  return (
    <Layout active="products">
      <ProductsPage />
    </Layout>
  );
}
