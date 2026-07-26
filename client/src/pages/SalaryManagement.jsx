import { useEffect, useState, useCallback } from "react";
import { useLocation, Link } from "react-router-dom";
import {
  RefreshCw, Plus, FileDown, History,
  CheckCircle, Clock, AlertCircle,
  Download, X, ChevronLeft, ChevronRight, Search, Mail
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../utils/axios";
import AdminDashboard from "./AdminDashboard";
import ManagerDashboard from "./ManagerDashboard";
import "../styles/Salary.css";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const METHODS = ["Cash", "Bank Transfer", "Cheque"];

const EMPTY_FORM = {
  employee_id: "", salary_category: "",
  basic_salary: "", bonus_amount: "0", deduction_amount: "0",
  payment_month: "", payment_year: "",
  payment_date: "", payment_method: "Bank Transfer", remarks: ""
};

function SalaryPage() {
  const [payments, setPayments]       = useState([]);
  const [employees, setEmployees]     = useState([]);
  const [stats, setStats]             = useState({ pending: 0, paid: 0, upcoming: 0 });
  const [form, setForm]               = useState(EMPTY_FORM);
  const [showModal, setShowModal]     = useState(false);
  const [loading, setLoading]         = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear]   = useState(new Date().getFullYear());
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCat, setFilterCat]     = useState("");
  const [search, setSearch]           = useState("");
  const [page, setPage]               = useState(1);
  const [sendingEmail, setSendingEmail] = useState(null);
  const [payingId, setPayingId]       = useState(null);
  const PER_PAGE = 10;

  const loadAll = useCallback(async () => {
    setPageLoading(true);
    try {
      const params = {};
      if (filterMonth)  params.payment_month   = filterMonth;
      if (filterYear)   params.payment_year    = filterYear;
      if (filterStatus) params.payment_status  = filterStatus;
      if (filterCat)    params.salary_category = filterCat;
      if (search)       params.search          = search;

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
  }, [filterMonth, filterYear, filterStatus, filterCat, search]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // When employee selected, auto-fill salary and category
  const handleEmpChange = (e) => {
    const emp = employees.find(em => String(em.employee_id) === String(e.target.value));
    setForm(f => ({
      ...f,
      employee_id: e.target.value,
      salary_category: emp?.salary_category || "monthly",
      basic_salary: emp?.salary || "",
      payment_method: emp?.salary_category === "daily" ? "Cash" : "Bank Transfer"
    }));
  };

  const finalSalary = () => {
    const bs = parseFloat(form.basic_salary) || 0;
    const bn = parseFloat(form.bonus_amount) || 0;
    const dd = parseFloat(form.deduction_amount) || 0;
    return (bs + bn - dd).toFixed(2);
  };

  const formatPeriodDate = (payment) => {
    const rawDate = payment?.payment_date;
    if (rawDate) {
      const parsed = new Date(rawDate);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString("en-GB");
      }
    }

    if (payment?.salary_category === "monthly") {
      const month = Number(payment?.payment_month || 1);
      const year = payment?.payment_year || new Date().getFullYear();
      return `${MONTHS[(month - 1)] || ""} ${year}`.trim();
    }

    return "—";
  };

  const handleCreate = async (evt) => {
    evt.preventDefault();
    if (parseFloat(finalSalary()) < 0) {
      toast.error("Final salary cannot be negative.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/salary", { ...form });
      toast.success("Salary paid successfully!");
      setShowModal(false);
      setForm(EMPTY_FORM);
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create salary record");
    } finally { setLoading(false); }
  };

  const handleDownload = (payment) => {
    const win = window.open("", "_blank", "width=1000,height=800");
    if (!win) {
      toast.error("Popup blocked. Please allow popups to view the payslip.");
      return;
    }

    const employeeName = payment?.employee
      ? `${payment.employee.first_name || ""} ${payment.employee.last_name || ""}`.trim()
      : `EMP-${payment?.employee_id || ""}`;
    const departmentName = payment?.employee?.department?.department_name || "—";
    const paymentDate = payment?.payment_date
      ? new Date(payment.payment_date).toLocaleDateString("en-GB")
      : "—";
    const periodLabel = payment?.salary_category === "monthly"
      ? `${MONTHS[(Number(payment?.payment_month || 1) - 1)] || ""} ${payment?.payment_year || ""}`.trim()
      : "Daily Payment";

    const html = `<!DOCTYPE html>
      <html>
        <head>
          <title>Payslip</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; background: #f7f7f7; color: #222; padding: 24px; }
            .page { background: #fff; max-width: 780px; margin: 0 auto; border: 1px solid #e0e0e0; box-shadow: 0 10px 30px rgba(0,0,0,.08); }
            .header { background: linear-gradient(135deg, #8b3a3a, #a84545); color: #fff; padding: 24px 32px; }
            .title { font-size: 24px; font-weight: 700; margin: 0; }
            .sub { font-size: 12px; margin: 6px 0 0; opacity: 0.9; }
            .body { padding: 24px 32px 32px; }
            .row { display: flex; justify-content: space-between; gap: 18px; margin-bottom: 10px; font-size: 13px; }
            .label { color: #777; font-weight: 600; min-width: 130px; }
            .value { color: #222; }
            .card { border: 1px solid #eee; border-radius: 10px; padding: 14px 16px; margin-top: 16px; }
            .total { font-weight: 700; color: #1565c0; }
            .footer { margin-top: 28px; text-align: center; color: #999; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header">
              <h1 class="title">Mathumithan Hardware</h1>
              <p class="sub">Salary Payment Confirmation</p>
            </div>
            <div class="body">
              <div class="row"><span class="label">Employee</span><span class="value">${employeeName}</span></div>
              <div class="row"><span class="label">Department</span><span class="value">${departmentName}</span></div>
              <div class="row"><span class="label">Period</span><span class="value">${periodLabel}</span></div>
              <div class="row"><span class="label">Payment Date</span><span class="value">${paymentDate}</span></div>
              <div class="row"><span class="label">Payment Method</span><span class="value">${payment?.payment_method || "—"}</span></div>
              <div class="card">
                <div class="row"><span class="label">Basic Salary</span><span class="value">LKR ${Number(payment?.basic_salary || 0).toLocaleString("en-LK", { minimumFractionDigits: 2 })}</span></div>
                <div class="row"><span class="label">Bonus</span><span class="value">+LKR ${Number(payment?.bonus_amount || 0).toLocaleString("en-LK", { minimumFractionDigits: 2 })}</span></div>
                <div class="row"><span class="label">Deduction</span><span class="value">-LKR ${Number(payment?.deduction_amount || 0).toLocaleString("en-LK", { minimumFractionDigits: 2 })}</span></div>
                <div class="row"><span class="label">Net Salary</span><span class="value total">LKR ${Number(payment?.final_salary || 0).toLocaleString("en-LK", { minimumFractionDigits: 2 })}</span></div>
              </div>
              <div class="footer">Generated in the browser • No backend PDF file is created</div>
            </div>
          </div>
        </body>
      </html>`;

    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  const handleMarkPaid = async (payment) => {
    if (!payment?.salary_payment_id) return;
    setPayingId(payment.salary_payment_id);
    try {
      await api.put(`/salary/${payment.salary_payment_id}/pay`, {
        payment_method: payment.payment_method || "Bank Transfer",
        remarks: payment.remarks || ""
      });
      toast.success("Salary marked as paid");
      await loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to mark salary as paid");
    } finally {
      setPayingId(null);
    }
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

  const exportTablePDF = () => {
    const win = window.open("", "_blank", "width=1100,height=700");
    const rows = payments.map((p, i) => {
      const isMonthly = p.salary_category === "monthly";
      return `
        <tr style="background:${i % 2 === 0 ? "#fff" : "#fdf8f8"}">
          <td>#${p.salary_payment_id}</td>
          <td><strong>${p.employee ? `${p.employee.first_name} ${p.employee.last_name}` : `EMP-${p.employee_id}`}</strong></td>
          <td>${p.salary_category === "monthly" ? "Monthly Worker" : "Daily Worker"}</td>
          <td>${formatPeriodDate(p)}</td>
          <td>LKR ${Number(p.basic_salary).toLocaleString("en-US")}</td>
          <td style="color:#2e7d32">+LKR ${Number(p.bonus_amount||0).toLocaleString("en-US")}</td>
          <td style="color:#c62828">-LKR ${Number(p.deduction_amount||0).toLocaleString("en-US")}</td>
          <td><strong style="color:#1565c0">LKR ${Number(p.final_salary).toLocaleString("en-US")}</strong></td>
          <td>${p.payment_method || "—"}</td>
          <td><span style="padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;
            background:${p.payment_status==="Paid"?"#e8f5e9":"#fff3e0"};
            color:${p.payment_status==="Paid"?"#2e7d32":"#e65100"}">${p.payment_status}</span></td>
        </tr>`;
    }).join("");

    win.document.write(`<!DOCTYPE html><html><head><title>Salary Records</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#fff;color:#222;padding:32px}
      .hdr{display:flex;justify-content:space-between;border-bottom:3px solid #8b3a3a;padding-bottom:14px;margin-bottom:22px}
      .hdr h1{font-size:20px;color:#8b3a3a;font-weight:700}.meta{font-size:11px;color:#888;text-align:right}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th{background:linear-gradient(135deg,#8b3a3a,#a84545);color:#fff;padding:9px 10px;text-align:left;font-weight:600}
      td{padding:8px 10px;border-bottom:1px solid #f0f0f0}
      .footer{margin-top:24px;text-align:center;font-size:10px;color:#aaa;border-top:1px solid #eee;padding-top:10px}
      </style></head><body>
      <div class="hdr"><div><h1>Salary Records — Mathumithan Hardware</h1>
      <p style="font-size:11px;color:#888;margin-top:3px">Total: ${payments.length} record(s)</p></div>
      <div class="meta">Generated: ${new Date().toLocaleString()}</div></div>
      <table><thead><tr><th>#</th><th>Employee</th><th>Category</th><th>Period / Date</th><th>Basic</th><th>Bonus</th><th>Deduction</th><th>Final Salary</th><th>Method</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <div class="footer">Mathumithan Hardware POS System &bull; Salary Report &bull; Confidential</div>
      </body></html>`);
    win.document.close(); win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const totalPages = Math.ceil(payments.length / PER_PAGE);
  const paginated  = payments.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const selectedEmp = employees.find(e => String(e.employee_id) === String(form.employee_id));
  const isMonthly   = form.salary_category === "monthly";
  const isDaily     = form.salary_category === "daily";

  return (
    <div className="salary-container">

      {/* Header */}
      <div className="salary-header">
        <div className="salary-header-left">
          <h1>Salary Management</h1>
          <p>Manage and track employee salary payments</p>
        </div>
        <div className="salary-header-actions">
          <button className="sal-btn-outline" onClick={exportTablePDF}><FileDown size={15} /> Export PDF</button>
          <Link to="/salary/history" className="sal-btn-outline"><History size={15} /> History</Link>
          <button className="sal-btn-primary" onClick={() => { setForm(EMPTY_FORM); setShowModal(true); }}>
            <Plus size={15} /> New Record
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="salary-stats">
        {[
          { label: "Pending Salaries",   value: stats.pending,  icon: <Clock size={18} />,        color: "#e65100", bg: "#fff3e0" },
          { label: "Paid This Month",    value: stats.paid,     icon: <CheckCircle size={18} />,   color: "#2e7d32", bg: "#e8f5e9" },
          { label: "Active Employees",   value: stats.upcoming, icon: <AlertCircle size={18} />,   color: "#1565c0", bg: "#e8f4fd" },
        ].map((s, i) => (
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
        <select className="sal-select" value={filterCat} onChange={e => { setFilterCat(e.target.value); setPage(1); }}>
          <option value="">All Categories</option>
          <option value="monthly">Monthly Worker</option>
          <option value="daily">Daily Worker</option>
        </select>
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
              <th>Category</th>
              <th>Payment Date</th>
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
              <tr><td colSpan="11" className="sal-empty">Loading...</td></tr>
            ) : paginated.length === 0 ? (
              <tr><td colSpan="11" className="sal-empty">No salary records found</td></tr>
            ) : paginated.map(p => (
              <tr key={p.salary_payment_id}>
                <td><span className="sal-id-badge">#{p.salary_payment_id}</span></td>
                <td className="sal-name-cell">
                  <div className="sal-emp-name">
                    {p.employee ? `${p.employee.first_name} ${p.employee.last_name}` : `EMP-${p.employee_id}`}
                  </div>
                  {p.employee?.email && <div className="sal-emp-email">{p.employee.email}</div>}
                </td>
                <td>
                  <span className={`sal-cat-pill ${p.salary_category}`}>
                    {p.salary_category === "monthly" ? "Monthly" : "Daily"}
                  </span>
                </td>
                <td>{formatPeriodDate(p)}</td>
                <td>{Number(p.basic_salary).toLocaleString("en-LK")}</td>
                <td className="sal-bonus">+{Number(p.bonus_amount || 0).toLocaleString("en-LK")}</td>
                <td className="sal-deduct">-{Number(p.deduction_amount || 0).toLocaleString("en-LK")}</td>
                <td className="sal-final"><strong>LKR {Number(p.final_salary).toLocaleString("en-LK")}</strong></td>
                <td>{p.payment_method || "—"}</td>
                <td>
                  <span className={`sal-status-pill ${p.payment_status?.toLowerCase() === "paid" ? "paid" : "pending"}`}>
                    {p.payment_status}
                  </span>
                </td>
                <td>
                  <div className="sal-action-btns">
                    {String(p.payment_status).toLowerCase() === "paid" ? (<>
                      <button className="sal-icon-btn btn-download" title="View Payslip"
                        onClick={() => handleDownload(p)}>
                        <Download size={14} />
                      </button>
                      <button className="sal-icon-btn btn-email"
                        title={`Resend payslip to ${p.employee?.email || "employee"}`}
                        onClick={() => handleResendEmail(p)}
                        disabled={sendingEmail === p.salary_payment_id}>
                        {sendingEmail === p.salary_payment_id
                          ? <RefreshCw size={14} className="spin" />
                          : <Mail size={14} />}
                      </button>
                    </>) : (
                      <button className="sal-icon-btn btn-pay" title="Mark as paid"
                        onClick={() => handleMarkPaid(p)}
                        disabled={payingId === p.salary_payment_id}>
                        {payingId === p.salary_payment_id
                          ? <RefreshCw size={14} className="spin" />
                          : <CheckCircle size={14} />}
                      </button>
                    )}
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
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={15} /></button>
          <span className="sal-page-info">Page {page} of {totalPages}</span>
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i + 1} className={page === i + 1 ? "active" : ""} onClick={() => setPage(i + 1)}>{i + 1}</button>
          ))}
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={15} /></button>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="sal-overlay" onClick={() => setShowModal(false)}>
          <div className="sal-modal sal-modal-lg" onClick={e => e.stopPropagation()}>
            <div className="sal-modal-header">
              <h2>New Salary Payment</h2>
              <button className="sal-modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} className="sal-modal-form">
              <div className="sal-form-grid">

                {/* Employee */}
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

                {/* Salary Category — read from employee's salary_category */}
                {form.employee_id && (
                  <div className="sal-field full">
                    <label>Salary Category</label>
                    <div className="sal-category-display">
                      {isMonthly ? "Monthly Worker" : "Daily Worker"}
                    </div>
                  </div>
                )}

                {/* Monthly-only: Month + Year */}
                {isMonthly && (<>
                  <div className="sal-field">
                    <label>Month *</label>
                    <select value={form.payment_month}
                      onChange={e => setForm({ ...form, payment_month: e.target.value })} required>
                      <option value="">Select Month</option>
                      {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                  </div>
                  <div className="sal-field">
                    <label>Year *</label>
                    <select value={form.payment_year}
                      onChange={e => setForm({ ...form, payment_year: e.target.value })} required>
                      <option value="">Select Year</option>
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </>)}

                {/* Payment Date */}
                {form.employee_id && (
                  <div className="sal-field">
                    <label>Payment Date *</label>
                    <input type="date" value={form.payment_date}
                      onChange={e => setForm({ ...form, payment_date: e.target.value })} required />
                  </div>
                )}

                {/* Basic Salary label differs by category */}
                {form.employee_id && (
                  <div className="sal-field">
                    <label>{isDaily ? "Daily Salary (LKR) *" : "Basic Salary (LKR) *"}</label>
                    <input type="number" min="0" step="0.01" value={form.basic_salary}
                      onChange={e => setForm({ ...form, basic_salary: e.target.value })} required />
                  </div>
                )}

                {form.employee_id && (<>
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
                    <label>Payment Method *</label>
                    <select value={form.payment_method}
                      onChange={e => setForm({ ...form, payment_method: e.target.value })} required>
                      {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="sal-field">
                    <label>Final Salary (Auto)</label>
                    <div className="sal-final-preview">LKR {Number(finalSalary()).toLocaleString("en-US")}</div>
                  </div>
                  {parseFloat(finalSalary()) < 0 && (
                    <div className="sal-field full">
                      <div className="sal-negative-warning">
                        ⚠️ Final salary is negative. Reduce deductions or increase salary.
                      </div>
                    </div>
                  )}
                  <div className="sal-field full">
                    <label>Remarks</label>
                    <textarea rows={2} value={form.remarks}
                      onChange={e => setForm({ ...form, remarks: e.target.value })}
                      placeholder="Optional notes..." />
                  </div>
                </>)}
              </div>

              <div className="sal-modal-footer">
                <button type="button" className="sal-btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="sal-btn-submit" disabled={loading || !form.employee_id}>
                  {loading ? "Saving..." : "Pay Salary"}
                </button>
              </div>
            </form>
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
