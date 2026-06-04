import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Package, X, Minus, Plus, Trash2, ShoppingCart, CreditCard, Printer, Download, XCircle } from 'lucide-react';
import api from '../api/axios';
import SuccessAnim from './SuccessAnim';
import DashboardLayout from './DashboardLayout';
import '../styles/BillingSystem.css';

const BillingSystem = () => {
  const [cart, setCart] = useState([]);
  const [payData, setPayData] = useState({ amountPaid: '', customerName: '', customerPhone: '', customerAddress: '' });
  const [customerExists, setCustomerExists] = useState(false);
  const [customerLookupMessage, setCustomerLookupMessage] = useState('');
  const [lastBill, setLastBill] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState([]);
  const searchInputRef = useRef(null);
  const navigate = useNavigate();

  // Success Animation state
  const [showSuccess, setShowSuccess] = useState(false);
  const [animSuccess, setAnimSuccess] = useState(false);

  const handleSuccessDismiss = () => {
    setAnimSuccess(false);
    setTimeout(() => {
      setShowSuccess(false);
    }, 300);
  };

  const cashierName = localStorage.getItem('cashierName') || localStorage.getItem('username') || 'System User';
  const cashierId = localStorage.getItem('cashierId') || localStorage.getItem('userId') || 'SYS';

  const formatDateTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    return isNaN(date) ? value : date.toLocaleString();
  };

  // Load catalog products on mount
  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const res = await api.get('/products');
        const products = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        setCatalogProducts(products.filter(p => isProductActive(p)));
      } catch (err) {
        console.error('Failed to load catalog:', err);
      }
    };
    loadCatalog();
  }, []);

  // Keyboard shortcut handlers
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F1') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'F9') {
        e.preventDefault();
        if (cart.length > 0) {
          handleCheckout();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, payData, customerExists]);

  const generateInvoiceHtml = () => {
    if (!lastBill) return '';

    const rows = lastBill.items?.map((item) => {
      const itemDiscount = parseFloat(item.discount || 0);
      const itemTotal = (item.unit_price * item.quantity) - itemDiscount;
      return `
          <tr>
            <td style="padding:6px 0;border-bottom:1px solid #eee;">
              <div>${item.product_name}</div>
              <div style="font-size:12px;color:#666;"><strong>Rs.</strong>${item.unit_price.toFixed(2)} x ${item.quantity}${itemDiscount ? ` - <strong>Rs.</strong>${itemDiscount.toFixed(2)} disc` : ''}</div>
            </td>
            <td style="text-align:center;padding:6px 0;border-bottom:1px solid #eee;">${item.quantity}</td>
            <td style="text-align:right;padding:6px 0;border-bottom:1px solid #eee;"><strong>Rs.</strong>${itemTotal.toFixed(2)}</td>
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
      <p><strong>Subtotal:</strong> <strong>Rs.</strong>${(lastBill.subtotal ?? 0).toFixed(2)}</p>
      <p><strong>Discount:</strong> <strong>Rs.</strong>${(lastBill.discount ?? 0).toFixed(2)}</p>
      <p><strong>Total:</strong> <strong>Rs.</strong>${(lastBill.total_amount ?? 0).toFixed(2)}</p>
      <p><strong>Amount Paid:</strong> <strong>Rs.</strong>${(lastBill.amount_paid ?? 0).toFixed(2)}</p>
      <p><strong>Returned:</strong> <strong>Rs.</strong>${(lastBill.change_returned ?? 0).toFixed(2)}</p>
      ${lastBill.due_amount > 0 ? `<p style="color:#d9534f;"><strong>Partial Paid:</strong> <strong>Rs.</strong>${(lastBill.amount_paid ?? 0).toFixed(2)}</p><p style="color:#d9534f;"><strong>Due:</strong> <strong>Rs.</strong>${lastBill.due_amount.toFixed(2)}</p>` : ''}
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
    const trimmedQuery = query.trim();
    setSearchQuery(query);

    if (!trimmedQuery) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    try {
      const res = await api.get('/products/search', {
        params: { q: trimmedQuery }
      });
      const products = Array.isArray(res.data) ? res.data : [];
      const activeResults = products.filter(product => isProductActive(product));
      setSearchResults(activeResults);
      setShowResults(activeResults.length > 0);
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults([]);
      setShowResults(false);
    }
  };

  const isProductActive = (product) => {
    const activeStatuses = ['active', 'Active', 'ACTIVE'];
    return activeStatuses.includes(product.status);
  };

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
      handleRemoveFromCart(index);
      return;
    }
    setCart(cart.map((item, i) =>
      i === index ? { ...item, quantity: newQty } : item
    ));
  };

  // Totals Calculation
  const subtotal = cart.reduce((acc, i) => acc + (i.unit_price * i.quantity), 0);
  const total = subtotal; 
  const amountPaid = Number(payData.amountPaid);
  const amountPaidValue = Number.isFinite(amountPaid) ? amountPaid : 0;
  const balance = amountPaidValue - total;
  const isPartial = amountPaidValue < total && amountPaidValue > 0;
  const cartItemCount = cart.reduce((acc, i) => acc + i.quantity, 0);

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

      setShowSuccess(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimSuccess(true));
      });

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
      setPayData({ amountPaid: '', customerName: '', customerPhone: '', customerAddress: '' });

      // Reload catalog to reflect updated stock
      try {
        const catRes = await api.get('/products');
        const products = Array.isArray(catRes.data) ? catRes.data : (catRes.data?.data || []);
        setCatalogProducts(products.filter(p => isProductActive(p)));
      } catch (e) { /* silent */ }
    } catch (err) { alert(err.response?.data?.error || "Error"); }
  };

  const getStockClass = (qty) => {
    if (qty <= 0) return 'out-of-stock';
    if (qty <= 10) return 'low-stock';
    return '';
  };

  const getStockLabel = (qty) => {
    if (qty <= 0) return 'Out of Stock';
    if (qty <= 10) return `Low: ${qty}`;
    return `In Stock: ${qty}`;
  };

  return (
    <DashboardLayout active="billing">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">
            <CreditCard size={24} />
            Billing Counter
          </h1>
          <p className="admin-page-subtitle">
            Process sales, manage cart & complete transactions
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="pos-search-kbd" style={{ padding: '6px 12px', fontSize: '12px' }}>
            Cashier: {cashierName}
          </div>
        </div>
      </div>

      {/* POS Terminal Layout */}
      <div className="pos-terminal">
        {/* ═══ LEFT PANEL: Search + Product Catalog ═══ */}
        <div className="pos-left">
          {/* Search Bar */}
          <div className="pos-search-container">
            <div className="pos-search-bar">
              <Search size={18} className="pos-search-icon" />
              <input
                ref={searchInputRef}
                className="pos-search-input"
                placeholder="Search products by name, barcode, SKU..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                id="pos-search"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setShowResults(false); setSearchResults([]); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pos-text-muted)', padding: '4px', display: 'flex' }}
                >
                  <X size={16} />
                </button>
              )}
              <span className="pos-search-kbd">F1</span>
            </div>

            {/* Search Results Dropdown */}
            {showResults && searchResults.length > 0 && (
              <div className="pos-search-dropdown">
                {searchResults.map((product) => (
                  <div
                    key={product.product_id}
                    className="pos-search-result"
                    onClick={() => handleAddToCart(product)}
                  >
                    <div className="pos-search-result__icon">
                      <Package size={18} />
                    </div>
                    <div className="pos-search-result__info">
                      <div className="pos-search-result__name">{product.product_name}</div>
                      <div className="pos-search-result__meta">
                        {product.product_code && `Code: ${product.product_code}`}
                        {product.product_code && product.barcode && ' · '}
                        {product.barcode && `Barcode: ${product.barcode}`}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="pos-search-result__price">Rs.{parseFloat(product.unit_price).toFixed(2)}</div>
                      <div className={`pos-search-result__stock ${product.stock_quantity <= 10 ? 'low' : ''}`}>
                        Stock: {product.stock_quantity}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {searchQuery.trim() && !showResults && searchResults.length === 0 && (
              <div className="pos-search-dropdown">
                <div className="pos-search-empty">
                  <div className="pos-search-empty-icon">🔍</div>
                  No products found for "{searchQuery.trim()}"
                </div>
              </div>
            )}
          </div>

          {/* Product Catalog Grid */}
          <div className="pos-catalog">
            <div className="pos-catalog__header">
              <div className="pos-catalog__title">
                <Package size={16} />
                Product Catalog
                <span className="pos-catalog__count">{catalogProducts.length}</span>
              </div>
            </div>

            {catalogProducts.length === 0 ? (
              <div className="pos-catalog__empty">
                <div className="pos-catalog__empty-icon">📦</div>
                <div className="pos-catalog__empty-text">No products available</div>
                <div className="pos-catalog__empty-sub">Add products from the Products page</div>
              </div>
            ) : (
              <div className="pos-catalog__grid">
                {catalogProducts.map((product) => (
                  <div
                    key={product.product_id}
                    className="pos-product-card"
                    onClick={() => handleAddToCart(product)}
                    title={`Add ${product.product_name} to cart`}
                  >
                    <div className="pos-product-card__icon">
                      <Package size={18} />
                    </div>
                    <div className="pos-product-card__name">{product.product_name}</div>
                    <div className="pos-product-card__sku">
                      {product.product_code || product.barcode || `ID: ${product.product_id}`}
                    </div>
                    <div className="pos-product-card__bottom">
                      <div className="pos-product-card__price">
                        Rs.{parseFloat(product.unit_price).toFixed(2)}
                      </div>
                      <div className={`pos-product-card__stock ${getStockClass(product.stock_quantity)}`}>
                        {getStockLabel(product.stock_quantity)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ═══ RIGHT PANEL: Cart + Payment ═══ */}
        <div className="pos-right">
          <div className="pos-cart">
            {/* Cart Header */}
            <div className="pos-cart__header">
              <div className="pos-cart__title">
                <ShoppingCart size={18} />
                Cart
                {cart.length > 0 && (
                  <span className="pos-cart__badge">{cartItemCount}</span>
                )}
              </div>
              {cart.length > 0 && (
                <button className="pos-cart__clear" onClick={() => setCart([])}>
                  Clear All
                </button>
              )}
            </div>

            {/* Cart Items */}
            {cart.length === 0 ? (
              <div className="pos-cart__empty">
                <div className="pos-cart__empty-icon">🛒</div>
                <div className="pos-cart__empty-text">Cart is empty</div>
                <div className="pos-cart__empty-sub">Search or click a product to add</div>
              </div>
            ) : (
              <div className="pos-cart__items">
                {cart.map((item, idx) => (
                  <div key={idx} className="pos-cart__item">
                    <div className="pos-cart__item-info">
                      <div className="pos-cart__item-name">{item.product_name}</div>
                      <div className="pos-cart__item-price-each">Rs.{item.unit_price.toFixed(2)} each</div>
                    </div>
                    <div className="pos-cart__item-controls">
                      <button className="pos-cart__qty-btn" onClick={() => handleUpdateQty(idx, item.quantity - 1)}>
                        <Minus size={12} />
                      </button>
                      <span className="pos-cart__qty-display">{item.quantity}</span>
                      <button className="pos-cart__qty-btn" onClick={() => handleUpdateQty(idx, item.quantity + 1)}>
                        <Plus size={12} />
                      </button>
                    </div>
                    <div className="pos-cart__item-total">
                      Rs.{(item.unit_price * item.quantity).toFixed(2)}
                    </div>
                    <button className="pos-cart__item-remove" onClick={() => handleRemoveFromCart(idx)} title="Remove item">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Payment Summary */}
            <div className="pos-payment">
              <div className="pos-payment__row">
                <span className="pos-payment__label">Subtotal ({cartItemCount} items)</span>
                <span className="pos-payment__value">Rs.{subtotal.toFixed(2)}</span>
              </div>

              <div className="pos-payment__total-row">
                <span className="pos-payment__total-label">Total</span>
                <span className="pos-payment__total-value">Rs.{total.toFixed(2)}</span>
              </div>

              {/* Amount Received */}
              <div className="pos-payment__input-group">
                <label className="pos-payment__input-label" htmlFor="amountPaid">Amount Received</label>
                <div className="pos-payment__input-wrapper">
                  <span className="pos-payment__input-prefix">Rs.</span>
                  <input
                    id="amountPaid"
                    name="amountPaid"
                    className="pos-payment__input"
                    type="number"
                    value={payData.amountPaid || ''}
                    onChange={(e) => setPayData({...payData, amountPaid: e.target.value})}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Change or Due */}
              {amountPaidValue > 0 && (
                balance >= 0 ? (
                  <div className="pos-payment__change positive">
                    <span className="pos-payment__change-label">Change to Return</span>
                    <span className="pos-payment__change-value">Rs.{balance.toFixed(2)}</span>
                  </div>
                ) : (
                  <div className="pos-payment__change negative">
                    <span className="pos-payment__change-label">Balance Due</span>
                    <span className="pos-payment__change-value">Rs.{Math.abs(balance).toFixed(2)}</span>
                  </div>
                )
              )}

              {/* Partial Payment Customer Info */}
              {isPartial && (
                <div className="pos-partial-info">
                  <div>
                    <label className="pos-partial-info__label" htmlFor="customerPhone">Phone (Required)</label>
                    <input
                      id="customerPhone"
                      name="customerPhone"
                      className="pos-partial-info__input"
                      placeholder="07xxxxxxxx"
                      value={payData.customerPhone || ''}
                      onChange={(e) => {
                        const phone = e.target.value;
                        setPayData((prev) => ({ ...prev, customerPhone: phone }));
                        setCustomerExists(false);
                        setCustomerLookupMessage('');
                      }}
                      onBlur={(e) => lookupCustomerByPhone(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="pos-partial-info__label" htmlFor="customerName">Customer Name</label>
                    <input
                      id="customerName"
                      name="customerName"
                      className="pos-partial-info__input"
                      placeholder="Enter customer name"
                      value={payData.customerName || ''}
                      onChange={(e) => setPayData({...payData, customerName: e.target.value})}
                      readOnly={customerExists}
                    />
                  </div>
                  <div>
                    <label className="pos-partial-info__label" htmlFor="customerAddress">Address</label>
                    <input
                      id="customerAddress"
                      name="customerAddress"
                      className="pos-partial-info__input"
                      placeholder="Enter customer address"
                      value={payData.customerAddress || ''}
                      onChange={(e) => setPayData({...payData, customerAddress: e.target.value})}
                      readOnly={customerExists}
                    />
                  </div>
                  {customerLookupMessage && (
                    <p className={`pos-partial-info__message ${customerExists ? 'found' : 'new'}`}>
                      {customerLookupMessage}
                    </p>
                  )}
                </div>
              )}

              {/* Checkout Button */}
              <button
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className={`pos-checkout-btn ${cart.length > 0 ? 'pos-checkout-btn--active' : 'pos-checkout-btn--disabled'}`}
                id="pos-checkout"
              >
                <span className="pos-checkout-btn__kbd">F9</span>
                Complete Transaction
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Success Animation */}
      <SuccessAnim
        show={showSuccess}
        animate={animSuccess}
        onDismiss={handleSuccessDismiss}
        message="Transaction Complete!"
        subMessage={`Bill total: Rs. ${total.toFixed(2)}`}
      />

      {/* Receipt Modal */}
      {lastBill && (
        <div className="pos-receipt-overlay" onClick={(e) => { if (e.target === e.currentTarget) setLastBill(null); }}>
          <div className="pos-receipt-modal" id="receipt-content">
            <div className="pos-receipt__header">
              <h2 className="pos-receipt__store">MATHUMITHAN HARDWARE</h2>
              <p className="pos-receipt__subtitle">Sales Receipt</p>
            </div>

            <div className="pos-receipt__meta">
              <span className="pos-receipt__meta-label">Bill No</span>
              <span className="pos-receipt__meta-value">{lastBill.bill_no}</span>
              <span className="pos-receipt__meta-label">Date / Time</span>
              <span className="pos-receipt__meta-value">{formatDateTime(lastBill.bill_date)}</span>
              {lastBill.customer?.name && (
                <>
                  <span className="pos-receipt__meta-label">Customer</span>
                  <span className="pos-receipt__meta-value">{lastBill.customer.name}</span>
                </>
              )}
              {lastBill.customer?.phone && (
                <>
                  <span className="pos-receipt__meta-label">Phone</span>
                  <span className="pos-receipt__meta-value">{lastBill.customer.phone}</span>
                </>
              )}
            </div>

            <div className="pos-receipt__items">
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th style={{ textAlign: 'center' }}>Qty</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lastBill.items?.map((item, idx) => {
                    const itemDiscount = parseFloat(item.discount || 0);
                    const itemTotal = (item.unit_price * item.quantity) - itemDiscount;
                    return (
                      <tr key={idx}>
                        <td>
                          <div>{item.product_name}</div>
                          <div className="pos-receipt__item-detail">
                            Rs.{item.unit_price.toFixed(2)} × {item.quantity}
                            {itemDiscount ? ` - Rs.${itemDiscount.toFixed(2)} disc` : ''}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                        <td>Rs.{itemTotal.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pos-receipt__totals">
              <div className="pos-receipt__total-row">
                <span>Subtotal</span>
                <span>Rs.{(lastBill.subtotal ?? 0).toFixed(2)}</span>
              </div>
              <div className="pos-receipt__total-row">
                <span>Discount</span>
                <span>Rs.{(lastBill.discount ?? 0).toFixed(2)}</span>
              </div>
              <div className="pos-receipt__total-row grand">
                <span>Total</span>
                <span>Rs.{(lastBill.total_amount ?? 0).toFixed(2)}</span>
              </div>
              <div className="pos-receipt__total-row">
                <span>Amount Paid</span>
                <span>Rs.{(lastBill.amount_paid ?? 0).toFixed(2)}</span>
              </div>
              <div className="pos-receipt__total-row">
                <span>Change</span>
                <span>Rs.{(lastBill.change_returned ?? 0).toFixed(2)}</span>
              </div>
              {lastBill.due_amount > 0 && (
                <div className="pos-receipt__total-row due">
                  <span>Due Balance</span>
                  <span>Rs.{lastBill.due_amount.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="pos-receipt__cashier">
              <div><strong>Cashier:</strong> {lastBill.cashier_name}</div>
              <div><strong>Cashier ID:</strong> {lastBill.cashier_id}</div>
            </div>

            <div className="pos-receipt__actions no-print">
              <button className="pos-receipt__btn pos-receipt__btn--print" onClick={() => window.print()}>
                <Printer size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                Print
              </button>
              <button className="pos-receipt__btn pos-receipt__btn--download" onClick={handleDownloadInvoice}>
                <Download size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                Download
              </button>
              <button className="pos-receipt__btn pos-receipt__btn--close" onClick={() => setLastBill(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default BillingSystem;