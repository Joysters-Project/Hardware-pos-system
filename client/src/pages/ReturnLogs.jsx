import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/axios';
import { Link } from 'react-router-dom';

function ReturnLogs() {
  const { role } = useAuth();
  const [returnsData, setReturnsData] = useState([]);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isAuthorized = ['manager', 'admin'].includes(role?.toLowerCase());

  useEffect(() => {
    if (!isAuthorized) return;
    fetchReturns();
  }, [filter, isAuthorized]);

  const fetchReturns = async () => {
    setLoading(true);
    setError('');
    try {
      const params = filter ? { destination: filter } : {};
      const response = await api.get('/returns', { params });
      setReturnsData(response.data?.data || []);
    } catch (err) {
      setReturnsData([]);
      setError(err.response?.data?.message || err.response?.data?.error || 'Unable to load return logs');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div style={{ padding: 32, color: '#f5ecec' }}>
        <h2>Access Denied</h2>
        <p>Return logs are only available to Manager and Admin users.</p>
        <Link to="/returns" style={{ color: '#ffbf00' }}>Back to Return Workflow</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: 32, minHeight: '100vh', background: '#0f0606', color: '#f8ecec' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2>Return Logs</h2>
          <p style={{ margin: 0, color: '#d7c0c0' }}>Review processed returns, supplier returns, and write-off history.</p>
        </div>
        <Link to="/returns" style={{ background: '#3f0f0f', color: '#f8fafc', padding: '10px 14px', borderRadius: 10, textDecoration: 'none', border: '1px solid #6f1010' }}>
          New Return
        </Link>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          Filter by destination:
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: 10, borderRadius: 8, border: '1px solid #4f0f0f', background: '#1b0707', color: '#f5ecec' }}>
            <option value="">All</option>
            <option value="STOCK">Stock</option>
            <option value="REPAIR">Repair</option>
            <option value="SUPPLIER">Supplier</option>
            <option value="WRITEOFF">Write Off</option>
          </select>
        </label>
      </div>

      {error && <div style={{ color: '#ff7f7f', marginBottom: 16 }}>{error}</div>}
      {loading ? (
        <div>Loading return logs...</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #3f0f0f' }}>
                <th style={{ padding: 12, color: '#e7e2e2' }}>Return ID</th>
                <th style={{ padding: 12, color: '#e7e2e2' }}>Bill No</th>
                <th style={{ padding: 12, color: '#e7e2e2' }}>Product</th>
                <th style={{ padding: 12, color: '#e7e2e2' }}>Qty</th>
                <th style={{ padding: 12, color: '#e7e2e2' }}>Refund</th>
                <th style={{ padding: 12, color: '#e7e2e2' }}>Destination</th>
                <th style={{ padding: 12, color: '#e7e2e2' }}>Supplier / PO</th>
                <th style={{ padding: 12, color: '#e7e2e2' }}>Debit Note</th>
                <th style={{ padding: 12, color: '#e7e2e2' }}>Status</th>
                <th style={{ padding: 12, color: '#e7e2e2' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {returnsData.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ padding: 16, color: '#d7c0c0' }}>No return records found.</td>
                </tr>
              ) : (
                returnsData.map((record) => (
                  <tr key={record.return_id} style={{ borderBottom: '1px solid #2e0a0a' }}>
                    <td style={{ padding: 12 }}>{record.return_id}</td>
                    <td style={{ padding: 12 }}>{record.bill?.bill_no || 'N/A'}</td>
                    <td style={{ padding: 12 }}>{record.product?.product_name || 'N/A'}</td>
                    <td style={{ padding: 12 }}>{record.return_quantity}</td>
                    <td style={{ padding: 12 }}>Rs. {record.refund_amount}</td>
                    <td style={{ padding: 12 }}>{record.destination}</td>
                    <td style={{ padding: 12 }}>
                      {record.supplier_return?.supplier_id ? `Supplier ${record.supplier_return.supplier_id}` : '—'}
                      {record.po_id ? ` / PO ${record.po_id}` : ''}
                    </td>
                    <td style={{ padding: 12 }}>{record.debit_note_raised ? 'Yes' : 'No'}</td>
                    <td style={{ padding: 12 }}>{record.status || 'Processed'}</td>
                    <td style={{ padding: 12 }}>{new Date(record.return_date || record.created_at || record.updated_at).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ReturnLogs;
