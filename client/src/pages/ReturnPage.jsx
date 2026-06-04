import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/axios';

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
  const [successData, setSuccessData] = useState(null);
  const searchDebounce = useRef(null);

  const isRestrictedUser = !['Manager', 'Admin'].includes(userRole);
  const labels = ['Find Bill', 'Select Item', 'Quantity', 'Destination', 'Confirm', 'Finish'];

  useEffect(() => {
    const trimmed = (searchValue || '').toString().trim();
    if (trimmed.length < 2) return;
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = window.setTimeout(() => { searchBills(); }, 500);
    return () => { if (searchDebounce.current) clearTimeout(searchDebounce.current); };
  }, [searchMode, searchValue]);

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
    setSuccessData(null);
  };

  const searchBills = async () => {
    const trimmed = (searchValue || '').toString().trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      const url = '/returns/lookup-bill';
      const params = searchMode === 'bill_no' ? { bill_no: trimmed } : { phone: trimmed };
      const response = await api.get(url, { params });
      const data = response.data?.data ?? response.data;
      setSearchResults(Array.isArray(data) ? data : [data]);
    } catch (err) {
      setSearchResults([]);
      setError('Bill not found');
    } finally {
      setLoading(false);
    }
  };

  const selectBill = (bill) => {
    setSelectedBill(bill);
    setStep(1);
  };

  const selectItem = async (item) => {
    setLoading(true);
    try {
      const response = await api.get('/returns/preview', {
        params: { bill_id: selectedBill.bill_id, product_id: item.product_id, return_qty: 1 }
      });
      setSelectedItem(item);
      setQuantity(1);
      setPreview(response.data);
      setStep(2);
    } catch (err) {
      setError('Failed to load item');
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (newVal) => {
    const val = newVal === '' ? '' : Number(newVal);
    setQuantity(val);
    
    if (val === '' || val < 1 || (preview && val > preview.max_returnable)) {
      return;
    }
    
    try {
      const response = await api.get('/returns/preview', {
        params: { bill_id: selectedBill.bill_id, product_id: selectedItem.product_id, return_qty: val }
      });
      setPreview(response.data);
    } catch (e) {}
  };

  const submitReturn = async () => {
    setLoading(true);
    try {
      const payload = {
        bill_id: selectedBill.bill_id,
        product_id: selectedItem.product_id,
        return_quantity: quantity,
        destination,
        destination_note: destinationNote,
        supplier_id: supplierId ? Number(supplierId) : null,
        po_id: poId ? Number(poId) : null,
        reason: destinationNote || `Return for ${selectedItem.product_name}`
      };
      const response = await api.post('/returns', payload);
      setSuccessData({
        product_name: selectedItem.product_name || selectedItem.product?.product_name,
        refund_amount: response.data?.data?.refund_amount ?? preview.refund_amount
      });
      setStep(5);
    } catch (err) {
      setError(err.response?.data?.error || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  const summaryNotice = () => {
    switch (destination) {
      case 'STOCK': return 'Returned goods will be restocked.';
      case 'REPAIR': return 'Returned goods will move to repair.';
      case 'SUPPLIER': return 'Returned goods will be sent back to supplier.';
      case 'WRITEOFF': return 'Returned goods will be written off.';
      default: return '';
    }
  };

  return (
    <div style={{ padding: '24px', minHeight: '100vh', background: '#0a0303', color: '#f5ecec', fontFamily: 'sans-serif' }}>
      <div style={{ marginBottom: 30 }}>
        <h1 style={{ margin: 0 }}>Return System <span style={{ fontSize: 14, opacity: 0.5 }}>v1.3</span></h1>
        <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
          {labels.map((l, i) => (
            <div key={l} style={{ flex: 1, padding: 10, borderRadius: 8, background: step === i ? '#800000' : '#220909', textAlign: 'center' }}>
               <div style={{ fontSize: 10 }}>Step {i+1}</div>
               <div style={{ fontWeight: 'bold' }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: step >= 2 && step < 5 ? '3fr 1fr' : '1fr', gap: 24 }}>
        <div style={{ background: '#1a0707', padding: 24, borderRadius: 16 }}>
          {step === 0 && (
            <div>
               <h2>Find Bill</h2>
               <div style={{ marginBottom: 15 }}>
                  <label><input type="radio" checked={searchMode === 'bill_no'} onChange={() => setSearchMode('bill_no')} /> Bill No</label>
                  <label style={{ marginLeft: 15 }}><input type="radio" checked={searchMode === 'phone'} onChange={() => setSearchMode('phone')} /> Phone</label>
               </div>
               <input 
                 type="text" 
                 value={searchValue} 
                 onChange={(e) => setSearchValue(e.target.value)} 
                 placeholder="Search..."
                 style={{ width: '100%', padding: 12, borderRadius: 8, background: '#000', color: '#fff', border: '1px solid #444' }}
               />
               <div style={{ marginTop: 20, display: 'grid', gap: 10 }}>
                  {searchResults.map(b => (
                    <div key={b.bill_id} onClick={() => selectBill(b)} style={{ padding: 15, background: '#220909', borderRadius: 10, cursor: 'pointer' }}>
                       <strong>Bill #{b.bill_no}</strong> | {new Date(b.bill_date).toLocaleDateString()} | Rs. {b.total_amount}
                    </div>
                  ))}
               </div>
            </div>
          )}

          {step === 1 && selectedBill && (
            <div>
               <h2>Select Product</h2>
               <div style={{ display: 'grid', gap: 10 }}>
                  {selectedBill.bill_items?.map(item => (
                    <div key={item.product_id} onClick={() => selectItem(item)} style={{ padding: 15, background: '#220909', borderRadius: 10, cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                       <div>{item.product?.product_name} (Qty: {item.quantity})</div>
                       <div style={{ color: '#ffb7b0' }}>Select →</div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {step === 2 && selectedItem && preview && (
            <div>
               <h2>Quantity to Return</h2>
               <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <button 
                    onClick={() => updateQuantity(quantity - 1)} 
                    disabled={quantity <= 1} 
                    style={{ padding: '8px 16px', fontSize: 18, background: '#3a0d0d', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                  >
                    -
                  </button>
                  <input 
                    type="number" 
                    value={quantity} 
                    onChange={(e) => updateQuantity(e.target.value)}
                    style={{ width: 80, padding: 10, fontSize: 20, textAlign: 'center', background: '#000', color: '#fff', border: '1px solid #444', borderRadius: 8 }}
                  />
                  <button 
                    onClick={() => updateQuantity(quantity + 1)} 
                    disabled={quantity >= preview.max_returnable} 
                    style={{ padding: '8px 16px', fontSize: 18, background: '#3a0d0d', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                  >
                    +
                  </button>
                  <span style={{ opacity: 0.6, fontSize: 14 }}>Max: {preview.max_returnable}</span>
               </div>
               <textarea 
                 value={destinationNote} 
                 onChange={(e) => setDestinationNote(e.target.value)} 
                 placeholder="Notes..."
                 style={{ width: '100%', padding: 12, borderRadius: 8, background: '#000', color: '#fff', height: 80 }}
               />
               <button onClick={() => setStep(3)} style={{ marginTop: 20, padding: 15, width: '100%', background: '#800000', color: '#fff', borderRadius: 10, fontWeight: 'bold' }}>
                  Next: Choose Destination
               </button>
            </div>
          )}

          {step === 3 && (
            <div>
               <h2>Where should it go?</h2>
               <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr' }}>
                  {DESTINATIONS.map(d => (
                    <div key={d.value} onClick={() => setDestination(d.value)} style={{ padding: 15, background: destination === d.value ? '#800000' : '#220909', borderRadius: 10, cursor: 'pointer', border: destination === d.value ? '2px solid #fff' : '2px solid transparent' }}>
                       <strong>{d.label}</strong>
                       <div style={{ fontSize: 11, opacity: 0.7 }}>{d.description}</div>
                    </div>
                  ))}
               </div>
               {destination === 'SUPPLIER' && (
                  <div style={{ marginTop: 20, padding: 15, background: '#330000', borderRadius: 10 }}>
                     <label>Supplier ID</label>
                     <input type="number" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} style={{ width: '100%', padding: 10, marginTop: 5 }} />
                  </div>
               )}
               <button onClick={() => setStep(4)} style={{ marginTop: 20, padding: 15, width: '100%', background: '#800000', color: '#fff', borderRadius: 10, fontWeight: 'bold' }}>
                  Final Preview
               </button>
            </div>
          )}

          {step === 4 && (
            <div>
               <h2>Confirm Return</h2>
               <div style={{ display: 'grid', gap: 10 }}>
                  <div><strong>Product:</strong> {selectedItem.product?.product_name}</div>
                  <div><strong>Quantity:</strong> {quantity}</div>
                  <div><strong>Destination:</strong> {destination}</div>
                  <div style={{ fontSize: 20, marginTop: 10 }}><strong>Refund: Rs. {preview.refund_amount}</strong></div>
               </div>
               <button onClick={submitReturn} disabled={loading} style={{ marginTop: 20, padding: 20, width: '100%', background: '#008000', color: '#fff', borderRadius: 10, fontSize: 18, fontWeight: 'bold' }}>
                  {loading ? 'Processing...' : 'Confirm & Complete Return'}
               </button>
            </div>
          )}

          {step === 5 && successData && (
             <div style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ fontSize: 60 }}>Check</div>
                <h2>Success!</h2>
                <p>Refunded Rs. {successData.refund_amount} for {successData.product_name}</p>
                <button onClick={resetAll} style={{ padding: 15, background: '#800000', color: '#fff', borderRadius: 10 }}>New Return</button>
             </div>
          )}
        </div>

        {step >= 2 && step < 5 && (
          <div style={{ background: '#220909', padding: 20, borderRadius: 16 }}>
             <h3>Summary</h3>
             <hr style={{ opacity: 0.1 }} />
             <div style={{ marginTop: 10 }}>{selectedItem.product?.product_name}</div>
             <div style={{ fontSize: 24, fontWeight: 'bold', marginTop: 10 }}>Rs. {preview.refund_amount}</div>
          </div>
        )}
      </div>

      <div style={{ position: 'fixed', bottom: 10, right: 10, fontSize: 10, opacity: 0.5 }}>
         DEBUG: S:{step} Q:{quantity} M:{preview?.max_returnable}
      </div>
    </div>
  );
}

export default ReturnPage;
