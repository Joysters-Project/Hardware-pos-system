import { useState, useEffect, useRef } from 'react';
import { Search, Plus, X, Package, FolderOpen, Clock, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import '../styles/ProjectsTab.css';

export default function ProjectsTab() {
  const [projects, setProjects]         = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [items, setItems]               = useState([]);
  const [products, setProducts]         = useState([]);
  const [searchQ, setSearchQ]           = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch]     = useState(false);
  const [qty, setQty]                   = useState(1);
  const [note, setNote]                 = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading]           = useState(false);
  const [dailyReport, setDailyReport]   = useState(null);
  const [showReport, setShowReport]     = useState(false);
  const searchRef = useRef();

  useEffect(() => { loadProjects(); loadProducts(); }, []);
  useEffect(() => { if (selectedProject) loadItems(selectedProject.project_id); }, [selectedProject]);

  const loadProjects = async () => {
    try {
      const res = await api.get('/projects/active');
      setProjects(res.data);
    } catch { toast.error('Failed to load projects'); }
  };

  const loadProducts = async () => {
    try {
      const res = await api.get('/products');
      const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setProducts(list.filter(p => ['active','Active','ACTIVE'].includes(p.status)));
    } catch { console.error('Failed to load products'); }
  };

  const loadItems = async (projectId) => {
    try {
      const res = await api.get(`/projects/${projectId}/items`);
      setItems(res.data);
    } catch { toast.error('Failed to load project items'); }
  };

  const loadDailyReport = async () => {
    if (!selectedProject) return;
    try {
      const res = await api.get('/projects/report/daily', {
        params: { project_id: selectedProject.project_id }
      });
      setDailyReport(res.data);
      setShowReport(true);
    } catch { toast.error('Failed to load daily report'); }
  };

  // Search products
  useEffect(() => {
    if (!searchQ.trim()) { setSearchResults([]); setShowSearch(false); return; }
    const q = searchQ.toLowerCase();
    const results = products.filter(p =>
      p.product_name.toLowerCase().includes(q) ||
      String(p.product_id).includes(q)
    ).slice(0, 8);
    setSearchResults(results);
    setShowSearch(results.length > 0);
  }, [searchQ, products]);

  const selectProduct = (p) => {
    setSelectedProduct(p);
    setSearchQ(p.product_name);
    setShowSearch(false);
    setQty(1);
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!selectedProject) { toast.error('Select a project first'); return; }
    if (!selectedProduct) { toast.error('Select a product'); return; }
    if (!qty || qty <= 0)  { toast.error('Enter a valid quantity'); return; }

    setLoading(true);
    try {
      await api.post('/projects/items', {
        project_id: selectedProject.project_id,
        product_id: selectedProduct.product_id,
        quantity: qty,
        note: note.trim() || null,
      });
      toast.success(`${qty}x ${selectedProduct.product_name} added to project`);
      setSelectedProduct(null);
      setSearchQ('');
      setQty(1);
      setNote('');
      loadItems(selectedProject.project_id);
      // Refresh products to show updated stock
      loadProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add item');
    } finally { setLoading(false); }
  };

  const fmtCurrency = (n) => `LKR ${Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
  const fmtTime = (d) => new Date(d).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' });
  const fmtDate = (d) => new Date(d).toLocaleDateString('en-LK');
  const totalValue = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0);
  const typeIcon = (t) => ({ Welding: '🔧', Timber: '🪵', Hardware: '🔩', Other: '📦' }[t] || '📦');

  return (
    <div className="pt-container">
      {/* ── Project Selector ── */}
      <div className="pt-selector-section">
        <label className="pt-section-label"><FolderOpen size={15} /> Select Active Project</label>
        <div className="pt-project-grid">
          {projects.length === 0 ? (
            <div className="pt-no-projects">No active projects. Ask admin to create one.</div>
          ) : projects.map(p => (
            <button
              key={p.project_id}
              className={`pt-project-card ${selectedProject?.project_id === p.project_id ? 'selected' : ''}`}
              onClick={() => setSelectedProject(p)}
            >
              <span className="pt-project-icon">{typeIcon(p.project_type)}</span>
              <span className="pt-project-name">{p.project_name}</span>
              <span className="pt-project-type">{p.project_type}</span>
              {p.project_owner && <span className="pt-project-owner">👤 {p.project_owner}</span>}
              {p.location && <span className="pt-project-owner">📍 {p.location}</span>}
            </button>
          ))}
        </div>
      </div>

      {selectedProject && (
        <>
          {/* ── Add Item Form ── */}
          <div className="pt-add-section">
            <div className="pt-add-header">
              <span className="pt-section-label"><Plus size={15} /> Add Item to: <strong>{selectedProject.project_name}</strong></span>
            </div>
            <form onSubmit={handleAddItem} className="pt-add-form">
              {/* Product search */}
              <div className="pt-search-wrap">
                <div className="pt-search-bar">
                  <Search size={15} className="pt-search-icon" />
                  <input
                    ref={searchRef}
                    placeholder="Search product by name or ID…"
                    value={searchQ}
                    onChange={e => { setSearchQ(e.target.value); setSelectedProduct(null); }}
                    autoComplete="off"
                  />
                  {searchQ && <button type="button" className="pt-search-clear" onClick={() => { setSearchQ(''); setSelectedProduct(null); setShowSearch(false); }}><X size={14} /></button>}
                </div>
                {showSearch && (
                  <div className="pt-search-dropdown">
                    {searchResults.map(p => (
                      <div key={p.product_id} className="pt-search-result" onClick={() => selectProduct(p)}>
                        <Package size={14} />
                        <div className="pt-result-info">
                          <span className="pt-result-name">{p.product_name}</span>
                          <span className="pt-result-meta">Stock: {p.stock_quantity} · {fmtCurrency(p.unit_price)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Qty + Note + Submit */}
              <div className="pt-add-row">
                <div className="pt-qty-wrap">
                  <label>Qty</label>
                  <input
                    type="number" min="0.01" step="0.01"
                    value={qty}
                    onChange={e => setQty(parseFloat(e.target.value) || 1)}
                    className="pt-qty-input"
                  />
                </div>
                <div className="pt-note-wrap">
                  <label>Note (optional)</label>
                  <input placeholder="e.g. for gate frame" value={note} onChange={e => setNote(e.target.value)} />
                </div>
                <button type="submit" className="pt-add-btn" disabled={loading || !selectedProduct}>
                  {loading ? 'Adding…' : <><Plus size={15} /> Add Item</>}
                </button>
              </div>

              {selectedProduct && (
                <div className="pt-selected-product">
                  <Package size={14} />
                  <span><strong>{selectedProduct.product_name}</strong> — Stock: {selectedProduct.stock_quantity}</span>
                  {selectedProduct.stock_quantity < qty && (
                    <span className="pt-stock-warn">⚠️ Insufficient stock</span>
                  )}
                </div>
              )}
            </form>
          </div>

          {/* ── Today's Items ── */}
          <div className="pt-items-section">
            <div className="pt-items-header">
              <span className="pt-section-label"><Clock size={15} /> Items Taken — {selectedProject.project_name}</span>
              <div className="pt-items-header-right">
                <button className="pt-report-btn" onClick={loadDailyReport}>
                  Daily Report
                </button>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="pt-empty">No items recorded for this project yet.</div>
            ) : (
              <div className="pt-items-table-wrap">
                <table className="pt-items-table">
                  <thead>
                    <tr><th>Product</th><th>Qty</th><th>Note</th><th>Taken By</th><th>Time</th></tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.item_id}>
                        <td>{item.product?.product_name || '—'}</td>
                        <td>{item.quantity}</td>
                        <td>{item.note || '—'}</td>
                        <td>{item.takenByUser ? `${item.takenByUser.first_name} ${item.takenByUser.last_name}` : '—'}</td>
                        <td>{fmtTime(item.taken_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Daily Report Modal ── */}
      {showReport && dailyReport && (
        <div className="pt-modal-overlay" onClick={() => setShowReport(false)}>
          <div className="pt-modal" onClick={e => e.stopPropagation()}>
            <div className="pt-modal-header">
              <h3>📋 Daily Report — {dailyReport.date}</h3>
              <button onClick={() => setShowReport(false)}><X size={18} /></button>
            </div>
            <div className="pt-modal-summary">
              <div className="pt-modal-stat"><span>Items Taken</span><strong>{dailyReport.totalItems}</strong></div>
              <div className="pt-modal-stat"><span>Total Value</span><strong>{fmtCurrency(dailyReport.totalValue)}</strong></div>
            </div>
            {dailyReport.items.length === 0 ? (
              <p className="pt-empty">No items taken today for this project.</p>
            ) : (
              <table className="pt-items-table">
                <thead><tr><th>Product</th><th>Qty</th><th>Note</th><th>Time</th></tr></thead>
                <tbody>
                  {dailyReport.items.map(item => (
                    <tr key={item.item_id}>
                      <td>{item.product?.product_name || '—'}</td>
                      <td>{item.quantity}</td>
                      <td>{item.note || '—'}</td>
                      <td>{new Date(item.taken_at).toLocaleTimeString('en-LK')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
