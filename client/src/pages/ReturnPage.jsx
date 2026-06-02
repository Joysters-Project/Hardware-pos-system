import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/axios';

const DESTINATIONS = ['STOCK', 'REPAIR', 'SUPPLIER', 'WRITEOFF'];
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
        return 'Returned goods will be restocked into inventory.';
      case 'REPAIR':
        return 'Returned goods will move to repair inventory for later inspection.';
      case 'SUPPLIER':
        return 'Returned goods will be recorded for supplier return processing.';
      case 'WRITEOFF':
        return 'Returned goods will be written off and removed from inventory value.';
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
    <div className="return-page" style={{ padding: '24px', minHeight: '100vh', background: '#100606', color: '#f5ecec' }}>
      <div style={{ marginBottom: '24px' }}>
        <button onClick={goBack} style={{ marginBottom: '16px', background: '#2f0707', color: '#f8fafc', border: '1px solid #4f0f0f', padding: '10px 14px', borderRadius: 10, cursor: 'pointer' }}>
          ← Back
        </button>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {labels.map((label, index) => (
            <div key={label} style={{
              flex: 1,
              minWidth: 140,
              padding: '12px',
              borderRadius: 12,
              background: step === index ? '#800000' : '#2e0a0a',
              color: '#f5ecec'
            }}>
              <div style={{ fontSize: 12, opacity: 0.8, color: '#d7c0c0' }}>Step {index + 1}</div>
              <div style={{ fontWeight: 700 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {showSuccess ? (
        <div style={{ textAlign: 'center', padding: '48px', background: '#220909', borderRadius: 16 }}>
          <div style={{ fontSize: 72, color: '#ffb7b0' }}>✓</div>
          <h2 style={{ color: '#f8ecec' }}>Return Processed</h2>
          <p style={{ marginTop: 8, color: '#e4d3d3' }}>
            {successData?.product_name} returned for Rs. {successData?.refund_amount}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: step === 2 ? '3fr 1fr' : '1fr', gap: '24px' }}>
          {(step === 0 || step === 1) && (
            <div style={{ background: '#1d0707', borderRadius: 16, padding: 24, boxShadow: '0 4px 18px rgba(0,0,0,0.35)' }}>
              {step === 0 && (
                <>
                  <h2>Find Bill</h2>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ marginRight: 12 }}>
                      <input
                        type="radio"
                        name="searchMode"
                        checked={searchMode === 'bill_no'}
                        onChange={() => setSearchMode('bill_no')}
                      />
                      Bill No
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="searchMode"
                        checked={searchMode === 'phone'}
                        onChange={() => setSearchMode('phone')}
                      />
                      Phone
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                    <input
                      type="text"
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                      placeholder={searchMode === 'bill_no' ? 'Enter bill number' : 'Enter phone number'}
                      style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid #4f0f0f', background: '#1b0707', color: '#f5ecec' }}
                    />
                    <button onClick={searchBills} disabled={loading} style={{ padding: '10px 16px', borderRadius: 8, background: '#800000', color: '#fff', border: '1px solid #940000' }}>
                      {loading ? 'Searching...' : 'Search'}
                    </button>
                  </div>
                  {error && <div style={{ color: '#b91c1c', marginBottom: 16 }}>{error}</div>}

                  <div style={{ display: 'grid', gap: 12 }}>
                    {searchResults.map((bill) => (
                      <button
                        key={bill.bill_id || bill.bill_no}
                        onClick={() => selectBill(bill)}
                        style={{
                          textAlign: 'left',
                          padding: '16px',
                          borderRadius: 12,
                          border: '1px solid #4f0f0f',
                          background: '#220909',
                          cursor: 'pointer',
                          color: '#f4e9e9'
                        }}
                      >
                        <div style={{ fontWeight: 700 }}>Bill: {bill.bill_no}</div>
                        <div style={{ marginTop: 6 }}>Date: {new Date(bill.bill_date).toLocaleDateString()}</div>
                        <div style={{ marginTop: 6 }}>Total: Rs. {bill.total_amount}</div>
                        <div style={{ marginTop: 6 }}>Status: {bill.status}</div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {step === 1 && selectedBill && (
                <>
                  <h2>Select Item</h2>
                  <div style={{ marginBottom: 16 }}>
                    <strong>Bill #{selectedBill.bill_no}</strong>
                    <div>Date: {new Date(selectedBill.bill_date).toLocaleDateString()}</div>
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
                          border: '1px solid #4f0f0f',
                          background: selectedItem?.product_id === item.product_id ? '#3a0d0d' : '#1c0707',
                          color: '#f4e9e9'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700 }}>{item.product?.product_name || `Product ${item.product_id}`}</div>
                          <div>Qty Sold: {item.quantity}</div>
                          <div>Price/Unit: Rs. {item.price_per_unit}</div>
                        </div>
                        <div style={{ alignSelf: 'center' }}>
                          <span style={{ padding: '8px 12px', background: '#3a0d0d', borderRadius: 8, color: '#f8ecec' }}>Preview</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {step === 2 && selectedItem && preview && (
                <>
                  <h2>Choose Destination</h2>
                  <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
                    {DESTINATIONS.map((option) => {
                      const disabled = isRestrictedUser && RESTRICTED_DESTINATIONS.includes(option);
                      return (
                        <label key={option} style={{
                          display: 'block',
                          padding: '14px',
                          borderRadius: 12,
                          border: `1px solid ${disabled ? '#5c0d0d' : '#800000'}`,
                          background: destination === option ? 'rgba(128, 0, 0, 0.22)' : '#1f0707',
                          opacity: disabled ? 0.5 : 1,
                          cursor: disabled ? 'not-allowed' : 'pointer',
                          color: '#f5ecec'
                        }}>
                          <input
                            type="radio"
                            name="destination"
                            value={option}
                            checked={destination === option}
                            onChange={() => handleDestinationChange(option)}
                            disabled={disabled}
                            style={{ marginRight: 8 }}
                          />
                          {option}
                          {disabled && ' – Manager required'}
                        </label>
                      );
                    })}
                  </div>

                  <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
                    <div style={{ display: 'grid', gap: 6 }}>
                      <label>Return Quantity</label>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button type="button" onClick={() => updateQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1}>-</button>
                        <input
                          type="number"
                          value={quantity}
                          min="1"
                          max={preview.max_returnable}
                          onChange={(e) => updateQuantity(Number(e.target.value))}
                          style={{ width: 80, textAlign: 'center' }}
                        />
                        <button type="button" onClick={() => updateQuantity(Math.min(preview.max_returnable, quantity + 1))} disabled={quantity >= preview.max_returnable}>+</button>
                        <span style={{ color: '#d3bcbc' }}>Max {preview.max_returnable}</span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gap: 6 }}>
                      <label>Notes</label>
                      <textarea
                        value={destinationNote}
                        onChange={(e) => setDestinationNote(e.target.value)}
                        rows="3"
                        placeholder="Enter reason or destination note"
                        style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #4f0f0f', background: '#1b0707', color: '#f5ecec' }}
                      />
                    </div>

                    {destination === 'SUPPLIER' && (
                      <div style={{ display: 'grid', gap: 6 }}>
                        <label>Supplier ID</label>
                        <input
                          type="number"
                          value={supplierId}
                          onChange={(e) => setSupplierId(e.target.value)}
                          placeholder="Enter supplier ID"
                          style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #4f0f0f', background: '#1b0707', color: '#f5ecec' }}
                        />
                      </div>
                    )}

                    {error && <div style={{ color: '#b91c1c' }}>{error}</div>}

                    <button onClick={() => setStep(3)} disabled={loading} style={{ padding: '12px 16px', borderRadius: 10, background: '#800000', color: '#fff', border: '1px solid #a00000' }}>
                      Continue to Confirmation
                    </button>
                  </div>
                </>
              )}

              {step === 3 && selectedItem && preview && (
                <>
                  <h2>Confirm Return</h2>
                  <div style={{ display: 'grid', gap: 16 }}>
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
                      <strong>Destination:</strong> {destination}
                    </div>
                    <div>
                      <strong>Price at Sale:</strong> Rs. {selectedItem.price_per_unit}
                    </div>
                    <div>
                      <strong>Refund Amount:</strong> Rs. {preview.refund_amount}
                    </div>
                    <div style={{ padding: 16, borderRadius: 14, background: '#2f0b0b', color: '#eee5e5' }}>
                      {summaryNotice()}
                    </div>
                    {error && <div style={{ color: '#b91c1c' }}>{error}</div>}
                    <button onClick={submitReturn} disabled={loading} style={{ padding: '14px 18px', borderRadius: 12, background: '#800000', color: '#fff', border: '1px solid #a00000' }}>
                      {loading ? 'Processing...' : 'Submit Return'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {step === 2 && selectedItem && preview && (
            <div style={{ background: '#1e0707', borderRadius: 16, padding: 24, height: 'fit-content', color: '#f5ecec' }}>
              <h3 style={{ color: '#f8ecec' }}>Summary</h3>
              <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
                <div><strong>Bill No:</strong> {selectedBill.bill_no}</div>
                <div><strong>Product:</strong> {selectedItem.product?.product_name || selectedItem.product_name || selectedItem.product_id}</div>
                <div><strong>Return Qty:</strong> {quantity}</div>
                <div><strong>Unit Price:</strong> Rs. {selectedItem.price_per_unit}</div>
                <div><strong>Refund:</strong> Rs. {preview.refund_amount}</div>
                <div style={{ padding: 12, borderRadius: 12, background: '#2f0b0b', color: '#eee5e5' }}>{summaryNotice()}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ReturnPage;
