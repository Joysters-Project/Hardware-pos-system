import { useEffect, useRef, useState } from 'react';
import {
  Search,
  Plus,
  X,
  Package,
  FolderOpen,
  Trash2,
  User,
  CornerDownLeft,
  RefreshCw,
  Eye,
  Phone,
  Printer,
  ShoppingCart,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import '../styles/ProjectsTab.css';

const currency = (value) => `LKR ${Number(value || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
const formatDate = (value) => new Date(value).toLocaleDateString('en-LK');
const formatTime = (value) => new Date(value).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' });

const buildSummaryGroups = (items) => {
  const groups = new Map();

  (items || []).forEach((item) => {
    const productId = item.product?.product_id || item.product_id;
    if (!groups.has(productId)) {
      groups.set(productId, {
        product_id: productId,
        product_name: item.product?.product_name || 'Product',
        quantity: 0,
        last_sold: item.taken_at,
        items: [],
      });
    }

    const group = groups.get(productId);
    group.quantity += Number(item.quantity || 0);
    group.items.push(item);
    if (new Date(item.taken_at) > new Date(group.last_sold)) {
      group.last_sold = item.taken_at;
    }
  });

  return Array.from(groups.values()).sort((left, right) => new Date(right.last_sold) - new Date(left.last_sold));
};

const printReport = (title, rows, columns) => {
  const popup = window.open('', '_blank', 'width=1100,height=780');
  if (!popup) {
    toast.error('Allow pop-ups to print the report');
    return;
  }

  const headerCells = columns.map((column) => `<th>${column}</th>`).join('');
  const bodyRows = rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('');

  popup.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #222; }
          h1 { margin: 0 0 8px; font-size: 22px; }
          p { margin: 0 0 18px; color: #666; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #8b3a3a; color: #fff; text-align: left; padding: 10px 12px; font-size: 13px; }
          td { border-bottom: 1px solid #e9e9e9; padding: 10px 12px; font-size: 13px; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p>Generated on ${new Date().toLocaleString()}</p>
        <table>
          <thead><tr>${headerCells}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </body>
    </html>
  `);
  popup.document.close();
  popup.focus();
  popup.print();
};

