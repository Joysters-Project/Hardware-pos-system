import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Eye, Pencil, Trash2, Plus, Search, RefreshCw, FileDown, X, ChevronLeft, ChevronRight, Receipt } from "lucide-react";
import toast from "react-hot-toast";
import api from "../utils/axios";
import DashboardLayout from "../components/DashboardLayout";
import "../styles/Expenses.css";

const EXPENSE_TYPES = ["Asset Purchase", "Salary", "Utility Bills", "Maintenance", "Transport", "Office Supplies", "Other"];
const EMPTY_FORM = { expense_type: "", amount: "", description: "", expense_date: "", department_id: "", asset_id: "" };

const TYPE_COLORS = {
  "Asset Purchase": "#1565c0", "Salary": "#2e7d32", "Utility Bills": "#e65100",
  "Maintenance": "#f57c00", "Transport": "#6a1b9a", "Office Supplies": "#00695c", "Other": "#8b3a3a"
};

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
  const [pageLoading, setPageLoading] = useState(true);
  const [summary, setSummary] = useState({ total: 0, by_type: [] });
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setPageLoading(true);
    try {
      const [expRes, deptRes, assetRes, sumRes] = await Promise.all([
        api.get("/expenses"), api.get("/departments"), api.get("/assets"), api.get("/expenses/summary")
      ]);
      setExpenses(expRes.data); setDepartments(deptRes.data);
      setAssets(assetRes.data.filter(a => a.status !== "Disposed")); setSummary(sumRes.data);
    } catch { toast.error("Failed to load expenses"); }
    finally { setPageLoading(false); }
  };

  const openAdd = () => { setForm(EMPTY_FORM); setEditId(null); setShowModal(true); };
  const openEdit = (exp) => {
    setForm({
      expense_type: exp.expense_type || "", amount: exp.amount || "", description: exp.description || "",
      expense_date: exp.expense_date || "", department_id: exp.department_id || "", asset_id: exp.asset_id || ""
    });
    setEditId(exp.expense_id); setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setForm(EMPTY_FORM); setEditId(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.expense_type || !form.amount || !form.expense_date) { toast.error("Type, amount and date required"); return; }
    if (form.expense_type === "Other" && (!form.description || !form.description.trim())) {
      toast.error("Description is required when Expense Type is 'Other'");
      return;
    }
    setLoading(true);
    try {
      const payload = { ...form, department_id: form.department_id || null, asset_id: form.asset_id || null };
      if (editId) { await api.put(`/expenses/${editId}`, payload); toast.success("Expense updated"); }
      else { await api.post("/expenses", payload); toast.success("Expense created"); }
      closeModal(); loadAll();
    } catch (err) { toast.error(err.response?.data?.message || "Operation failed"); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this expense?")) return;
    try { await api.delete(`/expenses/${id}`); toast.success("Expense deleted"); loadAll(); }
    catch (err) { toast.error(err.response?.data?.message || "Delete failed"); }
  };

  const getDeptName = (id) => departments.find(d => d.department_id === id)?.department_name || "—";
  const getAssetName = (id) => assets.find(a => a.asset_id === id)?.asset_name || "—";

  const exportPDF = () => {
    const win = window.open("", "_blank", "width=1000,height=700");
    const rows = filtered.map((exp, i) => `
      <tr style="background:${i % 2 === 0 ? "#fff" : "#fdf8f8"}">
        <td>#${exp.expense_id}</td>
        <td><span style="padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;background:${(TYPE_COLORS[exp.expense_type] || "#8b3a3a") + "18"};color:${TYPE_COLORS[exp.expense_type] || "#8b3a3a"}">${exp.expense_type}</span></td>
        <td><strong>LKR ${Number(exp.amount || 0).toLocaleString("en-US")}</strong></td>
        <td>${exp.expense_date ? new Date(exp.expense_date).toLocaleDateString() : "—"}</td>
        <td>${exp.department?.department_name || getDeptName(exp.department_id)}</td>
        <td>${exp.asset?.asset_name || (exp.asset_id ? getAssetName(exp.asset_id) : "—")}</td>
        <td style="color:#888">${exp.description || "—"}</td>
      </tr>`).join("");
    win.document.write(`<!DOCTYPE html><html><head><title>Expenses Report</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;padding:32px;color:#222}
      .hdr{display:flex;justify-content:space-between;border-bottom:3px solid #8b3a3a;padding-bottom:14px;margin-bottom:20px}
      h1{font-size:20px;color:#8b3a3a;font-weight:700}.meta{font-size:11px;color:#888;text-align:right}
      .summary{display:flex;gap:12px;margin-bottom:18px}.s-box{background:#fdf5f5;border:1px solid #f0dede;border-radius:8px;padding:10px 16px;font-size:12px;color:#555}
      .s-box strong{display:block;font-size:16px;color:#8b3a3a;font-weight:700}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th{background:linear-gradient(135deg,#8b3a3a,#a84545);color:#fff;padding:9px 10px;text-align:left;font-weight:600}
      td{padding:8px 10px;border-bottom:1px solid #f0f0f0}
      .footer{margin-top:20px;text-align:center;font-size:10px;color:#aaa;border-top:1px solid #eee;padding-top:10px}
      </style></head><body>
      <div class="hdr"><div><h1>Expenses Report — Mathumithan Hardware</h1>
      <p style="font-size:11px;color:#888;margin-top:3px">Total records: ${filtered.length}</p></div>
      <div class="meta">Generated: ${new Date().toLocaleString()}</div></div>
      <div class="summary">
        <div class="s-box"><strong>LKR ${Number(summary.total || 0).toLocaleString("en-US")}</strong>Total Expenses</div>
        ${(summary.by_type || []).slice(0, 3).map(t => `<div class="s-box"><strong>LKR ${Number(t.total || 0).toLocaleString("en-US")}</strong>${t.expense_type}</div>`).join("")}
      </div>
      <table><thead><tr><th>#</th><th>Type</th><th>Amount</th><th>Date</th><th>Department</th><th>Linked Asset</th><th>Description</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <div class="footer">Mathumithan Hardware POS System &bull; Expenses Report &bull; Confidential</div>
      </body></html>`);
    win.document.close(); win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const filtered = expenses.filter(exp => {
    const term = search.toLowerCase();
    return (!term || (exp.expense_type || "").toLowerCase().includes(term) || (exp.description || "").toLowerCase().includes(term))
      && (!filterType || exp.expense_type === filterType)
      && (!filterDept || String(exp.department_id) === String(filterDept));
  });
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <DashboardLayout active="expenses">
    <div className="exp-container">
      <div className="exp-header">
        <div className="exp-header-left">
          <div className="exp-header-icon"><Receipt size={22} /></div>
          <div><h1>Expenses</h1><p>{expenses.length} total records</p></div>
        </div>
        <div className="exp-header-actions">
          <button className="exp-btn-outline" onClick={exportPDF}><FileDown size={14} /> Export PDF</button>
          <button className="exp-btn-primary" onClick={openAdd}><Plus size={14} /> Add Expense</button>
        </div>
      </div>

      <div className="exp-stats">
        <div className="exp-stat-card exp-stat-highlight">
          <div className="exp-stat-value">LKR {Number(summary.total || 0).toLocaleString("en-US")}</div>
          <div className="exp-stat-label">Total Expenses</div>
        </div>
        {(summary.by_type || []).slice(0, 3).map(t => (
          <div className="exp-stat-card" key={t.expense_type}>
            <div className="exp-stat-value" style={{ color: TYPE_COLORS[t.expense_type] || "#8b3a3a", fontSize: "1.1rem" }}>
              LKR {Number(t.total || 0).toLocaleString("en-US")}
            </div>
            <div className="exp-stat-label">{t.expense_type}</div>
          </div>
        ))}
      </div>

      <div className="exp-filters">
        <div className="exp-search-wrap"><Search size={14} className="exp-search-icon" />
          <input className="exp-search" placeholder="Search by type or description..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} /></div>
        <select className="exp-select" value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }}>
          <option value="">All Types</option>{EXPENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="exp-select" value={filterDept} onChange={e => { setFilterDept(e.target.value); setPage(1); }}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
        </select>
        <button className="exp-refresh-btn" onClick={loadAll} disabled={pageLoading}><RefreshCw size={14} className={pageLoading ? "spin" : ""} /></button>
      </div>

      <div className="exp-table-wrap">
        <table className="exp-table">
          <thead><tr>
            <th>#</th><th>Type</th><th>Amount (LKR)</th><th>Date</th>
            <th>Department</th><th>Linked Asset</th><th>Description</th><th>Actions</th>
          </tr></thead>
          <tbody>
            {pageLoading ? <tr><td colSpan="8" className="exp-empty">Loading...</td></tr>
              : paginated.length === 0 ? <tr><td colSpan="8" className="exp-empty">No expenses found</td></tr>
                : paginated.map(exp => (
                  <tr key={exp.expense_id}>
                    <td><span className="exp-id-badge">#{exp.expense_id}</span></td>
                    <td><span className="exp-type-pill" style={{ background: (TYPE_COLORS[exp.expense_type] || "#8b3a3a") + "18", color: TYPE_COLORS[exp.expense_type] || "#8b3a3a" }}>{exp.expense_type}</span></td>
                    <td className="exp-amount-cell">LKR {Number(exp.amount || 0).toLocaleString("en-US")}</td>
                    <td>{exp.expense_date ? new Date(exp.expense_date).toLocaleDateString() : "—"}</td>
                    <td>{exp.department?.department_name || getDeptName(exp.department_id)}</td>
                    <td>{exp.asset?.asset_name || (exp.asset_id ? getAssetName(exp.asset_id) : "—")}</td>
                    <td className="exp-desc-cell">{exp.description || "—"}</td>
                    <td><div className="exp-action-btns">
                      <button className="exp-icon-btn btn-view" title="View" onClick={() => setViewExpense(exp)}><Eye size={14} /></button>
                      <button className="exp-icon-btn btn-edit" title="Edit" onClick={() => openEdit(exp)}><Pencil size={14} /></button>
                      <button className="exp-icon-btn btn-delete" title="Delete" onClick={() => handleDelete(exp.expense_id)}><Trash2 size={14} /></button>
                    </div></td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && <div className="exp-pagination">
        <button disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={14} /></button>
        <span className="exp-page-info">Page {page} of {totalPages}</span>
        {Array.from({ length: totalPages }, (_, i) => <button key={i + 1} className={page === i + 1 ? "active" : ""} onClick={() => setPage(i + 1)}>{i + 1}</button>)}
        <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={14} /></button>
      </div>}

      {/* Add/Edit Modal */}
      {showModal && createPortal(
        <div className="exp-overlay" onClick={closeModal}>
          <div className="exp-modal" onClick={e => e.stopPropagation()}>
            <div className="exp-modal-header">
              <h2>{editId ? "Edit Expense" : "Add Expense"}</h2>
              <button className="exp-modal-close" onClick={closeModal}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="exp-modal-form">
              <div className="exp-form-grid">
                <div className="exp-field"><label>Expense Type *</label>
                  <select value={form.expense_type} onChange={e => setForm({ ...form, expense_type: e.target.value })} required>
                    <option value="">Select Type</option>{EXPENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select></div>
                <div className="exp-field"><label>Amount (LKR) *</label>
                  <input type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required /></div>
                <div className="exp-field"><label>Expense Date *</label>
                  <input type="date" value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })} required /></div>
                <div className="exp-field"><label>Department</label>
                  <select value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })}>
                    <option value="">None</option>{departments.map(d => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
                  </select></div>
                <div className="exp-field"><label>Linked Asset</label>
                  <select value={form.asset_id} onChange={e => setForm({ ...form, asset_id: e.target.value })}>
                    <option value="">None</option>{assets.map(a => <option key={a.asset_id} value={a.asset_id}>{a.asset_name}</option>)}
                  </select></div>
                <div className="exp-field exp-field-full">
                  <label>Description {form.expense_type === "Other" ? <span style={{ color: "#c62828" }}>*</span> : "(Optional)"}</label>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder={form.expense_type === "Other" ? "Description is required when type is 'Other'..." : "Optional notes..."}
                    required={form.expense_type === "Other"}
                  />
                </div>
              </div>
              <div className="exp-modal-footer">
                <button type="button" className="exp-btn-cancel" onClick={closeModal}>Cancel</button>
                <button type="submit" className="exp-btn-submit" disabled={loading}>{loading ? "Saving..." : editId ? "Update" : "Create"}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* View Modal */}
      {viewExpense && createPortal(
        <div className="exp-overlay" onClick={() => setViewExpense(null)}>
          <div className="exp-modal" onClick={e => e.stopPropagation()}>
            <div className="exp-modal-header">
              <h2>Expense Details</h2>
              <button className="exp-modal-close" onClick={() => setViewExpense(null)}><X size={18} /></button>
            </div>
            <div className="exp-view-grid">
              {[["Type", <span className="exp-type-pill" style={{ background: (TYPE_COLORS[viewExpense.expense_type] || "#8b3a3a") + "18", color: TYPE_COLORS[viewExpense.expense_type] || "#8b3a3a" }}>{viewExpense.expense_type}</span>],
              ["Amount", `LKR ${Number(viewExpense.amount).toLocaleString("en-US")}`],
              ["Date", viewExpense.expense_date ? new Date(viewExpense.expense_date).toLocaleDateString() : "—"],
              ["Department", viewExpense.department?.department_name || getDeptName(viewExpense.department_id)],
              ["Linked Asset", viewExpense.asset?.asset_name || (viewExpense.asset_id ? getAssetName(viewExpense.asset_id) : "—")],
              ["Description", viewExpense.description || "—"]
              ].map(([l, v]) => <div className="exp-view-row" key={l}><span className="exp-view-label">{l}</span><span className="exp-view-value">{v}</span></div>)}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
    </DashboardLayout>
  );
}

export default ExpensesPage;
