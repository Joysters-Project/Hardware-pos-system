import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import '../../styles/Returns.css';

export default function ReturnList() {
  const { role } = useAuth();
  const [returnsList, setReturnsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [selectedReturn, setSelectedReturn] = useState(null);

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (filterStatus) query.append('status', filterStatus);
      if (filterType) query.append('return_type', filterType);

      const token = localStorage.getItem('token');
      const res = await fetch(`/api/returns?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setReturnsList(data.data || []);
      } else {
        toast.error(data.error || 'Failed to fetch returns');
      }
    } catch (err) {
      toast.error('Network error fetching returns history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, [filterStatus, filterType]);

  const handleStatusChange = async (returnId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/returns/${returnId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Return status updated to ${newStatus}`);
        fetchReturns();
        if (selectedReturn && selectedReturn.return_id === returnId) {
          setSelectedReturn(prev => ({ ...prev, status: newStatus }));
        }
      } else {
        toast.error(data.error || 'Failed to update status');
      }
    } catch (err) {
      toast.error('Error updating status');
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || 'COMPLETED').toUpperCase();
    let bg = '#e2e8f0';
    let color = '#475569';
    if (s === 'COMPLETED') { bg = '#dcfce7'; color = '#166534'; }
    else if (s === 'SENT_TO_SUPPLIER') { bg = '#fef3c7'; color = '#92400e'; }
    else if (s === 'APPROVED') { bg = '#dbeafe'; color = '#1e40af'; }
    else if (s === 'REQUESTED') { bg = '#f3e8ff'; color = '#6b21a8'; }
    else if (s === 'REPAIRED') { bg = '#ccfbf1'; color = '#115e59'; }
    else if (s === 'REJECTED') { bg = '#fee2e2'; color = '#991b1b'; }

    return (
      <span className="ret-badge" style={{ backgroundColor: bg, color: color, padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
        {s}
      </span>
    );
  };

  return (
    <div className="retlog-container" style={{ padding: 0 }}>
      {/* Filters Bar */}
      <div className="retlog-filters" style={{ marginTop: '16px' }}>
        <label>
          Filter Status:
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="REQUESTED">REQUESTED</option>
            <option value="APPROVED">APPROVED</option>
            <option value="SENT_TO_SUPPLIER">SENT_TO_SUPPLIER</option>
            <option value="REPAIRED">REPAIRED</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </label>

        <label>
          Filter Type:
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            <option value="REFUND">REFUND</option>
            <option value="REPAIR">REPAIR</option>
            <option value="EXCHANGE">EXCHANGE</option>
            <option value="SUPPLIER_RETURN">SUPPLIER_RETURN</option>
          </select>
        </label>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Loading returns history...</div>
      ) : returnsList.length === 0 ? (
        <div className="retlog-empty">No return records found for the selected filters.</div>
      ) : (
        <div className="retlog-list">
          {returnsList.map((ret) => (
            <div key={ret.return_id} className="retlog-card">
              <div className="retlog-card-header">
                <div className="retlog-card-meta">
                  <div className="retlog-meta-item">
                    <span className="meta-label">RETURN #</span>
                    <span className="meta-value accent">RET-{ret.return_id}</span>
                  </div>
                  <div className="retlog-meta-item">
                    <span className="meta-label">INVOICE #</span>
                    <span className="meta-value">{ret.bill_number || `INV-${ret.bill_id}`}</span>
                  </div>
                  <div className="retlog-meta-item">
                    <span className="meta-label">DATE</span>
                    <span className="meta-value">{new Date(ret.return_date || ret.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="retlog-meta-item">
                    <span className="meta-label">TYPE</span>
                    <span className="meta-value">{ret.return_type || 'REFUND'}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {getStatusBadge(ret.status)}
                  <button
                    className="ret-select-all-btn"
                    onClick={() => setSelectedReturn(ret)}
                  >
                    View Details
                  </button>
                </div>
              </div>

              {/* Items summary snippet */}
              <div style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', color: '#555' }}>
                    <strong>Reason:</strong> {ret.reason || 'N/A'}
                  </div>
                  <div style={{ fontSize: '13px', color: '#777', marginTop: '4px' }}>
                    <strong>Items Returned:</strong>{' '}
                    {ret.items?.map(i => `${i.product?.product_name || 'Product'} (x${i.return_quantity || i.quantity || 1}) - ${i.action || 'REFUND'}`).join(', ')}
                  </div>
                </div>

                <div className="retlog-refund">
                  <span className="meta-label">TOTAL REFUND</span>
                  <span className="meta-value" style={{ color: '#4caf50' }}>
                    LKR {parseFloat(ret.total_refund_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Return Details Modal */}
      {selectedReturn && (
        <div className="ret-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', maxWidth: '650px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
              <h2 style={{ margin: 0, color: '#800000', fontSize: '20px' }}>
                Return Details - RET-{selectedReturn.return_id}
              </h2>
              <button 
                onClick={() => setSelectedReturn(null)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#666' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', fontSize: '14px', color: '#333' }}>
              <div><strong>Invoice No:</strong> {selectedReturn.bill_number || `INV-${selectedReturn.bill_id}`}</div>
              <div><strong>Date:</strong> {new Date(selectedReturn.return_date || selectedReturn.createdAt).toLocaleString()}</div>
              <div><strong>Return Type:</strong> {selectedReturn.return_type || 'REFUND'}</div>
              <div>
                <strong>Status:</strong> {getStatusBadge(selectedReturn.status)}
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <strong>Reason:</strong> {selectedReturn.reason || 'N/A'}
              </div>
            </div>

            {/* Manager / Admin status changer */}
            {['admin', 'manager'].includes((role || '').toLowerCase()) && (
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '6px' }}>
                  Update Return Status:
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {['REQUESTED', 'APPROVED', 'SENT_TO_SUPPLIER', 'REPAIRED', 'COMPLETED', 'REJECTED'].map(st => (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(selectedReturn.return_id, st)}
                      style={{
                        padding: '5px 10px',
                        fontSize: '12px',
                        borderRadius: '4px',
                        border: selectedReturn.status === st ? '2px solid #800000' : '1px solid #ccc',
                        background: selectedReturn.status === st ? '#800000' : 'white',
                        color: selectedReturn.status === st ? 'white' : '#333',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <h3 style={{ fontSize: '16px', color: '#333', marginTop: '16px', marginBottom: '10px' }}>Items Returned</h3>
            <div style={{ border: '1px solid #e0e0e0', borderRadius: '6px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead style={{ background: '#f5f5f5', color: '#555', textAlign: 'left' }}>
                  <tr>
                    <th style={{ padding: '8px 12px' }}>Product</th>
                    <th style={{ padding: '8px 12px' }}>Qty</th>
                    <th style={{ padding: '8px 12px' }}>Condition</th>
                    <th style={{ padding: '8px 12px' }}>Action</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Refund</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedReturn.items?.map((item) => (
                    <tr key={item.return_item_id} style={{ borderTop: '1px solid #eee' }}>
                      <td style={{ padding: '8px 12px', fontWeight: '500' }}>{item.product?.product_name || `Product #${item.product_id}`}</td>
                      <td style={{ padding: '8px 12px' }}>{item.return_quantity || item.quantity || 1}</td>
                      <td style={{ padding: '8px 12px' }}>{item.condition || 'DEFECTIVE'}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                          {item.action || 'REFUND'}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 'bold' }}>
                        LKR {parseFloat(item.refund_amount || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button 
                onClick={() => setSelectedReturn(null)}
                style={{ background: '#800000', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
