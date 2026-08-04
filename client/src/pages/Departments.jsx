import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Building2, Users, Package, FolderOpen, Plus, Search, Pencil, Trash2, Eye, X, ChevronLeft, ChevronRight, DollarSign } from "lucide-react";
import toast from "react-hot-toast";
import api from "../utils/axios";
import AdminDashboard from "./AdminDashboard";
import ManagerDashboard from "./ManagerDashboard";
import "../styles/Departments.css";

const EMPTY_FORM = { department_name: "", budget: "", description: "", status: "Active" };

const DEPT_COLORS = [
  { bg: "linear-gradient(135deg,#8b3a3a,#c0504d)", light: "#fff0f0", accent: "#8b3a3a" },
  { bg: "linear-gradient(135deg,#1565c0,#1e88e5)", light: "#e8f4fd", accent: "#1565c0" },
  { bg: "linear-gradient(135deg,#2e7d32,#43a047)", light: "#e8f5e9", accent: "#2e7d32" },
  { bg: "linear-gradient(135deg,#6a1b9a,#9c27b0)", light: "#f3e5f5", accent: "#6a1b9a" },
  { bg: "linear-gradient(135deg,#e65100,#fb8c00)", light: "#fff3e0", accent: "#e65100" },
  { bg: "linear-gradient(135deg,#00695c,#00897b)", light: "#e0f2f1", accent: "#00695c" },
  { bg: "linear-gradient(135deg,#4527a0,#7e57c2)", light: "#ede7f6", accent: "#4527a0" },
  { bg: "linear-gradient(135deg,#ad1457,#e91e63)", light: "#fce4ec", accent: "#ad1457" },
];

const getColor = (id) => {
  const numericId = Number(id);
  const safeIndex = Number.isFinite(numericId) && numericId > 0
    ? (numericId - 1) % DEPT_COLORS.length
    : 0;
  return DEPT_COLORS[safeIndex] || DEPT_COLORS[0];
};
const initials = (name) => name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";

