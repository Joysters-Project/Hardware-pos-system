import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../utils/axios";
import AdminDashboard from "./AdminDashboard";
import ManagerDashboard from "./ManagerDashboard";
import "../styles/Expenses.css";

const EXPENSE_TYPES = ["Asset Purchase", "Salary", "Utility Bills", "Maintenance", "Transport", "Office Supplies", "Other"];
const EMPTY_FORM = { expense_type: "", amount: "", description: "", expense_date: "", department_id: "", asset_id: "" };

function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [assets, setAssets] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [viewExpense, setViewExpense] = useState(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({ total: 0, by_type: [] });
  const [page, setPage] = useState(1);
  const PER_PAGE = 8;

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [expRes, deptRes, assetRes, sumRes] = await Promise.all([
        api.get("/expenses"), api.get("/departments"),
        api.get("/assets"), api.get("/expenses/summary")
      ]);
      setExpenses(expRes.data);
      setDepartments(deptRes.data);
      setAssets(assetRes.data.filter(a => a.status !== "Disposed"));
      setSummary(sumRes.data);
    } catch { toast.error("Failed to load expenses"); }
  };

  const openAdd = () => { setForm(EMPTY_FORM); setEditId(null); setShowModal(true); };
  const openEdit = (exp) => {
    setForm({
      expense_type: exp.expense_type || "", amount: exp.amount || "",
      description: exp.description || "", expense_date: exp.expense_date || "",
      department_id: exp.department_id || "", asset_id: exp.asset_id || ""
    });
    setEditId(exp.expense_id);
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setForm(EMPTY_FORM); setEditId(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.expense_type || !form.amount || !form.expense_date) {
      toast.error("Type, amount, and date are required"); return;
    }
    setLoading(true);
    try {
      const payload = { ...form, department_id: form.department_id || null, asset_id: form.asset_id || null };
      if (editId) {
        await api.put(`/expenses/${editId}`, payload);
        toast.success("Expense updated");
      } else {
        await api.post("/expenses", payload);
        toast.success("Expense created");
      }
      closeModal();
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed");
    } finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this expense?")) return;
    try {
      await api.delete(`/expenses/${id}`);
      toast.success("Expense deleted");
      loadAll();
    } catch (err) { toast.error(err.response?.data?.message || "Delete failed"); }
  };

  const getDeptName = (id) => departments.find(d => d.department_id === id)?.department_name || "—";
  const getAssetName = (id) => assets.find(a => a.asset_id === id)?.asset_name || "—";

  const filtered = expenses.filter(exp => {
    const term = search.toLowerCase();
    const matchSearch = !term ||
      (exp.expense_type || "").toLowerCase().includes(term) ||
      (exp.description || "").toLowerCase().includes(term);
    const matchType = !filterType || exp.expense_type === filterType;
    const matchDept = !filterDept || String(exp.department_id) === String(filterDept);
    return matchSearch && matchType && matchDept;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="expenses-container">
      <div className="page-header">
        <h1>💰 Expenses</h1>
        <button className="btn-primary" onClick={openAdd}>+ Add Expense</button>
      </div>

      {/* Summary Cards */}
      <div className="stats-row">
        <div className="stat-card stat-highlight">
          <span className="stat-num">LKR {Number(summary.total || 0).toLocaleString("en-LK")}</span>
          <span className="stat-label">Total Expenses</span>
        </div>
        {(summary.by_type || []).slice(0, 3).map(t => (
          <div key={t.expense_type} className="stat-card">
            <span className="stat-num">LKR {Number(t.total || 0).toLocaleString("en-LK")}</span>
            <span className="stat-label">{t.expense_type}</span>
          </div>
        ))}
      </div>

      <div className="filters-row">
        <input className="search" placeholder="Search by type or description..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }} />
        <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }}>
          <option value="">All Types</option>
          {EXPENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterDept} onChange={e => { setFilterDept(e.target.value); setPage(1); }}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
        </select>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Type</th><th>Amount (LKR)</th><th>Date</th>
              <th>Department</th><th>Linked Asset</th><th>Description</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan="8" className="empty-row">No expenses found</td></tr>
            ) : paginated.map(exp => (
              <tr key={exp.expense_id}>
                <td>{exp.expense_id}</td>
                <td><span className="type-badge">{exp.expense_type}</span></td>
                <td>{Number(exp.amount || 0).toLocaleString("en-LK")}</td>
                <td>{exp.expense_date ? new Date(exp.expense_date).toLocaleDateString() : "N/A"}</td>
                <td>{exp.department?.department_name || getDeptName(exp.department_id)}</td>
                <td>{exp.asset?.asset_name || (exp.asset_id ? getAssetName(exp.asset_id) : "—")}</td>
                <td className="desc-cell">{exp.description || "—"}</td>
                <td className="action-cell">
                  <button className="view-btn" onClick={() => setViewExpense(exp)}>View</button>
                  <button className="edit-btn" onClick={() => openEdit(exp)}>Edit</button>
                  <button className="delete-btn" onClick={() => handleDelete(exp.expense_id)}>Delete</button>
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
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editId ? "Edit Expense" : "Add Expense"}</h2>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Expense Type *</label>
                  <select value={form.expense_type} onChange={e => setForm({ ...form, expense_type: e.target.value })} required>
                    <option value="">Select Type</option>
                    {EXPENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Amount (LKR) *</label>
                  <input type="number" min="0" step="0.01" value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Expense Date *</label>
                  <input type="date" value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Department</label>
                  <select value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })}>
                    <option value="">None</option>
                    {departments.map(d => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Linked Asset</label>
                  <select value={form.asset_id} onChange={e => setForm({ ...form, asset_id: e.target.value })}>
                    <option value="">None</option>
                    {assets.map(a => <option key={a.asset_id} value={a.asset_id}>{a.asset_name}</option>)}
                  </select>
                </div>
                <div className="form-group form-full">
                  <label>Description</label>
                  <textarea rows={3} value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional notes..." />
                </div>
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

      {/* View Modal */}
      {viewExpense && (
        <div className="modal-overlay" onClick={() => setViewExpense(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>💰 Expense Details</h2>
              <button className="modal-close" onClick={() => setViewExpense(null)}>✕</button>
            </div>
            <div className="detail-grid">
              <div className="detail-item"><span className="detail-label">Type</span>
                <span className="type-badge">{viewExpense.expense_type}</span></div>
              <div className="detail-item"><span className="detail-label">Amount</span>
                <span>LKR {Number(viewExpense.amount).toLocaleString("en-LK")}</span></div>
              <div className="detail-item"><span className="detail-label">Date</span>
                <span>{viewExpense.expense_date ? new Date(viewExpense.expense_date).toLocaleDateString() : "N/A"}</span></div>
              <div className="detail-item"><span className="detail-label">Department</span>
                <span>{viewExpense.department?.department_name || getDeptName(viewExpense.department_id)}</span></div>
              <div className="detail-item"><span className="detail-label">Linked Asset</span>
                <span>{viewExpense.asset?.asset_name || (viewExpense.asset_id ? getAssetName(viewExpense.asset_id) : "—")}</span></div>
              <div className="detail-item form-full"><span className="detail-label">Description</span>
                <span>{viewExpense.description || "—"}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Expenses() {
  const location = useLocation();
  const role = (localStorage.getItem("role") || "admin").toLowerCase();
  const isManager = location.pathname.startsWith("/manager/") || role === "manager";
  const Layout = isManager ? ManagerDashboard : AdminDashboard;
  return <Layout active="expenses"><ExpensesPage /></Layout>;
}
