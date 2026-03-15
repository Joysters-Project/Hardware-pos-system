import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';

const BillingSystem = () => {
  const [cart, setCart] = useState([]);
  const [payData, setPayData] = useState({ amountPaid: '', customerName: '', customerPhone: '' });
  const [lastBill, setLastBill] = useState(null);
  const searchInputRef = useRef(null);

  // Totals Calculation
  const subtotal = cart.reduce((acc, i) => acc + (i.unit_price * i.quantity), 0);
  const total = subtotal; // Simplified for this example
  const amountPaid = parseFloat(payData.amountPaid || 0);
  const balance = amountPaid - total;
  const isPartial = amountPaid < total && amountPaid > 0;

  const handleCheckout = async () => {
    if (cart.length === 0) return alert("Cart is empty!");
    if (isPartial && !payData.customerPhone) return alert("Phone required for Partial Payment!");

    try {
      const payload = {
        items: cart,
        subtotal,
        total_amount: total,
        amount_paid: amountPaid,
        balance_due: isPartial ? (total - amountPaid) : 0,
        customer: (isPartial || payData.customerPhone) ? { name: payData.customerName, phone: payData.customerPhone } : null
      };

      const res = await api.post('/bills/create', payload);
      setLastBill(res.data.data);
      setCart([]);
      setPayData({ amountPaid: '', customerName: '', customerPhone: '' });
    } catch (err) { alert(err.response?.data?.error || "Error"); }
  };

  return (
    <div style={{ display: 'flex', height: '90vh', gap: '20px', padding: '20px' }}>
      {/* Left: Cart Area */}
      <div style={{ flex: 2, background: 'white', padding: '20px', borderRadius: '8px' }}>
        <input ref={searchInputRef} placeholder="F1: Search Product..." style={{ width: '100%', padding: '10px', marginBottom: '20px' }} />
        <table style={{ width: '100%' }}>
          <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Action</th></tr></thead>
          <tbody>
            {cart.map((item, idx) => (
              <tr key={idx}><td>{item.product_name}</td><td>{item.quantity}</td><td>${item.unit_price}</td><td><button>X</button></td></tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Right: Payment & Summary Panel (Maroon Theme) */}
      <div style={{ flex: 1, backgroundColor: '#800000', color: 'white', padding: '25px', borderRadius: '8px' }}>
        <h2>Payment Detail</h2>
        <div style={{ marginBottom: '20px' }}>
          <label>Amount Received:</label>
          <input type="number" value={payData.amountPaid} onChange={(e) => setPayData({...payData, amountPaid: e.target.value})} style={{ width: '100%', padding: '10px', color: 'black' }} />
        </div>

        {balance >= 0 ? (
          <h3 style={{ color: '#049104c3' }}>Return Change: ${balance.toFixed(2)}</h3>
        ) : (
          <div style={{ border: '1px solid #ff9900', padding: '10px', marginTop: '10px' }}>
            <p style={{ color: '#ff9900' }}>Partial Payment: ${Math.abs(balance).toFixed(2)} Due</p>
            <input placeholder="Customer Name" onChange={(e) => setPayData({...payData, customerName: e.target.value})} style={{ width: '90%', marginBottom: '5px' }} />
            <input placeholder="Phone (Required)" onChange={(e) => setPayData({...payData, customerPhone: e.target.value})} style={{ width: '90%' }} />
          </div>
        )}

        <div style={{ marginTop: '30px', borderTop: '1px solid white' }}>
          <h1>Total: ${total.toFixed(2)}</h1>
          <button onClick={handleCheckout} style={{ width: '100%', padding: '15px', background: '#28a745', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
            F9: COMPLETE TRANSACTION
          </button>
        </div>
      </div>

      {/* Success Modal */}
      {lastBill && (
        <div className="no-print" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div id="receipt-content" style={{ background: 'white', padding: '30px', width: '300px', color: 'black', textAlign: 'center' }}>
            <h2 style={{ color: '#800000' }}>MATHUMITHAN HARDWARE</h2>
            <hr />
            <p>Bill: {lastBill.bill_no}</p>
            <p>Paid: ${amountPaid.toFixed(2)}</p>
            {lastBill.balance_due > 0 && <p style={{ color: 'red' }}>DUE: ${lastBill.balance_due}</p>}
            <button onClick={() => window.print()}>Print</button>
            <button onClick={() => setLastBill(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingSystem;