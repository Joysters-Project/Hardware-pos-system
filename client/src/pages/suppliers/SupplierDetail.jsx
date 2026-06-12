import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Pencil, Building2, Phone, Mail, MapPin, Briefcase, DollarSign, Award, Star, FileText, ClipboardList, Wallet, FilePlus, Download, Send, Trash2, Calendar, ShieldAlert
} from 'lucide-react';
import { 
  useSupplier, 
  useUpdateSupplierRating, 
  useUpdateSupplierStatus,
  useSupplierDocuments,
  useUploadSupplierDocument,
  useDeleteSupplierDocument,
  useSupplierStatement,
  useDownloadStatementPDF,
  useEmailSupplierStatement,
  useDownloadPaymentReceipt,
  useExportPurchaseOrderPDF
} from '../../services/procurementApi';
import '../../styles/Procurement.css';

function StarRating({ value, onChange, disabled }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      {[1,2,3,4,5].map(s => (
        <motion.button 
          key={s} 
          type="button"
          onClick={() => !disabled && onChange(s)}
          whileHover={!disabled ? { scale: 1.3 } : {}} 
          whileTap={!disabled ? { scale: 0.85 } : {}}
          disabled={disabled}
          style={{ 
            background: 'none', border: 'none', cursor: disabled ? 'default' : 'pointer', padding: '2px',
            color: s <= value ? '#f59e0b' : '#d1d5db', fontSize: '24px', lineHeight: 1 
          }}
        >
          ★
        </motion.button>
      ))}
      {value > 0 && <span style={{ fontSize: '13px', color: '#888', marginLeft: '4px' }}>{value}/5</span>}
    </div>
  );
}

