import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Pencil, Trash2, Eye, Plus, RefreshCw, FileDown } from "lucide-react";
import toast from "react-hot-toast";
import api from "../api/axios";
import AdminDashboard from "./AdminDashboard";
import ManagerDashboard from "./ManagerDashboard";
import "../styles/Products.css";

const INITIAL_FORM = {
	product_name: "",
	unit_price: "",
	cost_price: "",
	stock_quantity: "",
	min_stock_quantity: "",
	reorder_level: "",
	expiry_date: "",
	type: "",
	batch_no: "",
	status: "active",
	category_id: "",
	brand_id: "",
	unit_id: "",
};

const REQUIRED_FIELDS = [
	"product_name",
	"unit_price",
	"cost_price",
	"stock_quantity",
	"min_stock_quantity",
	"reorder_level",
	"expiry_date",
	"type",
	"category_id",
	"unit_id",
];

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
	expiry_date: form.expiry_date ? new Date(form.expiry_date).toISOString() : null,
	type: form.type.trim(),
	batch_no: form.batch_no.trim() || null,
	status: form.status || "active",
	category_id: toNumberOrNull(form.category_id, parseInt),
	brand_id: toNumberOrNull(form.brand_id, parseInt),
	unit_id: toNumberOrNull(form.unit_id, parseInt),
});

const validateForm = (form) => {
	for (const f of REQUIRED_FIELDS) {
		if (f === "expiry_date" && !form[f]) continue;
		if (!String(form[f] ?? "").trim()) {
			return `Please fill in the required field: ${f.replace(/_/g, " ")}`;
		}
	}
	return null;
};

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
  const [product, setProduct] = useState(INITIAL_FORM);

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
			// console.log("CATEGORY DATA:", categoryRes.data);
			// console.log("BRANDS DATA:", brandsRes.data);
			// console.log("UNITS DATA:", unitsRes.data);
			setProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
			setCategories(Array.isArray(categoryRes.data) ? categoryRes.data : []);
			setBrands(Array.isArray(brandsRes.data) ? brandsRes.data : []);
			setUnits(Array.isArray(unitsRes.data) ? unitsRes.data : []);
		} catch (error) {
			toast.error("Failed to load products");
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

	const handleChange = (e) => {
		setProduct((prev) => ({ ...prev, [e.target.name]: e.target.value }));
	};

	const resetForm = () => {
		setProduct(INITIAL_FORM);
		setEditId(null);
	};

	const saveProduct = async (e) => {
		e.preventDefault();

		const validationError = validateForm(product);
		if (validationError) {
			toast.error(validationError);
			return;
		}

		setSubmitting(true);
		try {
			const payload = buildPayload(product);

			if (editId) {
				await api.put(`/products/${editId}`, payload);
				toast.success("Product updated");
			} else {
				await api.post("/products", payload);
				toast.success("Product added");
			}

			resetForm();
			await loadPageData();
		} catch (error) {
			toast.error(error.response?.data?.error || "Failed to save product");
		} finally {
			setSubmitting(false);
		}
	};

	const editProduct = (p) => {
		setProduct({
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
            expiry_date: p.expiry_date ?? "",
			unit_id: p.unit_id ?? "",
		});
		setEditId(p.product_id);
	};
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

			<input
				className="search"
				placeholder="Search by ID, name, type, or batch..."
				value={search}
				onChange={(e) => setSearch(e.target.value)}
			/>

			<form className="product-form" onSubmit={saveProduct}>
				<input
					name="product_name"
					placeholder="Product Name *"
					value={product.product_name}
					onChange={handleChange}
				/>
				<input
					name="unit_price"
					type="number"
					min="0"
					step="0.01"
					placeholder="Unit Price *"
					value={product.unit_price}
					onChange={handleChange}
				/>
				<input
					name="cost_price"
					type="number"
					min="0"
					step="0.01"
					placeholder="Cost Price *"
					value={product.cost_price}
					onChange={handleChange}
				/>
				<input
					name="stock_quantity"
					type="number"
					min="0"
					placeholder="Stock Quantity *"
					value={product.stock_quantity}
					onChange={handleChange}
				/>
				<input
					name="min_stock_quantity"
					type="number"
					min="0"
					placeholder="Min Stock *"
					value={product.min_stock_quantity}
					onChange={handleChange}
				/>
				<input
					name="reorder_level"
					type="number"
					min="0"
					placeholder="Reorder Level *"
					value={product.reorder_level}
					onChange={handleChange}
				/>
                <input name="expiry_date" type="date" placeholder="Expiry Date (optional)" value={product.expiry_date ? product.expiry_date.split("T")[0] : ""} onChange={handleChange} />
				<input name="type" placeholder="Type *" value={product.type} onChange={handleChange} />
				<input name="batch_no" placeholder="Batch No (optional)" value={product.batch_no} onChange={handleChange} />

				<select name="category_id" value={product.category_id} onChange={handleChange}>
					<option value="">Select Category *</option>
					{categories.map((c) => (
						<option key={c.category_id} value={c.category_id}>
							{c.category_name}
						</option>
					))}
				</select>

				<select name="brand_id" value={product.brand_id} onChange={handleChange}>
					<option value="">Select Brand (optional)</option>
					{brands.map((b) => (
						<option key={b.brand_id} value={b.brand_id}>
							{b.brand_name}
						</option>
					))}
				</select>

				<select name="unit_id" value={product.unit_id} onChange={handleChange}>
					<option value="">Select Unit *</option>
					{units.map((u) => (
						<option key={u.unit_id} value={u.unit_id}>
							{u.unit_name}
						</option>
					))}
				</select>

				<select name="status" value={product.status} onChange={handleChange}>
					<option value="active">Active</option>
					<option value="inactive">Inactive</option>
				</select>

				<div className="form-actions">
					<button type="submit" className="save-btn" disabled={submitting}>
						{submitting ? "Saving..." : editId ? "Update Product" : "Add Product"}
					</button>
					{editId && (
						<button type="button" className="cancel-btn" onClick={resetForm}>
							Cancel Edit
						</button>
					)}
				</div>
			</form>
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
							<th>Reorder Level</th>
							<th>Expiry Date</th>
							<th>Status</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{filteredProducts.length === 0 && !loading ? (
							<tr>
								<td colSpan="11" className="empty-row">
									No products found.
								</td>
							</tr>
						) : (
							filteredProducts.map((p) => (
								<tr key={p.product_id}>
									<td>{p.product_id}</td>
									<td>{p.product_name}</td>
									<td>{categoryMap.get(Number(p.category_id)) || p.category_id}</td>
									<td>{brandMap.get(Number(p.brand_id)) || "-"}</td>
									<td>{unitMap.get(Number(p.unit_id)) || p.unit_id}</td>
									<td>{Number(p.unit_price || 0).toFixed(2)}</td>
									<td>{p.stock_quantity ?? 0}</td>
									<td>{p.min_stock_quantity ?? 0}</td>
									<td>{p.reorder_level ?? 0}</td>
                                    <td>{p.expiry_date ? new Date(p.expiry_date).toLocaleDateString() : "-"}</td>
									<td>
										<span className={`status-pill ${String(p.status).toLowerCase() === "active" ? "active" : "inactive"}`}>
											{p.status || "active"}
										</span>
									</td>
									<td>
										<button className="edit-btn" onClick={() => editProduct(p)}>
											Edit
										</button>
										<button className="delete-btn" onClick={() => deleteProduct(p.product_id)}>
											Delete
										</button>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
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
