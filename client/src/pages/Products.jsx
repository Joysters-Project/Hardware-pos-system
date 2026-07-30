import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { Pencil, Trash2, Eye, Plus, RefreshCw, FileDown, Layers, Settings, Check, X } from "lucide-react";
import toast from "react-hot-toast";
import api from "../api/axios";
import AdminDashboard from "./AdminDashboard";
import ManagerDashboard from "./ManagerDashboard";
import "../styles/Products.css";

/* ── helpers ── */
const toNumberOrNull = (value, parser = Number) => {
  if (value === "" || value === null || value === undefined) return null;
  return parser(value);
};

const buildPayload = (form) => ({
  product_name: form.product_name.trim(),
  unit_price: toNumberOrNull(form.unit_price, parseFloat),
  cost_price: toNumberOrNull(form.cost_price, parseFloat),
  stock_quantity: toNumberOrNull(form.stock_quantity, parseFloat),
  min_stock_quantity: toNumberOrNull(form.min_stock_quantity, parseFloat),
  reorder_level: toNumberOrNull(form.reorder_level, parseFloat),
  type: form.type.trim(),
  batch_no: form.batch_no.trim() || null,
  expiry_date: form.expiry_date || null,
  status: form.status || "active",
  category_id: toNumberOrNull(form.category_id, parseInt),
  brand_id: toNumberOrNull(form.brand_id, parseInt),
  unit_id: toNumberOrNull(form.unit_id, parseInt),
});

const EMPTY_ALT_UNIT = { unit_id: "", conversion_factor: "", unit_price: "", cost_price: "", barcode: "" };

const EDIT_FIELDS = [
  { name: "product_name", placeholder: "Product Name *", type: "text" },
  { name: "type",         placeholder: "Type *",         type: "text" },
  { name: "batch_no",     placeholder: "Batch No",        type: "text" },
  { name: "expiry_date",  placeholder: "Expiry Date",     type: "date" },
  { name: "unit_price",   placeholder: "Unit Price *",    type: "number", step: "0.01" },
  { name: "cost_price",   placeholder: "Cost Price *",    type: "number", step: "0.01" },
  { name: "stock_quantity",     placeholder: "Stock Qty *",    type: "number" },
  { name: "min_stock_quantity", placeholder: "Min Stock *",    type: "number" },
  { name: "reorder_level",      placeholder: "Reorder Level *",type: "number" },
];

