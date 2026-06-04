import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, RefreshCw, Trash2, ChevronLeft, ChevronRight, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/axios';
import AdminDashboard from './AdminDashboard';
import { useAuth } from '../context/AuthContext';
import '../styles/AuditLog.css';

const ACTION_COLORS = {
  LOGIN:                 { bg: '#e8f5e9', color: '#2e7d32' },
  LOGOUT:                { bg: '#e8f4fd', color: '#1565c0' },
  PASSWORD_RESET:        { bg: '#fff3e0', color: '#e65100' },
  PASSWORD_RESET_REQUEST:{ bg: '#fff8e1', color: '#f57f17' },
  CREATE_EMPLOYEE:       { bg: '#e8f5e9', color: '#2e7d32' },
  UPDATE_EMPLOYEE:       { bg: '#fff3e0', color: '#e65100' },
  DELETE_EMPLOYEE:       { bg: '#fdecea', color: '#c62828' },
  INVENTORY_ADD:         { bg: '#e8f5e9', color: '#2e7d32' },
  INVENTORY_UPDATE:      { bg: '#fff3e0', color: '#e65100' },
  INVENTORY_DELETE:      { bg: '#fdecea', color: '#c62828' },
  INVOICE_CREATED:       { bg: '#e8f4fd', color: '#1565c0' },
  SALARY_SLIP_CREATED:   { bg: '#e8f5e9', color: '#2e7d32' },
  SALARY_SLIP_PAID:      { bg: '#e0f2f1', color: '#00695c' },
  SALARY_SLIP_UPDATED:   { bg: '#fff3e0', color: '#e65100' },
  USER_CREATED:          { bg: '#e8f5e9', color: '#2e7d32' },
  USER_ACCOUNT_CREATED:  { bg: '#e8f5e9', color: '#2e7d32' },
  USER_ACCOUNT_UPDATED:  { bg: '#fff3e0', color: '#e65100' },
  USER_ACCOUNT_DELETED:  { bg: '#fdecea', color: '#c62828' },
};

const getActionStyle = (action) => ACTION_COLORS[action] || { bg: '#f5f5f5', color: '#555' };

function AuditLogPage() {
  const [logs,      setLogs]      = useState([]);
  const [actions,   setActions]   = useState([]);
  const [total,     setTotal]     = useState(0);
  const [pages,     setPages]     = useState(1);
  const [loading,   setLoading]   = useState(false);
  const [deleting,  setDeleting]  = useState(null);

  const [search,    setSearch]    = useState('');
  const [action,    setAction]    = useState('');
  const [from,      setFrom]      = useState('');
  const [to,        setTo]        = useState('');
  const [page,      setPage]      = useState(1);
  const PER_PAGE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: PER_PAGE };
      if (search) params.search = search;
      if (action) params.action = action;
      if (from)   params.from   = from;
      if (to)     params.to     = to;

      const res = await api.get('/audit_log', { params });
      setLogs(res.data.data);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch (err) {
      toast.error(err.response?.status === 403 ? 'Access denied: Admin only' : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [search, action, from, to, page]);

  const loadActions = useCallback(async () => {
    try {
      const res = await api.get('/audit_log/actions');
      setActions(res.data);
    } catch { /* non-fatal */ }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadActions(); }, [loadActions]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this audit log entry?')) return;
    setDeleting(id);
    try {
      await api.delete(`/audit_log/${id}`);
      toast.success('Log entry deleted');
      load();
    } catch { toast.error('Failed to delete'); }
    finally { setDeleting(null); }
  };

  const resetFilters = () => {
    setSearch(''); setAction(''); setFrom(''); setTo(''); setPage(1);
  };

  const formatTime = (t) => {
    if (!t) return '—';
    const d = new Date(t);
    return d.toLocaleDateString('en-LK') + ' ' + d.toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' });
  };

  const getUserName = (log) => {
    if (log.user?.user_name) return log.user.user_name;
    if (log.user?.first_name) return `${log.user.first_name} ${log.user.last_name}`;
    return `User #${log.user_id}`;
  };

  return (
    <div className="audit-container">
      {/* Header */}
      <div className="audit-header">
        <div className="audit-header-left">
          <div className="audit-header-icon"><ShieldAlert size={20} /></div>
          <div>
            <h1>Audit Logs</h1>
            <p>Track all system activity and user actions</p>
          </div>
        </div>
        <div className="audit-header-actions">
          <span className="audit-total-badge">{total.toLocaleString()} records</span>
          <button className="audit-refresh-btn" onClick={load} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="audit-filters">
        <div className="audit-search-wrap">
          <Search size={14} className="audit-search-icon" />
          <input className="audit-search" placeholder="Search by username..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="audit-select" value={action} onChange={e => { setAction(e.target.value); setPage(1); }}>
          <option value="">All Actions</option>
          {actions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <input type="date" className="audit-select" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} title="From date" />
        <input type="date" className="audit-select" value={to}   onChange={e => { setTo(e.target.value);   setPage(1); }} title="To date" />
        {(search || action || from || to) && (
          <button className="audit-clear-btn" onClick={resetFilters}>Clear</button>
        )}
      </div>

      {/* Table */}
      <div className="audit-table-wrap">
        <table className="audit-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Time</th>
              <th>User</th>
              <th>Role</th>
              <th>Action</th>
              <th>Details</th>
              <th>IP Address</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" className="audit-empty">Loading...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan="8" className="audit-empty">No audit logs found</td></tr>
            ) : logs.map(log => {
              const style = getActionStyle(log.action);
              return (
                <tr key={log.log_id}>
                  <td><span className="audit-id-badge">#{log.log_id}</span></td>
                  <td className="audit-time-cell">{formatTime(log.time)}</td>
                  <td className="audit-user-cell">
                    <span className="audit-username">{getUserName(log)}</span>
                  </td>
                  <td>
                    <span className="audit-role-pill">{log.role || '—'}</span>
                  </td>
                  <td>
                    <span className="audit-action-pill" style={{ background: style.bg, color: style.color }}>
                      {log.action}
                    </span>
                  </td>
                  <td className="audit-details-cell" title={log.details}>{log.details || '—'}</td>
                  <td className="audit-ip-cell">{log.ip_address || '—'}</td>
                  <td>
                    <button className="audit-del-btn" title="Delete log entry"
                      onClick={() => handleDelete(log.log_id)}
                      disabled={deleting === log.log_id}>
                      {deleting === log.log_id ? <RefreshCw size={13} className="spin" /> : <Trash2 size={13} />}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="audit-pagination">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft size={15} />
          </button>
          <span className="audit-page-info">Page {page} of {pages}</span>
          {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
            const p = page <= 4 ? i + 1 : page - 3 + i;
            if (p < 1 || p > pages) return null;
            return (
              <button key={p} className={page === p ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>
            );
          })}
          <button disabled={page === pages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

export default function AuditLogs() {
  const { role } = useAuth();
  const navigate = useNavigate();

  // Client-side guard — redirect non-admins immediately
  useEffect(() => {
    if (role && role.toLowerCase() !== 'admin') {
      toast.error('Access denied: Admin only');
      navigate('/dashboard/' + role.toLowerCase(), { replace: true });
    }
  }, [role, navigate]);

  if (role?.toLowerCase() !== 'admin') return null;

  return <AdminDashboard active="audit"><AuditLogPage /></AdminDashboard>;
}
