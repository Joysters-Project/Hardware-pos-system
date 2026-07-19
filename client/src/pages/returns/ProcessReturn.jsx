import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/axios';
import { validateSriLankanPhone, filterSriLankanPhoneInput } from '../../utils/phoneValidation';
import toast from 'react-hot-toast';
import '../../styles/Returns.css';

const DESTINATIONS = [
  { value: 'STOCK',        label: 'Back to Stock'    },
  { value: 'REPAIR',       label: 'Send to Repair'   },
  { value: 'SUPPLIER',     label: 'Send to Supplier' },
  { value: 'DAMAGED_STOCK',label: 'Damaged Stock'    },
];

const REASONS = [
  'Damaged',
  'Defective',
  'Wrong Item',
  'Customer Changed Mind',
  'Expired',
  'Other',
];

export default function ProcessReturn() {
  const navigate = useNavigate();
  const [searchMode,       setSearchMode]       = useState('bill_no');
  const [searchValue,      setSearchValue]      = useState('');
  const [searchResults,    setSearchResults]    = useState([]);
  const [selectedBill,     setSelectedBill]     = useState(null);
  const [returnItems,      setReturnItems]      = useState({});   // keyed by product_id
  const [supplierId,       setSupplierId]       = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState(null); // { supplier_id, supplier_name }
  const [suppliers,        setSuppliers]        = useState([]);
  const [supplierSearch,   setSupplierSearch]   = useState('');
  const [supplierDropOpen, setSupplierDropOpen] = useState(false);
  const [loading,          setLoading]          = useState(false);
  const [error,            setError]            = useState('');
  const [successData,      setSuccessData]      = useState(null);
  const debounce       = useRef(null);
  const supplierBoxRef = useRef(null);

  /* ---- load suppliers on mount ---- */
  useEffect(() => {
    api.get('/suppliers')
      .then(res => {
        const data = res.data?.data ?? res.data;
        setSuppliers(Array.isArray(data) ? data : []);
      })
      .catch(() => toast.error('Could not load suppliers'));
  }, []);

  /* ---- close supplier dropdown on outside click ---- */
  useEffect(() => {
    const handler = (e) => {
      if (supplierBoxRef.current && !supplierBoxRef.current.contains(e.target)) {
        setSupplierDropOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const trimmed = (searchValue || '').toString().trim();
    if (trimmed.length < 1) { setSearchResults([]); return; }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = window.setTimeout(searchBills, 500);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [searchMode, searchValue]);

  const searchBills = async () => {
    const trimmed = (searchValue || '').toString().trim();
    if (!trimmed) return;
    
    // Validate phone number if searching by phone
    if (searchMode === 'phone') {
      const phoneValidation = validateSriLankanPhone(trimmed);
      if (!phoneValidation.isValid) {
        toast.error(phoneValidation.message);
        return;
      }
    }
    
    setLoading(true);
    try {
      const params = searchMode === 'bill_no' ? { bill_no: trimmed } : { phone: trimmed };
      const res = await api.get('/returns/lookup-bill', { params });
      const responseData = res.data?.data ?? res.data;
      const results = Array.isArray(responseData)
        ? responseData
        : responseData
          ? [responseData]
          : [];
      setSearchResults(results);
      if (!results.length) {
        toast.error('No bills found');
      }
    } catch (err) {
      setSearchResults([]);
      const message = err.response?.data?.error || err.response?.data?.message || 'No bills found';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const selectBill = (bill) => {
    setSelectedBill(bill);
    setReturnItems({});
    setSearchResults([]);
    setSearchValue('');
    setError('');
  };

  /* ---- item toggle ---- */
  const toggleItem = (item) => {
    setReturnItems(prev => {
      const next = { ...prev };
      if (next[item.product_id]) {
        delete next[item.product_id];
      } else {
        next[item.product_id] = {
          product_id:      item.product_id,
          product_name:    item.product?.product_name,
          max_qty:         item.quantity,
          price_per_unit:  item.price_per_unit,
          discount:        item.discount,
          return_quantity: 1,
          return_reason:   'Customer Changed Mind',
          destination:     'STOCK',
          destination_note:'',
        };
      }
      return next;
    });
  };

  const selectAll = () => {
    if (!selectedBill) return;
    const next = {};
    selectedBill.bill_items.forEach(item => {
      next[item.product_id] = {
        product_id:      item.product_id,
        product_name:    item.product?.product_name,
        max_qty:         item.quantity,
        price_per_unit:  item.price_per_unit,
        discount:        item.discount,
        return_quantity: item.quantity,
        return_reason:   'Customer Changed Mind',
        destination:     'STOCK',
        destination_note:'',
      };
    });
    setReturnItems(next);
  };

  const updateField = (productId, field, value) => {
    setReturnItems(prev => ({
      ...prev,
      [productId]: { ...prev[productId], [field]: value },
    }));
  };

  /* ---- refund calc ---- */
  const calcTotalRefund = () => {
    return Object.values(returnItems).reduce((sum, item) => {
      const perUnitDiscount = Number(item.discount || 0) / Number(item.max_qty || 1);
      return sum + (Number(item.price_per_unit) - perUnitDiscount) * Number(item.return_quantity);
    }, 0).toFixed(2);
  };

  /* ---- supplier select helpers ---- */
  const filteredSuppliers = suppliers.filter(s => {
    const q = supplierSearch.toLowerCase();
    return (
      String(s.supplier_id).includes(q) ||
      (s.supplier_name || '').toLowerCase().includes(q)
    );
  });

  const handleSelectSupplier = (s) => {
    setSelectedSupplier(s);
    setSupplierId(String(s.supplier_id));
    setSupplierSearch('');
    setSupplierDropOpen(false);
  };

  const handleClearSupplier = () => {
    setSelectedSupplier(null);
    setSupplierId('');
    setSupplierSearch('');
  };

  /* ---- submit ---- */
  const submitReturn = async () => {
    const itemsArr = Object.values(returnItems);
    if (itemsArr.length === 0) { setError('Please select at least one item to return.'); return; }
    if (itemsArr.some(i => i.destination === 'SUPPLIER') && !supplierId) {
      setError('Supplier is required for items going back to Supplier.'); return;
    }
    const missingNotes = itemsArr.find(i => i.return_reason === 'Other' && !(i.destination_note || '').trim());
    if (missingNotes) {
      setError('Please enter notes for items with reason "Other".');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = {
        bill_id:     selectedBill.bill_id,
        supplier_id: supplierId ? Number(supplierId) : null,
        items: itemsArr.map(i => ({
          product_id:       i.product_id,
          return_quantity:  i.return_quantity,
          destination:      i.destination,
          destination_note: i.destination_note,
          return_reason:    i.return_reason,
        })),
      };
      const res = await api.post('/returns', payload);
      setSuccessData({
        refund_amount: res.data?.data?.total_refund_amount,
        items_count:   itemsArr.length,
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Submission failed.');
    } finally {
      setLoading(false);
    }
  };

  /* ---- success screen ---- */
  if (successData) {
    return (
      <div className="ret-success" style={{ minHeight: 'auto', padding: '20px', background: 'transparent' }}>
        <div className="ret-success-card">
          <div className="ret-success-icon">✅</div>
          <h2>Return Processed!</h2>
          <p>
            Successfully returned {successData.items_count} item(s) with a total refund of{' '}
            <strong>Rs. {successData.refund_amount}</strong>
          </p>
          <button
            className="ret-new-btn"
            onClick={() => { setSuccessData(null); setSelectedBill(null); setReturnItems({}); }}
          >
            Process Another Return
          </button>
        </div>
      </div>
    );
  }

  const totalBill = selectedBill ? parseFloat(selectedBill.total_amount) : 0;
  const originalBalanceDue = selectedBill ? parseFloat(selectedBill.balance_due) : 0;
  const howMuchPaid = Math.max(0, totalBill - originalBalanceDue);
  const totalReturnedValue = parseFloat(calcTotalRefund()) || 0;

  let actualRefundToCustomer = 0;
  let remainingBalancePayable = 0;

  if (originalBalanceDue > 0) {
    if (totalReturnedValue <= originalBalanceDue) {
      remainingBalancePayable = originalBalanceDue - totalReturnedValue;
      actualRefundToCustomer = 0;
    } else {
      remainingBalancePayable = 0;
      actualRefundToCustomer = totalReturnedValue - originalBalanceDue;
    }
  } else {
    remainingBalancePayable = 0;
    actualRefundToCustomer = totalReturnedValue;
  }

  return (
    <>
      {error && <div className="ret-error">{error}</div>}

      {/* ===== BILL SEARCH ===== */}
      {!selectedBill ? (
        <div className="ret-search-card">
          <h2>Find Invoice</h2>
          <div className="ret-radio-row">
            <label>
              <input type="radio" checked={searchMode === 'bill_no'} onChange={() => setSearchMode('bill_no')} />
              Bill Number
            </label>
            <label>
              <input type="radio" checked={searchMode === 'phone'} onChange={() => setSearchMode('phone')} />
              Customer Phone
            </label>
          </div>
          <div className="ret-search-box">
            <input
              type={searchMode === 'phone' ? 'tel' : 'text'}
              value={searchValue}
              onChange={e => {
                if (searchMode === 'phone') {
                  setSearchValue(filterSriLankanPhoneInput(e.target.value));
                } else {
                  setSearchValue(e.target.value);
                }
              }}
              placeholder={searchMode === 'bill_no' ? 'e.g. INV-2024-0001' : 'e.g. 0771234567 (070-078 only)'}
              maxLength={searchMode === 'phone' ? 10 : undefined}
            />
            <button onClick={searchBills}>Search</button>
          </div>

          {loading && <p style={{ color: '#888', fontSize: 14 }}>Searching…</p>}

          {searchResults.length > 0 && (
            <div className="ret-bill-results">
              {searchResults.map(b => (
                <div key={b.bill_id} className="ret-bill-result-item" onClick={() => selectBill(b)}>
                  <div>
                    <div className="bill-no">Bill #{b.bill_no}</div>
                    <div className="bill-date">
                      {new Date(b.bill_date).toLocaleString()} &nbsp;·&nbsp; <strong style={{ color: '#333' }}>{b.customer?.customer_name || 'Walk-in'}</strong> {b.customer?.phone_no ? `(${b.customer.phone_no})` : ''}
                    </div>
                  </div>
                  <div className="bill-total">Rs. {parseFloat(b.total_amount).toFixed(2)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ===== ITEM SELECTION ===== */
        <div>
          {/* Back to Search button above the search/item selection card */}
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '16px' }}>
            <button className="ret-back-btn" onClick={() => setSelectedBill(null)}>
              ← Back to Search
            </button>
          </div>

          <div className="ret-content">
            {/* Left — item list */}
            <div className="ret-left">
              <div className="ret-section-header">
                <h2>Select Items to Return</h2>
                <button className="ret-select-all-btn" onClick={selectAll}>Select All</button>
              </div>

              {selectedBill.bill_items?.map(item => {
                const isSelected = !!returnItems[item.product_id];
                const ri = returnItems[item.product_id];

                return (
                  <div key={item.product_id} className={`ret-item-card${isSelected ? ' selected' : ''}`}>
                    {/* Row */}
                    <div className="ret-item-header" onClick={() => toggleItem(item)}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleItem(item)}
                        onClick={e => e.stopPropagation()}
                      />
                      <div style={{ flex: 1 }}>
                        <div className="ret-item-name">{item.product?.product_name}</div>
                        <div className="ret-item-meta">
                          Qty sold: {item.quantity} &nbsp;·&nbsp; Unit price: Rs. {parseFloat(item.price_per_unit).toFixed(2)}
                          {item.discount > 0 && ` · Discount: Rs. ${item.discount}`}
                        </div>
                      </div>
                      <div className="ret-item-total">Rs. {parseFloat(item.total_price).toFixed(2)}</div>
                    </div>

                    {/* Expanded fields */}
                    {isSelected && (
                      <div className="ret-item-fields">
                        <div>
                          <label>Return Qty (max {item.quantity})</label>
                          <input
                            type="number"
                            min={1}
                            max={item.quantity}
                            value={ri.return_quantity}
                            onChange={e =>
                              updateField(item.product_id, 'return_quantity',
                                Math.min(Math.max(1, Number(e.target.value)), item.quantity))
                            }
                          />
                        </div>
                        <div>
                          <label>Reason</label>
                          <select
                            value={ri.return_reason}
                            onChange={e => updateField(item.product_id, 'return_reason', e.target.value)}
                          >
                            {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </div>
                        <div>
                          <label>Destination</label>
                          <select
                            value={ri.destination}
                            onChange={e => updateField(item.product_id, 'destination', e.target.value)}
                          >
                            {DESTINATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                          </select>
                        </div>
                        <div className="span-full">
                          <label>{ri.return_reason === 'Other' ? 'Notes (required)' : 'Notes (optional)'}</label>
                          <input
                            type="text"
                            placeholder="Any additional notes…"
                            value={ri.destination_note}
                            onChange={e => updateField(item.product_id, 'destination_note', e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Right — summary */}
            <div className="ret-right">
              <h3>Return Summary</h3>

              <div className="ret-summary-row">
                <span>Bill Number</span>
                <span>{selectedBill.bill_no}</span>
              </div>
              <div className="ret-summary-row">
                <span>Customer</span>
                <span>{selectedBill.customer?.customer_name || 'Walk-in'}</span>
              </div>
              {selectedBill.customer?.phone_no && (
                <div className="ret-summary-row">
                  <span>Phone</span>
                  <span>{selectedBill.customer.phone_no}</span>
                </div>
              )}
              <div className="ret-summary-row">
                <span>Items Selected</span>
                <span>{Object.keys(returnItems).length}</span>
              </div>

              <hr className="ret-divider" />

              <div className="ret-summary-row">
                <span>Total Bill</span>
                <span>Rs. {totalBill.toFixed(2)}</span>
              </div>
              <div className="ret-summary-row">
                <span>How Much Paid</span>
                <span>Rs. {howMuchPaid.toFixed(2)}</span>
              </div>
              <div className="ret-summary-row">
                <span>Returned Products Value</span>
                <span>Rs. {totalReturnedValue.toFixed(2)}</span>
              </div>
              <div className="ret-summary-row">
                <span>How much should be Pay</span>
                <span style={{ color: remainingBalancePayable > 0 ? '#b30000' : '#333', fontWeight: 'bold' }}>
                  Rs. {remainingBalancePayable.toFixed(2)}
                </span>
              </div>

              <hr className="ret-divider" />

              {/* Supplier picker if needed */}
              {Object.values(returnItems).some(i => i.destination === 'SUPPLIER') && (
                <div className="ret-supplier-box" ref={supplierBoxRef}>
                  <label>Supplier (required)</label>

                  {selectedSupplier ? (
                    /* ---- selected chip ---- */
                    <div className="ret-supplier-selected">
                      <span className="ret-supplier-chip">
                        <span className="chip-id">#{selectedSupplier.supplier_id}</span>
                        <span className="chip-name">{selectedSupplier.supplier_name}</span>
                      </span>
                      <button
                        className="ret-supplier-clear"
                        onClick={handleClearSupplier}
                        title="Change supplier"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    /* ---- search input + dropdown ---- */
                    <div className="ret-supplier-search-wrap">
                      <input
                        type="text"
                        className="ret-supplier-search-input"
                        value={supplierSearch}
                        onChange={e => { setSupplierSearch(e.target.value); setSupplierDropOpen(true); }}
                        onFocus={() => setSupplierDropOpen(true)}
                        placeholder="Search by name or ID…"
                        autoComplete="off"
                      />
                      {supplierDropOpen && (
                        <div className="ret-supplier-dropdown">
                          {filteredSuppliers.length === 0 ? (
                            <div className="ret-supplier-no-result">No suppliers found</div>
                          ) : (
                            filteredSuppliers.map(s => (
                              <div
                                key={s.supplier_id}
                                className="ret-supplier-option"
                                onMouseDown={() => handleSelectSupplier(s)}
                              >
                                <span className="opt-id">#{s.supplier_id}</span>
                                <span className="opt-name">{s.supplier_name}</span>
                                {s.supplier_code && <span className="opt-code">{s.supplier_code}</span>}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="ret-total-row">
                <span className="label" style={{ fontWeight: '600' }}>Should Return to Customer</span>
                <span className="amount">Rs. {actualRefundToCustomer.toFixed(2)}</span>
              </div>

              <button
                className="ret-confirm-btn"
                disabled={loading || Object.keys(returnItems).length === 0}
                onClick={submitReturn}
              >
                {loading ? 'Processing…' : 'Confirm Return'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
