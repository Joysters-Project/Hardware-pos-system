import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Pencil, Building2, Phone, Mail, MapPin, Briefcase, DollarSign, FileText, ClipboardList, Wallet, FilePlus, Download, Trash2, UploadCloud, X
} from 'lucide-react';
import { 
  useSupplier, 
  useUpdateSupplierStatus,
  useSupplierDocuments,
  useUploadSupplierDocument,
  useDeleteSupplierDocument,
  useDownloadPaymentReceipt,
  useExportPurchaseOrderPDF
} from '../../services/procurementApi';
import { formatPurchaseOrderNumber } from '../../utils/purchaseOrderNumber';
import '../../styles/Procurement.css';

export default function SupplierDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Overview');

  // Document Upload State
  const [uploadType, setUploadType] = useState('Contract');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Queries
  const { data: supplier, isLoading: supplierLoading } = useSupplier(id);
  const { data: documents = [], isLoading: docsLoading } = useSupplierDocuments(id);

  // Mutations
  const statusMutation = useUpdateSupplierStatus();
  const uploadDocMutation = useUploadSupplierDocument();
  const deleteDocMutation = useDeleteSupplierDocument();
  
  // Downloads
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
        if (fileInputRef.current) fileInputRef.current.value = '';
        e.target.reset();
      }
    });
  };

  const handleDeleteDoc = (docId) => {
    if (!window.confirm('Are you sure you want to delete this document? This cannot be undone.')) return;
    deleteDocMutation.mutate({ id, docId });
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
            </p>
          </div>
        </div>
        <div className="proc-header-actions">
          <motion.button 
            whileHover={{ scale: 1.04 }} 
            whileTap={{ scale: 0.96 }}
            className={`proc-btn-outline ${supplier.status === 'Active' ? 'warn' : 'success'}`}
            onClick={() => statusMutation.mutate({ id, status: supplier.status === 'Active' ? 'Inactive' : 'Active' })}
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
          {['Overview', 'Purchase History', 'Payment History', 'Documents'].map((tabName) => (
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
                      const data = purchaseOrders.map(o => [formatPurchaseOrderNumber(o.po_number, o.po_id), o.po_date, o.status, o.total_amount]);
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
                          <td><span className="proc-po-number">{formatPurchaseOrderNumber(po.po_number, po.po_id)}</span></td>
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

          {/* 4. DOCUMENTS TAB */}
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
                                    href={`${import.meta.env.VITE_API_URL}${doc.file_path}`} 
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
                      <select id="uploadType" name="uploadType" 
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
                        ref={fileInputRef}
                        id="file_field" 
                        name="file_field" 
                        type="file" 
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                      />
                      {!selectedFile ? (
                        <div 
                          className={`proc-file-dropzone ${isDragging ? 'drag-active' : ''}`}
                          onClick={() => fileInputRef.current?.click()}
                          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDragging(false);
                            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                              setSelectedFile(e.dataTransfer.files[0]);
                            }
                          }}
                        >
                          <div className="proc-file-dropzone-icon">
                            <UploadCloud size={20} />
                          </div>
                          <span className="proc-file-dropzone-text">Click or drag file here</span>
                          <span className="proc-file-dropzone-sub">PDF, Word, Excel, or images up to 10MB</span>
                        </div>
                      ) : (
                        <div className="proc-file-selected">
                          <div className="proc-file-selected-info">
                            <div className="proc-file-selected-icon">
                              <FileText size={18} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div className="proc-file-selected-name" title={selectedFile.name}>
                                {selectedFile.name}
                              </div>
                              <div className="proc-file-selected-size">
                                {(selectedFile.size / 1024).toFixed(1)} KB
                              </div>
                            </div>
                          </div>
                          <button 
                            type="button" 
                            className="proc-file-clear-btn"
                            title="Remove file"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFile(null);
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      )}
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

        </AnimatePresence>
      </div>

    </div>
  );
}
