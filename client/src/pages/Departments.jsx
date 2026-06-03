import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../utils/axios";
import AdminDashboard from "./AdminDashboard";
import ManagerDashboard from "./ManagerDashboard";
import "../styles/Departments.css";

const EMPTY_FORM = { department_name: "", budget: "", description: "", status: "Active" };

function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [viewDept, setViewDept] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const PER_PAGE = 8;

  useEffect(() => { loadDepartments(); }, []);

  const loadDepartments = async () => {
    try {
      const res = await api.get("/departments");
      setDepartments(res.data);
    } catch { toast.error("Failed to load departments"); }
  };

  const openAdd = () => { setForm(EMPTY_FORM); setEditId(null); setShowModal(true); };
  const openEdit = (d) => {
    setForm({ department_name: d.department_name, budget: d.budget, description: d.description || "", status: d.status || "Active" });
    setEditId(d.department_id);
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setForm(EMPTY_FORM); setEditId(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.department_name.trim()) { toast.error("Department name is required"); return; }
    setLoading(true);
    try {
      if (editId) {
        await api.put(`/departments/${editId}`, form);
        toast.success("Department updated");
      } else {
        await api.post("/departments", form);
        toast.success("Department created");
      }
      closeModal();
      loadDepartments();
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed");
    } finally { setLoading(false); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/departments/${id}`);
      toast.success("Department deleted");
      loadDepartments();
    } catch (err) { toast.error(err.response?.data?.message || "Delete failed"); }
  };

  const handleView = async (d) => {
    try {
      const res = await api.get(`/departments/${d.department_id}`);
      setViewDept(res.data);
    } catch { toast.error("Failed to load details"); }
  };

  const filtered = departments.filter(d =>
    d.department_name.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const budgetPct = (d) => {
    const budget = parseFloat(d.budget) || 0;
    if (budget === 0) return 0;
    const used = parseFloat(d.used_budget) || 0;
    return Math.min(100, Math.round((used / budget) * 100));
  };

  return (
    <div className="departments-container">
      <div className="page-header">
        <h1>🏢 Departments</h1>
        <button className="btn-primary" onClick={openAdd}>+ Add Department</button>
      </div>

      <div className="search-bar">
        <input className="search" placeholder="Search department..." value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>

      {/* Stats Row */}
      <div className="stats-row">
        <div className="stat-card"><span className="stat-num">{departments.length}</span><span className="stat-label">Total</span></div>
        <div className="stat-card"><span className="stat-num">{departments.filter(d => d.status === "Active").length}</span><span className="stat-label">Active</span></div>
        <div className="stat-card"><span className="stat-num">{departments.reduce((s, d) => s + (d.employee_count || 0), 0)}</span><span className="stat-label">Employees</span></div>
        <div className="stat-card"><span className="stat-num">{departments.reduce((s, d) => s + (d.asset_count || 0), 0)}</span><span className="stat-label">Assets</span></div>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Department</th><th>Status</th><th>Budget (LKR)</th>
              <th>Used</th><th>Remaining</th><th>Budget %</th>
              <th>Employees</th><th>Assets</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan="10" className="empty-row">No departments found</td></tr>
            ) : paginated.map(d => {
              const pct = budgetPct(d);
              const barColor = pct >= 90 ? "#d32f2f" : pct >= 70 ? "#f57c00" : "#2e7d32";
              return (
                <tr key={d.department_id}>
                  <td>{d.department_id}</td>
                  <td className="name-cell">{d.department_name}</td>
                  <td><span className={`status-badge status-${d.status?.toLowerCase()}`}>{d.status || "Active"}</span></td>
                  <td>{Number(d.budget || 0).toLocaleString("en-LK")}</td>
                  <td>{Number(d.used_budget || 0).toLocaleString("en-LK")}</td>
                  <td>{Number(d.remaining_budget || d.budget || 0).toLocaleString("en-LK")}</td>
                  <td>
                    <div className="budget-bar-wrap">
                      <div className="budget-bar" style={{ width: `${pct}%`, background: barColor }} />
                      <span className="budget-pct">{pct}%</span>
                    </div>
                  </td>
                  <td>{d.employee_count || 0}</td>
                  <td>{d.asset_count || 0}</td>
                  <td className="action-cell">
                    <button className="view-btn" onClick={() => handleView(d)}>View</button>
                    <button className="edit-btn" onClick={() => openEdit(d)}>Edit</button>
                    <button className="delete-btn" onClick={() => handleDelete(d.department_id, d.department_name)}>Delete</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
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
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editId ? "Edit Department" : "Add Department"}</h2>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Department Name *</label>
                <input value={form.department_name} onChange={e => setForm({ ...form, department_name: e.target.value })}
                  placeholder="e.g. Sales, IT, Warehouse" required />
              </div>
              <div className="form-group">
                <label>Budget (LKR)</label>
                <input type="number" min="0" step="0.01" value={form.budget}
                  onChange={e => setForm({ ...form, budget: e.target.value })} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea rows={3} value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional description..." />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
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

      {/* View Details Modal */}
      {viewDept && (
        <div className="modal-overlay" onClick={() => setViewDept(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🏢 {viewDept.department_name}</h2>
              <button className="modal-close" onClick={() => setViewDept(null)}>✕</button>
            </div>
            <div className="detail-grid">
              <div className="detail-item"><span className="detail-label">Status</span>
                <span className={`status-badge status-${viewDept.status?.toLowerCase()}`}>{viewDept.status}</span></div>
              <div className="detail-item"><span className="detail-label">Total Budget</span>
                <span>LKR {Number(viewDept.budget || 0).toLocaleString("en-LK")}</span></div>
              <div className="detail-item"><span className="detail-label">Used Budget</span>
                <span>LKR {Number(viewDept.used_budget || 0).toLocaleString("en-LK")}</span></div>
              <div className="detail-item"><span className="detail-label">Remaining Budget</span>
                <span>LKR {Number(viewDept.remaining_budget || 0).toLocaleString("en-LK")}</span></div>
            </div>
            {viewDept.description && <p className="detail-desc">{viewDept.description}</p>}

            {(viewDept.employees || []).length > 0 && (
              <div className="detail-section">
                <h3>Employees ({viewDept.employees.length})</h3>
                <table className="inner-table">
                  <thead><tr><th>Name</th><th>Position</th><th>Status</th><th>Email</th></tr></thead>
                  <tbody>{viewDept.employees.map(e => (
                    <tr key={e.employee_id}>
                      <td>{e.first_name} {e.last_name}</td>
                      <td>{e.position}</td>
                      <td><span className={`status-badge status-${e.status?.toLowerCase()}`}>{e.status}</span></td>
                      <td>{e.email}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}

            {(viewDept.assets || []).length > 0 && (
              <div className="detail-section">
                <h3>Assets ({viewDept.assets.length})</h3>
                <table className="inner-table">
                  <thead><tr><th>Asset</th><th>Cost</th><th>Status</th><th>Purchased</th></tr></thead>
                  <tbody>{viewDept.assets.map(a => (
                    <tr key={a.asset_id}>
                      <td>{a.asset_name}</td>
                      <td>LKR {Number(a.cost).toLocaleString("en-LK")}</td>
                      <td><span className={`status-badge asset-${a.status?.toLowerCase()}`}>{a.status}</span></td>
                      <td>{a.purchase_date ? new Date(a.purchase_date).toLocaleDateString() : "N/A"}</td>
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

export default function Departments() {
  const location = useLocation();
  const role = (localStorage.getItem("role") || "admin").toLowerCase();
  const isManager = location.pathname.startsWith("/manager/") || role === "manager";
  const Layout = isManager ? ManagerDashboard : AdminDashboard;
  return <Layout active="departments"><DepartmentsPage /></Layout>;
}
