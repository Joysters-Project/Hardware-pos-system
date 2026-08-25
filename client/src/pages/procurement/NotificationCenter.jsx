import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, RefreshCw, CheckCheck, Archive, AlertTriangle, Clock, Package, X, Info } from 'lucide-react';
import {
  useNotifications, useMarkNotificationsRead, useArchiveNotifications,
} from '../../services/procurementApi';
import '../../styles/Procurement.css';
import '../../styles/ProcurementPages.css';

const TYPE_META = {
  low_stock:   { icon: Package,       color: '#e65100', label: 'Low Stock'      },
  reorder:     { icon: AlertTriangle, color: '#b45309', label: 'Reorder Alert'  },
  po_overdue:  { icon: Clock,         color: '#c62828', label: 'PO Overdue'     },
  payment_due: { icon: Clock,         color: '#1565c0', label: 'Payment Due'    },
  po_approved: { icon: CheckCheck,    color: '#1d7e42', label: 'PO Approved'    },
  general:     { icon: Info,          color: '#8b3a3a', label: 'Notification'   },
};

function getMeta(type) {
  return TYPE_META[type] || TYPE_META.general;
}

export default function NotificationCenter() {
  const [filter, setFilter]     = useState('unread');
  const [selected, setSelected] = useState(new Set());

  const { data: notifs = [], isLoading: nl, refetch: rn } = useNotifications(filter === 'all' ? undefined : filter);
  const markReadMutation = useMarkNotificationsRead();
  const archiveMutation  = useArchiveNotifications();

  const sortedNotifs = useMemo(() =>
    [...notifs].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)),
    [notifs]);

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(sortedNotifs.map(n => n.notification_id)));
  const clearSel  = () => setSelected(new Set());

  const handleMarkRead = () => {
    const ids = selected.size
      ? [...selected]
      : sortedNotifs.filter(n => !n.is_read).map(n => n.notification_id);
    if (ids.length) markReadMutation.mutate(ids, { onSuccess: () => { clearSel(); rn(); } });
  };

  const handleArchive = () => {
    const ids = [...selected];
    if (ids.length) archiveMutation.mutate(ids, { onSuccess: () => { clearSel(); rn(); } });
  };

  const fmtDate = (d) => d
    ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '';

  const unreadCount = sortedNotifs.filter(n => !n.is_read).length;

  return (
    <div className="proc-container">
      {/* Header */}
      <motion.div className="proc-header"
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <h1>Notification Center</h1>
          <p>Procurement alerts and workflow notifications</p>
        </div>
        <div className="proc-header-actions">
          <motion.button className="proc-btn-outline" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={rn}>
            <RefreshCw size={14} /> Refresh
          </motion.button>
        </div>
      </motion.div>

      {/* Summary pill */}
      <div className="pp-notif-summary">
        {unreadCount > 0 && (
          <div className="pp-notif-pill unread-pill">
            <Bell size={13} /> {unreadCount} unread procurement alert{unreadCount !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="pp-notif-toolbar">
        <div className="proc-tabs" style={{ marginBottom: 0 }}>
          {['unread', 'all', 'archived'].map(f => (
            <button key={f} className={`proc-tab-btn ${filter === f ? 'active' : ''}`}
              onClick={() => { setFilter(f); clearSel(); }}
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="proc-header-actions">
          {selected.size > 0 && (
            <>
              <span style={{ fontSize: '0.82rem', color: '#666' }}>{selected.size} selected</span>
              <motion.button className="proc-btn-outline" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                whileHover={{ scale: 1.04 }} onClick={handleMarkRead}
                disabled={markReadMutation.isPending}>
                <CheckCheck size={13} /> Mark Read
              </motion.button>
              <motion.button className="proc-btn-outline" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                whileHover={{ scale: 1.04 }} onClick={handleArchive}
                disabled={archiveMutation.isPending}>
                <Archive size={13} /> Archive
              </motion.button>
              <button className="proc-link-btn" onClick={clearSel}>Clear</button>
            </>
          )}
          {selected.size === 0 && sortedNotifs.length > 0 && (
            <>
              <button className="proc-link-btn" onClick={selectAll}>Select All</button>
              <motion.button className="proc-btn-outline" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                whileHover={{ scale: 1.04 }} onClick={handleMarkRead}
                disabled={markReadMutation.isPending}>
                <CheckCheck size={13} /> Mark All Read
              </motion.button>
            </>
          )}
        </div>
      </div>

      {/* Notification list */}
      <div className="pp-notif-list">
        {nl ? (
          <div className="proc-empty">Loading notifications...</div>
        ) : sortedNotifs.length === 0 ? (
          <div className="pp-notif-empty">
            <Bell size={40} style={{ color: '#ddd', marginBottom: '12px' }} />
            <p>No {filter} notifications</p>
          </div>
        ) : (
          <AnimatePresence>
            {sortedNotifs.map((n, i) => {
              const meta = getMeta(n.type || n.notification_type || 'general');
              const Icon = meta.icon;
              const isSelected = selected.has(n.notification_id);
              return (
                <motion.div key={n.notification_id}
                  className={`pp-notif-item ${!n.is_read ? 'unread' : ''} ${isSelected ? 'selected' : ''}`}
                  initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ delay: i * 0.025 }}
                  style={{ borderLeft: `3px solid ${!n.is_read ? meta.color : '#e0e0e0'}` }}
                  onClick={() => toggleSelect(n.notification_id)}>
                  <input id="checkbox_field" name="checkbox_field" type="checkbox" checked={isSelected} onChange={() => toggleSelect(n.notification_id)}
                    onClick={e => e.stopPropagation()}
                    style={{ flexShrink: 0, accentColor: '#8b3a3a', cursor: 'pointer' }} />
                  <div className="pp-notif-icon" style={{ background: `${meta.color}18`, color: meta.color }}>
                    <Icon size={16} />
                  </div>
                  <div className="pp-notif-body">
                    <div className="pp-notif-title">{n.title || meta.label}</div>
                    <div className="pp-notif-message">{n.message}</div>
                    <div className="pp-notif-date">{fmtDate(n.created_at)}</div>
                  </div>
                  {!n.is_read && <div className="pp-notif-unread-dot" style={{ background: meta.color }} />}
                  <span className="pp-notif-badge" style={{ background: `${meta.color}15`, color: meta.color }}>
                    {meta.label}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
