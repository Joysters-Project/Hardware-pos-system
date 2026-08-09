import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Loader2, Package, Tag, DollarSign, Boxes, Hash, Calendar } from 'lucide-react';
import { productService, categoryService, brandService, unitService } from '../../services/api';
import toast from 'react-hot-toast';
import '../../styles/ProductForm.css';

const fieldVariants = {
  hidden:  { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0 },
};

export default function ProductForm() {
  const navigate = useNavigate();
  const { id }   = useParams();
  const isEdit   = Boolean(id);

  const [formData, setFormData] = useState({
    product_name: '', unit_price: '', cost_price: '',
    stock_quantity: '0', min_stock_quantity: '0', reorder_level: '',
    type: '', batch_no: '', expiry_date: '',
    category_id: '', brand_id: '', unit_id: '',
  });
  const [categories, setCategories] = useState([]);
  const [brands,     setBrands]     = useState([]);
  const [units,      setUnits]      = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [fetching,   setFetching]   = useState(isEdit);
  const [error,      setError]      = useState(null);
  const [alternativeUnits, setAlternativeUnits] = useState([]);

  const addAlternativeUnitRow = () => {
    setAlternativeUnits((prev) => [
      ...prev,
      { unit_id: '', conversion_factor: '', unit_price: '', cost_price: '', barcode: '' },
    ]);
  };

  const removeAlternativeUnitRow = (index) => {
    setAlternativeUnits((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAltUnitChange = (index, field, value) => {
    setAlternativeUnits((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };


  useEffect(() => {
    fetchReferenceData();
    if (isEdit) fetchProduct();
  }, [id]);

  const fetchReferenceData = async () => {
    try {
      const [catRes, brandRes, unitRes] = await Promise.all([
        categoryService.getAll(), brandService.getAll(), unitService.getAll(),
      ]);
      setCategories(catRes.data);
      setBrands(brandRes.data);
      setUnits(unitRes.data);
    } catch {
      toast.error('Failed to load reference data');
    }
  };

  const fetchProduct = async () => {
    try {
      setFetching(true);
      const { data: p } = await productService.getById(id);
      setFormData({
        product_name:       p.product_name        || '',
        unit_price:         p.unit_price?.toString()         || '',
        cost_price:         p.cost_price?.toString()         || '',
        stock_quantity:     p.stock_quantity?.toString()     || '0',
        min_stock_quantity: p.min_stock_quantity?.toString() || '0',
        reorder_level:      p.reorder_level?.toString()      || '',
        type:               p.type      || '',
        batch_no:           p.batch_no  || '',
        expiry_date:        p.expiry_date ? String(p.expiry_date).slice(0, 10) : '',
        category_id:        p.category_id?.toString() || '',
        brand_id:           p.brand_id?.toString()   || '',
        unit_id:            p.unit_id?.toString()    || '',
      });
      if (p.alternative_units && Array.isArray(p.alternative_units)) {
        setAlternativeUnits(p.alternative_units.map(au => ({
          unit_id: au.unit_id.toString(),
          conversion_factor: au.conversion_factor.toString(),
          unit_price: au.unit_price?.toString() || '',
          cost_price: au.cost_price?.toString() || '',
          barcode: au.barcode || ''
        })));
      }
    } catch {
      setError('Failed to fetch product');
      toast.error('Failed to fetch product');
    } finally {
      setFetching(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!formData.product_name || !formData.unit_price || !formData.cost_price || !formData.category_id || !formData.unit_id) {
      setError('Product name, unit price, cost price, category and unit are required');
      return;
    }
    try {
      const altUnitsPayload = alternativeUnits.map(au => ({
        unit_id: parseInt(au.unit_id),
        conversion_factor: parseFloat(au.conversion_factor),
        unit_price: au.unit_price ? parseFloat(au.unit_price) : null,
        cost_price: au.cost_price ? parseFloat(au.cost_price) : null,
        barcode: au.barcode ? au.barcode.trim() : null
      }));

      for (const au of altUnitsPayload) {
        if (isNaN(au.unit_id) || isNaN(au.conversion_factor) || au.conversion_factor <= 0) {
          setError('Please select a unit and enter a positive conversion factor for all alternative packaging units.');
          return;
        }
      }

      setLoading(true);
      const data = {
        product_name:       formData.product_name,
        unit_price:         parseFloat(formData.unit_price),
        cost_price:         parseFloat(formData.cost_price),
        stock_quantity:     parseFloat(formData.stock_quantity)     || 0,
        min_stock_quantity: parseFloat(formData.min_stock_quantity) || 0,
        reorder_level:      parseFloat(formData.reorder_level)      || 0,
        type:               formData.type,
        batch_no:           formData.batch_no    || null,
        expiry_date:        formData.expiry_date || null,
        category_id:        parseInt(formData.category_id),
        brand_id:           formData.brand_id ? parseInt(formData.brand_id) : null,
        unit_id:            parseInt(formData.unit_id),
        alternative_units:  altUnitsPayload
      };
      if (isEdit) {
        await productService.update(id, data);
        toast.success('Product updated successfully');
      } else {
        await productService.create(data);
        toast.success('Product created successfully');
      }
      navigate('/products');
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to save product';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="pf-skeleton-page">
        <div className="pf-skeleton-header">
          <div className="pf-skeleton-box" style={{ width: 38, height: 38, borderRadius: 9 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="pf-skeleton-box" style={{ width: 200, height: 28 }} />
            <div className="pf-skeleton-box" style={{ width: 260, height: 16 }} />
          </div>
        </div>
        <div className="pf-card" style={{ maxWidth: 820 }}>
          <div className="pf-card-header"><h2>Loading...</h2></div>
          <div className="pf-card-body">
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div className="pf-skeleton-box" style={{ width: 100, height: 14 }} />
                <div className="pf-skeleton-box" style={{ width: '100%', height: 40 }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div className="pf-page"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

      {/* Header */}
      <div className="pf-header">
        <Link to="/products" className="pf-back-btn">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1>{isEdit ? 'Edit Product' : 'Add Product'}</h1>
          <p>{isEdit ? 'Update product information' : 'Add a new product to your inventory'}</p>
        </div>
      </div>

      {/* Form Card */}
      <form onSubmit={handleSubmit}>
        <motion.div className="pf-card"
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="pf-card-header">
            <Package size={18} />
            <div>
              <h2>Product Information</h2>
              <p>Fields marked with * are required</p>
            </div>
          </div>

          <div className="pf-card-body">
            {error && (
              <motion.div className="pf-error"
                initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
                {error}
              </motion.div>
            )}

            {/* Product Name */}
            <motion.div className="pf-field" variants={fieldVariants} initial="hidden" animate="visible" transition={{ delay: 0.12 }}>
              <label className="pf-label"><Tag size={13} /> Product Name <span className="pf-req">*</span></label>
              <input className="pf-input" name="product_name" value={formData.product_name}
                onChange={handleChange} placeholder="Enter product name" required />
            </motion.div>

            {/* Type, Batch, Expiry */}
            <motion.div className="pf-grid-3" variants={fieldVariants} initial="hidden" animate="visible" transition={{ delay: 0.16 }}>
              <div className="pf-field">
                <label className="pf-label"><Package size={13} /> Product Type</label>
                <input className="pf-input" name="type" value={formData.type}
                  onChange={handleChange} placeholder="e.g. Hardware" />
              </div>
              <div className="pf-field">
                <label className="pf-label"><Hash size={13} /> Batch Number</label>
                <input className="pf-input" name="batch_no" value={formData.batch_no}
                  onChange={handleChange} placeholder="e.g. BATCH-001" />
              </div>
              <div className="pf-field">
                <label className="pf-label"><Calendar size={13} /> Expiry Date</label>
                <input className="pf-input" type="date" name="expiry_date"
                  value={formData.expiry_date} onChange={handleChange} />
              </div>
            </motion.div>

            {/* Prices */}
            <motion.div className="pf-grid-2" variants={fieldVariants} initial="hidden" animate="visible" transition={{ delay: 0.2 }}>
              <div className="pf-field">
                <label className="pf-label"><DollarSign size={13} /> Cost Price <span className="pf-req">*</span></label>
                <input className="pf-input" type="number" step="0.01" min="0" name="cost_price"
                  value={formData.cost_price} onChange={handleChange} placeholder="0.00" required />
              </div>
              <div className="pf-field">
                <label className="pf-label"><DollarSign size={13} /> Unit Price <span className="pf-req">*</span></label>
                <input className="pf-input" type="number" step="0.01" min="0" name="unit_price"
                  value={formData.unit_price} onChange={handleChange} placeholder="0.00" required />
              </div>
            </motion.div>

            {/* Category, Brand, Unit */}
            <motion.div className="pf-grid-3" variants={fieldVariants} initial="hidden" animate="visible" transition={{ delay: 0.24 }}>
              <div className="pf-field">
                <label className="pf-label">Category <span className="pf-req">*</span></label>
                <select className="pf-select" name="category_id" value={formData.category_id}
                  onChange={handleChange} required>
                  <option value="">Select Category</option>
                  {categories.map(c => (
                    <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
                  ))}
                </select>
              </div>
              <div className="pf-field">
                <label className="pf-label">Brand</label>
                <select className="pf-select" name="brand_id" value={formData.brand_id} onChange={handleChange}>
                  <option value="">Select Brand</option>
                  {brands.map(b => (
                    <option key={b.brand_id} value={b.brand_id}>{b.brand_name}</option>
                  ))}
                </select>
              </div>
              <div className="pf-field">
                <label className="pf-label">Unit <span className="pf-req">*</span></label>
                <select className="pf-select" name="unit_id" value={formData.unit_id}
                  onChange={handleChange} required>
                  <option value="">Select Unit</option>
                  {units.map(u => (
                    <option key={u.unit_id} value={u.unit_id}>{u.unit_name}</option>
                  ))}
                </select>
              </div>
            </motion.div>

            {/* Stock Levels */}
            <motion.div className="pf-grid-3" variants={fieldVariants} initial="hidden" animate="visible" transition={{ delay: 0.28 }}>
              <div className="pf-field">
                <label className="pf-label"><Boxes size={13} /> Stock Quantity</label>
                <input className="pf-input" type="number" min="0" name="stock_quantity"
                  value={formData.stock_quantity} onChange={handleChange} />
              </div>
              <div className="pf-field">
                <label className="pf-label"><Boxes size={13} /> Min Stock Quantity</label>
                <input className="pf-input" type="number" min="0" name="min_stock_quantity"
                  value={formData.min_stock_quantity} onChange={handleChange} />
              </div>
              <div className="pf-field">
                <label className="pf-label"><Boxes size={13} /> Reorder Level</label>
                <input className="pf-input" type="number" min="0" name="reorder_level"
                  value={formData.reorder_level} onChange={handleChange} />
              </div>
            </motion.div>

            <motion.div className="pf-section-header" style={{ marginTop: '24px' }} variants={fieldVariants} initial="hidden" animate="visible" transition={{ delay: 0.30 }}>
              <h3 className="pf-label" style={{ fontSize: '16px', fontWeight: '600' }}>Alternative Packaging Units</h3>
            </motion.div>
            
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '16px' }}>
              Define alternative measurements (e.g., Box, Roll, Packet) and how many base units they contain.
            </p>

            {alternativeUnits.map((item, idx) => (
              <motion.div key={idx} className="alt-unit-row" style={{ border: '1px solid #eef2f6', padding: '16px', borderRadius: '12px', marginBottom: '16px', backgroundColor: '#fcfcfd', position: 'relative' }} variants={fieldVariants} initial="hidden" animate="visible">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div className="pf-field">
                    <label className="pf-label">Alternative Unit <span className="pf-req">*</span></label>
                    <select id="unit_id" name="unit_id" className="pf-select" value={item.unit_id} onChange={(e) => handleAltUnitChange(idx, "unit_id", e.target.value)}>
                      <option value="">Select Unit</option>
                      {units.map(u => (
                        <option key={u.unit_id} value={u.unit_id} disabled={parseInt(u.unit_id) === parseInt(formData.unit_id)}>{u.unit_name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="pf-field">
                    <label className="pf-label">Conversion Factor <span className="pf-req">*</span></label>
                    <input id="conversion_factor" name="conversion_factor" className="pf-input" type="number" min="0.0001" step="0.0001" placeholder="e.g. 50" value={item.conversion_factor} onChange={(e) => handleAltUnitChange(idx, "conversion_factor", e.target.value)} />
                  </div>

                  <div className="pf-field">
                    <label className="pf-label">Custom Price (Optional)</label>
                    <input id="unit_price" name="unit_price" className="pf-input" type="number" min="0" step="0.01" placeholder="Defaults to Base * Factor" value={item.unit_price} onChange={(e) => handleAltUnitChange(idx, "unit_price", e.target.value)} />
                  </div>

                  <div className="pf-field">
                    <label className="pf-label">Custom Cost (Optional)</label>
                    <input id="cost_price" name="cost_price" className="pf-input" type="number" min="0" step="0.01" placeholder="Defaults to Base * Factor" value={item.cost_price} onChange={(e) => handleAltUnitChange(idx, "cost_price", e.target.value)} />
                  </div>

                  <div className="pf-field">
                    <label className="pf-label">Barcode (Optional)</label>
                    <input id="barcode" name="barcode" className="pf-input" type="text" placeholder="e.g. 123456789" value={item.barcode} onChange={(e) => handleAltUnitChange(idx, "barcode", e.target.value)} />
                  </div>
                </div>

                <button type="button" onClick={() => removeAlternativeUnitRow(idx)} style={{ position: 'absolute', right: '12px', top: '12px', background: 'none', border: 'none', color: '#dc2626', fontWeight: '600', cursor: 'pointer', fontSize: '12px' }}>
                  Remove
                </button>
              </motion.div>
            ))}

            <button type="button" onClick={addAlternativeUnitRow} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#475569', fontWeight: '500', cursor: 'pointer', fontSize: '13px', marginBottom: '24px' }}>
              + Add Alternative Unit
            </button>

            <hr className="pf-divider" />

            {/* Actions */}
            <motion.div className="pf-footer" variants={fieldVariants} initial="hidden" animate="visible" transition={{ delay: 0.32 }}>
              <Link to="/products" className="pf-btn-cancel">Cancel</Link>
              <motion.button type="submit" className="pf-btn-submit" disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.02 }} whileTap={{ scale: loading ? 1 : 0.98 }}>
                {loading
                  ? <><Loader2 size={15} className="pf-spinner" /> Saving...</>
                  : <><Save size={15} /> {isEdit ? 'Update Product' : 'Add Product'}</>
                }
              </motion.button>
            </motion.div>
          </div>
        </motion.div>
      </form>
    </motion.div>
  );
}
