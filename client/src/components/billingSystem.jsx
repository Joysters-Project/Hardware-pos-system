import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useMatch } from 'react-router-dom';
import {
  Search, Package, X, Minus, Plus, Trash2, ShoppingCart,
  CreditCard, Printer, Download, XCircle, CheckCircle,
  User, Phone, MapPin, DollarSign, Receipt, Tag,
  AlertCircle, AlertTriangle, ArrowRight, Sparkles,
  TrendingUp, Clock, Zap, LayoutGrid, ListOrdered, FolderOpen, Calendar, Camera
} from 'lucide-react';
import api, { productService } from '../services/api';
import { validateSriLankanPhone, filterSriLankanPhoneInput } from '../utils/phoneValidation';
import { subscribeToEvent } from '../services/socketSingleton';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { printWithTemplate, escapeHtml } from '../utils/printTemplate';
import SuccessAnim from './SuccessAnim';
import ProjectsTab from './ProjectsTab';
import toast from 'react-hot-toast';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { playScanSuccessBeep, playScanErrorBeep } from '../utils/barcodeAudio';
import CameraScannerModal from './scanner/CameraScannerModal';
import AttachBarcodeModal from './scanner/AttachBarcodeModal';
import '../styles/BillingSystem.css';
import '../styles/Procurement.css';