function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [viewDept, setViewDept] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState(null);
  const PER_PAGE = 9;

  useEffect(() => { loadDepartments(); }, []);

  const normalizeDepartments = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.data)) return payload.data;
    if (payload && Array.isArray(payload.value)) return payload.value;
    return [];
  };

  const loadDepartments = async () => {
    setPageLoading(true);
    try {
      const res = await api.get("/departments");
      setDepartments(normalizeDepartments(res.data));
    } catch { toast.error("Failed to load departments"); }
    finally { setPageLoading(false); }
  };

  const openAdd = () => { setForm(EMPTY_FORM); setEditId(null); setShowModal(true); };
  const openEdit = (d) => {
    setForm({
      department_name: d.department_name,
      budget: d.budget ?? "",
      description: d.description || "",
      status: d.status || "Active"
    });
    setEditId(d.department_id);
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setForm(EMPTY_FORM); setEditId(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.department_name.trim()) { toast.error("Department name is required"); return; }
    const budgetValue = form.budget === "" ? 0 : Number(form.budget);
    if (Number.isNaN(budgetValue) || budgetValue < 0) { toast.error("Budget must be a valid number"); return; }

    if (String(form.status).toLowerCase() === "inactive" && editId) {
      try {
        const res = await api.get(`/departments/${editId}`);
        const payload = res.data?.data || res.data;
        const hasActiveEmployee = (payload.employees || []).some(e =>
          String(e.status || "").toLowerCase() === "active"
        );

        if (hasActiveEmployee) {
          toast.error("Cannot make department inactive while it has active employees.");
          return;
        }
      } catch {
        toast.error("Unable to verify employee status right now.");
        return;
      }
    }

    setLoading(true);
    try {
      const payload = { ...form, budget: budgetValue };
      if (editId) {
        await api.put(`/departments/${editId}`, payload);
        toast.success("Department updated!");
      } else {
        await api.post("/departments", payload);
        toast.success("Department created!");
      }
      closeModal();
      loadDepartments();
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed");
    } finally { setLoading(false); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await api.delete(`/departments/${id}`);
      toast.success("Department deleted");
      loadDepartments();
    } catch (err) { toast.error(err.response?.data?.message || "Delete failed"); }
    finally { setDeletingId(null); }
  };

  const handleView = async (d) => {
    try {
      const res = await api.get(`/departments/${d.department_id}`);
      const payload = res.data?.data || res.data;
      setViewDept(payload);
    } catch { toast.error("Failed to load details"); }
  };

  const printEmployees = (dept) => {
    const win = window.open("", "_blank", "width=900,height=650");
    const rows = (dept.employees || []).map((e, i) => `
      <tr style="background:${i % 2 === 0 ? "#fff" : "#fdf8f8"}">
        <td>#${e.employee_id}</td>
        <td><strong>${e.first_name} ${e.last_name}</strong></td>
        <td>${e.position || "—"}</td>
        <td><span style="padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;
          background:${e.status === "Active" ? "#e8f5e9" : "#fce4e4"};color:${e.status === "Active" ? "#2e7d32" : "#c62828"}">${e.status}</span></td>
        <td>${e.email || "—"}</td>
      </tr>`).join("");
    win.document.write(`<!DOCTYPE html><html><head><title>Employees — ${dept.department_name}</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;padding:32px;color:#222}
      .hdr{display:flex;justify-content:space-between;border-bottom:3px solid #8b3a3a;padding-bottom:14px;margin-bottom:20px}
      h1{font-size:18px;color:#8b3a3a;font-weight:700}.meta{font-size:11px;color:#888;text-align:right}
      table{width:100%;border-collapse:collapse;font-size:13px}
      th{background:linear-gradient(135deg,#8b3a3a,#a84545);color:#fff;padding:9px 12px;text-align:left;font-weight:600}
      td{padding:9px 12px;border-bottom:1px solid #f0f0f0}
      .footer{margin-top:20px;text-align:center;font-size:10px;color:#aaa;border-top:1px solid #eee;padding-top:10px}
      </style></head><body>
      <div class="hdr"><div><h1>Employees — ${dept.department_name}</h1>
      <p style="font-size:11px;color:#888;margin-top:3px">${dept.employees.length} employee(s)</p></div>
      <div class="meta">Generated: ${new Date().toLocaleString()}</div></div>
      <table><thead><tr><th>#</th><th>Name</th><th>Position</th><th>Status</th><th>Email</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <div class="footer">Mathumithan Hardware POS System • ${dept.department_name} Department</div>
      </body></html>`);
    win.document.close(); win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const printAssets = (dept) => {
    const win = window.open("", "_blank", "width=900,height=650");
    const ASSET_COLORS = { Active: "#2e7d32", Maintenance: "#e65100", Damaged: "#c62828", Lost: "#6a1b9a", Disposed: "#616161" };
    const totalCost = (dept.assets || []).reduce((s, a) => s + parseFloat(a.cost || 0), 0);
    const rows = (dept.assets || []).map((a, i) => `
      <tr style="background:${i % 2 === 0 ? "#fff" : "#fdf8f8"}">
        <td>#${a.asset_id}</td>
        <td><strong>${a.asset_name}</strong></td>
        <td>LKR ${Number(a.cost).toLocaleString("en-US")}</td>
        <td><span style="padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;
          background:${(ASSET_COLORS[a.status] || "#333") + "18"};color:${ASSET_COLORS[a.status] || "#333"}">${a.status}</span></td>
        <td>${a.purchase_date ? new Date(a.purchase_date).toLocaleDateString() : "—"}</td>
      </tr>`).join("");
    win.document.write(`<!DOCTYPE html><html><head><title>Assets — ${dept.department_name}</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;padding:32px;color:#222}
      .hdr{display:flex;justify-content:space-between;border-bottom:3px solid #8b3a3a;padding-bottom:14px;margin-bottom:20px}
      h1{font-size:18px;color:#8b3a3a;font-weight:700}.meta{font-size:11px;color:#888;text-align:right}
      .summary{background:#fdf5f5;border:1px solid #f0dede;border-radius:8px;padding:10px 16px;margin-bottom:16px;font-size:13px}
      table{width:100%;border-collapse:collapse;font-size:13px}
      th{background:linear-gradient(135deg,#8b3a3a,#a84545);color:#fff;padding:9px 12px;text-align:left;font-weight:600}
      td{padding:9px 12px;border-bottom:1px solid #f0f0f0}
      .footer{margin-top:20px;text-align:center;font-size:10px;color:#aaa;border-top:1px solid #eee;padding-top:10px}
      </style></head><body>
      <div class="hdr"><div><h1>Assets — ${dept.department_name}</h1>
      <p style="font-size:11px;color:#888;margin-top:3px">${dept.assets.length} asset(s)</p></div>
      <div class="meta">Generated: ${new Date().toLocaleString()}</div></div>
      <div class="summary">Total Active Asset Value: <strong>LKR ${totalCost.toLocaleString("en-US")}</strong></div>
      <table><thead><tr><th>#</th><th>Asset Name</th><th>Cost</th><th>Status</th><th>Purchased</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <div class="footer">Mathumithan Hardware POS System • ${dept.department_name} Department</div>
      </body></html>`);
    win.document.close(); win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const filtered = departments.filter(d => {
    const matchSearch = d.department_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "All" || d.status === filterStatus;
    return matchSearch && matchStatus;
  });
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const stats = [
    { label: "Total", value: departments.length, icon: <Building2 size={20} />, color: "#8b3a3a" },
    { label: "Active", value: departments.filter(d => d.status === "Active").length, icon: <Building2 size={20} />, color: "#2e7d32" },
    { label: "Employees", value: departments.reduce((s, d) => s + (d.employee_count || 0), 0), icon: <Users size={20} />, color: "#1565c0" },
    { label: "Assets", value: departments.reduce((s, d) => s + (d.asset_count || 0), 0), icon: <Package size={20} />, color: "#6a1b9a" },
  ];

  return (
    <div className="dept-container">

      {/* Header */}
      <div className="dept-header">
        <div className="dept-header-left">
          <div className="dept-header-icon"><Building2 size={24} /></div>
          <div>
            <h1>Departments</h1>
            <p>{departments.length} department{departments.length !== 1 ? "s" : ""} total</p>
          </div>
        </div>
        <button className="dept-add-btn" onClick={openAdd}>
          <Plus size={16} /> Add Department
        </button>
      </div>

      {/* Stats */}
      <div className="dept-stats">
        {stats.map((s, i) => (
          <div className="dept-stat-card" key={i} style={{ "--accent": s.color }}>
            <div className="dept-stat-icon" style={{ background: s.color + "18", color: s.color }}>{s.icon}</div>
            <div>
              <div className="dept-stat-value">{s.value}</div>
              <div className="dept-stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="dept-toolbar">
        <div className="dept-search-wrap">
          <Search size={15} className="dept-search-icon" />
          <input
            className="dept-search"
            placeholder="Search departments..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="dept-filter-tabs">
          {["All", "Active", "Inactive"].map(s => (
            <button
              key={s}
              className={`dept-filter-tab ${filterStatus === s ? "active" : ""}`}
              onClick={() => { setFilterStatus(s); setPage(1); }}
            >{s}</button>
          ))}
        </div>
      </div>

      {/* Cards Grid */}
      {pageLoading ? (
        <div className="dept-skeleton-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div className="dept-skeleton-card" key={i}>
              <div className="skeleton-header" />
              <div className="skeleton-body">
                <div className="skeleton-line w60" />
                <div className="skeleton-line w40" />
                <div className="skeleton-line w80" />
              </div>
            </div>
          ))}
        </div>
      ) : paginated.length === 0 ? (
        <div className="dept-empty">
          <Building2 size={48} />
          <p>No departments found</p>
          <span>Try adjusting your search or filters</span>
        </div>
      ) : (
        <div className="dept-grid">
          {paginated.map((d, idx) => {
            const color = getColor(d.department_id);
            return (
              <div
                className="dept-card"
                key={d.department_id}
                style={{ "--card-delay": `${idx * 60}ms` }}
              >
                {/* Card Top Banner */}
                <div className="dept-card-banner" style={{ background: color.bg }}>
                  <div className="dept-card-avatar">{initials(d.department_name)}</div>
                  <span className={`dept-status-badge ${d.status?.toLowerCase() === "active" ? "badge-active" : "badge-inactive"}`}>
                    {d.status || "Active"}
                  </span>
                </div>

                {/* Card Body */}
                <div className="dept-card-body">
                  <h3 className="dept-card-name">{d.department_name}</h3>
                  <p className="dept-card-desc">{d.description || "No description provided."}</p>

                  <div className="dept-card-meta">
                    <div className="dept-meta-item" style={{ "--meta-color": "#8b3a3a" }}>
                      <DollarSign size={14} />
                      <span>LKR {Number(d.budget || 0).toLocaleString("en-LK")}</span>
                    </div>
                    <div className="dept-meta-item" style={{ "--meta-color": "#1565c0" }}>
                      <Users size={14} />
                      <span>{d.employee_count || 0} Employees</span>
                    </div>
                    <div className="dept-meta-item" style={{ "--meta-color": "#6a1b9a" }}>
                      <Package size={14} />
                      <span>{d.asset_count || 0} Assets</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="dept-card-footer">
                  <button className="dept-icon-btn btn-view" title="View Details" onClick={() => handleView(d)}>
                    <Eye size={14} /> View
                  </button>
                  <button className="dept-icon-btn btn-edit" title="Edit" onClick={() => openEdit(d)}>
                    <Pencil size={14} /> Edit
                  </button>
                  <button
                    className="dept-icon-btn btn-delete"
                    title="Delete"
                    onClick={() => handleDelete(d.department_id, d.department_name)}
                    disabled={deletingId === d.department_id}
                  >
                    <Trash2 size={14} /> {deletingId === d.department_id ? "..." : "Delete"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="dept-pagination">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft size={16} />
          </button>
          <span className="dept-page-info">Page {page} of {totalPages}</span>
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i + 1} className={page === i + 1 ? "active" : ""} onClick={() => setPage(i + 1)}>{i + 1}</button>
          ))}
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="dept-overlay" onClick={closeModal}>
          <div className="dept-modal" onClick={e => e.stopPropagation()}>
            <div className="dept-modal-header">
              <div className="dept-modal-title">
                <div className="dept-modal-icon"><Building2 size={18} /></div>
                <h2>{editId ? "Edit Department" : "New Department"}</h2>
              </div>
              <button className="dept-modal-close" onClick={closeModal}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="dept-modal-form">
              <div className="dept-field">
                <label>Department Name <span className="req">*</span></label>
                <input
                  value={form.department_name}
                  onChange={e => setForm({ ...form, department_name: e.target.value })}
                  placeholder="e.g. Sales, IT, Warehouse"
                  autoFocus
                />
              </div>
              <div className="dept-field">
                <label>Budget <span className="req">*</span></label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.budget}
                  onChange={e => setForm({ ...form, budget: e.target.value })}
                  placeholder="e.g. 500000"
                />
              </div>
              <div className="dept-field">
                <label>Description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional description..."
                />
              </div>
              <div className="dept-field">
                <label>Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="dept-modal-footer">
                <button type="button" className="dept-btn-cancel" onClick={closeModal}>Cancel</button>
                <button type="submit" className="dept-btn-submit" disabled={loading}>
                  {loading ? "Saving..." : editId ? "Save Changes" : "Create Department"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewDept && (
        <div className="dept-overlay" onClick={() => setViewDept(null)}>
          <div className="dept-modal dept-modal-lg" onClick={e => e.stopPropagation()}>
            <div className="dept-modal-header">
              <div className="dept-modal-title">
                <div className="dept-modal-icon" style={{ background: getColor(viewDept.department_id).bg }}>
                  {initials(viewDept.department_name)}
                </div>
                <div>
                  <h2>{viewDept.department_name}</h2>
                  <span className={`dept-status-badge ${viewDept.status?.toLowerCase() === "active" ? "badge-active" : "badge-inactive"}`}>
                    {viewDept.status}
                  </span>
                </div>
              </div>
              <button className="dept-modal-close" onClick={() => setViewDept(null)}><X size={18} /></button>
            </div>

            <div className="dept-view-stats">
              <div className="dept-view-stat">
                <DollarSign size={16} />
                <span>Budget: LKR {Number(viewDept.budget || 0).toLocaleString("en-LK")}</span>
              </div>
              <div className="dept-view-stat">
                <DollarSign size={16} />
                <span>Remaining: LKR {Number(viewDept.remaining_budget || 0).toLocaleString("en-LK")}</span>
              </div>
              <div className="dept-view-stat">
                <Users size={16} />
                <span>{(viewDept.employees || []).length} Employees</span>
              </div>
              <div className="dept-view-stat">
                <Package size={16} />
                <span>{(viewDept.assets || []).length} Assets</span>
              </div>
            </div>

            {viewDept.description && (
              <p className="dept-view-desc">{viewDept.description}</p>
            )}

            {(viewDept.employees || []).length > 0 && (
              <div className="dept-view-section">
                <div className="dept-section-hdr">
                  <h3><Users size={15} /> Employees ({viewDept.employees.length})</h3>
                  <button className="dept-print-btn" onClick={() => printEmployees(viewDept)}>🖨 Print</button>
                </div>
                <div className="dept-inner-table-wrap">
                  <table className="dept-inner-table">
                    <thead><tr><th>#</th><th>Name</th><th>Position</th><th>Status</th><th>Email</th></tr></thead>
                    <tbody>{viewDept.employees.map(e => (
                      <tr key={e.employee_id}>
                        <td>#{e.employee_id}</td>
                        <td><strong>{e.first_name} {e.last_name}</strong></td>
                        <td>{e.position}</td>
                        <td><span className={`dept-status-badge ${e.status?.toLowerCase() === "active" ? "badge-active" : "badge-inactive"}`}>{e.status}</span></td>
                        <td>{e.email}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            )}

            {(viewDept.assets || []).length > 0 && (
              <div className="dept-view-section">
                <div className="dept-section-hdr">
                  <h3><Package size={15} /> Assets ({viewDept.assets.length})</h3>
                  <button className="dept-print-btn" onClick={() => printAssets(viewDept)}>🖨 Print</button>
                </div>
                <div className="dept-inner-table-wrap">
                  <table className="dept-inner-table">
                    <thead><tr><th>#</th><th>Asset</th><th>Cost</th><th>Status</th><th>Purchased</th></tr></thead>
                    <tbody>{viewDept.assets.map(a => (
                      <tr key={a.asset_id}>
                        <td>#{a.asset_id}</td>
                        <td><strong>{a.asset_name}</strong></td>
                        <td>LKR {Number(a.cost).toLocaleString("en-US")}</td>
                        <td><span className={`dept-status-badge asset-${a.status?.toLowerCase()}`}>{a.status}</span></td>
                        <td>{a.purchase_date ? new Date(a.purchase_date).toLocaleDateString() : "N/A"}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            )}

            {(viewDept.employees || []).length === 0 && (viewDept.assets || []).length === 0 && (
              <div className="dept-view-empty">No employees or assets assigned yet.</div>
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
