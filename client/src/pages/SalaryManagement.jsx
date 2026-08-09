import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useLocation, Link } from "react-router-dom";
import {
  RefreshCw, Plus, FileDown, History,
  CheckCircle, Clock, AlertCircle,
  Download, X, ChevronLeft, ChevronRight, Search, Mail,
  Edit2, Trash2
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../utils/axios";
import { buildTableHtml, escapeHtml, printWithTemplate } from "../utils/printTemplate";
import AdminDashboard from "./AdminDashboard";
import ManagerDashboard from "./ManagerDashboard";
import "../styles/Salary.css";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const METHODS = ["Cash", "Bank Transfer", "Cheque", "Online"];

const TODAY = new Date();
const CURRENT_YEAR = TODAY.getFullYear();
const CURRENT_MONTH_START = new Date(CURRENT_YEAR, TODAY.getMonth(), 1);
const CURRENT_MONTH_END = new Date(CURRENT_YEAR, TODAY.getMonth() + 1, 0);
const CURRENT_MONTH_MIN = CURRENT_MONTH_START.toISOString().slice(0, 10);
const CURRENT_MONTH_MAX = CURRENT_MONTH_END.toISOString().slice(0, 10);

const getDefaultForm = () => ({
  employee_id: "", salary_category: "monthly",
  basic_salary: "", bonus_amount: "0", deduction_amount: "0",
  payment_month: "", payment_year: String(CURRENT_YEAR),
  payment_date: TODAY.toISOString().slice(0, 10), payment_method: "Bank Transfer", remarks: ""
});

function SalaryPage() {
  const [payments, setPayments]       = useState([]);
  const [employees, setEmployees]     = useState([]);
  const [stats, setStats]             = useState({ pending: 0, paid: 0, upcoming: 0 });
  const [form, setForm]               = useState(getDefaultForm());
  const [showModal, setShowModal]     = useState(false);
  const [loading, setLoading]         = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [editingId, setEditingId]     = useState(null);
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear]   = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCat, setFilterCat]     = useState("");
  const [search, setSearch]           = useState("");
  const [page, setPage]               = useState(1);
  const [sendingEmail, setSendingEmail] = useState(null);
  const [payingId, setPayingId]       = useState(null);
  const [employeeSearchDisplay, setEmployeeSearchDisplay] = useState("");
  const [showEmployeeSuggestions, setShowEmployeeSuggestions] = useState(false);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [highlightedEmployeeIndex, setHighlightedEmployeeIndex] = useState(-1);
  const PER_PAGE = 10;

  const loadAll = useCallback(async () => {
    setPageLoading(true);
    try {
      const params = {};
      if (filterMonth)  params.payment_month   = filterMonth;
      if (filterYear)   params.payment_year    = filterYear;
      if (filterStatus) params.status         = filterStatus;
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

  const handleEmployeeInputChange = (event) => {
    const value = event.target.value || "";
    setEmployeeSearchDisplay(value);

    const needle = value.trim().toLowerCase();
    if (!needle) {
      setFilteredEmployees([]);
      setShowEmployeeSuggestions(false);
      setHighlightedEmployeeIndex(-1);
      setForm((prev) => ({ ...prev, employee_id: "" }));
      return;
    }

    const matches = employees.filter((emp) => {
      const name = `${emp.first_name || ""} ${emp.last_name || ""}`.trim().toLowerCase();
      const position = (emp.position || "").toLowerCase();
      return name.includes(needle) || position.includes(needle);
    }).slice(0, 10);

    setFilteredEmployees(matches);
    setShowEmployeeSuggestions(matches.length > 0);
    setHighlightedEmployeeIndex(-1);
    setForm((prev) => ({ ...prev, employee_id: "" }));
  };

  const selectEmployee = (emp) => {
    setForm((prev) => ({
      ...prev,
      employee_id: String(emp.employee_id),
      salary_category: emp.salary_category || "monthly",
      basic_salary: emp.salary || "",
      payment_method: emp.salary_category === "daily" ? "Cash" : "Bank Transfer"
    }));
    setEmployeeSearchDisplay(`${emp.first_name || ""} ${emp.last_name || ""}`.trim());
    setShowEmployeeSuggestions(false);
    setFilteredEmployees([]);
    setHighlightedEmployeeIndex(-1);
  };

  const handleEmployeeKeyDown = (event) => {
    if (!showEmployeeSuggestions || filteredEmployees.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedEmployeeIndex((index) => Math.min(index + 1, filteredEmployees.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedEmployeeIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      if (highlightedEmployeeIndex >= 0) {
        event.preventDefault();
        const selected = filteredEmployees[highlightedEmployeeIndex];
        if (selected) selectEmployee(selected);
      }
    } else if (event.key === "Escape") {
      setShowEmployeeSuggestions(false);
    }
  };

  const finalSalary = () => {
    const bs = parseFloat(form.basic_salary) || 0;
    const bn = parseFloat(form.bonus_amount) || 0;
    const dd = parseFloat(form.deduction_amount) || 0;
    return (bs + bn - dd).toFixed(2);
  };

  const getSalaryCategory = (payment) => {
    return payment?.salary_category || payment?.employee?.salary_category || "monthly";
  };

  const getSalaryCategoryLabel = (payment) => {
    const category = getSalaryCategory(payment);
    if (category === "monthly") return "Monthly Worker";
    if (category === "daily") return "Daily Worker";
    return "—";
  };

  const formatPayPeriod = (payment) => {
    const category = getSalaryCategory(payment);
    if (category === "monthly") {
      const month = Number(payment?.payment_month || 1);
      const year = payment?.payment_year || new Date().getFullYear();
      return `${MONTHS[(month - 1)] || ""} ${year}`.trim();
    }

    if (category === "daily") {
      const dateLabel = formatPaymentDate(payment);
      return dateLabel !== "—" ? dateLabel : "Daily";
    }

    return "—";
  };

  const formatPaymentDate = (payment) => {
    const rawDate = payment?.payment_date;
    if (!rawDate) return "—";
    const parsed = new Date(rawDate);
    return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString("en-GB");
  };

  const handleCreate = async (evt) => {
    evt.preventDefault();
    const bonus = parseFloat(form.bonus_amount) || 0;
    const deduction = parseFloat(form.deduction_amount) || 0;

    if (bonus < 0 || deduction < 0) {
      toast.error("Bonus and deduction must be zero or greater.");
      return;
    }
    if (parseFloat(finalSalary()) < 0) {
      toast.error("Final salary cannot be negative.");
      return;
    }
    setLoading(true);
    try {
      if (editingId) {
        await api.put(`/salary/${editingId}`, { ...form });
        toast.success("Salary record updated successfully!");
      } else {
        await api.post("/salary", { ...form });
        toast.success("Salary recorded as pending!");
      }
      setShowModal(false);
      setEditingId(null);
      setForm(getDefaultForm());
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save salary record");
    } finally { setLoading(false); }
  };

  const handleDownload = (payment) => {
    const employeeName = payment?.employee
      ? `${payment.employee.first_name || ""} ${payment.employee.last_name || ""}`.trim()
      : `EMP-${payment?.employee_id || ""}`;
    const departmentName = payment?.employee?.department?.department_name || "—";
    const paymentDate = formatPaymentDate(payment);
    const periodLabel = formatPayPeriod(payment);

    const contentHtml = `
      <table class="tpl-table">
        <tr><td>Employee</td><td>${escapeHtml(employeeName)}</td></tr>
        <tr><td>Department</td><td>${escapeHtml(departmentName)}</td></tr>
        <tr><td>Period</td><td>${escapeHtml(periodLabel)}</td></tr>
        <tr><td>Payment Date</td><td>${escapeHtml(paymentDate)}</td></tr>
        <tr><td>Payment Method</td><td>${escapeHtml(payment?.payment_method || "—")}</td></tr>
        <tr><td>Basic Salary</td><td>${escapeHtml(`LKR ${Number(payment?.basic_salary || 0).toLocaleString("en-LK", { minimumFractionDigits: 2 })}`)}</td></tr>
        <tr><td>Bonus</td><td>${escapeHtml(`+LKR ${Number(payment?.bonus_amount || 0).toLocaleString("en-LK", { minimumFractionDigits: 2 })}`)}</td></tr>
        <tr><td>Deduction</td><td>${escapeHtml(`-LKR ${Number(payment?.deduction_amount || 0).toLocaleString("en-LK", { minimumFractionDigits: 2 })}`)}</td></tr>
        <tr><td><strong>Net Salary</strong></td><td><strong>${escapeHtml(`LKR ${Number(payment?.final_salary || 0).toLocaleString("en-LK", { minimumFractionDigits: 2 })}`)}</strong></td></tr>
      </table>
    `;

    const opened = printWithTemplate({
      title: "Payslip",
      subtitle: "Salary Payment Confirmation",
      contentHtml,
    });

    if (!opened) {
      toast.error("Popup blocked. Please allow popups to view the payslip.");
    }
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

  const handleEdit = (payment) => {
    setEditingId(payment.salary_payment_id);
    const employeeName = payment.employee ? `${payment.employee.first_name || ""} ${payment.employee.last_name || ""}`.trim() : "";
    setEmployeeSearchDisplay(employeeName);
    setForm({
      employee_id: payment.employee_id,
      salary_category: payment.salary_category,
      basic_salary: payment.basic_salary?.toString() || "",
      bonus_amount: payment.bonus_amount?.toString() || "0",
      deduction_amount: payment.deduction_amount?.toString() || "0",
      payment_month: payment.payment_month || "",
      payment_year: payment.payment_year?.toString() || String(CURRENT_YEAR),
      payment_date: payment.payment_date || TODAY.toISOString().slice(0, 10),
      payment_method: payment.payment_method || "Bank Transfer",
      remarks: payment.remarks || ""
    });
    setShowModal(true);
  };

  const handleDelete = async (payment) => {
    if (!window.confirm('Delete this salary record?')) return;
    try {
      await api.delete(`/salary/${payment.salary_payment_id}`);
      toast.success('Salary record deleted');
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete salary record');
    }
  };

  const resetSalaryModal = () => {
    setForm(getDefaultForm());
    setEmployeeSearchDisplay("");
    setShowEmployeeSuggestions(false);
    setFilteredEmployees([]);
    setHighlightedEmployeeIndex(-1);
    setEditingId(null);
  };

  const exportTablePDF = () => {
    const rows = payments.map((p) => ([
      escapeHtml(`#${p.salary_payment_id}`),
      `<strong>${escapeHtml(p.employee ? `${p.employee.first_name} ${p.employee.last_name}` : `EMP-${p.employee_id}`)}</strong>`,
      escapeHtml(formatPayPeriod(p)),
      escapeHtml(formatPaymentDate(p)),
      escapeHtml(`LKR ${Number(p.basic_salary || 0).toLocaleString("en-US")}`),
      `<span style="color:#2e7d32">${escapeHtml(`+LKR ${Number(p.bonus_amount || 0).toLocaleString("en-US")}`)}</span>`,
      `<span style="color:#c62828">${escapeHtml(`-LKR ${Number(p.deduction_amount || 0).toLocaleString("en-US")}`)}</span>`,
      `<strong style="color:#1565c0">${escapeHtml(`LKR ${Number(p.final_salary || 0).toLocaleString("en-US")}`)}</strong>`,
      escapeHtml(p.payment_method || "—"),
      `<span style="font-weight:700;color:${p.payment_status === "Paid" ? "#2e7d32" : "#e65100"}">${escapeHtml(p.payment_status || "—")}</span>`,
    ]));

    const contentHtml = buildTableHtml({
      columns: ["#", "Employee", "Pay Period", "Payment Date", "Basic", "Bonus", "Deduction", "Final Salary", "Method", "Status"],
      rows,
      emptyMessage: "No salary records found"
    });

    const opened = printWithTemplate({
      title: "Salary Records",
      subtitle: `Total: ${payments.length} record(s)`,
      contentHtml,
    });

    if (!opened) toast.error("Allow pop-ups to print the report");
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
          <button className="sal-btn-primary" onClick={() => { resetSalaryModal(); setShowModal(true); }}>
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
          <input id="search" name="search" className="sal-search" placeholder="Search employee..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select id="filterCat" name="filterCat" className="sal-select" value={filterCat} onChange={e => { setFilterCat(e.target.value); setPage(1); }}>
          <option value="">All Categories</option>
          <option value="monthly">Monthly Worker</option>
          <option value="daily">Daily Worker</option>
        </select>
        <select id="filterMonth" name="filterMonth" className="sal-select" value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setPage(1); }}>
          <option value="">All Months</option>
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select className="sal-select" value={filterYear} onChange={e => { setFilterYear(e.target.value); setPage(1); }}>
          <option value="">All Years</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select id="filterStatus" name="filterStatus" className="sal-select" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
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
              <th>Pay Period</th>
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
                <td>{formatPayPeriod(p)}</td>
                <td>{formatPaymentDate(p)}</td>
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
                    <button className="sal-icon-btn btn-edit" title="Edit Salary"
                      onClick={() => handleEdit(p)}>
                      <Edit2 size={14} />
                    </button>
                    <button className="sal-icon-btn btn-delete" title="Delete Salary"
                      onClick={() => handleDelete(p)}>
                      <Trash2 size={14} />
                    </button>
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
      {showModal && createPortal(
        <div className="sal-overlay" onClick={() => { resetSalaryModal(); setShowModal(false); }}>
          <div className="sal-modal sal-modal-lg" onClick={e => e.stopPropagation()}>
            <div className="sal-modal-header">
              <h2>New Salary Payment</h2>
              <button className="sal-modal-close" onClick={() => { resetSalaryModal(); setShowModal(false); }}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} className="sal-modal-form">
              <div className="sal-form-grid">

                {/* Employee */}
                <div className="sal-field full">
                  <label>Employee *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      value={employeeSearchDisplay}
                      onChange={handleEmployeeInputChange}
                      onKeyDown={handleEmployeeKeyDown}
                      onFocus={() => { if (filteredEmployees.length > 0) setShowEmployeeSuggestions(true); }}
                      onBlur={() => setTimeout(() => setShowEmployeeSuggestions(false), 150)}
                      placeholder="Type employee name and select"
                      style={{ width: '100%' }}
                      required
                    />
                    {showEmployeeSuggestions && filteredEmployees.length > 0 && (
                      <ul style={{ position: 'absolute', zIndex: 1100, left: 0, right: 0, background: '#fff', border: '1px solid #ddd', maxHeight: 220, overflowY: 'auto', margin: 0, padding: 0, listStyle: 'none', boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }}>
                        {filteredEmployees.map((emp, idx) => (
                          <li
                            key={emp.employee_id}
                            title={`${emp.first_name || ""} ${emp.last_name || ""}`.trim()}
                            onMouseDown={(e) => { e.preventDefault(); selectEmployee(emp); }}
                            onMouseEnter={() => setHighlightedEmployeeIndex(idx)}
                            style={{ padding: '8px 10px', cursor: 'pointer', background: idx === highlightedEmployeeIndex ? '#eef' : '#fff', whiteSpace: 'normal', overflow: 'visible', textOverflow: 'clip' }}
                          >
                            <div style={{ fontWeight: 600 }}>{`${emp.first_name || ""} ${emp.last_name || ""}`.trim()}</div>
                            <div style={{ fontSize: '0.74rem', color: '#666' }}>{emp.position || 'Employee'}</div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Salary Category — read from employee's salary_category */}
                <div className="sal-field full">
                  <label>Salary Category</label>
                  <div className="sal-category-display">
                    {isMonthly ? "Monthly Worker" : "Daily Worker"}
                  </div>
                </div>

                {/* Monthly-only: Month + Year */}
                {isMonthly && (<> 
                  <div className="sal-field">
                    <label>Month *</label>
                    <select id="payment_month" name="payment_month" value={form.payment_month}
                      onChange={e => setForm({ ...form, payment_month: e.target.value })} required>
                      <option value="">Select Month</option>
                      {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                  </div>
                  <div className="sal-field">
                    <label>Year *</label>
                    <select id="payment_year" name="payment_year" value={form.payment_year}
                      onChange={e => setForm({ ...form, payment_year: e.target.value })} required>
                      <option value="">Select Year</option>
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </>)}

                {/* Payment Date */}
                <div className="sal-field">
                  <label>Payment Date *</label>
                  <input type="date" value={form.payment_date}
                    min={CURRENT_MONTH_MIN}
                    max={CURRENT_MONTH_MAX}
                    onChange={e => setForm({ ...form, payment_date: e.target.value })} required />
                </div>

                {/* Basic Salary label differs by category */}
                <div className="sal-field">
                  <label>{isDaily ? "Daily Salary (LKR) *" : "Basic Salary (LKR) *"}</label>
                  <input type="number" min="0" step="0.01" value={form.basic_salary}
                    onChange={e => setForm({ ...form, basic_salary: e.target.value })} required />
                </div>

                <> 
                  <div className="sal-field">
                    <label>Bonus (LKR)</label>
                    <input id="bonus_amount" name="bonus_amount" type="number" min="0" step="0.01" value={form.bonus_amount}
                      onChange={e => setForm({ ...form, bonus_amount: e.target.value })} />
                  </div>
                  <div className="sal-field">
                    <label>Deductions (LKR)</label>
                    <input id="deduction_amount" name="deduction_amount" type="number" min="0" step="0.01" value={form.deduction_amount}
                      onChange={e => setForm({ ...form, deduction_amount: e.target.value })} />
                  </div>
                  <div className="sal-field">
                    <label>Payment Method *</label>
                    <select id="payment_method" name="payment_method" value={form.payment_method}
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
                    <textarea id="remarks" name="remarks" rows={2} value={form.remarks}
                      onChange={e => setForm({ ...form, remarks: e.target.value })}
                      placeholder="Optional notes..." />
                  </div>
                </>
              </div>

              <div className="sal-modal-footer">
                <button type="button" className="sal-btn-cancel" onClick={() => { resetSalaryModal(); setShowModal(false); }}>Cancel</button>
                <button type="submit" className="sal-btn-submit" disabled={loading || !form.employee_id}>
                  {loading ? "Saving..." : "Pay Salary"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
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
