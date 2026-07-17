import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, ChevronUp, Package, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ProductSearchSelect({
  products,
  value,
  onSelect,
  placeholder = 'Search product...',
  emptyMessage = 'No products found for that search.',
  showOnlyZeroStock = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selectedProduct = products.find(p => p.product_id === value);
  const availableProducts = showOnlyZeroStock
    ? products.filter(product => Number(product.stock_quantity) <= 0)
    : products;

  const filteredProducts = availableProducts.filter(product =>
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
    <div ref={containerRef} className="relative w-full min-w-[240px]">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex min-h-[46px] w-full items-center justify-between rounded-xl border bg-white px-3 py-2.5 text-sm shadow-sm cursor-pointer transition-all",
          "hover:border-blue-300 hover:shadow-md focus-within:ring-2 focus-within:ring-blue-500/20",
          isOpen ? "border-blue-500 ring-2 ring-blue-500/20 shadow-md" : "border-slate-200"
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0",
            selectedProduct ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500"
          )}>
            <Package className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1">
            {selectedProduct ? (
              <>
                <div className="truncate font-semibold text-slate-800">{selectedProduct.product_name}</div>
                <div className="truncate text-[11px] text-slate-500">
                  {selectedProduct.batch_no ? `Batch: ${selectedProduct.batch_no}` : 'Tap to change'}
                </div>
              </>
            ) : (
              <>
                <div className="font-medium text-slate-700">{placeholder}</div>
                <div className="text-[11px] text-slate-400"></div>
              </>
            )}
          </div>
        </div>

        <div className="ml-2 flex items-center gap-1">
          {selectedProduct && (
            <button
              type="button"
              onClick={handleClear}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
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
        <div className="absolute z-[10000] mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl" style={{ boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
          <div className="border-b border-slate-100 px-3 py-2.5">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Choose product</span>
              <span className="text-[11px] text-slate-400">Type to filter</span>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products..."
                className="w-full rounded-lg border border-slate-200 pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filteredProducts.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500">
                {emptyMessage}
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
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 flex-shrink-0">
                    <Package className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{product.product_name}</p>
                    <p className="text-xs text-slate-500">
                      Stock: {product.stock_quantity} | Cost: LKR{Number(product.cost_price).toFixed(2)}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                    {product.batch_no || 'No batch'}
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
