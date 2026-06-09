import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Eye, Pencil, Trash2, Plus, Search, RefreshCw, FileDown, X, ChevronLeft, ChevronRight, Users, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import api from "../utils/axios";
import { validateSriLankanPhone, formatSriLankanPhone } from "../utils/phoneValidation";
import AdminDashboard from "./AdminDashboard";
import ManagerDashboard from "./ManagerDashboard";
import "../styles/Employees.css";

const BASE_URL = "http://localhost:5000";
const POSITIONS = ["Admin", "Manager", "Cashier", "Supervisor", "Sales", "Warehouse", "IT", "HR", "Accountant", "Other"];
const EMPTY_FORM = { first_name: "", last_name: "", nic: "", phone_no: "", email: "", address: "", position: "", salary: "", join_date: "", status: "Active", department_id: "" };

function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [phoneError, setPhoneError] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [editId, setEditId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [viewEmp, setViewEmp] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [page, setPage] = useState(1);
  const fileRef = useRef();
  const PER_PAGE = 10;

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setPageLoading(true);
    try {
      const [empRes, deptRes] = await Promise.all([api.get("/employees"), api.get("/departments")]);
      setEmployees(empRes.data);
      setDepartments(deptRes.data);
    } catch { toast.error("Failed to load data"); }
    finally { setPageLoading(false); }
  };

  const openAdd = () => { setForm(EMPTY_FORM); setEditId(null); setPhotoFile(null); setPhotoPreview(null); setShowModal(true); };
  const openEdit = (e) => {
    setForm({
      first_name: e.first_name || "", last_name: e.last_name || "", nic: e.nic || "", phone_no: e.phone_no || "",
      email: e.email || "", address: e.address || "", position: e.position || "", salary: e.salary || "",
      join_date: e.join_date || e.hire_date || "", status: e.status || "Active", department_id: e.department_id || ""
    });
    setEditId(e.employee_id);
    setPhotoFile(null);
    setPhotoPreview(e.profile_photo ? `${BASE_URL}/${e.profile_photo}` : null);
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setForm(EMPTY_FORM); setEditId(null); setPhotoFile(null); setPhotoPreview(null); setPhoneError(""); };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (evt) => {
    evt.preventDefault();
    if (!form.first_name || !form.last_name) { toast.error("First and last name required"); return; }
    
    // Validate phone number if provided
    if (form.phone_no) {
      const phoneValidation = validateSriLankanPhone(form.phone_no);
      if (!phoneValidation.isValid) {
        setPhoneError(phoneValidation.message);
        toast.error(phoneValidation.message);
        return;
      }
      // Use formatted phone number
      form.phone_no = phoneValidation.formatted;
    }
    
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== "") fd.append(k, v); });
      if (photoFile) fd.append("profile_photo", photoFile);
      const headers = { "Content-Type": "multipart/form-data" };
      if (editId) { await api.put(`/employees/${editId}`, fd, { headers }); toast.success("Employee updated"); }
      else { await api.post("/employees", fd, { headers }); toast.success("Employee created"); }
      closeModal(); loadAll();
    } catch (err) { toast.error(err.response?.data?.message || "Operation failed"); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try { await api.delete(`/employees/${id}`); toast.success("Employee deleted"); loadAll(); }
    catch (err) { toast.error(err.response?.data?.message || "Delete failed"); }
  };

  const handleView = async (e) => {
    try { const res = await api.get(`/employees/${e.employee_id}`); setViewEmp(res.data); }
    catch { toast.error("Failed to load details"); }
  };

  const getDeptName = (id) => departments.find(d => d.department_id === id)?.department_name || "N/A";

  const exportPDF = () => {
    const win = window.open("", "_blank", "width=1000,height=700");
    const rows = filtered.map((e, i) => `
      <tr style="background:${i % 2 === 0 ? "#fff" : "#fdf8f8"}">
        <td>#${e.employee_id}</td>
        <td><strong>${e.first_name} ${e.last_name}</strong></td>
        <td>${e.position || "—"}</td>
        <td>${getDeptName(e.department_id)}</td>
        <td>${e.phone_no || "—"}</td>
        <td>${e.email || "—"}</td>
        <td>LKR ${Number(e.salary || 0).toLocaleString("en-LK")}</td>
        <td><span style="padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;
          background:${e.status === "Active" ? "#e8f5e9" : e.status === "Resigned" ? "#fce4e4" : "#fff3e0"};
          color:${e.status === "Active" ? "#2e7d32" : e.status === "Resigned" ? "#c62828" : "#e65100"}">${e.status}</span></td>
      </tr>`).join("");
    win.document.write(`<!DOCTYPE html><html><head><title>Employees Report</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;padding:32px;color:#222}
      .hdr{display:flex;justify-content:space-between;border-bottom:3px solid #8b3a3a;padding-bottom:14px;margin-bottom:20px}
      h1{font-size:20px;color:#8b3a3a;font-weight:700}.meta{font-size:11px;color:#888;text-align:right}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th{background:linear-gradient(135deg,#8b3a3a,#a84545);color:#fff;padding:9px 10px;text-align:left;font-weight:600}
      td{padding:8px 10px;border-bottom:1px solid #f0f0f0}
      .footer{margin-top:20px;text-align:center;font-size:10px;color:#aaa;border-top:1px solid #eee;padding-top:10px}
      </style></head><body>
      <div class="hdr"><div><h1>Employees Report — Mathumithan Hardware</h1>
      <p style="font-size:11px;color:#888;margin-top:3px">Total: ${filtered.length} employee(s)</p></div>
      <div class="meta">Generated: ${new Date().toLocaleString()}</div></div>
      <table><thead><tr><th>#</th><th>Name</th><th>Position</th><th>Department</th><th>Phone</th><th>Email</th><th>Salary</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <div class="footer">Mathumithan Hardware POS System &bull; Employees Report &bull; Confidential</div>
      </body></html>`);
    win.document.close(); win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const exportViewPDF = (emp) => {
    const win = window.open("", "_blank", "width=800,height=600");
    win.document.write(`<!DOCTYPE html><html><head><title>Employee — ${emp.first_name} ${emp.last_name}</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;padding:36px;color:#222}
      .hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #8b3a3a;padding-bottom:16px;margin-bottom:24px}
      h1{font-size:20px;color:#8b3a3a;font-weight:700}.meta{font-size:11px;color:#888;text-align:right}
      .sec{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#8b3a3a;margin:18px 0 8px;border-bottom:1px solid #f0e0e0;padding-bottom:4px}
      table{width:100%;border-collapse:collapse}
      tr:nth-child(even) td{background:#fdf8f8}td{padding:9px 14px;font-size:13px;border-bottom:1px solid #f0f0f0}
      td:first-child{color:#777;font-weight:600;width:40%}
      .footer{margin-top:28px;text-align:center;font-size:10px;color:#aaa;border-top:1px solid #eee;padding-top:10px}
      </style></head><body>
      <div class="hdr"><div><h1>${emp.first_name} ${emp.last_name}</h1><p style="font-size:12px;color:#888;margin-top:3px">Employee Profile</p></div>
      <div class="meta">Generated: ${new Date().toLocaleString()}</div></div>
      <div class="sec">Personal Information</div>
      <table>
        <tr><td>Employee ID</td><td>#${emp.employee_id}</td></tr>
        <tr><td>Full Name</td><td>${emp.first_name} ${emp.last_name}</td></tr>
        <tr><td>NIC</td><td>${emp.nic || "—"}</td></tr>
        <tr><td>Phone</td><td>${emp.phone_no || "—"}</td></tr>
        <tr><td>Email</td><td>${emp.email || "—"}</td></tr>
        <tr><td>Address</td><td>${emp.address || "—"}</td></tr>
      </table>
      <div class="sec">Employment Details</div>
      <table>
        <tr><td>Position</td><td>${emp.position || "—"}</td></tr>
        <tr><td>Department</td><td>${emp.department?.department_name || getDeptName(emp.department_id)}</td></tr>
        <tr><td>Salary</td><td>LKR ${Number(emp.salary || 0).toLocaleString("en-LK")}</td></tr>
        <tr><td>Join Date</td><td>${emp.join_date ? new Date(emp.join_date).toLocaleDateString() : "—"}</td></tr>
        <tr><td>Status</td><td>${emp.status || "Active"}</td></tr>
      </table>
      <div class="footer">Mathumithan Hardware POS System &bull; Employee Profile &bull; Confidential</div>
      </body></html>`);
    win.document.close(); win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const filtered = employees.filter(e => {
    const term = search.toLowerCase();
    const matchSearch = !term || [e.first_name, e.last_name, e.email, e.phone_no, e.nic].some(v => (v || "").toLowerCase().includes(term));
    return matchSearch && (!filterStatus || e.status === filterStatus) && (!filterDept || String(e.department_id) === String(filterDept));
  });
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="emp-container">
      <div className="emp-header">
        <div className="emp-header-left">
          <div className="emp-header-icon"><Users size={22} /></div>
          <div><h1>Employees</h1><p>{employees.length} total employees</p></div>
        </div>
        <div className="emp-header-actions">
          <button className="emp-btn-outline" onClick={exportPDF}><FileDown size={14} /> Export PDF</button>
          <button className="emp-btn-primary" onClick={openAdd}><Plus size={14} /> Add Employee</button>
        </div>
      </div>

      {/* Stats */}
      <div className="emp-stats">
        {[["Total", employees.length, "#8b3a3a"], ["Active", employees.filter(e => e.status === "Active").length, "#2e7d32"],
        ["Resigned", employees.filter(e => e.status === "Resigned").length, "#c62828"],
        ["Inactive", employees.filter(e => e.status === "Inactive").length, "#e65100"]].map(([l, v, c]) => (
          <div className="emp-stat-card" key={l}>
            <div className="emp-stat-value" style={{ color: c }}>{v}</div>
            <div className="emp-stat-label">{l}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="emp-filters">
        <div className="emp-search-wrap"><Search size={14} className="emp-search-icon" />
          <input className="emp-search" placeholder="Search name, email, phone, NIC..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} /></div>
        <select className="emp-select" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="Active">Active</option><option value="Inactive">Inactive</option><option value="Resigned">Resigned</option>
        </select>
        <select className="emp-select" value={filterDept} onChange={e => { setFilterDept(e.target.value); setPage(1); }}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
        </select>
        <button className="emp-refresh-btn" onClick={loadAll} disabled={pageLoading}><RefreshCw size={14} className={pageLoading ? "spin" : ""} /></button>
      </div>

      {/* Table */}
      <div className="emp-table-wrap">
        <table className="emp-table">
          <thead><tr>
            <th>Photo</th><th>#</th><th>Name</th><th>Position</th><th>Department</th>
            <th>Phone</th><th>Salary (LKR)</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>
            {pageLoading ? <tr><td colSpan="9" className="emp-empty">Loading...</td></tr>
              : paginated.length === 0 ? <tr><td colSpan="9" className="emp-empty">No employees found</td></tr>
                : paginated.map(e => (
                  <tr key={e.employee_id}>
                    <td>{e.profile_photo
                      ? <img src={`${BASE_URL}/${e.profile_photo}`} alt="" className="emp-thumb" />
                      : <div className="emp-avatar">{e.first_name?.[0]}{e.last_name?.[0]}</div>}
                    </td>
                    <td><span className="emp-id-badge">#{e.employee_id}</span></td>
                    <td className="emp-name-cell"><div className="emp-fullname">{e.first_name} {e.last_name}</div>
                      <div className="emp-email-sub">{e.email}</div></td>
                    <td>{e.position}</td>
                    <td>{getDeptName(e.department_id)}</td>
                    <td>{e.phone_no || "—"}</td>
                    <td className="emp-salary-cell">LKR {Number(e.salary || 0).toLocaleString("en-LK")}</td>
                    <td><span className={`emp-status-pill ${e.status?.toLowerCase()}`}>{e.status}</span></td>
                    <td><div className="emp-action-btns">
                      <button className="emp-icon-btn btn-view" title="View" onClick={() => handleView(e)}><Eye size={14} /></button>
                      <button className="emp-icon-btn btn-edit" title="Edit" onClick={() => openEdit(e)}><Pencil size={14} /></button>
                      <button className="emp-icon-btn btn-delete" title="Delete" onClick={() => handleDelete(e.employee_id, `${e.first_name} ${e.last_name}`)}><Trash2 size={14} /></button>
                    </div></td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && <div className="emp-pagination">
        <button disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={14} /></button>
        <span className="emp-page-info">Page {page} of {totalPages}</span>
        {Array.from({ length: totalPages }, (_, i) => <button key={i + 1} className={page === i + 1 ? "active" : ""} onClick={() => setPage(i + 1)}>{i + 1}</button>)}
        <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={14} /></button>
      </div>}

      {/* Add/Edit Modal */}
      {showModal && <div className="emp-overlay" onClick={closeModal}>
        <div className="emp-modal emp-modal-lg" onClick={e => e.stopPropagation()}>
          <div className="emp-modal-header">
            <h2>{editId ? "Edit Employee" : "Add Employee"}</h2>
            <button className="emp-modal-close" onClick={closeModal}><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmit} className="emp-modal-form">
            <div className="emp-photo-upload" onClick={() => fileRef.current.click()}>
              {photoPreview ? <img src={photoPreview} alt="" className="emp-photo-preview" />
                : <div className="emp-photo-placeholder">📷<br /><small>Click to upload</small></div>}
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoChange} />
            </div>
            <div className="emp-form-grid">
              {[["First Name *", "text", "first_name", true], ["Last Name *", "text", "last_name", true],
              ["NIC", "text", "nic"], ["Email *", "email", "email", true]].map(([label, type, key, req]) => (
                <div className="emp-field" key={key}>
                  <label>{label}</label>
                  <input type={type} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} required={!!req} />
                </div>
              ))}
              {/* Phone Field with Validation */}
              <div className="emp-field">
                <label>Phone (Sri Lanka)</label>
                <div style={{ position: "relative" }}>
                  <input 
                    type="text" 
                    placeholder="e.g., 0712345678 (10 digits, numbers only)"
                    value={form.phone_no} 
                    maxLength="10"
                    onChange={e => {
                      // Only allow numbers
                      const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                      setForm({ ...form, phone_no: val });
                      // Clear error on change
                      if (phoneError) setPhoneError("");
                    }} 
                    style={phoneError ? { borderColor: "#ef4444", borderWidth: "2px" } : {}}
                  />
                  {form.phone_no && (
                    <span style={{ fontSize: "11px", color: "#666", marginTop: "2px", display: "block" }}>
                      {form.phone_no.length}/10 digits
                    </span>
                  )}
                  {phoneError && (
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "4px", color: "#ef4444", fontSize: "12px" }}>
                      <AlertCircle size={14} />
                      {phoneError}
                    </div>
                  )}
                </div>
              </div>
              <div className="emp-field"><label>Position *</label>
                <select value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} required>
                  <option value="">Select</option>{POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select></div>
              <div className="emp-field"><label>Salary (LKR) *</label>
                <input type="number" min="0" value={form.salary} onChange={e => setForm({ ...form, salary: e.target.value })} required /></div>
              <div className="emp-field"><label>Join Date</label>
                <input type="date" value={form.join_date} onChange={e => setForm({ ...form, join_date: e.target.value })} /></div>
              <div className="emp-field"><label>Department *</label>
                <select value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })} required>
                  <option value="">Select</option>{departments.map(d => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
                </select></div>
              <div className="emp-field"><label>Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="Active">Active</option><option value="Inactive">Inactive</option><option value="Resigned">Resigned</option>
                </select></div>
              <div className="emp-field emp-field-full"><label>Address</label>
                <textarea rows={2} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Full address..." /></div>
            </div>
            <div className="emp-modal-footer">
              <button type="button" className="emp-btn-cancel" onClick={closeModal}>Cancel</button>
              <button type="submit" className="emp-btn-submit" disabled={loading}>{loading ? "Saving..." : editId ? "Update" : "Create"}</button>
            </div>
          </form>
        </div>
      </div>}

      {/* View Modal */}
      {viewEmp && <div className="emp-overlay" onClick={() => setViewEmp(null)}>
        <div className="emp-modal emp-modal-lg" onClick={e => e.stopPropagation()}>
          <div className="emp-modal-header">
            <h2>Employee Details</h2>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button className="emp-export-btn" onClick={() => exportViewPDF(viewEmp)}><FileDown size={14} /> Export PDF</button>
              <button className="emp-modal-close" onClick={() => setViewEmp(null)}><X size={18} /></button>
            </div>
          </div>
          <div className="emp-view-top">
            {viewEmp.profile_photo
              ? <img src={`${BASE_URL}/${viewEmp.profile_photo}`} alt="" className="emp-view-photo" />
              : <div className="emp-view-avatar">{viewEmp.first_name?.[0]}{viewEmp.last_name?.[0]}</div>}
            <div>
              <h3>{viewEmp.first_name} {viewEmp.last_name}</h3>
              <p>{viewEmp.position} — {viewEmp.department?.department_name || getDeptName(viewEmp.department_id)}</p>
              <span className={`emp-status-pill ${viewEmp.status?.toLowerCase()}`}>{viewEmp.status}</span>
            </div>
          </div>
          <div className="emp-view-grid">
            {[["NIC", viewEmp.nic || "—"], ["Phone", viewEmp.phone_no || "—"], ["Email", viewEmp.email || "—"],
            ["Salary", `LKR ${Number(viewEmp.salary || 0).toLocaleString("en-LK")}`],
            ["Join Date", viewEmp.join_date ? new Date(viewEmp.join_date).toLocaleDateString() : "—"],
            ["Address", viewEmp.address || "—"]].map(([l, v]) => (
              <div className="emp-view-row" key={l}><span className="emp-view-label">{l}</span><span className="emp-view-value">{v}</span></div>
            ))}
          </div>
        </div>
      </div>}
    </div>
  );
}

export default function Employees() {
  const location = useLocation();
  const role = (localStorage.getItem("role") || "admin").toLowerCase();
  const isManager = location.pathname.startsWith("/manager/") || role === "manager";
  const Layout = isManager ? ManagerDashboard : AdminDashboard;
  return <Layout active="employees"><EmployeesPage /></Layout>;
}
