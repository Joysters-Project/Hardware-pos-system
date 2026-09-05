import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { Eye, Pencil, Trash2, Plus, Search, RefreshCw, FileDown, X, ChevronLeft, ChevronRight, Package, Archive } from "lucide-react";
import toast from "react-hot-toast";
import api from "../utils/axios";
import { buildTableHtml, escapeHtml, printWithTemplate } from "../utils/printTemplate";
import AdminDashboard from "./AdminDashboard";
import ManagerDashboard from "./ManagerDashboard";
import ModuleWorkspace from "../components/navigation/ModuleWorkspace";
import InventoryTopNav from "../components/navigation/InventoryTopNav";
import "../styles/Procurement.css";

const CONDITION_TYPES = ["New", "Good", "Fair", "Poor", "Damaged", "Other"];
const ASSET_STATUSES = ["Active", "Maintenance", "Damaged", "Lost", "Disposed"];
const EXPENSE_TYPES = ["Asset Purchase", "Salary", "Utility Bills", "Maintenance", "Transport", "Office Supplies", "Other"];
const EMPTY_FORM = {
  asset_name: "", department_id: "", cost: "", purchase_date: "", expiration_date: "", status: "Active",
  condition_type: "Good", custom_condition: "", add_as_expense: false, expense_type: "Asset Purchase", expense_amount: "", expense_description: ""
};

