import { useEffect, useState, useCallback } from "react";
import { useLocation, Link } from "react-router-dom";
import {
  RefreshCw, Plus, FileDown, History,
  CheckCircle, Clock, AlertCircle,
  Pencil, Download, CreditCard, X,
  ChevronLeft, ChevronRight, Search
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../utils/axios";
import AdminDashboard from "./AdminDashboard";
//import ManagerDashboard from "./ManagerDashboard";
import "../styles/Salary.css";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const METHODS = ["Cash", "Bank Transfer", "Cheque"];

const EMPTY_FORM = {
  employee_id: "", basic_salary: "", bonus_amount: "0",
  deduction_amount: "0", payment_month: "", payment_year: "",
  payment_method: "Bank Transfer", remarks: ""
};

function SalaryPage() {
  const [payments, setPayments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState({ pending: 0, paid: 0, upcoming: 0, showAlert: false });
  const [form, setForm] = useState(EMPTY_FORM);
  const [payModal, setPayModal] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sendingEmail, setSendingEmail] = useState(null);
  const PER_PAGE = 10;

  const loadAll = useCallback(async () => {
    setPageLoading(true);
    try {
      const params = {};
      if (filterMonth) params.payment_month = filterMonth;
      if (filterYear) params.payment_year = filterYear;
      if (filterStatus) params.payment_status = filterStatus;
      if (search) params.search = search;

      const [pRes, eRes, sRes] = await Promise.all([
        api.get("/salary", { params }),
        api.get("/employees", { params: { status: "Active" } }),
        api.get("/salary/stats/dashboard")
      ]);
      setPayments(pRes.data);
      setEmployees(eRes.data);
      setStats(sRes.data);
    } catch { toast.error("Failed to load salary data"); }
    finally { setPageLoading(false); }
  }, [filterMonth, filterYear, filterStatus, search]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleEmpChange = (e) => {
    const emp = employees.find(em => String(em.employee_id) === String(e.target.value));
    setForm(f => ({ ...f, employee_id: e.target.value, basic_salary: emp?.salary || "" }));
  };

  const finalSalary = () => {
    const bs = parseFloat(form.basic_salary) || 0;
    const bn = parseFloat(form.bonus_amount) || 0;
    const dd = parseFloat(form.deduction_amount) || 0;
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
      toast.success("Salary paid! Payslip sent to employee's email.");
      setPayModal(null);
      loadAll();
    } catch (err) { toast.error(err.response?.data?.message || "Payment failed"); }
    finally { setLoading(false); }
  };

  const handleDownload = async (id) => {
    try {
      const res = await api.get(`/salary/${id}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url; a.download = `payslip_${id}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Download failed"); }
  };

  const handleResendEmail = async (p) => {
    setSendingEmail(p.salary_payment_id);
    try {
      await api.post(`/salary/${p.salary_payment_id}/resend-email`);
      toast.success(`Payslip resent to ${p.employee?.email || "employee"}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to resend email");
    } finally { setSendingEmail(null); }
  };

  // ── Export full table as PDF ──
  const exportTablePDF = () => {
    const win = window.open("", "_blank", "width=1000,height=700");
    const rows = payments.map((p, i) => `
      <tr style="background:${i % 2 === 0 ? "#fff" : "#fdf8f8"}">
        <td>#${p.salary_payment_id}</td>
        <td><strong>${p.employee ? `${p.employee.first_name} ${p.employee.last_name}` : `EMP-${p.employee_id}`}</strong></td>
        <td>${MONTHS[(p.payment_month || 1) - 1]} ${p.payment_year}</td>
        <td>LKR ${Number(p.basic_salary).toLocaleString("en-US")}</td>
        <td style="color:#2e7d32">+LKR ${Number(p.bonus_amount || 0).toLocaleString("en-US")}</td>
        <td style="color:#c62828">-LKR ${Number(p.deduction_amount || 0).toLocaleString("en-US")}</td>
        <td><strong style="color:#1565c0">LKR ${Number(p.final_salary).toLocaleString("en-US")}</strong></td>
        <td>${p.payment_method || "—"}</td>
        <td>
          <span style="display:inline-block;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;
            background:${p.payment_status === "Paid" ? "#e8f5e9" : "#fff3e0"};
            color:${p.payment_status === "Paid" ? "#2e7d32" : "#e65100"}">
            ${p.payment_status}
          </span>
        </td>
      </tr>
    `).join("");

    win.document.write(`
      <!DOCTYPE html><html><head><title>Salary Records — ${MONTHS[new Date().getMonth()]} ${new Date().getFullYear()}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Segoe UI',sans-serif;background:#fff;color:#222;padding:32px}
        .hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #8b3a3a;padding-bottom:14px;margin-bottom:22px}
        .hdr h1{font-size:20px;color:#8b3a3a;font-weight:700}
        .hdr p{font-size:11px;color:#888;margin-top:3px}
        .meta{font-size:11px;color:#888;text-align:right}
        .summary{display:flex;gap:16px;margin-bottom:20px}
        .s-box{background:#fdf5f5;border:1px solid #f0dede;border-radius:8px;padding:10px 16px;font-size:12px;color:#555}
        .s-box strong{display:block;font-size:18px;color:#8b3a3a;font-weight:700}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th{background:linear-gradient(135deg,#8b3a3a,#a84545);color:#fff;padding:9px 10px;text-align:left;font-weight:600;white-space:nowrap}
        td{padding:8px 10px;border-bottom:1px solid #f0f0f0;vertical-align:middle}
        .footer{margin-top:24px;text-align:center;font-size:10px;color:#aaa;border-top:1px solid #eee;padding-top:10px}
      </style></head><body>
      <div class="hdr">
        <div><h1>Salary Records — Mathumithan Hardware</h1><p>All records as of ${new Date().toLocaleString()}</p></div>
        <div class="meta">Generated: ${new Date().toLocaleDateString()}<br>Total Records: ${payments.length}</div>
      </div>
      <div class="summary">
        <div class="s-box"><strong>${stats.paid}</strong>Paid This Month</div>
        <div class="s-box"><strong>${stats.pending}</strong>Pending</div>
        <div class="s-box"><strong>LKR ${payments.filter(p => p.payment_status === "Paid").reduce((s, p) => s + Number(p.final_salary || 0), 0).toLocaleString("en-US")}</strong>Total Paid</div>
      </div>
      <table>
        <thead><tr><th>#</th><th>Employee</th><th>Period</th><th>Basic</th><th>Bonus</th><th>Deduction</th><th>Final Salary</th><th>Method</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="footer">Mathumithan Hardware POS System &bull; Salary Report &bull; Confidential</div>
      </body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const totalPages = Math.ceil(payments.length / PER_PAGE);
  const paginated = payments.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const statCards = [
    { label: "Pending Salaries", value: stats.pending, icon: <Clock size={18} />, color: "#e65100", bg: "#fff3e0" },
    { label: "Paid This Month", value: stats.paid, icon: <CheckCircle size={18} />, color: "#2e7d32", bg: "#e8f5e9" },
    { label: "Upcoming Payments", value: stats.upcoming, icon: <AlertCircle size={18} />, color: "#1565c0", bg: "#e8f4fd" },
  ];

  return (
    <div className="salary-container">

      {/* Header */}
      <div className="salary-header">
        <div className="salary-header-left">
          <h1>Salary Management</h1>
          <p>Manage and track employee salary payments</p>
        </div>
        <div className="salary-header-actions">
          <button className="sal-btn-outline" onClick={exportTablePDF} title="Export table as PDF">
            <FileDown size={15} /> Export PDF
          </button>
          <Link to="/salary/history" className="sal-btn-outline">
            <History size={15} /> History
          </Link>
          <button className="sal-btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={15} /> New Record
          </button>
        </div>
      </div>

      {/* Alert */}
      {stats.showAlert && (
        <div className="salary-alert">
          <AlertCircle size={18} />
          <span>Salary payment due in <strong>5 days</strong> (30th). <strong>{stats.pending}</strong> pending payment(s).</span>
        </div>
      )}

      {/* Stats */}
      <div className="salary-stats">
        {statCards.map((s, i) => (
          <div className="salary-stat-card" key={i}>
            <div className="salary-stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <div>
              <div className="salary-stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="salary-stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="salary-filters">
        <div className="sal-search-wrap">
          <Search size={14} className="sal-search-icon" />
          <input className="sal-search" placeholder="Search employee..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="sal-select" value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setPage(1); }}>
          <option value="">All Months</option>
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select className="sal-select" value={filterYear} onChange={e => { setFilterYear(e.target.value); setPage(1); }}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className="sal-select" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="Pending">Pending</option>
          <option value="Paid">Paid</option>
        </select>
        <button className="sal-refresh-btn" onClick={loadAll} disabled={pageLoading}>
          <RefreshCw size={14} className={pageLoading ? "spin" : ""} />
        </button>
      </div>

      {/* Table */}
      <div className="sal-table-wrap">
        <table className="sal-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Employee</th>
              <th>Period</th>
              <th>Basic (LKR)</th>
              <th>Bonus</th>
              <th>Deduction</th>
              <th>Final (LKR)</th>
              <th>Method</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageLoading ? (
              <tr><td colSpan="10" className="sal-empty">Loading...</td></tr>
            ) : paginated.length === 0 ? (
              <tr><td colSpan="10" className="sal-empty">No salary records found</td></tr>
            ) : paginated.map(p => (
              <tr key={p.salary_payment_id}>
                <td><span className="sal-id-badge">#{p.salary_payment_id}</span></td>
                <td className="sal-name-cell">
                  <div className="sal-emp-name">
                    {p.employee ? `${p.employee.first_name} ${p.employee.last_name}` : `EMP-${p.employee_id}`}
                  </div>
                  {p.employee?.email && <div className="sal-emp-email">{p.employee.email}</div>}
                </td>
                <td>{MONTHS[(p.payment_month || 1) - 1]} {p.payment_year}</td>
                <td>{Number(p.basic_salary).toLocaleString("en-US")}</td>
                <td className="sal-bonus">+{Number(p.bonus_amount || 0).toLocaleString("en-US")}</td>
                <td className="sal-deduct">-{Number(p.deduction_amount || 0).toLocaleString("en-US")}</td>
                <td className="sal-final"><strong>LKR {Number(p.final_salary).toLocaleString("en-US")}</strong></td>
                <td>{p.payment_method || "—"}</td>
                <td>
                  <span className={`sal-status-pill ${p.payment_status?.toLowerCase() === "paid" ? "paid" : "pending"}`}>
                    {p.payment_status}
                  </span>
                </td>
                <td>
                  <div className="sal-action-btns">
                    {p.payment_status === "Pending" && (
                      <button className="sal-icon-btn btn-pay" title="Mark as Paid"
                        onClick={() => setPayModal({ ...p, payment_method: p.payment_method || "Bank Transfer" })}>
                        <CreditCard size={14} />
                      </button>
                    )}
                    {p.payment_status === "Paid" && (<>
                      <button className="sal-icon-btn btn-download" title="Download Payslip"
                        onClick={() => handleDownload(p.salary_payment_id)}>
                        <Download size={14} />
                      </button>
                      <button
                        className="sal-icon-btn btn-email"
                        title={`Resend payslip to ${p.employee?.email || "employee"}`}
                        onClick={() => handleResendEmail(p)}
                        disabled={sendingEmail === p.salary_payment_id}
                      >
                        {sendingEmail === p.salary_payment_id
                          ? <RefreshCw size={14} className="spin" />
                          : <Pencil size={14} />
                        }
                      </button>
                    </>)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="sal-pagination">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft size={15} />
          </button>
          <span className="sal-page-info">Page {page} of {totalPages}</span>
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i + 1} className={page === i + 1 ? "active" : ""} onClick={() => setPage(i + 1)}>{i + 1}</button>
          ))}
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight size={15} />
          </button>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="sal-overlay" onClick={() => setShowModal(false)}>
          <div className="sal-modal sal-modal-lg" onClick={e => e.stopPropagation()}>
            <div className="sal-modal-header">
              <h2>New Salary Record</h2>
              <button className="sal-modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} className="sal-modal-form">
              <div className="sal-form-grid">
                <div className="sal-field full">
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
                <div className="sal-field">
                  <label>Month *</label>
                  <select value={form.payment_month} onChange={e => setForm({ ...form, payment_month: e.target.value })} required>
                    <option value="">Select Month</option>
                    {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div className="sal-field">
                  <label>Year *</label>
                  <select value={form.payment_year} onChange={e => setForm({ ...form, payment_year: e.target.value })} required>
                    <option value="">Select Year</option>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div className="sal-field">
                  <label>Basic Salary (LKR) *</label>
                  <input type="number" min="0" step="0.01" value={form.basic_salary}
                    onChange={e => setForm({ ...form, basic_salary: e.target.value })} required />
                </div>
                <div className="sal-field">
                  <label>Bonus (LKR)</label>
                  <input type="number" min="0" step="0.01" value={form.bonus_amount}
                    onChange={e => setForm({ ...form, bonus_amount: e.target.value })} />
                </div>
                <div className="sal-field">
                  <label>Deductions (LKR)</label>
                  <input type="number" min="0" step="0.01" value={form.deduction_amount}
                    onChange={e => setForm({ ...form, deduction_amount: e.target.value })} />
                </div>
                <div className="sal-field">
                  <label>Payment Method</label>
                  <select value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })}>
                    {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="sal-field">
                  <label>Final Salary (auto)</label>
                  <div className="sal-final-preview">LKR {Number(finalSalary()).toLocaleString("en-US")}</div>
                </div>
                <div className="sal-field full">
                  <label>Remarks</label>
                  <textarea rows={2} value={form.remarks}
                    onChange={e => setForm({ ...form, remarks: e.target.value })} placeholder="Optional notes..." />
                </div>
              </div>
              <div className="sal-modal-footer">
                <button type="button" className="sal-btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="sal-btn-submit" disabled={loading}>
                  {loading ? "Saving..." : "Create Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Confirmation Modal */}
      {payModal && (
        <div className="sal-overlay" onClick={() => setPayModal(null)}>
          <div className="sal-modal" onClick={e => e.stopPropagation()}>
            <div className="sal-modal-header">
              <h2>Confirm Salary Payment</h2>
              <button className="sal-modal-close" onClick={() => setPayModal(null)}><X size={18} /></button>
            </div>
            <div className="sal-pay-body">
              <div className="sal-pay-row"><span>Employee</span>
                <strong>{payModal.employee ? `${payModal.employee.first_name} ${payModal.employee.last_name}` : `EMP-${payModal.employee_id}`}</strong>
              </div>
              <div className="sal-pay-row"><span>Email</span>
                <strong>{payModal.employee?.email || "—"}</strong>
              </div>
              <div className="sal-pay-row"><span>Period</span>
                <strong>{MONTHS[(payModal.payment_month || 1) - 1]} {payModal.payment_year}</strong>
              </div>
              <div className="sal-pay-row"><span>Final Salary</span>
                <strong className="sal-pay-amount">LKR {Number(payModal.final_salary).toLocaleString("en-US")}</strong>
              </div>
              <div className="sal-field" style={{ marginTop: "1rem" }}>
                <label>Payment Method</label>
                <select value={payModal.payment_method}
                  onChange={e => setPayModal({ ...payModal, payment_method: e.target.value })}>
                  {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="sal-field">
                <label>Remarks</label>
                <textarea rows={2} value={payModal.remarks || ""}
                  onChange={e => setPayModal({ ...payModal, remarks: e.target.value })} placeholder="Optional..." />
              </div>
              <div className="sal-email-note">
                <Pencil size={14} />
                Payslip PDF will be automatically emailed to <strong>{payModal.employee?.email || "the employee"}</strong> upon payment.
              </div>
            </div>
            <div className="sal-modal-footer">
              <button className="sal-btn-cancel" onClick={() => setPayModal(null)}>Cancel</button>
              <button className="sal-btn-pay" onClick={handlePay} disabled={loading}>
                {loading ? "Processing..." : "Pay Now"}
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
  const role = (localStorage.getItem("role") || "admin").toLowerCase();
  const isManager = location.pathname.startsWith("/manager/") || role === "manager";
  const Layout = isManager ? ManagerDashboard : AdminDashboard;
  return <Layout active="salary"><SalaryPage /></Layout>;
}
