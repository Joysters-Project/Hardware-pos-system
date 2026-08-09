import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, ChevronUp, Package, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ProductSearchSelect({ products, value, onSelect, placeholder = 'Search product...' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selectedProduct = products.find(p => p.product_id === value);

  const filteredProducts = products.filter(product =>
    product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.batch_no && product.batch_no.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (product) => {
    onSelect(product.product_id, product);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onSelect(null, null);
    setSearchTerm('');
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm cursor-pointer",
          "hover:border-blue-300 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all",
          isOpen ? "border-blue-500 ring-2 ring-blue-500/20" : "border-slate-200"
        )}
      >
        {selectedProduct ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Package className="h-4 w-4 text-blue-500 flex-shrink-0" />
            <span className="truncate font-medium">{selectedProduct.product_name}</span>
            <span className="text-slate-400 text-xs ml-auto flex-shrink-0">
              LKR{Number(selectedProduct.cost_price).toFixed(2)}
            </span>
          </div>
        ) : (
          <span className="text-slate-400 flex items-center gap-2">
            <Search className="h-4 w-4" />
            {placeholder}
          </span>
        )}
        <div className="flex items-center gap-1 ml-2">
          {selectedProduct && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-slate-100 rounded"
            >
              <X className="h-3 w-3 text-slate-400" />
            </button>
          )}
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-[10000] w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-2xl overflow-hidden" style={{ boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input id="searchTerm" name="searchTerm"
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Type to search..."
                className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filteredProducts.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-sm">
                No products found
              </div>
            ) : (
              filteredProducts.map((product) => (
                <div
                  key={product.product_id}
                  onClick={() => handleSelect(product)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors",
                    "hover:bg-blue-50",
                    value === product.product_id && "bg-blue-50"
                  )}
                >
                  <Package className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{product.product_name}</p>
                    <p className="text-xs text-slate-500">
                      Stock: {product.stock_quantity} | Cost: LKR{Number(product.cost_price).toFixed(2)}
                    </p>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    {product.batch_no || '-'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductSearchSelect;