const STATUS_COLORS = { Active: "#2e7d32", Maintenance: "#e65100", Damaged: "#c62828", Lost: "#6a1b9a", Disposed: "#616161" };

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
  const [pageLoading, setPageLoading] = useState(true);
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setPageLoading(true);
    try {
      const [assetRes, deptRes] = await Promise.all([api.get("/assets"), api.get("/departments")]);
      setAssets(assetRes.data); setDepartments(deptRes.data);
    } catch { toast.error("Failed to load assets"); }
    finally { setPageLoading(false); }
  };

  const openAdd = () => { setForm(EMPTY_FORM); setEditId(null); setShowModal(true); };
  const openEdit = (a) => {
    setForm({
      asset_name: a.asset_name || "", department_id: a.department_id || "", cost: a.cost || "",
      purchase_date: a.purchase_date || "", expiration_date: a.expiration_date || "", status: a.status || "Active",
      condition_type: a.condition_type || "Good", custom_condition: a.custom_condition || "",
      add_as_expense: false, expense_type: "Asset Purchase", expense_amount: "", expense_description: ""
    });
    setEditId(a.asset_id); setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setForm(EMPTY_FORM); setEditId(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.asset_name || !form.department_id || !form.purchase_date) { toast.error("Name, department and date required"); return; }

    const selectedDept = departments.find(d => String(d.department_id) === String(form.department_id));
    const budgetValue = Number(form.cost || 0);
    const remainingBudget = Number(selectedDept?.remaining_budget ?? selectedDept?.remaining_balance ?? selectedDept?.budget ?? 0);

    if (selectedDept && budgetValue > remainingBudget) {
      toast.error(`Asset cost exceeds the remaining budget for ${selectedDept.department_name}.`);
      return;
    }

    setLoading(true);
    try {
      if (editId) { await api.put(`/assets/${editId}`, form); toast.success("Asset updated"); }
      else { const res = await api.post("/assets", form); toast.success(res.data.expense ? "Asset & expense created" : "Asset created"); }
      closeModal(); loadAll();
    } catch (err) { toast.error(err.response?.data?.message || "Operation failed"); }
    finally { setLoading(false); }
  };

  const handleDispose = async (a) => {
    if (!window.confirm(`Mark "${a.asset_name}" as Disposed?`)) return;
    try { await api.patch(`/assets/${a.asset_id}/dispose`); toast.success("Asset disposed"); loadAll(); }
    catch (err) { toast.error(err.response?.data?.message || "Failed"); }
  };

  const handleDelete = async (a) => {
    if (a.status !== "Disposed") { toast.error("Only Disposed assets can be deleted"); return; }
    if (!window.confirm(`Permanently delete "${a.asset_name}"?`)) return;
    try { await api.delete(`/assets/${a.asset_id}`); toast.success("Asset deleted"); loadAll(); }
    catch (err) { toast.error(err.response?.data?.message || "Delete failed"); }
  };

  const handleView = async (a) => {
    try { const res = await api.get(`/assets/${a.asset_id}`); setViewAsset(res.data); }
    catch { toast.error("Failed to load details"); }
  };

  const getDeptName = (id) => departments.find(d => d.department_id === id)?.department_name || "N/A";
  const getDeptLabel = (dept) => {
    const remaining = Math.max(0, Number(dept?.remaining_budget ?? dept?.remaining_balance ?? dept?.budget ?? 0));
    return `${dept?.department_name || "Department"} (Remaining: LKR ${remaining.toLocaleString("en-LK")})`;
  };

  const exportPDF = () => {
    const rows = filtered.map((a) => ([
      escapeHtml(`#${a.asset_id}`),
      `<strong>${escapeHtml(a.asset_name)}</strong>`,
      escapeHtml(a.department?.department_name || getDeptName(a.department_id)),
      escapeHtml(`LKR ${Number(a.cost || 0).toLocaleString("en-US")}`),
      escapeHtml(a.condition_type === "Other" ? a.custom_condition : a.condition_type),
      `<span style="font-weight:700;color:${STATUS_COLORS[a.status] || "#333"}">${escapeHtml(a.status || "—")}</span>`,
      escapeHtml(a.purchase_date ? new Date(a.purchase_date).toLocaleDateString() : "—"),
      escapeHtml(a.expiration_date ? new Date(a.expiration_date).toLocaleDateString() : "—"),
    ]));

    const totalActiveValue = assets
      .filter(a => a.status !== "Disposed")
      .reduce((sum, a) => sum + parseFloat(a.cost || 0), 0);

    const contentHtml = buildTableHtml({
      columns: ["#", "Asset Name", "Department", "Cost", "Condition", "Status", "Purchased", "Expires"],
      rows,
      emptyMessage: "No assets found"
    });

    const opened = printWithTemplate({
      title: "Assets Report",
      subtitle: `Total: ${filtered.length} asset(s) | Active Value: LKR ${totalActiveValue.toLocaleString("en-US")}`,
      contentHtml,
    });

    if (!opened) toast.error("Allow pop-ups to print the report");
  };

  const filtered = assets.filter(a => {
    return (!search || a.asset_name.toLowerCase().includes(search.toLowerCase()))
      && (!filterStatus || a.status === filterStatus)
      && (!filterDept || String(a.department_id) === String(filterDept));
  });
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalCost = assets.filter(a => a.status !== "Disposed").reduce((s, a) => s + parseFloat(a.cost || 0), 0);

  return (
    <div className="proc-container">
      <div className="proc-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
          <div className="proc-header-icon"><Package size={22} /></div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h1 style={{ margin: 0 }}>Assets</h1>
              <span className="proc-count-badge">{assets.length}</span>
            </div>
            <p style={{ margin: 0, color: "var(--proc-text-muted, #666)", fontSize: "0.85rem" }}>
              Track organization equipment, condition and maintenance lifecycle
            </p>
          </div>
        </div>
        <div className="proc-header-actions">
          <button className="proc-btn-outline" onClick={exportPDF}><FileDown size={14} /> Export PDF</button>
          <button className="proc-btn-primary" onClick={openAdd}><Plus size={14} /> Add Asset</button>
        </div>
      </div>

      <div className="proc-stats">
        {[
          [assets.length, "#8b3a3a", "Total Assets"],
          [assets.filter(a => a.status === "Active").length, "#2e7d32", "Active"],
          [assets.filter(a => a.status === "Maintenance").length, "#e65100", "Maintenance"],
          [assets.filter(a => a.status === "Damaged").length, "#c62828", "Damaged"],
          [assets.filter(a => a.status === "Lost").length, "#6a1b9a", "Lost"],
          [assets.filter(a => a.status === "Disposed").length, "#616161", "Disposed Count"],
          [`LKR ${totalCost.toLocaleString("en-US")}`, "#1565c0", "Active Value"],
        ].map(([value, color, label], index) => (
          <div className="proc-stat-card" key={index}>
            <div className="proc-stat-value" style={{ color }}>{value}</div>
            <div className="proc-stat-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="proc-filters-row">
        <div className="proc-search-wrap">
          <Search size={14} className="proc-search-icon" />
          <input id="search" name="search" className="proc-search" placeholder="Search asset name..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select id="filterStatus" name="filterStatus" className="proc-select" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
          <option value="">All Status</option>{ASSET_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select id="filterDept" name="filterDept" className="proc-select" value={filterDept} onChange={e => { setFilterDept(e.target.value); setPage(1); }}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
        </select>
        <button className="proc-refresh-btn" onClick={loadAll} disabled={pageLoading} title="Refresh">
          <RefreshCw size={14} className={pageLoading ? "proc-spin-fast" : ""} />
        </button>
      </div>

      <div className="proc-card">
        <div className="proc-table-wrap">
          <table className="proc-table">
            <thead>
              <tr>
                <th>#</th><th>Asset Name</th><th>Department</th><th>Cost (LKR)</th>
                <th>Condition</th><th>Status</th><th>Purchased</th><th>Expires</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageLoading ? <tr><td colSpan="9" className="proc-empty">Loading assets...</td></tr>
                : paginated.length === 0 ? <tr><td colSpan="9" className="proc-empty">No assets found</td></tr>
                  : paginated.map(a => (
                    <tr key={a.asset_id}>
                      <td><span className="proc-code-badge">#{a.asset_id}</span></td>
                      <td className="proc-name-cell">{a.asset_name}</td>
                      <td>{a.department?.department_name || getDeptName(a.department_id)}</td>
                      <td className="proc-amount">LKR {Number(a.cost || 0).toLocaleString("en-US")}</td>
                      <td>{a.condition_type === "Other" ? a.custom_condition : a.condition_type}</td>
                      <td><span className="proc-status-pill" style={{ background: STATUS_COLORS[a.status] + "18", color: STATUS_COLORS[a.status] || "#333" }}>{a.status}</span></td>
                      <td>{a.purchase_date ? new Date(a.purchase_date).toLocaleDateString() : "—"}</td>
                      <td>{a.expiration_date ? new Date(a.expiration_date).toLocaleDateString() : "—"}</td>
                      <td><div className="proc-action-btns">
                        <button className="proc-icon-btn view" title="View" onClick={() => handleView(a)}><Eye size={14} /></button>
                        {a.status !== "Disposed" && <button className="proc-icon-btn edit" title="Edit" onClick={() => openEdit(a)}><Pencil size={14} /></button>}
                        {a.status !== "Disposed" && <button className="proc-icon-btn" style={{ color: "#e65100" }} title="Dispose" onClick={() => handleDispose(a)}><Archive size={14} /></button>}
                        {a.status === "Disposed" && <button className="proc-icon-btn delete" title="Delete" onClick={() => handleDelete(a)}><Trash2 size={14} /></button>}
                      </div></td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && <div className="proc-pagination">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={14} /></button>
          <span className="proc-pagination-info">Page {page} of {totalPages}</span>
          {Array.from({ length: totalPages }, (_, i) => <button key={i + 1} className={page === i + 1 ? "active" : ""} onClick={() => setPage(i + 1)}>{i + 1}</button>)}
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={14} /></button>
        </div>}
      </div>

      {/* Add/Edit Modal */}
      {showModal && createPortal(
        <div className="proc-modal-overlay" onClick={closeModal}>
          <div className="proc-modal proc-modal-lg" onClick={e => e.stopPropagation()}>
            <div className="proc-modal-header">
              <h2>{editId ? "Edit Asset" : "Add Asset"}</h2>
              <button className="proc-modal-close" onClick={closeModal}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="proc-modal-body">
                <div className="proc-form-grid">
                  <div className="proc-field proc-field-full"><label>Asset Name *</label>
                    <input id="asset_name" name="asset_name" className="proc-input" value={form.asset_name} onChange={e => setForm({ ...form, asset_name: e.target.value })} required /></div>
                  <div className="proc-field"><label>Department *</label>
                    <select className="proc-select" value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })} required>
                      <option value="">Select</option>{departments.filter(d => String(d.status || "").toLowerCase() === "active").map(d => <option key={d.department_id} value={d.department_id}>{getDeptLabel(d)}</option>)}
                    </select></div>
                  <div className="proc-field"><label>Cost (LKR) *</label>
                    <input id="cost" name="cost" type="number" min="0" step="0.01" className="proc-input" value={form.cost}
                      onChange={e => setForm({ ...form, cost: e.target.value, expense_amount: e.target.value })} required /></div>
                  <div className="proc-field"><label>Purchase Date *</label>
                    <input id="purchase_date" name="purchase_date" type="date" className="proc-date-input" value={form.purchase_date} max={new Date().toISOString().split("T")[0]} onChange={e => setForm({ ...form, purchase_date: e.target.value })} required /></div>
                  <div className="proc-field"><label>Expiration Date</label>
                    <input id="expiration_date" name="expiration_date" type="date" className="proc-date-input" value={form.expiration_date} min={new Date().toISOString().split("T")[0]} onChange={e => setForm({ ...form, expiration_date: e.target.value })} /></div>
                  <div className="proc-field"><label>Status</label>
                    <select id="status" name="status" className="proc-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                      {ASSET_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select></div>
                  <div className="proc-field"><label>Condition</label>
                    <select id="condition_type" name="condition_type" className="proc-select" value={form.condition_type} onChange={e => setForm({ ...form, condition_type: e.target.value })}>
                      {CONDITION_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select></div>
                  {form.condition_type === "Other" && <div className="proc-field"><label>Custom Condition *</label>
                    <input id="custom_condition" name="custom_condition" className="proc-input" value={form.custom_condition} onChange={e => setForm({ ...form, custom_condition: e.target.value })} required /></div>}
                </div>
                {!editId && <div style={{ marginTop: "1rem", paddingTop: "0.85rem", borderTop: "1px solid var(--proc-border, #e5e7eb)" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontWeight: 500, fontSize: "0.9rem" }}>
                    <input id="checkbox_field" name="checkbox_field" type="checkbox" checked={form.add_as_expense} onChange={e => setForm({ ...form, add_as_expense: e.target.checked })} />
                    <span>Also add as an expense record</span>
                  </label>
                  {form.add_as_expense && <div className="proc-form-grid" style={{ marginTop: "0.85rem" }}>
                    <div className="proc-field"><label>Expense Type</label>
                      <select id="expense_type" name="expense_type" className="proc-select" value={form.expense_type} onChange={e => setForm({ ...form, expense_type: e.target.value })}>
                        {EXPENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select></div>
                    <div className="proc-field"><label>Expense Amount</label>
                      <input id="expense_amount" name="expense_amount" type="number" min="0" className="proc-input" value={form.expense_amount} onChange={e => setForm({ ...form, expense_amount: e.target.value })} /></div>
                    <div className="proc-field proc-field-full"><label>Description</label>
                      <input id="expense_description" name="expense_description" className="proc-input" value={form.expense_description} onChange={e => setForm({ ...form, expense_description: e.target.value })} placeholder="Optional..." /></div>
                  </div>}
                </div>}
              </div>
              <div className="proc-modal-footer">
                <button type="button" className="proc-btn-outline" onClick={closeModal}>Cancel</button>
                <button type="submit" className="proc-btn-primary" disabled={loading}>{loading ? "Saving..." : editId ? "Update" : "Create"}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* View Modal */}
      {viewAsset && createPortal(
        <div className="proc-modal-overlay" onClick={() => setViewAsset(null)}>
          <div className="proc-modal" onClick={e => e.stopPropagation()}>
            <div className="proc-modal-header">
              <h2>Asset Details</h2>
              <button className="proc-modal-close" onClick={() => setViewAsset(null)}><X size={18} /></button>
            </div>
            <div className="proc-modal-body">
              <div className="proc-view-grid">
                {[["Asset Name", viewAsset.asset_name], ["Department", viewAsset.department?.department_name || getDeptName(viewAsset.department_id)],
                ["Cost", `LKR ${Number(viewAsset.cost).toLocaleString("en-US")}`],
                ["Condition", viewAsset.condition_type === "Other" ? viewAsset.custom_condition : viewAsset.condition_type],
                ["Status", viewAsset.status], ["Purchase Date", viewAsset.purchase_date ? new Date(viewAsset.purchase_date).toLocaleDateString() : "—"],
                ["Expiration", viewAsset.expiration_date ? new Date(viewAsset.expiration_date).toLocaleDateString() : "—"]
                ].map(([l, v]) => <div className="proc-view-row" key={l}><span className="proc-view-label">{l}</span><span className="proc-view-value">{v}</span></div>)}
              </div>
              {(viewAsset.expenses || []).length > 0 && <div style={{ marginTop: "1.25rem" }}>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "0.5rem" }}>Linked Expenses</h3>
                <div className="proc-table-wrap"><table className="proc-table">
                  <thead><tr><th>Type</th><th>Amount</th><th>Date</th></tr></thead>
                  <tbody>{viewAsset.expenses.map(exp => <tr key={exp.expense_id}>
                    <td>{exp.expense_type}</td><td>LKR {Number(exp.amount).toLocaleString("en-US")}</td>
                    <td>{exp.expense_date ? new Date(exp.expense_date).toLocaleDateString() : "—"}</td>
                  </tr>)}</tbody>
                </table></div>
              </div>}
            </div>
            <div className="proc-modal-footer">
              <button type="button" className="proc-btn-outline" onClick={() => setViewAsset(null)}>Close</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default function Assets() {
  const location = useLocation();
  const role = (localStorage.getItem("role") || "admin").toLowerCase();
  const isManager = location.pathname.startsWith("/manager/") || role === "manager";
  const Layout = isManager ? ManagerDashboard : AdminDashboard;
  return (
    <Layout active="assets">
      <ModuleWorkspace nav={InventoryTopNav}>
        <AssetsPage />
      </ModuleWorkspace>
    </Layout>
  );
}