export default function ProjectsTab() {
  const [projects, setProjects] = useState([]);
  const [projectSearchQ, setProjectSearchQ] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const [dailyReport, setDailyReport] = useState(null);
  const [loadingProjectData, setLoadingProjectData] = useState(false);

  const [products, setProducts] = useState([]);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [cart, setCart] = useState([]);
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [summaryProduct, setSummaryProduct] = useState(null);

  const searchInputRef = useRef(null);
  const receiverNameRef = useRef(null);
  const receiverPhoneRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      await Promise.all([loadProjects(), loadProducts()]);
    };
    init();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadProjectData(selectedProject.project_id);
    }
  }, [selectedProject]);

  useEffect(() => {
    if (!searchQ.trim()) {
      setSearchResults([]);
      setShowSearch(false);
      return;
    }

    const query = searchQ.toLowerCase();
    const results = products.filter((product) => {
      return (
        product.product_name?.toLowerCase().includes(query) ||
        String(product.product_id).includes(query) ||
        String(product.product_code || '').toLowerCase().includes(query) ||
        String(product.barcode || '').toLowerCase().includes(query)
      );
    }).slice(0, 8);

    setSearchResults(results);
    setShowSearch(results.length > 0);
  }, [searchQ, products]);

  const loadProjects = async () => {
    try {
      const res = await api.get('/projects/active');
      setProjects(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error('Failed to load active projects');
    }
  };

  const loadProducts = async () => {
    try {
      const res = await api.get('/products');
      const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setProducts(list.filter((product) => ['active', 'Active', 'ACTIVE'].includes(product.status)));
    } catch {
      toast.error('Failed to load products');
    }
  };

  const loadProjectData = async (projectId) => {
    setLoadingProjectData(true);
    try {
      const [itemsRes, reportRes] = await Promise.all([
        api.get(`/projects/${projectId}/items`),
        api.get('/projects/report/daily', { params: { project_id: projectId } }),
      ]);

      setDailyReport(reportRes.data || null);
    } catch {
      toast.error('Failed to load project details');
    } finally {
      setLoadingProjectData(false);
    }
  };

  const filteredProjects = projects.filter((project) => {
    if (!projectSearchQ.trim()) return true;
    const query = projectSearchQ.toLowerCase();
    return (
      project.project_name?.toLowerCase().includes(query) ||
      project.project_owner?.toLowerCase().includes(query) ||
      project.location?.toLowerCase().includes(query)
    );
  });

  const catalogProducts = products.filter((product) => {
    if (!searchQ.trim()) return true;
    const query = searchQ.toLowerCase();
    return (
      product.product_name?.toLowerCase().includes(query) ||
      String(product.product_id).includes(query) ||
      String(product.product_code || '').toLowerCase().includes(query) ||
      String(product.barcode || '').toLowerCase().includes(query)
    );
  });

  const cartItemCount = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const summaryGroups = buildSummaryGroups(dailyReport?.items || []);
  const summaryTotalQty = summaryGroups.reduce((sum, group) => sum + Number(group.quantity || 0), 0);

  const addToCart = (product) => {
    setCart((current) => {
      const existing = current.find((item) => item.product_id === product.product_id);
      if (existing) {
        return current.map((item) => (
          item.product_id === product.product_id
            ? { ...item, quantity: Number(item.quantity) + 1 }
            : item
        ));
      }

      return [
        ...current,
        {
          product_id: product.product_id,
          product_name: product.product_name,
          unit_price: Number(product.unit_price),
          stock_quantity: Number(product.stock_quantity || 0),
          quantity: 1,
        },
      ];
    });

    setSearchQ('');
    setShowSearch(false);
    setSearchResults([]);
    window.requestAnimationFrame(() => receiverNameRef.current?.focus());
  };

  const selectSearchResult = (product) => {
    addToCart(product);
  };

  const updateCartQuantity = (productId, quantity) => {
    setCart((current) => current.map((item) => {
      if (item.product_id !== productId) return item;
      return { ...item, quantity: Math.max(0.01, Number(quantity) || 0) };
    }));
  };

  const removeFromCart = (productId) => {
    setCart((current) => current.filter((item) => item.product_id !== productId));
  };

  const resetTransactionForm = () => {
    setCart([]);
    setReceiverName('');
    setReceiverPhone('');
    setSearchQ('');
    setShowSearch(false);
    setSearchResults([]);
  };

  const createTransaction = async (event) => {
    if (event) event.preventDefault();

    if (!selectedProject) {
      toast.error('Select a project first');
      return;
    }

    if (!cart.length) {
      toast.error('Add at least one product');
      return;
    }

    if (!receiverName.trim()) {
      toast.error('Receiver name is required');
      receiverNameRef.current?.focus();
      return;
    }

    if (!receiverPhone.trim()) {
      toast.error('Receiver phone number is required');
      receiverPhoneRef.current?.focus();
      return;
    }

    if (cart.some((item) => Number(item.quantity) <= 0)) {
      toast.error('Enter a valid quantity for every selected product');
      return;
    }

    setLoading(true);
    try {
      await api.post('/projects/items', {
        project_id: selectedProject.project_id,
        receiver_name: receiverName.trim(),
        receiver_phone: receiverPhone.trim(),
        items: cart.map((item) => ({
          product_id: item.product_id,
          quantity: Number(item.quantity),
        })),
      });

      toast.success('Transaction created successfully');
      resetTransactionForm();
      await Promise.all([
        loadProjectData(selectedProject.project_id),
        loadProducts(),
      ]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleFormKeyDown = (event) => {
    if (event.key !== 'Enter') return;

    const isSearchField = event.target === searchInputRef.current;
    if (isSearchField && showSearch && searchResults.length > 0) {
      event.preventDefault();
      selectSearchResult(searchResults[0]);
      return;
    }

    event.preventDefault();
    createTransaction();
  };

  const removeTodayProductSales = async (productId, productName) => {
    if (!selectedProject) return;
    if (!window.confirm(`Remove today's sales for ${productName}? Stock will be restored.`)) return;

    try {
      await api.delete(`/projects/report/daily/product/${productId}`, {
        params: { project_id: selectedProject.project_id },
      });
      toast.success('Today sales removed for product');
      await Promise.all([
        loadProjectData(selectedProject.project_id),
        loadProducts(),
      ]);
      if (summaryProduct?.product_id === productId) {
        setSummaryProduct(null);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove product sales');
    }
  };

  const removeSummaryItem = async (itemId) => {
    if (!selectedProject) return;
    if (!window.confirm('Remove this transaction line? Stock will be restored.')) return;

    try {
      await api.delete(`/projects/items/${itemId}`);
      toast.success('Transaction line removed');
      await Promise.all([
        loadProjectData(selectedProject.project_id),
        loadProducts(),
      ]);
      if (summaryProduct?.items?.some((item) => item.item_id === itemId)) {
        setSummaryProduct(null);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove transaction line');
    }
  };

  const printSummary = () => {
    printReport(
      `Today's Sales Summary - ${selectedProject?.project_name || 'Project'}`,
      summaryGroups.map((group) => [
        group.product_name,
        Number(group.quantity || 0).toFixed(2),
        formatTime(group.last_sold),
      ]),
      ['Product', 'Qty Sold', 'Last Sold'],
    );
  };

  const printSummaryDetails = () => {
    if (!summaryProduct) return;
    printReport(
      `${summaryProduct.product_name} - Today Transactions`,
      summaryProduct.items.map((item) => [
        item.product?.product_name || 'Product',
        Number(item.quantity || 0).toFixed(2),
        item.receiver_name || '—',
        item.receiver_phone || '—',
      ]),
      ['Product', 'Quantity', 'Receiver Name', 'Receiver Phone'],
    );
  };

  const selectedSummaryRows = summaryProduct?.items || [];

  return (
    <div className="pt-container">
      <div className="pt-card-box pt-search-project-box">
        <div className="pt-box-header">
          <span className="pt-box-title">
            <FolderOpen size={18} /> Billing Counter - Select Project
          </span>
        </div>

        <div className="pt-project-search-bar">
          <Search size={16} className="pt-search-icon" />
          <input
            placeholder="Type to search active project by name, owner, or location..."
            value={projectSearchQ}
            onChange={(event) => setProjectSearchQ(event.target.value)}
          />
          {projectSearchQ && (
            <button className="pt-search-clear" onClick={() => setProjectSearchQ('')} type="button">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="pt-project-grid">
          {filteredProjects.length === 0 ? (
            <div className="pt-no-projects">
              {projectSearchQ ? `No active projects match "${projectSearchQ}"` : 'No active projects available.'}
            </div>
          ) : (
            filteredProjects.map((project) => (
              <button
                key={project.project_id}
                type="button"
                className={`pt-project-card ${selectedProject?.project_id === project.project_id ? 'selected' : ''}`}
                onClick={() => setSelectedProject(project)}
              >
                <div className="pt-project-card-top">
                  <span className="pt-project-icon">📁</span>
                  <span className="pt-project-name">{project.project_name}</span>
                </div>
                {project.project_owner && <span className="pt-project-meta">👤 {project.project_owner}</span>}
                {project.location && <span className="pt-project-meta">📍 {project.location}</span>}
              </button>
            ))
          )}
        </div>
      </div>

      {selectedProject && (
        <div className="pt-modal-overlay" onClick={() => setSelectedProject(null)}>
          <div className="pt-project-details-modal pt-project-transaction-modal" onClick={(event) => event.stopPropagation()}>
            <div className="pt-modal-top-bar">
              <div className="pt-modal-top-title">
                <span className="pt-display-badge">Active Project</span>
                <h2>📁 {selectedProject.project_name}</h2>
              </div>
              <button className="pt-modal-close-btn" onClick={() => setSelectedProject(null)} type="button" title="Close project details">
                <X size={20} />
              </button>
            </div>

            <div className="pt-project-transaction-shell" onKeyDown={handleFormKeyDown}>
              <div className="pt-billing-layout">
                <div className="pt-billing-left">
                  <div className="pt-card-box pt-project-catalog-card">
                    <div className="pt-box-header">
                      <span className="pt-box-title">
                        <Package size={18} /> Product Catalog
                        <span className="pt-badge">{catalogProducts.length}</span>
                      </span>
                      <div className="catalog-view-toggle pt-catalog-toolbar-note">
                      
                      </div>
                    </div>

                    <div className="pt-search-wrap">
                      <div className="pt-search-bar">
                        <Search size={15} className="pt-search-icon" />
                        <input
                          ref={searchInputRef}
                          placeholder="Search product by name, barcode, SKU, or ID..."
                          value={searchQ}
                          onChange={(event) => setSearchQ(event.target.value)}
                          onKeyDown={handleFormKeyDown}
                          autoComplete="off"
                        />
                        {searchQ && (
                          <button
                            type="button"
                            className="pt-search-clear"
                            onClick={() => {
                              setSearchQ('');
                              setShowSearch(false);
                              setSearchResults([]);
                            }}
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      {showSearch && (
                        <div className="pt-search-dropdown">
                          {searchResults.map((product) => (
                            <div key={product.product_id} className="pt-search-result" onClick={() => selectSearchResult(product)}>
                              <Package size={15} />
                              <div className="pt-result-info">
                                <span className="pt-result-name">{product.product_name}</span>
                                <span className="pt-result-meta">Stock: <strong>{product.stock_quantity}</strong> · {currency(product.unit_price)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {loadingProjectData ? (
                      <div className="pt-loading">Loading catalog...</div>
                    ) : catalogProducts.length === 0 ? (
                      <div className="pt-empty">No active products available.</div>
                    ) : (
                      <div className="pt-catalog-grid">
                        {catalogProducts.map((product) => (
                          <button
                            key={product.product_id}
                            type="button"
                            className={`pt-catalog-card ${product.stock_quantity <= 0 ? 'disabled' : ''}`}
                            onClick={() => product.stock_quantity > 0 && addToCart(product)}
                            disabled={product.stock_quantity <= 0}
                          >
                            <div className="pt-catalog-card-icon">
                              <Package size={20} />
                            </div>
                            <div className="pt-catalog-card-name">{product.product_name}</div>
                            <div className="pt-catalog-card-code">{product.product_code || `ID: ${product.product_id}`}</div>
                            <div className="pt-catalog-card-footer">
                              <div className="pt-catalog-card-price">Rs.{Number(product.unit_price).toFixed(2)}</div>
                              <div className="pt-catalog-card-stock">In Stock: {product.stock_quantity}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-card-box pt-selected-products-box">
                    <div className="pt-box-header">
                      <span className="pt-box-title">
                        <ShoppingCart size={18} /> Selected Products
                        <span className="pt-badge">{cartItemCount}</span>
                      </span>
                    </div>

                    {cart.length === 0 ? (
                      <div className="pt-empty">Search and select products to begin the transaction.</div>
                    ) : (
                      <div className="pt-cart-table-wrap">
                        <table className="pt-cart-table">
                          <thead>
                            <tr>
                              <th style={{ width: '38%' }}>Product</th>
                              <th style={{ width: '140px', textAlign: 'center' }}>Unit Price</th>
                              <th style={{ width: '110px', textAlign: 'center' }}>Qty</th>
                              <th style={{ width: '42px' }} />
                            </tr>
                          </thead>
                          <tbody>
                            {cart.map((item) => (
                              <tr key={item.product_id}>
                                <td className="pt-cart-product-cell">
                                  <div className="pt-cart-product-name">{item.product_name}</div>
                                  <div className="pt-cart-product-meta">Stock: {item.stock_quantity}</div>
                                </td>
                                <td style={{ textAlign: 'center' }}>{currency(item.unit_price)}</td>
                                <td style={{ textAlign: 'center' }}>
                                  <input
                                    type="number"
                                    className="pt-cart-qty-input"
                                    value={item.quantity}
                                    min="0.01"
                                    step="0.01"
                                    onChange={(event) => updateCartQuantity(item.product_id, event.target.value)}
                                    onKeyDown={handleFormKeyDown}
                                  />
                                </td>
                                <td>
                                  <button type="button" className="pt-cart-remove-btn" onClick={() => removeFromCart(item.product_id)}>
                                    <X size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-billing-right">
                  <form className="pt-card-box pt-transaction-form-card" onSubmit={createTransaction}>
                    <div className="pt-box-header">
                      <span className="pt-box-title">
                        <User size={18} /> Transaction Details
                      </span>
                    </div>

                    <div className="pt-transaction-field-grid">
                      <div className="pt-form-field">
                        <label>Receiver Name *</label>
                        <div className="pt-input-with-icon">
                          <User size={15} className="pt-input-icon" />
                          <input
                            ref={receiverNameRef}
                            placeholder="e.g. John Silva"
                            value={receiverName}
                            onChange={(event) => setReceiverName(event.target.value)}
                            onKeyDown={handleFormKeyDown}
                          />
                        </div>
                      </div>

                      <div className="pt-form-field">
                        <label>Receiver Phone Number *</label>
                        <div className="pt-input-with-icon">
                          <Phone size={15} className="pt-input-icon" />
                          <input
                            ref={receiverPhoneRef}
                            placeholder="e.g. 077 123 4567"
                            value={receiverPhone}
                            onChange={(event) => setReceiverPhone(event.target.value)}
                            onKeyDown={handleFormKeyDown}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-add-footer pt-transaction-footer">
                      <div className="pt-product-prompt">
                        {cart.length > 0 ? `${cartItemCount} item(s) ready for this transaction.` : ''}
                      </div>

                      <button type="submit" className="pt-create-tx-btn" disabled={loading || !cart.length}>
                        {loading ? 'Creating...' : (<><Plus size={16} /> Create Transaction <CornerDownLeft size={14} /></>)}
                      </button>
                    </div>
                  </form>

                  <div className="pt-card-box pt-summary-card">
                    <div className="pt-summary-toolbar">
                      <div>
                        <div className="pt-summary-kicker">Today&apos;s Sales</div>
                        <h4>{selectedProject.project_name}</h4>
                        <p>{summaryTotalQty} items sold today</p>
                      </div>

                      <div className="pt-summary-actions">
                        <button type="button" className="pt-print-btn" onClick={printSummary} disabled={!summaryGroups.length}>
                          <Printer size={14} /> Print Summary
                        </button>
                        <button type="button" className="pt-btn-secondary" onClick={() => loadProjectData(selectedProject.project_id)} disabled={loadingProjectData}>
                          <RefreshCw size={13} className={loadingProjectData ? 'spin' : ''} /> Refresh
                        </button>
                      </div>
                    </div>

                    <div className="pt-summary-table-wrap">
                      <table className="pt-transactions-table pt-summary-recent-table">
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th style={{ textAlign: 'right' }}>Qty Sold</th>
                            <th>Last Sold</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {summaryGroups.length === 0 ? (
                            <tr>
                              <td colSpan="4" style={{ textAlign: 'center', color: '#777' }}>No sales recorded for today.</td>
                            </tr>
                          ) : (
                            summaryGroups.map((group) => (
                              <tr key={group.product_id}>
                                <td>
                                  <strong>{group.product_name}</strong>
                                </td>
                                <td style={{ textAlign: 'right' }}>{Number(group.quantity || 0).toFixed(2)}</td>
                                <td>{formatTime(group.last_sold)}</td>
                                <td>
                                  <div className="pt-action-btns">
                                    <button type="button" className="pt-view-btn" onClick={() => setSummaryProduct(group)} title="View" aria-label="View">
                                      <Eye size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {summaryProduct && (
        <div className="pt-modal-overlay" onClick={() => setSummaryProduct(null)}>
          <div className="pt-project-details-modal pt-summary-detail-modal" onClick={(event) => event.stopPropagation()}>
            <div className="pt-modal-top-bar">
              <div className="pt-modal-top-title">
                <span className="pt-display-badge">Today&apos;s Product Sales</span>
                <h2>{summaryProduct.product_name}</h2>
              </div>
              <div className="pt-summary-modal-actions">
                <button type="button" className="pt-print-btn" onClick={printSummaryDetails} disabled={!selectedSummaryRows.length}>
                  <Printer size={14} /> Print
                </button>
                <button className="pt-modal-close-btn" onClick={() => setSummaryProduct(null)} type="button" title="Close details">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="pt-summary-modal-head">
              <strong>{selectedSummaryRows.length} transaction line(s) today</strong>
              
            </div>

            <div className="pt-summary-table-wrap">
              <table className="pt-summary-detail-table">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Quantity</th>
                    <th>Receiver Name</th>
                    <th>Receiver Phone Number</th>
                    <th>Purchase Time</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSummaryRows.map((item) => (
                    <tr key={item.item_id}>
                      <td>{item.product?.product_name || 'Product'}</td>
                      <td>{Number(item.quantity || 0).toFixed(2)}</td>
                      <td>{item.receiver_name || '—'}</td>
                      <td>{item.receiver_phone || '—'}</td>
                      <td>{formatTime(item.taken_at)}</td>
                      <td>
                        <div className="pt-action-btns">
                          <button type="button" className="pt-delete-btn" onClick={() => removeSummaryItem(item.item_id)} title="Remove" aria-label="Remove">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}