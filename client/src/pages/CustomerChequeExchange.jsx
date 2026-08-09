import { useEffect, useState } from 'react';
import { jsPDF } from 'jspdf';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle,
  CreditCard,
  DollarSign,
  Download,
  Edit3,
  Eye,
  FileText,
  PlusCircle,
  RefreshCw,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import '../styles/CustomerChequeExchange.css';
import '../styles/Procurement.css';
import { chequeExchangeApi } from '../services/chequeExchangeApi';

const tabs = ['customers', 'cheques', 'reports'];

const currency = new Intl.NumberFormat('en-LK', {
  style: 'currency',
  currency: 'LKR',
  maximumFractionDigits: 0,
});

const fmtDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB');
};

const getTodayDate = () => new Date().toISOString().split('T')[0];

const getReportTitle = (reportType) => {
  switch (reportType) {
    case 'cleared': return 'Cleared cheques';
    case 'bounced': return 'Bounced cheques';
    case 'cancelled': return 'Cancelled cheques';
    case 'profit_report': return 'Profit report';
    case 'service_charge_report': return 'Service charge report';
    case 'outstanding_repayment': return 'Outstanding repayment';
    case 'monthly_summary': return 'Monthly summary';
    case 'bank_wise': return 'Bank-wise report';
    case 'customer_history': return 'Customer history';
    default: return 'Pending cheques';
  }
};

const statusBadgeClass = (status) => {
  if (status === 'Pending') return 'cce-badge-pending';
  if (status === 'Cleared') return 'cce-badge-cleared';
  if (status === 'Bounced') return 'cce-badge-bounced';
  return 'cce-badge-cancelled';
};

const repaymentBadgeClass = (status) => {
  if (status === 'Pending') return 'cce-badge-pending';
  if (status === 'Paid') return 'cce-badge-cleared';
  return 'cce-badge-not-required';
};

