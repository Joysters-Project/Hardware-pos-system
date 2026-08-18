import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, RefreshCw, ChevronLeft, ChevronRight, ShieldAlert, Eye, X, Clock, User, Shield, Activity, Globe, FileText } from 'lucide-react';
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
  CREATE_CATEGORY:       { bg: '#e8f5e9', color: '#2e7d32' },
  UPDATE_CATEGORY:       { bg: '#fff3e0', color: '#e65100' },
  DELETE_CATEGORY:       { bg: '#fdecea', color: '#c62828' },
  CREATE_BRAND:          { bg: '#e8f5e9', color: '#2e7d32' },
  UPDATE_BRAND:          { bg: '#fff3e0', color: '#e65100' },
  DELETE_BRAND:          { bg: '#fdecea', color: '#c62828' },
  CREATE_UNIT:           { bg: '#e8f5e9', color: '#2e7d32' },
  UPDATE_UNIT:           { bg: '#fff3e0', color: '#e65100' },
  DELETE_UNIT:           { bg: '#fdecea', color: '#c62828' },
  CREATE_DEPARTMENT:     { bg: '#e8f5e9', color: '#2e7d32' },
  UPDATE_DEPARTMENT:     { bg: '#fff3e0', color: '#e65100' },
  DELETE_DEPARTMENT:     { bg: '#fdecea', color: '#c62828' },
  CREATE_ASSET:          { bg: '#e8f5e9', color: '#2e7d32' },
  UPDATE_ASSET:          { bg: '#fff3e0', color: '#e65100' },
  DISPOSE_ASSET:         { bg: '#fff8e1', color: '#f57f17' },
  DELETE_ASSET:          { bg: '#fdecea', color: '#c62828' },
  CREATE_PROJECT:        { bg: '#e8f5e9', color: '#2e7d32' },
  UPDATE_PROJECT:        { bg: '#fff3e0', color: '#e65100' },
  DELETE_PROJECT:        { bg: '#fdecea', color: '#c62828' },
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
  const [logs,        setLogs]        = useState([]);
  const [actions,     setActions]     = useState([]);
  const [total,       setTotal]       = useState(0);
  const [pages,       setPages]       = useState(1);
  const [loading,     setLoading]     = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

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

  const resetFilters = () => {
    setSearch(''); setAction(''); setFrom(''); setTo(''); setPage(1);
  };

  const formatTime = (t) => {
    if (!t) return '—';
    const d = new Date(t);
    const day   = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year  = d.getFullYear();
    const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${day}/${month}/${year} ${timeStr}`;
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
          <input id="search" name="search" className="audit-search" placeholder="Search by username..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select id="action" name="action" className="audit-select" value={action} onChange={e => { setAction(e.target.value); setPage(1); }}>
          <option value="">All Actions</option>
          {actions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <input id="from" name="from" type="date" className="audit-select" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} title="From date" />
        <input id="to" name="to" type="date" className="audit-select" value={to}   onChange={e => { setTo(e.target.value);   setPage(1); }} title="To date" />
        {(search || action || from || to) && (
          <button className="audit-clear-btn" onClick={resetFilters}>Clear</button>
        )}
      </div>

      {/* Table */}
      <div className="audit-table-wrap">
        <table className="audit-table">
          <thead>
            <tr>
              <th style={{ width: '50px' }}>#</th>
              <th style={{ width: '140px' }}>Time</th>
              <th style={{ width: '90px' }}>User</th>
              <th style={{ width: '70px' }}>Role</th>
              <th style={{ width: '150px' }}>Action</th>
              <th>Details</th>
              <th style={{ width: '80px' }}>IP Address</th>
              <th style={{ width: '50px', textAlign: 'center' }}>Action</th>
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
                  <td style={{ textAlign: 'center' }}>
                    <button className="audit-view-btn" title="View details" onClick={() => setSelectedLog(log)}>
                      <Eye size={15} />
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

      {/* Action Details Modal Portal — Covers & blurs full viewport */}
      {selectedLog && createPortal(
        <div className="audit-modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="audit-modal" onClick={e => e.stopPropagation()}>
            <div className="audit-modal-header">
              <div className="audit-modal-header-title">
                <ShieldAlert size={20} />
                <h3>Audit Log Entry #{selectedLog.log_id}</h3>
              </div>
              <button className="audit-modal-close" title="Close" onClick={() => setSelectedLog(null)}>
                <X size={18} />
              </button>
            </div>
            
            <div className="audit-modal-body">
              <div className="audit-modal-grid">
                <div className="audit-modal-item">
                  <div className="audit-modal-item-label"><Clock size={13} /> Time</div>
                  <div className="audit-modal-item-val">{formatTime(selectedLog.time)}</div>
                </div>
                <div className="audit-modal-item">
                  <div className="audit-modal-item-label"><User size={13} /> User</div>
                  <div className="audit-modal-item-val audit-username">{getUserName(selectedLog)}</div>
                </div>
                <div className="audit-modal-item">
                  <div className="audit-modal-item-label"><Shield size={13} /> Role</div>
                  <div className="audit-modal-item-val">
                    <span className="audit-role-pill">{selectedLog.role || '—'}</span>
                  </div>
                </div>
                <div className="audit-modal-item">
                  <div className="audit-modal-item-label"><Activity size={13} /> Action</div>
                  <div className="audit-modal-item-val">
                    <span className="audit-action-pill" style={getActionStyle(selectedLog.action)}>
                      {selectedLog.action}
                    </span>
                  </div>
                </div>
                <div className="audit-modal-item full-width">
                  <div className="audit-modal-item-label"><Globe size={13} /> IP Address</div>
                  <div className="audit-modal-item-val audit-ip-code">{selectedLog.ip_address || '—'}</div>
                </div>
              </div>

              <div className="audit-modal-details-box">
                <div className="audit-modal-details-header">
                  <FileText size={14} />
                  <span>Action Details</span>
                </div>
                <p>{selectedLog.details || 'No additional details provided.'}</p>
              </div>
            </div>

            <div className="audit-modal-footer">
              <button className="audit-modal-close-btn" onClick={() => setSelectedLog(null)}>
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
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
