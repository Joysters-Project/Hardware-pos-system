import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Package, X, Minus, Plus, Trash2, ShoppingCart, 
  CreditCard, Printer, Download, XCircle, CheckCircle, 
  User, Phone, MapPin, DollarSign, Receipt, Tag, 
  AlertCircle, AlertTriangle, Grid3x3, List, ArrowRight, Sparkles,
  TrendingUp, Clock, Zap, LayoutGrid, ListOrdered
} from 'lucide-react';
import api from '../api/axios';
import { validateSriLankanPhone, filterSriLankanPhoneInput } from '../utils/phoneValidation';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import SuccessAnim from './SuccessAnim';
import DashboardLayout from './DashboardLayout';
import toast from 'react-hot-toast';
import '../styles/BillingSystem.css';

const BillingSystem = () => {
  const [cart, setCart] = useState([]);
  const [payData, setPayData] = useState({ amountPaid: '', customerName: '', customerPhone: '', customerAddress: '' });
  const [customerExists, setCustomerExists] = useState(false);
  const [saveCustomer, setSaveCustomer] = useState(false);
  const [customerLookupMessage, setCustomerLookupMessage] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [lastBill, setLastBill] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [catalogView, setCatalogView] = useState('grid'); // 'grid' or 'list'
  const [recentItems, setRecentItems] = useState([]);
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  const [expiredProduct, setExpiredProduct] = useState(null);
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

  const cashierName = localStorage.getItem('userFullName') || localStorage.getItem('userName') || 'System User';
  const cashierId = localStorage.getItem('userId') || 'SYS';

  const formatDateTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    return isNaN(date) ? value : date.toLocaleString();
  };

  // Load catalog products on mount and load recent items from localStorage
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
    
    // Load recent items from localStorage
    const savedRecent = localStorage.getItem('recentCartItems');
    if (savedRecent) {
      try {
        setRecentItems(JSON.parse(savedRecent).slice(0, 5));
      } catch(e) {}
    }
  }, []);

  // Save recent items to localStorage when cart changes
  useEffect(() => {
    if (cart.length > 0) {
      const recentProducts = cart.slice(0, 5).map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        unit_price: item.unit_price
      }));
      setRecentItems(recentProducts);
      localStorage.setItem('recentCartItems', JSON.stringify(recentProducts));
    }
  }, [cart]);

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
      if (e.key === 'Escape' && showResults) {
        setShowResults(false);
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, payData, customerExists, showResults]);

  const generateInvoiceHtml = () => {
    if (!lastBill) return '';

    const rows = lastBill.items?.map((item) => {
      const itemDiscount = parseFloat(item.discount || 0);
      const itemTotal = (item.unit_price * item.quantity) - itemDiscount;
      return `
          <tr>
            <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;">
              <div style="font-weight:600;">${item.product_name}</div>
              <div style="font-size:13px;color:#666;">${item.unit_price.toFixed(2)} x ${item.quantity}${itemDiscount ? ` - ${itemDiscount.toFixed(2)} disc` : ''}</div>
            </td>
            <td style="text-align:center;padding:12px 0;border-bottom:1px solid #f0f0f0;">${item.quantity}</td>
            <td style="text-align:right;padding:12px 0;border-bottom:1px solid #f0f0f0;"><strong>Rs. ${itemTotal.toFixed(2)}</strong></td>
          </tr>`;
    }).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Invoice ${lastBill.bill_no}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 40px 20px; color: #1a1a2e; }
    .invoice-wrapper { max-width: 480px; margin: 0 auto; background: white; border-radius: 24px; box-shadow: 0 20px 35px -8px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.02); overflow: hidden; }
    .invoice-header { background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); color: white; padding: 32px 28px; text-align: center; }
    .invoice-header h2 { font-size: 28px; letter-spacing: 2px; margin-bottom: 8px; font-weight: 700; }
    .invoice-header p { opacity: 0.85; font-size: 13px; margin-top: 4px; }
    .invoice-body { padding: 28px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8f9fc; padding: 16px; border-radius: 16px; margin-bottom: 24px; }
    .meta-item { font-size: 13px; }
    .meta-item strong { color: #666; font-weight: 500; display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .meta-item span { color: #1a1a2e; font-weight: 600; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { text-align: left; padding: 12px 0; color: #666; font-weight: 500; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #eef2f6; }
    td { padding: 12px 0; border-bottom: 1px solid #eef2f6; }
    .totals { margin-top: 24px; padding-top: 16px; border-top: 2px dashed #e0e4e8; }
    .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
    .total-row.grand { margin-top: 8px; padding-top: 12px; border-top: 1px solid #e0e4e8; font-weight: 700; font-size: 18px; color: #1e3c72; }
    .footer { margin-top: 32px; text-align: center; font-size: 12px; color: #888; padding-top: 20px; border-top: 1px solid #eef2f6; }
    .badge { display: inline-block; background: #e8f0fe; color: #1e3c72; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 500; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="invoice-wrapper">
    <div class="invoice-header">
      <h2>MATHUMITHAN</h2>
      <p>HARDWARE & CONSTRUCTION</p>
      <div class="badge">TAX INVOICE</div>
    </div>
    <div class="invoice-body">
      <div class="meta-grid">
        <div class="meta-item"><strong>BILL NO</strong><span>${lastBill.bill_no}</span></div>
        <div class="meta-item"><strong>DATE</strong><span>${formatDateTime(lastBill.bill_date)}</span></div>
        ${lastBill.customer?.name ? `<div class="meta-item"><strong>CUSTOMER</strong><span>${lastBill.customer.name}</span></div>` : ''}
        ${lastBill.customer?.phone ? `<div class="meta-item"><strong>PHONE</strong><span>${lastBill.customer.phone}</span></div>` : ''}
      </div>

      <table>
        <thead><tr><th>Item</th><th style="text-align:center;">Qty</th><th style="text-align:right;">Total</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>

      <div class="totals">
        <div class="total-row"><span>Subtotal</span><span>Rs. ${(lastBill.subtotal ?? 0).toFixed(2)}</span></div>
        <div class="total-row"><span>Discount</span><span>Rs. ${(lastBill.discount ?? 0).toFixed(2)}</span></div>
        <div class="total-row grand"><span>Total Amount</span><span>Rs. ${(lastBill.total_amount ?? 0).toFixed(2)}</span></div>
        <div class="total-row"><span>Amount Paid</span><span>Rs. ${(lastBill.amount_paid ?? 0).toFixed(2)}</span></div>
        <div class="total-row"><span>Change Returned</span><span>Rs. ${(lastBill.change_returned ?? 0).toFixed(2)}</span></div>
        ${lastBill.due_amount > 0 ? `<div class="total-row" style="color:#e53e3e;"><span>Due Balance</span><span>Rs. ${lastBill.due_amount.toFixed(2)}</span></div>` : ''}
      </div>

      <div class="footer">
        <p>Cashier: ${lastBill.cashier_name} (${lastBill.cashier_id})</p>
        <p style="margin-top:12px;">Thank you for shopping with us!</p>
      </div>
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

  const handleDownloadPdf = async () => {
    if (!lastBill) return;
    try {
      // Create a container and render the invoice HTML into it
      const invoiceHtml = generateInvoiceHtml();
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.innerHTML = invoiceHtml;
      document.body.appendChild(container);

      // Use html2canvas to render
      const canvas = await html2canvas(container, { scale: 2, useCORS: true, logging: false });
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Calculate image dimensions to fit A4 width while keeping aspect ratio
      const imgProps = pdf.getImageProperties(imgData);
      const imgWidthMm = pageWidth;
      const imgHeightMm = (imgProps.height * imgWidthMm) / imgProps.width;

      let cursorY = 0;
      // If content fits on one page just add it, otherwise slice the canvas vertically
      const imgHeightPx = canvas.height;
      const pxPerMm = imgHeightPx / imgHeightMm;

      if (imgHeightMm <= pageHeight) {
        pdf.addImage(imgData, 'PNG', 0, cursorY, imgWidthMm, imgHeightMm);
      } else {
        const sliceHeightMm = pageHeight;
        const sliceHeightPx = Math.round(sliceHeightMm * pxPerMm);
        let sliceY = 0;
        let first = true;
        while (sliceY < imgHeightPx) {
          const thisSlicePx = Math.min(imgHeightPx - sliceY, sliceHeightPx);
          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = thisSlicePx;
          const ctx = sliceCanvas.getContext('2d');
          ctx.drawImage(canvas, 0, sliceY, canvas.width, thisSlicePx, 0, 0, sliceCanvas.width, sliceCanvas.height);
          const sliceData = sliceCanvas.toDataURL('image/png');

          if (!first) pdf.addPage();
          pdf.addImage(sliceData, 'PNG', 0, 0, imgWidthMm, (thisSlicePx / pxPerMm));
          first = false;
          sliceY += thisSlicePx;
        }
      }

      pdf.save(`invoice-${lastBill.bill_no || 'receipt'}.pdf`);
      document.body.removeChild(container);
    } catch (err) {
      console.error('PDF generation failed', err);
      alert('Failed to generate PDF. Try printing instead.');
    }
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
      setPhoneError('');
      return;
    }

    // Validate the phone number first
    const phoneValidation = validateSriLankanPhone(phone);
    if (!phoneValidation.isValid) {
      setPhoneError(phoneValidation.message);
      setCustomerExists(false);
      setCustomerLookupMessage('');
      return;
    }
    setPhoneError('');

    const formattedPhone = phoneValidation.formatted;

    try {
      const res = await api.get(`/customers?phone=${encodeURIComponent(formattedPhone)}`);
      const customer = res.data.data;
      if (customer) {
        setPayData((prev) => ({ ...prev,
          customerName: customer.customer_name,
          customerPhone: formattedPhone,
          customerAddress: customer.address || ''
        }));
        setCustomerExists(true);
        setSaveCustomer(true);
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
    if (isProductExpired(product)) {
      setExpiredProduct(product);
      setShowExpiredModal(true);
      toast.error(
        <div>
          <div style={{ fontWeight: 600 }}>Product has expired</div>
          <div style={{ fontSize: '0.875rem' }}>This product cannot be sold.</div>
        </div>,
        { duration: 3000 }
      );
      return;
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
    const qty = parseFloat(newQty);
    if (!Number.isFinite(qty) || qty <= 0) {
      handleRemoveFromCart(index);
      return;
    }
    setCart(cart.map((item, i) =>
      i === index ? { ...item, quantity: qty } : item
    ));
  };

  // Totals Calculation
  const subtotal = cart.reduce((acc, i) => acc + (i.unit_price * i.quantity), 0);
  const total = subtotal;
  const amountPaid = Number(payData.amountPaid);
  const amountPaidValue = Number.isFinite(amountPaid) ? amountPaid : 0;
  const balance = amountPaidValue - total;
  const isPartial = amountPaidValue < total && amountPaidValue > 0;
  const isFullPaid = amountPaidValue >= total && amountPaidValue > 0;
  const cartItemCount = cart.reduce((acc, i) => acc + i.quantity, 0);
  // allow checkout once cart has items and an amount is entered; specific customer validation happens on submit
  const canCheckout = cart.length > 0 && amountPaidValue > 0;
  const showCustomerDetails = isPartial || saveCustomer || customerExists;

  const handleCheckout = async () => {
    if (cart.length === 0) return alert("Cart is empty!");
    if (amountPaidValue <= 0) return alert("Enter the amount received before completing transaction!");
    // Validate phone number if provided
    if (payData.customerPhone.trim()) {
      const phoneValidation = validateSriLankanPhone(payData.customerPhone);
      if (!phoneValidation.isValid) {
        setPhoneError(phoneValidation.message);
        return alert(`Invalid phone number: ${phoneValidation.message}`);
      }
      setPhoneError('');
      // Use formatted phone number
      setPayData((prev) => ({ ...prev, customerPhone: phoneValidation.formatted }));
    }

    if (saveCustomer || customerExists || isPartial) {
      if (!payData.customerPhone.trim()) return alert('Phone required to save customer!');
      if (!customerExists && !payData.customerName.trim()) return alert('Customer name required to save customer!');
      if (isPartial && !customerExists && !payData.customerAddress.trim()) return alert('Customer address required for new customer partial payment!');
    }

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
        customer: (saveCustomer || customerExists || isPartial) && payData.customerPhone ? { name: payData.customerName, phone: payData.customerPhone, address: payData.customerAddress } : null,
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
      setSaveCustomer(false);
      setCustomerExists(false);
      setCustomerLookupMessage('');
      setPhoneError('');

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

  const isProductExpired = (product) => {
    if (!product.expiry_date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(product.expiry_date);
    return expiry < today;
  };

  const formatExpiryDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  // Quick add from recent items
  const handleAddRecent = (product) => {
    handleAddToCart(product);
  };

  return (
    <DashboardLayout active="billing">
      {/* Modern Page Header */}
      <div className="admin-page-header-modern">
        <div className="header-left">
          <div className="header-icon-wrapper">
            <CreditCard size={24} className="header-icon" />
          </div>
          <div>
            <h1 className="admin-page-title-modern">Billing Counter</h1>
            <p className="admin-page-subtitle-modern">
              Process sales, manage cart & complete transactions
            </p>
          </div>
        </div>
        <div className="header-right">
          <div className="cashier-badge">
            <User size={14} />
            <span>{cashierName}</span>
          </div>
          <div className="time-badge">
            <Clock size={14} />
            <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      </div>

      {/* POS Terminal Layout */}
      <div className="pos-terminal-modern">
        {/* LEFT PANEL: Search + Product Catalog */}
        <div className="pos-left-modern">
          {/* Enhanced Search Bar */}
          <div className="pos-search-container-modern">
            <div className="pos-search-bar-modern">
              <Search size={18} className="pos-search-icon-modern" />
              <input
                ref={searchInputRef}
                className="pos-search-input-modern"
                placeholder="Search products by name, barcode, SKU..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                id="pos-search"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setShowResults(false); setSearchResults([]); }}
                  className="pos-search-clear"
                >
                  <X size={16} />
                </button>
              )}
              <span className="pos-search-kbd-modern">F1</span>
            </div>

            {/* Search Results Dropdown */}
            {showResults && (
              <div className="pos-search-dropdown-modern">
                <div className="search-results-header">
                  <span>Products found ({searchResults.length})</span>
                  <span className="hint-text">Click to add</span>
                </div>
                {searchResults.map((product) => (
                  <div
                    key={product.product_id}
                    className="pos-search-result-modern"
                    onClick={() => handleAddToCart(product)}
                  >
                    <div className="result-icon">
                      <Package size={18} />
                    </div>
                    <div className="result-info">
                      <div className="result-name">{product.product_name}</div>
                      <div className="result-meta">
                        {product.product_code && `Code: ${product.product_code}`}
                        {product.barcode && ` · Barcode: ${product.barcode}`}
                      </div>
                    </div>
                    <div className="result-right">
                      <div className="result-price">Rs.{parseFloat(product.unit_price).toFixed(2)}</div>
                      <div className={`result-stock ${product.stock_quantity <= 10 ? 'low' : ''}`}>
                        Stock: {product.stock_quantity}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {searchQuery.trim() && !showResults && searchResults.length === 0 && (
              <div className="pos-search-dropdown-modern no-results">
                <div className="no-results-icon">🔍</div>
                <div>No products found for "{searchQuery.trim()}"</div>
                <div className="no-results-hint">Try searching by name, barcode or SKU</div>
              </div>
            )}
          </div>

          {/* Catalog Header with View Toggle */}
          <div className="pos-catalog-header-modern">
            <div className="catalog-title">
              <Package size={18} />
              <span>Product Catalog</span>
              <span className="catalog-count">{catalogProducts.length}</span>
            </div>
            <div className="catalog-view-toggle">
              <button 
                className={`view-btn ${catalogView === 'grid' ? 'active' : ''}`}
                onClick={() => setCatalogView('grid')}
              >
                <LayoutGrid size={16} />
              </button>
              <button 
                className={`view-btn ${catalogView === 'list' ? 'active' : ''}`}
                onClick={() => setCatalogView('list')}
              >
                <ListOrdered size={16} />
              </button>
            </div>
          </div>

          {/* Product Catalog Grid/List */}
          <div className="pos-catalog-modern">
            {catalogProducts.length === 0 ? (
              <div className="catalog-empty">
                <div className="empty-icon">📦</div>
                <div className="empty-text">No products available</div>
                <div className="empty-sub">Add products from the Products page</div>
              </div>
            ) : catalogView === 'grid' ? (
              <div className="catalog-grid-modern">
                {catalogProducts.map((product) => (
                  <div
                    key={product.product_id}
                    className={`product-card-modern ${isProductExpired(product) ? 'expired' : ''} ${product.stock_quantity <= 0 ? 'disabled' : ''}`}
                    onClick={() => handleAddToCart(product)}
                  >
                    {isProductExpired(product) && (
                      <div className="expired-badge">EXPIRED</div>
                    )}
                    <div className="product-card-icon">
                      <Package size={20} />
                    </div>
                    <div className="product-card-name">{product.product_name}</div>
                    <div className="product-card-sku">
                      {product.product_code || `ID: ${product.product_id}`}
                    </div>
                    {isProductExpired(product) && (
                      <div className="expired-date-text">Expired on {formatExpiryDate(product.expiry_date)}</div>
                    )}
                    <div className="product-card-bottom">
                      <div className="product-card-price">Rs.{parseFloat(product.unit_price).toFixed(2)}</div>
                      <div className={`product-card-stock ${getStockClass(product.stock_quantity)}`}>
                        {getStockLabel(product.stock_quantity)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="catalog-list-modern">
                {catalogProducts.map((product) => (
                  <div
                    key={product.product_id}
                    className={`product-list-item ${isProductExpired(product) ? 'expired' : ''} ${product.stock_quantity <= 0 ? 'disabled' : ''}`}
                    onClick={() => handleAddToCart(product)}
                  >
                    {isProductExpired(product) && (
                      <div className="expired-badge-list">EXPIRED</div>
                    )}
                    <div className="list-item-icon">
                      <Package size={18} />
                    </div>
                    <div className="list-item-info">
                      <div className="list-item-name">{product.product_name}</div>
                      <div className="list-item-code">{product.product_code || `ID: ${product.product_id}`}</div>
                      {isProductExpired(product) && (
                        <div className="expired-date-text-list">Expired on {formatExpiryDate(product.expiry_date)}</div>
                      )}
                    </div>
                    <div className="list-item-right">
                      <div className="list-item-price">Rs.{parseFloat(product.unit_price).toFixed(2)}</div>
                      <div className={`list-item-stock ${getStockClass(product.stock_quantity)}`}>
                        {getStockLabel(product.stock_quantity)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Cart + Payment */}
        <div className="pos-right-modern">
          <div className="cart-container-modern">
            {/* Cart Header */}
            <div className="cart-header-modern">
              <div className="cart-title">
                <ShoppingCart size={18} />
                <span>Cart</span>
                {cart.length > 0 && (
                  <span className="cart-badge-modern">{cartItemCount}</span>
                )}
              </div>
              {cart.length > 0 && (
                <button className="cart-clear-modern" onClick={() => setCart([])}>
                  <Trash2 size={14} />
                  Clear All
                </button>
              )}
            </div>

            {/* Cart Items as Table */}
            {cart.length === 0 ? (
              <div className="cart-empty-modern">
                <div className="empty-cart-icon">🛒</div>
                <div className="empty-cart-text">No items added</div>
                <div className="empty-cart-sub">Search or click a product to add</div>
              </div>
            ) : (
              <div className="cart-items-modern">
                <table className="cart-table-modern">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th style={{ width: '120px', textAlign: 'center' }}>Quantity</th>
                      <th style={{ width: '100px', textAlign: 'right' }}>Subtotal</th>
                      <th style={{ width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((item, idx) => (
                      <tr key={idx}>
                        <td>
                          <div className="table-item-name">{item.product_name}</div>
                          <div className="table-item-price">Rs.{item.unit_price.toFixed(2)} each</div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="number"
                            className="qty-input-table"
                            value={item.quantity}
                            onChange={(e) => handleUpdateQty(idx, parseFloat(e.target.value) || 0)}
                            min="0.01"
                            step="0.01"
                          />
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <strong>Rs.{(item.unit_price * item.quantity).toFixed(2)}</strong>
                        </td>
                        <td>
                          <button className="table-remove-btn" onClick={() => handleRemoveFromCart(idx)}>
                            <X size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Payment Summary */}
            <div className="payment-summary-modern">
              <div className="summary-row">
                <span className="summary-label">Subtotal ({cartItemCount} items)</span>
                <span className="summary-value">Rs.{subtotal.toFixed(2)}</span>
              </div>

              <div className="summary-total-row">
                <span className="summary-total-label">Total</span>
                <span className="summary-total-value">Rs.{total.toFixed(2)}</span>
              </div>

              {amountPaidValue > 0 && !isPartial && (
                <div className="customer-save-toggle-row">
                  <div>
                    <div className="customer-save-title">Save customer on this full payment</div>
                    <div className="customer-save-subtitle">Only full payments ask whether to save the customer or not.</div>
                  </div>
                  <button
                    type="button"
                    className={`customer-save-toggle ${saveCustomer || customerExists ? 'on' : ''}`}
                    onClick={() => setSaveCustomer(prev => !prev)}
                  >
                    {(saveCustomer || customerExists) ? 'On' : 'Off'}
                  </button>
                </div>
              )}

              {/* Amount Received */}
              <div className="amount-input-group">
                <label className="amount-label">
                  
                  Amount Received
                </label>
                <div className="amount-input-wrapper">
                  <span className="currency-prefix">Rs.</span>
                  <input
                    id="amountPaid"
                    name="amountPaid"
                    className="amount-input"
                    type="number"
                    value={payData.amountPaid || ''}
                    onChange={(e) => setPayData({...payData, amountPaid: e.target.value})}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="payment-summary-scroll">
                {/* Change or Due */}
                {amountPaidValue > 0 && (
                  balance >= 0 ? (
                    <div className="change-card positive">
                      <CheckCircle size={18} />
                      <div>
                        <div className="change-label">Change to Return</div>
                        <div className="change-value">Rs.{balance.toFixed(2)}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="change-card negative">
                      <AlertCircle size={18} />
                      <div>
                        <div className="change-label">Balance Due</div>
                        <div className="change-value">Rs.{Math.abs(balance).toFixed(2)}</div>
                      </div>
                    </div>
                  )
                )}

                {/* Customer Info for Partial Payment */}
                {showCustomerDetails && (
                  <div className="partial-info-modern">
                    <div className="partial-header">
                      <User size={14} />
                      <span>{isPartial ? 'Customer Information' : 'Customer Information'}</span>
                    </div>
                    {isPartial && (
                      <p className="partial-message found" style={{ marginTop: 0 }}>
                        Partial payment will save this customer automatically.
                      </p>
                    )}
                    {customerExists && (
                      <p className="partial-message found" style={{ marginTop: 0 }}>
                        Existing customer loaded
                      </p>
                    )}
                    <div className="partial-input-group">
                      <User size={14} className="input-icon" />
                      <input
                        placeholder="Customer Name (Required)"
                        value={payData.customerName || ''}
                        onChange={(e) => setPayData({...payData, customerName: e.target.value})}
                        readOnly={customerExists}
                      />
                    </div>
                    <div className="partial-input-group">
                      <Phone size={14} className="input-icon" />
                      <input
                        placeholder="Phone Number (Required)"
                        value={payData.customerPhone || ''}
                        type="tel"
                        maxLength={10}
                        onChange={(e) => {
                          const filtered = filterSriLankanPhoneInput(e.target.value);
                          setPayData((prev) => ({ ...prev, customerPhone: filtered }));
                          setCustomerExists(false);
                          setCustomerLookupMessage('');
                          if (phoneError) setPhoneError('');
                        }}
                        onBlur={(e) => lookupCustomerByPhone(e.target.value)}
                        style={phoneError ? { borderColor: '#ef4444', borderWidth: '2px' } : {}}
                      />
                      {payData.customerPhone && (
                        <span style={{ fontSize: '11px', color: '#888', marginTop: '2px', display: 'block' }}>
                          {payData.customerPhone.length}/10 digits
                        </span>
                      )}
                      {phoneError && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', color: '#ef4444', fontSize: '12px' }}>
                          <AlertCircle size={13} />
                          {phoneError}
                        </div>
                      )}
                    </div>
                    <div className="partial-input-group">
                      <MapPin size={14} className="input-icon" />
                      <input
                        placeholder="Address"
                        value={payData.customerAddress || ''}
                        onChange={(e) => setPayData({...payData, customerAddress: e.target.value})}
                        readOnly={customerExists}
                      />
                    </div>
                    {customerLookupMessage && (
                      <p className={`partial-message ${customerExists ? 'found' : 'new'}`}>
                        {customerLookupMessage}
                      </p>
                    )}
                  </div>
                )}

                {/* Recent Items Quick Add */}
                {recentItems.length > 0 && cart.length === 0 && (
                  <div className="recent-items-modern">
                    <div className="recent-header">
                      <Sparkles size={12} />
                      <span>Recent Items</span>
                    </div>
                    <div className="recent-list">
                      {recentItems.map((item, idx) => (
                        <button 
                          key={idx} 
                          className="recent-item"
                          onClick={() => handleAddRecent(item)}
                        >
                          {item.product_name}
                          <span className="recent-price">Rs.{item.unit_price.toFixed(2)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Checkout Button */}
              <div className="checkout-footer-modern">
                <button
                  onClick={handleCheckout}
                  disabled={cart.length === 0 || amountPaidValue <= 0}
                  className={`checkout-btn-modern ${canCheckout ? 'active' : 'disabled'}`}
                >
                  <span className="checkout-kbd">F9</span>
                  Complete Transaction
                  <ArrowRight size={16} />
                </button>
              </div>
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
        subMessage={lastBill ? `Bill Total: Rs. ${(lastBill.total_amount ?? 0).toFixed(2)}` : `Bill total: Rs. ${total.toFixed(2)}`}
      />

      {/* Expired Product Modal */}
      {showExpiredModal && expiredProduct && (
        <div className="expired-modal-overlay" onClick={() => setShowExpiredModal(false)}>
          <div className="expired-modal">
            <div className="expired-modal-icon">
              <AlertTriangle size={32} color="#dc2626" />
            </div>
            <h3 className="expired-modal-title">Product Expired</h3>
            <div className="expired-modal-body">
              <p>This product expired on</p>
              <p className="expired-modal-date"><strong>{formatExpiryDate(expiredProduct.expiry_date)}</strong></p>
              <p className="expired-modal-sub">This product cannot be sold.</p>
            </div>
            <button className="expired-modal-btn" onClick={() => setShowExpiredModal(false)}>
              OK
            </button>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {lastBill && (
        <div className="receipt-overlay-modern" onClick={(e) => { if (e.target === e.currentTarget) setLastBill(null); }}>
          <div className="receipt-modal-modern">
            <div className="receipt-header">
              <div className="receipt-store">MATHUMITHAN HARDWARE</div>
              <div className="receipt-subtitle">Sales Receipt</div>
            </div>

            <div className="receipt-meta-grid">
              <div><span className="meta-label">Bill No</span><span className="meta-value">{lastBill.bill_no}</span></div>
              <div><span className="meta-label">Date / Time</span><span className="meta-value">{formatDateTime(lastBill.bill_date)}</span></div>
              {lastBill.customer?.name && (
                <div><span className="meta-label">Customer</span><span className="meta-value">{lastBill.customer.name}</span></div>
              )}
              {lastBill.customer?.phone && (
                <div><span className="meta-label">Phone</span><span className="meta-value">{lastBill.customer.phone}</span></div>
              )}
            </div>

            <div className="receipt-items">
              <div className="receipt-items-header">
                <span>Item</span>
                <span style={{ textAlign: 'center' }}>Qty</span>
                <span style={{ textAlign: 'right' }}>Total</span>
              </div>
              {lastBill.items?.map((item, idx) => {
                const itemTotal = (item.unit_price * item.quantity);
                return (
                  <div key={idx} className="receipt-item-row">
                    <div>
                      <div className="receipt-item-name">{item.product_name}</div>
                      <div className="receipt-item-detail">Rs.{item.unit_price.toFixed(2)} × {item.quantity}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>{item.quantity}</div>
                    <div style={{ textAlign: 'right', fontWeight: 600 }}>Rs.{itemTotal.toFixed(2)}</div>
                  </div>
                );
              })}
            </div>

            <div className="receipt-totals">
              <div className="receipt-total-row"><span>Subtotal</span><span>Rs.{(lastBill.subtotal ?? 0).toFixed(2)}</span></div>
              <div className="receipt-total-row"><span>Discount</span><span>Rs.{(lastBill.discount ?? 0).toFixed(2)}</span></div>
              <div className="receipt-total-row grand"><span>Total</span><span>Rs.{(lastBill.total_amount ?? 0).toFixed(2)}</span></div>
              <div className="receipt-total-row"><span>Amount Paid</span><span>Rs.{(lastBill.amount_paid ?? 0).toFixed(2)}</span></div>
              <div className="receipt-total-row"><span>Change</span><span>Rs.{(lastBill.change_returned ?? 0).toFixed(2)}</span></div>
              {lastBill.due_amount > 0 && (
                <div className="receipt-total-row due"><span>Due Balance</span><span>Rs.{lastBill.due_amount.toFixed(2)}</span></div>
              )}
            </div>

            <div className="receipt-cashier">
              <div><strong>Cashier:</strong> {lastBill.cashier_name}</div>
              <div><strong>ID:</strong> {lastBill.cashier_id}</div>
            </div>

            <div className="receipt-actions">
              <button className="receipt-btn print" onClick={() => window.print()}>
                <Printer size={14} /> Print
              </button>
              <button className="receipt-btn download" onClick={handleDownloadPdf}>
                <Download size={14} /> Download PDF
              </button>
              <button className="receipt-btn close" onClick={() => setLastBill(null)}>
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