export default function CustomerChequeExchange() {
  const [activeTab, setActiveTab] = useState('customers');
  const [customers, setCustomers] = useState([]);
  const [cheques, setCheques] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [banks, setBanks] = useState([]);
  const [search, setSearch] = useState('');
  const [chequeFilter, setChequeFilter] = useState('all');
  const [repaymentFilter, setRepaymentFilter] = useState('all');
  const [bankFilter, setBankFilter] = useState('all');
  const [customerIdFilter, setCustomerIdFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isCustomerModalOpen, setCustomerModalOpen] = useState(false);
  const [isChequeModalOpen, setChequeModalOpen] = useState(false);
  const [isCustomerDetailOpen, setCustomerDetailOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [editingChequeId, setEditingChequeId] = useState(null);
  const [customerForm, setCustomerForm] = useState({
    customer_name: '',
    nic_number: '',
    phone_number: '',
    address: '',
  });
  const [chequeForm, setChequeForm] = useState({
    customer_id: '',
    cheque_number: '',
    bank_name: '',
    account_holder_name: '',
    cheque_date: '',
    expected_clearance_date: '',
    cheque_amount: '',
    discount_percentage: '5',
    received_date: getTodayDate(),
    remarks: '',
  });
  const [chequeCustomerDisplay, setChequeCustomerDisplay] = useState('');
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [highlightedCustomerIndex, setHighlightedCustomerIndex] = useState(-1);
  const [reportType, setReportType] = useState('pending');
  const [reportRows, setReportRows] = useState([]);
  const [reportMeta, setReportMeta] = useState({ monthly_summary: [], bank_summary: [] });
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dashboardRes, customersRes, chequesRes, banksRes] = await Promise.all([
        chequeExchangeApi.getDashboard(),
        chequeExchangeApi.getCustomers({ search }),
        chequeExchangeApi.getCheques({
          search,
          cheque_status: chequeFilter === 'all' ? undefined : chequeFilter,
          repayment_status: repaymentFilter === 'all' ? undefined : repaymentFilter,
          bank_name: bankFilter === 'all' ? undefined : bankFilter,
          customer_id: customerIdFilter === 'all' ? undefined : customerIdFilter,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        }),
        chequeExchangeApi.getBanks(),
      ]);
      setDashboard(dashboardRes.data?.data || null);
      setCustomers(customersRes.data?.data || []);
      setCheques(chequesRes.data?.data || []);
      setBanks(banksRes.data?.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load cheque exchange data');
    } finally {
      setLoading(false);
    }
  };

  const loadReports = async (type = reportType) => {
    try {
      const response = await chequeExchangeApi.getReports({
        report_type: type,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        bank_name: bankFilter === 'all' ? undefined : bankFilter,
        customer_id: customerIdFilter === 'all' ? undefined : customerIdFilter,
      });
      setReportRows(response.data?.data || []);
      setReportMeta({
        monthly_summary: response.data?.monthly_summary || [],
        bank_summary: response.data?.bank_summary || [],
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load reports');
    }
  };

  const downloadReportPdf = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    const accentBlue = [20, 74, 140];
    const lightBlue = [235, 243, 255];
    const borderBlue = [67, 114, 176];
    let y = 60;

    doc.setFillColor(...accentBlue);
    doc.rect(margin - 10, 36, pageWidth - margin * 2 + 20, 54, 'F');

    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text('Customer Cheque Exchange Report', margin, 68);
    y += 24;

    doc.setFontSize(10);
    doc.setTextColor(220, 232, 247);
    doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, margin, 90);
    y += 20;

    doc.setTextColor(35, 35, 35);
    doc.setFontSize(11);
    doc.text(`Report type: ${getReportTitle(reportType)}`, margin, y);
    y += 16;

    const summaryLines = [
      `Total customers: ${stats.totalCustomers}`,
      `Total cheques: ${stats.totalCheques}`,
      `Pending cheques: ${stats.pendingCheques}`,
      `Cleared cheques: ${stats.clearedCheques}`,
      `Outstanding repayment: ${currency.format(stats.outstandingRepayments)}`,
    ];

    summaryLines.forEach((line) => {
      doc.text(line, margin, y);
      y += 14;
    });

    y += 10;
    doc.setFontSize(11);
    doc.setTextColor(...accentBlue);
    doc.text('Report details', margin, y);
    y += 16;

    const headers = reportType === 'monthly_summary'
      ? ['Month', 'Cheques', 'Amount', 'Service Charge', 'Cash Paid']
      : reportType === 'bank_wise'
        ? ['Bank', 'Cheques', 'Amount', 'Service Charge']
        : ['Cheque ID', 'Customer', 'Cheque Number', 'Bank', 'Amount', 'Status', 'Repayment'];

    const rows = reportType === 'monthly_summary'
      ? (reportMeta.monthly_summary || []).map((row) => [
          row.month || '—',
          row.total_cheques || 0,
          currency.format(row.total_amount || 0),
          currency.format(row.total_service_charge || 0),
          currency.format(row.total_cash_paid || 0),
        ])
      : reportType === 'bank_wise'
        ? (reportMeta.bank_summary || []).map((row) => [
            row.bank_name || '—',
            row.total_cheques || 0,
            currency.format(row.total_amount || 0),
            currency.format(row.total_service_charge || 0),
          ])
        : (reportRows || []).map((row) => [
            row.cheque_id || row.customer_id || '—',
            row.customer?.customer_name || row.customer_name || '—',
            row.cheque_number || '—',
            row.bank_name || '—',
            currency.format(row.cheque_amount || row.total_amount || 0),
            row.cheque_status || '—',
            row.repayment_status || 'Not Required',
          ]);

    const tableWidth = pageWidth - margin * 2;
    const rowHeight = 18;
    const colWidths = headers.length === 7
      ? [60, 90, 90, 70, 70, 60, 60]
      : headers.length === 4
        ? [110, 60, 80, 80]
        : [60, 120, 90, 70, 70, 60, 60];

    const drawTableHeader = () => {
      doc.setFillColor(...lightBlue);
      doc.setDrawColor(...borderBlue);
      doc.setLineWidth(0.5);
      doc.rect(margin, y - 4, tableWidth, rowHeight, 'FD');
      doc.setFontSize(9);
      doc.setTextColor(...accentBlue);
      let x = margin + 6;
      headers.forEach((header, index) => {
        doc.text(String(header), x, y + 10);
        x += colWidths[index];
      });
      y += rowHeight;
    };

    const drawRow = (cells) => {
      if (y + rowHeight > pageHeight - 40) {
        doc.addPage();
        y = 50;
        drawTableHeader();
      }
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      let x = margin + 6;
      cells.forEach((cell, index) => {
        const text = String(cell ?? '—');
        doc.text(text, x, y + 10);
        x += colWidths[index];
      });
      y += rowHeight;
    };

    drawTableHeader();
    rows.forEach((row) => drawRow(row));

    doc.save(`customer-cheque-exchange-${reportType}.pdf`);
    toast.success('Report PDF downloaded');
  };

  useEffect(() => {
    loadData();
  }, [search, chequeFilter, repaymentFilter, bankFilter, customerIdFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (activeTab === 'reports') {
      loadReports(reportType);
    }
  }, [activeTab, reportType]);

  const stats = {
    totalCustomers: dashboard?.total_customers || customers.length,
    totalCheques: dashboard?.total_cheques || cheques.length,
    pendingCheques: dashboard?.pending_cheques || 0,
    clearedCheques: dashboard?.cleared_cheques || 0,
    bouncedCheques: dashboard?.bounced_cheques || 0,
    cancelledCheques: dashboard?.cancelled_cheques || 0,
    totalChequeValue: dashboard?.total_cheque_value || 0,
    totalCashPaid: dashboard?.total_cash_paid || 0,
    totalServiceCharges: dashboard?.total_service_charges || 0,
    totalProfit: dashboard?.total_profit || 0,
    outstandingRepayments: dashboard?.outstanding_repayments || 0,
  };

  const openChequeModal = (cheque = null) => {
    if (cheque) {
      setEditingChequeId(cheque.cheque_id);
      setChequeCustomerDisplay(cheque.customer?.customer_name || '');
      setChequeForm({
        customer_id: String(cheque.customer_id || ''),
        cheque_number: cheque.cheque_number || '',
        bank_name: cheque.bank_name || '',
        account_holder_name: cheque.account_holder_name || '',
        cheque_date: cheque.cheque_date || '',
        expected_clearance_date: cheque.expected_clearance_date || '',
        cheque_amount: cheque.cheque_amount || '',
        discount_percentage: cheque.discount_percentage ?? '5',
        received_date: cheque.received_date || getTodayDate(),
        remarks: cheque.remarks || '',
      });
    } else {
      setEditingChequeId(null);
      setChequeCustomerDisplay('');
      setChequeForm((prev) => ({
        ...prev,
        customer_id: '',
        cheque_number: '',
        bank_name: '',
        account_holder_name: '',
        cheque_date: '',
        expected_clearance_date: '',
        cheque_amount: '',
        discount_percentage: '5',
        received_date: prev.received_date || getTodayDate(),
        remarks: '',
      }));
    }
    setChequeModalOpen(true);
  };

  const isValidCustomerName = (name) => /^[A-Za-z][A-Za-z\s.'-]{1,}$/.test(name.trim());

  const isValidNicNumber = (nic) => {
    const value = nic.trim();
    return /^\d{12}$/.test(value) || /^\d{9}[VvXx]$/.test(value);
  };

  const isValidPhoneNumber = (phone) => {
    const value = phone.replace(/\s+/g, '').trim();
    return /^(?:\+94|0)?[1-9]\d{8,9}$/.test(value);
  };

  const clearCustomerForm = () => {
    setCustomerForm({ customer_name: '', nic_number: '', phone_number: '', address: '' });
    setEditingCustomerId(null);
  };

  const openAddCustomer = () => {
    clearCustomerForm();
    setCustomerModalOpen(true);
  };

  const openCustomerEdit = (customer) => {
    setCustomerForm({
      customer_name: customer.customer_name || '',
      nic_number: customer.nic_number || '',
      phone_number: customer.phone_number || '',
      address: customer.address || '',
    });
    setEditingCustomerId(customer.customer_id);
    setCustomerModalOpen(true);
  };

  const handleCustomerSubmit = async (event) => {
    event.preventDefault();

    const customerName = customerForm.customer_name.trim();
    const nicNumber = customerForm.nic_number.trim();
    const phoneNumber = customerForm.phone_number.trim();
    const address = customerForm.address.trim();

    if (!customerName || !nicNumber || !phoneNumber || !address) {
      toast.error('Customer name, NIC, phone, and address are required');
      return;
    }

    if (!isValidCustomerName(customerName)) {
      toast.error('Customer name must be at least 2 letters and may include spaces, dots, apostrophes, or hyphens');
      return;
    }

    if (!isValidNicNumber(nicNumber)) {
      toast.error('NIC number must be 9 digits + V/X or 12 digits');
      return;
    }

    if (!isValidPhoneNumber(phoneNumber)) {
      toast.error('Phone number must be valid, e.g. 0771234567 or +94771234567');
      return;
    }

    try {
      const payload = {
        ...customerForm,
        customer_name: customerName,
        nic_number: nicNumber,
        phone_number: phoneNumber,
        address,
      };

      if (editingCustomerId) {
        await chequeExchangeApi.updateCustomer(editingCustomerId, payload);
        toast.success('Customer updated successfully');
      } else {
        await chequeExchangeApi.createCustomer(payload);
        toast.success('Customer saved successfully');
      }
      clearCustomerForm();
      setCustomerModalOpen(false);
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to save customer');
    }
  };

  const deleteCustomer = async (customer_id) => {
    const confirmed = window.confirm('Are you sure you want to delete this customer?');
    if (!confirmed) return;

    try {
      await chequeExchangeApi.deleteCustomer(customer_id);
      toast.success('Customer deleted successfully');
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to delete customer');
    }
  };

  const handleChequeSubmit = async (event) => {
    event.preventDefault();
    if (!chequeForm.customer_id || !chequeForm.cheque_number || !chequeForm.bank_name || !chequeForm.account_holder_name || !chequeForm.cheque_date || !chequeForm.expected_clearance_date || !chequeForm.cheque_amount || !chequeForm.received_date) {
      toast.error('Please complete all required cheque fields');
      return;
    }

    const today = getTodayDate();
    if (chequeForm.received_date > today) {
      toast.error('Received date cannot be a future date');
      return;
    }

    try {
      const payload = {
        ...chequeForm,
        cheque_amount: Number(chequeForm.cheque_amount),
        discount_percentage: Number(chequeForm.discount_percentage || 0),
      };

      if (editingChequeId) {
        await chequeExchangeApi.updateCheque(editingChequeId, payload);
        toast.success('Cheque updated successfully');
      } else {
        await chequeExchangeApi.createCheque(payload);
        toast.success('Cheque recorded successfully');
      }

      setChequeForm({
        customer_id: '',
        cheque_number: '',
        bank_name: '',
        account_holder_name: '',
        cheque_date: '',
        expected_clearance_date: '',
        cheque_amount: '',
        discount_percentage: '5',
        received_date: getTodayDate(),
        remarks: '',
      });
      setChequeCustomerDisplay('');
      setEditingChequeId(null);
      setChequeModalOpen(false);
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to record cheque');
    }
  };

  const deleteCheque = async (id) => {
    const confirmed = window.confirm('Delete this cheque record?');
    if (!confirmed) return;

    try {
      await chequeExchangeApi.deleteCheque(id);
      toast.success('Cheque deleted successfully');
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to delete cheque');
    }
  };

  const handleChequeCustomerInputChange = (event) => {
    const val = event.target.value || '';
    setChequeCustomerDisplay(val);
    const needle = val.trim().toLowerCase();
    if (!needle) {
      setFilteredCustomers([]);
      setShowCustomerSuggestions(false);
      setChequeForm((prev) => ({ ...prev, customer_id: '' }));
      setHighlightedCustomerIndex(-1);
      return;
    }

    const matches = customers.filter((c) => c.customer_name?.toLowerCase().includes(needle));
    setFilteredCustomers(matches.slice(0, 10));
    setShowCustomerSuggestions(matches.length > 0);
    setHighlightedCustomerIndex(-1);
    // Do not auto-select even if there's exactly one match.
    setChequeForm((prev) => ({ ...prev, customer_id: '' }));
  };

  const selectCustomer = (customer) => {
    setChequeForm((prev) => ({ ...prev, customer_id: String(customer.customer_id) }));
    setChequeCustomerDisplay(customer.customer_name);
    setShowCustomerSuggestions(false);
    setFilteredCustomers([]);
    setHighlightedCustomerIndex(-1);
  };

  const handleCustomerKeyDown = (event) => {
    if (!showCustomerSuggestions || filteredCustomers.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedCustomerIndex((i) => Math.min(i + 1, filteredCustomers.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedCustomerIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      if (highlightedCustomerIndex >= 0) {
        event.preventDefault();
        const sel = filteredCustomers[highlightedCustomerIndex];
        if (sel) selectCustomer(sel);
      } else {
        // no highlighted suggestion — allow Enter to submit the form
      }
    } else if (event.key === 'Escape') {
      setShowCustomerSuggestions(false);
    }
  };

  const updateChequeStatus = async (id, status) => {
    try {
      await chequeExchangeApi.updateChequeStatus(id, { cheque_status: status });
      toast.success(`Cheque marked as ${status}`);
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update cheque status');
    }
  };

  const depositCheque = async (id) => {
    try {
      await chequeExchangeApi.depositCheque(id);
      toast.success('Cheque marked as deposited');
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to deposit cheque');
    }
  };

  const recordRepayment = async (id) => {
    try {
      await chequeExchangeApi.recordRepayment(id);
      toast.success('Repayment recorded');
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to record repayment');
    }
  };

  const openCustomerDetails = async (customer) => {
    try {
      const response = await chequeExchangeApi.getCustomerById(customer.customer_id);
      setSelectedCustomer(response.data?.data || null);
      setCustomerDetailOpen(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to load customer details');
    }
  };

  const resetFilters = () => {
    setSearch('');
    setChequeFilter('all');
    setRepaymentFilter('all');
    setBankFilter('all');
    setCustomerIdFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  const renderCustomers = () => (
    <div className="cce-view-grid">
      <div className="cce-header">
        <div className="cce-header-left">
          <div className="cce-header-icon"><Users size={20} /></div>
          <div>
            <h1>Customer management</h1>
            <p>Create or reuse existing customer records and keep customer history available.</p>
          </div>
        </div>
        <div className="cce-header-actions">
          <button className="cce-btn-outline" onClick={openAddCustomer}>
            <Users size={15} /> Add Customer
          </button>
          <button className="cce-btn-primary" onClick={openChequeModal}>
            <CreditCard size={15} /> Record cheque
          </button>
        </div>
      </div>

      <div className="cce-filters">
        <div className="cce-search-wrap">
          <Search size={15} className="cce-search-icon" />
          <input id="search" name="search" className="cce-search" placeholder="Search by customer ID, name, NIC or phone" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <button className="cce-refresh-btn" onClick={resetFilters}>
          <RefreshCw size={14} /> Reset
        </button>
      </div>

      <div className="cce-table-wrap">
        <table className="cce-table">
          <thead>
            <tr>
              <th>Customer ID</th>
              <th>Customer Name</th>
              <th>NIC Number</th>
              <th>Phone Number</th>
              <th>Address</th>
              <th>Total Cheques</th>
              <th>Total Cheque Amount</th>
              <th>Outstanding Repayment</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr><td colSpan="9" className="cce-empty">No customers found.</td></tr>
            ) : (
              customers.map((customer) => (
                <tr key={customer.customer_id}>
                  <td>#{customer.customer_id}</td>
                  <td>{customer.customer_name}</td>
                  <td>{customer.nic_number}</td>
                  <td>{customer.phone_number}</td>
                  <td>{customer.address}</td>
                  <td>{customer.total_cheques || 0}</td>
                  <td>{currency.format(customer.total_cheque_amount || 0)}</td>
                  <td>{currency.format(customer.outstanding_repayment || 0)}</td>
                  <td>
                    <div className="cce-action-btns">
                      <button className="cce-icon-btn btn-view" title="View details" onClick={() => openCustomerDetails(customer)}>
                        <Eye size={14} />
                      </button>
                      <button className="cce-icon-btn btn-edit" title="Edit customer" onClick={() => openCustomerEdit(customer)}>
                        <Edit3 size={14} />
                      </button>
                      <button className="cce-icon-btn btn-delete" title="Delete customer" onClick={() => deleteCustomer(customer.customer_id)}>
                        <Trash2 size={14} />
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
  );

  const renderCheques = () => (
    <div className="cce-view-grid">
      <div className="cce-header">
        <div className="cce-header-left">
          <div className="cce-header-icon"><CreditCard size={20} /></div>
          <div>
            <h1>Cheque management</h1>
            <p>Track cheque intake, deposit, clearance and repayment workflow.</p>
          </div>
        </div>
        <div className="cce-header-actions">
          <button className="cce-btn-outline" onClick={openChequeModal}>
            <PlusCircle size={15} /> Record cheque
          </button>
        </div>
      </div>

      <div className="cce-filters">
        <div className="cce-search-wrap">
          <Search size={15} className="cce-search-icon" />
          <input id="search" name="search" className="cce-search" placeholder="Search by customer, cheque, bank or account holder" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <select id="chequeFilter" name="chequeFilter" className="cce-select" value={chequeFilter} onChange={(event) => setChequeFilter(event.target.value)}>
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="cleared">Cleared</option>
          <option value="bounced">Bounced</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select id="repaymentFilter" name="repaymentFilter" className="cce-select" value={repaymentFilter} onChange={(event) => setRepaymentFilter(event.target.value)}>
          <option value="all">All repayment</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="not required">Not Required</option>
        </select>
        <select id="bankFilter" name="bankFilter" className="cce-select" value={bankFilter} onChange={(event) => setBankFilter(event.target.value)}>
          <option value="all">All banks</option>
          {banks.map((bank) => (<option key={bank} value={bank}>{bank}</option>))}
        </select>
        <select id="customerIdFilter" name="customerIdFilter" className="cce-select" value={customerIdFilter} onChange={(event) => setCustomerIdFilter(event.target.value)}>
          <option value="all">All customers</option>
          {customers.map((customer) => (<option key={customer.customer_id} value={customer.customer_id}>{customer.customer_name}</option>))}
        </select>
      </div>

      <div className="cce-filters">
        <label className="cce-field" style={{ minWidth: 180 }}>
          <span style={{ fontSize: '0.72rem', color: '#888' }}>From</span>
          <input id="dateFrom" name="dateFrom" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        </label>
        <label className="cce-field" style={{ minWidth: 180 }}>
          <span style={{ fontSize: '0.72rem', color: '#888' }}>To</span>
          <input id="dateTo" name="dateTo" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        </label>
        <button className="cce-refresh-btn" onClick={resetFilters}>
          <RefreshCw size={14} /> Clear filters
        </button>
      </div>

      <div className="cce-table-wrap">
        <table className="cce-table">
          <thead>
            <tr>
              <th>Cheque ID</th>
              <th>Customer</th>
              <th>Cheque Number</th>
              <th>Bank</th>
              <th>Account Holder</th>
              <th>Cheque Amount</th>
              <th>Discount %</th>
              <th>Service Charge</th>
              <th>Cash Paid</th>
              <th>Received Date</th>
              <th>Cheque Date</th>
              <th>Expected Clearance</th>
              <th>Status</th>
              <th>Repayment</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {cheques.length === 0 ? (
              <tr><td colSpan="15" className="cce-empty">No cheques found.</td></tr>
            ) : (
              cheques.map((cheque) => (
                <tr key={cheque.cheque_id}>
                  <td>#{cheque.cheque_id}</td>
                  <td>{cheque.customer?.customer_name || '—'}</td>
                  <td>{cheque.cheque_number}</td>
                  <td>{cheque.bank_name}</td>
                  <td>{cheque.account_holder_name}</td>
                  <td>{currency.format(cheque.cheque_amount || 0)}</td>
                  <td>{cheque.discount_percentage || 0}%</td>
                  <td>{currency.format(cheque.service_charge || 0)}</td>
                  <td>{currency.format(cheque.amount_paid_to_customer || 0)}</td>
                  <td>{fmtDate(cheque.received_date)}</td>
                  <td>{fmtDate(cheque.cheque_date)}</td>
                  <td>{fmtDate(cheque.expected_clearance_date)}</td>
                  <td><span className={`cce-badge ${statusBadgeClass(cheque.cheque_status)}`}>{cheque.cheque_status}</span></td>
                  <td><span className={`cce-badge ${repaymentBadgeClass(cheque.repayment_status)}`}>{cheque.repayment_status || 'Not Required'}</span></td>
                  <td>
                    <div className="cce-action-btns">
                      {cheque.cheque_status === 'Pending' && (
                        <button className="cce-icon-btn btn-edit" title="Edit cheque" onClick={() => openChequeModal(cheque)}>
                          <Edit3 size={14} />
                        </button>
                      )}
                      <button className="cce-icon-btn btn-delete" title="Delete cheque" onClick={() => deleteCheque(cheque.cheque_id)}>
                        <Trash2 size={14} />
                      </button>
                      <select className="cce-select" value={cheque.cheque_status} onChange={(event) => updateChequeStatus(cheque.cheque_id, event.target.value)}>
                        <option value="Pending">Pending</option>
                        <option value="Cleared">Cleared</option>
                        <option value="Bounced">Bounced</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                      {cheque.cheque_status === 'Pending' && (
                        <button className="cce-btn-outline" onClick={() => depositCheque(cheque.cheque_id)}>Deposit</button>
                      )}
                      {cheque.cheque_status === 'Bounced' && cheque.repayment_status !== 'Paid' && (
                        <button className="cce-btn-primary" onClick={() => recordRepayment(cheque.cheque_id)}>Repayment</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderReports = () => (
    <div className="cce-view-grid">
      <div className="cce-header">
        <div className="cce-header-left">
          <div className="cce-header-icon"><FileText size={20} /></div>
          <div>
            <h1>Reports and summaries</h1>
            <p>Generate the reports you requested for customer activity, cheque performance, and repayments.</p>
          </div>
        </div>
        <div className="cce-header-actions">
          <button className="cce-btn-primary" onClick={() => {
            loadReports(reportType);
            downloadReportPdf();
          }}>
            <Download size={15} /> Download report PDF
          </button>
        </div>
      </div>

      <div className="cce-report-type-grid">
        {[
          ['pending', 'Pending cheques'],
          ['cleared', 'Cleared cheques'],
          ['bounced', 'Bounced cheques'],
          ['cancelled', 'Cancelled cheques'],
          ['profit_report', 'Profit report'],
          ['service_charge_report', 'Service charge report'],
          ['outstanding_repayment', 'Outstanding repayment'],
          ['monthly_summary', 'Monthly summary'],
          ['bank_wise', 'Bank-wise report'],
          ['customer_history', 'Customer history'],
        ].map(([value, label]) => (
          <button key={value} className={`cce-report-type-btn ${reportType === value ? 'active' : ''}`} onClick={() => setReportType(value)}>
            {value === 'profit_report' ? <DollarSign size={15} /> : value === 'outstanding_repayment' ? <AlertTriangle size={15} /> : <FileText size={15} />}
            {label}
          </button>
        ))}
      </div>

      <div className="cce-form-grid">
        <div className="cce-detail-card">
          <div className="cce-detail-card-title"><FileText size={16} /> Report summary</div>
          <div className="cce-view-grid">
            <div className="cce-view-row">
              <span className="cce-view-label">Total customers</span>
              <span className="cce-view-value">{stats.totalCustomers}</span>
            </div>
            <div className="cce-view-row">
              <span className="cce-view-label">Pending cheques</span>
              <span className="cce-view-value">{stats.pendingCheques}</span>
            </div>
            <div className="cce-view-row">
              <span className="cce-view-label">Outstanding repayment</span>
              <span className="cce-view-value">{currency.format(stats.outstandingRepayments)}</span>
            </div>
          </div>
        </div>

        <div className="cce-detail-card">
          <div className="cce-detail-card-title"><CheckCircle size={16} /> Finance snapshot</div>
          <div className="cce-view-grid">
            <div className="cce-view-row">
              <span className="cce-view-label">Cheque value</span>
              <span className="cce-view-value">{currency.format(stats.totalChequeValue)}</span>
            </div>
            <div className="cce-view-row">
              <span className="cce-view-label">Cash paid</span>
              <span className="cce-view-value">{currency.format(stats.totalCashPaid)}</span>
            </div>
            <div className="cce-view-row">
              <span className="cce-view-label">Service charges</span>
              <span className="cce-view-value">{currency.format(stats.totalServiceCharges)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="cce-table-wrap">
        <table className="cce-table">
          <thead>
            <tr>
              {reportType === 'monthly_summary' ? (
                <>
                  <th>Month</th>
                  <th>Cheques</th>
                  <th>Amount</th>
                  <th>Service Charge</th>
                  <th>Cash Paid</th>
                </>
              ) : reportType === 'bank_wise' ? (
                <>
                  <th>Bank</th>
                  <th>Cheques</th>
                  <th>Amount</th>
                  <th>Service Charge</th>
                </>
              ) : (
                <>
                  <th>Cheque ID</th>
                  <th>Customer</th>
                  <th>Cheque Number</th>
                  <th>Bank</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Repayment</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {reportType === 'monthly_summary' ? (
              reportMeta.monthly_summary.length === 0 ? (
                <tr><td colSpan="5" className="cce-empty">No monthly summary available.</td></tr>
              ) : reportMeta.monthly_summary.map((row, index) => (
                <tr key={`${row.month || index}`}>
                  <td>{row.month}</td>
                  <td>{row.total_cheques}</td>
                  <td>{currency.format(row.total_amount || 0)}</td>
                  <td>{currency.format(row.total_service_charge || 0)}</td>
                  <td>{currency.format(row.total_cash_paid || 0)}</td>
                </tr>
              ))
            ) : reportType === 'bank_wise' ? (
              reportMeta.bank_summary.length === 0 ? (
                <tr><td colSpan="4" className="cce-empty">No bank-wise report available.</td></tr>
              ) : reportMeta.bank_summary.map((row, index) => (
                <tr key={`${row.bank_name || index}`}>
                  <td>{row.bank_name}</td>
                  <td>{row.total_cheques}</td>
                  <td>{currency.format(row.total_amount || 0)}</td>
                  <td>{currency.format(row.total_service_charge || 0)}</td>
                </tr>
              ))
            ) : (
              reportRows.length === 0 ? (
                <tr><td colSpan="7" className="cce-empty">No report rows available.</td></tr>
              ) : reportRows.map((row) => (
                <tr key={row.cheque_id || row.customer_id || `${row.customer_name}-${row.cheque_number}`}>
                  <td>#{row.cheque_id || row.customer_id || '—'}</td>
                  <td>{row.customer?.customer_name || row.customer_name || '—'}</td>
                  <td>{row.cheque_number || '—'}</td>
                  <td>{row.bank_name || '—'}</td>
                  <td>{currency.format(row.cheque_amount || row.total_amount || 0)}</td>
                  <td><span className={`cce-badge ${statusBadgeClass(row.cheque_status)}`}>{row.cheque_status || '—'}</span></td>
                  <td><span className={`cce-badge ${repaymentBadgeClass(row.repayment_status)}`}>{row.repayment_status || 'Not Required'}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="proc-container">
      <div className="proc-header">
        <div>
          <h1>Customer cheque exchange</h1>
          <p>Manage customer cheque exchange records, service charges, deposits and repayment tracking for admin and manager users.</p>
          <div className="proc-header-meta">
            <span className="proc-chip proc-chip-accent">Customer exchange</span>
            <span className="proc-chip proc-chip-success">Cheque workflow</span>
          </div>
        </div>
        <div className="proc-header-actions">
          <button className="proc-btn-primary" onClick={openChequeModal}>
            <PlusCircle size={15} /> Record cheque
          </button>
        </div>
      </div>

      <div className="proc-stats">
        <div className="proc-stat-card">
          <div className="proc-stat-value">{stats.totalCustomers}</div>
          <div className="proc-stat-label">Total customers</div>
        </div>
        <div className="proc-stat-card">
          <div className="proc-stat-value">{stats.totalCheques}</div>
          <div className="proc-stat-label">Total cheques</div>
        </div>
        <div className="proc-stat-card">
          <div className="proc-stat-value">{stats.pendingCheques}</div>
          <div className="proc-stat-label">Pending cheques</div>
        </div>
        <div className="proc-stat-card">
          <div className="proc-stat-value">{stats.clearedCheques}</div>
          <div className="proc-stat-label">Cleared cheques</div>
        </div>
        <div className="proc-stat-card">
          <div className="proc-stat-value">{currency.format(stats.totalChequeValue)}</div>
          <div className="proc-stat-label">Total cheque value</div>
        </div>
      </div>

      <div className="proc-value-banner">
        <span>Service charges earned: {currency.format(stats.totalServiceCharges)} · Profit from cleared cheques: {currency.format(stats.totalProfit)}</span>
        <strong>Outstanding repayment: {currency.format(stats.outstandingRepayments)}</strong>
      </div>

      <div className="cce-tabs">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`cce-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'customers' && 'Customer management'}
            {tab === 'cheques' && 'Cheque management'}
            {tab === 'reports' && 'Reports'}
          </button>
        ))}
      </div>

      {loading && <div className="cce-loading-banner">Loading cheque exchange data…</div>}
      {activeTab === 'customers' && renderCustomers()}
      {activeTab === 'cheques' && renderCheques()}
      {activeTab === 'reports' && renderReports()}

      {isCustomerModalOpen && (
        <div className="cce-overlay" onClick={() => setCustomerModalOpen(false)}>
          <div className="cce-modal cce-modal-lg" onClick={(event) => event.stopPropagation()}>
            <div className="cce-modal-header">
              <h2>Add customer</h2>
              <button className="cce-modal-close" onClick={() => setCustomerModalOpen(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
            <form className="cce-modal-body" onSubmit={handleCustomerSubmit}>
              <div className="cce-form-grid">
                <div className="cce-field">
                  <label>Customer name</label>
                  <input id="customer_name" name="customer_name" value={customerForm.customer_name} onChange={(event) => setCustomerForm((prev) => ({ ...prev, customer_name: event.target.value }))} placeholder="e.g. Ayesha Jayasekara" required />
                </div>
                <div className="cce-field">
                  <label>NIC number</label>
                  <input id="nic_number" name="nic_number" value={customerForm.nic_number} onChange={(event) => setCustomerForm((prev) => ({ ...prev, nic_number: event.target.value }))} placeholder="200012345678" required />
                </div>
                <div className="cce-field">
                  <label>Phone number</label>
                  <input id="phone_number" name="phone_number" value={customerForm.phone_number} onChange={(event) => setCustomerForm((prev) => ({ ...prev, phone_number: event.target.value }))} placeholder="077 000 0000" required />
                </div>
                <div className="cce-field cce-field-full">
                  <label>Address</label>
                  <textarea id="address" name="address" value={customerForm.address} onChange={(event) => setCustomerForm((prev) => ({ ...prev, address: event.target.value }))} placeholder="Customer address" required />
                </div>
              </div>
              <div className="cce-modal-footer">
                <button className="cce-btn-cancel" type="button" onClick={() => setCustomerModalOpen(false)}>Cancel</button>
                <button className="cce-btn-primary" type="submit">Save customer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isChequeModalOpen && (
        <div className="cce-overlay" onClick={() => setChequeModalOpen(false)}>
          <div className="cce-modal cce-modal-lg" onClick={(event) => event.stopPropagation()}>
            <div className="cce-modal-header">
              <h2>{editingChequeId ? 'Edit cheque' : 'Record cheque'}</h2>
              <button className="cce-modal-close" onClick={() => {
                setChequeModalOpen(false);
                setEditingChequeId(null);
                setChequeCustomerDisplay('');
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
            <form className="cce-modal-body" onSubmit={handleChequeSubmit}>
              <div className="cce-form-grid">
                <div className="cce-field">
                  <label>Customer</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      value={chequeCustomerDisplay}
                      onChange={handleChequeCustomerInputChange}
                      onKeyDown={handleCustomerKeyDown}
                      onFocus={() => { if (filteredCustomers.length > 0) setShowCustomerSuggestions(true); }}
                      onBlur={() => setTimeout(() => setShowCustomerSuggestions(false), 150)}
                      placeholder="Type customer name and select"
                      required
                    />
                    {showCustomerSuggestions && filteredCustomers.length > 0 && (
                      <ul style={{ position: 'absolute', zIndex: 1000, left: 0, right: 0, background: '#fff', border: '1px solid #ddd', maxHeight: 400, overflowY: 'auto', margin: 0, padding: 0, listStyle: 'none', boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }}>
                        {filteredCustomers.map((customer, idx) => (
                          <li
                            key={customer.customer_id}
                            title={customer.customer_name}
                            onMouseDown={(e) => { e.preventDefault(); selectCustomer(customer); }}
                            onMouseEnter={() => setHighlightedCustomerIndex(idx)}
                            style={{ padding: '8px 10px', cursor: 'pointer', background: idx === highlightedCustomerIndex ? '#eef' : '#fff', whiteSpace: 'normal', overflow: 'visible', textOverflow: 'clip' }}
                          >
                            {customer.customer_name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                <div className="cce-field">
                  <label>Cheque number</label>
                  <input id="cheque_number" name="cheque_number" value={chequeForm.cheque_number} onChange={(event) => setChequeForm((prev) => ({ ...prev, cheque_number: event.target.value }))} placeholder="CHQ-1001" required />
                </div>
                <div className="cce-field">
                  <label>Bank name</label>
                  <input id="bank_name" name="bank_name" value={chequeForm.bank_name} onChange={(event) => setChequeForm((prev) => ({ ...prev, bank_name: event.target.value }))} placeholder="Sampath Bank" required />
                </div>
                <div className="cce-field">
                  <label>Account holder name</label>
                  <input id="account_holder_name" name="account_holder_name" value={chequeForm.account_holder_name} onChange={(event) => setChequeForm((prev) => ({ ...prev, account_holder_name: event.target.value }))} placeholder="John Doe" required />
                </div>
                <div className="cce-field">
                  <label>Cheque amount</label>
                  <input id="cheque_amount" name="cheque_amount" type="number" value={chequeForm.cheque_amount} onChange={(event) => setChequeForm((prev) => ({ ...prev, cheque_amount: event.target.value }))} placeholder="100000" required />
                </div>
                <div className="cce-field">
                  <label>Discount %</label>
                  <input id="discount_percentage" name="discount_percentage" type="number" value={chequeForm.discount_percentage} onChange={(event) => setChequeForm((prev) => ({ ...prev, discount_percentage: event.target.value }))} placeholder="5" />
                </div>
                <div className="cce-field">
                  <label>Cheque date</label>
                  <input id="cheque_date" name="cheque_date" type="date" value={chequeForm.cheque_date} onChange={(event) => setChequeForm((prev) => ({ ...prev, cheque_date: event.target.value }))} required />
                </div>
                <div className="cce-field">
                  <label>Expected clearance date</label>
                  <input id="expected_clearance_date" name="expected_clearance_date" type="date" value={chequeForm.expected_clearance_date} onChange={(event) => setChequeForm((prev) => ({ ...prev, expected_clearance_date: event.target.value }))} required />
                </div>
                <div className="cce-field">
                  <label>Received date</label>
                  <input
                    type="date"
                    value={chequeForm.received_date}
                    max={getTodayDate()}
                    onChange={(event) => setChequeForm((prev) => ({ ...prev, received_date: event.target.value }))}
                    required
                  />
                </div>
                <div className="cce-field cce-field-full">
                  <label>Remarks</label>
                  <textarea id="remarks" name="remarks" value={chequeForm.remarks} onChange={(event) => setChequeForm((prev) => ({ ...prev, remarks: event.target.value }))} placeholder="Optional remarks" />
                </div>
              </div>
              <div className="cce-modal-footer">
                <button className="cce-btn-cancel" type="button" onClick={() => {
                  setChequeModalOpen(false);
                  setEditingChequeId(null);
                  setChequeCustomerDisplay('');
                }}>Cancel</button>
                <button className="cce-btn-primary" type="submit">{editingChequeId ? 'Update cheque' : 'Save cheque'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCustomerDetailOpen && selectedCustomer && (
        <div className="cce-overlay" onClick={() => setCustomerDetailOpen(false)}>
          <div className="cce-modal cce-modal-lg" onClick={(event) => event.stopPropagation()}>
            <div className="cce-modal-header">
              <h2>Customer details</h2>
              <button className="cce-modal-close" onClick={() => setCustomerDetailOpen(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
            <div className="cce-modal-body">
              <div className="cce-form-grid">
                <div className="cce-detail-card cce-field-full">
                  <div className="cce-detail-card-title"><Users size={16} /> Customer information</div>
                  <div className="cce-view-grid">
                    <div className="cce-view-row"><span className="cce-view-label">Customer ID</span><span className="cce-view-value">#{selectedCustomer.customer_id}</span></div>
                    <div className="cce-view-row"><span className="cce-view-label">Name</span><span className="cce-view-value">{selectedCustomer.customer_name}</span></div>
                    <div className="cce-view-row"><span className="cce-view-label">NIC</span><span className="cce-view-value">{selectedCustomer.nic_number}</span></div>
                    <div className="cce-view-row"><span className="cce-view-label">Phone</span><span className="cce-view-value">{selectedCustomer.phone_number}</span></div>
                    <div className="cce-view-row"><span className="cce-view-label">Address</span><span className="cce-view-value">{selectedCustomer.address}</span></div>
                  </div>
                </div>
                <div className="cce-detail-card cce-field-full">
                  <div className="cce-detail-card-title"><DollarSign size={16} /> Financial summary</div>
                  <div className="cce-view-grid">
                    <div className="cce-view-row"><span className="cce-view-label">Total cheques</span><span className="cce-view-value">{selectedCustomer.summary?.total_cheques || 0}</span></div>
                    <div className="cce-view-row"><span className="cce-view-label">Cheque value</span><span className="cce-view-value">{currency.format(selectedCustomer.summary?.total_cheque_value || 0)}</span></div>
                    <div className="cce-view-row"><span className="cce-view-label">Cash paid</span><span className="cce-view-value">{currency.format(selectedCustomer.summary?.total_cash_paid || 0)}</span></div>
                    <div className="cce-view-row"><span className="cce-view-label">Service charges</span><span className="cce-view-value">{currency.format(selectedCustomer.summary?.total_service_charges || 0)}</span></div>
                    <div className="cce-view-row"><span className="cce-view-label">Outstanding repayment</span><span className="cce-view-value">{currency.format(selectedCustomer.summary?.outstanding_repayment || 0)}</span></div>
                  </div>
                </div>
                <div className="cce-detail-card cce-field-full">
                  <div className="cce-detail-card-title"><FileText size={16} /> Cheque history</div>
                  <div className="cce-table-wrap">
                    <table className="cce-table">
                      <thead>
                        <tr>
                          <th>Cheque</th>
                          <th>Bank</th>
                          <th>Amount</th>
                          <th>Status</th>
                          <th>Repayment</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedCustomer.cheques || []).length === 0 ? (
                          <tr><td colSpan="5" className="cce-empty">No cheque history found.</td></tr>
                        ) : (
                          selectedCustomer.cheques.map((item) => (
                            <tr key={item.cheque_id}>
                              <td>{item.cheque_number}</td>
                              <td>{item.bank_name}</td>
                              <td>{currency.format(item.cheque_amount || 0)}</td>
                              <td><span className={`cce-badge ${statusBadgeClass(item.cheque_status)}`}>{item.cheque_status}</span></td>
                              <td><span className={`cce-badge ${repaymentBadgeClass(item.repayment_status)}`}>{item.repayment_status || 'Not Required'}</span></td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
