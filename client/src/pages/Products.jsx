import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
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
	type: form.type.trim(),
	batch_no: form.batch_no.trim() || null,
	status: form.status || "active",
	category_id: toNumberOrNull(form.category_id, parseInt),
	brand_id: toNumberOrNull(form.brand_id, parseInt),
	unit_id: toNumberOrNull(form.unit_id, parseInt),
});

const validateForm = (form) => {
	for (const field of REQUIRED_FIELDS) {
		if (!String(form[field] ?? "").trim()) {
			return "Please fill all required fields.";
		}
	}

	if (Number(form.unit_price) < 0 || Number(form.cost_price) < 0) {
		return "Prices cannot be negative.";
	}

	if (
		Number(form.stock_quantity) < 0 ||
		Number(form.min_stock_quantity) < 0 ||
		Number(form.reorder_level) < 0
	) {
		return "Stock values cannot be negative.";
	}

	return null;
};

function ProductsPage() {
	const [products, setProducts] = useState([]);
	const [categories, setCategories] = useState([]);
	const [brands, setBrands] = useState([]);
	const [units, setUnits] = useState([]);
	const [search, setSearch] = useState("");
	const [product, setProduct] = useState(INITIAL_FORM);
	const [editId, setEditId] = useState(null);
	const [loading, setLoading] = useState(false);
	const [submitting, setSubmitting] = useState(false);

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
		} catch (error) {
			toast.error("Failed to load products");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadPageData();
	}, []);

	const categoryMap = useMemo(
		() => new Map(categories.map((c) => [Number(c.category_id), c.category_name])),
		[categories]
	);

	const brandMap = useMemo(
		() => new Map(brands.map((b) => [Number(b.brand_id), b.brand_name])),
		[brands]
	);

	const unitMap = useMemo(
		() => new Map(units.map((u) => [Number(u.unit_id), u.unit_name])),
		[units]
	);

	const filteredProducts = useMemo(() => {
		const q = search.trim().toLowerCase();

		return [...products]
			.sort((a, b) => Number(a.product_id) - Number(b.product_id))
			.filter((p) => {
				if (!q) return true;

				return (
					String(p.product_id).includes(q) ||
					String(p.product_name || "").toLowerCase().includes(q) ||
					String(p.type || "").toLowerCase().includes(q) ||
					String(p.batch_no || "").toLowerCase().includes(q)
				);
			});
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
			unit_id: p.unit_id ?? "",
		});
		setEditId(p.product_id);
	};

	const deleteProduct = async (id) => {
		const confirmed = window.confirm("Delete this product?");
		if (!confirmed) return;

		try {
			await api.delete(`/products/${id}`);
			toast.success("Product deleted");
			if (editId === id) resetForm();
			await loadPageData();
		} catch (error) {
			toast.error(error.response?.data?.error || "Failed to delete product");
		}
	};

	return (
		<div className="products-container">
			<div className="products-header">
				<h1>Products</h1>
				<button type="button" className="refresh-btn" onClick={loadPageData} disabled={loading}>
					{loading ? "Refreshing..." : "Refresh"}
				</button>
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

export default function Products(){
const location = useLocation();
const isManagerRoute = location.pathname.startsWith("/manager/");
const role = (localStorage.getItem("role") || "admin").toLowerCase();
const DashboardLayout = isManagerRoute || role === "manager" ? ManagerDashboard : AdminDashboard;

return(
<DashboardLayout active="products">
<ProductsPage/>
</DashboardLayout>
);
}
