import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { RefreshCw, Plus, Download, DollarSign, Clock, AlertTriangle, CheckCircle, X, AlertCircle } from 'lucide-react';
import {
  usePaymentDashboard, usePayments, useRecordPayment,
  useDownloadPaymentReceipt, useActiveSuppliers, useUpdateChequeStatus,
} from '../../services/procurementApi';
import '../../styles/Procurement.css';
import '../../styles/ProcurementPages.css';

const STATUS_COLORS = {
  Paid: '#1d7e42', Partial: '#1565c0', Unpaid: '#e65100', Overdue: '#c62828',
};

const CHEQUE_COLORS = {
  Pending:   { bg: '#fff8e1', color: '#b45309', border: '#fde68a' },
  Cleared:   { bg: '#f0fdf4', color: '#1d7e42', border: '#bbf7d0' },
  Bounced:   { bg: '#fff1f2', color: '#c62828', border: '#fecaca' },
  Cancelled: { bg: '#f5f5f5', color: '#666',    border: '#e0e0e0' },
};

const AGING_COLORS = ['#1d7e42', '#1565c0', '#e65100', '#b45309', '#c62828'];

function KpiCard({ icon: Icon, label, value, color, sub, delay }) {
  return (
    <motion.div className="pp-kpi-card"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay }} whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
      <div className="pp-kpi-icon" style={{ background: `${color}18`, color }}>
        <Icon size={20} />
      </div>
      <div>
        <div className="pp-kpi-value" style={{ color }}>{value}</div>
        <div className="pp-kpi-label">{label}</div>
        {sub && <div className="pp-kpi-sub">{sub}</div>}
      </div>
    </motion.div>
  );
}

