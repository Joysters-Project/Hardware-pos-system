import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Eye, Pencil, Trash2, Plus, Search, RefreshCw, FileDown, X, ChevronLeft, ChevronRight, Receipt } from "lucide-react";
import toast from "react-hot-toast";
import api from "../utils/axios";
import { buildTableHtml, escapeHtml, printWithTemplate } from "../utils/printTemplate";
import DashboardLayout from "../components/DashboardLayout";
import ModuleWorkspace from "../components/navigation/ModuleWorkspace";
import FinanceTopNav from "../components/navigation/FinanceTopNav";
import "../styles/Procurement.css";

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
    const amountValue = Number(form.amount);
    if (Number.isNaN(amountValue) || amountValue <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }
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
    const expense = expenses.find((item) => item.expense_id === id);
    if (expense?.asset_id) {
      toast.error("Cannot delete this expense because it is linked to an asset.");
      return;
    }
    if (!window.confirm("Delete this expense?")) return;
    try { await api.delete(`/expenses/${id}`); toast.success("Expense deleted"); loadAll(); }
    catch (err) { toast.error(err.response?.data?.message || "Delete failed"); }
  };

  const getDeptName = (id) => departments.find(d => d.department_id === id)?.department_name || "—";
  const getAssetName = (id) => assets.find(a => a.asset_id === id)?.asset_name || "—";

  const exportPDF = () => {
    const rows = filtered.map((exp) => ([
      escapeHtml(`#${exp.expense_id}`),
      `<span style="font-weight:700;color:${TYPE_COLORS[exp.expense_type] || "#8b3a3a"}">${escapeHtml(exp.expense_type || "—")}</span>`,
      `<strong>${escapeHtml(`LKR ${Number(exp.amount || 0).toLocaleString("en-US")}`)}</strong>`,
      escapeHtml(exp.expense_date ? new Date(exp.expense_date).toLocaleDateString() : "—"),
      escapeHtml(exp.department?.department_name || getDeptName(exp.department_id)),
      escapeHtml(exp.asset?.asset_name || (exp.asset_id ? getAssetName(exp.asset_id) : "—")),
      escapeHtml(exp.description || "—"),
    ]));

    const summaryHtml = `
      <p style="margin:0 0 10px;font-size:12px;color:#555;">
        Total Expenses: <strong>LKR ${escapeHtml(Number(summary.total || 0).toLocaleString("en-US"))}</strong>
      </p>
      <p style="margin:0 0 12px;font-size:12px;color:#555;">
        ${escapeHtml((summary.by_type || []).slice(0, 3).map((t) => `${t.expense_type}: LKR ${Number(t.total || 0).toLocaleString("en-US")}`).join(" | "))}
      </p>
    `;

    const tableHtml = buildTableHtml({
      columns: ["#", "Type", "Amount", "Date", "Department", "Linked Asset", "Description"],
      rows,
      emptyMessage: "No expenses found"
    });

    const opened = printWithTemplate({
      title: "Expenses Report",
      subtitle: `Total records: ${filtered.length}`,
      contentHtml: `${summaryHtml}${tableHtml}`,
    });

    if (!opened) toast.error("Allow pop-ups to print the report");
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
      <ModuleWorkspace nav={FinanceTopNav}>
        <div className="proc-container">
          {/* Header */}
          <div className="proc-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div className="proc-header-icon"><Receipt size={22} /></div>
              <div>
                <h1>Expenses</h1>
                <p>{expenses.length} total expense records</p>
              </div>
            </div>
            <div className="proc-header-actions">
              <button className="proc-btn-outline info" onClick={exportPDF}><FileDown size={14} /> Export PDF</button>
              <button className="proc-btn-primary" onClick={openAdd}><Plus size={14} /> Add Expense</button>
            </div>
          </div>

          {/* Stats */}
          <div className="proc-stats">
            <div className="proc-stat-card">
              <div className="proc-stat-value" style={{ color: '#8b3a3a' }}>LKR {Number(summary.total || 0).toLocaleString('en-US')}</div>
              <div className="proc-stat-label">Total Expenses</div>
            </div>
            {(summary.by_type || []).slice(0, 3).map(t => (
              <div className="proc-stat-card" key={t.expense_type}>
                <div className="proc-stat-value" style={{ color: TYPE_COLORS[t.expense_type] || '#8b3a3a', fontSize: '1.1rem' }}>
                  LKR {Number(t.total || 0).toLocaleString('en-US')}
                </div>
                <div className="proc-stat-label">{t.expense_type}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="proc-filters-row">
            <div className="proc-search-wrap">
              <input id="search" name="search" className="proc-search" placeholder="Search by type or description..."
                value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <select id="filterType" name="filterType" className="proc-select" value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }}>
              <option value="">All Types</option>
              {EXPENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select id="filterDept" name="filterDept" className="proc-select" value={filterDept} onChange={e => { setFilterDept(e.target.value); setPage(1); }}>
              <option value="">All Departments</option>
              {departments.map(d => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
            </select>
            <button className="proc-refresh-btn" onClick={loadAll} disabled={pageLoading}>
              <RefreshCw size={14} className={pageLoading ? 'proc-spin-fast' : ''} />
            </button>
          </div>

          {/* Table */}
          <div className="proc-card">
            <div className="proc-table-wrap">
              <table className="proc-table">
                <thead><tr>
                  <th>#</th><th>Type</th><th>Amount (LKR)</th><th>Date</th>
                  <th>Department</th><th>Linked Asset</th><th>Description</th><th>Actions</th>
                </tr></thead>
                <tbody>
                  {pageLoading
                    ? <tr><td colSpan="8" className="proc-empty">Loading...</td></tr>
                    : paginated.length === 0
                      ? <tr><td colSpan="8" className="proc-empty">No expenses found</td></tr>
                      : paginated.map(exp => (
                        <tr key={exp.expense_id}>
                          <td><span className="proc-code-badge">#{exp.expense_id}</span></td>
                          <td>
                            <span className="proc-status-pill" style={{ background: (TYPE_COLORS[exp.expense_type] || '#8b3a3a') + '18', color: TYPE_COLORS[exp.expense_type] || '#8b3a3a' }}>
                              {exp.expense_type}
                            </span>
                          </td>
                          <td><span className="proc-amount">LKR {Number(exp.amount || 0).toLocaleString('en-US')}</span></td>
                          <td style={{ fontSize: '0.85rem' }}>{exp.expense_date ? new Date(exp.expense_date).toLocaleDateString() : '—'}</td>
                          <td style={{ fontSize: '0.85rem' }}>{exp.department?.department_name || getDeptName(exp.department_id)}</td>
                          <td style={{ fontSize: '0.85rem' }}>{exp.asset?.asset_name || (exp.asset_id ? getAssetName(exp.asset_id) : '—')}</td>
                          <td className="proc-cell-clamp" style={{ fontSize: '0.82rem', color: '#666' }}>{exp.description || '—'}</td>
                          <td>
                            <div className="proc-action-btns">
                              <button className="proc-icon-btn view" title="View" onClick={() => setViewExpense(exp)}><Eye size={14} /></button>
                              <button className="proc-icon-btn edit" title="Edit" onClick={() => openEdit(exp)}><Pencil size={14} /></button>
                              <button className="proc-icon-btn delete" title="Delete" onClick={() => handleDelete(exp.expense_id)}><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                  }
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="proc-pagination">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={14} /></button>
                <span className="proc-pagination-info">Page {page} of {totalPages}</span>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button key={i + 1} className={page === i + 1 ? 'active' : ''} onClick={() => setPage(i + 1)}>{i + 1}</button>
                ))}
                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={14} /></button>
              </div>
            )}
          </div>

          {/* Add/Edit Modal */}
          {showModal && createPortal(
            <div className="proc-modal-overlay" onClick={closeModal}>
              <div className="proc-modal proc-modal-lg" onClick={e => e.stopPropagation()}>
                <div className="proc-modal-header">
                  <h2>{editId ? 'Edit Expense' : 'Add Expense'}</h2>
                  <button className="proc-modal-close" onClick={closeModal}><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="proc-modal-body">
                    <div className="proc-form-grid">
                      <div className="proc-field">
                        <label className="proc-field label">Expense Type <span className="req">*</span></label>
                        <select className="proc-input" id="expense_type" name="expense_type" value={form.expense_type} onChange={e => setForm({ ...form, expense_type: e.target.value })} required>
                          <option value="">Select Type</option>
                          {EXPENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="proc-field">
                        <label>Amount (LKR) <span className="req">*</span></label>
                        <input className="proc-input" id="amount" name="amount" type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
                      </div>
                      <div className="proc-field">
                        <label>Expense Date <span className="req">*</span></label>
                        <input className="proc-input" id="expense_date" name="expense_date" type="date" value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })} required />
                      </div>
                      <div className="proc-field">
                        <label>Department</label>
                        <select className="proc-input" id="department_id" name="department_id" value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })}>
                          <option value="">None</option>
                          {departments.map(d => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
                        </select>
                      </div>
                      <div className="proc-field">
                        <label>Linked Asset</label>
                        <select className="proc-input" id="asset_id" name="asset_id" value={form.asset_id} onChange={e => setForm({ ...form, asset_id: e.target.value })}>
                          <option value="">None</option>
                          {assets.map(a => <option key={a.asset_id} value={a.asset_id}>{a.asset_name}</option>)}
                        </select>
                      </div>
                      <div className="proc-field proc-field-full">
                        <label>Description {form.expense_type === 'Other' ? <span className="req">*</span> : '(Optional)'}</label>
                        <textarea className="proc-input proc-textarea" id="description" name="description"
                          rows={3} value={form.description}
                          onChange={e => setForm({ ...form, description: e.target.value })}
                          placeholder={form.expense_type === 'Other' ? "Required when type is 'Other'..." : 'Optional notes...'}
                          required={form.expense_type === 'Other'}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="proc-modal-footer">
                    <button type="button" className="proc-btn-outline" onClick={closeModal}>Cancel</button>
                    <button type="submit" className="proc-btn-primary" disabled={loading}>{loading ? 'Saving...' : editId ? 'Update' : 'Create'}</button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )}

          {/* View Modal */}
          {viewExpense && createPortal(
            <div className="proc-modal-overlay" onClick={() => setViewExpense(null)}>
              <div className="proc-modal" onClick={e => e.stopPropagation()}>
                <div className="proc-modal-header">
                  <h2>Expense Details</h2>
                  <button className="proc-modal-close" onClick={() => setViewExpense(null)}><X size={18} /></button>
                </div>
                <div className="proc-modal-body">
                  <div className="proc-view-grid">
                    {[['Type', <span className="proc-status-pill" style={{ background: (TYPE_COLORS[viewExpense.expense_type] || '#8b3a3a') + '18', color: TYPE_COLORS[viewExpense.expense_type] || '#8b3a3a' }}>{viewExpense.expense_type}</span>],
                      ['Amount', `LKR ${Number(viewExpense.amount).toLocaleString('en-US')}`],
                      ['Date', viewExpense.expense_date ? new Date(viewExpense.expense_date).toLocaleDateString() : '—'],
                      ['Department', viewExpense.department?.department_name || getDeptName(viewExpense.department_id)],
                      ['Linked Asset', viewExpense.asset?.asset_name || (viewExpense.asset_id ? getAssetName(viewExpense.asset_id) : '—')],
                      ['Description', viewExpense.description || '—'],
                    ].map(([l, v]) => (
                      <div className="proc-view-row" key={l}>
                        <span className="proc-view-label">{l}</span>
                        <span className="proc-view-value">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="proc-modal-footer">
                  <button className="proc-btn-outline" onClick={() => setViewExpense(null)}>Close</button>
                </div>
              </div>
            </div>,
            document.body
          )}
        </div>
      </ModuleWorkspace>
    </DashboardLayout>
  );
}

export default ExpensesPage;