const BillingSystem = () => {
  const location = useLocation();
  const projectsMatch = useMatch('/cashier-panel/billing/projects');
  const activePosTab = projectsMatch ? 'projects' : 'billing';
  const [cart, setCart] = useState([]);
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [payData, setPayData] = useState({ amountPaid: '', customerName: '', customerPhone: '', customerAddress: '', expectedPaymentDate: '' });
  const [customerExists, setCustomerExists] = useState(false);
  const [saveCustomer, setSaveCustomer] = useState(false);
  const [customerLookupMessage, setCustomerLookupMessage] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [lastBill, setLastBill] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedSearchResultIndex, setSelectedSearchResultIndex] = useState(-1);
  const [showResults, setShowResults] = useState(false);
  const [recentItems, setRecentItems] = useState([]);
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  const [expiredProduct, setExpiredProduct] = useState(null);
  const searchInputRef = useRef(null);
  const amountPaidInputRef = useRef(null);
  const navigate = useNavigate();

  // Barcode and Scanner state
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const [unrecognizedBarcode, setUnrecognizedBarcode] = useState('');
  const [highlightedItemId, setHighlightedItemId] = useState(null);
  const highlightTimerRef = useRef(null);
  const searchResultRefs = useRef([]);

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

  const refreshCatalog = async () => {
    try {
      const res = await api.get('/products');
      const products = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setCatalogProducts(products);
    } catch (err) {
      console.error('Failed to load catalog:', err);
    }
  };

  // Load catalog products and recent items from localStorage
  // Load recent items from localStorage
  useEffect(() => {
    const savedRecent = localStorage.getItem('recentCartItems');
    if (savedRecent) {
      try {
        setRecentItems(JSON.parse(savedRecent).slice(0, 5));
      } catch (e) { }
    }
  }, []);

  // Re-fetch catalog whenever another module changes stock
  useEffect(() => {
    refreshCatalog();
    return subscribeToEvent('products:updated', refreshCatalog);
  }, []);

  // Sync searchResults and cart stock quantities whenever catalogProducts refreshes
  useEffect(() => {
    if (catalogProducts.length === 0) return;
    const stockMap = {};
    catalogProducts.forEach(p => { stockMap[p.product_id] = p.stock_quantity; });
    setSearchResults(prev =>
      prev.map(p => p.product_id in stockMap ? { ...p, stock_quantity: stockMap[p.product_id] } : p)
    );
    setCart(prev =>
      prev.map(item => item.product_id in stockMap ? { ...item, stock_quantity: stockMap[item.product_id] } : item)
    );
  }, [catalogProducts]);

  // Save recent items to localStorage when cart changes
  useEffect(() => {
    if (cart.length > 0) {
      const recentProducts = cart.slice(0, 5).map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        unit_price: item.unit_price,
        unit_id: item.selected_unit_id,
        unit_name: item.selected_unit_name,
        alternative_units: item.available_units ? item.available_units.slice(1).map(au => ({
          unit_id: au.unit_id,
          unit_details: { unit_name: au.unit_name },
          conversion_factor: au.conversion_factor,
          unit_price: au.unit_price
        })) : [],
        status: item.status || 'active',
        stock_quantity: item.stock_quantity || 999
      }));
      setRecentItems(recentProducts);
      localStorage.setItem('recentCartItems', JSON.stringify(recentProducts));
    }
  }, [cart]);

  // Keyboard shortcut handlers
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && showExpiredModal) {
        e.preventDefault();
        setShowExpiredModal(false);
        return;
      }
      if (e.key === 'F1') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'F6' && !showSuccess && !lastBill) {
        e.preventDefault();
        amountPaidInputRef.current?.focus();
      }
      if (e.key === 'F9' && !showSuccess && !lastBill) {
        e.preventDefault();
        if (cart.length > 0) {
          handleCheckout();
        }
      }
      if (e.key === 'Escape' && showResults) {
        setShowResults(false);
        setSearchQuery('');
        setSelectedSearchResultIndex(-1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, payData, customerExists, showResults, showSuccess, lastBill, showExpiredModal]);

  const formatMoney = (value) => {
    const number = Number(value || 0);
    return number.toLocaleString('en-LK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatBillStatus = () => {
    if (!lastBill) return 'PAID';
    if (lastBill.payment_status) return String(lastBill.payment_status).toUpperCase();
    if (lastBill.status) return String(lastBill.status).toUpperCase();
    if (Number(lastBill.due_amount || 0) > 0) return 'PARTIAL';
    return 'PAID';
  };

  const getBillBalanceDue = () => {
    if (!lastBill) return 0;
    if (lastBill.balance_due !== undefined && lastBill.balance_due !== null) return Number(lastBill.balance_due || 0);
    if (lastBill.due_amount !== undefined && lastBill.due_amount !== null) return Number(lastBill.due_amount || 0);
    const total = Number(lastBill.total_amount || 0);
    const paid = Number(lastBill.amount_paid || 0);
    return Math.max(total - paid, 0);
  };

  const getItemQtyValue = (item) => {
    const qty = Number(item.billed_quantity ?? item.quantity ?? 0);
    return Number.isFinite(qty) ? qty : 0;
  };

  const getItemUnit = (item) => {
    return item.selected_unit_name || item.billed_unit?.unit_name || item.product?.unit?.unit_name || 'Unit';
  };

  const getItemPrice = (item) => Number(item.price_per_unit ?? item.unit_price ?? 0);
  const getItemDiscount = (item) => Number(item.discount ?? 0);
  const getLineTotal = (item) => {
    const qty = getItemQtyValue(item);
    const price = getItemPrice(item);
    const discount = getItemDiscount(item);
    return Math.max((qty * price) - discount, 0);
  };

  const buildThermalBillHtml = () => {
    if (!lastBill) return '';

    const items = (lastBill.items || []).map((item) => {
      const productName = item.product_name || item.product?.product_name || 'Product';
      const qty = getItemQtyValue(item);
      const unit = getItemUnit(item);
      const unitPrice = getItemPrice(item);
      const total = getLineTotal(item);

      return {
        productName,
        qty,
        unit,
        unitPrice,
        total,
      };
    });

    const billStatus = formatBillStatus();
    const balanceDue = getBillBalanceDue();
    const totalQty = items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
    const pad = (value, width) => String(value).padEnd(width, ' ').slice(0, width);
    const rightPad = (value, width) => String(value).padStart(width, ' ').slice(-width);

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Thermal Receipt</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          * { box-sizing: border-box; }
          html, body {
            margin: 0;
            padding: 0;
            background: #fff;
            color: #111827;
            font-family: "Courier New", Courier, monospace;
          }
          body {
            width: 80mm;
            margin: 0 auto;
            padding: 6px 8px 10px;
          }
          .receipt {
            width: 100%;
            font-size: 11px;
            line-height: 1.35;
          }
          .center { text-align: center; }
          .line {
            border-top: 1px solid #111827;
            margin: 4px 0;
          }
          .header-line { border-top: 2px solid #111827; margin: 4px 0; }
          .row { display: flex; justify-content: space-between; gap: 6px; }
          .strong { font-weight: 700; }
          .small { font-size: 10px; }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header-line"></div>
          <div class="center">
            <div>MATHUMITHAN Hardware and</div>
            <div>Lumber and Furniture Dealer</div>
            <div>A9 Road, School Near, Kanagarayankulam</div>
            <div>South, Vavuniya</div>
            <div>Tel: 0772521943</div>
          </div>
          <div class="header-line"></div>
          <div class="row"><span>Bill No : ${lastBill.bill_no || '—'}</span><span>Date : ${new Date(lastBill.bill_date).toLocaleDateString('en-GB')}</span></div>
          <div class="row"><span>Time    : ${new Date(lastBill.bill_date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}</span><span>Cashier : ${lastBill.cashier_name || '—'}</span></div>
          <div class="row"><span>Customer: ${lastBill.customer?.name || 'Walk-in Customer'}</span><span>Phone : ${lastBill.customer?.phone || '—'}</span></div>
          <div class="line"></div>
          <div class="row"><span>Item</span><span>Qty</span><span>Total</span></div>
          <div class="line"></div>
          ${items.map((item) => `
            <div class="row">
              <span>${pad(item.productName.slice(0, 18), 18)}</span>
              <span>${rightPad(String(item.qty), 4)}</span>
              <span>${rightPad(formatMoney(item.total), 10)}</span>
            </div>
            <div class="small row"><span>${pad(item.unit, 8)}</span><span>${rightPad(formatMoney(item.unitPrice), 10)}</span></div>
          `).join('')}
          <div class="line"></div>
          <div class="row"><span>Subtotal</span><span>${rightPad(formatMoney(lastBill.subtotal ?? 0), 12)}</span></div>
          <div class="row"><span>Discount</span><span>${rightPad(formatMoney(lastBill.discount ?? 0), 12)}</span></div>
          <div class="row strong"><span>TOTAL (LKR)</span><span>${rightPad(formatMoney(lastBill.total_amount ?? 0), 12)}</span></div>
          <div class="line"></div>
          <div class="row"><span>Amount Paid</span><span>${rightPad(formatMoney(lastBill.amount_paid ?? 0), 12)}</span></div>
          <div class="row"><span>Balance Due</span><span>${rightPad(formatMoney(balanceDue), 12)}</span></div>
          <div class="row"><span>Status</span><span>${billStatus}</span></div>
          <div class="row"><span>Expected Pay Date</span><span>${lastBill.expected_payment_date || '—'}</span></div>
          <div class="line"></div>
          <div class="row"><span>Items: ${items.length}</span><span>Total Qty: ${Number.isInteger(totalQty) ? totalQty : totalQty.toFixed(1)}</span></div>
          <div class="line"></div>
          <div class="center" style="margin-top: 8px;">
            <div>Thank you! Please come again.</div>
            <div>Warranty items: keep this bill.</div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const buildA4InvoiceHtml = () => {
    if (!lastBill) return '';

    const items = (lastBill.items || []).map((item, index) => {
      const qty = getItemQtyValue(item);
      const unit = getItemUnit(item);
      const unitPrice = getItemPrice(item);
      const discount = getItemDiscount(item);
      const total = getLineTotal(item);
      return `
        <tr>
          <td style="padding: 10px 8px; border-bottom: 1px solid #dfe3e8;">${index + 1}</td>
          <td style="padding: 10px 8px; border-bottom: 1px solid #dfe3e8;">${escapeHtml(item.product_name || item.product?.product_name || 'Product')}</td>
          <td style="padding: 10px 8px; border-bottom: 1px solid #dfe3e8;">${escapeHtml(unit)}</td>
          <td style="padding: 10px 8px; border-bottom: 1px solid #dfe3e8; text-align: right;">${qty}</td>
          <td style="padding: 10px 8px; border-bottom: 1px solid #dfe3e8; text-align: right;">${formatMoney(unitPrice)}</td>
          <td style="padding: 10px 8px; border-bottom: 1px solid #dfe3e8; text-align: right;">${formatMoney(discount)}</td>
          <td style="padding: 10px 8px; border-bottom: 1px solid #dfe3e8; text-align: right; font-weight: 700;">${formatMoney(total)}</td>
        </tr>
      `;
    }).join('');

    const balanceDue = getBillBalanceDue();
    const billStatus = formatBillStatus();
    const customerName = lastBill.customer?.name || 'Walk-in Customer';
    const phone = lastBill.customer?.phone || '—';

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Invoice ${escapeHtml(lastBill.bill_no || 'Receipt')}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: Arial, Helvetica, sans-serif;
            color: #111827;
            background: #fff;
          }
          .invoice {
            width: 100%;
            max-width: 190mm;
            margin: 0 auto;
            border: 1px solid #dfe3e8;
            border-radius: 8px;
            overflow: hidden;
          }
          .header {
            background: #f8fafc;
            border-bottom: 2px solid #dfe3e8;
            padding: 18px 20px 16px;
          }
          .brand {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
          }
          .logo {
            width: 42px;
            height: 42px;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: #dbeafe;
            color: #1d4ed8;
            font-weight: 700;
          }
          .title {
            font-size: 20px;
            font-weight: 700;
            color: #1f2937;
          }
          .meta-line {
            margin-top: 10px;
            font-size: 12px;
            color: #4b5563;
          }
          .bill-top {
            display: grid;
            grid-template-columns: 1.3fr 1fr;
            gap: 12px;
            padding: 16px 20px;
            background: #fff;
          }
          .card {
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 12px 14px;
          }
          .label {
            font-size: 12px;
            color: #6b7280;
            display: block;
            margin-bottom: 4px;
          }
          .value {
            font-size: 13px;
            font-weight: 700;
            color: #111827;
          }
          .table-wrap { padding: 0 20px 10px; }
          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            font-size: 12px;
          }
          th {
            background: #f3f4f6;
            color: #374151;
            padding: 10px 8px;
            text-align: left;
            font-weight: 700;
          }
          td { color: #1f2937; }
          .totals {
            display: flex;
            justify-content: flex-end;
            padding: 0 20px 20px;
          }
          .totals table {
            width: 320px;
            font-size: 12px;
          }
          .totals td {
            padding: 7px 10px;
            border-bottom: 1px solid #e5e7eb;
          }
          .grand { font-weight: 700; font-size: 14px; }
          .notes {
            padding: 10px 20px 20px;
            font-size: 12px;
            color: #4b5563;
          }
          .signature-row {
            display: flex;
            justify-content: space-between;
            padding: 18px 20px 22px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #4b5563;
          }
        </style>
      </head>
      <body>
        <div class="invoice">
          <div class="header">
            <div class="brand">
              <div style="display:flex; align-items:center; gap:12px;">
                <div class="logo">[LOGO]</div>
                <div>
                  <div class="title">MATHUMITHAN Hardware and Lumber</div>
                  <div class="title" style="font-size:16px;">and Furniture Dealer</div>
                </div>
              </div>
              <div style="font-weight:700; font-size:18px; text-align:right;">INVOICE</div>
            </div>
            <div class="meta-line">A9 Road, School Near, Kanagarayankulam &nbsp; &nbsp; &nbsp; No: ${escapeHtml(lastBill.bill_no || 'INV-....')}</div>
            <div class="meta-line">South, Vavuniya &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; Date: ${escapeHtml(new Date(lastBill.bill_date).toLocaleDateString('en-GB'))}</div>
            <div class="meta-line">Tel: 0772521943</div>
          </div>

          <div class="bill-top">
            <div class="card">
              <span class="label">Bill To</span>
              <div class="value">${escapeHtml(customerName)}</div>
              <div style="margin-top: 8px; color: #4b5563; font-size: 12px;">Phone / Address: ${escapeHtml(phone)}</div>
            </div>
            <div class="card">
              <span class="label">Details</span>
              <div class="value">Cashier: ${escapeHtml(lastBill.cashier_name || '—')}</div>
              <div style="margin-top: 8px; color: #4b5563; font-size: 12px;">Status: ${escapeHtml(billStatus)}</div>
            </div>
          </div>

          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style="width: 7%;">#</th>
                  <th style="width: 42%;">Item / Description</th>
                  <th style="width: 12%;">Unit</th>
                  <th style="width: 10%; text-align: right;">Qty</th>
                  <th style="width: 12%; text-align: right;">Price</th>
                  <th style="width: 9%; text-align: right;">Disc</th>
                  <th style="width: 12%; text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${items}
              </tbody>
            </table>
          </div>

          <div class="totals">
            <table>
              <tr><td>Subtotal</td><td style="text-align:right;">${formatMoney(lastBill.subtotal ?? 0)}</td></tr>
              <tr><td>Discount</td><td style="text-align:right;">${formatMoney(lastBill.discount ?? 0)}</td></tr>
              <tr class="grand"><td>TOTAL</td><td style="text-align:right;">${formatMoney(lastBill.total_amount ?? 0)}</td></tr>
              <tr><td>Paid</td><td style="text-align:right;">${formatMoney(lastBill.amount_paid ?? 0)}</td></tr>
              <tr><td>BALANCE DUE</td><td style="text-align:right;">${formatMoney(balanceDue)}</td></tr>
            </table>
          </div>

          <div class="notes">
            <div>Notes:</div>
            <div>- Warranty as per card</div>
            <div style="margin-top: 8px;">Amount in words: ${escapeHtml(lastBill.amount_in_words || '—')}</div>
          </div>

          <div class="signature-row">
            <div>Customer signature</div>
            <div>Authorized signature</div>
          </div>
          <div style="padding: 0 20px 20px; text-align:center; font-size:12px; color:#4b5563;">Thank you for your business!</div>
        </div>
      </body>
      </html>`;
  };

  const generateInvoiceHtml = () => buildA4InvoiceHtml();

  const openPrintableBill = ({ title, html, pageSize }) => {
    const popup = window.open('', '_blank', 'width=900,height=1000');
    if (!popup) {
      toast.error('Allow pop-ups to print the invoice.');
      return false;
    }

    popup.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8" /><title>${escapeHtml(title)}</title><style>@page { size: ${pageSize}; margin: 0; } body { margin: 0; background: #fff; } @media print { body { margin: 0; } }</style></head><body>${html}</body></html>`);
    popup.document.close();
    popup.focus();
    setTimeout(() => popup.print(), 300);
    return true;
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
    const html = buildA4InvoiceHtml();
    if (!html) return;
    openPrintableBill({ title: 'A4 Invoice', html, pageSize: 'A4 portrait' });
  };

  const handleThermalPrint = () => {
    if (!lastBill) return;
    const html = buildThermalBillHtml();
    if (!html) return;
    openPrintableBill({ title: 'Thermal Receipt', html, pageSize: '80mm auto' });
  };

  useEffect(() => {
    if (!lastBill || showSuccess) return undefined;

    const handleInvoiceShortcut = (event) => {
      if (!['F7', 'F8', 'F9'].includes(event.key)) return;
      event.preventDefault();

      if (event.key === 'F8') {
        setLastBill(null);
      } else if (event.key === 'F9') {
        handleThermalPrint();
        setLastBill(null);
      } else {
        handleDownloadPdf();
        setLastBill(null);
      }
    };

    window.addEventListener('keydown', handleInvoiceShortcut);
    return () => window.removeEventListener('keydown', handleInvoiceShortcut);
  }, [lastBill, showSuccess, handleDownloadPdf, handleThermalPrint]);

  // Search for products
  const handleSearch = async (query) => {
    const trimmedQuery = query.trim();
    setSearchQuery(query);

    if (!trimmedQuery) {
      setSearchResults([]);
      setSelectedSearchResultIndex(-1);
      setShowResults(false);
      return;
    }

    try {
      const res = await api.get('/products/search', {
        params: { q: trimmedQuery }
      });
      const products = Array.isArray(res.data) ? res.data : [];
      setSearchResults(products);
      setSelectedSearchResultIndex(products.length ? 0 : -1);
      setShowResults(products.length > 0);
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults([]);
      setSelectedSearchResultIndex(-1);
      setShowResults(false);
    }
  };

  useEffect(() => {
    if (!showResults || selectedSearchResultIndex < 0) return;
    searchResultRefs.current[selectedSearchResultIndex]?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      behavior: 'smooth',
    });
  }, [searchResults, selectedSearchResultIndex, showResults]);

  // Handle Enter key for search and manual barcode entry
  const handleSearchKeyDown = async (e) => {
    if (showResults && searchResults.length > 0 && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      setSelectedSearchResultIndex((currentIndex) => {
        const startIndex = currentIndex < 0 ? 0 : currentIndex;
        const direction = e.key === 'ArrowDown' ? 1 : -1;
        return (startIndex + direction + searchResults.length) % searchResults.length;
      });
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const query = searchQuery.trim();
      if (!query) return;

      // Try exact barcode lookup first
      try {
        const barcodeRes = await productService.getByBarcode(query);
        if (barcodeRes.data?.product) {
          const { product, matched_unit } = barcodeRes.data;
          const targetUnitId = matched_unit?.unit_id || product.unit_id;
          await handleAddToCart(product, targetUnitId);
          playScanSuccessBeep();
          setHighlightedItemId(`${product.product_id}_${targetUnitId}`);
          if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
          highlightTimerRef.current = setTimeout(() => setHighlightedItemId(null), 1500);
          setSearchQuery('');
          setSearchResults([]);
          setSelectedSearchResultIndex(-1);
          setShowResults(false);
          return;
        }
      } catch (err) {
        // Not an exact barcode match, proceed to normal query search
      }

      if (showResults && searchResults.length > 0) {
        const selectedProduct = searchResults[selectedSearchResultIndex] || searchResults[0];
        await handleAddToCart(selectedProduct);
        setSearchResults([]);
        setSelectedSearchResultIndex(-1);
        return;
      }

      let items = searchResults;
      if (items.length === 0) {
        try {
          const res = await api.get('/products/search', { params: { q: query } });
          items = Array.isArray(res.data) ? res.data : [];
        } catch (err) {
          console.error('Barcode search error:', err);
        }
      }

      if (items.length === 0) {
        playScanErrorBeep();
        toast.error(`No product found for barcode/query "${query}"`);
        return;
      }

      // Check exact barcode match on main product or alternative units
      let matchedProduct = items.find(p =>
        String(p.barcode || '').trim().toLowerCase() === query.toLowerCase()
      );
      let matchedAltUnitId = null;

      if (!matchedProduct) {
        for (const p of items) {
          const alt = (p.alternative_units || []).find(au =>
            String(au.barcode || '').trim().toLowerCase() === query.toLowerCase()
          );
          if (alt) {
            matchedProduct = p;
            matchedAltUnitId = alt.unit_id;
            break;
          }
        }
      }

      // Fallback if exactly 1 search result returned
      if (!matchedProduct && items.length === 1) {
        matchedProduct = items[0];
      }

      if (matchedProduct) {
        handleAddToCart(matchedProduct, matchedAltUnitId);
        playScanSuccessBeep();
        setHighlightedItemId(`${matchedProduct.product_id}_${matchedAltUnitId || matchedProduct.unit_id}`);
        if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
        highlightTimerRef.current = setTimeout(() => setHighlightedItemId(null), 1500);
        setSearchQuery('');
        setSearchResults([]);
        setSelectedSearchResultIndex(-1);
        setShowResults(false);
      } else if (items.length > 1) {
        setSearchResults(items);
        setSelectedSearchResultIndex(0);
        setShowResults(true);
      }
    }
  };

  const getSellabilityError = (product) => {
    const isInactive = String(product.status).toLowerCase() === 'inactive';
    if (isInactive) return `"${product.product_name}" is inactive and cannot be sold.`;
    // Use cart-adjusted available stock: catalog stock minus quantity already in cart
    const inCart = cart.find(i => i.product_id === product.product_id)?.quantity || 0;
    const available = (product.stock_quantity ?? 0) - inCart;
    if (available <= 0) return 'This product is out of stock and cannot be sold.';
    return null;
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
        setPayData((prev) => ({
          ...prev,
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
  const handleAddToCart = async (product, targetUnitId = null) => {
    // 1. Block only explicitly inactive products
    const isInactive = String(product.status).toLowerCase() === 'inactive';
    if (isInactive) {
      toast.error(`"${product.product_name}" is inactive and cannot be sold.`);
      return;
    }

    // Resolve base unit and alt units first to accurately check conversion factors
    const baseUnitName = product.unit?.unit_name || product.unit_name || 'Unit';
    const baseCostPrice = parseFloat(product.cost_price || 0);
    const baseUnitPrice = parseFloat(product.unit_price || 0);

    const baseUnit = {
      unit_id: parseInt(product.unit_id),
      unit_name: baseUnitName,
      conversion_factor: 1.0,
      unit_price: baseUnitPrice,
      cost_price: baseCostPrice
    };

    const altUnits = (product.alternative_units || []).map(au => {
      const factor = parseFloat(au.conversion_factor) || 1.0;
      const altCost = au.cost_price != null && !isNaN(parseFloat(au.cost_price))
        ? parseFloat(au.cost_price)
        : (baseCostPrice * factor);
      const altPrice = au.unit_price != null && !isNaN(parseFloat(au.unit_price))
        ? parseFloat(au.unit_price)
        : (baseUnitPrice * factor);
      return {
        unit_id: parseInt(au.unit_id),
        unit_name: au.unit_details?.unit_name || au.unit?.unit_name || au.unit_name || 'Alt Unit',
        conversion_factor: factor,
        unit_price: altPrice,
        cost_price: altCost
      };
    });

    const availableUnits = [baseUnit, ...altUnits];

    // Determine target unit
    const chosenUnit = targetUnitId
      ? (availableUnits.find(u => u.unit_id === parseInt(targetUnitId)) || baseUnit)
      : baseUnit;

    const unitFactor = chosenUnit.conversion_factor || 1.0;

    // 2. Check cart-adjusted available base stock
    const inCartBaseQty = cart
      .filter(i => i.product_id === product.product_id)
      .reduce((sum, i) => sum + ((i.quantity || 0) * (i.conversion_factor || 1.0)), 0);

    const availableBaseStock = (product.stock_quantity ?? 0) - inCartBaseQty;
    if (availableBaseStock < unitFactor) {
      toast.error(
        <div>
          <div style={{ fontWeight: 600 }}>Insufficient stock</div>
          <div style={{ fontSize: '0.875rem' }}>
            Only <strong>{product.stock_quantity ?? 0}</strong> base unit(s) available for <strong>{product.product_name}</strong>.
          </div>
        </div>,
        { duration: 3500 }
      );
      return;
    }

    // 3. Batch check: if batch records exist, require at least one valid non-expired batch
    try {
      const batchRes = await api.get(`/batch-inventory/product/${product.product_id}`);
      const batches = Array.isArray(batchRes.data) ? batchRes.data : [];
      if (batches.length > 0) {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const hasValidBatch = batches.some(
          b => b.remaining_quantity > 0 &&
            (!b.expiry_date || new Date(b.expiry_date) >= today)
        );
        if (!hasValidBatch) {
          setExpiredProduct(product);
          setShowExpiredModal(true);
          toast.error('This product batch has expired. Sales are not allowed.', { duration: 4000 });
          return;
        }
      }
    } catch {
      // Batch API unavailable — fall through and allow the sale; server will validate
    }

    // Check if item exists in the cart with the same selected_unit_id
    const existingItem = cart.find(item => item.product_id === product.product_id && item.selected_unit_id === chosenUnit.unit_id);

    if (existingItem) {
      setCart(cart.map(item =>
        item.product_id === product.product_id && item.selected_unit_id === chosenUnit.unit_id
          ? { ...item, quantity: item.quantity + 1, stock_quantity: Number(product.stock_quantity ?? item.stock_quantity ?? 0) }
          : item
      ));
    } else {
      setCart([...cart, {
        product_id: product.product_id,
        product_name: product.product_name,
        unit_price: parseFloat(chosenUnit.unit_price),
        price: parseFloat(chosenUnit.unit_price),
        cost_price: parseFloat(chosenUnit.cost_price || 0),
        base_cost_price: baseCostPrice,
        stock_quantity: Number(product.stock_quantity ?? 0),
        quantity: 1,
        selected_unit_id: chosenUnit.unit_id,
        selected_unit_name: chosenUnit.unit_name,
        conversion_factor: chosenUnit.conversion_factor,
        available_units: availableUnits,
        discount: 0
      }]);
    }

    setSearchQuery('');
    setSearchResults([]);
    setSelectedSearchResultIndex(-1);
    setShowResults(false);
  };

  // Shared Barcode Scan Handler (Hardware Scanner & Camera Scanner)
  const handleBarcodeScan = async (code) => {
    if (!code) return;
    const cleanCode = typeof code === 'string' ? code.trim() : '';
    if (!cleanCode) return;

    try {
      const res = await productService.getByBarcode(cleanCode);
      const { product, matched_unit } = res.data;

      if (!product) {
        throw new Error('Product not found');
      }

      // Check warnings: inactive, out of stock, expired
      const isInactive = String(product.status).toLowerCase() === 'inactive';
      const isOutOfStock = (product.stock_quantity ?? 0) <= 0;
      const isExpired = product.expiry_date && new Date(product.expiry_date) < new Date();

      if (isInactive || isOutOfStock || isExpired) {
        const issues = [];
        if (isInactive) issues.push('INACTIVE');
        if (isOutOfStock) issues.push('OUT OF STOCK');
        if (isExpired) issues.push('EXPIRED');

        const warningMsg = `Warning: "${product.product_name}" is ${issues.join(' and ')}. Do you want to proceed and add it to the bill?`;
        const proceed = window.confirm(warningMsg);
        if (!proceed) {
          return;
        }
      }

      const targetUnitId = matched_unit?.unit_id || product.unit_id;
      await handleAddToCart(product, targetUnitId);

      // Play success audio chime
      playScanSuccessBeep();

      // Highlight the updated/added item in the cart
      setHighlightedItemId(`${product.product_id}_${targetUnitId}`);
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = setTimeout(() => {
        setHighlightedItemId(null);
      }, 1500);

      toast.success(
        <div>
          <div style={{ fontWeight: 600 }}>Scanned: {product.product_name}</div>
          <div style={{ fontSize: '0.8rem', color: '#555' }}>
            Unit: {matched_unit?.unit_name || 'Base'} | Barcode: {cleanCode}
          </div>
        </div>,
        { duration: 2500 }
      );
    } catch (err) {
      console.warn('Barcode scan lookup failed:', err);
      // Play error buzz
      playScanErrorBeep();

      // Open AttachBarcodeModal
      setUnrecognizedBarcode(cleanCode);
      setIsAttachModalOpen(true);
      toast.error(`Barcode "${cleanCode}" not found. You can attach it to a product.`);
    }
  };

  const handleBarcodeAttached = (product, unitId) => {
    const targetUnitId = unitId || product.unit_id;
    handleAddToCart(product, targetUnitId);
    playScanSuccessBeep();
    setHighlightedItemId(`${product.product_id}_${targetUnitId}`);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => {
      setHighlightedItemId(null);
    }, 1500);
  };

  // Hardware Scanner (keyboard-wedge) listener
  useBarcodeScanner({
    onScan: handleBarcodeScan,
    searchInputId: 'pos-search',
    enabled: true,
  });

  const handleUnitChange = (index, targetUnitId) => {
    setCart(cart.map((item, i) => {
      if (i !== index) return item;
      const matchedUnit = item.available_units.find(u => u.unit_id === parseInt(targetUnitId));
      if (!matchedUnit) return item;
      return {
        ...item,
        selected_unit_id: matchedUnit.unit_id,
        selected_unit_name: matchedUnit.unit_name,
        unit_price: matchedUnit.unit_price,
        cost_price: matchedUnit.cost_price != null ? matchedUnit.cost_price : ((item.base_cost_price || 0) * (matchedUnit.conversion_factor || 1)),
        conversion_factor: matchedUnit.conversion_factor
      };
    }));
  };

  // Remove product from cart
  const handleRemoveFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  // Update quantity — caps at available stock and shows a warning toast if exceeded
  const handleUpdateQty = (index, newQty) => {
    const qty = parseFloat(newQty);
    if (!Number.isFinite(qty) || qty <= 0) {
      handleRemoveFromCart(index);
      return;
    }
    const item = cart[index];
    const catalogItem = catalogProducts.find(p => p.product_id === item.product_id);
    const stockQty = Number(catalogItem?.stock_quantity ?? item.stock_quantity ?? 0);
    const factor = Number(item.conversion_factor || 1.0);
    
    // Total base quantity used by OTHER lines of the same product in the cart
    const otherLinesBaseQty = cart
      .filter((cItem, i) => i !== index && cItem.product_id === item.product_id)
      .reduce((sum, cItem) => sum + ((Number(cItem.quantity) || 0) * (Number(cItem.conversion_factor) || 1.0)), 0);

    const remainingBaseStock = Math.max(0, stockQty - otherLinesBaseQty);
    const maxInUnit = factor > 1 ? Math.floor(remainingBaseStock / factor) : remainingBaseStock;

    if (qty > maxInUnit) {
      toast.error(
        <div>
          <div style={{ fontWeight: 600 }}>Insufficient stock</div>
          <div style={{ fontSize: '0.875rem' }}>
            Only <strong>{maxInUnit}</strong> {item.selected_unit_name || 'unit(s)'} of <strong>{item.product_name}</strong> available (Total Stock: {stockQty}).
          </div>
        </div>,
        { duration: 3500 }
      );
      // Cap at max available so the cart is still usable
      setCart(cart.map((cartItem, i) =>
        i === index ? { ...cartItem, quantity: maxInUnit > 0 ? maxInUnit : 1, stock_quantity: stockQty } : cartItem
      ));
      return;
    }

    setCart(cart.map((cartItem, i) =>
      i === index ? { ...cartItem, quantity: qty, stock_quantity: stockQty } : cartItem
    ));
  };

  const handleUpdateDiscount = (index, value) => {
    const num = parseFloat(value);
    const validDiscount = (!Number.isFinite(num) || num < 0) ? 0 : num;
    setCart(cart.map((item, i) => {
      if (i !== index) return item;
      return { 
        ...item, 
        discount: validDiscount,
        discountInput: value
      };
    }));
  };

  const handleBlurDiscount = (index) => {
    setCart(cart.map((item, i) => {
      if (i !== index) return item;
      return {
        ...item,
        discountInput: undefined
      };
    }));
  };

  const cartHasInvalidDiscount = cart.some((item) => {
    const finalSellingPrice = (item.unit_price * item.quantity) - (item.discount || 0);
    return finalSellingPrice < (item.cost_price || 0) * item.quantity;
  });

  // Totals Calculation
  const subtotal = cart.reduce((acc, i) => acc + (i.unit_price * i.quantity), 0);
  const totalDiscount = cart.reduce((acc, i) => acc + (i.discount || 0), 0);
  const total = subtotal - totalDiscount;
  const hasAmountPaid = payData.amountPaid !== '' && payData.amountPaid !== null && payData.amountPaid !== undefined;
  const amountPaid = Number(payData.amountPaid);
  const amountPaidValue = Number.isFinite(amountPaid) ? amountPaid : 0;
  const balance = amountPaidValue - total;
  const isPartial = hasAmountPaid && amountPaidValue < total && amountPaidValue >= 0;
  const isFullPaid = amountPaidValue >= total && amountPaidValue > 0;
  const cartItemCount = cart.reduce((acc, i) => acc + i.quantity, 0);
  // allow checkout once cart has items and an amount is entered; specific customer validation happens on submit
  const canCheckout = cart.length > 0 && hasAmountPaid && amountPaidValue >= 0;
  const showCustomerDetails = isPartial || saveCustomer || customerExists;

  useEffect(() => {
    if (isPartial && !payData.expectedPaymentDate) {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      const defaultDate = d.toISOString().split('T')[0];
      setPayData((prev) => ({ ...prev, expectedPaymentDate: defaultDate }));
    }
  }, [isPartial]);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty!");
      return;
    }

    // Client-side pre-validation for stock quantities
    for (const item of cart) {
      const catalogItem = catalogProducts.find(p => p.product_id === item.product_id);
      const availableStock = Number(catalogItem?.stock_quantity ?? item.stock_quantity ?? 0);
      const totalRequestedBaseQty = cart
        .filter(i => i.product_id === item.product_id)
        .reduce((sum, i) => sum + ((Number(i.quantity) || 0) * (Number(i.conversion_factor) || 1.0)), 0);

      if (totalRequestedBaseQty > availableStock) {
        toast.error(
          <div>
            <div style={{ fontWeight: 600 }}>Insufficient Stock Error</div>
            <div style={{ fontSize: '0.875rem' }}>
              Selling quantity for <strong>{item.product_name}</strong> exceeds available stock ({availableStock} in stock). Please adjust cart quantity.
            </div>
          </div>,
          { duration: 5000 }
        );
        return;
      }
    }

    if (cartHasInvalidDiscount) {
      toast.error("One or more items have a discount that makes final price lower than cost price. Please adjust discount.");
      return;
    }
    if (!hasAmountPaid || amountPaidValue < 0) {
      toast.error("Enter the amount received before completing transaction!");
      return;
    }
    // Validate phone number if provided
    if (payData.customerPhone.trim()) {
      const phoneValidation = validateSriLankanPhone(payData.customerPhone);
      if (!phoneValidation.isValid) {
        setPhoneError(phoneValidation.message);
        toast.error(`Invalid phone number: ${phoneValidation.message}`);
        return;
      }
      setPhoneError('');
      // Use formatted phone number
      setPayData((prev) => ({ ...prev, customerPhone: phoneValidation.formatted }));
    }

    if (saveCustomer || customerExists || isPartial) {
      if (!payData.customerPhone.trim()) {
        toast.error('Phone number required to save customer!');
        return;
      }
      if (!customerExists && !payData.customerName.trim()) {
        toast.error('Customer name required to save customer!');
        return;
      }
      if (isPartial && !customerExists && !payData.customerAddress.trim()) {
        toast.error('Customer address required for new customer partial payment!');
        return;
      }
      if (isPartial && !payData.expectedPaymentDate) {
        toast.error('Expected payment date is required for partial payment!');
        return;
      }
    }

    try {
      const payload = {
        items: cart.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.unit_price,
          discount: item.discount || 0,
          selected_unit_id: item.selected_unit_id,
          conversion_factor: item.conversion_factor || 1.0
        })),
        subtotal,
        total_amount: total,
        discount: totalDiscount,
        amount_paid: amountPaidValue,
        balance_due: isPartial ? Math.abs(balance) : 0,
        expected_payment_date: isPartial ? payData.expectedPaymentDate : null,
        customer: (saveCustomer || customerExists || isPartial) && payData.customerPhone ? { name: payData.customerName, phone: payData.customerPhone, address: payData.customerAddress } : null,
      };

      const res = await api.post('/bills', payload);

      setShowSuccess(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimSuccess(true));
      });

      setLastBill({
        ...res.data.data,
        discount: totalDiscount,
        items: cart.map(item => ({
          ...item,
          billed_quantity: item.quantity,
          selected_unit_name: item.selected_unit_name
        })),
        amount_paid: amountPaidValue,
        change_returned: balance >= 0 ? balance : 0,
        due_amount: isPartial ? Math.abs(balance) : 0,
        expected_payment_date: isPartial ? payData.expectedPaymentDate : null,
        cashier_name: cashierName,
        cashier_id: cashierId,
        customer: payData.customerPhone ? { name: payData.customerName, phone: payData.customerPhone } : null,
      });
      setCart([]);
      setPayData({ amountPaid: '', customerName: '', customerPhone: '', customerAddress: '', expectedPaymentDate: '' });
      setSaveCustomer(false);
      setCustomerExists(false);
      setCustomerLookupMessage('');
      setPhoneError('');
      refreshCatalog();
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Checkout failed. Please try again.';
      const isExpiredError = msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('batch');
      const isStockError = !isExpiredError && (msg.toLowerCase().includes('stock') || msg.toLowerCase().includes('unavailable'));
      toast.error(
        <div>
          <div style={{ fontWeight: 600 }}>{isExpiredError ? 'Batch Expired' : isStockError ? 'Stock shortage' : 'Checkout failed'}</div>
          <div style={{ fontSize: '0.875rem' }}>{msg}</div>
        </div>,
        { duration: 5000 }
      );
    }
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

  const handleCartGridKeyDown = (event) => {
    const source = event.target;
    const sourceRow = Number(source.dataset.cartRow);
    const sourceField = source.dataset.cartField;
    const fields = ['unit', 'quantity', 'discount'];
    const fieldIndex = fields.indexOf(sourceField);

    if (!Number.isInteger(sourceRow) || fieldIndex < 0) return;

    if (event.key === 'Backspace') {
      event.preventDefault();
      handleRemoveFromCart(sourceRow);
      return;
    }

    const table = event.currentTarget.querySelector('.cart-table-modern');
    if (!table) return;

    let destination;
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      for (let row = sourceRow + direction; row >= 0 && row < cart.length; row += direction) {
        const candidate = table.querySelector(`[data-cart-row="${row}"][data-cart-field="${sourceField}"]`);
        if (candidate && !candidate.disabled) {
          destination = candidate;
          break;
        }
      }
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      for (let field = fieldIndex + direction; field >= 0 && field < fields.length; field += direction) {
        const candidate = table.querySelector(`[data-cart-row="${sourceRow}"][data-cart-field="${fields[field]}"]`);
        if (candidate && !candidate.disabled) {
          destination = candidate;
          break;
        }
      }
    } else {
      return;
    }

    event.preventDefault();
    if (destination) {
      destination.focus();
    }
  };

  return (
    <div className="proc-container">
      {/* Modern Page Header */}
      <div className="proc-header" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
          <div className="proc-header-icon">
            {activePosTab === 'billing' ? (
              <CreditCard size={22} />
            ) : (
              <FolderOpen size={22} />
            )}
          </div>
          <div>
            <h1 style={{ margin: 0 }}>
              {activePosTab === 'billing' ? 'Billing Counter' : 'Project Billing Counter'}
            </h1>
            <p style={{ margin: 0, color: "var(--proc-text-muted, #666)", fontSize: "0.85rem" }}>
              {activePosTab === 'billing'
                ? 'Process sales, manage cart & complete transactions'
                : ''}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
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

      {/* POS Tab Switcher */}
      <div className="pos-tab-switcher">
        <button
          type="button"
          className={`pos-tab-btn ${activePosTab === 'billing' ? 'active' : ''}`}
          onClick={() => navigate('/cashier-panel/billing')}
        >
          <CreditCard size={16} />
          <span>Billing Counter</span>
        </button>
        <button
          type="button"
          className={`pos-tab-btn ${activePosTab === 'projects' ? 'active' : ''}`}
          onClick={() => navigate('/cashier-panel/billing/projects')}
        >
          <FolderOpen size={16} />
          <span>Project Billing Counter</span>
        </button>
      </div>

      {activePosTab === 'projects' ? (
        <ProjectsTab />
      ) : (
        <div className="pos-terminal-modern">
          {/* LEFT PANEL: Search and selected items */}
          <div className="pos-left-modern">
            {/* Enhanced Search Bar */}
            <div className="pos-search-container-modern">
              <div className="pos-search-bar-modern">
                <Search size={18} className="pos-search-icon-modern" />
                <input id="pos-search" name="searchQuery"
                  ref={searchInputRef}
                  className="pos-search-input-modern"
                  placeholder="Search products by name, barcode, SKU..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                />
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(''); setShowResults(false); setSearchResults([]); }}
                    className="pos-search-clear"
                  >
                    <X size={16} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsCameraScannerOpen(true)}
                  className="pos-search-camera-btn"
                  title="Scan Barcode / QR with Camera"
                >
                  <Camera size={16} />
                  <span>Scan</span>
                </button>
                <span className="pos-search-kbd-modern">F1</span>
              </div>

              {/* Search Results Dropdown */}
              {showResults && (
                <div className="pos-search-dropdown-modern">
                  <div className="search-results-header">
                    <span>Products found ({searchResults.length})</span>
                    <span className="hint-text">↑ ↓ to navigate · Enter to add</span>
                  </div>
                  {searchResults.map((product, index) => {
                    const allBarcodes = Array.from(new Set([
                      product.barcode,
                      ...(product.alternative_units || []).map(au => au.barcode)
                    ].filter(Boolean))).join(', ');

                    return (
                      <div
                        key={product.product_id}
                        ref={(element) => { searchResultRefs.current[index] = element; }}
                        className={`pos-search-result-modern ${index === selectedSearchResultIndex ? 'selected' : ''}`}
                        onMouseEnter={() => setSelectedSearchResultIndex(index)}
                        onClick={() => handleAddToCart(product)}
                      >
                        <div className="result-icon">
                          <Package size={18} />
                        </div>
                        <div className="result-info">
                          <div className="result-name">{product.product_name}</div>
                          <div className="result-meta">
                            {product.product_code && `Code: ${product.product_code}`}
                            {allBarcodes && ` · Barcode: ${allBarcodes}`}
                          </div>
                        </div>
                        <div className="result-right">
                          <div className="result-price">Rs.{parseFloat(product.unit_price).toFixed(2)}</div>
                          <div className={`result-stock ${product.stock_quantity <= 10 ? 'low' : ''}`}>
                            Stock: {product.stock_quantity}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {searchQuery.trim() && !showResults && searchResults.length === 0 && (
                <div className="pos-search-dropdown-modern no-results">
                  <div className="no-results-icon"></div>
                  <div>No products found for "{searchQuery.trim()}"</div>
                  <div className="no-results-hint">Try searching by name, barcode or SKU</div>
                </div>
              )}
            </div>

            <div className="pos-selected-products-header-modern">
              <div className="catalog-title">
                <Package size={18} />
                <span>Selected Products</span>
                <span className="catalog-count">{cartItemCount}</span>
              </div>
            </div>

            <div className="pos-selected-products-modern">
              {cart.length === 0 ? (
                <div className="cart-empty-modern">
                  <div className="empty-cart-icon"><ShoppingCart size={32} strokeWidth={1.5} /></div>
                  <div className="empty-cart-text">No items added</div>
                  <div className="empty-cart-sub">Search or click a product to add</div>
                </div>
              ) : (
                <div className="cart-items-modern" onKeyDown={handleCartGridKeyDown}>
                  <table className="cart-table-modern">
                    <thead>
                      <tr>
                        <th style={{ minWidth: '90px' }}>Product</th>
                        <th style={{ width: '100px', textAlign: 'center' }}>Unit</th>
                        <th style={{ width: '75px', textAlign: 'center' }}>Qty</th>
                        <th style={{ width: '95px', textAlign: 'center' }}>Discount</th>
                        <th style={{ width: '105px', textAlign: 'right' }}>Total</th>
                        <th style={{ width: '32px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map((item, idx) => {
                        const isHighlighted = highlightedItemId === `${item.product_id}_${item.selected_unit_id}`;
                        return (
                          <tr key={idx} className={isHighlighted ? 'row-scan-highlight' : ''}>
                            <td>
                              <div className="table-item-name" title={item.product_name}>{item.product_name}</div>
                              <div className="table-item-price">Rs.{item.unit_price.toFixed(2)} per {item.selected_unit_name || 'unit'}</div>
                            </td>

                            {/* Unit column — always a select; shows options if multi-unit, single option if not */}
                            <td style={{ textAlign: 'center' }}>
                              <select id="select_field" name="select_field"
                                className={`unit-select-table${item.available_units && item.available_units.length > 1 ? ' multi' : ' single'}`}
                                data-cart-row={idx}
                                data-cart-field="unit"
                                value={item.selected_unit_id}
                                onChange={(e) => handleUnitChange(idx, e.target.value)}
                                disabled={!item.available_units || item.available_units.length <= 1}
                              >
                                {(item.available_units || []).map(au => (
                                  <option key={au.unit_id} value={au.unit_id}>
                                    {au.unit_name}
                                  </option>
                                ))}
                              </select>
                            </td>

                            <td style={{ textAlign: 'center' }}>
                              <input id="quantity" name="quantity"
                                type="number"
                                className="qty-input-table"
                                data-cart-row={idx}
                                data-cart-field="quantity"
                                value={item.quantity}
                                onChange={(e) => handleUpdateQty(idx, parseFloat(e.target.value) || 0)}
                                min="0.01"
                                step="0.01"
                              />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <input id="number_field" name="number_field"
                                type="text"
                                inputMode="decimal"
                                className="discount-input-table"
                                data-cart-row={idx}
                                data-cart-field="discount"
                                value={item.discountInput !== undefined ? item.discountInput : (item.discount || 0)}
                                onChange={(e) => handleUpdateDiscount(idx, e.target.value)}
                                onBlur={() => handleBlurDiscount(idx)}
                              />
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <strong>Rs.{((item.unit_price * item.quantity) - (item.discount || 0)).toFixed(2)}</strong>
                              {((item.unit_price * item.quantity) - (item.discount || 0)) < (item.cost_price || 0) * item.quantity && (
                                <div className="discount-warning">Final price below cost</div>
                              )}
                            </td>
                            <td>
                              <button className="table-remove-btn" onClick={() => handleRemoveFromCart(idx)}>
                                <X size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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

              {cart.length === 0 && (
                <div className="cart-empty-modern">
                  <div className="empty-cart-icon"><ShoppingCart size={32} strokeWidth={1.5} /></div>
                  <div className="empty-cart-text">No items selected</div>
                  <div className="empty-cart-sub">Search and add products from the left panel.</div>
                </div>
              )}

              {/* Payment Summary */}
              <div className="payment-summary-modern">
                <div className="summary-row">
                  <span className="summary-label">Subtotal ({cartItemCount} items)</span>
                  <span className="summary-value">Rs.{subtotal.toFixed(2)}</span>
                </div>

                <div className="summary-row">
                  <span className="summary-label">Discount</span>
                  <span className="summary-value">Rs.{totalDiscount.toFixed(2)}</span>
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
                    <span className="pos-search-kbd-modern">F6</span>
                  </label>
                  <div className="amount-input-wrapper">
                    <span className="currency-prefix">Rs.</span>
                    <input
                      id="amountPaid"
                      name="amountPaid"
                      className="amount-input"
                      ref={amountPaidInputRef}
                      type="number"
                      value={payData.amountPaid || ''}
                      onChange={(e) => setPayData({ ...payData, amountPaid: e.target.value })}
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="payment-summary-scroll">
                  {/* Change or Due */}
                  {hasAmountPaid && (
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
                        <input id="customer_name_required" name="customer_name_required"
                          placeholder="Customer Name (Required)"
                          value={payData.customerName || ''}
                          onChange={(e) => setPayData({ ...payData, customerName: e.target.value })}
                          readOnly={customerExists}
                        />
                      </div>
                      <div className="partial-input-group">
                        <Phone size={14} className="input-icon" />
                        <input id="phone_number_required" name="phone_number_required"
                          placeholder="Phone Number (Required)"
                          value={payData.customerPhone || ''}
                          type="tel"
                          maxLength={10}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                            setPayData((prev) => ({ ...prev, customerPhone: raw }));
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
                        <input id="address" name="address"
                          placeholder="Address"
                          value={payData.customerAddress || ''}
                          onChange={(e) => setPayData({ ...payData, customerAddress: e.target.value })}
                          readOnly={customerExists}
                        />
                      </div>
                      {isPartial && (
                        <div className="partial-input-group" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                          <label htmlFor="expected_payment_date" style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                            <Calendar size={13} /> Expected Payment Date (Required)
                          </label>
                          <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                            <Calendar size={14} className="input-icon" />
                            <input
                              id="expected_payment_date"
                              name="expected_payment_date"
                              type="date"
                              min={new Date().toISOString().split('T')[0]}
                              value={payData.expectedPaymentDate || ''}
                              onChange={(e) => setPayData({ ...payData, expectedPaymentDate: e.target.value })}
                              required
                              style={{ width: '100%' }}
                            />
                          </div>
                        </div>
                      )}
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
                    disabled={cart.length === 0 || !hasAmountPaid || amountPaidValue < 0}
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
      )}

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
              <p>This product batch has expired. Sales are not allowed.</p>
              {expiredProduct?.expiry_date && (
                <p className="expired-modal-date"><strong>Expired: {formatExpiryDate(expiredProduct.expiry_date)}</strong></p>
              )}
            </div>
            <button className="expired-modal-btn" onClick={() => setShowExpiredModal(false)}>
              OK
            </button>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {lastBill && (
        <div className="receipt-overlay-modern" onDoubleClick={(event) => {
          if (event.target === event.currentTarget) setLastBill(null);
        }}>
          <div className="receipt-modal-modern">
            <div className="receipt-header">
              <div className="receipt-store">MATHUMITHAN HARDWARE AND TIMPERDEPOT</div>
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
              {lastBill.expected_payment_date && (
                <div><span className="meta-label">Expected Payment</span><span className="meta-value">{lastBill.expected_payment_date}</span></div>
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
                      <div className="receipt-item-detail">Rs.{item.unit_price.toFixed(2)} Ã— {item.quantity}</div>
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
              <button className="receipt-btn print" onClick={handleThermalPrint}>
                <Printer size={14} /> Print Thermal (F9)
              </button>
              <button className="receipt-btn download" onClick={handleDownloadPdf}>
                <Download size={14} /> A4 Invoice (F7)
              </button>
              <button className="receipt-btn close" onClick={() => setLastBill(null)}>
                Close (F8)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Barcode Scanner Modal */}
      <CameraScannerModal
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        onScan={handleBarcodeScan}
      />

      {/* Attach Unrecognized Barcode Modal */}
      <AttachBarcodeModal
        isOpen={isAttachModalOpen}
        barcode={unrecognizedBarcode}
        onClose={() => setIsAttachModalOpen(false)}
        onAttached={handleBarcodeAttached}
      />
    </div>
  );
};

export default BillingSystem;