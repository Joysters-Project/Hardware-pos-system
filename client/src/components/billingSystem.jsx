import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';

const BillingSystem = () => {
  const [cart, setCart] = useState([]);
  const [payData, setPayData] = useState({ amountPaid: '', customerName: '', customerPhone: '', customerAddress: '' });
  const [customerExists, setCustomerExists] = useState(false);
  const [customerLookupMessage, setCustomerLookupMessage] = useState('');
  const [lastBill, setLastBill] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const searchInputRef = useRef(null);

  const cashierName = localStorage.getItem('cashierName') || localStorage.getItem('username') || 'System User';
  const cashierId = localStorage.getItem('cashierId') || localStorage.getItem('userId') || 'SYS';

  const formatDateTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    return isNaN(date) ? value : date.toLocaleString();
  };

  const generateInvoiceHtml = () => {
    if (!lastBill) return '';

    const rows = lastBill.items?.map((item) => {
      const itemDiscount = parseFloat(item.discount || 0);
      const itemTotal = (item.unit_price * item.quantity) - itemDiscount;
      return `
          <tr>
            <td style="padding:6px 0;border-bottom:1px solid #eee;">
              <div>${item.product_name}</div>
              <div style="font-size:12px;color:#666;">₹${item.unit_price.toFixed(2)} x ${item.quantity}${itemDiscount ? ` - ₹${itemDiscount.toFixed(2)} disc` : ''}</div>
            </td>
            <td style="text-align:center;padding:6px 0;border-bottom:1px solid #eee;">${item.quantity}</td>
            <td style="text-align:right;padding:6px 0;border-bottom:1px solid #eee;">₹${itemTotal.toFixed(2)}</td>
          </tr>`;
    }).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Invoice ${lastBill.bill_no}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #000; }
    .invoice-box { max-width: 560px; margin: auto; padding: 20px; border: 1px solid #ddd; }
    .header { text-align: center; margin-bottom: 16px; }
    .header h2 { color: #800000; margin: 0; }
    .section { margin-bottom: 16px; }
    .section p { margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; padding-bottom: 8px; }
    td { padding: 6px 0; }
    .totals p { margin: 4px 0; }
    .divider { border-top: 1px solid #ccc; margin: 12px 0; }
  </style>
</head>
<body>
  <div class="invoice-box">
    <div class="header">
      <h2>MATHUMITHAN HARDWARE</h2>
      <p>Printed Invoice</p>
    </div>

    <div class="section">
      <p><strong>Bill No:</strong> ${lastBill.bill_no}</p>
      <p><strong>Date / Time:</strong> ${formatDateTime(lastBill.bill_date)}</p>
      ${lastBill.customer?.name ? `<p><strong>Customer:</strong> ${lastBill.customer.name}</p>` : ''}
      ${lastBill.customer?.phone ? `<p><strong>Phone:</strong> ${lastBill.customer.phone}</p>` : ''}
    </div>

    <div class="section">
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th style="text-align:center;">Qty</th>
            <th style="text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>

    <div class="divider"></div>

    <div class="section totals">
      <p><strong>Subtotal:</strong> ₹${(lastBill.subtotal ?? 0).toFixed(2)}</p>
      <p><strong>Discount:</strong> ₹${(lastBill.discount ?? 0).toFixed(2)}</p>
      <p><strong>Total:</strong> ₹${(lastBill.total_amount ?? 0).toFixed(2)}</p>
      <p><strong>Amount Paid:</strong> ₹${(lastBill.amount_paid ?? 0).toFixed(2)}</p>
      <p><strong>Returned:</strong> ₹${(lastBill.change_returned ?? 0).toFixed(2)}</p>
      ${lastBill.due_amount > 0 ? `<p style="color:#d9534f;"><strong>Partial Paid:</strong> ₹${(lastBill.amount_paid ?? 0).toFixed(2)}</p><p style="color:#d9534f;"><strong>Due:</strong> ₹${lastBill.due_amount.toFixed(2)}</p>` : ''}
    </div>

    <div class="divider"></div>

    <div class="section">
      <p><strong>Cashier:</strong> ${lastBill.cashier_name}</p>
      <p><strong>Cashier ID:</strong> ${lastBill.cashier_id}</p>
    </div>

    <div class="section">
      <p>Thank you for shopping with us!</p>
    </div>
  </div>
</body>
</html>`;
  };

  const handleDownloadInvoice = () => {
    if (!lastBill) return;
    const invoiceHtml = generateInvoiceHtml();
    const blob = new Blob([invoiceHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoice-${lastBill.bill_no || 'receipt'}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Search for products
  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    try {
      const res = await api.get(`/products/search?q=${query}`);
      const activeResults = res.data.filter(product => ([0, '0', 'active', 'Active', 'ACTIVE'].includes(product.status)) && product.stock_quantity > 0);
      setSearchResults(activeResults);
      setShowResults(activeResults.length > 0);
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults([]);
    }
  };

  const isProductActive = (product) => ([0, '0', 'active', 'Active', 'ACTIVE'].includes(product.status));

  const lookupCustomerByPhone = async (phone) => {
    if (!phone.trim()) {
      setCustomerExists(false);
      setCustomerLookupMessage('');
      return;
    }

    try {
      const res = await api.get(`/customers?phone=${encodeURIComponent(phone)}`);
      const customer = res.data.data;
      if (customer) {
        setPayData((prev) => ({ ...prev,
          customerName: customer.customer_name,
          customerPhone: phone,
          customerAddress: customer.address || ''
        }));
        setCustomerExists(true);
        setCustomerLookupMessage('Existing customer found');
      } else {
        setCustomerExists(false);
        setCustomerLookupMessage('New customer. Enter name and address to save.');
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setCustomerExists(false);
        setCustomerLookupMessage('New customer. Enter name to save.');
      } else {
        console.error('Customer lookup error:', err);
        setCustomerExists(false);
        setCustomerLookupMessage('Unable to verify customer right now.');
      }
    }
  };

  // Add product to cart
  const handleAddToCart = (product) => {
    if (!isProductActive(product)) {
      return alert(`${product.product_name} is unavailable.`);
    }
    if (product.stock_quantity <= 0) {
      return alert(`${product.product_name} is out of stock.`);
    }

    const existingItem = cart.find(item => item.product_id === product.product_id);
    
    if (existingItem) {
      setCart(cart.map(item =>
        item.product_id === product.product_id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        product_id: product.product_id,
        product_name: product.product_name,
        unit_price: parseFloat(product.unit_price),
        price: parseFloat(product.unit_price),
        quantity: 1
      }]);
    }

    setSearchQuery('');
    setShowResults(false);
  };

  // Remove product from cart
  const handleRemoveFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  // Update quantity
  const handleUpdateQty = (index, newQty) => {
    if (!Number.isFinite(newQty) || newQty <= 0) {
      // if invalid number or empty value, reset to 1 at minimum
      setCart(cart.map((item, i) =>
        i === index ? { ...item, quantity: 1 } : item
      ));
      return;
    }
    setCart(cart.map((item, i) =>
      i === index ? { ...item, quantity: newQty } : item
    ));
  };

  // Totals Calculation
  const subtotal = cart.reduce((acc, i) => acc + (i.unit_price * i.quantity), 0);
  const total = subtotal; // Simplified for this example
  const amountPaid = Number(payData.amountPaid);
  const amountPaidValue = Number.isFinite(amountPaid) ? amountPaid : 0;
  const balance = amountPaidValue - total;
  const isPartial = amountPaidValue < total && amountPaidValue > 0;

  const handleCheckout = async () => {
    if (cart.length === 0) return alert("Cart is empty!");
    if (isPartial && !payData.customerPhone) return alert("Phone required for Partial Payment!");
    if (isPartial && !customerExists && !payData.customerName.trim()) return alert("Customer name required for new customer partial payment!");
    if (isPartial && !customerExists && !payData.customerAddress.trim()) return alert("Customer address required for new customer partial payment!");

    try {
      const payload = {
        items: cart.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.unit_price,
          discount: item.discount || 0
        })),
        subtotal,
        total_amount: total,
        discount: 0,
        amount_paid: amountPaidValue,
        balance_due: isPartial ? Math.abs(balance) : 0,
        customer: payData.customerPhone ? { name: payData.customerName, phone: payData.customerPhone, address: payData.customerAddress } : null,
      };

      const res = await api.post('/bills', payload);
      setLastBill({
        ...res.data.data,
        items: cart,
        amount_paid: amountPaidValue,
        change_returned: balance >= 0 ? balance : 0,
        due_amount: isPartial ? Math.abs(balance) : 0,
        cashier_name: cashierName,
        cashier_id: cashierId,
        customer: payData.customerPhone ? { name: payData.customerName, phone: payData.customerPhone } : null,
      });
      setCart([]);
      setPayData({ amountPaid: '', customerName: '', customerPhone: '' });
    } catch (err) { alert(err.response?.data?.error || "Error"); }
  };

  return (
    <div style={{ display: 'flex', height: '90vh', gap: '20px', padding: '20px' }}>
      {/* Left: Cart Area */}
      <div style={{ flex: 2, background: 'white', padding: '20px', borderRadius: '8px' }}>
        <div style={{ position: 'relative', marginBottom: '20px' }}>
          <input 
            ref={searchInputRef}
            placeholder="F1: Search Product..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            style={{ width: '100%', padding: '10px', marginBottom: '10px', fontSize: '14px' }}
          />
          
          {/* Search Results Dropdown */}
          {showResults && searchResults.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '45px',
              left: 0,
              right: 0,
              background: '#f9f9f9',
              border: '1px solid #ddd',
              borderRadius: '4px',
              maxHeight: '200px',
              overflowY: 'auto',
              zIndex: 10
            }}>
              {searchResults.map((product) => (
                <div
                  key={product.product_id}
                  onClick={() => handleAddToCart(product)}
                  style={{
                    padding: '10px',
                    borderBottom: '1px solid #eee',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                  onMouseEnter={(e) => e.target.parentElement.style.background = '#f0f0f0'}
                  onMouseLeave={(e) => e.target.parentElement.style.background = '#f9f9f9'}
                >
                  <span><strong>{product.product_name}</strong> - Stock: {product.stock_quantity}</span>
                  <span style={{ color: '#800000', fontWeight: 'bold' }}>₹{product.unit_price}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #800000' }}>
              <th style={{ textAlign: 'left', padding: '10px' }}>Item</th>
              <th style={{ textAlign: 'center', padding: '10px' }}>Qty</th>
              <th style={{ textAlign: 'right', padding: '10px' }}>Price</th>
              <th style={{ textAlign: 'right', padding: '10px' }}>Total</th>
              <th style={{ textAlign: 'center', padding: '10px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {cart.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                  No items in cart. Search and add products.
                </td>
              </tr>
            ) : (
              cart.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px' }}>{item.product_name}</td>
                  <td style={{ textAlign: 'center', padding: '10px' }}>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (Number.isNaN(val)) return;
                        handleUpdateQty(idx, Math.floor(val));
                      }}
                      style={{ width: '50px', padding: '5px' }}
                    />
                  </td>
                  <td style={{ textAlign: 'right', padding: '10px' }}>₹{item.unit_price.toFixed(2)}</td>
                  <td style={{ textAlign: 'right', padding: '10px' }}>₹{(item.unit_price * item.quantity).toFixed(2)}</td>
                  <td style={{ textAlign: 'center', padding: '10px' }}>
                    <button
                      onClick={() => handleRemoveFromCart(idx)}
                      style={{
                        background: '#ca2a3a',
                        color: 'white',
                        border: 'none',
                        padding: '5px 10px',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Right: Payment & Summary Panel (Maroon Theme) */}
      <div style={{ flex: 1, backgroundColor: '#800000', color: 'white', padding: '25px', borderRadius: '8px' }}>
        <h2>Payment Detail</h2>
        <div style={{ marginBottom: '20px' }}>
          <label>Subtotal:</label>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>₹{subtotal.toFixed(2)}</div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="amountPaid">Amount Received:</label>
          <input
            id="amountPaid"
            name="amountPaid"
            type="number"
            value={payData.amountPaid || ''}
            onChange={(e) => setPayData({...payData, amountPaid: e.target.value})}
            style={{ width: '100%', padding: '10px', color: 'black', marginTop: '5px' }}
            min="0"
            step="0.01"
          />
        </div>

        {balance >= 0 ? (
          <h3 style={{ color: '#049104c3' }}>Return Change: ₹{balance.toFixed(2)}</h3>
        ) : (
          <div style={{ border: '1px solid #ff9900', padding: '10px', marginTop: '10px', borderRadius: '4px' }}>
            <p style={{ color: '#ff9900', margin: '5px 0' }}>Partial Payment: ₹{Math.abs(balance).toFixed(2)} Due</p>
            <label htmlFor="customerName">Customer Name</label>
            <input
              id="customerName"
              name="customerName"
              placeholder="Customer Name"
              value={payData.customerName || ''}
              onChange={(e) => setPayData({...payData, customerName: e.target.value})}
              style={{ width: '100%', marginBottom: '5px', padding: '5px', color: 'black' }}
              readOnly={customerExists}
            />
            <label htmlFor="customerPhone">Phone (Required)</label>
            <input
              id="customerPhone"
              name="customerPhone"
              placeholder="Phone (Required)"
              value={payData.customerPhone || ''}
              onChange={(e) => {
                const phone = e.target.value;
                setPayData((prev) => ({ ...prev, customerPhone: phone }));
                setCustomerExists(false);
                setCustomerLookupMessage('');
              }}
              onBlur={(e) => lookupCustomerByPhone(e.target.value)}
              style={{ width: '100%', padding: '5px', color: 'black' }}
            />
            <label htmlFor="customerAddress">Address</label>
            <textarea
              id="customerAddress"
              name="customerAddress"
              placeholder="Customer Address"
              value={payData.customerAddress || ''}
              onChange={(e) => setPayData({...payData, customerAddress: e.target.value})}
              style={{ width: '100%', minHeight: '70px', marginBottom: '5px', padding: '5px', color: 'black' }}
              readOnly={customerExists}
            />
            {customerLookupMessage && (
              <p style={{ margin: '4px 0', fontSize: '12px', color: customerExists ? '#2c662d' : '#d98324' }}>
                {customerLookupMessage}
              </p>
            )}
          </div>
        )}

        <div style={{ marginTop: '30px', borderTop: '1px solid white', paddingTop: '20px' }}>
          <h1 style={{ margin: '10px 0', fontSize: '32px' }}>₹{total.toFixed(2)}</h1>
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0}
            style={{
              width: '100%',
              padding: '15px',
              background: cart.length === 0 ? '#666' : '#28a745',
              border: 'none',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '16px',
              cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
              borderRadius: '4px'
            }}
          >
            F9: COMPLETE TRANSACTION
          </button>
        </div>
      </div>

      {/* Success Modal */}
      {lastBill && (
        <>
          <div className="no-print" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', zIndex: 1000 }} />
          <div id="receipt-content" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'white', padding: '30px', width: '420px', color: 'black', textAlign: 'left', borderRadius: '8px', zIndex: 1001 }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: '#800000', margin: '0' }}>MATHUMITHAN HARDWARE</h2>
              <p style={{ margin: '4px 0 0' }}>Printed Invoice</p>
            </div>
            <div style={{ borderBottom: '1px solid #ccc', paddingBottom: '12px', marginBottom: '12px' }}>
              <p style={{ margin: '4px 0' }}><strong>Bill No:</strong> {lastBill.bill_no}</p>
              <p style={{ margin: '4px 0' }}><strong>Date / Time:</strong> {formatDateTime(lastBill.bill_date)}</p>
              {lastBill.customer?.name && <p style={{ margin: '4px 0' }}><strong>Customer:</strong> {lastBill.customer.name}</p>}
              {lastBill.customer?.phone && <p style={{ margin: '4px 0' }}><strong>Phone:</strong> {lastBill.customer.phone}</p>}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', paddingBottom: '8px' }}>Item</th>
                    <th style={{ textAlign: 'center', paddingBottom: '8px' }}>Qty</th>
                    <th style={{ textAlign: 'right', paddingBottom: '8px' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lastBill.items?.map((item, idx) => {
                    const itemDiscount = parseFloat(item.discount || 0);
                    const itemTotal = (item.unit_price * item.quantity) - itemDiscount;
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '6px 0' }}>
                          <div>{item.product_name}</div>
                          <div style={{ fontSize: '12px', color: '#666' }}>₹{item.unit_price.toFixed(2)} x {item.quantity}{itemDiscount ? ` - ₹${itemDiscount.toFixed(2)} disc` : ''}</div>
                        </td>
                        <td style={{ textAlign: 'center', padding: '6px 0' }}>{item.quantity}</td>
                        <td style={{ textAlign: 'right', padding: '6px 0' }}>₹{itemTotal.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ borderTop: '1px solid #ccc', paddingTop: '12px', marginBottom: '12px' }}>
              <p style={{ margin: '4px 0' }}><strong>Subtotal:</strong> ₹{lastBill.subtotal?.toFixed(2)}</p>
              <p style={{ margin: '4px 0' }}><strong>Discount:</strong> ₹{(lastBill.discount || 0).toFixed(2)}</p>
              <p style={{ margin: '4px 0' }}><strong>Total:</strong> ₹{lastBill.total_amount?.toFixed(2)}</p>
              <p style={{ margin: '4px 0' }}><strong>Amount Paid:</strong> ₹{(lastBill.amount_paid ?? 0).toFixed(2)}</p>
              <p style={{ margin: '4px 0' }}><strong>Returned:</strong> ₹{(lastBill.change_returned ?? 0).toFixed(2)}</p>
              {lastBill.due_amount > 0 && (
                <>
                  <p style={{ margin: '4px 0', color: '#d9534f' }}><strong>Partial Paid:</strong> ₹{(lastBill.amount_paid ?? 0).toFixed(2)}</p>
                  <p style={{ margin: '4px 0', color: '#d9534f' }}><strong>Due:</strong> ₹{lastBill.due_amount?.toFixed(2)}</p>
                </>
              )}
            </div>

            <div style={{ borderTop: '1px solid #ccc', paddingTop: '12px', marginBottom: '16px' }}>
              <p style={{ margin: '4px 0' }}><strong>Cashier:</strong> {lastBill.cashier_name}</p>
              <p style={{ margin: '4px 0' }}><strong>Cashier ID:</strong> {lastBill.cashier_id}</p>
            </div>

            <div className="no-print" style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => window.print()} style={{ flex: 1, padding: '10px', background: '#800000', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>Print</button>
              <button onClick={handleDownloadInvoice} style={{ flex: 1, padding: '10px', background: '#007bff', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>Download</button>
              <button onClick={() => setLastBill(null)} style={{ flex: 1, padding: '10px', background: '#999', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>Close</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default BillingSystem;