import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/axios";
import AdminDashboard from "./AdminDashboard";
import ManagerDashboard from "./ManagerDashboard";
import "../styles/AddProduct.css";

const INITIAL_FORM = {
	product_name: "",
	unit_price: "",
	cost_price: "",
	stock_quantity: "",
	min_stock_quantity: "",
	reorder_level: "",
	type: "",
	batch_no: "",
	expiry_date: "",
	status: "active",
	category_id: "",
	brand_id: "",
	unit_id: "",
};

const toNumberOrNull = (value, parser = Number) => {
	if (value === "" || value === null || value === undefined) return null;
	return parser(value);
};

function AddProductPage() {
	const navigate = useNavigate();
	const location = useLocation();
	const isManager = location.pathname.startsWith("/manager/");

	const [form, setForm] = useState(INITIAL_FORM);
	const [categories, setCategories] = useState([]);
	const [brands, setBrands] = useState([]);
	const [units, setUnits] = useState([]);
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		const load = async () => {
			try {
				const [catRes, brandRes, unitRes] = await Promise.all([
					api.get("/category"),
					api.get("/brands"),
					api.get("/units"),
				]);
				const normalize = (res) => {
					if (Array.isArray(res.data)) return res.data;
					if (Array.isArray(res.data?.data)) return res.data.data;
					return [];
				};
				setCategories(normalize(catRes));
				setBrands(normalize(brandRes));
				setUnits(normalize(unitRes));
			} catch {
				toast.error("Failed to load form data");
			}
		};
		load();
	}, []);

	const handleChange = (e) => {
		setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		const required = ["product_name", "unit_price", "cost_price", "stock_quantity", "min_stock_quantity", "reorder_level", "type", "category_id", "unit_id"];
		for (const f of required) {
			if (!String(form[f] ?? "").trim()) {
				toast.error("Please fill all required fields.");
				return;
			}
		}
		if (Number(form.unit_price) < 0 || Number(form.cost_price) < 0) {
			toast.error("Prices cannot be negative.");
			return;
		}

		setSubmitting(true);
		try {
			await api.post("/products", {
				product_name: form.product_name.trim(),
				unit_price: toNumberOrNull(form.unit_price, parseFloat),
				cost_price: toNumberOrNull(form.cost_price, parseFloat),
				stock_quantity: toNumberOrNull(form.stock_quantity, parseInt),
				min_stock_quantity: toNumberOrNull(form.min_stock_quantity, parseInt),
				reorder_level: toNumberOrNull(form.reorder_level, parseInt),
				type: form.type.trim(),
				batch_no: form.batch_no.trim() || null,
				expiry_date: form.expiry_date || null,
				status: form.status || "active",
				category_id: toNumberOrNull(form.category_id, parseInt),
				brand_id: toNumberOrNull(form.brand_id, parseInt),
				unit_id: toNumberOrNull(form.unit_id, parseInt),
			});
			toast.success("Product added successfully!");
			navigate(isManager ? "/manager/products" : "/products");
		} catch (err) {
			toast.error(err?.response?.data?.error || "Failed to add product");
			setSubmitting(false);
		}
	};

	return (
		<div className="add-product-container">
			<div className="add-product-header">
				<div>
					<h1>Add New Product</h1>
					<p>Fill in the product details below</p>
				</div>
				<button
					type="button"
					className="back-btn"
					onClick={() => navigate(isManager ? "/manager/products" : "/products")}
				>
					← Back to Products
				</button>
			</div>

			<form className="add-product-form" onSubmit={handleSubmit}>
				<div className="form-section">
					<h3 className="section-title">Basic Information</h3>
					<div className="form-grid">
						<div className="field-group">
							<label>Product Name <span className="req">*</span></label>
							<input name="product_name" placeholder="e.g. Steel Hammer" value={form.product_name} onChange={handleChange} />
						</div>
						<div className="field-group">
							<label>Type <span className="req">*</span></label>
							<input name="type" placeholder="e.g. Tool, Hardware" value={form.type} onChange={handleChange} />
						</div>
						<div className="field-group">
							<label>Batch No</label>
							<input name="batch_no" placeholder="Optional" value={form.batch_no} onChange={handleChange} />
						</div>
						<div className="field-group">
							<label>Expiry Date</label>
							<input name="expiry_date" type="date" value={form.expiry_date} min={new Date().toISOString().split("T")[0]}onChange={handleChange} />
						</div>
						<div className="field-group">
							<label>Status</label>
							<select name="status" value={form.status} onChange={handleChange}>
								<option value="active">Active</option>
								<option value="inactive">Inactive</option>
							</select>
						</div>
					</div>
				</div>

				<div className="form-section">
					<h3 className="section-title">Pricing</h3>
					<div className="form-grid">
						<div className="field-group">
							<label>Unit Price <span className="req">*</span></label>
							<input name="unit_price" type="number" min="0" step="0.01" placeholder="0.00" value={form.unit_price} onChange={handleChange} />
						</div>
						<div className="field-group">
							<label>Cost Price <span className="req">*</span></label>
							<input name="cost_price" type="number" min="0" step="0.01" placeholder="0.00" value={form.cost_price} onChange={handleChange} />
						</div>
					</div>
				</div>

				<div className="form-section">
					<h3 className="section-title">Stock Details</h3>
					<div className="form-grid">
						<div className="field-group">
							<label>Stock Quantity <span className="req">*</span></label>
							<input name="stock_quantity" type="number" min="0" placeholder="0" value={form.stock_quantity} onChange={handleChange} />
						</div>
						<div className="field-group">
							<label>Min Stock <span className="req">*</span></label>
							<input name="min_stock_quantity" type="number" min="0" placeholder="0" value={form.min_stock_quantity} onChange={handleChange} />
						</div>
						<div className="field-group">
							<label>Reorder Level <span className="req">*</span></label>
							<input name="reorder_level" type="number" min="0" placeholder="0" value={form.reorder_level} onChange={handleChange} />
						</div>
					</div>
				</div>

				<div className="form-section">
					<h3 className="section-title">Classification</h3>
					<div className="form-grid">
						<div className="field-group">
							<label>Category <span className="req">*</span></label>
							<select name="category_id" value={form.category_id} onChange={handleChange}>
								<option value="">Select Category</option>
								{categories.map((c) => (
									<option key={c.category_id} value={c.category_id}>{c.category_name}</option>
								))}
							</select>
						</div>
						<div className="field-group">
							<label>Brand</label>
							<select name="brand_id" value={form.brand_id} onChange={handleChange}>
								<option value="">Select Brand (optional)</option>
								{brands.map((b) => (
									<option key={b.brand_id} value={b.brand_id}>{b.brand_name}</option>
								))}
							</select>
						</div>
						<div className="field-group">
							<label>Unit <span className="req">*</span></label>
							<select name="unit_id" value={form.unit_id} onChange={handleChange}>
								<option value="">Select Unit</option>
								{units.map((u) => (
									<option key={u.unit_id} value={u.unit_id}>{u.unit_name}</option>
								))}
							</select>
						</div>
					</div>
				</div>

				<div className="form-footer">
					<button type="button" className="cancel-btn" onClick={() => navigate(isManager ? "/manager/products" : "/products")}>
						Cancel
					</button>
					<button type="submit" className="submit-btn" disabled={submitting}>
						{submitting ? "Saving..." : "Add Product"}
					</button>
				</div>
			</form>
		</div>
	);
}

export default function AddProduct() {
	const location = useLocation();
	const isManagerRoute = location.pathname.startsWith("/manager/");
	const role = (localStorage.getItem("role") || "admin").toLowerCase();
	const Layout = isManagerRoute || role === "manager" ? ManagerDashboard : AdminDashboard;

	return (
		<Layout active="products">
			<AddProductPage />
		</Layout>
	);
}
