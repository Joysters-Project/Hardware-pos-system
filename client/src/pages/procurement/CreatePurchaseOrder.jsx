import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, Save, Send } from 'lucide-react';
import { ProductSearchSelect } from '@/components/procurement/ProductSearchSelect';
import { useActiveSuppliers, useProducts, useCreatePurchaseOrder } from '@/services/procurementApi';
import '@/styles/Procurement.css';

const emptyItem = () => ({ product_id: '', quantity: 1, cost_price: 0, total_price: 0 });

export default function CreatePurchaseOrder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const today    = new Date().toISOString().split('T')[0];

  const [supplierId,       setSupplierId]       = useState('');
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [notes,            setNotes]            = useState('');
  const [items,            setItems]            = useState([emptyItem()]);
  const [error,            setError]            = useState('');

  const { data: suppliers = [], isLoading: sl } = useActiveSuppliers();
  const { data: products  = [], isLoading: pl } = useProducts();
  const createMutation = useCreatePurchaseOrder();
  const isBusy = createMutation.isPending;

  const prefilledProductId = searchParams.get('productId');
  const returnTo = searchParams.get('returnTo');

  useEffect(() => {
    if (prefilledProductId && products.length > 0) {
      const product = products.find(p => p.product_id === parseInt(prefilledProductId));
      if (product) {
        const autoItem = {
          product_id: product.product_id,
          quantity: 1,
          cost_price: Number(product.cost_price) || 0,
          total_price: Number(product.cost_price) || 0,
        };
        setItems([autoItem]);
      }
    }
  }, [prefilledProductId, products]);

  const grandTotal = useMemo(
    () => items.reduce((s, i) => s + (Number(i.total_price) || 0), 0),
    [items]
  );

  const updateItem = (index, updates) =>
    setItems(prev => prev.map((item, i) => i === index ? { ...item, ...updates } : item));

  const handleProductChange = (index, productId, product) => {
    const selectedProduct = product || products.find(p => p.product_id === parseInt(productId));
    if (selectedProduct) {
      const qty = items[index].quantity || 1;
      updateItem(index, {
        product_id: selectedProduct.product_id,
        cost_price: Number(selectedProduct.cost_price),
        total_price: qty * Number(selectedProduct.cost_price),
      });
    } else {
      updateItem(index, { product_id: '', cost_price: 0, total_price: 0 });
    }
  };

  const handleQtyChange = (index, qty) => {
    const q = parseInt(qty) || 1;
    updateItem(index, { quantity: q, total_price: q * (items[index].cost_price || 0) });
  };

  const submit = async (status) => {
    setError('');
    if (!supplierId) { setError('Please select a supplier'); return; }
    if (items.some(i => !i.product_id)) { setError('All rows must have a product selected'); return; }
    try {
      await createMutation.mutateAsync({
        supplier_id: parseInt(supplierId), po_date: today,
        expected_delivery: expectedDelivery || null, status, notes: notes || null,
        items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity, unit_price: i.cost_price, total_price: i.total_price })),
      });
      navigate(returnTo ? decodeURIComponent(returnTo) : '/procurement/orders');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create purchase order');
    }
  };

  if (sl || pl) return (
    <div className="proc-container">
      <div className="proc-loading-wrap">
        {[...Array(4)].map((_, i) => (
          <motion.div key={i} className="proc-skeleton"
            animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.1 }} />
        ))}
      </div>
    </div>
  );

  const selectedSupplier = suppliers.find(s => s.supplier_id === parseInt(supplierId));

  return (
    <div className="proc-container">

      {/* Header */}
      <motion.div className="proc-header"
        initial={{ opacity: 0, y: -24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <motion.button className="proc-back-btn" onClick={() => navigate('/procurement/orders')}
            whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}>
            <ArrowLeft size={16} />
          </motion.button>
          <div>
            <h1>Create Purchase Order</h1>
            <p>Create a new purchase order for your suppliers</p>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div className="proc-error-banner"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="proc-create-grid">
        {/* Left */}
        <div className="proc-create-main">

          {/* PO Details Card */}
          <motion.div className="proc-card"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="proc-card-header"><h2>Purchase Order Details</h2></div>
            <div className="proc-card-body">
              <div className="proc-form-grid">
                <div className="proc-field">
                  <label>PO Date</label>
                  <input className="proc-input proc-input-readonly" value={today} readOnly />
                </div>
                <div className="proc-field">
                  <label>Expected Delivery</label>
                  <input type="date" className="proc-input" min={today}
                    value={expectedDelivery} onChange={e => setExpectedDelivery(e.target.value)} />
                </div>
                <div className="proc-field proc-field-full">
                  <label>Supplier <span className="req">*</span></label>
                  <select className="proc-input proc-select" value={supplierId} onChange={e => setSupplierId(e.target.value)}>
                    <option value="">-- Select Supplier --</option>
                    {suppliers.map(s => (
                      <option key={s.supplier_id} value={s.supplier_id}>
                        {s.supplier_name}{s.phone ? ` — ${s.phone}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="proc-field proc-field-full">
                  <label>Notes</label>
                  <textarea className="proc-input proc-textarea" rows={3} value={notes}
                    onChange={e => setNotes(e.target.value)} placeholder="Additional notes or instructions..." />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Line Items Card */}
          <motion.div className="proc-card"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="proc-card-header">
              <div>
                <h2>Line Items</h2>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
                  Search and select any product from your inventory.
                </p>
              </div>
              <motion.span className="proc-badge-count" key={items.length}
                initial={{ scale: 1.3 }} animate={{ scale: 1 }}>
                {items.length} item{items.length !== 1 ? 's' : ''}
              </motion.span>
            </div>
            <div className="proc-table-wrap">
              <table className="proc-table proc-items-table">
                <thead>
                  <tr>
                    <th>#</th><th>Product</th><th>Quantity</th>
                    <th style={{ textAlign: 'right' }}>Unit Cost</th>
                    <th style={{ textAlign: 'right' }}>Total</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {items.map((item, index) => (
                      <motion.tr key={index}
                        initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 12, height: 0 }}
                        transition={{ duration: 0.22 }}>
                        <td><span className="proc-row-num">{index + 1}</span></td>
                        <td>
                          <ProductSearchSelect
                            products={products}
                            value={item.product_id}
                            onSelect={(productId, product) => handleProductChange(index, productId, product)}
                            placeholder="Search products..."
                            emptyMessage="No products found."
                          />
                        </td>
                        <td>
                          <input type="number" min="1" className="proc-input proc-input-qty"
                            value={item.quantity} onChange={e => handleQtyChange(index, e.target.value)} />
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className="proc-amount">LKR {Number(item.cost_price).toFixed(2)}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <motion.span className="proc-amount" key={item.total_price}
                            initial={{ scale: 1.1, color: '#8b3a3a' }} animate={{ scale: 1, color: '#2c2c2c' }}
                            transition={{ duration: 0.3 }}>
                            <strong>LKR {Number(item.total_price).toFixed(2)}</strong>
                          </motion.span>
                        </td>
                        <td>
                          <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                            className="proc-icon-btn delete"
                            onClick={() => setItems(p => p.filter((_, i) => i !== index))}
                            disabled={items.length === 1}>
                            <Trash2 size={13} />
                          </motion.button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
            <div className="proc-add-row">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="proc-btn-outline proc-btn-add-row"
                onClick={() => setItems(p => [...p, emptyItem()])}>
                <Plus size={14} /> Add Product Row
              </motion.button>
            </div>
          </motion.div>
        </div>

        {/* Summary Sidebar */}
        <motion.div className="proc-create-sidebar"
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}>
          <div className="proc-card proc-summary-card">
            <div className="proc-card-header"><h2>Order Summary</h2></div>
            <div className="proc-card-body">
              <AnimatePresence>
                {selectedSupplier && (
                  <motion.div className="proc-supplier-chip"
                    initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                    <div className="proc-supplier-chip-label">Supplier</div>
                    <div className="proc-supplier-chip-name">{selectedSupplier.supplier_name}</div>
                    {selectedSupplier.phone && <div className="proc-supplier-chip-sub">{selectedSupplier.phone}</div>}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="proc-summary-rows">
                <div className="proc-summary-row">
                  <span className="proc-summary-label">Total Items</span>
                  <motion.span className="proc-summary-value" key={items.length}
                    initial={{ scale: 1.2 }} animate={{ scale: 1 }}>{items.length}</motion.span>
                </div>
                <div className="proc-summary-row">
                  <span className="proc-summary-label">Total Quantity</span>
                  <span className="proc-summary-value">{items.reduce((s, i) => s + (i.quantity || 0), 0)}</span>
                </div>
              </div>

              <div className="proc-grand-total">
                <span>Grand Total</span>
                <motion.strong key={grandTotal}
                  initial={{ scale: 1.12, color: '#a84545' }} animate={{ scale: 1, color: '#8b3a3a' }}
                  transition={{ duration: 0.3 }}>
                  LKR {grandTotal.toFixed(2)}
                </motion.strong>
              </div>

              <div className="proc-summary-actions">
                <motion.button whileHover={{ scale: isBusy ? 1 : 1.03 }} whileTap={{ scale: isBusy ? 1 : 0.97 }}
                  className="proc-btn-primary proc-btn-full" onClick={() => submit('Pending')} disabled={isBusy}>
                  <Save size={14} /> {isBusy ? 'Saving...' : 'Save as Draft'}
                </motion.button>
                <motion.button whileHover={{ scale: isBusy ? 1 : 1.03 }} whileTap={{ scale: isBusy ? 1 : 0.97 }}
                  className="proc-btn-approve proc-btn-full" onClick={() => submit('Approved')} disabled={isBusy}>
                  <Send size={14} /> {isBusy ? 'Processing...' : 'Approve & Send'}
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
