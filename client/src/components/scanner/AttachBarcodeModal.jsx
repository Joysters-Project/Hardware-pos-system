import React, { useState, useEffect } from 'react';
import { Search, Link as LinkIcon, X, AlertCircle, CheckCircle, Package } from 'lucide-react';
import api, { productService } from '../../services/api';
import toast from 'react-hot-toast';

export default function AttachBarcodeModal({ isOpen, barcode, onClose, onAttached }) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSearchResults([]);
      setSelectedProduct(null);
      setSelectedUnitId(null);
    }
  }, [isOpen]);

  const handleSearch = async (val) => {
    setQuery(val);
    if (!val || val.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      const res = await api.get(`/products/search?q=${encodeURIComponent(val.trim())}`);
      setSearchResults(res.data || []);
    } catch (err) {
      console.error('Search products error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setSelectedUnitId(product.unit_id); // Default to base unit
  };

  const handleAttach = async () => {
    if (!selectedProduct || !barcode) return;

    try {
      setSaving(true);
      const res = await productService.attachBarcode(selectedProduct.product_id, {
        barcode: barcode.trim(),
        unit_id: selectedUnitId,
      });

      toast.success(res.data?.message || 'Barcode attached successfully!');
      if (onAttached) {
        onAttached(res.data?.data || selectedProduct, selectedUnitId);
      }
      onClose();
    } catch (err) {
      console.error('Attach barcode error:', err);
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to attach barcode';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-amber-50/70">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-lg">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <span>Product Not Found</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4 overflow-y-auto">
          {/* Scanned barcode highlight */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Scanned Barcode:</span>
            <code className="text-sm font-mono font-bold bg-white px-2.5 py-1 border border-gray-300 rounded text-red-700">
              {barcode}
            </code>
          </div>

          <p className="text-xs text-gray-600">
            This barcode is not yet registered. You can attach it to an existing product right now:
          </p>

          {/* Product Search Box */}
          <div className="relative">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search product by name or code..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-600"
                autoFocus
              />
            </div>

            {loading && <p className="text-xs text-gray-400 mt-1">Searching...</p>}

            {/* Results Dropdown */}
            {searchResults.length > 0 && !selectedProduct && (
              <div className="mt-2 border border-gray-200 rounded-xl bg-white shadow-lg max-h-48 overflow-y-auto divide-y divide-gray-100">
                {searchResults.map((p) => (
                  <button
                    key={p.product_id}
                    onClick={() => handleSelectProduct(p)}
                    className="w-full text-left px-3 py-2.5 hover:bg-red-50/60 flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div className="text-sm font-medium text-gray-800">{p.product_name}</div>
                      <div className="text-xs text-gray-500">
                        Price: Rs. {parseFloat(p.unit_price || 0).toFixed(2)} | Stock: {p.stock_quantity}{' '}
                        {p.unit?.unit_name}
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-red-600 px-2 py-1 bg-red-50 rounded">Select</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected Product Configuration */}
          {selectedProduct && (
            <div className="p-3.5 bg-red-50/50 border border-red-200 rounded-xl flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-red-800 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-red-600" />
                  Selected Product:
                </span>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="text-xs text-red-600 hover:underline font-medium"
                >
                  Change
                </button>
              </div>

              <div className="text-sm font-semibold text-gray-900">{selectedProduct.product_name}</div>

              {/* Unit Selection */}
              <div className="mt-1">
                <label className="text-xs font-medium text-gray-700 block mb-1">Attach to Unit:</label>
                <select
                  value={selectedUnitId || ''}
                  onChange={(e) => setSelectedUnitId(parseInt(e.target.value))}
                  className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-1 focus:ring-red-600"
                >
                  <option value={selectedProduct.unit_id}>
                    Base Unit: {selectedProduct.unit?.unit_name || 'Standard'} (Price: Rs.{' '}
                    {parseFloat(selectedProduct.unit_price).toFixed(2)})
                  </option>
                  {selectedProduct.alternative_units &&
                    selectedProduct.alternative_units.map((u) => (
                      <option key={u.product_unit_id || u.unit_id} value={u.unit_id}>
                        Alternate: {u.unit_details?.unit_name || `Unit #${u.unit_id}`} (x{u.conversion_factor})
                      </option>
                    ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={!selectedProduct || saving}
            onClick={handleAttach}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-700 rounded-lg hover:bg-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <LinkIcon className="w-4 h-4" />
            <span>{saving ? 'Attaching...' : 'Attach & Add to Bill'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

