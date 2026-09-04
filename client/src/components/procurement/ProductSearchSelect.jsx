import { useState, useRef, useEffect } from 'react';
import { Search, Package, X } from 'lucide-react';
import '@/styles/BillingSystem.css';

export function ProductSearchSelect({
  products = [],
  value,
  onSelect,
  placeholder = 'Search products by name, barcode, SKU...',
  onEnter,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selectedProduct = products.find(p => p.product_id === value);

  // Sync display with selected product if passed externally
  useEffect(() => {
    if (selectedProduct) {
      setSearchQuery(selectedProduct.product_name);
    } else if (!value) {
      setSearchQuery('');
    }
  }, [value, selectedProduct]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (query) => {
    setSearchQuery(query);
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      setSearchResults([]);
      setShowResults(false);
      onSelect(null, null);
      return;
    }

    const filtered = products.filter(p =>
      (p.product_name && p.product_name.toLowerCase().includes(trimmed)) ||
      (p.barcode && p.barcode.toLowerCase().includes(trimmed)) ||
      (p.sku && p.sku.toLowerCase().includes(trimmed)) ||
      (p.product_code && p.product_code.toLowerCase().includes(trimmed)) ||
      (p.batch_no && p.batch_no.toLowerCase().includes(trimmed))
    );

    setSearchResults(filtered);
    setShowResults(filtered.length > 0);
  };

  const handleSelectProduct = (product) => {
    setSearchQuery(product.product_name);
    setShowResults(false);
    setSearchResults([]);
    onSelect(product.product_id, product);
  };

  const handleClear = () => {
    setSearchQuery('');
    setShowResults(false);
    setSearchResults([]);
    onSelect(null, null);
    if (inputRef.current) inputRef.current.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (showResults && searchResults.length > 0) {
        handleSelectProduct(searchResults[0]);
      } else if (selectedProduct && onEnter) {
        onEnter();
      }
    } else if (e.key === 'Escape') {
      setShowResults(false);
    }
  };

  return (
    <div ref={containerRef} className="pos-search-container-modern" style={{ margin: 0, width: '100%' }}>
      <div className="pos-search-bar-modern">
        <Search size={18} className="pos-search-icon-modern" />
        <input
          id="pos-search-input"
          name="pos-search-input"
          ref={inputRef}
          className="pos-search-input-modern"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => {
            if (searchQuery.trim() && searchResults.length > 0) {
              setShowResults(true);
            }
          }}
          onKeyDown={handleKeyDown}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={handleClear}
            className="pos-search-clear"
            title="Clear product search"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && (
        <div className="pos-search-dropdown-modern">
          <div className="search-results-header">
            <span>Products found ({searchResults.length})</span>
            <span className="hint-text">Click or Press Enter to select</span>
          </div>
          {searchResults.map((product) => {
            const allBarcodes = Array.from(new Set([
              product.barcode,
              product.product_code,
              product.sku,
              product.batch_no,
              ...(product.alternative_units || []).map(au => au.barcode)
            ].filter(Boolean))).join(' · ');

            return (
              <div
                key={product.product_id}
                className="pos-search-result-modern"
                onClick={() => handleSelectProduct(product)}
              >
                <div className="result-icon">
                  <Package size={18} />
                </div>
                <div className="result-info">
                  <div className="result-name">{product.product_name}</div>
                  <div className="result-meta">
                    {allBarcodes ? allBarcodes : `ID: ${product.product_id}`}
                  </div>
                </div>
                <div className="result-right">
                  <div className="result-price">
                    LKR {parseFloat(product.cost_price ?? product.unit_price ?? 0).toFixed(2)}
                  </div>
                  <div className={`result-stock ${Number(product.stock_quantity ?? 0) <= 10 ? 'low' : ''}`}>
                    Stock: {product.stock_quantity ?? 0}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {searchQuery.trim() && !showResults && searchResults.length === 0 && !selectedProduct && (
        <div className="pos-search-dropdown-modern no-results">
          <div className="no-results-icon">📦</div>
          <div>No products found for "{searchQuery.trim()}"</div>
          <div className="no-results-hint">Try searching by name, barcode or SKU</div>
        </div>
      )}
    </div>
  );
}

export default ProductSearchSelect;
