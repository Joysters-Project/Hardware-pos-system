import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import '../../styles/Returns.css';

export default function SupplierServiceTracking() {
  const { role } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedService, setSelectedService] = useState(null);
  const [returnToStock, setReturnToStock] = useState(true);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (filterStatus) query.append('status', filterStatus);

      const token = localStorage.getItem('token');
      const res = await fetch(`/api/supplier-services?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setServices(data.data || []);
      } else {
        toast.error(data.error || 'Failed to fetch supplier service records');
      }
    } catch (err) {
      toast.error('Network error fetching supplier services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [filterStatus]);

  const handleUpdateStatus = async (serviceId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/supplier-services/${serviceId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: newStatus,
          return_to_stock: returnToStock
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Service status updated to ${newStatus}`);
        setSelectedService(null);
        fetchServices();
      } else {
        toast.error(data.error || 'Failed to update service status');
      }
    } catch (err) {
      toast.error('Error updating supplier service status');
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || 'PENDING').toUpperCase();
    let bg = '#fef3c7';
    let color = '#92400e';
    if (s === 'SENT') { bg = '#dbeafe'; color = '#1e40af'; }
    else if (s === 'COMPLETED') { bg = '#dcfce7'; color = '#166534'; }

    return (
      <span style={{ backgroundColor: bg, color: color, padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
        {s}
      </span>
    );
  };

  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#333' }}>Supplier Repair & Warranty Services</h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#666' }}>
            Track products sent to suppliers for free warranty repair, paid repair, or replacement
          </p>
        </div>

        <div className="retlog-filters">
          <label>
            Filter Status:
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">All Services</option>
              <option value="PENDING">PENDING</option>
              <option value="SENT">SENT</option>
              <option value="COMPLETED">COMPLETED</option>
            </select>
          </label>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Loading supplier services...</div>
      ) : services.length === 0 ? (
        <div className="retlog-empty">No supplier repair or exchange records found.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
          {services.map((item) => {
            const product = item.return_item?.product;
            const supplier = item.supplier;
            const returnItem = item.return_item;

            return (
              <div key={item.id} className="ret-item-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#888', fontWeight: 'bold', textTransform: 'uppercase' }}>
                      SERVICE RECORD #{item.id}
                    </span>
                    <h3 style={{ margin: '2px 0 0', fontSize: '16px', color: '#800000' }}>
                      {product?.product_name || `Product #${returnItem?.product_id}`}
                    </h3>
                  </div>
                  {getStatusBadge(item.status)}
                </div>

                <div style={{ fontSize: '13px', color: '#555', background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div><strong>Supplier:</strong> {supplier?.supplier_name || `Supplier #${item.supplier_id}`}</div>
                  <div><strong>Service Type:</strong> {item.service_type || 'REPAIR'}</div>
                  <div><strong>Quantity:</strong> {returnItem?.return_quantity || returnItem?.quantity || 1} units ({returnItem?.condition || 'DEFECTIVE'})</div>
                </div>

                <div style={{ fontSize: '13px', color: '#333' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0' }}>
                    <span>Repair Cost:</span>
                    <span>LKR {parseFloat(item.repair_cost || 0).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0' }}>
                    <span>Warranty Discount:</span>
                    <span>{parseFloat(item.discount_percentage || 0)}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', margin: '6px 0 0', fontWeight: 'bold', borderTop: '1px dashed #ccc', paddingTop: '6px', color: '#800000' }}>
                    <span>Customer Pays:</span>
                    <span>LKR {parseFloat(item.customer_payment || 0).toFixed(2)}</span>
                  </div>
                </div>

                {['admin', 'manager'].includes((role || '').toLowerCase()) && item.status !== 'COMPLETED' && (
                  <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #eee', display: 'flex', gap: '8px' }}>
                    {item.status === 'PENDING' && (
                      <button
                        onClick={() => handleUpdateStatus(item.id, 'SENT')}
                        style={{ flex: 1, background: '#1e40af', color: 'white', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                      >
                        Mark as Sent to Supplier
                      </button>
                    )}
                    {item.status === 'SENT' && (
                      <button
                        onClick={() => setSelectedService(item)}
                        style={{ flex: 1, background: '#166534', color: 'white', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                      >
                        Complete Repair / Receive
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Complete Repair Modal */}
      {selectedService && (
        <div className="ret-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', maxWidth: '480px', width: '90%' }}>
            <h3 style={{ margin: '0 0 12px', color: '#800000', fontSize: '18px' }}>
              Complete Supplier Service #{selectedService.id}
            </h3>
            <p style={{ fontSize: '14px', color: '#555', marginBottom: '16px' }}>
              Receiving <strong>{selectedService.return_item?.product?.product_name}</strong> back from supplier.
            </p>

            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '6px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#333', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={returnToStock}
                  onChange={(e) => setReturnToStock(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#800000' }}
                />
                Return item to active store inventory (Available Stock)
              </label>
              <p style={{ margin: '6px 0 0 28px', fontSize: '12px', color: '#777' }}>
                Uncheck if the repaired/replaced item was directly handed back to the customer.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedService(null)}
                style={{ background: '#e2e8f0', color: '#333', border: 'none', padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateStatus(selectedService.id, 'COMPLETED')}
                style={{ background: '#166534', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Confirm Completion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
