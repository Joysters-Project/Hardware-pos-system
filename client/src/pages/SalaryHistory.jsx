import { useEffect, useState, useCallback } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../utils/axios";
import AdminDashboard from "./AdminDashboard";
import ManagerDashboard from "./ManagerDashboard";
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
  const [page,        setPage]        = useState(1);
  const PER_PAGE = 12;

  const loadHistory = useCallback(async () => {
    try {
      const params = {};
      if (filterEmp)   params.employee_id    = filterEmp;
      if (filterMonth) params.payment_month  = filterMonth;
      if (filterYear)  params.payment_year   = filterYear;
      if (search)      params.search         = search;

      const [hRes, eRes] = await Promise.all([
        api.get("/salary", { params }),
        api.get("/employees")
      ]);
      setPayments(hRes.data);
      setEmployees(eRes.data);
    } catch { toast.error("Failed to load history"); }
  }, [filterEmp, filterMonth, filterYear, search]);

  const loadSummary = useCallback(async () => {
    if (!filterEmp) { setSummary(null); return; }
    try {
      const res = await api.get(`/salary/employee/${filterEmp}/summary`);
      setSummary(res.data);
    } catch { setSummary(null); }
  }, [filterEmp]);

  useEffect(() => { loadHistory(); loadSummary(); }, [loadHistory, loadSummary]);

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
  const selectedEmp = employees.find(e => String(e.employee_id) === String(filterEmp));

  const totalPaid = payments.filter(p => p.payment_status === "Paid")
    .reduce((s, p) => s + parseFloat(p.final_salary || 0), 0);

  return (
    <div className="salary-container">
      <div className="page-header">
        <h1>📋 Salary History</h1>
      </div>

      {/* Employee Summary Card */}
      {summary && selectedEmp && (
        <div className="emp-salary-card">
          <div className="emp-salary-info">
            <div className="emp-avatar-sm">{selectedEmp.first_name?.[0]}{selectedEmp.last_name?.[0]}</div>
            <div>
              <h3>{selectedEmp.first_name} {selectedEmp.last_name}</h3>
              <p>{selectedEmp.position}</p>
            </div>
          </div>
          <div className="salary-summary-grid">
            <div className="sum-item">
              <span className="sum-label">Current Salary</span>
              <span className="sum-val">LKR {Number(summary.current_salary || 0).toLocaleString("en-LK")}</span>
            </div>
            <div className="sum-item">
              <span className="sum-label">Last Payment</span>
              <span className="sum-val">{summary.last_payment_month || "—"}</span>
            </div>
            <div className="sum-item">
              <span className="sum-label">Next Due</span>
              <span className="sum-val">{summary.next_due_date || "—"}</span>
            </div>
            <div className="sum-item">
              <span className="sum-label">Paid This Year</span>
              <span className="sum-val sum-highlight">LKR {Number(summary.total_paid_this_year || 0).toLocaleString("en-LK")}</span>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters-row">
        <input className="search" placeholder="Search employee name..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }} />
        <select value={filterEmp} onChange={e => { setFilterEmp(e.target.value); setPage(1); }}>
          <option value="">All Employees</option>
          {employees.map(e => (
            <option key={e.employee_id} value={e.employee_id}>{e.first_name} {e.last_name}</option>
          ))}
        </select>
        <select value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setPage(1); }}>
          <option value="">All Months</option>
          {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
        </select>
        <select value={filterYear} onChange={e => { setFilterYear(e.target.value); setPage(1); }}>
          <option value="">All Years</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Total summary bar */}
      {payments.length > 0 && (
        <div className="history-total-bar">
          <span>{payments.length} record(s) found</span>
          <span>Total Paid: <strong>LKR {totalPaid.toLocaleString("en-LK", { minimumFractionDigits: 2 })}</strong></span>
        </div>
      )}

      {/* History Table */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>#</th><th>Employee</th><th>Period</th>
              <th>Basic (LKR)</th><th>Bonus</th><th>Deduction</th>
              <th>Final (LKR)</th><th>Date Paid</th><th>Method</th><th>Status</th><th>Payslip</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan="11" className="empty-row">No salary history found</td></tr>
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
                <td>{p.payment_date ? new Date(p.payment_date).toLocaleDateString("en-LK") : "—"}</td>
                <td>{p.payment_method || "—"}</td>
                <td>
                  <span className={`status-badge status-${(p.payment_status || "pending").toLowerCase()}`}>
                    {p.payment_status}
                  </span>
                </td>
                <td>
                  {p.payment_status === "Paid" && (
                    <button className="download-btn" onClick={() => handleDownload(p.salary_payment_id)}>⬇ PDF</button>
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
    </div>
  );
}

export default function SalaryHistory() {
  const location  = useLocation();
  const role      = (localStorage.getItem("role") || "admin").toLowerCase();
  const isManager = location.pathname.startsWith("/manager/") || role === "manager";
  const Layout    = isManager ? ManagerDashboard : AdminDashboard;
  return <Layout active="salary"><SalaryHistoryPage /></Layout>;
}
