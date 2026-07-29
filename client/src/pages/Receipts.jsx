import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import DashboardLayout from '../components/DashboardLayout';
import '../styles/Receipts.css';

const Receipts = () => {
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [billSearch, setBillSearch] = useState('');
  const [billDate, setBillDate] = useState('');
  const [paidPage, setPaidPage] = useState(1);
  const [partialPage, setPartialPage] = useState(1);
  const [allPage, setAllPage] = useState(1);
  const [activeView, setActiveView] = useState(null); // null => show all bills by default
  const pageSize = 8;

  const customerMap = useMemo(() => {
    return customers.reduce((map, customer) => {
      map[customer.customer_id] = customer;
      return map;
    }, {});
  }, [customers]);

  useEffect(() => {
    let active = true;

    const loadReceipts = async () => {
      try {
        setLoading(true);
        setError('');

        const [billsResponse, customersResponse] = await Promise.all([
          api.get('/bills'),
          api.get('/customers')
        ]);

        if (!active) return;

        setReceipts(Array.isArray(billsResponse.data) ? billsResponse.data : []);
        setCustomers(Array.isArray(customersResponse.data) ? customersResponse.data : []);
      } catch (loadError) {
        console.error('Failed to load receipts', loadError);
        if (active) {
          setError('Unable to load receipt history right now.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadReceipts();

    return () => {
      active = false;
    };
  }, []);

  const formatDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatMoney = (value) => {
    const amount = Number(value ?? 0);
    return `Rs ${amount.toFixed(2)}`;
  };

  const getDateKey = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getCustomerName = (bill) => {
    const customer = customerMap[bill.customer_id];
    return customer?.customer_name || 'Walk-in Customer';
  };

  const getCustomerPhone = (bill) => {
    const customer = customerMap[bill.customer_id];
    return customer?.phone_no || '';
  };

  const matchesFilters = (bill) => {
    const nameQuery = customerSearch.trim().toLowerCase();
    const billQuery = billSearch.trim().toLowerCase();
    const selectedDate = billDate.trim();
    const customerName = getCustomerName(bill).toLowerCase();
    const customerPhone = getCustomerPhone(bill).toLowerCase();
    const billNo = String(bill.bill_no || '').toLowerCase();
    const dateKey = getDateKey(bill.bill_date);

    const nameMatch = !nameQuery || customerName.includes(nameQuery) || customerPhone.includes(nameQuery) || billNo.includes(nameQuery);
    const billMatch = !billQuery || billNo.includes(billQuery);
    const dateMatch = !selectedDate || dateKey === selectedDate;

    return nameMatch && billMatch && dateMatch;
  };

  const sortedReceipts = useMemo(() => {
    return [...receipts].sort(
      (left, right) => new Date(right.bill_date).getTime() - new Date(left.bill_date).getTime()
    );
  }, [receipts]);

  const filteredReceipts = useMemo(() => {
    return sortedReceipts.filter((bill) => matchesFilters(bill));
  }, [sortedReceipts, customerSearch, billSearch, billDate, customerMap]);

  const fullyPaidReceipts = useMemo(() => {
    return sortedReceipts.filter((bill) => String(bill.status || '').toUpperCase() === 'PAID' && matchesFilters(bill));
  }, [sortedReceipts, customerSearch, billSearch, billDate, customerMap]);

  const partialPaidReceipts = useMemo(() => {
    return sortedReceipts.filter((bill) => String(bill.status || '').toUpperCase() === 'PARTIAL' && matchesFilters(bill));
  }, [sortedReceipts, customerSearch, billSearch, billDate, customerMap]);

  useEffect(() => {
    setPaidPage(1);
    setPartialPage(1);
    setAllPage(1);
  }, [customerSearch, billSearch, billDate]);

  useEffect(() => {
    if (activeView === 'paid' && fullyPaidReceipts.length === 0) {
      setActiveView(null);
    }
    if (activeView === 'partial' && partialPaidReceipts.length === 0) {
      setActiveView(null);
    }
  }, [activeView, fullyPaidReceipts.length, partialPaidReceipts.length]);

  const toggleView = (viewName) => {
    setActiveView((currentView) => (currentView === viewName ? null : viewName));
  };

  const getPageWindow = (items, page) => {
    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
    const safePage = Math.min(Math.max(page, 1), totalPages);
    const startIndex = (safePage - 1) * pageSize;
    const visibleItems = items.slice(startIndex, startIndex + pageSize);

    return {
      totalPages,
      safePage,
      startIndex,
      endIndex: startIndex + visibleItems.length,
      visibleItems
    };
  };

  const renderPager = (page, totalPages, setPage) => {
    if (totalPages <= 1) return null;

    const pageNumbers = [];
    for (let index = 1; index <= totalPages; index += 1) {
      if (index === 1 || index === totalPages || Math.abs(index - page) <= 1) {
        pageNumbers.push(index);
      } else if (pageNumbers[pageNumbers.length - 1] !== '...') {
        pageNumbers.push('...');
      }
    }

    return (
      <div className="receipt-pager">
        <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>
          Prev
        </button>
        {pageNumbers.map((value, index) =>
          value === '...' ? (
            <span key={`gap-${index}`} className="pager-gap">...</span>
          ) : (
            <button
              key={value}
              type="button"
              className={value === page ? 'active' : ''}
              onClick={() => setPage(value)}
            >
              {value}
            </button>
          )
        )}
        <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages}>
          Next
        </button>
      </div>
    );
  };

  const renderTable = (title, rows, emptyMessage, tone, page, setPage) => {
    const window = getPageWindow(rows, page);
    return (
      <section className="receipt-card">
        <div className="receipt-card-head">
          <div>
            <h2>{title}</h2>
            <p>
              {rows.length} bill{rows.length === 1 ? '' : 's'}
              {rows.length > 0 ? ` · showing ${window.startIndex + 1}-${window.endIndex}` : ''}
            </p>
          </div>
          <span className={`receipt-badge ${tone}`}>{title}</span>
        </div>

        {rows.length === 0 ? (
          <div className="receipt-empty">{emptyMessage}</div>
        ) : (
          <>
            <div className="receipt-table-wrap">
              <table className="receipt-table">
                <thead>
                  <tr>
                    <th>Bill No</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Phone</th>
                    <th className="right">Total</th>
                    <th className="right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {window.visibleItems.map((bill) => (
                    <tr key={bill.bill_no || bill.id}>
                      <td>{bill.bill_no}</td>
                      <td>{formatDate(bill.bill_date)}</td>
                      <td>{getCustomerName(bill)}</td>
                      <td>{getCustomerPhone(bill)}</td>
                      <td className="right">{formatMoney(bill.total_amount)}</td>
                      <td className="right">{formatMoney(bill.balance_due)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="receipt-card-footer">
              <span>
                Page {window.safePage} of {window.totalPages}
              </span>
              {renderPager(window.safePage, window.totalPages, setPage)}
            </div>
          </>
        )}
      </section>
    );
  };

  return (
    <DashboardLayout active="receipts">
      <div className="receipts-shell">
        <header className="receipts-hero" style={{ marginTop: '8px' }}>
          <div>
            <h1 style={{ margin: '0 0 8px', fontSize: '26px', fontWeight: '800', color: '#2b1515' }}>Receipt History</h1>
            <p>Search by customer name, bill number, or date. Results are paginated so large histories stay fast to browse.</p>
          </div>
          <div className="receipts-stats">
            <button
              type="button"
              className={`receipt-stat-box ${activeView === 'paid' ? 'active' : ''}`}
              onClick={() => toggleView('paid')}
            >
              <span>Fully paid</span>
              <strong>{fullyPaidReceipts.length}</strong>
              
            </button>
            <button
              type="button"
              className={`receipt-stat-box ${activeView === 'partial' ? 'active' : ''}`}
              onClick={() => toggleView('partial')}
            >
               <span>Partial paid</span>
              <strong>{partialPaidReceipts.length}</strong>
             
            </button>
            <button
              type="button"
              className={`receipt-stat-box total-box ${activeView === 'all' ? 'active' : ''}`}
              onClick={() => setActiveView((cur) => (cur === 'all' ? null : 'all'))}
            >
              
              <span>Total bills</span>
              <strong>{filteredReceipts.length}</strong>
            </button>
          </div>
        </header>

        <section className="receipt-filters">
          <label>
            <span>Customer / Phone</span>
            <input
              type="text"
              placeholder="Search customer name or phone"
              value={customerSearch}
              onChange={(event) => setCustomerSearch(event.target.value)}
            />
          </label>
          <label>
            <span>Bill number</span>
            <input
              type="text"
              placeholder="Search bill no."
              value={billSearch}
              onChange={(event) => setBillSearch(event.target.value)}
            />
          </label>
          <label>
            <span>Date</span>
            <input
              type="date"
              value={billDate}
              onChange={(event) => setBillDate(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="reset-btn"
            onClick={() => {
              setCustomerSearch('');
              setBillSearch('');
              setBillDate('');
            }}
          >
            Reset filters
          </button>
        </section>

        {loading ? (
          <div className="receipt-status">Loading receipt history...</div>
        ) : error ? (
          <div className="receipt-status error">{error}</div>
        ) : (
          <div className="receipts-grid">
            {activeView === 'paid'
              ? renderTable(
                  'Fully Paid Bills',
                  fullyPaidReceipts,
                  'No fully paid bills match the current filters.',
                  'paid',
                  paidPage,
                  setPaidPage
                ) : activeView === 'partial'
              ? renderTable(
                  'Partial Paid Bills',
                  partialPaidReceipts,
                  'No partially paid bills match the current filters.',
                  'partial',
                  partialPage,
                  setPartialPage
                )
              : renderTable(
                  'All Bills',
                  filteredReceipts,
                  'No bills match the current filters.',
                  'all',
                  allPage,
                  setAllPage
                )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Receipts;
