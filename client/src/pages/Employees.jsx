import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { Eye, Pencil, Trash2, Plus, Search, RefreshCw, FileDown, X, ChevronLeft, ChevronRight, Users, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import api from "../utils/axios";
import { validateSriLankanPhone, filterSriLankanPhoneInput } from "../utils/phoneValidation";
import { buildTableHtml, escapeHtml, printWithTemplate } from "../utils/printTemplate";
import AdminDashboard from "./AdminDashboard";
import ManagerDashboard from "./ManagerDashboard";
import "../styles/Employees.css";

const BASE_URL = import.meta.env.VITE_API_URL;
const POSITIONS = ["Admin", "Manager", "Cashier", "Supervisor", "Sales", "Warehouse", "IT", "HR", "Accountant", "Other"];
const MAX_PHOTO_SIZE = 1 * 1024 * 1024; // 1 MB
const EMPTY_FORM = { first_name: "", last_name: "", nic: "", phone_no: "", email: "", address: "", position: "", salary: "", salary_category: "monthly", join_date: "", status: "Active", department_id: "" };

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

  const openAdd = () => {
    const today = new Date().toISOString().split("T")[0];
    setForm({ ...EMPTY_FORM, join_date: today });
    setEditId(null);
    setPhotoFile(null);
    setPhotoPreview(null);
    setShowModal(true);
  };
  const openEdit = (e) => {
    setForm({
      first_name: e.first_name || "", last_name: e.last_name || "", nic: e.nic || "", phone_no: e.phone_no || "",
      email: e.email || "", address: e.address || "", position: e.position || "", salary: e.salary || "",
      salary_category: e.salary_category || "monthly",
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
    if (file.size > MAX_PHOTO_SIZE) {
      toast.error("Photo must be 1 MB or smaller");
      if (fileRef.current) fileRef.current.value = null;
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (evt) => {
    evt.preventDefault();
    if (!form.first_name || !form.last_name) { toast.error("First and last name required"); return; }
    const nameRegex = /^[A-Za-z ]+$/;
    if (!nameRegex.test(form.first_name.trim()) || !nameRegex.test(form.last_name.trim())) {
      toast.error("Names may only contain letters and spaces");
      return;
    }
    if (!form.nic) {
      toast.error("NIC is required");
      return;
    }
    // Validate Sri Lankan NIC formats: old (9 digits + V/X) or new (12 digits)
    const nicVal = form.nic?.trim();
    const nicOld = /^\d{9}[vVxX]$/;
    const nicNew = /^\d{12}$/;
    if (!(nicOld.test(nicVal) || nicNew.test(nicVal))) {
      toast.error("Please enter a valid NIC (9 digits + V/X or 12 digits)");
      return;
    }
    form.nic = nicVal;
    if (!form.position || !form.position.trim()) {
      toast.error("Position is required");
      return;
    }
    const positionRegex = /^[A-Za-z ]+$/;
    if (!positionRegex.test(form.position.trim())) {
      toast.error("Position may only contain letters and spaces");
      return;
    }
    if (!form.email) {
      toast.error("Email is required");
      return;
    }
    if (!form.join_date) {
      toast.error("Join date is required");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }

    const salaryNum = Number(form.salary);
    if (!form.salary || isNaN(salaryNum) || salaryNum <= 0) {
      toast.error("Salary must be greater than zero");
      return;
    }

    const normalizedFirst = form.first_name.trim().toLowerCase();
    const normalizedLast = form.last_name.trim().toLowerCase();
    const normalizedEmail = form.email.trim().toLowerCase();
    const normalizedNic = form.nic?.trim().toLowerCase() || '';
    const normalizedPhone = (form.phone_no || '').trim();

    const sameName = employees.find(emp => {
      if (editId && emp.employee_id === editId) return false;
      return emp.first_name?.trim().toLowerCase() === normalizedFirst
        && emp.last_name?.trim().toLowerCase() === normalizedLast;
    });
    if (sameName) {
      toast.error("Employee with same name already exists");
      return;
    }

    const duplicate = employees.find(emp => {
      if (editId && emp.employee_id === editId) return false;
      return emp.first_name?.trim().toLowerCase() === normalizedFirst
        && emp.last_name?.trim().toLowerCase() === normalizedLast
        && (emp.email?.trim().toLowerCase() || '') === normalizedEmail
        && (emp.nic?.trim().toLowerCase() || '') === normalizedNic
        && (emp.phone_no?.trim() || '') === normalizedPhone;
    });

    if (duplicate) {
      toast.error("Employee with same details already exists");
      return;
    }

    if (!form.phone_no) {
      toast.error("Phone is required");
      return;
    }
    const phoneValidation = validateSriLankanPhone(form.phone_no);
    if (!phoneValidation.isValid) {
      setPhoneError(phoneValidation.message);
      toast.error(phoneValidation.message);
      return;
    }
    form.phone_no = phoneValidation.formatted;

    setLoading(true);
    try {
      if (photoFile && photoFile.size > MAX_PHOTO_SIZE) { toast.error("Photo must be 1 MB or smaller"); setLoading(false); return; }
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
    try { const res = await api.get(`/employees/${e.employee_id}`); setViewEmp(res.data.data); }
    catch { toast.error("Failed to load details"); }
  };

  const getDeptName = (id) => departments.find(d => d.department_id === id)?.department_name || "N/A";

  const exportPDF = () => {
    const win = window.open("", "_blank", "width=1000,height=700");
    const rows = filtered.map((e, i) => `
      <tr style="background:${i % 2 === 0 ? "#fff" : "#fdf8f8"}">
        <td>#${e.employee_id}</td>
        <td><strong>${e.first_name} ${e.last_name}</strong></td>
        <td>${e.nic || "—"}</td>
        <td>${e.position || "—"}</td>
        <td>${getDeptName(e.department_id)}</td>
        <td>${e.salary_category === "daily" ? "Daily Worker" : "Monthly Worker"}</td>
        <td>${e.join_date ? new Date(e.join_date).toLocaleDateString() : "—"}</td>
        <td>${e.phone_no || "—"}</td>
        <td>${e.email || "—"}</td>
        <td>LKR ${Number(e.salary || 0).toLocaleString("en-US")}</td>
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
      <table><thead><tr><th>#</th><th>Name</th><th>NIC</th><th>Position</th><th>Department</th><th>Salary Category</th><th>Join Date</th><th>Phone</th><th>Email</th><th>Salary</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <div class="footer">Mathumithan Hardware POS System &bull; Employees Report &bull; Confidential</div>
      </body></html>`);
    win.document.close(); win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const exportViewPDF = (emp) => {
    const detailsHtml = `
      <table class="tpl-table">
        <tbody>
          <tr><td>Employee ID</td><td>#${escapeHtml(emp.employee_id)}</td></tr>
          <tr><td>Full Name</td><td>${escapeHtml(`${emp.first_name} ${emp.last_name}`.trim())}</td></tr>
          <tr><td>NIC</td><td>${escapeHtml(emp.nic || "—")}</td></tr>
          <tr><td>Phone</td><td>${escapeHtml(emp.phone_no || "—")}</td></tr>
          <tr><td>Email</td><td>${escapeHtml(emp.email || "—")}</td></tr>
          <tr><td>Address</td><td>${escapeHtml(emp.address || "—")}</td></tr>
          <tr><td>Position</td><td>${escapeHtml(emp.position || "—")}</td></tr>
          <tr><td>Department</td><td>${escapeHtml(emp.department?.department_name || getDeptName(emp.department_id))}</td></tr>
          <tr><td>Salary</td><td>${escapeHtml(`LKR ${Number(emp.salary || 0).toLocaleString("en-US")}`)}</td></tr>
          <tr><td>Join Date</td><td>${escapeHtml(emp.join_date ? new Date(emp.join_date).toLocaleDateString() : "—")}</td></tr>
          <tr><td>Status</td><td>${escapeHtml(emp.status || "Active")}</td></tr>
        </tbody>
      </table>
    `;

    const opened = printWithTemplate({
      title: `${emp.first_name} ${emp.last_name}`,
      subtitle: "Employee Profile",
      contentHtml: detailsHtml,
    });

    if (!opened) toast.error("Allow pop-ups to print the report");
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
          <input id="search" name="search" className="emp-search" placeholder="Search name, email, phone, NIC..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} /></div>
        <select id="filterStatus" name="filterStatus" className="emp-select" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="Active">Active</option><option value="Inactive">Inactive</option><option value="Resigned">Resigned</option>
        </select>
        <select id="filterDept" name="filterDept" className="emp-select" value={filterDept} onChange={e => { setFilterDept(e.target.value); setPage(1); }}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
        </select>
        <button className="emp-refresh-btn" onClick={loadAll} disabled={pageLoading}><RefreshCw size={14} className={pageLoading ? "spin" : ""} /></button>
      </div>

      {/* Table */}
      <div className="emp-table-wrap">
        <table className="emp-table">
          <thead><tr>
            <th>Photo</th><th>#</th><th>Name</th><th>NIC</th><th>Position</th><th>Department</th><th>Salary Category</th><th>Join Date</th>
            <th>Phone</th><th>Salary (LKR)</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>
            {pageLoading ? <tr><td colSpan="12" className="emp-empty">Loading...</td></tr>
              : paginated.length === 0 ? <tr><td colSpan="12" className="emp-empty">No employees found</td></tr>
                : paginated.map(e => (
                  <tr key={e.employee_id}>
                    <td>{e.profile_photo
                      ? <img src={`${BASE_URL}/${e.profile_photo}`} alt="" className="emp-thumb" />
                      : <div className="emp-avatar">{e.first_name?.[0]}{e.last_name?.[0]}</div>}
                    </td>
                    <td><span className="emp-id-badge">#{e.employee_id}</span></td>
                    <td className="emp-name-cell"><div className="emp-fullname">{e.first_name} {e.last_name}</div>
                      <div className="emp-email-sub">{e.email}</div></td>
                    <td>{e.nic || "—"}</td>
                    <td>{e.position}</td>
                    <td>{getDeptName(e.department_id)}</td>
                    <td>{e.salary_category === "daily" ? "Daily Worker" : "Monthly Worker"}</td>
                    <td>{e.join_date ? new Date(e.join_date).toLocaleDateString() : "—"}</td>
                    <td>{e.phone_no || "—"}</td>
                    <td className="emp-salary-cell">LKR {Number(e.salary || 0).toLocaleString("en-US")}</td>
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
      {showModal && createPortal(
        <div className="emp-overlay" onClick={closeModal}>
          <div className="emp-modal emp-modal-lg" onClick={e => e.stopPropagation()}>
            <div className="emp-modal-header">
              <h2>{editId ? "Edit Employee" : "Add Employee"}</h2>
              <button className="emp-modal-close" onClick={closeModal}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="emp-modal-form">
              <div className="emp-photo-upload" onClick={() => fileRef.current.click()}>
                {photoPreview ? <img src={photoPreview} alt="" className="emp-photo-preview" />
                  : <div className="emp-photo-placeholder">📷<br /><small>Click to upload</small></div>}
                <input id="file_field" name="file_field" ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoChange} />
              </div>
              <div className="emp-form-grid">
                {[["First Name *", "text", "first_name", true], ["Last Name *", "text", "last_name", true],
                ["NIC *", "text", "nic", true], ["Email *", "email", "email", true]].map(([label, type, key, req]) => (
                  <div className="emp-field" key={key}>
                    <label>{label}</label>
                    <input
                      type={type}
                      value={form[key]}
                      onChange={e => setForm({ ...form, [key]: e.target.value })}
                      required={!!req}
                      pattern={key === "nic" ? "(^\\d{9}[vVxX]$|^\\d{12}$)" : key === "first_name" || key === "last_name" ? "^[A-Za-z ]+$" : undefined}
                      title={key === "nic" ? "NIC must be 9 digits + V/X or 12 digits" : key === "first_name" || key === "last_name" ? "Name may only contain letters and spaces" : undefined}
                    />
                  </div>
                ))}
                {/* Phone Field with Validation */}
                <div className="emp-field">
                  <label>Phone (Sri Lanka) *</label>
                  <div style={{ position: "relative" }}>
                    <input id="phone_no" name="phone_no"
                      type="text"
                      placeholder="e.g., 0712345678 (10 digits, numbers only)"
                      value={form.phone_no}
                      maxLength="10"
                      required
                      onChange={e => {
                        const filtered = filterSriLankanPhoneInput(e.target.value);
                        setForm({ ...form, phone_no: filtered });
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
                  <input
                    type="text"
                    value={form.position}
                    onChange={e => setForm({ ...form, position: e.target.value })}
                    required
                    pattern="^[A-Za-z ]+$"
                    title="Position may only contain letters and spaces"
                    placeholder="e.g. Manager"
                  />
                </div>
                <div className="emp-field"><label>Salary (LKR) *</label>
                  <input type="number" min="1" value={form.salary} onChange={e => setForm({ ...form, salary: e.target.value })} required /></div>
                <div className="emp-field"><label>Salary Category *</label>
                  <select id="salary_category" name="salary_category" value={form.salary_category} onChange={e => setForm({ ...form, salary_category: e.target.value })} required>
                    <option value="monthly">Monthly Worker</option>
                    <option value="daily">Daily Worker</option>
                  </select></div>
                <div className="emp-field"><label>Join Date</label>
                  <input id="join_date" name="join_date" type="date" value={form.join_date} max={new Date().toISOString().split("T")[0]} onChange={e => setForm({ ...form, join_date: e.target.value })} /></div>
                <div className="emp-field"><label>Department *</label>
                  <select value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })} required>
                    <option value=""></option>{departments.filter(d => d.status === "Active").map(d => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
                  </select></div>
                <div className="emp-field"><label>Status</label>
                  <select id="status" name="status" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    <option value="Active">Active</option><option value="Inactive">Inactive</option><option value="Resigned">Resigned</option>
                  </select></div>
                <div className="emp-field emp-field-full"><label>Address</label>
                  <textarea id="address" name="address" rows={2} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Full address..." /></div>
              </div>
              <div className="emp-modal-footer">
                <button type="button" className="emp-btn-cancel" onClick={closeModal}>Cancel</button>
                <button type="submit" className="emp-btn-submit" disabled={loading}>{loading ? "Saving..." : editId ? "Update" : "Create"}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* View Modal */}
      {viewEmp && createPortal(
        <div className="emp-overlay" onClick={() => setViewEmp(null)}>
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
              ["Salary", `LKR ${Number(viewEmp.salary || 0).toLocaleString("en-US")}`],
              ["Join Date", viewEmp.join_date ? new Date(viewEmp.join_date).toLocaleDateString() : "—"],
              ["Address", viewEmp.address || "—"]].map(([l, v]) => (
                <div className="emp-view-row" key={l}><span className="emp-view-label">{l}</span><span className="emp-view-value">{v}</span></div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
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
