import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../utils/axios";
import AdminDashboard from "./AdminDashboard";
import ManagerDashboard from "./ManagerDashboard";
import "../styles/Assets.css";

const CONDITION_TYPES = ["New", "Good", "Fair", "Poor", "Damaged", "Other"];
const ASSET_STATUSES = ["Active", "Maintenance", "Damaged", "Lost", "Disposed"];
const EXPENSE_TYPES = ["Asset Purchase", "Salary", "Utility Bills", "Maintenance", "Transport", "Office Supplies", "Other"];

const EMPTY_FORM = {
  asset_name: "", department_id: "", cost: "", purchase_date: "",
  expiration_date: "", status: "Active", condition_type: "Good", custom_condition: "",
  add_as_expense: false, expense_type: "Asset Purchase", expense_amount: "", expense_description: ""
};

function AssetsPage() {
  const [assets, setAssets] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [viewAsset, setViewAsset] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const PER_PAGE = 8;

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [assetRes, deptRes] = await Promise.all([api.get("/assets"), api.get("/departments")]);
      setAssets(assetRes.data);
      setDepartments(deptRes.data);
    } catch { toast.error("Failed to load assets"); }
  };

  const openAdd = () => { setForm(EMPTY_FORM); setEditId(null); setShowModal(true); };
  const openEdit = (a) => {
    setForm({
      asset_name: a.asset_name || "", department_id: a.department_id || "",
      cost: a.cost || "", purchase_date: a.purchase_date || "",
      expiration_date: a.expiration_date || "", status: a.status || "Active",
      condition_type: a.condition_type || "Good", custom_condition: a.custom_condition || "",
      add_as_expense: false, expense_type: "Asset Purchase", expense_amount: "", expense_description: ""
    });
    setEditId(a.asset_id);
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setForm(EMPTY_FORM); setEditId(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.asset_name || !form.department_id || !form.purchase_date) {
      toast.error("Asset name, department, and purchase date are required"); return;
    }
    setLoading(true);
    try {
      const payload = { ...form };
      if (editId) {
        await api.put(`/assets/${editId}`, payload);
        toast.success("Asset updated");
      } else {
        const res = await api.post("/assets", payload);
        toast.success(res.data.expense ? "Asset & expense created" : "Asset created");
      }
      closeModal();
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed");
    } finally { setLoading(false); }
  };

  const handleDispose = async (a) => {
    if (!window.confirm(`Mark "${a.asset_name}" as Disposed? This removes it from budget tracking.`)) return;
    try {
      await api.patch(`/assets/${a.asset_id}/dispose`);
      toast.success("Asset disposed");
      loadAll();
    } catch (err) { toast.error(err.response?.data?.message || "Failed"); }
  };

  const handleDelete = async (a) => {
    if (a.status !== "Disposed") { toast.error("Only Disposed assets can be deleted"); return; }
    if (!window.confirm(`Permanently delete "${a.asset_name}"?`)) return;
    try {
      await api.delete(`/assets/${a.asset_id}`);
      toast.success("Asset deleted");
      loadAll();
    } catch (err) { toast.error(err.response?.data?.message || "Delete failed"); }
  };

  const handleView = async (a) => {
    try {
      const res = await api.get(`/assets/${a.asset_id}`);
      setViewAsset(res.data);
    } catch { toast.error("Failed to load details"); }
  };

  const getDeptName = (id) => departments.find(d => d.department_id === id)?.department_name || "N/A";

  const filtered = assets.filter(a => {
    const matchSearch = !search || a.asset_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || a.status === filterStatus;
    const matchDept = !filterDept || String(a.department_id) === String(filterDept);
    return matchSearch && matchStatus && matchDept;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const totalCost = assets.filter(a => a.status !== "Disposed").reduce((s, a) => s + parseFloat(a.cost || 0), 0);

  return (
    <div className="assets-container">
      <div className="page-header">
        <h1>🏗️ Assets</h1>
        <button className="btn-primary" onClick={openAdd}>+ Add Asset</button>
      </div>

      <div className="filters-row">
        <input className="search" placeholder="Search asset name..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }} />
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          {ASSET_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterDept} onChange={e => { setFilterDept(e.target.value); setPage(1); }}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
        </select>
      </div>

      <div className="stats-row">
        <div className="stat-card"><span className="stat-num">{assets.length}</span><span className="stat-label">Total</span></div>
        <div className="stat-card"><span className="stat-num">{assets.filter(a => a.status === "Active").length}</span><span className="stat-label">Active</span></div>
        <div className="stat-card"><span className="stat-num">{assets.filter(a => a.status === "Disposed").length}</span><span className="stat-label">Disposed</span></div>
        <div className="stat-card"><span className="stat-num">LKR {totalCost.toLocaleString("en-LK")}</span><span className="stat-label">Active Value</span></div>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Asset Name</th><th>Department</th><th>Cost (LKR)</th>
              <th>Condition</th><th>Status</th><th>Purchased</th><th>Expires</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan="9" className="empty-row">No assets found</td></tr>
            ) : paginated.map(a => (
              <tr key={a.asset_id}>
                <td>{a.asset_id}</td>
                <td className="name-cell">{a.asset_name}</td>
                <td>{a.department?.department_name || getDeptName(a.department_id)}</td>
                <td>{Number(a.cost || 0).toLocaleString("en-LK")}</td>
                <td>{a.condition_type === "Other" ? a.custom_condition : a.condition_type}</td>
                <td><span className={`status-badge asset-${a.status?.toLowerCase()}`}>{a.status}</span></td>
                <td>{a.purchase_date ? new Date(a.purchase_date).toLocaleDateString() : "N/A"}</td>
                <td>{a.expiration_date ? new Date(a.expiration_date).toLocaleDateString() : "—"}</td>
                <td className="action-cell">
                  <button className="view-btn" onClick={() => handleView(a)}>View</button>
                  {a.status !== "Disposed" && <button className="edit-btn" onClick={() => openEdit(a)}>Edit</button>}
                  {a.status !== "Disposed" && <button className="dispose-btn" onClick={() => handleDispose(a)}>Dispose</button>}
                  {a.status === "Disposed" && <button className="delete-btn" onClick={() => handleDelete(a)}>Delete</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i + 1} className={page === i + 1 ? "active" : ""} onClick={() => setPage(i + 1)}>{i + 1}</button>
          ))}
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editId ? "Edit Asset" : "Add Asset"}</h2>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-grid">
                <div className="form-group form-full">
                  <label>Asset Name *</label>
                  <input value={form.asset_name} onChange={e => setForm({ ...form, asset_name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Department *</label>
                  <select value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })} required>
                    <option value="">Select Department</option>
                    {departments.map(d => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Cost (LKR) *</label>
                  <input type="number" min="0" step="0.01" value={form.cost}
                    onChange={e => setForm({ ...form, cost: e.target.value, expense_amount: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Purchase Date *</label>
                  <input type="date" value={form.purchase_date} onChange={e => setForm({ ...form, purchase_date: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Expiration Date</label>
                  <input type="date" value={form.expiration_date} onChange={e => setForm({ ...form, expiration_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    {ASSET_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Condition</label>
                  <select value={form.condition_type} onChange={e => setForm({ ...form, condition_type: e.target.value })}>
                    {CONDITION_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                {form.condition_type === "Other" && (
                  <div className="form-group">
                    <label>Custom Condition *</label>
                    <input value={form.custom_condition} onChange={e => setForm({ ...form, custom_condition: e.target.value })}
                      placeholder="Describe condition..." required />
                  </div>
                )}
              </div>

              {!editId && (
                <div className="expense-section">
                  <label className="checkbox-label">
                    <input type="checkbox" checked={form.add_as_expense}
                      onChange={e => setForm({ ...form, add_as_expense: e.target.checked })} />
                    <span>Add this asset as an expense</span>
                  </label>
                  {form.add_as_expense && (
                    <div className="form-grid expense-fields">
                      <div className="form-group">
                        <label>Expense Type</label>
                        <select value={form.expense_type} onChange={e => setForm({ ...form, expense_type: e.target.value })}>
                          {EXPENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Expense Amount (LKR)</label>
                        <input type="number" min="0" value={form.expense_amount}
                          onChange={e => setForm({ ...form, expense_amount: e.target.value })} />
                      </div>
                      <div className="form-group form-full">
                        <label>Expense Description</label>
                        <input value={form.expense_description}
                          onChange={e => setForm({ ...form, expense_description: e.target.value })}
                          placeholder="Optional note..." />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? "Saving..." : editId ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewAsset && (
        <div className="modal-overlay" onClick={() => setViewAsset(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🏗️ {viewAsset.asset_name}</h2>
              <button className="modal-close" onClick={() => setViewAsset(null)}>✕</button>
            </div>
            <div className="detail-grid">
              <div className="detail-item"><span className="detail-label">Department</span>
                <span>{viewAsset.department?.department_name || getDeptName(viewAsset.department_id)}</span></div>
              <div className="detail-item"><span className="detail-label">Cost</span>
                <span>LKR {Number(viewAsset.cost).toLocaleString("en-LK")}</span></div>
              <div className="detail-item"><span className="detail-label">Status</span>
                <span className={`status-badge asset-${viewAsset.status?.toLowerCase()}`}>{viewAsset.status}</span></div>
              <div className="detail-item"><span className="detail-label">Condition</span>
                <span>{viewAsset.condition_type === "Other" ? viewAsset.custom_condition : viewAsset.condition_type}</span></div>
              <div className="detail-item"><span className="detail-label">Purchase Date</span>
                <span>{viewAsset.purchase_date ? new Date(viewAsset.purchase_date).toLocaleDateString() : "N/A"}</span></div>
              <div className="detail-item"><span className="detail-label">Expiration Date</span>
                <span>{viewAsset.expiration_date ? new Date(viewAsset.expiration_date).toLocaleDateString() : "—"}</span></div>
            </div>
            {(viewAsset.expenses || []).length > 0 && (
              <div className="detail-section">
                <h3>Linked Expenses</h3>
                <table className="inner-table">
                  <thead><tr><th>Type</th><th>Amount</th><th>Date</th></tr></thead>
                  <tbody>{viewAsset.expenses.map(exp => (
                    <tr key={exp.expense_id}>
                      <td>{exp.expense_type}</td>
                      <td>LKR {Number(exp.amount).toLocaleString("en-LK")}</td>
                      <td>{exp.expense_date ? new Date(exp.expense_date).toLocaleDateString() : "N/A"}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Assets() {
  const location = useLocation();
  const role = (localStorage.getItem("role") || "admin").toLowerCase();
  const isManager = location.pathname.startsWith("/manager/") || role === "manager";
  const Layout = isManager ? ManagerDashboard : AdminDashboard;
  return <Layout active="assets"><AssetsPage /></Layout>;
}