export default function PaymentDashboard() {
  const [search, setSearch]               = useState('');
  const [filterStatus, setFilter]         = useState('');
  const [filterChequeStatus, setFilterChequeStatus] = useState('');
  const [showModal, setShowModal]   = useState(false);
  const [selectedPay, setSelected]  = useState(null);
  const [payAmount, setPayAmount]   = useState('');
  const [payMethod, setPayMethod]   = useState('Bank Transfer');
  const [payNote, setPayNote]       = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [chequeDate, setChequeDate] = useState('');
  const [repayMode, setRepayMode] = useState(false);

  const { data: dash, isLoading: dl, refetch: rd } = usePaymentDashboard();
  const { data: payments = [], isLoading: pl, refetch: rp } = usePayments({
    status: filterStatus || undefined,
  });
  const { data: suppliers = [] } = useActiveSuppliers();
  const recordMutation        = useRecordPayment();
  const downloadMutation      = useDownloadPaymentReceipt();
  const updateChequeMutation  = useUpdateChequeStatus();

  const fmt  = (n) => `LKR ${Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
  const fmtD = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '—';

  const filtered = useMemo(() =>
    payments.filter(p => {
      const term = search.toLowerCase();
      return !term || (p.supplier?.supplier_name || '').toLowerCase().includes(term) ||
        (p.purchase_order?.po_number || '').toLowerCase().includes(term);
    }), [payments, search]);

  const openModal = (pay) => {
    const isRepay = pay.cheque_status === 'Bounced' || pay.cheque_status === 'Cancelled';
    setSelected(pay);
    setRepayMode(!!isRepay);
    setPayAmount(Number(isRepay ? (pay.invoice_amount || 0) : (pay.balance_amount || pay.invoice_amount || 0)).toFixed(2));
    setPayMethod(isRepay ? 'Bank Transfer' : (pay.payment_method || 'Bank Transfer'));
    setPayNote(isRepay ? '' : (pay.notes || ''));
    // Clear cheque fields for repayment so user enters fresh details
    setChequeNumber(isRepay ? '' : (pay.cheque_number || ''));
    setBankName(isRepay ? '' : (pay.bank_name || ''));
    setChequeDate(isRepay ? '' : (pay.cheque_date ? pay.cheque_date.split('T')[0] : ''));
    setShowModal(true);
  };

  const handleRecord = async () => {
    if (!selectedPay) return;
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) {
      return alert('Enter a valid payment amount greater than 0');
    }
    if (!repayMode && selectedPay.balance_amount !== undefined && !isNaN(parseFloat(selectedPay.balance_amount)) && amt > parseFloat(selectedPay.balance_amount)) {
      return alert('Amount exceeds outstanding balance');
    }

    const payload = {
      payment_id: selectedPay.payment_id,
      paid_amount: amt,
      payment_method: payMethod,
      paid_date: new Date().toISOString().split('T')[0],
      notes: payNote,
    };

    if (payMethod === 'Cheque') {
      const DEFAULT_PENDING_DAYS = 3;
      const computedPendingDate = chequeDate ? new Date(new Date(chequeDate).getTime() + DEFAULT_PENDING_DAYS * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : undefined;
      Object.assign(payload, {
        cheque_number: chequeNumber,
        bank_name: bankName,
        cheque_date: chequeDate,
        cheque_status: 'Pending',
        pending_cheque_date: computedPendingDate,
        pending_days: DEFAULT_PENDING_DAYS,
      });
    }

    try {
      await recordMutation.mutateAsync(payload);
      setShowModal(false);
      rp();
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to record payment';
      alert(msg);
    }
  };

  const summary       = dash?.summary             || {};
  const aging         = dash?.aging               || [];
  const chequeSummary = dash?.chequeSummary       || {};
  const chequeAlerts  = dash?.pendingChequeAlerts || [];

  return (
    <div className="proc-container">
      {/* Header */}
      <motion.div className="proc-header"
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <h1>Payment Dashboard</h1>
          <p>Supplier payables, aging analysis and payment tracking with clear overdue indicators.</p>
          <div className="proc-header-meta">
            <span className="proc-chip proc-chip-accent">Accounts payable</span>
            <span className="proc-chip proc-chip-success">Payment readiness</span>
          </div>
        </div>
        <div className="proc-header-actions">
          <motion.button className="proc-btn-outline" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => { rd(); rp(); }} disabled={dl || pl}>
            <RefreshCw size={14} className={dl || pl ? 'proc-spin' : ''} /> Refresh
          </motion.button>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="pp-kpi-grid">
        <KpiCard icon={AlertTriangle} label="Outstanding"    value={fmt(summary.outstanding)}  color="#e65100" delay={0.05} />
        <KpiCard icon={Clock}         label="Due Today"      value={fmt(summary.dueToday)}      color="#c62828" delay={0.1}  />
        <KpiCard icon={DollarSign}    label="Due This Week"  value={fmt(summary.dueThisWeek)}   color="#1565c0" delay={0.15} />
        <KpiCard icon={CheckCircle}   label="Paid This Month" value={fmt(summary.paidThisMonth)} color="#1d7e42" delay={0.2} />
      </div>

      {/* Cheque Summary Cards */}
      {(chequeSummary.Pending > 0 || chequeSummary.Cleared > 0 || chequeSummary.Bounced > 0 || chequeSummary.Cancelled > 0) && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
          style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#888', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cheque Payments</div>
          <div className="pp-kpi-grid">
            {[['Pending', Clock, 0.05], ['Cleared', CheckCircle, 0.1], ['Bounced', AlertTriangle, 0.15], ['Cancelled', X, 0.2]].map(([s, Icon, d]) => {
              const c = CHEQUE_COLORS[s];
              return (
                <motion.div key={s} className="pp-kpi-card"
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: d }}
                  whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}
                  onClick={() => setFilterChequeStatus(filterChequeStatus === s ? '' : s)}
                  style={{ cursor: 'pointer', outline: filterChequeStatus === s ? `2px solid ${c.color}` : 'none', outlineOffset: 2 }}>
                  <div className="pp-kpi-icon" style={{ background: c.bg, color: c.color }}><Icon size={20} /></div>
                  <div>
                    <div className="pp-kpi-value" style={{ color: c.color }}>{chequeSummary[s] ?? 0}</div>
                    <div className="pp-kpi-label">{s} Cheques</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Pending Cheque Alerts */}
      {chequeAlerts.length > 0 && (
        <motion.div className="proc-card" style={{ marginBottom: '1.25rem' }}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
          <div className="proc-card-header">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <AlertCircle size={16} color="#c62828" /> Pending Cheque Alerts
            </h2>
            <span className="proc-badge-count">{chequeAlerts.length}</span>
          </div>
          <div className="proc-card-body" style={{ padding: '0.5rem 1rem 1rem' }}>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {chequeAlerts.map((alert) => {
                const isOverdue = alert.is_overdue;
                const isNear    = !isOverdue && (alert.days_remaining ?? 99) <= 2;
                const bg        = isOverdue ? '#fff1f2' : isNear ? '#fff8f0' : '#f9fafb';
                const border    = isOverdue ? '#fecaca' : isNear ? '#fed7aa' : '#e5e7eb';
                const textColor = isOverdue ? '#c62828' : isNear ? '#b45309' : '#374151';
                return (
                  <div key={alert.payment_id} style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto',
                    alignItems: 'center', gap: '0.75rem',
                    background: bg, border: `1px solid ${border}`,
                    borderRadius: '8px', padding: '0.6rem 0.9rem',
                  }}>
                    <div>
                      <div style={{ fontSize: '0.78rem', color: '#888' }}>Supplier</div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{alert.supplier_name || '—'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.78rem', color: '#888' }}>Cheque No.</div>
                      <div style={{ fontWeight: 500, fontSize: '0.88rem' }}>{alert.cheque_number || '—'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.78rem', color: '#888' }}>Pending Date</div>
                      <div style={{ fontWeight: 500, fontSize: '0.88rem' }}>{fmtD(alert.pending_cheque_date)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        fontSize: '0.78rem', fontWeight: 700, color: textColor,
                        background: bg, border: `1px solid ${border}`,
                        borderRadius: '6px', padding: '0.2rem 0.5rem',
                      }}>
                        {isOverdue ? 'Overdue' : `${alert.days_remaining}d left`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* Aging Chart + breakdown */}
      <div className="pp-charts-row">
        <motion.div className="proc-card pp-aging-chart"
          initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}>
          <div className="proc-card-header"><h2>Accounts Payable Aging</h2></div>
          <div className="proc-card-body">
            {aging.length === 0 ? (
              <div className="proc-empty" style={{ height: 200 }}>No aging data</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={aging} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={v => `LKR${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={v => [fmt(v), 'Amount']} />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {aging.map((_, i) => <Cell key={i} fill={AGING_COLORS[i] || '#8b3a3a'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        <motion.div className="proc-card pp-aging-breakdown"
          initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.28 }}>
          <div className="proc-card-header"><h2>Aging Summary</h2></div>
          <div className="proc-card-body">
            {aging.map((row, i) => (
              <div key={row.range} className="pp-aging-row">
                <div className="pp-aging-dot" style={{ background: AGING_COLORS[i] }} />
                <span className="pp-aging-range">{row.range}</span>
                <span className="pp-aging-amt" style={{ color: AGING_COLORS[i] }}>{fmt(row.amount)}</span>
              </div>
            ))}
            <div className="pp-aging-total">
              <span>Total Outstanding</span>
              <strong>{fmt(summary.outstanding)}</strong>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Supplier Invoices Table */}
      <motion.div className="proc-card"
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}>
        <div className="proc-card-header">
          <h2>Supplier Invoices</h2>
          <span className="proc-badge-count">{filtered.length} records</span>
        </div>
        <div className="pp-table-toolbar">
          <input id="search" name="search" className="proc-search" style={{ flex: 1 }}
            placeholder="Search by supplier or PO number..."
            value={search} onChange={e => setSearch(e.target.value)} />
          <select id="filterStatus" name="filterStatus" className="proc-select" value={filterStatus} onChange={e => setFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="Unpaid">Unpaid</option>
            <option value="Partial">Partial</option>
            <option value="Paid">Paid</option>
            <option value="Overdue">Overdue</option>
          </select>
        </div>
        <div className="proc-table-wrap">
          <table className="proc-table">
            <thead>
              <tr>
                <th>Supplier</th><th>PO Number</th><th>Due Date</th>
                <th style={{ textAlign: 'right' }}>Invoice</th>
                <th style={{ textAlign: 'right' }}>Paid</th>
                <th style={{ textAlign: 'right' }}>Balance</th>
                <th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pl ? (
                <tr><td colSpan="8" className="proc-empty">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="8" className="proc-empty">No payment records found.</td></tr>
              ) : filtered.map((p, i) => {
                const isOverdue = p.payment_status !== 'Paid' && p.due_date && new Date(p.due_date) < new Date();
                const status = isOverdue && p.payment_status !== 'Paid' ? 'Overdue' : p.payment_status;
                return (
                  <motion.tr key={p.payment_id}
                    initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}>
                    <td className="proc-name-cell">{p.supplier?.supplier_name || '—'}</td>
                    <td><span className="proc-po-number">{p.purchase_order?.po_number || '—'}</span></td>
                    <td style={{ color: isOverdue ? '#c62828' : '#333' }}>{fmtD(p.due_date)}</td>
                    <td style={{ textAlign: 'right' }}><span className="proc-amount">{fmt(p.total_amount)}</span></td>
                    <td style={{ textAlign: 'right', color: '#1d7e42' }}><span className="proc-amount">{fmt(p.paid_amount)}</span></td>
                    <td style={{ textAlign: 'right', color: '#c62828' }}><span className="proc-amount">{fmt(p.balance_amount)}</span></td>
                    <td>
                      <span className={`proc-status-pill ${status?.toLowerCase()}`}
                        style={!STATUS_COLORS[status] ? { background: '#f5f5f5', color: '#666' } : {}}>
                        {status}
                      </span>
                    </td>
                    <td>
                      <div className="proc-action-btns">
                        {status !== 'Paid' && (
                          <motion.button className="proc-icon-btn view" title="Record Payment"
                            whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                            onClick={() => openModal(p)}>
                            <Plus size={13} />
                          </motion.button>
                        )}
                        <motion.button className="proc-icon-btn edit" title="Download Receipt"
                          whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                          onClick={() => downloadMutation.mutate(p.payment_id)}
                          disabled={downloadMutation.isPending}>
                          <Download size={13} />
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Cheque Payments Table */}
      {(() => {
        const chequeRows = payments.filter(p => p.payment_method === 'Cheque');
        return chequeRows.length > 0 ? (
          <motion.div className="proc-card" style={{ marginTop: '1.5rem' }}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}>
            <div className="proc-card-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle size={16} color="#1d7e42" /> Cheque Payments
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <select id="filterChequeStatus" name="filterChequeStatus" className="proc-select" value={filterChequeStatus} onChange={e => setFilterChequeStatus(e.target.value)}>
                  <option value="">All Cheque Status</option>
                  <option value="Pending">Pending</option>
                  <option value="Cleared">Cleared</option>
                  <option value="Bounced">Bounced</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
                <span className="proc-badge-count">{chequeRows.length} cheques</span>
              </div>
            </div>
            <div className="proc-table-wrap">
              <table className="proc-table">
                <thead>
                  <tr>
                    <th>Supplier</th>
                    <th>Cheque No.</th>
                    <th>Bank</th>
                    <th>Cheque Date</th>
                    <th>Clearing Date</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th>Status</th>
                    <th>Update</th>
                  </tr>
                </thead>
                <tbody>
                  {chequeRows.map((p, i) => {
                    const cs = p.cheque_status || 'Pending';
                    const ov = p.is_overdue;
                    const c  = CHEQUE_COLORS[cs] || CHEQUE_COLORS.Cancelled;
                    const displayAmount = (cs === 'Bounced' || cs === 'Cancelled')
                      ? (p.invoice_amount ?? p.balance_amount ?? p.paid_amount)
                      : p.paid_amount;
                    return (
                      <motion.tr key={p.payment_id}
                        initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        style={{ background: ov ? '#fff8f8' : undefined }}>
                        <td className="proc-name-cell">{p.supplier?.supplier_name || '—'}</td>
                        <td style={{ fontWeight: 600, color: c.color }}>{p.cheque_number || '—'}</td>
                        <td>{p.bank_name || '—'}</td>
                        <td>{fmtD(p.cheque_date)}</td>
                        <td style={{ color: ov ? '#c62828' : '#333' }}>
                          {cs === 'Cleared' ? fmtD(p.cleared_date || p.pending_cheque_date) : fmtD(p.pending_cheque_date)}
                          {ov && <AlertCircle size={12} color="#c62828" style={{ marginLeft: 4, verticalAlign: 'middle' }} />}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className="proc-amount" style={{ color: c.color }}>{fmt(displayAmount)}</span>
                        </td>
                        <td>
                          <span style={{
                            fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.6rem',
                            borderRadius: '6px', background: c.bg, color: c.color, border: `1px solid ${c.border}`,
                            whiteSpace: 'nowrap',
                          }}>
                            {ov && cs === 'Pending' ? 'Pending (Overdue)' : cs}
                          </span>
                        </td>
                        <td>
                          {cs === 'Pending' ? (
                            <select id="select_field" name="select_field"
                              className="proc-select"
                              defaultValue=""
                              onChange={e => { if (e.target.value) updateChequeMutation.mutate({ id: p.payment_id, cheque_status: e.target.value }); }}
                            >
                              <option value="" disabled>Change...</option>
                              <option value="Cleared">Cleared</option>
                              <option value="Bounced">Bounced</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                          ) : (cs === 'Bounced' || cs === 'Cancelled') ? (
                            <motion.button
                              className="proc-btn-primary"
                              style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem', background: '#1565c0' }}
                              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                              onClick={() => openModal(p)}
                            >
                              <Plus size={12} style={{ marginRight: 4 }} /> Re-pay
                            </motion.button>
                          ) : <span style={{ color: '#bbb', fontSize: '0.78rem' }}>—</span>}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : null;
      })()}

      {/* Record Payment Modal — rendered in document.body via portal to avoid stacking context issues */}
      {createPortal(<AnimatePresence>
        {showModal && selectedPay && (
          <motion.div className="proc-modal-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}>
            <motion.div className="proc-modal"
              initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }} onClick={e => e.stopPropagation()}>
              <div className="proc-modal-header">
                <h2 style={{ color: '#8b3a3a' }}>
                  {(selectedPay.cheque_status === 'Bounced' || selectedPay.cheque_status === 'Cancelled')
                    ? 'Replacement Payment' : 'Record Payment'}
                </h2>
                <button className="proc-modal-close" onClick={() => setShowModal(false)}><X size={16} /></button>
              </div>
              <div className="proc-modal-body">
                {/* Failed cheque warning banner */}
                {(selectedPay.cheque_status === 'Bounced' || selectedPay.cheque_status === 'Cancelled') && (() => {
                  const cs = selectedPay.cheque_status;
                  const cc = CHEQUE_COLORS[cs];
                  return (
                    <div style={{
                      background: cc.bg, border: `1.5px solid ${cc.border}`,
                      borderRadius: '8px', padding: '0.65rem 0.9rem',
                      marginBottom: '0.9rem', display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
                    }}>
                      <AlertCircle size={16} color={cc.color} style={{ marginTop: 2, flexShrink: 0 }} />
                      <div style={{ fontSize: '0.82rem', color: cc.color, lineHeight: 1.5 }}>
                        <strong>Cheque {cs}:</strong> {selectedPay.cheque_number || 'N/A'}
                        {selectedPay.bank_name && <> &mdash; {selectedPay.bank_name}</>}
                        {selectedPay.cheque_date && <> &mdash; dated {fmtD(selectedPay.cheque_date)}</>}
                        <div style={{ marginTop: '0.2rem', color: '#555' }}>Record a replacement payment below. The full invoice balance has been restored.</div>
                      </div>
                    </div>
                  );
                })()}
                <div className="pp-pay-supplier-info">
                  <div className="pp-pay-supplier-name">{selectedPay.supplier?.supplier_name}</div>
                  <div className="pp-pay-po">{selectedPay.purchase_order?.po_number}</div>
                </div>
                {Number(selectedPay.balance_amount || 0) > 0 && (
                  <div className="pp-pay-balance-row">
                    <span>Balance Due</span>
                    <strong style={{ color: '#c62828' }}>{fmt(selectedPay.balance_amount)}</strong>
                  </div>
                )}

                <div className="proc-field" style={{ marginTop: '1rem' }}>
                  <label>{repayMode ? 'Amount to Repay (LKR)' : 'Amount Paying (LKR)'} {repayMode ? null : <span className="req">*</span>}</label>
                  <input id="payAmount" name="payAmount" type="number" className="proc-input" min="0.01"
                    max={repayMode ? (selectedPay.paid_amount ?? selectedPay.balance_amount) : selectedPay.balance_amount}
                    step="0.01"
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    readOnly={!!repayMode}
                    disabled={!!repayMode}
                  />
                </div>
                <div className="proc-field" style={{ marginTop: '0.75rem' }}>
                  <label>Payment Method</label>
                  <select id="payMethod" name="payMethod" className="proc-input" value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                    {['Bank Transfer', 'Cash', 'Cheque', 'Online'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                {payMethod === 'Cheque' && (
                  <>
                    <div className="proc-field" style={{ marginTop: '0.75rem' }}>
                      <label>Cheque Number</label>
                      <input id="chequeNumber" name="chequeNumber" className="proc-input" value={chequeNumber} onChange={e => setChequeNumber(e.target.value)} placeholder="e.g. CHQ-1001" />
                    </div>
                    <div className="proc-field" style={{ marginTop: '0.75rem' }}>
                      <label>Bank Name</label>
                      <input id="bankName" name="bankName" className="proc-input" value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. Sampath Bank" />
                    </div>
                    <div className="proc-field" style={{ marginTop: '0.75rem' }}>
                      <label>Cheque Date</label>
                      <input id="chequeDate" name="chequeDate" type="date" className="proc-input" value={chequeDate} onChange={e => setChequeDate(e.target.value)} />
                    </div>
                  </>
                )}

                {(selectedPay.cheque_number || selectedPay.bank_name || selectedPay.cheque_date || selectedPay.pending_cheque_date || selectedPay.cheque_status) && (() => {
                  const cs = selectedPay.cheque_status;
                  const cc = CHEQUE_COLORS[cs] || CHEQUE_COLORS.Cancelled;
                  return (
                    <div style={{ marginTop: '1rem' }}>
                      {/* Header row */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Cheque Details
                        </span>
                        {cs && (
                          <span style={{
                            fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem',
                            borderRadius: '20px', background: cc.bg, color: cc.color, border: `1px solid ${cc.border}`,
                          }}>{cs}</span>
                        )}
                      </div>
                      {/* Card */}
                      <div style={{
                        background: cc.bg,
                        border: `1.5px solid ${cc.border}`,
                        borderRadius: '10px',
                        overflow: 'hidden',
                      }}>
                        {/* Top accent bar */}
                        <div style={{ height: '3px', background: cc.color, opacity: 0.6 }} />
                        <div style={{ padding: '0.85rem 1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem 1rem' }}>
                          {selectedPay.cheque_number && (
                            <div>
                              <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: '0.15rem' }}>Cheque Number</div>
                              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: cc.color, letterSpacing: '0.03em' }}>{selectedPay.cheque_number}</div>
                            </div>
                          )}
                          {selectedPay.bank_name && (
                            <div>
                              <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: '0.15rem' }}>Bank</div>
                              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#333' }}>{selectedPay.bank_name}</div>
                            </div>
                          )}
                          {selectedPay.cheque_date && (
                            <div>
                              <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: '0.15rem' }}>Cheque Date</div>
                              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#333' }}>{fmtD(selectedPay.cheque_date)}</div>
                            </div>
                          )}
                          {selectedPay.pending_cheque_date && (
                            <div>
                              <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: '0.15rem' }}>Clearing Date</div>
                              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#333' }}>{fmtD(selectedPay.pending_cheque_date)}</div>
                            </div>
                          )}
                          {selectedPay.pending_days != null && (
                            <div>
                              <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: '0.15rem' }}>Clearing Days</div>
                              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#333' }}>{selectedPay.pending_days} day{selectedPay.pending_days !== 1 ? 's' : ''}</div>
                            </div>
                          )}
                          {selectedPay.paid_date && (
                            <div>
                              <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: '0.15rem' }}>Payment Date</div>
                              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#333' }}>{fmtD(selectedPay.paid_date)}</div>
                            </div>
                          )}
                        </div>
                        {/* Amount footer */}
                        <div style={{
                          borderTop: `1px solid ${cc.border}`,
                          padding: '0.55rem 1rem',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          background: `${cc.color}08`,
                        }}>
                          <span style={{ fontSize: '0.75rem', color: '#888' }}>Cheque Amount</span>
                          <span style={{ fontSize: '0.92rem', fontWeight: 700, color: cc.color }}>{fmt(selectedPay.paid_amount)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="proc-field" style={{ marginTop: '0.75rem' }}>
                  <label>Notes</label>
                  <textarea id="payNote" name="payNote" className="proc-input proc-textarea" rows={2} value={payNote}
                    onChange={e => setPayNote(e.target.value)} placeholder="Reference number, remarks..." />
                </div>
              </div>
              <div className="proc-modal-footer">
                <button className="proc-btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <motion.button className="proc-btn-primary"
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={handleRecord}
                  disabled={!payAmount || recordMutation.isPending}>
                  {recordMutation.isPending ? 'Processing...' : 'Record Payment'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>, document.body)}
    </div>
  );
}
