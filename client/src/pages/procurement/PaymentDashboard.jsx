import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { RefreshCw, Plus, Download, DollarSign, Clock, AlertTriangle, CheckCircle, X } from 'lucide-react';
import {
  usePaymentDashboard, usePayments, useRecordPayment,
  useDownloadPaymentReceipt, useActiveSuppliers,
} from '../../services/procurementApi';
import '../../styles/Procurement.css';
import '../../styles/ProcurementPages.css';

const STATUS_COLORS = {
  Paid: '#1d7e42', Partial: '#1565c0', Unpaid: '#e65100', Overdue: '#c62828',
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
  const [search, setSearch]         = useState('');
  const [filterStatus, setFilter]   = useState('');
  const [showModal, setShowModal]   = useState(false);
  const [selectedPay, setSelected]  = useState(null);
  const [payAmount, setPayAmount]   = useState('');
  const [payMethod, setPayMethod]   = useState('Bank Transfer');
  const [payNote, setPayNote]       = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [chequeDate, setChequeDate] = useState('');
  const [pendingChequeDate, setPendingChequeDate] = useState('');
  const [chequeStatus, setChequeStatus] = useState('Pending');
  const [pendingDays, setPendingDays] = useState(3);

  const { data: dash, isLoading: dl, refetch: rd } = usePaymentDashboard();
  const { data: payments = [], isLoading: pl, refetch: rp } = usePayments({ status: filterStatus || undefined });
  const { data: suppliers = [] } = useActiveSuppliers();
  const recordMutation   = useRecordPayment();
  const downloadMutation = useDownloadPaymentReceipt();

  const fmt  = (n) => `LKR ${Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
  const fmtD = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '—';

  const filtered = useMemo(() =>
    payments.filter(p => {
      const term = search.toLowerCase();
      return !term || (p.supplier?.supplier_name || '').toLowerCase().includes(term) ||
        (p.purchase_order?.po_number || '').toLowerCase().includes(term);
    }), [payments, search]);

  const openModal = (pay) => {
    setSelected(pay);
    setPayAmount(Number(pay.balance_amount || 0).toFixed(2));
    setPayMethod(pay.payment_method || 'Bank Transfer');
    setPayNote(pay.notes || '');
    setChequeNumber(pay.cheque_number || '');
    setBankName(pay.bank_name || '');
    setChequeDate(pay.cheque_date ? pay.cheque_date.split('T')[0] : '');
    setPendingChequeDate(pay.pending_cheque_date ? pay.pending_cheque_date.split('T')[0] : '');
    setChequeStatus(pay.cheque_status || 'Pending');
    setPendingDays(pay.pending_days || 3);
    setShowModal(true);
  };

  const handleRecord = async () => {
    if (!selectedPay || !payAmount) return;

    const payload = {
      payment_id: selectedPay.payment_id,
      paid_amount: parseFloat(payAmount),
      payment_method: payMethod,
      paid_date: new Date().toISOString().split('T')[0],
      notes: payNote,
    };

    if (payMethod === 'Cheque') {
      Object.assign(payload, {
        cheque_number: chequeNumber,
        bank_name: bankName,
        cheque_date: chequeDate,
        pending_cheque_date: pendingChequeDate,
        cheque_status: chequeStatus,
        pending_days: pendingDays,
      });
    }

    await recordMutation.mutateAsync(payload);
    setShowModal(false);
    rp();
  };

  const summary = dash?.summary || {};
  const aging   = dash?.aging   || [];

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

      {/* Payments Table */}
      <motion.div className="proc-card"
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}>
        <div className="proc-card-header">
          <h2>Supplier Invoices</h2>
          <span className="proc-badge-count">{filtered.length} records</span>
        </div>
        <div className="pp-table-toolbar">
          <input className="proc-search" style={{ flex: 1 }}
            placeholder="Search by supplier or PO number..."
            value={search} onChange={e => setSearch(e.target.value)} />
          <select className="proc-select" value={filterStatus} onChange={e => setFilter(e.target.value)}>
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

      {/* Record Payment Modal */}
      <AnimatePresence>
        {showModal && selectedPay && (
          <motion.div className="proc-modal-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}>
            <motion.div className="proc-modal"
              initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }} onClick={e => e.stopPropagation()}>
              <div className="proc-modal-header">
                <h2 style={{ color: '#8b3a3a' }}>Record Payment</h2>
                <button className="proc-modal-close" onClick={() => setShowModal(false)}><X size={16} /></button>
              </div>
              <div className="proc-modal-body">
                <div className="pp-pay-supplier-info">
                  <div className="pp-pay-supplier-name">{selectedPay.supplier?.supplier_name}</div>
                  <div className="pp-pay-po">{selectedPay.purchase_order?.po_number}</div>
                </div>
                <div className="pp-pay-balance-row">
                  <span>Balance Due</span>
                  <strong style={{ color: '#c62828' }}>{fmt(selectedPay.balance_amount)}</strong>
                </div>
                <div className="proc-field" style={{ marginTop: '1rem' }}>
                  <label>Amount Paying (LKR) <span className="req">*</span></label>
                  <input type="number" className="proc-input" min="0.01"
                    max={selectedPay.balance_amount} step="0.01"
                    value={payAmount} onChange={e => setPayAmount(e.target.value)} />
                </div>
                <div className="proc-field" style={{ marginTop: '0.75rem' }}>
                  <label>Payment Method</label>
                  <select className="proc-input" value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                    {['Bank Transfer', 'Cash', 'Cheque', 'Online'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                {payMethod === 'Cheque' && (
                  <>
                    <div className="proc-field" style={{ marginTop: '0.75rem' }}>
                      <label>Cheque Number</label>
                      <input className="proc-input" value={chequeNumber} onChange={e => setChequeNumber(e.target.value)} placeholder="e.g. CHQ-1001" />
                    </div>
                    <div className="proc-field" style={{ marginTop: '0.75rem' }}>
                      <label>Bank Name</label>
                      <input className="proc-input" value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. Sampath Bank" />
                    </div>
                    <div className="proc-field" style={{ marginTop: '0.75rem' }}>
                      <label>Cheque Date</label>
                      <input type="date" className="proc-input" value={chequeDate} onChange={e => setChequeDate(e.target.value)} />
                    </div>
                    <div className="proc-field" style={{ marginTop: '0.75rem' }}>
                      <label>Pending Cheque Date</label>
                      <input type="date" className="proc-input" value={pendingChequeDate} onChange={e => setPendingChequeDate(e.target.value)} />
                    </div>
                    <div className="proc-field" style={{ marginTop: '0.75rem' }}>
                      <label>Cheque Status</label>
                      <select className="proc-input" value={chequeStatus} onChange={e => setChequeStatus(e.target.value)}>
                        {['Pending', 'Cleared', 'Bounced', 'Cancelled'].map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>
                    <div className="proc-field" style={{ marginTop: '0.75rem' }}>
                      <label>Pending Days</label>
                      <input type="number" className="proc-input" min="1" value={pendingDays} onChange={e => setPendingDays(Number(e.target.value) || 3)} />
                    </div>
                  </>
                )}

                {(selectedPay.cheque_number || selectedPay.bank_name || selectedPay.cheque_date || selectedPay.pending_cheque_date || selectedPay.cheque_status) && (
                  <div className="proc-field" style={{ marginTop: '0.75rem' }}>
                    <label>Saved Cheque Details</label>
                    <div style={{
                      background: '#fff8f2',
                      border: '1px solid #f3d9c7',
                      borderRadius: '10px',
                      padding: '0.8rem 0.9rem',
                      lineHeight: 1.6,
                      color: '#6b3f1d'
                    }}>
                      {selectedPay.cheque_number ? <div><strong>Cheque No:</strong> {selectedPay.cheque_number}</div> : null}
                      {selectedPay.bank_name ? <div><strong>Bank:</strong> {selectedPay.bank_name}</div> : null}
                      {selectedPay.cheque_date ? <div><strong>Cheque Date:</strong> {fmtD(selectedPay.cheque_date)}</div> : null}
                      {selectedPay.pending_cheque_date ? <div><strong>Pending Date:</strong> {fmtD(selectedPay.pending_cheque_date)}</div> : null}
                      {selectedPay.cheque_status ? <div><strong>Status:</strong> {selectedPay.cheque_status}</div> : null}
                    </div>
                  </div>
                )}

                <div className="proc-field" style={{ marginTop: '0.75rem' }}>
                  <label>Notes</label>
                  <textarea className="proc-input proc-textarea" rows={2} value={payNote}
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
      </AnimatePresence>
    </div>
  );
}
