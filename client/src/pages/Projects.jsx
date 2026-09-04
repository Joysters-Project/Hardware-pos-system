import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FolderOpen, Plus, X, Eye, Edit2, Trash2,
  BarChart2, TrendingUp, Package, ShoppingCart,
  ChevronDown, ChevronUp, Calendar, Printer
} from 'lucide-react';
import api from '../utils/axios';
import { buildTableHtml, escapeHtml, printWithTemplate } from '../utils/printTemplate';
import AdminDashboard from './AdminDashboard';
import ManagerDashboard from './ManagerDashboard';
import ProjectsTab from '../components/ProjectsTab';
import '../styles/Projects.css';
import '../styles/ProcurementWorkspace.css';

const STATUSES = ['Active', 'Completed', 'On Hold', 'Cancelled'];
const MONTHS   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const EMPTY_FORM = {
  project_name: '', project_owner: '', location: '',
  description: '', start_date: '', deadline: '', end_date: '',
  status: 'Active', final_payment: '',
};

function ProjectsPage() {
  const [projects, setProjects]               = useState([]);
  const [form, setForm]                       = useState(EMPTY_FORM);
  const [editId, setEditId]                   = useState(null);
  const [showModal, setShowModal]             = useState(false);
  const [viewProject, setViewProject]         = useState(null);
  const [showViewItems, setShowViewItems]     = useState(false);
  const [expandedViewMonth, setExpandedViewMonth] = useState(null);
  const [activeTab, setActiveTab]             = useState('projects');
  const [loading, setLoading]                 = useState(false);
  const [monthlyData, setMonthlyData]         = useState(null);
  const [reportYear, setReportYear]           = useState(new Date().getFullYear());
  const [reportMonth, setReportMonth]         = useState(new Date().getMonth() + 1);
  const [expandedProject, setExpandedProject] = useState(null);
  const [yearlyData, setYearlyData]           = useState(null);
  const [yearlyYear, setYearlyYear]           = useState(new Date().getFullYear());
  const [projectEstimate, setProjectEstimate] = useState(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try { const res = await api.get('/projects'); setProjects(res.data); }
    catch { toast.error('Failed to load projects'); }
  };

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, final_payment: '' });
    setEditId(null);
    setProjectEstimate(null);
    setShowModal(true);
  };

  const openEdit = async (p) => {
    const baseForm = {
      project_name:  p.project_name,
      project_owner: p.project_owner || '',
      location:      p.location || '',
      description:   p.description || '',
      status:        p.status,
      start_date:    p.start_date || '',
      deadline:      p.deadline || '',
      end_date:      p.end_date || '',
      final_payment: p.final_cost || '',
    };
    setForm(baseForm);
    setEditId(p.project_id);
    setProjectEstimate(null);
    setShowModal(true);

    try {
      const res = await api.get(`/projects/${p.project_id}`);
      const items = res.data.items || [];
      const estimate = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0), 0);
      setProjectEstimate(estimate);
      setForm(prev => ({ ...prev, final_payment: res.data.final_cost ?? prev.final_payment }));
    } catch {
      setProjectEstimate(null);
    }
  };

  const closeModal = () => { setShowModal(false); setForm(EMPTY_FORM); setEditId(null); setProjectEstimate(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.project_name || !form.start_date) { toast.error('Name and start date required'); return; }

    if (editId && ['Completed', 'Cancelled'].includes(form.status)) {
      const paymentValue = Number(form.final_payment);
      if (form.final_payment === '' || Number.isNaN(paymentValue) || paymentValue < 0) {
        toast.error('Please enter the final payment amount before closing the project');
        return;
      }
    }

    setLoading(true);
    try {
      const payload = { ...form, final_payment: form.final_payment };
      if (editId) { await api.put(`/projects/${editId}`, payload); toast.success('Project updated'); }
      else        { await api.post('/projects', payload);          toast.success('Project created'); }
      closeModal(); loadProjects();
    } catch (err) { toast.error(err.response?.data?.message || 'Operation failed'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete project "${name}"? All item records will be removed.`)) return;
    try { await api.delete(`/projects/${id}`); toast.success('Project deleted'); loadProjects(); }
    catch (err) { toast.error(err.response?.data?.message || 'Delete failed'); }
  };

  const handleView = async (p) => {
    try {
      const res = await api.get(`/projects/${p.project_id}`);
      setViewProject(res.data);
      setShowViewItems(false);
      setExpandedViewMonth(null);
    }
    catch { toast.error('Failed to load project details'); }
  };

  const loadMonthly = async (year, month) => {
    setLoading(true);
    try { const res = await api.get('/projects/report/monthly', { params: { year, month } }); setMonthlyData(res.data); }
    catch { toast.error('Failed to load monthly report'); }
    finally { setLoading(false); }
  };

  const loadYearly = async (year) => {
    setLoading(true);
    try { const res = await api.get('/projects/report/yearly', { params: { year } }); setYearlyData(res.data); }
    catch { toast.error('Failed to load yearly report'); }
    finally { setLoading(false); }
  };

  const printMonthlyReport = () => {
    if (!monthlyData) return;

    const monthName = MONTHS[reportMonth - 1] || reportMonth;
    const title = `Project Monthly Summary - ${monthName} ${reportYear}`;
    const subtitle = `Total Items: ${monthlyData.totalItems} | Projects: ${monthlyData.byProject.length} | Project Income: ${fmtCurrency(monthlyData.totalProjectIncome || 0)}`;

    const rows = [];
    (monthlyData.byProject || []).forEach((pg) => {
      const projName = pg.project?.project_name || 'Project';
      (pg.items || []).forEach((item) => {
        rows.push([
          projName,
          item.product?.product_name || '—',
          Number(item.quantity || 0).toFixed(2),
          fmtCurrency(item.unit_price),
          fmtCurrency(Number(item.quantity || 0) * Number(item.unit_price || 0)),
          item.receiver_name || (item.takenByUser ? `${item.takenByUser.first_name || ''} ${item.takenByUser.last_name || ''}`.trim() : '—'),
          fmtDateTime(item.taken_at),
        ]);
      });
    });

    const columns = ['Project', 'Product', 'Qty', 'Unit Price', 'Total', 'Receiver / Taken By', 'Date & Time'];
    const tableHtml = buildTableHtml({
      columns,
      rows: rows.map((row) => row.map((cell) => escapeHtml(cell))),
      emptyMessage: 'No project items recorded for this month.',
    });

    const opened = printWithTemplate({
      title,
      subtitle,
      contentHtml: tableHtml,
    });

    if (!opened) {
      toast.error('Allow pop-ups to print the monthly summary');
    }
  };

  const printYearlyReport = () => {
    if (!yearlyData) return;

    const title = `Project Yearly Summary - ${yearlyYear}`;
    const subtitle = `Total Items: ${yearlyData.totalItems} | Project Income: ${fmtCurrency(yearlyData.totalProjectIncome || 0)}`;

    const activeMonths = (yearlyData.byMonth || []).filter((m) => Number(m.totalItems || 0) > 0 || Number(m.totalValue || 0) > 0);
    const rows = activeMonths.map((m) => [
      MONTHS[m.month - 1] || `Month ${m.month}`,
      m.totalItems,
      fmtCurrency(m.projectIncome || 0),
    ]);

    const columns = ['Month', 'Items Taken', 'Project Income'];
    const tableHtml = buildTableHtml({
      columns,
      rows: rows.map((row) => row.map((cell) => escapeHtml(cell))),
      emptyMessage: 'No project activity recorded for this year.',
    });

    const opened = printWithTemplate({
      title,
      subtitle,
      contentHtml: tableHtml,
    });

    if (!opened) {
      toast.error('Allow pop-ups to print the yearly summary');
    }
  };

  useEffect(() => {
    if (activeTab === 'monthly') loadMonthly(reportYear, reportMonth);
  }, [activeTab, reportYear, reportMonth]);

  useEffect(() => {
    if (activeTab === 'yearly') loadYearly(yearlyYear);
  }, [activeTab, yearlyYear]);

  // When switching to monthly tab, snap year/month to valid values from projects
  useEffect(() => {
    if (activeTab !== 'monthly' || projectYears.length === 0) return;
    if (!projectYears.includes(reportYear)) setReportYear(projectYears[projectYears.length - 1]);
  }, [activeTab, projects]);

  useEffect(() => {
    if (activeTab !== 'monthly') return;
    const months = availableMonthsForYear(reportYear);
    if (months.length > 0 && !months.includes(reportMonth)) setReportMonth(months[months.length - 1]);
  }, [reportYear, activeTab, projects]);

  // When switching to yearly tab, snap year to valid values from projects
  useEffect(() => {
    if (activeTab !== 'yearly' || projectYears.length === 0) return;
    if (!projectYears.includes(yearlyYear)) setYearlyYear(projectYears[projectYears.length - 1]);
  }, [activeTab, projects]);

  const statusPillClass = (s) => ({ Active: 'active', Completed: 'completed', 'On Hold': 'on-hold', Cancelled: 'cancelled' }[s] || '');
  const typeIcon    = () => '📁';
  
  const fmtDate = (d) => {
    if (!d) return '—';
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return '—';
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const fmtDateTime = (d) => {
    if (!d) return '—';
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return '—';
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${day}/${month}/${year}, ${timeStr}`;
  };

  const groupAndSortItemsByMonth = (items) => {
    if (!items || items.length === 0) return [];

    const groupsMap = new Map();

    items.forEach(item => {
      const d = new Date(item.taken_at);
      if (isNaN(d.getTime())) return;
      const year = d.getFullYear();
      const monthIndex = d.getMonth();
      const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });

      if (!groupsMap.has(monthKey)) {
        groupsMap.set(monthKey, {
          monthKey,
          monthLabel,
          year,
          monthIndex,
          items: []
        });
      }
      groupsMap.get(monthKey).items.push(item);
    });

    const sortedGroups = Array.from(groupsMap.values()).sort((a, b) => {
      return b.monthKey.localeCompare(a.monthKey);
    });

    sortedGroups.forEach(group => {
      group.items.sort((a, b) => new Date(b.taken_at) - new Date(a.taken_at));
    });

    return sortedGroups;
  };

  const fmtCurrency = (n) => `LKR ${Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
  const f = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  // Derive years and months that are covered by at least one project's active span
  const projectYears = (() => {
    const yearSet = new Set();
    projects.forEach(p => {
      if (!p.start_date) return;
      const start = new Date(p.start_date);
      const end = p.end_date ? new Date(p.end_date) : (p.deadline ? new Date(p.deadline) : new Date());
      for (let y = start.getFullYear(); y <= end.getFullYear(); y++) yearSet.add(y);
    });
    return Array.from(yearSet).sort((a, b) => a - b);
  })();

  const availableMonthsForYear = (year) => {
    const monthSet = new Set();
    projects.forEach(p => {
      if (!p.start_date) return;
      const start = new Date(p.start_date);
      const end = p.end_date ? new Date(p.end_date) : (p.deadline ? new Date(p.deadline) : new Date());
      const from = new Date(Math.max(start, new Date(year, 0, 1)));
      const to   = new Date(Math.min(end,   new Date(year, 11, 31)));
      if (from > to) return;
      for (let m = from.getMonth(); m <= to.getMonth(); m++) monthSet.add(m + 1);
    });
    return Array.from(monthSet).sort((a, b) => a - b);
  };

  const projNavItems = [
    { key: 'projects',        label: 'Projects',                icon: FolderOpen },
    { key: 'billing-counter', label: 'Project Billing Counter', icon: ShoppingCart },
    { key: 'monthly',         label: 'Monthly Report',          icon: BarChart2 },
    { key: 'yearly',          label: 'Yearly Report',           icon: TrendingUp },
  ];

  return (
    <div className="procurement-workspace">

      {/* ── Procurement-style Header + Nav ── */}
      <header className="procurement-header">
        <div className="procurement-title-block" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1>Project Management</h1>
            <p>Track items taken from shop for client projects</p>
          </div>
          <button className="proj-btn-primary" onClick={openAdd} style={{ marginBottom: '14px' }}>
            <Plus size={16} /> New Project
          </button>
        </div>

        <nav className="procurement-top-nav">
          {projNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                className={`procurement-nav-item ${activeTab === item.key ? 'active' : ''}`}
                onClick={() => setActiveTab(item.key)}
              >
                <Icon size={15} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </header>

      {/* ── Page Content ── */}
      <div className="procurement-workspace-content" style={{ padding: '24px' }}>
      <div className="proj-container" style={{ margin: 0 }}>

      {/* ══ PROJECT BILLING COUNTER ══ */}
      {activeTab === 'billing-counter' && (
        <ProjectsTab />
      )}

      {/* ══ PROJECTS LIST ══ */}
      {activeTab === 'projects' && (
        <>
          <div className="proj-stats">
            {[
              { label: 'Total',     value: projects.length,                                       color: '#800000' },
              { label: 'Active',    value: projects.filter(p => p.status === 'Active').length,    color: '#2e7d32' },
              { label: 'Completed', value: projects.filter(p => p.status === 'Completed').length, color: '#1565c0' },
              { label: 'On Hold',   value: projects.filter(p => p.status === 'On Hold').length,   color: '#e65100' },
            ].map(s => (
              <div key={s.label} className="proj-stat-card">
                <div className="proj-stat-value" style={{ color: s.color }}>{s.value}</div>
                <div className="proj-stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="proj-table-wrap">
            <table className="proj-table">
              <thead>
                <tr>
                  <th>Project</th><th>Owner</th><th>Status</th>
                  <th>Start Date</th><th>Deadline</th><th>Location</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.length === 0 ? (
                  <tr><td colSpan={7} className="proj-empty">No projects yet. Create one to get started.</td></tr>
                ) : projects.map(p => (
                  <tr key={p.project_id}>
                    <td>
                      <div className="proj-name-cell">
                        <span className="proj-type-icon">{typeIcon()}</span>
                        <span className="proj-name-text">{p.project_name}</span>
                      </div>
                    </td>
                    <td>{p.project_owner || '—'}</td>
                    <td><span className={`proj-status-pill ${statusPillClass(p.status)}`}>{p.status}</span></td>
                    <td>{fmtDate(p.start_date)}</td>
                    <td>{fmtDate(p.deadline)}</td>
                    <td>{p.location || '—'}</td>
                    <td>
                      <div className="proj-action-btns">
                        <button className="proj-icon-btn btn-view"   onClick={() => handleView(p)}  title="View"><Eye size={14} /></button>
                        <button className="proj-icon-btn btn-edit"   onClick={() => openEdit(p)}    title="Edit"><Edit2 size={14} /></button>
                        <button className="proj-icon-btn btn-delete" onClick={() => handleDelete(p.project_id, p.project_name)} title="Delete"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ══ MONTHLY REPORT ══ */}
      {activeTab === 'monthly' && (
        <div className="proj-report-section">
          <div className="proj-report-controls" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <select id="reportYear" name="reportYear" value={reportYear} onChange={e => setReportYear(Number(e.target.value))}>
              {projectYears.length > 0
                ? projectYears.map(y => <option key={y} value={y}>{y}</option>)
                : <option value={reportYear}>{reportYear}</option>}
            </select>
            <select id="reportMonth" name="reportMonth" value={reportMonth} onChange={e => setReportMonth(Number(e.target.value))}>
              {(availableMonthsForYear(reportYear).length > 0
                ? availableMonthsForYear(reportYear)
                : [reportMonth]
              ).map(m => <option key={m} value={m}>{MONTHS[m - 1]}</option>)}
            </select>
            {loading && <span style={{ fontSize: '0.85rem', color: '#888' }}>Loading…</span>}

            <button
              type="button"
              className="proj-btn-primary"
              style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              onClick={printMonthlyReport}
              disabled={!monthlyData || !monthlyData.byProject || monthlyData.byProject.length === 0}
            >
              <Printer size={16} /> Print Monthly Summary
            </button>
          </div>

          {monthlyData && (
            <>
              <div className="proj-report-stats">
                <div className="proj-report-stat-card">
                  <div className="proj-report-stat-label">Total Value</div>
                  <div className="proj-report-stat-value">{fmtCurrency(monthlyData.totalValue)}</div>
                </div>
                <div className="proj-report-stat-card">
                  <div className="proj-report-stat-label">Items Taken</div>
                  <div className="proj-report-stat-value">{monthlyData.totalItems}</div>
                </div>
                <div className="proj-report-stat-card">
                  <div className="proj-report-stat-label">Projects</div>
                  <div className="proj-report-stat-value">{monthlyData.byProject.length}</div>
                </div>
                <div className="proj-report-stat-card">
                  <div className="proj-report-stat-label">Project Income</div>
                  <div className="proj-report-stat-value">{fmtCurrency(monthlyData.totalProjectIncome || 0)}</div>
                </div>
              </div>

              {monthlyData.byProject.length === 0 ? (
                <div className="proj-report-empty">No items taken this month.</div>
              ) : monthlyData.byProject.map(pg => (
                <div key={pg.project.project_id} className="proj-report-group">
                  <div className="proj-report-group-header"
                    onClick={() => setExpandedProject(expandedProject === pg.project.project_id ? null : pg.project.project_id)}>
                    <div className="proj-report-group-title">
                      <span>{typeIcon()}</span>
                      <strong>{pg.project.project_name}</strong>
                    </div>
                    <div className="proj-report-group-meta">
                      <span>{fmtCurrency(pg.totalValue)}</span>
                      <span className="proj-report-group-qty">{pg.totalQty} units</span>
                      {expandedProject === pg.project.project_id ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                    </div>
                  </div>
                  {expandedProject === pg.project.project_id && (
                    <table className="proj-report-table">
                      <thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Total</th><th>Taken By</th><th>Date</th></tr></thead>
                      <tbody>
                        {pg.items.map(item => (
                          <tr key={item.item_id}>
                            <td>{item.product?.product_name || '—'}</td>
                            <td>{item.quantity}</td>
                            <td>{fmtCurrency(item.unit_price)}</td>
                            <td>{fmtCurrency(Number(item.quantity) * Number(item.unit_price))}</td>
                            <td>{item.receiver_name || (item.takenByUser ? `${item.takenByUser.first_name} ${item.takenByUser.last_name}` : '—')}</td>
                            <td className="proj-date-cell">{fmtDateTime(item.taken_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ══ YEARLY REPORT ══ */}
      {activeTab === 'yearly' && (
        <div className="proj-report-section">
          <div className="proj-report-controls" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <select id="yearlyYear" name="yearlyYear" value={yearlyYear} onChange={e => setYearlyYear(Number(e.target.value))}>
              {projectYears.length > 0
                ? projectYears.map(y => <option key={y} value={y}>{y}</option>)
                : <option value={yearlyYear}>{yearlyYear}</option>}
            </select>
            {loading && <span style={{ fontSize: '0.85rem', color: '#888' }}>Loading…</span>}

            <button
              type="button"
              className="proj-btn-primary"
              style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              onClick={printYearlyReport}
              disabled={!yearlyData || !yearlyData.totalItems}
            >
              <Printer size={16} /> Print Yearly Summary
            </button>
          </div>

          {yearlyData && (
            <>
              <div className="proj-report-stats">
                <div className="proj-report-stat-card">
                  <div className="proj-report-stat-label">Total Value {yearlyYear}</div>
                  <div className="proj-report-stat-value">{fmtCurrency(yearlyData.totalValue)}</div>
                </div>
                <div className="proj-report-stat-card">
                  <div className="proj-report-stat-label">Total Items Taken</div>
                  <div className="proj-report-stat-value">{yearlyData.totalItems}</div>
                </div>
                <div className="proj-report-stat-card">
                  <div className="proj-report-stat-label">Project Income</div>
                  <div className="proj-report-stat-value">{fmtCurrency(yearlyData.totalProjectIncome || 0)}</div>
                </div>
              </div>

              {yearlyData.byMonth.filter(m => m.totalItems > 0).length === 0 ? (
                <div className="proj-report-empty">No items taken in {yearlyYear}.</div>
              ) : (
                <div className="proj-yearly-grid">
                  {yearlyData.byMonth.filter(m => m.totalItems > 0).map(m => (
                    <div key={m.month} className="proj-month-card has-data">
                      <div className="proj-month-name">{MONTHS[m.month - 1]}</div>
                      <div className="proj-month-value">{fmtCurrency(m.totalValue)}</div>
                      <div className="proj-month-items">{m.totalItems} items</div>
                      <div className="proj-month-items">Income {fmtCurrency(m.projectIncome || 0)}</div>
                      <div className="proj-month-bar">
                        <div className="proj-month-bar-fill"
                          style={{ width: yearlyData.totalValue > 0 ? `${(m.totalValue / yearlyData.totalValue) * 100}%` : '0%' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      </div>{/* end proj-container */}
      </div>{/* end procurement-workspace-content */}

      {/* CREATE / EDIT MODAL portal */}
      {showModal && createPortal(
        <div className="proj-overlay" onClick={closeModal}>
          <div className="proj-modal" onClick={e => e.stopPropagation()}>
            <div className="proj-modal-header">
              <h2>{editId ? 'Edit Project' : 'New Project'}</h2>
              <button className="proj-modal-close" onClick={closeModal}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="proj-modal-form">
              <div className="proj-form-grid">
                <div className="proj-field proj-field-full">
                  <label>Project Name *</label>
                  <input id="project_name" name="project_name" value={form.project_name} onChange={f('project_name')}
                    required placeholder="e.g. Welding Gate Project" />
                </div>
                <div className="proj-field">
                  <label>Project Owner</label>
                  <input id="project_owner" name="project_owner" value={form.project_owner} onChange={f('project_owner')}
                    placeholder="e.g. John Silva" />
                </div>
                <div className="proj-field">
                  <label>Location</label>
                  <input id="location" name="location" value={form.location} onChange={f('location')}
                    placeholder="e.g. Colombo, Site A" />
                </div>
                <div className="proj-field">
                  <label>Status</label>
                  <select id="status" name="status" value={form.status} onChange={f('status')}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="proj-field">
                  <label>Start Date *</label>
                  <input id="start_date" name="start_date" type="date" value={form.start_date} onChange={f('start_date')} required />
                </div>
                <div className="proj-field">
                  <label>Deadline</label>
                  <input id="deadline" name="deadline" type="date" value={form.deadline} onChange={f('deadline')} />
                </div>
                <div className="proj-field">
                  <label>End Date (Actual)</label>
                  <input id="end_date" name="end_date" type="date" value={form.end_date} onChange={f('end_date')} />
                </div>
                {editId && ['Completed', 'Cancelled'].includes(form.status) && (
                  <div className="proj-field proj-field-full">
                    <label>Final Payment (Real Amount) *</label>
                    <input id="final_payment" name="final_payment" type="number" min="0" step="0.01" value={form.final_payment} onChange={f('final_payment')}
                      placeholder="e.g. 250000" />
                    <div style={{ marginTop: 6, color: '#6b7280', fontSize: '0.9rem' }}>
                      Estimated project cost: <strong>{fmtCurrency(projectEstimate ?? 0)}</strong>
                    </div>
                  </div>
                )}
                <div className="proj-field proj-field-full">
                  <label>Description</label>
                  <textarea id="description" name="description" rows={3} value={form.description} onChange={f('description')}
                    placeholder="Optional project notes…" />
                </div>
              </div>
              <div className="proj-modal-footer">
                <button type="button" className="proj-btn-cancel" onClick={closeModal}>Cancel</button>
                <button type="submit" className="proj-btn-submit" disabled={loading}>
                  {loading ? 'Saving…' : editId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* VIEW MODAL portal */}
      {viewProject && createPortal(
        <div className="proj-overlay" onClick={() => setViewProject(null)}>
          <div className="proj-modal proj-modal-lg" onClick={e => e.stopPropagation()}>
            <div className="proj-modal-header">
              <h2>{typeIcon()} {viewProject.project_name}</h2>
              <button className="proj-modal-close" onClick={() => setViewProject(null)}><X size={18} /></button>
            </div>

            <div className="proj-view-top">
              <div className="proj-view-icon">{typeIcon()}</div>
              <div>
                <h3>{viewProject.project_name}</h3>
                <p>{viewProject.project_owner ? `${viewProject.project_owner}` : ''}</p>
                <span className={`proj-status-pill ${statusPillClass(viewProject.status)}`}>{viewProject.status}</span>
              </div>
            </div>

            <div className="proj-view-grid">
              {viewProject.project_owner && (
                <div className="proj-view-row"><span className="proj-view-label">Owner</span><span className="proj-view-value">{viewProject.project_owner}</span></div>
              )}
              {viewProject.location && (
                <div className="proj-view-row"><span className="proj-view-label">Location</span><span className="proj-view-value">{viewProject.location}</span></div>
              )}
              <div className="proj-view-row"><span className="proj-view-label">Start Date</span><span className="proj-view-value">{fmtDate(viewProject.start_date)}</span></div>
              {viewProject.deadline && (
                <div className="proj-view-row"><span className="proj-view-label">Deadline</span><span className="proj-view-value">{fmtDate(viewProject.deadline)}</span></div>
              )}
              {viewProject.end_date && (
                <div className="proj-view-row"><span className="proj-view-label">End Date (Actual)</span><span className="proj-view-value">{fmtDate(viewProject.end_date)}</span></div>
              )}
              {viewProject.description && (
                <div className="proj-view-row"><span className="proj-view-label">Description</span><span className="proj-view-value">{viewProject.description}</span></div>
              )}
              <div className="proj-view-row">
                <span className="proj-view-label">Estimated Cost</span>
                <span className="proj-view-value">{fmtCurrency(viewProject.items?.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0))}</span>
              </div>
              <div className="proj-view-row">
                <span className="proj-view-label">Final Payment</span>
                <span className="proj-view-value">{fmtCurrency(viewProject.final_cost || 0)}</span>
              </div>
            </div>

            <div className="proj-items-section">
              <div className="proj-items-action-bar">
                <button
                  type="button"
                  className={`proj-items-toggle-btn ${showViewItems ? 'active' : ''}`}
                  onClick={() => setShowViewItems(!showViewItems)}
                >
                  <Package size={16} />
                  <span>Items Taken ({viewProject.items?.length || 0})</span>
                  {showViewItems ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>

              {showViewItems && (
                <div className="proj-items-content-wrap">
                  {(() => {
                    const grouped = groupAndSortItemsByMonth(viewProject.items || []);
                    if (grouped.length === 0) {
                      return <div className="proj-items-empty">No items recorded yet.</div>;
                    }
                    return (
                      <div className="proj-items-grouped-list">
                        {grouped.map(g => (
                          <div key={g.monthKey} className="proj-items-month-group">
                            <div
                              className="proj-items-month-header"
                              style={{ cursor: 'pointer' }}
                              onClick={() => setExpandedViewMonth(expandedViewMonth === g.monthKey ? null : g.monthKey)}
                            >
                              <span className="proj-items-month-title">📅 {g.monthLabel}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span className="proj-items-month-badge">{g.items.length} item(s)</span>
                                {expandedViewMonth === g.monthKey ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                              </div>
                            </div>
                            {expandedViewMonth === g.monthKey && (
                              <div className="proj-items-wrap">
                                <table className="proj-items-table">
                                  <thead>
                                    <tr>
                                      <th>Product</th><th>Qty</th><th>Unit Price</th><th>Note</th><th>Taken By</th><th>Date</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {g.items.map(item => (
                                      <tr key={item.item_id}>
                                        <td><strong>{item.product?.product_name || '—'}</strong></td>
                                        <td>{item.quantity}</td>
                                        <td>{fmtCurrency(item.unit_price)}</td>
                                        <td>{item.note || '—'}</td>
                                        <td>{item.receiver_name || (item.takenByUser ? `${item.takenByUser.first_name} ${item.takenByUser.last_name}` : '—')}</td>
                                        <td className="proj-date-cell">{fmtDateTime(item.taken_at)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}


export default function Projects() {
  const location = useLocation();
  const role = (localStorage.getItem('role') || 'admin').toLowerCase();
  const isManager = location.pathname.startsWith('/manager/') || role === 'manager';
  const Layout = isManager ? ManagerDashboard : AdminDashboard;
  return <Layout active="projects-mgmt"><ProjectsPage /></Layout>;
}
