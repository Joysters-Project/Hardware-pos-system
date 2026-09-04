import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, Save, Send } from 'lucide-react';
import { ProductSearchSelect } from '@/components/procurement/ProductSearchSelect';
import { useActiveSuppliers, useProducts, useCreatePurchaseOrder } from '@/services/procurementApi';
import '@/styles/Procurement.css';
import '@/styles/BillingSystem.css';

export default function CreatePurchaseOrder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const today = new Date().toISOString().split('T')[0];
  const qtyInputRef = useRef(null);

  const [supplierId, setSupplierId] = useState('');
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  // Product search and add fields
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [addQty, setAddQty] = useState(1);

  const { data: suppliers = [], isLoading: sl } = useActiveSuppliers();
  const { data: products = [], isLoading: pl } = useProducts();
  const createMutation = useCreatePurchaseOrder();
  const isBusy = createMutation.isPending;

  const prefilledProductId = searchParams.get('productId');
  const returnTo = searchParams.get('returnTo');

  useEffect(() => {
    if (prefilledProductId && products.length > 0) {
      const product = products.find(p => p.product_id === parseInt(prefilledProductId, 10));
      if (product) {
        const autoItem = {
          product_id: product.product_id,
          product_name: product.product_name,
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
    setItems(prev => prev.map((item, i) => (i === index ? { ...item, ...updates } : item)));

  const handleQtyChange = (index, qty) => {
    const q = parseFloat(qty);
    if (isNaN(q) || q <= 0) return;
    updateItem(index, { quantity: q, total_price: parseFloat((q * (Number(items[index].cost_price) || 0)).toFixed(2)) });
  };

  const handleAddProduct = () => {
    setError('');
    const parsedQty = parseFloat(addQty);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      setError('Please enter a valid quantity greater than 0');
      return;
    }

    const productToAdd = selectedProduct || products.find(p => p.product_id === parseInt(selectedProductId, 10));
    if (!productToAdd) {
      setError('Please select a product from the search field');
      return;
    }

    const unitCost = Number(productToAdd.cost_price) || 0;

    setItems(prev => {
      const existingIndex = prev.findIndex(item => item.product_id === productToAdd.product_id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        const newQty = parseFloat(((parseFloat(updated[existingIndex].quantity) || 0) + parsedQty).toFixed(4));
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          cost_price: unitCost,
          total_price: parseFloat((newQty * unitCost).toFixed(2)),
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            product_id: productToAdd.product_id,
            product_name: productToAdd.product_name,
            quantity: parsedQty,
            cost_price: unitCost,
            total_price: parseFloat((parsedQty * unitCost).toFixed(2)),
          },
        ];
      }
    });

    // Clear search field and reset quantity to 1
    setSelectedProductId('');
    setSelectedProduct(null);
    setAddQty(1);
  };

  const submit = async (status) => {
    setError('');
    if (!supplierId) {
      setError('Please select a supplier');
      return;
    }
    if (items.length === 0) {
      setError('Please add at least one product to the order');
      return;
    }
    if (items.some(i => !i.product_id || !i.quantity || i.quantity <= 0)) {
      setError('All items must have a valid quantity');
      return;
    }
    try {
      await createMutation.mutateAsync({
        supplier_id: parseInt(supplierId, 10),
        po_date: today,
        expected_delivery: expectedDelivery || null,
        status,
        notes: notes || null,
        items: items.map(i => ({
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price: i.cost_price,
          total_price: i.total_price,
        })),
      });
      navigate(returnTo ? decodeURIComponent(returnTo) : '/procurement/orders');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create purchase order');
    }
  };

  if (sl || pl) {
    return (
      <div className="proc-container">
        <div className="proc-loading-wrap">
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              className="proc-skeleton"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.1 }}
            />
          ))}
        </div>
      </div>
    );
  }

  const selectedSupplier = suppliers.find(s => s.supplier_id === parseInt(supplierId, 10));

  return (
    <div className="proc-container">
      {/* Header */}
      <motion.div
        className="proc-header"
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <motion.button
            className="proc-back-btn"
            onClick={() => navigate('/procurement/orders')}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
          >
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
          <motion.div
            className="proc-error-banner"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="proc-create-grid">
        {/* Left */}
        <div className="proc-create-main">
          {/* PO Details Card */}
          <motion.div
            className="proc-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="proc-card-header">
              <h2>Purchase Order Details</h2>
            </div>
            <div className="proc-card-body">
              <div className="proc-form-grid">
                <div className="proc-field">
                  <label>PO Date</label>
                  <input id="today" name="today" className="proc-input proc-input-readonly" value={today} readOnly />
                </div>
                <div className="proc-field">
                  <label>Expected Delivery</label>
                  <input
                    id="expectedDelivery"
                    name="expectedDelivery"
                    type="date"
                    className="proc-input"
                    min={today}
                    value={expectedDelivery}
                    onChange={e => setExpectedDelivery(e.target.value)}
                  />
                </div>
                <div className="proc-field proc-field-full">
                  <label>
                    Supplier <span className="req">*</span>
                  </label>
                  <select
                    id="supplierId"
                    name="supplierId"
                    className="proc-input"
                    value={supplierId}
                    onChange={e => setSupplierId(e.target.value)}
                  >
                    <option value="">-- Select Supplier --</option>
                    {suppliers.map(s => (
                      <option key={s.supplier_id} value={s.supplier_id}>
                        {s.supplier_name}
                        {s.phone ? ` — ${s.phone}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="proc-field proc-field-full">
                  <label>Notes</label>
                  <textarea
                    id="notes"
                    name="notes"
                    className="proc-input proc-textarea"
                    rows={3}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Additional notes or instructions..."
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Line Items Card */}
          <motion.div
            className="proc-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="proc-card-header">
              <div>
                <h2>Line Items</h2>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
                  Search and add products to your purchase order.
                </p>
              </div>
              <motion.span
                className="proc-badge-count"
                key={items.length}
                initial={{ scale: 1.3 }}
                animate={{ scale: 1 }}
              >
                {items.length} item{items.length !== 1 ? 's' : ''}
              </motion.span>
            </div>

            <div className="proc-card-body" style={{ paddingBottom: '1rem' }}>
              {/* Product Search & Add Section using Billing Counter Search UI Design */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(240px, 1fr) 110px auto',
                  gap: '12px',
                  alignItems: 'end',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#6f5f5c',
                      marginBottom: '6px',
                    }}
                  >
                    Product Search
                  </label>
                  <ProductSearchSelect
                    products={products}
                    value={selectedProductId}
                    onSelect={(id, prod) => {
                      setSelectedProductId(id || '');
                      setSelectedProduct(prod || null);
                    }}
                    onEnter={handleAddProduct}
                    placeholder="Search products by name, barcode, SKU..."
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', width: '110px' }}>
                  <label
                    htmlFor="add_qty"
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#6f5f5c',
                      marginBottom: '6px',
                    }}
                  >
                    Quantity
                  </label>
                  <div
                    className="pos-search-bar-modern"
                    style={{
                      padding: '0 0.5rem',
                      height: '44px',
                      display: 'flex',
                      alignItems: 'center',
                      boxSizing: 'border-box',
                      background: '#fff',
                    }}
                  >
                    <input
                      id="add_qty"
                      name="add_qty"
                      ref={qtyInputRef}
                      type="number"
                      step="any"
                      min="0.001"
                      max="999999"
                      className="pos-search-input-modern"
                      style={{
                        textAlign: 'center',
                        fontWeight: 600,
                        fontSize: '0.938rem',
                        width: '100%',
                        padding: 0,
                        margin: 0,
                      }}
                      value={addQty}
                      onFocus={e => e.target.select()}
                      onChange={e => {
                        const val = e.target.value;
                        setAddQty(val);
                      }}
                      onBlur={() => {
                        const parsed = parseFloat(addQty);
                        if (isNaN(parsed) || parsed <= 0) {
                          setAddQty(1);
                        }
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddProduct();
                        }
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', height: '44px' }}>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="proc-btn-primary"
                    style={{
                      height: '44px',
                      borderRadius: '2rem',
                      padding: '0 1.5rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      boxShadow: '0 4px 12px rgba(139, 58, 58, 0.25)',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      boxSizing: 'border-box',
                    }}
                    onClick={handleAddProduct}
                  >
                    <Plus size={16} /> Add
                  </motion.button>
                </div>
              </div>
            </div>

            <div className="proc-table-wrap">
              <table className="proc-table proc-items-table">
                <thead>
                  <tr>
                    <th style={{ width: '45px' }}>#</th>
                    <th>Product</th>
                    <th style={{ width: '120px' }}>Quantity</th>
                    <th style={{ textAlign: 'right', width: '140px' }}>Unit Cost</th>
                    <th style={{ textAlign: 'right', width: '140px' }}>Total</th>
                    <th style={{ textAlign: 'center', width: '80px' }}>Remove</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {items.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          style={{
                            textAlign: 'center',
                            padding: '2.5rem 1rem',
                            color: '#94a3b8',
                            fontSize: '0.9rem',
                          }}
                        >
                          No products added yet. Search and add products using the bar above.
                        </td>
                      </tr>
                    ) : (
                      items.map((item, index) => {
                        const productInfo = products.find(p => p.product_id === item.product_id);
                        return (
                          <motion.tr
                            key={item.product_id || index}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 12, height: 0 }}
                            transition={{ duration: 0.22 }}
                          >
                            <td>
                              <span className="proc-row-num">{index + 1}</span>
                            </td>
                            <td>
                              <div className="proc-name-cell">
                                <strong>
                                  {item.product_name || productInfo?.product_name || `Product #${item.product_id}`}
                                </strong>
                                {productInfo?.batch_no && (
                                  <span
                                    className="proc-code-badge"
                                    style={{ marginLeft: '8px', fontSize: '11px' }}
                                  >
                                    {productInfo.batch_no}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <input
                                id={`quantity-${item.product_id}`}
                                name={`quantity-${item.product_id}`}
                                type="number"
                                step="any"
                                min="0.001"
                                className="proc-input proc-input-qty"
                                style={{ width: '85px', textAlign: 'center' }}
                                value={item.quantity}
                                onChange={e => handleQtyChange(index, e.target.value)}
                              />
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <span className="proc-amount">
                                LKR {Number(item.cost_price).toFixed(2)}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <motion.span
                                className="proc-amount"
                                key={item.total_price}
                                initial={{ scale: 1.1, color: '#8b3a3a' }}
                                animate={{ scale: 1, color: '#2c2c2c' }}
                                transition={{ duration: 0.3 }}
                              >
                                <strong>LKR {Number(item.total_price).toFixed(2)}</strong>
                              </motion.span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <motion.button
                                type="button"
                                whileHover={{ scale: 1.15 }}
                                whileTap={{ scale: 0.9 }}
                                className="proc-icon-btn delete"
                                title="Remove product"
                                onClick={() => setItems(p => p.filter((_, i) => i !== index))}
                              >
                                <Trash2 size={13} />
                              </motion.button>
                            </td>
                          </motion.tr>
                        );
                      })
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>

        {/* Summary Sidebar */}
        <motion.div
          className="proc-create-sidebar"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="proc-card proc-summary-card">
            <div className="proc-card-header">
              <h2>Order Summary</h2>
            </div>
            <div className="proc-card-body">
              <AnimatePresence>
                {selectedSupplier && (
                  <motion.div
                    className="proc-supplier-chip"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    <div className="proc-supplier-chip-label">Supplier</div>
                    <div className="proc-supplier-chip-name">{selectedSupplier.supplier_name}</div>
                    {selectedSupplier.phone && (
                      <div className="proc-supplier-chip-sub">{selectedSupplier.phone}</div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="proc-summary-rows">
                <div className="proc-summary-row">
                  <span className="proc-summary-label">Total Items</span>
                  <motion.span
                    className="proc-summary-value"
                    key={items.length}
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                  >
                    {items.length}
                  </motion.span>
                </div>
                <div className="proc-summary-row">
                  <span className="proc-summary-label">Total Quantity</span>
                  <span className="proc-summary-value">
                    {parseFloat(items.reduce((s, i) => s + (parseFloat(i.quantity) || 0), 0).toFixed(3))}
                  </span>
                </div>
              </div>

              <div className="proc-grand-total">
                <span>Grand Total</span>
                <motion.strong
                  key={grandTotal}
                  initial={{ scale: 1.12, color: '#a84545' }}
                  animate={{ scale: 1, color: '#8b3a3a' }}
                  transition={{ duration: 0.3 }}
                >
                  LKR {grandTotal.toFixed(2)}
                </motion.strong>
              </div>

              <div className="proc-summary-actions">
                <motion.button
                  whileHover={{ scale: isBusy ? 1 : 1.03 }}
                  whileTap={{ scale: isBusy ? 1 : 0.97 }}
                  className="proc-btn-primary proc-btn-full"
                  onClick={() => submit('Pending')}
                  disabled={isBusy}
                >
                  <Save size={14} /> {isBusy ? 'Saving...' : 'Save as Draft'}
                </motion.button>
                <motion.button
                  whileHover={{ scale: isBusy ? 1 : 1.03 }}
                  whileTap={{ scale: isBusy ? 1 : 0.97 }}
                  className="proc-btn-approve proc-btn-full"
                  onClick={() => submit('Approved')}
                  disabled={isBusy}
                >
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