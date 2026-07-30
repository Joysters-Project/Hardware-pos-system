import { useState, useRef, useEffect } from 'react';
import { Search, Package, X, ChevronDown } from 'lucide-react';

export function ProductSearchSelect({
  products,
  value,
  onSelect,
  placeholder = 'Search product...',
  emptyMessage = 'No products found.',
}) {
  const [isOpen, setIsOpen]       = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const inputRef     = useRef(null);

  const selectedProduct = products.find(p => String(p.product_id) === String(value));

  const filtered = products.filter(p =>
    p.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.batch_no && p.batch_no.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  const handleSelect = (product) => {
    onSelect(product.product_id, product);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onSelect('', null);
    setSearchTerm('');
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', minWidth: 220 }}>

      {/* Trigger */}
      <div
        onClick={() => setIsOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 10px', borderRadius: 9, cursor: 'pointer',
          border: isOpen ? '1.5px solid #8b3a3a' : '1.5px solid #ddd',
          background: '#fff', minHeight: 42,
          boxShadow: isOpen ? '0 0 0 3px rgba(139,58,58,0.1)' : 'none',
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
      >
        <div style={{
          width: 30, height: 30, borderRadius: 7, flexShrink: 0,
          background: selectedProduct ? '#fdf0f0' : '#f5f5f5',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: selectedProduct ? '#8b3a3a' : '#999',
        }}>
          <Package size={15} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {selectedProduct ? (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#2c2c2c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selectedProduct.product_name}
              </div>
              <div style={{ fontSize: 11, color: '#888' }}>
                Stock: {selectedProduct.stock_quantity ?? 0} &nbsp;|&nbsp; Cost: LKR {Number(selectedProduct.cost_price || 0).toFixed(2)}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: '#aaa' }}>{placeholder}</div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {selectedProduct && (
            <button
              type="button"
              onClick={handleClear}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3, color: '#aaa', display: 'flex', alignItems: 'center' }}
            >
              <X size={13} />
            </button>
          )}
          <ChevronDown size={14} style={{ color: '#aaa', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: '#fff', border: '1.5px solid #e0e0e0', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 9999,
          overflow: 'hidden',
        }}>
          {/* Search input */}
          <div style={{ padding: '8px 10px', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#aaa' }} />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onClick={e => e.stopPropagation()}
                placeholder="Search by name or batch..."
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '7px 10px 7px 28px',
                  border: '1.5px solid #e0e0e0', borderRadius: 7,
                  fontSize: 12, outline: 'none', fontFamily: 'inherit',
                }}
              />
            </div>
            <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
              {filtered.length} product{filtered.length !== 1 ? 's' : ''} found
            </div>
          </div>

          {/* List */}
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', fontSize: 13, color: '#999' }}>
                {emptyMessage}
              </div>
            ) : (
              filtered.map(product => {
                const isSelected = String(value) === String(product.product_id);
                const isLowStock = Number(product.stock_quantity) <= Number(product.min_stock_quantity || 0);
                return (
                  <div
                    key={product.product_id}
                    onClick={() => handleSelect(product)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 12px', cursor: 'pointer',
                      background: isSelected ? '#fdf0f0' : '#fff',
                      borderBottom: '1px solid #f8f8f8',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#fdf6f6'; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = '#fff'; }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: 7, flexShrink: 0,
                      background: isSelected ? '#f5d5d5' : '#fdf0f0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#8b3a3a',
                    }}>
                      <Package size={14} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#2c2c2c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {product.product_name}
                      </div>
                      <div style={{ fontSize: 11, color: '#888' }}>
                        Cost: LKR {Number(product.cost_price || 0).toFixed(2)}
                        &nbsp;|&nbsp;
                        <span style={{ color: isLowStock ? '#c62828' : '#2e7d32', fontWeight: 600 }}>
                          Stock: {product.stock_quantity ?? 0}
                        </span>
                      </div>
                    </div>
                    {product.batch_no && (
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: '2px 7px',
                        borderRadius: 999, background: '#f0f0f0', color: '#666',
                        flexShrink: 0,
                      }}>
                        {product.batch_no}
                      </span>
                    )}
                    {isLowStock && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 7px',
                        borderRadius: 999, background: '#fdecea', color: '#c62828',
                        flexShrink: 0,
                      }}>
                        LOW
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductSearchSelect;
