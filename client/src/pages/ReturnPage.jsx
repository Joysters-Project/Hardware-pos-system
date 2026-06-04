import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/axios';
import DashboardLayout from '../components/DashboardLayout';

const DESTINATIONS = [
  { value: 'STOCK', label: 'Back to Stock', description: 'Good item — sellable again' },
  { value: 'REPAIR', label: 'Send to Repair', description: 'Fixable item — move to repair stock' },
  { value: 'SUPPLIER', label: 'Send to Supplier', description: 'Defective batch — supplier return / debit note' },
  { value: 'WRITEOFF', label: 'Write Off / Damaged', description: 'Beyond repair — loss recorded' }
];
const RESTRICTED_DESTINATIONS = ['SUPPLIER', 'WRITEOFF'];

function ReturnPage({ userRole }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [searchMode, setSearchMode] = useState('bill_no');
  const [searchValue, setSearchValue] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [destination, setDestination] = useState('STOCK');
  const [destinationNote, setDestinationNote] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [poId, setPoId] = useState('');
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState(null);

  const isRestrictedUser = !['Manager', 'Admin'].includes(userRole);

  const labels = ['Find Bill', 'Select Item', 'Choose Destination', 'Confirm Return'];

  const resetAll = () => {
    setStep(0);
    setSearchValue('');
    setSearchResults([]);
    setSelectedBill(null);
    setSelectedItem(null);
    setQuantity(1);
    setDestination('STOCK');
    setDestinationNote('');
    setSupplierId('');
    setPoId('');
    setPreview(null);
    setError('');
    setShowSuccess(false);
    setSuccessData(null);
  };

  const searchBills = async () => {
    const trimmed = (searchValue || '').toString().trim();
    if (!trimmed) {
      setError('Enter a bill number or phone number to search');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const url = '/returns/lookup-bill';
      const params = searchMode === 'bill_no'
        ? { bill_no: trimmed }
        : { phone: trimmed };

      const response = await api.get(url, { params });
      const data = response.data?.data ?? response.data;
      const results = Array.isArray(data) ? data : [data];
      setSearchResults(results);
      if (!results || results.length === 0) {
        setError('No bills found for this search');
      }
    } catch (err) {
      setSearchResults([]);
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to find bills');
    } finally {
      setLoading(false);
    }
  };

  const selectBill = (bill) => {
    setSelectedBill(bill);
    setSelectedItem(null);
    setPreview(null);
    setQuantity(1);
    setDestination('STOCK');
    setDestinationNote('');
    setSupplierId('');
    setPoId('');
    setError('');
    setStep(1);
  };

  const selectItem = async (item) => {
    setError('');
    setLoading(true);
    try {
      const response = await api.get('/returns/preview', {
        params: {
          bill_id: selectedBill.bill_id,
          product_id: item.product_id,
          return_qty: 1
        }
      });

      setSelectedItem(item);
      setQuantity(1);
      setPreview(response.data);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to load item preview');
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (newQuantity) => {
    if (!selectedBill || !selectedItem) return;
    if (newQuantity < 1) return;
    if (preview && newQuantity > preview.max_returnable) return;

    setQuantity(newQuantity);
    setError('');
    setLoading(true);
    try {
      const response = await api.get('/returns/preview', {
        params: {
          bill_id: selectedBill.bill_id,
          product_id: selectedItem.product_id,
          return_qty: newQuantity
        }
      });
      setPreview(response.data);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Unable to update preview');
    } finally {
      setLoading(false);
    }
  };

  const handleDestinationChange = (value) => {
    if (isRestrictedUser && RESTRICTED_DESTINATIONS.includes(value)) {
      return;
    }
    setDestination(value);
  };

  const summaryNotice = () => {
    switch (destination) {
      case 'STOCK':
        return 'Returned goods will be restocked and made sellable again.';
      case 'REPAIR':
        return 'Returned goods will move to repair inventory and await inspection.';
      case 'SUPPLIER':
        return 'Returned goods will be prepared for supplier return and debit note processing.';
      case 'WRITEOFF':
        return 'Returned goods will be written off as damaged and recorded as a loss.';
      default:
        return '';
    }
  };

  const submitReturn = async () => {
    setError('');
    if (!selectedBill || !selectedItem || !preview) {
      setError('Complete the return workflow before submitting');
      return;
    }

    if (destination === 'SUPPLIER' && !supplierId) {
      setError('Supplier ID is required when destination is SUPPLIER');
      return;
    }

    const payload = {
      bill_id: selectedBill.bill_id,
      product_id: selectedItem.product_id,
      return_quantity: quantity,
      destination,
      destination_note: destinationNote,
      supplier_id: supplierId ? Number(supplierId) : null,
      po_id: poId ? Number(poId) : null,
      reason: destinationNote || `Return for ${selectedItem.product_name || selectedItem.product_id}`
    };

    setLoading(true);
    try {
      const response = await api.post('/returns', payload);
      setSuccessData({
        product_name: selectedItem.product_name || selectedItem.product?.product_name,
        refund_amount: response.data?.data?.refund_amount ?? preview.refund_amount
      });
      setShowSuccess(true);
      setTimeout(() => {
        resetAll();
      }, 2500);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to process return');
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    setError('');
    if (step === 0) {
      navigate(-1);
      return;
    }
    setStep(step - 1);
  };

  return (
    <DashboardLayout active="returns">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">↩️ Return Processing</h1>
          <p className="admin-page-subtitle">Lookup bills, verify items, and record returns</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {step > 0 && (
            <button onClick={goBack} style={{ background: 'var(--surface-soft, #361111)', color: '#f8fafc', border: '1px solid var(--border, #4a1c1c)', padding: '10px 14px', borderRadius: 10, cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
              ← Prev Step
            </button>
          )}
          {['Manager', 'Admin'].includes(userRole) && (
            <Link to="/return-logs" style={{ background: '#3f0f0f', color: '#f8fafc', border: '1px solid #6f1010', padding: '10px 14px', borderRadius: 10, textDecoration: 'none', fontSize: '13px', fontWeight: '600', display: 'inline-flex', alignItems: 'center' }}>
              View Return Logs
            </Link>
          )}
        </div>
      </div>

      <div style={{ marginTop: '8px' }}>
        {/* Wizard Progress bar */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
          {labels.map((label, index) => (
            <div key={label} style={{
              flex: 1,
              minWidth: 140,
              padding: '12px',
              borderRadius: 12,
              background: step === index ? '#800000' : 'rgba(128, 0, 0, 0.08)',
              border: `1px solid ${step === index ? '#800000' : 'rgba(128, 0, 0, 0.15)'}`,
              color: '#f5ecec'
            }}>
              <div style={{ fontSize: 11, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Step {index + 1}</div>
              <div style={{ fontWeight: 700, fontSize: '14px', marginTop: '2px' }}>{label}</div>
            </div>
          ))}
        </div>

        {showSuccess ? (
          <div style={{ textAlign: 'center', padding: '48px', background: '#220909', borderRadius: 16, border: '1px solid #4a1c1c' }}>
            <div style={{ fontSize: 72, color: '#ffb7b0' }}>✓</div>
            <h2 style={{ color: '#f8ecec' }}>Return Processed</h2>
            <p style={{ marginTop: 8, color: '#e4d3d3' }}>
              {successData?.product_name} returned for Rs. {successData?.refund_amount}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: step === 2 ? '3fr 1.5fr' : '1fr', gap: '24px' }}>
            <div style={{ background: 'var(--surface, #1d0707)', borderRadius: 16, padding: 24, boxShadow: '0 4px 18px rgba(0,0,0,0.15)', border: '1px solid var(--border, #4a1c1c)' }}>
              {step === 0 && (
                <>
                  <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Find Bill</h2>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ marginRight: 16, fontSize: '14px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="searchMode"
                        checked={searchMode === 'bill_no'}
                        onChange={() => setSearchMode('bill_no')}
                        style={{ marginRight: '6px' }}
                      />
                      Bill No
                    </label>
                    <label style={{ fontSize: '14px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="searchMode"
                        checked={searchMode === 'phone'}
                        onChange={() => setSearchMode('phone')}
                        style={{ marginRight: '6px' }}
                      />
                      Phone
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                    <input
                      type="text"
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                      placeholder={searchMode === 'bill_no' ? 'Enter bill number...' : 'Enter phone number...'}
                      style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border, #4f0f0f)', background: 'rgba(0,0,0,0.2)', color: '#f5ecec', outline: 'none' }}
                    />
                    <button onClick={searchBills} disabled={loading} style={{ padding: '10px 18px', borderRadius: 8, background: '#800000', color: '#fff', border: '1px solid #940000', cursor: 'pointer', fontWeight: '600' }}>
                      {loading ? 'Searching...' : 'Search'}
                    </button>
                  </div>
                  {error && <div style={{ color: '#ef4444', marginBottom: 16, fontSize: '14px' }}>{error}</div>}

                  <div style={{ display: 'grid', gap: 12 }}>
                    {searchResults.map((bill) => (
                      <button
                        key={bill.bill_id || bill.bill_no}
                        onClick={() => selectBill(bill)}
                        style={{
                          textAlign: 'left',
                          padding: '16px',
                          borderRadius: 12,
                          border: '1px solid var(--border, #4f0f0f)',
                          background: 'rgba(128, 0, 0, 0.05)',
                          cursor: 'pointer',
                          color: '#f4e9e9',
                          transition: 'background 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(128, 0, 0, 0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(128, 0, 0, 0.05)'}
                      >
                        <div style={{ fontWeight: 700, fontSize: '15px', color: '#ffcbc5' }}>Bill: {bill.bill_no}</div>
                        <div style={{ marginTop: 6, fontSize: '13px', color: '#e8d5d5' }}>Date: {new Date(bill.bill_date).toLocaleDateString()}</div>
                        <div style={{ marginTop: 4, fontSize: '13px', color: '#e8d5d5' }}>Total: Rs. {bill.total_amount}</div>
                        <div style={{ marginTop: 4, fontSize: '13px', color: '#e8d5d5' }}>Status: <span style={{ color: '#81c784', fontWeight: '600' }}>{bill.status}</span></div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {step === 1 && selectedBill && (
                <>
                  <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Select Item</h2>
                  <div style={{ marginBottom: 20, fontSize: '14px', color: '#e8d5d5' }}>
                    <strong>Bill #{selectedBill.bill_no}</strong> · Date: {new Date(selectedBill.bill_date).toLocaleDateString()}
                  </div>
                  <div style={{ display: 'grid', gap: 12 }}>
                    {selectedBill.bill_items?.map((item) => (
                      <button
                        key={item.product_id}
                        onClick={() => selectItem(item)}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr auto',
                          gap: 12,
                          padding: '16px',
                          borderRadius: 12,
                          border: '1px solid var(--border, #4f0f0f)',
                          background: selectedItem?.product_id === item.product_id ? 'rgba(128,0,0,0.2)' : 'rgba(128,0,0,0.05)',
                          color: '#f4e9e9',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'background 0.2s'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, color: '#ffcbc5' }}>{item.product?.product_name || `Product ${item.product_id}`}</div>
                          <div style={{ fontSize: '13px', marginTop: '4px' }}>Qty Sold: {item.quantity}</div>
                          <div style={{ fontSize: '13px', marginTop: '2px' }}>Price/Unit: Rs. {item.price_per_unit}</div>
                        </div>
                        <div style={{ alignSelf: 'center' }}>
                          <span style={{ padding: '8px 12px', background: '#800000', borderRadius: 8, color: '#f8ecec', fontSize: '12px', fontWeight: '600' }}>Preview</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {step === 2 && selectedItem && preview && (
                <>
                  <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Choose Destination</h2>
                  <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
                    {DESTINATIONS.map((option) => {
                      const disabled = isRestrictedUser && RESTRICTED_DESTINATIONS.includes(option.value);
                      return (
                        <label key={option.value} style={{
                          display: 'block',
                          padding: '14px',
                          borderRadius: 12,
                          border: `1px solid ${disabled ? 'rgba(239, 68, 68, 0.2)' : 'rgba(128, 0, 0, 0.3)'}`,
                          background: destination === option.value ? 'rgba(128, 0, 0, 0.2)' : 'rgba(128, 0, 0, 0.05)',
                          opacity: disabled ? 0.4 : 1,
                          cursor: disabled ? 'not-allowed' : 'pointer',
                          color: '#f5ecec',
                          transition: 'all 0.2s'
                        }}>
                          <input
                            type="radio"
                            name="destination"
                            value={option.value}
                            checked={destination === option.value}
                            onChange={() => handleDestinationChange(option.value)}
                            disabled={disabled}
                            style={{ marginRight: 8 }}
                          />
                          <span style={{ fontWeight: 700, color: '#ffcbc5' }}>{option.label}</span>
                          <div style={{ fontSize: 12, color: '#d7c0c0', marginTop: 4 }}>{option.description}</div>
                          {disabled && <div style={{ fontSize: 11, color: '#fca5a5', marginTop: 4, fontWeight: '600' }}>Manager approval required</div>}
                        </label>
                      );
                    })}
                  </div>

                  <div style={{ display: 'grid', gap: 16, marginBottom: 16 }}>
                    <div style={{ display: 'grid', gap: 6 }}>
                      <label style={{ fontSize: '14px', fontWeight: '600' }}>Return Quantity</label>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button type="button" onClick={() => updateQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1} style={{ width: '32px', height: '32px', background: '#3e1111', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>-</button>
                        <input
                          type="number"
                          value={quantity}
                          min="1"
                          max={preview.max_returnable}
                          onChange={(e) => updateQuantity(Number(e.target.value))}
                          style={{ width: 60, textAlign: 'center', padding: '6px', border: '1px solid var(--border, #4a1c1c)', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', color: 'white' }}
                        />
                        <button type="button" onClick={() => updateQuantity(Math.min(preview.max_returnable, quantity + 1))} disabled={quantity >= preview.max_returnable} style={{ width: '32px', height: '32px', background: '#3e1111', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>+</button>
                        <span style={{ color: '#d3bcbc', fontSize: '13px', marginLeft: '6px' }}>Max returnable: {preview.max_returnable}</span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gap: 6 }}>
                      <label style={{ fontSize: '14px', fontWeight: '600' }}>Notes</label>
                      <textarea
                        value={destinationNote}
                        onChange={(e) => setDestinationNote(e.target.value)}
                        rows="3"
                        placeholder="Enter reason or note..."
                        style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid var(--border, #4f0f0f)', background: 'rgba(0,0,0,0.2)', color: '#f5ecec', resize: 'none', outline: 'none' }}
                      />
                    </div>

                    {destination === 'SUPPLIER' && (
                      <>
                        <div style={{ display: 'grid', gap: 6 }}>
                          <label style={{ fontSize: '14px', fontWeight: '600' }}>Supplier ID</label>
                          <input
                            type="number"
                            value={supplierId}
                            onChange={(e) => setSupplierId(e.target.value)}
                            placeholder="Enter supplier ID"
                            style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border, #4f0f0f)', background: 'rgba(0,0,0,0.2)', color: '#f5ecec', outline: 'none' }}
                          />
                        </div>
                        <div style={{ display: 'grid', gap: 6 }}>
                          <label style={{ fontSize: '14px', fontWeight: '600' }}>Purchase Order / Debit Note ID</label>
                          <input
                            type="number"
                            value={poId}
                            onChange={(e) => setPoId(e.target.value)}
                            placeholder="Enter PO ID if available"
                            style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border, #4f0f0f)', background: 'rgba(0,0,0,0.2)', color: '#f5ecec', outline: 'none' }}
                          />
                        </div>
                      </>
                    )}

                    {error && <div style={{ color: '#ef4444', fontSize: '14px' }}>{error}</div>}

                    <button onClick={() => setStep(3)} disabled={loading} style={{ padding: '12px 16px', borderRadius: 8, background: '#800000', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: '600', marginTop: '10px' }}>
                      Continue to Confirmation
                    </button>
                  </div>
                </>
              )}

              {step === 3 && selectedItem && preview && (
                <>
                  <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>Confirm Return</h2>
                  <div style={{ display: 'grid', gap: 14, fontSize: '14px', color: '#e8d5d5' }}>
                    <div>
                      <strong>Bill:</strong> {selectedBill.bill_no}
                    </div>
                    <div>
                      <strong>Product:</strong> {selectedItem.product?.product_name || selectedItem.product_name || selectedItem.product_id}
                    </div>
                    <div>
                      <strong>Return Quantity:</strong> {quantity}
                    </div>
                    <div>
                      <strong>Destination:</strong> <span style={{ color: '#ffcbc5', fontWeight: '600' }}>{destination}</span>
                    </div>
                    {supplierId && (
                      <div>
                        <strong>Supplier ID:</strong> {supplierId}
                      </div>
                    )}
                    {poId && (
                      <div>
                        <strong>PO / Debit Note ID:</strong> {poId}
                      </div>
                    )}
                    <div>
                      <strong>Price at Sale:</strong> Rs. {selectedItem.price_per_unit}
                    </div>
                    <div style={{ fontSize: '16px', color: '#81c784', fontWeight: '700' }}>
                      <strong>Refund Amount:</strong> Rs. {preview.refund_amount}
                    </div>
                    <div style={{ padding: 16, borderRadius: 12, background: 'rgba(128,0,0,0.1)', color: '#eee5e5', border: '1px solid var(--border, #4a1c1c)', fontSize: '13px' }}>
                      {summaryNotice()}
                    </div>
                    {error && <div style={{ color: '#ef4444' }}>{error}</div>}
                    <button onClick={submitReturn} disabled={loading} style={{ padding: '14px 18px', borderRadius: 10, background: '#800000', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '15px', marginTop: '10px' }}>
                      {loading ? 'Processing...' : 'Submit Return'}
                    </button>
                  </div>
                </>
              )}
            </div>

            {step === 2 && selectedItem && preview && (
              <div style={{ background: 'var(--surface, #1e0707)', borderRadius: 16, padding: 24, height: 'fit-content', color: '#f5ecec', border: '1px solid var(--border, #4a1c1c)' }}>
                <h3 style={{ color: '#f8ecec', fontSize: '16px', fontWeight: '700', margin: '0 0 16px' }}>Summary</h3>
                <div style={{ display: 'grid', gap: 10, fontSize: '13px', color: '#e8d5d5' }}>
                  <div><strong>Bill No:</strong> {selectedBill.bill_no}</div>
                  <div><strong>Product:</strong> {selectedItem.product?.product_name || selectedItem.product_name || selectedItem.product_id}</div>
                  <div><strong>Return Qty:</strong> {quantity}</div>
                  <div><strong>Unit Price:</strong> Rs. {selectedItem.price_per_unit}</div>
                  <div style={{ color: '#81c784', fontWeight: '600' }}><strong>Refund:</strong> Rs. {preview.refund_amount}</div>
                  <div style={{ padding: 10, borderRadius: 8, background: 'rgba(128,0,0,0.1)', color: '#eee5e5', border: '1px solid var(--border, #4a1c1c)', marginTop: '8px' }}>{summaryNotice()}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default ReturnPage;