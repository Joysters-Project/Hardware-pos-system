import { useEffect, useState, useCallback } from "react";
import { useLocation, useSearchParams, Link } from "react-router-dom";
import {
  ChevronLeft, ChevronRight, Search, Download,
  RefreshCw, ArrowLeft
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../utils/axios";
import { escapeHtml, printWithTemplate } from "../utils/printTemplate";
import AdminDashboard from "./AdminDashboard";
import "../styles/Salary.css";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function SalaryHistoryPage() {
  const [searchParams] = useSearchParams();
  const [payments,    setPayments]    = useState([]);
  const [employees,   setEmployees]   = useState([]);
  const [summary,     setSummary]     = useState(null);
  const [filterEmp,   setFilterEmp]   = useState(searchParams.get("employee_id") || "");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear,  setFilterYear]  = useState("");
  const [search,      setSearch]      = useState("");
  const [loading,     setLoading]     = useState(false);
  const [page,        setPage]        = useState(1);
  const PER_PAGE = 12;

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterEmp)   params.employee_id   = filterEmp;
      if (filterMonth) params.payment_month = filterMonth;
      if (filterYear)  params.payment_year  = filterYear;
      if (search)      params.search        = search;
      const [hRes, eRes] = await Promise.all([
        api.get("/salary", { params }),
        api.get("/employees")
      ]);
      setPayments(hRes.data);
      setEmployees(eRes.data);
    } catch { toast.error("Failed to load history"); }
    finally { setLoading(false); }
  }, [filterEmp, filterMonth, filterYear, search]);

  const loadSummary = useCallback(async () => {
    if (!filterEmp) { setSummary(null); return; }
    try {
      const res = await api.get(`/salary/employee/${filterEmp}/summary`);
      setSummary(res.data);
    } catch { setSummary(null); }
  }, [filterEmp]);

  useEffect(() => { loadHistory(); loadSummary(); }, [loadHistory, loadSummary]);

  const getSalaryCategory = (payment) => {
    return payment?.salary_category || payment?.employee?.salary_category || "monthly";
  };

  const formatPayPeriod = (payment) => {
    const category = getSalaryCategory(payment);
    if (category === "daily") {
      return payment?.payment_date
        ? new Date(payment.payment_date).toLocaleDateString("en-GB")
        : "—";
    }
    return `${MONTHS[(Number(payment?.payment_month || 1) - 1)] || ""} ${payment?.payment_year || ""}`.trim();
  };

  const handleDownload = (payment) => {
    const employeeName = payment?.employee
      ? `${payment.employee.first_name || ""} ${payment.employee.last_name || ""}`.trim()
      : `EMP-${payment?.employee_id || ""}`;
    const periodLabel = formatPayPeriod(payment);
    const paymentDate = payment?.payment_date
      ? new Date(payment.payment_date).toLocaleDateString("en-GB")
      : "—";

    const contentHtml = `
      <table class="tpl-table">
        <tr><td>Employee</td><td>${escapeHtml(employeeName)}</td></tr>
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

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const totalPages  = Math.ceil(payments.length / PER_PAGE);
  const paginated   = payments.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const selectedEmp = employees.find(e => String(e.employee_id) === String(filterEmp));
  const totalPaid   = payments
    .filter(p => p.payment_status === "Paid")
    .reduce((s, p) => s + parseFloat(p.final_salary || 0), 0);

  return (
    <div className="salary-container">

      {/* Header */}
      <div className="salary-header">
        <div className="salary-header-left">
          <h1>Salary History</h1>
          <p>View and filter past salary payment records</p>
        </div>
        <div className="salary-header-actions">
          <Link to="/salary" className="sal-btn-outline">
            <ArrowLeft size={15} /> Back to Salary
          </Link>
          <button className="sal-btn-outline" onClick={loadHistory} disabled={loading}>
            <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Employee Summary Card */}
      {summary && selectedEmp && (
        <div className="salary-stat-card" style={{ padding: "1.1rem 1.4rem", gap: "1.25rem" }}>
          <div className="salary-stat-icon" style={{ background: "#f5eaea", color: "#8b3a3a", width: 48, height: 48, fontSize: "1rem", fontWeight: 700 }}>
            {selectedEmp.first_name?.[0]}{selectedEmp.last_name?.[0]}
          </div>
          <div style={{ flex: 1 }}>
            <div className="sal-emp-name">{selectedEmp.first_name} {selectedEmp.last_name}</div>
            <div className="sal-emp-email">{selectedEmp.position}</div>
          </div>
          <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
            {[
              { label: "Current Salary", val: `LKR ${Number(summary.current_salary || 0).toLocaleString("en-US")}` },
              { label: "Last Payment",   val: summary.last_payment_month || "—" },
              { label: "Next Due",       val: summary.next_due_date || "—" },
              { label: "Paid This Year", val: `LKR ${Number(summary.total_paid_this_year || 0).toLocaleString("en-US")}`, highlight: true },
            ].map(({ label, val, highlight }) => (
              <div key={label}>
                <div className="salary-stat-label">{label}</div>
                <div className="salary-stat-value" style={{ fontSize: "1rem", color: highlight ? "#8b3a3a" : "#1a1a1a" }}>{val}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="salary-filters">
        <div className="sal-search-wrap">
          <Search size={14} className="sal-search-icon" />
          <input id="search" name="search" className="sal-search" placeholder="Search employee name..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select id="filterEmp" name="filterEmp" className="sal-select" value={filterEmp} onChange={e => { setFilterEmp(e.target.value); setPage(1); }}>
          <option value="">All Employees</option>
          {employees.map(e => (
            <option key={e.employee_id} value={e.employee_id}>{e.first_name} {e.last_name}</option>
          ))}
        </select>
        <select id="filterMonth" name="filterMonth" className="sal-select" value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setPage(1); }}>
          <option value="">All Months</option>
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select id="filterYear" name="filterYear" className="sal-select" value={filterYear} onChange={e => { setFilterYear(e.target.value); setPage(1); }}>
          <option value="">All Years</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Summary bar */}
      {payments.length > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "#666", padding: "0.5rem 0.25rem" }}>
          <span>{payments.length} record(s) found</span>
          <span>Total Paid: <strong style={{ color: "#2e7d32" }}>LKR {totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong></span>
        </div>
      )}

      {/* Table */}
      <div className="sal-table-wrap">
        <table className="sal-table">
          <thead>
            <tr>
              <th>#</th><th>Employee</th><th>Period</th>
              <th>Basic (LKR)</th><th>Bonus</th><th>Deduction</th>
              <th>Final (LKR)</th><th>Date Paid</th><th>Method</th><th>Status</th><th>Payslip</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="11" className="sal-empty">Loading...</td></tr>
            ) : paginated.length === 0 ? (
              <tr><td colSpan="11" className="sal-empty">No salary history found</td></tr>
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
                <td>{Number(p.basic_salary).toLocaleString("en-US")}</td>
                <td className="sal-bonus">+{Number(p.bonus_amount || 0).toLocaleString("en-US")}</td>
                <td className="sal-deduct">-{Number(p.deduction_amount || 0).toLocaleString("en-US")}</td>
                <td className="sal-final"><strong>LKR {Number(p.final_salary).toLocaleString("en-US")}</strong></td>
                <td>{p.payment_date ? new Date(p.payment_date).toLocaleDateString("en-US") : "—"}</td>
                <td>{p.payment_method || "—"}</td>
                <td>
                  <span className={`sal-status-pill ${p.payment_status?.toLowerCase() === "paid" ? "paid" : "pending"}`}>
                    {p.payment_status}
                  </span>
                </td>
                <td>
                  {p.payment_status === "Paid" && (
                    <button className="sal-icon-btn btn-download" title="View Payslip"
                      onClick={() => handleDownload(p)}>
                      <Download size={14} />
                    </button>
                  )}
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
    </div>
  );
}

export default function SalaryHistory() {
  const location = useLocation();
  const role     = (localStorage.getItem("role") || "admin").toLowerCase();
  const Layout   = AdminDashboard;
  return <Layout active="salary"><SalaryHistoryPage /></Layout>;
}