/* ══════════════════════════════════════════
   Units Manager Modal
══════════════════════════════════════════ */
function UnitsManagerModal({ units, onClose, onRefresh }) {
  const [newName, setNewName]       = useState("");
  const [adding, setAdding]         = useState(false);
  const [editingId, setEditingId]   = useState(null);
  const [editName, setEditName]     = useState("");
  const [savingId, setSavingId]     = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [unitError, setUnitError]   = useState("");

  const handleAdd = async () => {
    setUnitError("");
    const name = newName.trim();
    if (!name) { setUnitError("Unit name cannot be empty."); return; }
    setAdding(true);
    try {
      await api.post("/units", { unit_name: name });
      toast.success(`Unit "${name}" added`);
      setNewName("");
      onRefresh();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || "Failed to add unit";
      setUnitError(msg);
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (u) => { setEditingId(u.unit_id); setEditName(u.unit_name); setUnitError(""); };
  const cancelEdit = () => { setEditingId(null); setEditName(""); };

  const handleSave = async (id) => {
    setUnitError("");
    const name = editName.trim();
    if (!name) { setUnitError("Unit name cannot be empty."); return; }
    setSavingId(id);
    try {
      await api.put(`/units/${id}`, { unit_name: name });
      toast.success(`Unit updated to "${name}"`);
      setEditingId(null);
      onRefresh();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || "Failed to update unit";
      setUnitError(msg);
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete unit "${name}"? This will fail if any products use it.`)) return;
    setDeletingId(id);
    try {
      await api.delete(`/units/${id}`);
      toast.success(`Unit "${name}" deleted`);
      onRefresh();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || "Failed to delete unit";
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box units-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Manage Units</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Add new unit row */}
        <div className="units-add-row">
          <input
            type="text"
            placeholder="New unit name (e.g. Box, Roll, Kg)…"
            value={newName}
            onChange={(e) => { setNewName(e.target.value); setUnitError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <button className="btn-unit-add" onClick={handleAdd} disabled={adding}>
            <Plus size={14} />
            {adding ? "Adding…" : "Add"}
          </button>
        </div>

        {unitError && <div className="unit-error-msg">{unitError}</div>}

        {/* Units list */}
        <div className="units-list">
          {units.length === 0 ? (
            <div className="units-empty">No units yet. Add one above.</div>
          ) : (
            units.map((u) => (
              <div key={u.unit_id} className="unit-list-item">
                <span className="unit-item-id">#{u.unit_id}</span>

                {editingId === u.unit_id ? (
                  <input
                    className="unit-item-edit-input"
                    value={editName}
                    autoFocus
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSave(u.unit_id);
                      if (e.key === "Escape") cancelEdit();
                    }}
                  />
                ) : (
                  <span className="unit-item-name">{u.unit_name}</span>
                )}

                <div className="unit-item-actions">
                  {editingId === u.unit_id ? (
                    <>
                      <button
                        className="btn-unit-save"
                        title="Save"
                        onClick={() => handleSave(u.unit_id)}
                        disabled={savingId === u.unit_id}
                      >
                        <Check size={13} />
                      </button>
                      <button className="btn-unit-cancel" title="Cancel" onClick={cancelEdit}>
                        <X size={13} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="btn-unit-edit" title="Edit" onClick={() => startEdit(u)}>
                        <Pencil size={12} />
                      </button>
                      <button
                        className="btn-unit-delete"
                        title="Delete"
                        onClick={() => handleDelete(u.unit_id, u.unit_name)}
                        disabled={deletingId === u.unit_id}
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="units-modal-footer">
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   Main Products Page
══════════════════════════════════════════ */
function ProductsPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const isManager = location.pathname.startsWith("/manager/");

  const [products,   setProducts]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands,     setBrands]     = useState([]);
  const [units,      setUnits]      = useState([]);
  const [search,     setSearch]     = useState("");
  const [loading,    setLoading]    = useState(false);
  const [unitsModal, setUnitsModal] = useState(false);

  /* Edit modal */
  const [editModal,  setEditModal]  = useState(false);
  const [editId,     setEditId]     = useState(null);
  const [editForm,   setEditForm]   = useState({});
  const [editAltUnits, setEditAltUnits] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  /* View modal */
  const [viewProduct, setViewProduct] = useState(null);
  const [productBatches, setProductBatches] = useState([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const printRef = useRef(null);

  const openView = useCallback(async (p) => {
    setViewProduct(p);
    setProductBatches([]);
    setBatchesLoading(true);
    try {
      const [prodRes, batchRes] = await Promise.allSettled([
        api.get(`/products/${p.product_id}`),
        api.get(`/batch-inventory/product/${p.product_id}`)
      ]);
      if (prodRes.status === "fulfilled" && prodRes.value?.data) {
        setViewProduct(prodRes.value.data);
      }
      if (batchRes.status === "fulfilled" && Array.isArray(batchRes.value?.data)) {
        setProductBatches(batchRes.value.data);
      } else {
        setProductBatches([]);
      }
    } catch {
      setProductBatches([]);
    } finally {
      setBatchesLoading(false);
    }
  }, []);


  /* ── data loading ── */
  const loadPageData = async () => {
    setLoading(true);
    try {
      const [productsRes, categoryRes, brandsRes, unitsRes] = await Promise.all([
        api.get("/products"),
        api.get("/category"),
        api.get("/brands"),
        api.get("/units"),
      ]);
      setProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
      setCategories(Array.isArray(categoryRes.data) ? categoryRes.data : []);
      setBrands(Array.isArray(brandsRes.data) ? brandsRes.data : []);
      setUnits(Array.isArray(unitsRes.data) ? unitsRes.data : []);
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPageData(); }, []);

  /* Only refresh units list (for units manager without reloading everything) */
  const refreshUnits = async () => {
    try {
      const res = await api.get("/units");
      setUnits(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Failed to refresh units");
    }
  };

  /* ── computed maps ── */
  const categoryMap = useMemo(() => new Map(categories.map((c) => [Number(c.category_id), c.category_name])), [categories]);
  const brandMap    = useMemo(() => new Map(brands.map((b)    => [Number(b.brand_id),    b.brand_name])),    [brands]);
  const unitMap     = useMemo(() => new Map(units.map((u)     => [Number(u.unit_id),     u.unit_name])),     [units]);

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

  /* ── Edit helpers ── */
  const openEdit = (p) => {
    setEditForm({
      product_name:       p.product_name       || "",
      unit_price:         p.unit_price          ?? "",
      cost_price:         p.cost_price          ?? "",
      stock_quantity:     p.stock_quantity      ?? "",
      min_stock_quantity: p.min_stock_quantity  ?? "",
      reorder_level:      p.reorder_level       ?? "",
      type:               p.type               || "",
      batch_no:           p.batch_no           || "",
      expiry_date:        p.expiry_date ? String(p.expiry_date).slice(0, 10) : "",
      status:             p.status             || "active",
      category_id:        p.category_id         ?? "",
      brand_id:           p.brand_id            ?? "",
      unit_id:            p.unit_id             ?? "",
    });
    setEditAltUnits(
      Array.isArray(p.alternative_units)
        ? p.alternative_units.map((au) => ({
            unit_id:           au.unit_id?.toString()          || "",
            conversion_factor: au.conversion_factor?.toString() || "",
            unit_price:        au.unit_price?.toString()        || "",
            cost_price:        au.cost_price?.toString()        || "",
            barcode:           au.barcode                       || "",
          }))
        : []
    );
    setEditId(p.product_id);
    setEditModal(true);
  };

  const handleEditFieldChange = (e) =>
    setEditForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleAltUnitChange = (idx, field, value) =>
    setEditAltUnits((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));

  const addAltUnitRow    = () => setEditAltUnits((prev) => [...prev, { ...EMPTY_ALT_UNIT }]);
  const removeAltUnitRow = (idx) => setEditAltUnits((prev) => prev.filter((_, i) => i !== idx));

  const saveEdit = async (e) => {
    e.preventDefault();
    const required = ["product_name", "unit_price", "cost_price", "stock_quantity", "min_stock_quantity", "reorder_level", "type", "category_id", "unit_id"];
    for (const f of required) {
      if (!String(editForm[f] ?? "").trim()) {
        toast.error("Please fill all required fields.");
        return;
      }
    }
    /* validate alt units */
    for (const au of editAltUnits) {
      if (!au.unit_id || !au.conversion_factor || parseFloat(au.conversion_factor) <= 0) {
        toast.error("Each alternative unit needs a unit and a positive conversion factor.");
        return;
      }
    }
    const altUnitsPayload = editAltUnits.map((au) => ({
      unit_id:           parseInt(au.unit_id),
      conversion_factor: parseFloat(au.conversion_factor),
      unit_price:        au.unit_price  ? parseFloat(au.unit_price)  : null,
      cost_price:        au.cost_price  ? parseFloat(au.cost_price)  : null,
      barcode:           au.barcode || null,
    }));

    setSubmitting(true);
    try {
      await api.put(`/products/${editId}`, { ...buildPayload(editForm), alternative_units: altUnitsPayload });
      toast.success("Product updated");
      setEditModal(false);
      await loadPageData();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to update product");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Delete ── */
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

  /* ── PDF export ── */
  const exportPDF = () => {
    if (!viewProduct) return;
    const altUnitsHTML =
      Array.isArray(viewProduct.alternative_units) && viewProduct.alternative_units.length
        ? `<div class="section-title">Alternative Packaging Units</div>
           <table>
             <tr>
               <td style="font-weight:700;color:#8b3a3a;">Unit</td>
               <td style="font-weight:700;color:#8b3a3a;">Conversion</td>
               <td style="font-weight:700;color:#8b3a3a;">Sell Price</td>
               <td style="font-weight:700;color:#8b3a3a;">Cost Price</td>
               <td style="font-weight:700;color:#8b3a3a;">Barcode</td>
             </tr>
             ${viewProduct.alternative_units.map((au) => `
               <tr>
                 <td>${au.unit_details?.unit_name || unitMap.get(Number(au.unit_id)) || au.unit_id}</td>
                 <td>1 = ${au.conversion_factor} base</td>
                 <td>${au.unit_price != null ? "Rs. " + Number(au.unit_price).toFixed(2) : "—"}</td>
                 <td>${au.cost_price != null ? "Rs. " + Number(au.cost_price).toFixed(2) : "—"}</td>
                 <td>${au.barcode || "—"}</td>
               </tr>`).join("")}
           </table>`
        : "";

    const win = window.open("", "_blank", "width=800,height=700");
    win.document.write(`<!DOCTYPE html><html><head><title>Product Details — #${viewProduct.product_id}</title>
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
    ${altUnitsHTML}
    <div class="footer">This document was generated from Hardware POS System • Product #${viewProduct.product_id}</div>
    </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  /* ══════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════ */
  return (
    <div className="products-container">
      {/* Header */}
      <div className="products-header">
        <h1>Products</h1>
        <div className="header-actions">
          <button className="refresh-btn" onClick={loadPageData} disabled={loading}>
            <RefreshCw size={15} />
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <button className="manage-units-btn" onClick={() => setUnitsModal(true)}>
            <Settings size={15} />
            Manage Units
          </button>
          <button
            className="add-product-btn"
            onClick={() => navigate(isManager ? "/manager/products/add" : "/products/add")}
          >
            <Plus size={16} />
            Add Product
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="search-bar-wrap">
        <input
          className="search"
          placeholder="Search by ID, name, type, or batch…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
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
              <th>Expiry Date</th>
              <th>Min Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="11" className="empty-row">Loading…</td></tr>
            ) : filteredProducts.length === 0 ? (
              <tr><td colSpan="11" className="empty-row">No products found.</td></tr>
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
                <td>{p.expiry_date ? new Date(p.expiry_date).toLocaleDateString() : "—"}</td>
                <td>{p.min_stock_quantity ?? 0}</td>
                <td>
                  <span className={`status-pill ${String(p.status).toLowerCase() === "inactive" ? "inactive" : "active"}`}>
                    {String(p.status).toLowerCase() === "inactive" ? "Inactive" : "Active"}
                  </span>
                </td>
                <td>
                  <div className="action-btns">
                    <button className="icon-btn view" title="View" onClick={() => openView(p)}>
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

      {editModal && createPortal(
        <div className="modal-overlay">
          <div className="modal-box edit-product-modal">
            <div className="modal-header">
              <h2>Edit Product: #{editId}</h2>
              <button className="modal-close" onClick={() => setEditModal(false)}>×</button>
            </div>

            <form className="modal-form" onSubmit={saveEdit} style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>

              {/* ── Basic Information ── */}
              <div className="modal-section-title">Basic Information</div>

              {EDIT_FIELDS.map((f) => (
                <div key={f.name} className="modal-field">
                  <label>{f.placeholder}</label>
                  <input
                    name={f.name}
                    type={f.type}
                    step={f.step}
                    value={editForm[f.name] ?? ""}
                    onChange={handleEditFieldChange}
                  />
                </div>
              ))}

              {/* ── Classification ── */}
              <div className="modal-section-title">Classification</div>

              <div className="modal-field">
                <label>Category *</label>
                <select name="category_id" value={editForm.category_id ?? ""} onChange={handleEditFieldChange}>
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
                  ))}
                </select>
              </div>

              <div className="modal-field">
                <label>Brand</label>
                <select name="brand_id" value={editForm.brand_id ?? ""} onChange={handleEditFieldChange}>
                  <option value="">Select Brand (optional)</option>
                  {brands.map((b) => (
                    <option key={b.brand_id} value={b.brand_id}>{b.brand_name}</option>
                  ))}
                </select>
              </div>

              <div className="modal-field">
                <label>Base Unit *</label>
                <select name="unit_id" value={editForm.unit_id ?? ""} onChange={handleEditFieldChange}>
                  <option value="">Select Unit</option>
                  {units.map((u) => (
                    <option key={u.unit_id} value={u.unit_id}>{u.unit_name}</option>
                  ))}
                </select>
              </div>

              <div className="modal-field">
                <label>Status</label>
                <select name="status" value={editForm.status ?? "active"} onChange={handleEditFieldChange}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* ── Alternative Packaging Units ── */}
              <div className="modal-section-title">Alternative Packaging Units</div>

              <div className="alt-unit-rows-wrap">
                {editAltUnits.length > 0 && (
                  <div className="alt-unit-col-headers">
                    <span className="alt-unit-col-header">Unit</span>
                    <span className="alt-unit-col-header">Conv. Factor</span>
                    <span className="alt-unit-col-header">Sell Price</span>
                    <span className="alt-unit-col-header">Cost Price</span>
                    <span className="alt-unit-col-header">Barcode</span>
                    <span className="alt-unit-col-header"></span>
                  </div>
                )}

                {editAltUnits.length === 0 && (
                  <div className="alt-unit-empty-hint">No alternative units. Click below to add one.</div>
                )}

                {editAltUnits.map((au, idx) => (
                  <div key={idx} className="alt-unit-edit-row">
                    <div className="modal-field">
                      <select
                        value={au.unit_id}
                        onChange={(e) => handleAltUnitChange(idx, "unit_id", e.target.value)}
                      >
                        <option value="">Select Unit</option>
                        {units.map((u) => (
                          <option
                            key={u.unit_id}
                            value={u.unit_id}
                            disabled={parseInt(u.unit_id) === parseInt(editForm.unit_id)}
                          >
                            {u.unit_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="modal-field">
                      <input
                        type="number"
                        min="0.0001"
                        step="0.0001"
                        placeholder="e.g. 12"
                        value={au.conversion_factor}
                        onChange={(e) => handleAltUnitChange(idx, "conversion_factor", e.target.value)}
                      />
                    </div>
                    <div className="modal-field">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Optional"
                        value={au.unit_price}
                        onChange={(e) => handleAltUnitChange(idx, "unit_price", e.target.value)}
                      />
                    </div>
                    <div className="modal-field">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Optional"
                        value={au.cost_price}
                        onChange={(e) => handleAltUnitChange(idx, "cost_price", e.target.value)}
                      />
                    </div>
                    <div className="modal-field">
                      <input
                        type="text"
                        placeholder="Barcode (optional)"
                        value={au.barcode}
                        onChange={(e) => handleAltUnitChange(idx, "barcode", e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      className="btn-remove-alt-unit"
                      title="Remove"
                      onClick={() => removeAltUnitRow(idx)}
                    >
                      ×
                    </button>
                  </div>
                ))}

                <button type="button" className="btn-add-alt-unit" onClick={addAltUnitRow}>
                  <Plus size={14} /> Add Alternative Unit
                </button>
              </div>

              {/* ── Footer ── */}
              <div className="modal-footer">
                <button type="button" className="modal-cancel" onClick={() => setEditModal(false)}>Cancel</button>
                <button type="submit" className="modal-save" disabled={submitting}>
                  {submitting ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {viewProduct && createPortal(
        <div className="modal-overlay" onClick={() => setViewProduct(null)}>
          <div className="modal-box view-modal" style={{ maxWidth: 620 }} onClick={(e) => e.stopPropagation()} ref={printRef}>
            <div className="modal-header">
              <h2>Product Details</h2>
              <div className="view-header-actions">
                {viewProduct.status !== "deleted" && (
                  <button className="export-pdf-btn" onClick={exportPDF}>
                    <FileDown size={14} /> Export PDF
                  </button>
                )}
                <button className="modal-close" onClick={() => setViewProduct(null)}>×</button>
              </div>
            </div>

            <div className="view-section">
              <p className="view-section-title">Basic Information</p>
              <div className="view-grid">
                {[
                  ["Product ID", `#${viewProduct.product_id}`],
                  ["Product Name", viewProduct.product_name],
                  ["Category", categoryMap.get(Number(viewProduct.category_id)) || viewProduct.category?.category_name || "—"],
                  ["Brand", brandMap.get(Number(viewProduct.brand_id)) || viewProduct.brand?.brand_name || "—"],
                  ["Base Unit", unitMap.get(Number(viewProduct.unit_id)) || viewProduct.unit?.unit_name || "—"],
                  ["Type", viewProduct.type || "—"],
                  ["Batch No", viewProduct.batch_no || "—"],
                  ["Stock Qty", viewProduct.stock_quantity ?? "0"],
                  ["Min Stock Qty", viewProduct.min_stock_quantity ?? "0"],
                  ["Reorder Level", viewProduct.reorder_level ?? "0"],
                  ["Status", <span key="s" className={`status-pill ${String(viewProduct.status).toLowerCase() === "inactive" ? "inactive" : "active"}`}>{String(viewProduct.status).toLowerCase() === "inactive" ? "Inactive" : "Active"}</span>],
                ].map(([label, value]) => (
                  <div className="view-row" key={label}>
                    <span className="view-label">{label}</span>
                    <span className="view-value">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing & Financial Details Section */}
            <div className="view-section">
              <p className="view-section-title">Pricing & Financial Details</p>
              <div className="view-grid">
                {(() => {
                  const sellPrice = Number(viewProduct.unit_price || 0);
                  const costPrice = Number(viewProduct.cost_price || 0);
                  const profitUnit = sellPrice - costPrice;
                  const marginPct = costPrice > 0 ? ((profitUnit / costPrice) * 100).toFixed(1) : 0;
                  const stockQty  = Number(viewProduct.stock_quantity || 0);
                  const totalSellVal = sellPrice * stockQty;
                  const totalCostVal = costPrice * stockQty;

                  return [
                    ["Selling Price (Unit)", `Rs. ${sellPrice.toFixed(2)}`],
                    ["Cost Price (Unit)", `Rs. ${costPrice.toFixed(2)}`],
                    ["Unit Profit Margin", <span key="p" style={{ color: profitUnit >= 0 ? "#1d7e42" : "#c62828", fontWeight: 700 }}>Rs. {profitUnit.toFixed(2)} ({marginPct}%)</span>],
                    ["Total Stock Selling Value", `Rs. ${totalSellVal.toFixed(2)}`],
                    ["Total Stock Cost Value", `Rs. ${totalCostVal.toFixed(2)}`],
                  ].map(([label, value]) => (
                    <div className="view-row" key={label}>
                      <span className="view-label">{label}</span>
                      <span className="view-value">{value}</span>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Alternative Units Section */}
            <div className="view-section">
              <p className="view-section-title">Alternative Units</p>
              {!viewProduct.alternative_units || viewProduct.alternative_units.length === 0 ? (
                <p style={{ fontSize: "0.85rem", color: "#aaa", padding: "0.5rem 0" }}>No alternative units configured for this product.</p>
              ) : (
                <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid #f0e0e0" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                    <thead>
                      <tr style={{ background: "linear-gradient(135deg,#8b3a3a,#a84545)", color: "#fff" }}>
                        <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 600 }}>Unit</th>
                        <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 600 }}>Conversion</th>
                        <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 600 }}>Selling Price</th>
                        <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 600 }}>Cost Price</th>
                        <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 600 }}>Barcode</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewProduct.alternative_units.map((au, i) => {
                        const uName = au.unit_details?.unit_name || unitMap.get(Number(au.unit_id)) || `Unit #${au.unit_id}`;
                        const baseName = viewProduct.unit?.unit_name || unitMap.get(Number(viewProduct.unit_id)) || "base unit";
                        return (
                          <tr key={au.product_unit_id || i} style={{ background: i % 2 === 0 ? "#fff" : "#fdf8f8", borderTop: "1px solid #f5f0f0" }}>
                            <td style={{ padding: "5px 8px", fontWeight: 600 }}>{uName}</td>
                            <td style={{ padding: "5px 8px" }}>1 {uName} = {au.conversion_factor} {baseName}</td>
                            <td style={{ padding: "5px 8px" }}>{au.unit_price != null ? `Rs. ${Number(au.unit_price).toFixed(2)}` : "—"}</td>
                            <td style={{ padding: "5px 8px" }}>{au.cost_price != null ? `Rs. ${Number(au.cost_price).toFixed(2)}` : "—"}</td>
                            <td style={{ padding: "5px 8px" }}>{au.barcode || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="view-section">
              <p className="view-section-title">Batch History</p>
              {batchesLoading ? (
                <p style={{ fontSize: "0.85rem", color: "#888", padding: "0.5rem 0" }}>Loading batches...</p>
              ) : productBatches.length === 0 ? (
                <p style={{ fontSize: "0.85rem", color: "#aaa", padding: "0.5rem 0" }}>No batches found for this product.</p>
              ) : (
                <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid #f0e0e0" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                    <thead>
                      <tr style={{ background: "linear-gradient(135deg,#8b3a3a,#a84545)", color: "#fff" }}>
                        {["Batch", "Supplier", "PO", "Buy Price", "Rcvd", "Rem", "Rcvd Date", "Expiry", "Status"].map(h => (
                          <th key={h} style={{ padding: "6px 8px", textAlign: "left", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {productBatches.map((b, i) => {
                        const BSTYLE = { Active: { background: "#e5f7eb", color: "#1d7e42" }, "Low Stock": { background: "#fff3e0", color: "#e65100" }, Expired: { background: "#fdecea", color: "#c62828" }, Disposed: { background: "#f0f0f0", color: "#888" } };
                        return (
                          <tr key={b.batch_id} style={{ background: i % 2 === 0 ? "#fff" : "#fdf8f8", borderTop: "1px solid #f5f0f0" }}>
                            <td style={{ padding: "5px 8px", fontWeight: 600 }}>{b.batch_number}</td>
                            <td style={{ padding: "5px 8px" }}>{b.supplier?.supplier_name || "—"}</td>
                            <td style={{ padding: "5px 8px" }}>{b.purchase_order?.po_number || "—"}</td>
                            <td style={{ padding: "5px 8px" }}>Rs.{Number(b.purchase_price || 0).toFixed(2)}</td>
                            <td style={{ padding: "5px 8px" }}>{b.received_quantity}</td>
                            <td style={{ padding: "5px 8px", fontWeight: 700 }}>{b.remaining_quantity}</td>
                            <td style={{ padding: "5px 8px" }}>{b.received_date ? new Date(b.received_date).toLocaleDateString("en-GB") : "—"}</td>
                            <td style={{ padding: "5px 8px" }}>{b.expiry_date ? new Date(b.expiry_date).toLocaleDateString("en-GB") : "—"}</td>
                            <td style={{ padding: "5px 8px" }}><span className="status-pill" style={BSTYLE[b.status] || {}}>{b.status}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ═══════════════════════════════════
          UNITS MANAGER MODAL
      ═══════════════════════════════════ */}
      {unitsModal && (
        <UnitsManagerModal
          units={units}
          onClose={() => setUnitsModal(false)}
          onRefresh={async () => {
            await refreshUnits();
          }}
        />
      )}
    </div>
  );
}

/* ── Layout wrapper ── */
export default function Products() {
  const location      = useLocation();
  const isManagerRoute = location.pathname.startsWith("/manager/");
  const role = (localStorage.getItem("role") || "admin").toLowerCase();
  const Layout = isManagerRoute || role === "manager" ? ManagerDashboard : AdminDashboard;

  return (
    <Layout active="products">
      <ProductsPage />
    </Layout>
  );
}