export default function SupplierDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Overview');
  
  // Date filter for Statement
  const [statementStart, setStatementStart] = useState('');
  const [statementEnd, setStatementEnd] = useState('');

  // Document Upload State
  const [uploadType, setUploadType] = useState('Contract');
  const [selectedFile, setSelectedFile] = useState(null);

  // Queries
  const { data: supplier, isLoading: supplierLoading, refetch: refetchSupplier } = useSupplier(id);
  const { data: documents = [], isLoading: docsLoading, refetch: refetchDocs } = useSupplierDocuments(id);
  const { data: statementData, isLoading: statementLoading, refetch: refetchStatement } = useSupplierStatement(id, {
    startDate: statementStart || undefined,
    endDate: statementEnd || undefined
  });

  // Mutations
  const ratingMutation = useUpdateSupplierRating();
  const statusMutation = useUpdateSupplierStatus();
  const uploadDocMutation = useUploadSupplierDocument();
  const deleteDocMutation = useDeleteSupplierDocument();
  const emailStatementMutation = useEmailSupplierStatement();
  
  // Downloads
  const downloadStatement = useDownloadStatementPDF();
  const downloadReceipt = useDownloadPaymentReceipt();
  const downloadPO = useExportPurchaseOrderPDF();

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadDocument = (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('document_type', uploadType);

    uploadDocMutation.mutate({ id, formData }, {
      onSuccess: () => {
        setSelectedFile(null);
        // Clear input file
        e.target.reset();
        refetchDocs();
      }
    });
  };

  const handleDeleteDoc = (docId) => {
    if (!window.confirm('Are you sure you want to delete this document? This cannot be undone.')) return;
    deleteDocMutation.mutate({ id, docId }, {
      onSuccess: () => refetchDocs()
    });
  };

  // CSV Excel Export utilities
  const exportCSV = (headers, data, filename) => {
    const csvRows = [
      headers.join(','),
      ...data.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleEmailStatement = () => {
    emailStatementMutation.mutate({
      id,
      params: {
        startDate: statementStart || undefined,
        endDate: statementEnd || undefined
      }
    });
  };

  if (supplierLoading) return (
    <div className="proc-container">
      <div className="proc-loading-wrap">
        {[...Array(4)].map((_, i) => (
          <motion.div 
            key={i} 
            className="proc-skeleton proc-skeleton-card"
            animate={{ opacity: [0.5, 1, 0.5] }} 
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }} 
          />
        ))}
      </div>
    </div>
  );

  if (!supplier) return (
    <div className="proc-container">
      <p className="proc-empty">Supplier not found.</p>
      <button className="proc-btn-primary" onClick={() => navigate('/procurement/suppliers')}>Back to Suppliers</button>
    </div>
  );

  const purchaseOrders = supplier.purchase_orders || [];
  const supplierPayments = supplier.supplier_payments || [];
  
  // Ledger statement entries formatting
  const ledgerEntries = [];
  purchaseOrders.forEach(o => {
    if (o.status !== 'Cancelled') {
      ledgerEntries.push({
        date: o.po_date,
        ref: o.po_number || `PO-${o.po_id}`,
        type: 'Purchase Order',
        debit: Number(o.total_amount),
        credit: 0
      });
    }
  });
  supplierPayments.forEach(p => {
    if (p.payment_status !== 'Cancelled') {
      ledgerEntries.push({
        date: p.paid_date || p.created_at?.split('T')[0] || 'N/A',
        ref: p.invoice_number || `PAY-${p.payment_id}`,
        type: p.paid_amount > 0 ? 'Payment Made' : 'Pending AP',
        debit: 0,
        credit: Number(p.paid_amount)
      });
    }
  });
  ledgerEntries.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Compute running balance
  let runningBalance = 0;
  const computedLedger = ledgerEntries.map(entry => {
    runningBalance += (entry.debit - entry.credit);
    return {
      ...entry,
      balance: runningBalance
    };
  });

  return (
    <div className="proc-container">

      {/* ── HEADER ── */}
      <motion.div 
        className="proc-header cc-header"
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.4 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <motion.button 
            className="proc-back-btn" 
            onClick={() => navigate('/procurement/suppliers')}
            whileHover={{ scale: 1.08 }} 
            whileTap={{ scale: 0.92 }}
          >
            <ArrowLeft size={16} />
          </motion.button>
          <div>
            <h1>{supplier.supplier_name}</h1>
            <p style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
              <span className="proc-code-badge">{supplier.supplier_code}</span>
              <span className={`proc-status-pill ${supplier.status === 'Active' ? 'active' : 'inactive'}`}>
                {supplier.status}
              </span>
              <span className={`badge-rank ${supplier.performance_tier?.toLowerCase()}`}>
                {supplier.performance_tier === 'Gold' ? '🏆 Gold' : supplier.performance_tier === 'Silver' ? '🥈 Silver' : '🥉 Bronze'}
              </span>
            </p>
          </div>
        </div>
        <div className="proc-header-actions">
          <motion.button 
            whileHover={{ scale: 1.04 }} 
            whileTap={{ scale: 0.96 }}
            className={`proc-btn-outline ${supplier.status === 'Active' ? 'warn' : 'success'}`}
            onClick={() => statusMutation.mutate({ id, status: supplier.status === 'Active' ? 'Inactive' : 'Active' }, {
              onSuccess: () => refetchSupplier()
            })}
            disabled={statusMutation.isPending}
          >
            {statusMutation.isPending ? 'Updating...' : supplier.status === 'Active' ? 'Deactivate' : 'Activate'}
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.04 }} 
            whileTap={{ scale: 0.96 }}
            className="proc-btn-primary" 
            onClick={() => navigate(`/procurement/suppliers/edit/${id}`)}
          >
            <Pencil size={14} /> Edit Supplier
          </motion.button>
        </div>
      </motion.div>

      {/* ── WORKSPACE TABS ── */}
      <div className="workspace-tabs-container">
        <div className="proc-tabs">
          {['Overview', 'Purchase History', 'Payment History', 'Performance', 'Documents', 'Statements'].map((tabName) => (
            <button
              key={tabName}
              className={`proc-tab-btn ${activeTab === tabName ? 'active' : ''}`}
              onClick={() => setActiveTab(tabName)}
            >
              {tabName}
            </button>
          ))}
        </div>
      </div>

      {/* ── WORKSPACE CONTENT ── */}
      <div className="workspace-content">
        <AnimatePresence mode="wait">
          
          {/* 1. OVERVIEW TAB */}
          {activeTab === 'Overview' && (
            <motion.div 
              key="Overview"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="proc-detail-grid"
            >
              <div className="proc-detail-main">
                {/* Contact Information */}
                <div className="proc-card">
                  <div className="proc-card-header">
                    <h2>Contact Information</h2>
                  </div>
                  <div className="proc-card-body">
                    <div className="proc-info-grid">
                      <div className="proc-info-row">
                        <span className="proc-info-label"><Briefcase size={14} /> Contact Person</span>
                        <span className="proc-info-value">{supplier.contact_person || supplier.contact || '—'}</span>
                      </div>
                      <div className="proc-info-row">
                        <span className="proc-info-label"><Phone size={14} /> Phone</span>
                        <span className="proc-info-value">{supplier.phone || '—'}</span>
                      </div>
                      <div className="proc-info-row">
                        <span className="proc-info-label"><Mail size={14} /> Email</span>
                        <span className="proc-info-value">{supplier.email || '—'}</span>
                      </div>
                      <div className="proc-info-row">
                        <span className="proc-info-label"><MapPin size={14} /> Address</span>
                        <span className="proc-info-value">{supplier.address || '—'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Supplier Information */}
                <div className="proc-card">
                  <div className="proc-card-header">
                    <h2>Supplier Corporate Information</h2>
                  </div>
                  <div className="proc-card-body">
                    <div className="proc-info-grid">
                      <div className="proc-info-row">
                        <span className="proc-info-label">Company Registration No</span>
                        <span className="proc-info-value">{supplier.company_reg || '—'}</span>
                      </div>
                      <div className="proc-info-row">
                        <span className="proc-info-label">Tax ID (VAT / TIN)</span>
                        <span className="proc-info-value">{supplier.tax_id || '—'}</span>
                      </div>
                      <div className="proc-info-row">
                        <span className="proc-info-label">Payment Terms</span>
                        <span className="proc-info-value">{supplier.payment_terms || '—'}</span>
                      </div>
                      <div className="proc-info-row">
                        <span className="proc-info-label">Credit Limit</span>
                        <span className="proc-info-value">
                          {supplier.credit_limit ? `LKR ${Number(supplier.credit_limit).toLocaleString()}` : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="proc-detail-sidebar">
                {/* Financial Summary */}
                <div className="proc-card">
                  <div className="proc-card-header">
                    <h2>Financial Status</h2>
                  </div>
                  <div className="proc-card-body">
                    <div className="proc-summary-rows">
                      <div className="proc-summary-row">
                        <span className="proc-summary-label">Outstanding Balance</span>
                        <span className="proc-summary-value color-red bold">
                          LKR {Number(supplier.outstanding_balance || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="proc-summary-row">
                        <span className="proc-summary-label">Total Purchases</span>
                        <span className="proc-summary-value">
                          LKR {Number(supplier.total_purchase_volume || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rating Card */}
                <div className="proc-card">
                  <div className="proc-card-header">
                    <h2>Performance Stars</h2>
                  </div>
                  <div className="proc-card-body">
                    <StarRating 
                      value={supplier.performance_rating || 0}
                      onChange={(rating) => ratingMutation.mutate({ id, rating }, {
                        onSuccess: () => refetchSupplier()
                      })}
                      disabled={ratingMutation.isPending}
                    />
                    <div style={{ marginTop: '12px', borderTop: '1px solid #f0e0e0', paddingTop: '8px', fontSize: '11px', color: '#777' }}>
                      Performance Rating: {supplier.performance_score ? `${supplier.performance_score}/100` : 'No audits run yet.'}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* 2. PURCHASE HISTORY TAB */}
          {activeTab === 'Purchase History' && (
            <motion.div 
              key="Purchase"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="proc-card"
            >
              <div className="proc-card-header flex-header">
                <h2>Purchase Orders Ledger</h2>
                <div className="header-actions">
                  <button 
                    className="proc-btn-outline white"
                    onClick={() => {
                      const headers = ['PO Number', 'Date', 'Status', 'Total Amount'];
                      const data = purchaseOrders.map(o => [o.po_number || `#${o.po_id}`, o.po_date, o.status, o.total_amount]);
                      exportCSV(headers, data, `POs_${supplier.supplier_code}.csv`);
                    }}
                  >
                    <Download size={14} /> Export CSV
                  </button>
                </div>
              </div>
              <div className="proc-table-wrap">
                <table className="proc-table">
                  <thead>
                    <tr>
                      <th>PO Number</th>
                      <th>Date</th>
                      <th>Expected Delivery</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Total Amount</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseOrders.length === 0 ? (
                      <tr><td colSpan="6" className="proc-empty">No purchase orders found.</td></tr>
                    ) : (
                      purchaseOrders.map((po) => (
                        <tr key={po.po_id}>
                          <td><span className="proc-po-number">{po.po_number || `#${po.po_id}`}</span></td>
                          <td>{po.po_date}</td>
                          <td>{po.expected_delivery || 'Immediate'}</td>
                          <td>
                            <span className={`proc-status-pill ${po.status?.toLowerCase()}`}>{po.status}</span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                            LKR {Number(po.total_amount).toLocaleString()}
                          </td>
                          <td>
                            <div className="proc-action-btns">
                              <button className="btn-small primary" onClick={() => navigate(`/procurement/orders/${po.po_id}`)}>View Details</button>
                              <button className="btn-small outline" onClick={() => downloadPO.mutate(po.po_id)}>PDF</button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* 3. PAYMENT HISTORY TAB */}
          {activeTab === 'Payment History' && (
            <motion.div 
              key="Payments"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="proc-card"
            >
              <div className="proc-card-header flex-header">
                <h2>Accounts Payable & Payments</h2>
                <div className="header-actions">
                  <button 
                    className="proc-btn-outline white"
                    onClick={() => {
                      const headers = ['Invoice Number', 'Due Date', 'Status', 'Invoice Amount', 'Paid Amount', 'Balance Due'];
                      const data = supplierPayments.map(p => [p.invoice_number, p.due_date, p.payment_status, p.invoice_amount, p.paid_amount, p.balance_amount]);
                      exportCSV(headers, data, `Payments_${supplier.supplier_code}.csv`);
                    }}
                  >
                    <Download size={14} /> Export CSV
                  </button>
                </div>
              </div>
              <div className="proc-table-wrap">
                <table className="proc-table">
                  <thead>
                    <tr>
                      <th>Invoice Number</th>
                      <th>Due Date</th>
                      <th>Paid Date</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Invoice Amount</th>
                      <th style={{ textAlign: 'right' }}>Paid Amount</th>
                      <th style={{ textAlign: 'right' }}>Balance Due</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplierPayments.length === 0 ? (
                      <tr><td colSpan="8" className="proc-empty">No payments logged yet.</td></tr>
                    ) : (
                      supplierPayments.map((p) => (
                        <tr key={p.payment_id}>
                          <td><span className="proc-code-badge">{p.invoice_number}</span></td>
                          <td>{p.due_date}</td>
                          <td>{p.paid_date || 'Unsettled'}</td>
                          <td>
                            <span className={`proc-status-pill ${p.payment_status?.toLowerCase()}`}>{p.payment_status}</span>
                          </td>
                          <td style={{ textAlign: 'right' }}>LKR {Number(p.invoice_amount).toLocaleString()}</td>
                          <td style={{ textAlign: 'right', color: 'green' }}>LKR {Number(p.paid_amount).toLocaleString()}</td>
                          <td style={{ textAlign: 'right', color: '#8b3a3a', fontWeight: 'bold' }}>
                            LKR {Number(p.balance_amount).toLocaleString()}
                          </td>
                          <td>
                            <div className="proc-action-btns">
                              {p.paid_amount > 0 && (
                                <button className="btn-small outline" onClick={() => downloadReceipt.mutate(p.payment_id)}>Receipt PDF</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* 4. PERFORMANCE TAB */}
          {activeTab === 'Performance' && (
            <motion.div 
              key="Performance"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="proc-detail-grid"
            >
              <div className="proc-detail-main">
                {/* Scoring Details */}
                <div className="proc-card">
                  <div className="proc-card-header">
                    <h2>Performance Scores Breakout</h2>
                  </div>
                  <div className="proc-card-body">
                    <div className="performance-stat-grid">
                      <div className="perf-box">
                        <span className="perf-title">On-Time Delivery %</span>
                        <span className="perf-num">{Number(supplier.on_time_delivery_pct || 0).toFixed(1)}%</span>
                        <span className="perf-weight">Weight: 40%</span>
                      </div>
                      <div className="perf-box">
                        <span className="perf-title">Average Delay (Days)</span>
                        <span className="perf-num">{Number(supplier.avg_delay_days || 0).toFixed(1)} d</span>
                        <span className="perf-weight">Weight: 25%</span>
                      </div>
                      <div className="perf-box">
                        <span className="perf-title">Order Success Rate %</span>
                        <span className="perf-num">{Number(supplier.order_success_rate || 0).toFixed(1)}%</span>
                        <span className="perf-weight">Weight: 20%</span>
                      </div>
                      <div className="perf-box">
                        <span className="perf-title">Purchase Volume</span>
                        <span className="perf-num">LKR {Number(supplier.total_purchase_volume || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        <span className="perf-weight">Weight: 10%</span>
                      </div>
                    </div>

                    <div style={{ marginTop: '20px', padding: '16px', background: '#fcf8f8', borderRadius: '10px', border: '1px solid #efe0e0' }}>
                      <h4 style={{ margin: '0 0 8px 0', color: '#8b3a3a' }}>Scoring Criteria Note</h4>
                      <p style={{ margin: 0, fontSize: '13px', color: '#666', lineHeight: 1.4 }}>
                        The final performance score out of 100 is automatically recalculated daily by weighting: On-Time Delivery (40%), Lead Delay Performance (25%), PO Success Rate (20%), Spend Volume (10%), and Stars Rating (5%).
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="proc-detail-sidebar">
                {/* Audit Rating */}
                <div className="proc-card">
                  <div className="proc-card-header">
                    <h2>Audit Summary</h2>
                  </div>
                  <div className="proc-card-body">
                    <div className="health-indicator text-center p-20">
                      <div className="health-score" style={{ fontSize: '3rem', color: '#8b3a3a' }}>
                        {Number(supplier.performance_score || 0).toFixed(0)}
                      </div>
                      <div className="health-title" style={{ fontSize: '15px', fontWeight: 'bold' }}>Overall Audit Score</div>
                      <span className={`badge-rank ${supplier.performance_tier?.toLowerCase()} mt-12`}>
                        {supplier.performance_tier} Supplier
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* 5. DOCUMENTS TAB */}
          {activeTab === 'Documents' && (
            <motion.div 
              key="Documents"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="proc-detail-grid"
            >
              <div className="proc-detail-main">
                {/* Uploaded Documents List */}
                <div className="proc-card">
                  <div className="proc-card-header">
                    <h2>Supplier Dossier & Documents</h2>
                  </div>
                  <div className="proc-table-wrap">
                    <table className="proc-table">
                      <thead>
                        <tr>
                          <th>Document Type</th>
                          <th>File Name</th>
                          <th>Size</th>
                          <th>Uploaded At</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {docsLoading ? (
                          <tr><td colSpan="5" className="proc-empty">Fetching document index...</td></tr>
                        ) : documents.length === 0 ? (
                          <tr><td colSpan="5" className="proc-empty">No documents uploaded yet.</td></tr>
                        ) : (
                          documents.map((doc) => (
                            <tr key={doc.document_id}>
                              <td>
                                <span className={`proc-status-pill ${
                                  doc.document_type === 'Contract' ? 'approved' : doc.document_type === 'Invoice' ? 'pending' : 'active'
                                }`}>
                                  {doc.document_type}
                                </span>
                              </td>
                              <td className="proc-name-cell">{doc.file_name}</td>
                              <td>{doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : 'N/A'}</td>
                              <td>{new Date(doc.uploaded_at).toLocaleString()}</td>
                              <td>
                                <div className="proc-action-btns">
                                  <a 
                                    className="btn-small outline" 
                                    href={`http://localhost:5000${doc.file_path}`} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    download
                                  >
                                    Download
                                  </a>
                                  <button 
                                    className="btn-small danger" 
                                    onClick={() => handleDeleteDoc(doc.document_id)}
                                    disabled={deleteDocMutation.isPending}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="proc-detail-sidebar">
                {/* Document Upload Form */}
                <div className="proc-card">
                  <div className="proc-card-header">
                    <h2>Upload Dossier</h2>
                  </div>
                  <form onSubmit={handleUploadDocument} className="proc-form-body p-20">
                    <div className="proc-field mb-12">
                      <label>Document Type <span className="req">*</span></label>
                      <select 
                        className="proc-input"
                        value={uploadType}
                        onChange={e => setUploadType(e.target.value)}
                        required
                      >
                        <option value="Contract">Contract</option>
                        <option value="Invoice">Invoice</option>
                        <option value="Receipt">Receipt</option>
                        <option value="Statement">Statement</option>
                      </select>
                    </div>
                    <div className="proc-field mb-12">
                      <label>Select File <span className="req">*</span></label>
                      <input 
                        type="file" 
                        className="proc-input" 
                        onChange={handleFileChange}
                        required
                      />
                    </div>
                    <div style={{ marginTop: '16px' }}>
                      <button 
                        type="submit" 
                        className="proc-btn-primary proc-btn-full"
                        disabled={uploadDocMutation.isPending || !selectedFile}
                      >
                        {uploadDocMutation.isPending ? 'Uploading...' : 'Upload File'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </motion.div>
          )}

          {/* 6. STATEMENTS TAB */}
          {activeTab === 'Statements' && (
            <motion.div 
              key="Statements"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="proc-card"
            >
              <div className="proc-card-header flex-header">
                <h2>Account Statement Ledger</h2>
                <div className="header-actions">
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    className="proc-btn-outline white"
                    onClick={() => {
                      const headers = ['Date', 'Ref / Description', 'Purchase (Debit)', 'Payment (Credit)', 'Running Balance'];
                      const data = computedLedger.map(l => [l.date, l.ref, l.debit || '-', l.credit || '-', l.balance]);
                      exportCSV(headers, data, `Statement_SUP-${id}.csv`);
                    }}
                  >
                    <Download size={14} /> Export CSV
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    className="proc-btn-outline white"
                    onClick={() => {
                      // Trigger statement pdf download endpoint
                      const queryStr = statementStart && statementEnd ? `?startDate=${statementStart}&endDate=${statementEnd}` : '';
                      window.open(`http://localhost:5000/api/procurement/suppliers/${id}/statement/pdf${queryStr}`, '_blank');
                    }}
                  >
                    <FileText size={14} /> Download PDF
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    className="proc-btn-outline white warn"
                    onClick={handleEmailStatement}
                    disabled={emailStatementMutation.isPending}
                  >
                    <Send size={14} /> Email statement
                  </motion.button>
                </div>
              </div>

              {/* Date Filters */}
              <div className="proc-toolbar" style={{ borderBottom: '1px solid #f0e0e0', borderRadius: '0' }}>
                <div className="date-filter-row">
                  <div className="date-input-wrap">
                    <Calendar size={14} className="color-grey" />
                    <input 
                      type="date" 
                      className="inline-date" 
                      value={statementStart} 
                      onChange={e => {
                        setStatementStart(e.target.value);
                        refetchStatement();
                      }} 
                    />
                  </div>
                  <span className="color-grey">to</span>
                  <div className="date-input-wrap">
                    <Calendar size={14} className="color-grey" />
                    <input 
                      type="date" 
                      className="inline-date" 
                      value={statementEnd} 
                      onChange={e => {
                        setStatementEnd(e.target.value);
                        refetchStatement();
                      }} 
                    />
                  </div>
                  <button className="proc-btn-outline" onClick={() => {
                    setStatementStart('');
                    setStatementEnd('');
                  }}>Reset</button>
                </div>
              </div>

              <div className="proc-table-wrap">
                <table className="proc-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Ref / Description</th>
                      <th style={{ textAlign: 'right' }}>Purchase (Debit Dr)</th>
                      <th style={{ textAlign: 'right' }}>Payment (Credit Cr)</th>
                      <th style={{ textAlign: 'right' }}>Balance (LKR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statementLoading ? (
                      <tr><td colSpan="5" className="proc-empty">Running balance auditing...</td></tr>
                    ) : computedLedger.length === 0 ? (
                      <tr><td colSpan="5" className="proc-empty">No transaction history.</td></tr>
                    ) : (
                      computedLedger.map((entry, idx) => (
                        <tr key={idx}>
                          <td>{entry.date}</td>
                          <td className="proc-name-cell">{entry.type} ({entry.ref})</td>
                          <td style={{ textAlign: 'right', color: entry.debit > 0 ? '#8b3a3a' : '#777' }}>
                            {entry.debit > 0 ? `LKR ${entry.debit.toFixed(2)}` : '—'}
                          </td>
                          <td style={{ textAlign: 'right', color: entry.credit > 0 ? 'green' : '#777' }}>
                            {entry.credit > 0 ? `LKR ${entry.credit.toFixed(2)}` : '—'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold', color: entry.balance > 0 ? '#8b3a3a' : 'green' }}>
                            LKR {entry.balance.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

    </div>
  );
}
