import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../utils/axios";
import AdminDashboard from "./AdminDashboard";
import ManagerDashboard from "./ManagerDashboard";
import "../styles/Employees.css";

const BASE_URL = "http://localhost:5000";
const POSITIONS = ["Admin", "Manager", "Cashier", "Supervisor", "Sales", "Warehouse", "IT", "HR", "Accountant", "Other"];
const EMPTY_FORM = {
  first_name: "", last_name: "", nic: "", phone_no: "", email: "",
  address: "", position: "", salary: "", join_date: "",
  status: "Active", department_id: ""
};

function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [editId, setEditId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [viewEmp, setViewEmp] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const fileRef = useRef();
  const PER_PAGE = 8;

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [empRes, deptRes] = await Promise.all([api.get("/employees"), api.get("/departments")]);
      setEmployees(empRes.data);
      setDepartments(deptRes.data);
    } catch { toast.error("Failed to load data"); }
  };

  const openAdd = () => { setForm(EMPTY_FORM); setEditId(null); setPhotoFile(null); setPhotoPreview(null); setShowModal(true); };
  const openEdit = (e) => {
    setForm({
      first_name: e.first_name || "", last_name: e.last_name || "",
      nic: e.nic || "", phone_no: e.phone_no || "",
      email: e.email || "", address: e.address || "",
      position: e.position || "", salary: e.salary || "",
      join_date: e.join_date || e.hire_date || "",
      status: e.status || "Active", department_id: e.department_id || ""
    });
    setEditId(e.employee_id);
    setPhotoFile(null);
    setPhotoPreview(e.profile_photo ? `${BASE_URL}/${e.profile_photo}` : null);
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setForm(EMPTY_FORM); setEditId(null); setPhotoFile(null); setPhotoPreview(null); };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (evt) => {
    evt.preventDefault();
    if (!form.first_name || !form.last_name) {
      toast.error("First name and last name are required"); return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== "") fd.append(k, v); });
      if (photoFile) fd.append("profile_photo", photoFile);

      if (editId) {
        await api.put(`/employees/${editId}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
        toast.success("Employee updated");
      } else {
        await api.post("/employees", fd, { headers: { "Content-Type": "multipart/form-data" } });
        toast.success("Employee created");
      }
      closeModal();
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed");
    } finally { setLoading(false); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await api.delete(`/employees/${id}`);
      toast.success("Employee deleted");
      loadAll();
    } catch (err) { toast.error(err.response?.data?.message || "Delete failed"); }
  };

  const handleView = async (e) => {
    try {
      const res = await api.get(`/employees/${e.employee_id}`);
      setViewEmp(res.data);
    } catch { toast.error("Failed to load details"); }
  };

  const getDeptName = (id) => departments.find(d => d.department_id === id)?.department_name || "N/A";

  const filtered = employees.filter(e => {
    const term = search.toLowerCase();
    const matchSearch = !term || [e.first_name, e.last_name, e.email, e.phone, e.phone_no, e.nic]
      .some(v => (v || "").toLowerCase().includes(term));
    const matchStatus = !filterStatus || e.status === filterStatus;
    const matchDept = !filterDept || String(e.department_id) === String(filterDept);
    return matchSearch && matchStatus && matchDept;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="employees-container">
      <div className="page-header">
        <h1>👤 Employees</h1>
        <button className="btn-primary" onClick={openAdd}>+ Add Employee</button>
      </div>

      <div className="filters-row">
        <input className="search" placeholder="Search by name, email, phone, NIC..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }} />
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="Resigned">Resigned</option>
        </select>
        <select value={filterDept} onChange={e => { setFilterDept(e.target.value); setPage(1); }}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
        </select>
      </div>

      <div className="stats-row">
        <div className="stat-card"><span className="stat-num">{employees.length}</span><span className="stat-label">Total</span></div>
        <div className="stat-card"><span className="stat-num">{employees.filter(e => e.status === "Active").length}</span><span className="stat-label">Active</span></div>
        <div className="stat-card"><span className="stat-num">{employees.filter(e => e.status === "Resigned").length}</span><span className="stat-label">Resigned</span></div>
        <div className="stat-card"><span className="stat-num">{employees.filter(e => e.status === "Inactive").length}</span><span className="stat-label">Inactive</span></div>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Photo</th><th>ID</th><th>Name</th><th>Position</th>
              <th>Department</th><th>Phone</th><th>Email</th>
              <th>Salary</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan="10" className="empty-row">No employees found</td></tr>
            ) : paginated.map(e => (
              <tr key={e.employee_id}>
                <td>
                  {e.profile_photo
                    ? <img src={`${BASE_URL}/${e.profile_photo}`} alt="photo" className="emp-thumb" />
                    : <div className="emp-avatar">{e.first_name?.[0]}{e.last_name?.[0]}</div>}
                </td>
                <td>{e.employee_id}</td>
                <td className="name-cell">{e.first_name} {e.last_name}</td>
                <td>{e.position}</td>
                <td>{getDeptName(e.department_id)}</td>
                <td>{e.phone_no || "N/A"}</td>
                <td>{e.email}</td>
                <td>LKR {Number(e.salary || 0).toLocaleString("en-LK")}</td>
                <td><span className={`status-badge status-${e.status?.toLowerCase()}`}>{e.status}</span></td>
                <td className="action-cell">
                  <button className="view-btn" onClick={() => handleView(e)}>View</button>
                  <button className="edit-btn" onClick={() => openEdit(e)}>Edit</button>
                  <button className="delete-btn" onClick={() => handleDelete(e.employee_id, `${e.first_name} ${e.last_name}`)}>Delete</button>
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
              <h2>{editId ? "Edit Employee" : "Add Employee"}</h2>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              {/* Photo Upload */}
              <div className="photo-upload-area" onClick={() => fileRef.current.click()}>
                {photoPreview
                  ? <img src={photoPreview} alt="preview" className="photo-preview" />
                  : <div className="photo-placeholder">📷<br /><small>Click to upload photo</small></div>}
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoChange} />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>First Name *</label>
                  <input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Last Name *</label>
                  <input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>NIC</label>
                  <input value={form.nic} onChange={e => setForm({ ...form, nic: e.target.value })} placeholder="e.g. 123456789V" />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input value={form.phone_no} onChange={e => setForm({ ...form, phone_no: e.target.value })} placeholder="07XXXXXXXX" />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Position *</label>
                  <select value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} required>
                    <option value="">Select Position</option>
                    {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Salary (LKR) *</label>
                  <input type="number" min="0" value={form.salary} onChange={e => setForm({ ...form, salary: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Join Date</label>
                  <input type="date" value={form.join_date} onChange={e => setForm({ ...form, join_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Department *</label>
                  <select value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })} required>
                    <option value="">Select Department</option>
                    {departments.map(d => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Resigned">Resigned</option>
                  </select>
                </div>
                <div className="form-group form-full">
                  <label>Address</label>
                  <textarea rows={2} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Full address..." />
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
      {viewEmp && (
        <div className="modal-overlay" onClick={() => setViewEmp(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>👤 Employee Details</h2>
              <button className="modal-close" onClick={() => setViewEmp(null)}>✕</button>
            </div>
            <div className="emp-detail-top">
              {viewEmp.profile_photo
                ? <img src={`${BASE_URL}/${viewEmp.profile_photo}`} alt="photo" className="emp-detail-photo" />
                : <div className="emp-avatar-lg">{viewEmp.first_name?.[0]}{viewEmp.last_name?.[0]}</div>}
              <div>
                <h3>{viewEmp.first_name} {viewEmp.last_name}</h3>
                <p>{viewEmp.position} — {viewEmp.department?.department_name || getDeptName(viewEmp.department_id)}</p>
                <span className={`status-badge status-${viewEmp.status?.toLowerCase()}`}>{viewEmp.status}</span>
              </div>
            </div>
            <div className="detail-grid">
              <div className="detail-item"><span className="detail-label">NIC</span><span>{viewEmp.nic || "N/A"}</span></div>
              <div className="detail-item"><span className="detail-label">Phone</span><span>{viewEmp.phone_no || "N/A"}</span></div>
              <div className="detail-item"><span className="detail-label">Email</span><span>{viewEmp.email}</span></div>
              <div className="detail-item"><span className="detail-label">Salary</span><span>LKR {Number(viewEmp.salary || 0).toLocaleString("en-LK")}</span></div>
              <div className="detail-item"><span className="detail-label">Join Date</span>
                <span>{viewEmp.join_date ? new Date(viewEmp.join_date).toLocaleDateString() : "N/A"}</span></div>
              <div className="detail-item"><span className="detail-label">Address</span><span>{viewEmp.address || "N/A"}</span></div>
            </div>
          </div>
        </div>
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
