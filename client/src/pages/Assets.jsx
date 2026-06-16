import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Eye, Pencil, Trash2, Plus, Search, RefreshCw, FileDown, X, ChevronLeft, ChevronRight, Package, Archive } from "lucide-react";
import toast from "react-hot-toast";
import api from "../utils/axios";
import AdminDashboard from "./AdminDashboard";
import ManagerDashboard from "./ManagerDashboard";
import "../styles/Assets.css";

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

  const exportPDF = () => {
    const win = window.open("", "_blank", "width=1000,height=700");
    const rows = filtered.map((a, i) => `
      <tr style="background:${i % 2 === 0 ? "#fff" : "#fdf8f8"}">
        <td>#${a.asset_id}</td><td><strong>${a.asset_name}</strong></td>
        <td>${a.department?.department_name || getDeptName(a.department_id)}</td>
        <td>LKR ${Number(a.cost || 0).toLocaleString("en-LK")}</td>
        <td>${a.condition_type === "Other" ? a.custom_condition : a.condition_type}</td>
        <td><span style="padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;background:#f0f0f0;color:${STATUS_COLORS[a.status] || "#333"}">${a.status}</span></td>
        <td>${a.purchase_date ? new Date(a.purchase_date).toLocaleDateString() : "—"}</td>
        <td>${a.expiration_date ? new Date(a.expiration_date).toLocaleDateString() : "—"}</td>
      </tr>`).join("");
    win.document.write(`<!DOCTYPE html><html><head><title>Assets Report</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;padding:32px;color:#222}
      .hdr{display:flex;justify-content:space-between;border-bottom:3px solid #8b3a3a;padding-bottom:14px;margin-bottom:20px}
      h1{font-size:20px;color:#8b3a3a;font-weight:700}.meta{font-size:11px;color:#888;text-align:right}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th{background:linear-gradient(135deg,#8b3a3a,#a84545);color:#fff;padding:9px 10px;text-align:left;font-weight:600}
      td{padding:8px 10px;border-bottom:1px solid #f0f0f0}
      .footer{margin-top:20px;text-align:center;font-size:10px;color:#aaa;border-top:1px solid #eee;padding-top:10px}
      </style></head><body>
      <div class="hdr"><div><h1>Assets Report — Mathumithan Hardware</h1>
      <p style="font-size:11px;color:#888;margin-top:3px">Total: ${filtered.length} asset(s) | Active Value: LKR ${assets.filter(a => a.status !== "Disposed").reduce((s, a) => s + parseFloat(a.cost || 0), 0).toLocaleString("en-LK")}</p></div>
      <div class="meta">Generated: ${new Date().toLocaleString()}</div></div>
      <table><thead><tr><th>#</th><th>Asset Name</th><th>Department</th><th>Cost</th><th>Condition</th><th>Status</th><th>Purchased</th><th>Expires</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <div class="footer">Mathumithan Hardware POS System &bull; Assets Report &bull; Confidential</div>
      </body></html>`);
    win.document.close(); win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
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
    <div className="asset-container">
      <div className="asset-header">
        <div className="asset-header-left">
          <div className="asset-header-icon"><Package size={22} /></div>
          <div><h1>Assets</h1><p>{assets.length} total assets</p></div>
        </div>
        <div className="asset-header-actions">
          <button className="asset-btn-outline" onClick={exportPDF}><FileDown size={14} /> Export PDF</button>
          <button className="asset-btn-primary" onClick={openAdd}><Plus size={14} /> Add Asset</button>
        </div>
      </div>

      <div className="asset-stats">
        {[["Total", assets.length, "#8b3a3a"], ["Active", assets.filter(a => a.status === "Active").length, "#2e7d32"],
        ["Disposed", assets.filter(a => a.status === "Disposed").length, "#616161"],
        [`LKR ${totalCost.toLocaleString("en-LK")}`, null, "#1565c0", "Active Value"]].map(([v, _, c, l], i) => (
          <div className="asset-stat-card" key={i}>
            <div className="asset-stat-value" style={{ color: c }}>{v}</div>
            <div className="asset-stat-label">{l || ["Total", "Active", "Disposed", "Active Value"][i]}</div>
          </div>
        ))}
      </div>

      <div className="asset-filters">
        <div className="asset-search-wrap"><Search size={14} className="asset-search-icon" />
          <input className="asset-search" placeholder="Search asset name..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} /></div>
        <select className="asset-select" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
          <option value="">All Status</option>{ASSET_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="asset-select" value={filterDept} onChange={e => { setFilterDept(e.target.value); setPage(1); }}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
        </select>
        <button className="asset-refresh-btn" onClick={loadAll} disabled={pageLoading}><RefreshCw size={14} className={pageLoading ? "spin" : ""} /></button>
      </div>

      <div className="asset-table-wrap">
        <table className="asset-table">
          <thead><tr>
            <th>#</th><th>Asset Name</th><th>Department</th><th>Cost (LKR)</th>
            <th>Condition</th><th>Status</th><th>Purchased</th><th>Expires</th><th>Actions</th>
          </tr></thead>
          <tbody>
            {pageLoading ? <tr><td colSpan="9" className="asset-empty">Loading...</td></tr>
              : paginated.length === 0 ? <tr><td colSpan="9" className="asset-empty">No assets found</td></tr>
                : paginated.map(a => (
                  <tr key={a.asset_id}>
                    <td><span className="asset-id-badge">#{a.asset_id}</span></td>
                    <td className="asset-name-cell">{a.asset_name}</td>
                    <td>{a.department?.department_name || getDeptName(a.department_id)}</td>
                    <td className="asset-cost-cell">LKR {Number(a.cost || 0).toLocaleString("en-LK")}</td>
                    <td>{a.condition_type === "Other" ? a.custom_condition : a.condition_type}</td>
                    <td><span className="asset-status-pill" style={{ background: STATUS_COLORS[a.status] + "18", color: STATUS_COLORS[a.status] || "#333" }}>{a.status}</span></td>
                    <td>{a.purchase_date ? new Date(a.purchase_date).toLocaleDateString() : "—"}</td>
                    <td>{a.expiration_date ? new Date(a.expiration_date).toLocaleDateString() : "—"}</td>
                    <td><div className="asset-action-btns">
                      <button className="asset-icon-btn btn-view" title="View" onClick={() => handleView(a)}><Eye size={14} /></button>
                      {a.status !== "Disposed" && <button className="asset-icon-btn btn-edit" title="Edit" onClick={() => openEdit(a)}><Pencil size={14} /></button>}
                      {a.status !== "Disposed" && <button className="asset-icon-btn btn-dispose" title="Dispose" onClick={() => handleDispose(a)}><Archive size={14} /></button>}
                      {a.status === "Disposed" && <button className="asset-icon-btn btn-delete" title="Delete" onClick={() => handleDelete(a)}><Trash2 size={14} /></button>}
                    </div></td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && <div className="asset-pagination">
        <button disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={14} /></button>
        <span className="asset-page-info">Page {page} of {totalPages}</span>
        {Array.from({ length: totalPages }, (_, i) => <button key={i + 1} className={page === i + 1 ? "active" : ""} onClick={() => setPage(i + 1)}>{i + 1}</button>)}
        <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={14} /></button>
      </div>}

      {/* Add/Edit Modal */}
      {showModal && <div className="asset-overlay" onClick={closeModal}>
        <div className="asset-modal asset-modal-lg" onClick={e => e.stopPropagation()}>
          <div className="asset-modal-header">
            <h2>{editId ? "Edit Asset" : "Add Asset"}</h2>
            <button className="asset-modal-close" onClick={closeModal}><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmit} className="asset-modal-form">
            <div className="asset-form-grid">
              <div className="asset-field asset-field-full"><label>Asset Name *</label>
                <input value={form.asset_name} onChange={e => setForm({ ...form, asset_name: e.target.value })} required /></div>
              <div className="asset-field"><label>Department *</label>
                <select value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })} required>
                  <option value="">Select</option>{departments.map(d => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
                </select></div>
              <div className="asset-field"><label>Cost (LKR) *</label>
                <input type="number" min="0" step="0.01" value={form.cost}
                  onChange={e => setForm({ ...form, cost: e.target.value, expense_amount: e.target.value })} required /></div>
              <div className="asset-field"><label>Purchase Date *</label>
                <input type="date" value={form.purchase_date} max={new Date().toISOString().split("T")[0]} onChange={e => setForm({ ...form, purchase_date: e.target.value })} required /></div>
              <div className="asset-field"><label>Expiration Date</label>
                <input type="date" value={form.expiration_date} min={new Date().toISOString().split("T")[0]} onChange={e => setForm({ ...form, expiration_date: e.target.value })} /></div>
              <div className="asset-field"><label>Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  {ASSET_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select></div>
              <div className="asset-field"><label>Condition</label>
                <select value={form.condition_type} onChange={e => setForm({ ...form, condition_type: e.target.value })}>
                  {CONDITION_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                </select></div>
              {form.condition_type === "Other" && <div className="asset-field"><label>Custom Condition *</label>
                <input value={form.custom_condition} onChange={e => setForm({ ...form, custom_condition: e.target.value })} required /></div>}
            </div>
            {!editId && <div className="asset-expense-section">
              <label className="asset-checkbox-label">
                <input type="checkbox" checked={form.add_as_expense} onChange={e => setForm({ ...form, add_as_expense: e.target.checked })} />
                <span>Also add as an expense record</span>
              </label>
              {form.add_as_expense && <div className="asset-form-grid asset-expense-fields">
                <div className="asset-field"><label>Expense Type</label>
                  <select value={form.expense_type} onChange={e => setForm({ ...form, expense_type: e.target.value })}>
                    {EXPENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select></div>
                <div className="asset-field"><label>Expense Amount</label>
                  <input type="number" min="0" value={form.expense_amount} onChange={e => setForm({ ...form, expense_amount: e.target.value })} /></div>
                <div className="asset-field asset-field-full"><label>Description</label>
                  <input value={form.expense_description} onChange={e => setForm({ ...form, expense_description: e.target.value })} placeholder="Optional..." /></div>
              </div>}
            </div>}
            <div className="asset-modal-footer">
              <button type="button" className="asset-btn-cancel" onClick={closeModal}>Cancel</button>
              <button type="submit" className="asset-btn-submit" disabled={loading}>{loading ? "Saving..." : editId ? "Update" : "Create"}</button>
            </div>
          </form>
        </div>
      </div>}

      {/* View Modal */}
      {viewAsset && <div className="asset-overlay" onClick={() => setViewAsset(null)}>
        <div className="asset-modal" onClick={e => e.stopPropagation()}>
          <div className="asset-modal-header">
            <h2>Asset Details</h2>
            <button className="asset-modal-close" onClick={() => setViewAsset(null)}><X size={18} /></button>
          </div>
          <div className="asset-view-grid">
            {[["Asset Name", viewAsset.asset_name], ["Department", viewAsset.department?.department_name || getDeptName(viewAsset.department_id)],
            ["Cost", `LKR ${Number(viewAsset.cost).toLocaleString("en-LK")}`],
            ["Condition", viewAsset.condition_type === "Other" ? viewAsset.custom_condition : viewAsset.condition_type],
            ["Status", viewAsset.status], ["Purchase Date", viewAsset.purchase_date ? new Date(viewAsset.purchase_date).toLocaleDateString() : "—"],
            ["Expiration", viewAsset.expiration_date ? new Date(viewAsset.expiration_date).toLocaleDateString() : "—"]
            ].map(([l, v]) => <div className="asset-view-row" key={l}><span className="asset-view-label">{l}</span><span className="asset-view-value">{v}</span></div>)}
          </div>
          {(viewAsset.expenses || []).length > 0 && <div className="asset-view-section">
            <h3>Linked Expenses</h3>
            <div className="asset-inner-wrap"><table className="asset-inner-table">
              <thead><tr><th>Type</th><th>Amount</th><th>Date</th></tr></thead>
              <tbody>{viewAsset.expenses.map(exp => <tr key={exp.expense_id}>
                <td>{exp.expense_type}</td><td>LKR {Number(exp.amount).toLocaleString("en-LK")}</td>
                <td>{exp.expense_date ? new Date(exp.expense_date).toLocaleDateString() : "—"}</td>
              </tr>)}</tbody>
            </table></div>
          </div>}
        </div>
      </div>}
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
