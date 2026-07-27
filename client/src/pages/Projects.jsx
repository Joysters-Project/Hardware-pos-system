import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FolderOpen, Plus, X, Eye, Edit2, Trash2,
  BarChart2, TrendingUp, Package,
  ChevronDown, ChevronUp
} from 'lucide-react';
import api from '../utils/axios';
import AdminDashboard from './AdminDashboard';
import ManagerDashboard from './ManagerDashboard';
import '../styles/Projects.css';

const TYPES    = ['Welding', 'Timber', 'Hardware', 'Other'];
const STATUSES = ['Active', 'Completed', 'On Hold', 'Cancelled'];
const MONTHS   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const EMPTY_FORM = {
  project_name: '', project_owner: '', location: '',
  project_type: 'Hardware', description: '',
  start_date: '', deadline: '', end_date: '', status: 'Active', final_payment: '',
};

function ProjectsPage() {
  const [projects, setProjects]               = useState([]);
  const [form, setForm]                       = useState(EMPTY_FORM);
  const [editId, setEditId]                   = useState(null);
  const [showModal, setShowModal]             = useState(false);
  const [viewProject, setViewProject]         = useState(null);
  const [activeTab, setActiveTab]             = useState('projects');
  const [loading, setLoading]                 = useState(false);
  const [monthlyData, setMonthlyData]         = useState(null);
  const [reportYear, setReportYear]           = useState(new Date().getFullYear());
  const [reportMonth, setReportMonth]         = useState(new Date().getMonth() + 1);
  const [expandedProject, setExpandedProject] = useState(null);
  const [yearlyData, setYearlyData]           = useState(null);
  const [yearlyYear, setYearlyYear]           = useState(new Date().getFullYear());
  const [projectEstimate, setProjectEstimate] = useState(null);

  useEffect(() => { loadProjects(); }, []);

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
      project_type:  p.project_type,
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
    try { const res = await api.get(`/projects/${p.project_id}`); setViewProject(res.data); }
    catch { toast.error('Failed to load project details'); }
  };

  const loadMonthly = async () => {
    setLoading(true);
    try { const res = await api.get('/projects/report/monthly', { params: { year: reportYear, month: reportMonth } }); setMonthlyData(res.data); }
    catch { toast.error('Failed to load monthly report'); }
    finally { setLoading(false); }
  };

  const loadYearly = async () => {
    setLoading(true);
    try { const res = await api.get('/projects/report/yearly', { params: { year: yearlyYear } }); setYearlyData(res.data); }
    catch { toast.error('Failed to load yearly report'); }
    finally { setLoading(false); }
  };

  const statusPillClass = (s) => ({ Active: 'active', Completed: 'completed', 'On Hold': 'on-hold', Cancelled: 'cancelled' }[s] || '');
  const typeIcon    = (t) => ({ Welding: '🔧', Timber: '🪵', Hardware: '🔩', Other: '📦' }[t] || '📦');
  const fmtDate     = (d) => d ? new Date(d).toLocaleDateString('en-LK') : '—';
  const fmtCurrency = (n) => `LKR ${Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
  const f = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <div className="proj-container">

      {/* ── Header ── */}
      <div className="proj-header">
        <div className="proj-header-left">
          <div className="proj-header-icon"><FolderOpen size={22} /></div>
          <div>
            <h1>Project Management</h1>
            <p>Track items taken from shop for client projects</p>
          </div>
        </div>
        <button className="proj-btn-primary" onClick={openAdd}>
          <Plus size={16} /> New Project
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className="proj-tabs">
        {[
          { key: 'projects', label: 'Projects',       icon: <FolderOpen size={15} /> },
          { key: 'monthly',  label: 'Monthly Report', icon: <BarChart2 size={15} /> },
          { key: 'yearly',   label: 'Yearly Report',  icon: <TrendingUp size={15} /> },
        ].map(t => (
          <button key={t.key} className={`proj-tab ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

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
                  <th>Project</th><th>Owner</th><th>Type</th><th>Status</th>
                  <th>Start Date</th><th>Deadline</th><th>Location</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.length === 0 ? (
                  <tr><td colSpan={8} className="proj-empty">No projects yet. Create one to get started.</td></tr>
                ) : projects.map(p => (
                  <tr key={p.project_id}>
                    <td>
                      <div className="proj-name-cell">
                        <span className="proj-type-icon">{typeIcon(p.project_type)}</span>
                        <span className="proj-name-text">{p.project_name}</span>
                      </div>
                    </td>
                    <td>{p.project_owner || '—'}</td>
                    <td><span className="proj-type-badge">{p.project_type}</span></td>
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
          <div className="proj-report-controls">
            <select value={reportYear} onChange={e => setReportYear(Number(e.target.value))}>
              {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={reportMonth} onChange={e => setReportMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
            </select>
            <button className="proj-btn-primary" onClick={loadMonthly} disabled={loading}>
              <BarChart2 size={15} /> {loading ? 'Loading…' : 'Generate Report'}
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
                      <span>{typeIcon(pg.project.project_type)}</span>
                      <strong>{pg.project.project_name}</strong>
                      <span className="proj-type-badge">{pg.project.project_type}</span>
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
                            <td>{item.takenByUser ? `${item.takenByUser.first_name} ${item.takenByUser.last_name}` : '—'}</td>
                            <td>{new Date(item.taken_at).toLocaleString('en-LK')}</td>
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
          <div className="proj-report-controls">
            <select value={yearlyYear} onChange={e => setYearlyYear(Number(e.target.value))}>
              {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button className="proj-btn-primary" onClick={loadYearly} disabled={loading}>
              <TrendingUp size={15} /> {loading ? 'Loading…' : 'Generate Report'}
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

              <div className="proj-yearly-grid">
                {yearlyData.byMonth.map(m => (
                  <div key={m.month} className={`proj-month-card ${m.totalItems > 0 ? 'has-data' : ''}`}>
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
            </>
          )}
        </div>
      )}

      {/* ══ CREATE / EDIT MODAL ══ */}
      {showModal && (
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
                  <input value={form.project_name} onChange={f('project_name')}
                    required placeholder="e.g. Welding Gate Project" />
                </div>
                <div className="proj-field">
                  <label>Project Owner</label>
                  <input value={form.project_owner} onChange={f('project_owner')}
                    placeholder="e.g. John Silva" />
                </div>
                <div className="proj-field">
                  <label>Location</label>
                  <input value={form.location} onChange={f('location')}
                    placeholder="e.g. Colombo, Site A" />
                </div>
                <div className="proj-field">
                  <label>Type *</label>
                  <select value={form.project_type} onChange={f('project_type')}>
                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="proj-field">
                  <label>Status</label>
                  <select value={form.status} onChange={f('status')}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="proj-field">
                  <label>Start Date *</label>
                  <input type="date" value={form.start_date} onChange={f('start_date')} required />
                </div>
                <div className="proj-field">
                  <label>Deadline</label>
                  <input type="date" value={form.deadline} onChange={f('deadline')} />
                </div>
                <div className="proj-field">
                  <label>End Date (Actual)</label>
                  <input type="date" value={form.end_date} onChange={f('end_date')} />
                </div>
                {editId && ['Completed', 'Cancelled'].includes(form.status) && (
                  <div className="proj-field proj-field-full">
                    <label>Final Payment (Real Amount) *</label>
                    <input type="number" min="0" step="0.01" value={form.final_payment} onChange={f('final_payment')}
                      placeholder="e.g. 250000" />
                    <div style={{ marginTop: 6, color: '#6b7280', fontSize: '0.9rem' }}>
                      Estimated project cost: <strong>{fmtCurrency(projectEstimate ?? 0)}</strong>
                    </div>
                  </div>
                )}
                <div className="proj-field proj-field-full">
                  <label>Description</label>
                  <textarea rows={3} value={form.description} onChange={f('description')}
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
        </div>
      )}

      {/* ══ VIEW MODAL ══ */}
      {viewProject && (
        <div className="proj-overlay" onClick={() => setViewProject(null)}>
          <div className="proj-modal proj-modal-lg" onClick={e => e.stopPropagation()}>
            <div className="proj-modal-header">
              <h2>{typeIcon(viewProject.project_type)} {viewProject.project_name}</h2>
              <button className="proj-modal-close" onClick={() => setViewProject(null)}><X size={18} /></button>
            </div>

            <div className="proj-view-top">
              <div className="proj-view-icon">{typeIcon(viewProject.project_type)}</div>
              <div>
                <h3>{viewProject.project_name}</h3>
                <p>{viewProject.project_type}{viewProject.project_owner ? ` · ${viewProject.project_owner}` : ''}</p>
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
              <h3><Package size={15} /> Items Taken ({viewProject.items?.length || 0})</h3>
              <div className="proj-items-wrap">
                <table className="proj-items-table">
                  <thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Total</th><th>Note</th><th>Taken By</th><th>Date</th></tr></thead>
                  <tbody>
                    {(!viewProject.items || viewProject.items.length === 0) ? (
                      <tr><td colSpan={7} className="proj-items-empty">No items recorded yet.</td></tr>
                    ) : viewProject.items.map(item => (
                      <tr key={item.item_id}>
                        <td>{item.product?.product_name || '—'}</td>
                        <td>{item.quantity}</td>
                        <td>{fmtCurrency(item.unit_price)}</td>
                        <td>{fmtCurrency(Number(item.quantity) * Number(item.unit_price))}</td>
                        <td>{item.note || '—'}</td>
                        <td>{item.takenByUser ? `${item.takenByUser.first_name} ${item.takenByUser.last_name}` : '—'}</td>
                        <td>{new Date(item.taken_at).toLocaleString('en-LK')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
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
