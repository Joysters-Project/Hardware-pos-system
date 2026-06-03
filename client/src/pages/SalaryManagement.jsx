import { useEffect, useState, useCallback } from "react";
import { useLocation, Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../utils/axios";
import AdminDashboard from "./AdminDashboard";
import ManagerDashboard from "./ManagerDashboard";
import "../styles/Salary.css";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const METHODS = ["Cash","Bank Transfer","Cheque"];

const EMPTY_FORM = {
  employee_id: "", basic_salary: "", bonus_amount: "0",
  deduction_amount: "0", payment_month: "", payment_year: "",
  payment_method: "Bank Transfer", remarks: ""
};

function SalaryPage() {
  const [payments,    setPayments]    = useState([]);
  const [employees,   setEmployees]   = useState([]);
  const [stats,       setStats]       = useState({ pending: 0, paid: 0, upcoming: 0, showAlert: false });
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [payModal,    setPayModal]    = useState(null); // record to pay
  const [showModal,   setShowModal]   = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear,  setFilterYear]  = useState(new Date().getFullYear());
  const [filterStatus,setFilterStatus]= useState("");
  const [search,      setSearch]      = useState("");
  const [page,        setPage]        = useState(1);
  const PER_PAGE = 10;

  const loadAll = useCallback(async () => {
    try {
      const params = {};
      if (filterMonth)  params.payment_month  = filterMonth;
      if (filterYear)   params.payment_year   = filterYear;
      if (filterStatus) params.payment_status = filterStatus;
      if (search)       params.search         = search;

      const [pRes, eRes, sRes] = await Promise.all([
        api.get("/salary",                 { params }),
        api.get("/employees",              { params: { status: "Active" } }),
        api.get("/salary/stats/dashboard")
      ]);
      setPayments(pRes.data);
      setEmployees(eRes.data);
      setStats(sRes.data);
    } catch { toast.error("Failed to load salary data"); }
  }, [filterMonth, filterYear, filterStatus, search]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Auto-fill basic_salary when employee is selected
  const handleEmpChange = (e) => {
    const emp = employees.find(em => String(em.employee_id) === String(e.target.value));
    setForm(f => ({ ...f, employee_id: e.target.value, basic_salary: emp?.salary || "" }));
  };

  const finalSalary = () => {
    const bs = parseFloat(form.basic_salary)    || 0;
    const bn = parseFloat(form.bonus_amount)    || 0;
    const dd = parseFloat(form.deduction_amount)|| 0;
    return (bs + bn - dd).toFixed(2);
  };

  const handleCreate = async (evt) => {
    evt.preventDefault();
    setLoading(true);
    try {
      await api.post("/salary", { ...form });
      toast.success("Salary record created");
      setShowModal(false);
      setForm(EMPTY_FORM);
      loadAll();
    } catch (err) { toast.error(err.response?.data?.message || "Failed"); }
    finally { setLoading(false); }
  };

  const handlePay = async () => {
    if (!payModal) return;
    setLoading(true);
    try {
      await api.put(`/salary/${payModal.salary_payment_id}/pay`, {
        payment_method: payModal.payment_method || "Bank Transfer",
        remarks: payModal.remarks || ""
      });
      toast.success("Salary paid & payslip generated!");
      setPayModal(null);
      loadAll();
    } catch (err) { toast.error(err.response?.data?.message || "Payment failed"); }
    finally { setLoading(false); }
  };

  const handleDownload = async (id) => {
    try {
      const res = await api.get(`/salary/${id}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a   = document.createElement("a");
      a.href = url; a.download = `payslip_${id}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Download failed"); }
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const totalPages = Math.ceil(payments.length / PER_PAGE);
  const paginated  = payments.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="salary-container">
      <div className="page-header">
        <h1>💵 Salary Management</h1>
        <div className="header-actions">
          <Link to="/salary/history" className="btn-secondary">📋 Full History</Link>
          <button className="btn-primary" onClick={() => setShowModal(true)}>+ New Record</button>
        </div>
      </div>

      {/* Alert Banner */}
      {stats.showAlert && (
        <div className="salary-alert">
          <span>⚠️</span>
          <span>Salary payment due in <strong>5 days</strong> (30th). {stats.pending} pending payment(s).</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-row">
        <div className="stat-card stat-warn">
          <span className="stat-num">{stats.pending}</span>
          <span className="stat-label">Pending Salaries</span>
        </div>
        <div className="stat-card stat-ok">
          <span className="stat-num">{stats.paid}</span>
          <span className="stat-label">Paid This Month</span>
        </div>
        <div className="stat-card">
          <span className="stat-num">{stats.upcoming}</span>
          <span className="stat-label">Upcoming Payments</span>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-row">
        <input className="search" placeholder="Search employee..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }} />
        <select value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setPage(1); }}>
          <option value="">All Months</option>
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select value={filterYear} onChange={e => { setFilterYear(e.target.value); setPage(1); }}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="Pending">Pending</option>
          <option value="Paid">Paid</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>#</th><th>Employee</th><th>Period</th>
              <th>Basic (LKR)</th><th>Bonus</th><th>Deduction</th>
              <th>Final (LKR)</th><th>Method</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan="10" className="empty-row">No salary records found</td></tr>
            ) : paginated.map(p => (
              <tr key={p.salary_payment_id}>
                <td>{p.salary_payment_id}</td>
                <td className="name-cell">
                  {p.employee ? `${p.employee.first_name} ${p.employee.last_name}` : `EMP-${p.employee_id}`}
                </td>
                <td>{MONTHS[(p.payment_month || 1) - 1]} {p.payment_year}</td>
                <td>{Number(p.basic_salary).toLocaleString("en-LK")}</td>
                <td className="bonus-cell">+{Number(p.bonus_amount || 0).toLocaleString("en-LK")}</td>
                <td className="deduct-cell">-{Number(p.deduction_amount || 0).toLocaleString("en-LK")}</td>
                <td className="final-cell"><strong>{Number(p.final_salary).toLocaleString("en-LK")}</strong></td>
                <td>{p.payment_method || "—"}</td>
                <td>
                  <span className={`status-badge status-${(p.payment_status || "pending").toLowerCase()}`}>
                    {p.payment_status}
                  </span>
                </td>
                <td className="action-cell">
                  {p.payment_status === "Pending" && (
                    <button className="pay-btn" onClick={() => setPayModal({ ...p, payment_method: p.payment_method || "Bank Transfer" })}>
                      Pay
                    </button>
                  )}
                  {p.payment_status === "Paid" && (
                    <button className="download-btn" onClick={() => handleDownload(p.salary_payment_id)}>
                      ⬇ Payslip
                    </button>
                  )}
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
            <button key={i+1} className={page === i+1 ? "active" : ""} onClick={() => setPage(i+1)}>{i+1}</button>
          ))}
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>➕ New Salary Record</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate} className="modal-form">
              <div className="form-grid">
                <div className="form-group form-full">
                  <label>Employee *</label>
                  <select value={form.employee_id} onChange={handleEmpChange} required>
                    <option value="">Select Employee</option>
                    {employees.map(e => (
                      <option key={e.employee_id} value={e.employee_id}>
                        {e.first_name} {e.last_name} — {e.position}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Month *</label>
                  <select value={form.payment_month} onChange={e => setForm({...form, payment_month: e.target.value})} required>
                    <option value="">Select Month</option>
                    {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Year *</label>
                  <select value={form.payment_year} onChange={e => setForm({...form, payment_year: e.target.value})} required>
                    <option value="">Select Year</option>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Basic Salary (LKR) *</label>
                  <input type="number" min="0" step="0.01" value={form.basic_salary}
                    onChange={e => setForm({...form, basic_salary: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Bonus (LKR)</label>
                  <input type="number" min="0" step="0.01" value={form.bonus_amount}
                    onChange={e => setForm({...form, bonus_amount: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Deductions (LKR)</label>
                  <input type="number" min="0" step="0.01" value={form.deduction_amount}
                    onChange={e => setForm({...form, deduction_amount: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Payment Method</label>
                  <select value={form.payment_method} onChange={e => setForm({...form, payment_method: e.target.value})}>
                    {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="form-group final-preview">
                  <label>Final Salary (auto)</label>
                  <div className="final-amount">LKR {Number(finalSalary()).toLocaleString("en-LK")}</div>
                </div>
                <div className="form-group form-full">
                  <label>Remarks</label>
                  <textarea rows={2} value={form.remarks} onChange={e => setForm({...form, remarks: e.target.value})} placeholder="Optional notes..." />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={loading}>{loading ? "Saving..." : "Create Record"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Confirmation Modal */}
      {payModal && (
        <div className="modal-overlay" onClick={() => setPayModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>💳 Confirm Salary Payment</h2>
              <button className="modal-close" onClick={() => setPayModal(null)}>✕</button>
            </div>
            <div className="pay-confirm-body">
              <div className="pay-confirm-row">
                <span>Employee</span>
                <strong>{payModal.employee ? `${payModal.employee.first_name} ${payModal.employee.last_name}` : `EMP-${payModal.employee_id}`}</strong>
              </div>
              <div className="pay-confirm-row">
                <span>Period</span>
                <strong>{MONTHS[(payModal.payment_month || 1) - 1]} {payModal.payment_year}</strong>
              </div>
              <div className="pay-confirm-row">
                <span>Final Salary</span>
                <strong className="pay-amount">LKR {Number(payModal.final_salary).toLocaleString("en-LK")}</strong>
              </div>
              <div className="form-group" style={{ marginTop: "1rem" }}>
                <label>Payment Method</label>
                <select value={payModal.payment_method}
                  onChange={e => setPayModal({ ...payModal, payment_method: e.target.value })}>
                  {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Remarks</label>
                <textarea rows={2} value={payModal.remarks || ""}
                  onChange={e => setPayModal({ ...payModal, remarks: e.target.value })} placeholder="Optional..." />
              </div>
              <p className="pay-note">✉️ A confirmation email with payslip will be sent to the employee.</p>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setPayModal(null)}>Cancel</button>
              <button className="btn-pay" onClick={handlePay} disabled={loading}>
                {loading ? "Processing..." : "✅ Pay Now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SalaryManagement() {
  const location = useLocation();
  const role     = (localStorage.getItem("role") || "admin").toLowerCase();
  const isManager = location.pathname.startsWith("/manager/") || role === "manager";
  const Layout   = isManager ? ManagerDashboard : AdminDashboard;
  return <Layout active="salary"><SalaryPage /></Layout>;
}
