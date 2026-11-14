import React, { useState, useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { Printer, X, Tag, QrCode as QrIcon, Barcode as BarcodeIcon } from 'lucide-react';

export default function BarcodeLabelPrintModal({ isOpen, onClose, product }) {
  const [format, setFormat] = useState('BARCODE'); // 'BARCODE' or 'QR'
  const [copies, setCopies] = useState(1);
  const [showPrice, setShowPrice] = useState(true);
  const [showName, setShowName] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState('');

  const barcodeSvgRef = useRef(null);

  const barcode = product?.barcode || '';
  const productName = product?.product_name || 'Product';
  const unitPrice = parseFloat(product?.unit_price || 0).toFixed(2);
  const unitName = product?.unit?.unit_name || '';

  // Render Barcode SVG via JsBarcode
  useEffect(() => {
    if (!isOpen || !barcode || format !== 'BARCODE') return;

    if (barcodeSvgRef.current) {
      try {
        const isEAN13 = /^\d{13}$/.test(barcode.trim());
        JsBarcode(barcodeSvgRef.current, barcode.trim(), {
          format: isEAN13 ? 'EAN13' : 'CODE128',
          width: 1.8,
          height: 50,
          displayValue: true,
          fontSize: 13,
          font: 'monospace',
          margin: 4,
        });
      } catch (err) {
        console.warn('JsBarcode render error, falling back to CODE128:', err);
        try {
          JsBarcode(barcodeSvgRef.current, barcode.trim(), {
            format: 'CODE128',
            width: 1.6,
            height: 45,
            displayValue: true,
          });
        } catch (e) {
          console.error('Final barcode render error:', e);
        }
      }
    }
  }, [isOpen, barcode, format]);

  // Render QR Code via qrcode library
  useEffect(() => {
    if (!isOpen || !barcode || format !== 'QR') return;

    QRCode.toDataURL(barcode.trim(), {
      width: 140,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR render error:', err));
  }, [isOpen, barcode, format]);

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen || !product) return null;

  return (
    <div className="scan-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/80">
          <div className="flex items-center gap-2 text-gray-800 font-bold text-lg">
            <Tag className="w-5 h-5 text-red-700" />
            <span>Print Product Label</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration options */}
        <div className="p-5 flex flex-col gap-4 overflow-y-auto">
          {/* Format selection */}
          <div className="flex gap-2">
            <button
              onClick={() => setFormat('BARCODE')}
              className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                format === 'BARCODE'
                  ? 'border-red-600 bg-red-50 text-red-700 shadow-sm'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <BarcodeIcon className="w-4 h-4" />
              1D Barcode (EAN/Code128)
            </button>
            <button
              onClick={() => setFormat('QR')}
              className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                format === 'QR'
                  ? 'border-red-600 bg-red-50 text-red-700 shadow-sm'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <QrIcon className="w-4 h-4" />
              2D QR Code
            </button>
          </div>

          {/* Options */}
          <div className="grid grid-cols-3 gap-3 p-3 bg-gray-50 rounded-xl text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-gray-700 font-medium">
              <input
                type="checkbox"
                checked={showName}
                onChange={(e) => setShowName(e.target.checked)}
                className="rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              Show Name
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-gray-700 font-medium">
              <input
                type="checkbox"
                checked={showPrice}
                onChange={(e) => setShowPrice(e.target.checked)}
                className="rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              Show Price
            </label>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">Copies:</span>
              <input
                type="number"
                min="1"
                max="100"
                value={copies}
                onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-14 px-1.5 py-0.5 border border-gray-300 rounded text-center text-xs font-bold"
              />
            </div>
          </div>

          {/* Label Preview Container */}
          <div className="p-4 bg-gray-100 rounded-xl flex flex-col items-center justify-center">
            <span className="text-[10px] uppercase font-bold text-gray-400 mb-2">Live Label Preview</span>
            <div
              id="printable-barcode-label-preview"
              className="w-64 p-3 bg-white border border-gray-300 rounded-lg shadow-sm flex flex-col items-center text-center font-sans"
            >
              {showName && (
                <div className="font-bold text-xs text-gray-900 truncate max-w-full leading-tight mb-1">
                  {productName}
                </div>
              )}

              {format === 'BARCODE' ? (
                <div className="my-1 flex justify-center">
                  <svg ref={barcodeSvgRef} className="max-w-full"></svg>
                </div>
              ) : (
                <div className="my-1 flex flex-col items-center">
                  {qrDataUrl && <img src={qrDataUrl} alt="QR Code" className="w-24 h-24" />}
                  <span className="font-mono text-[10px] text-gray-700 mt-1">{barcode}</span>
                </div>
              )}

              {showPrice && (
                <div className="text-xs font-extrabold text-red-700 mt-1">
                  Rs. {unitPrice} {unitName && <span className="text-[10px] font-normal text-gray-500">/ {unitName}</span>}
                </div>
              )}
            </div>
          </div>
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
            onClick={handlePrint}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-700 rounded-lg hover:bg-red-800 transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Print {copies > 1 ? `(${copies} copies)` : 'Label'}</span>
          </button>
        </div>
      </div>

      {/* Hidden container specifically styled for print media */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-area-barcode, #print-area-barcode * {
            visibility: visible !important;
          }
          #print-area-barcode {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 12px !important;
            padding: 10px !important;
            background: #fff !important;
          }
          .print-label-item {
            border: 1px dashed #ccc !important;
            padding: 8px !important;
            width: 190px !important;
            text-align: center !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      <div id="print-area-barcode" style={{ display: 'none' }}>
        {Array.from({ length: copies }).map((_, idx) => (
          <div key={idx} className="print-label-item">
            {showName && (
              <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>
                {productName}
              </div>
            )}
            {format === 'BARCODE' ? (
              <div>
                <svg
                  ref={(el) => {
                    if (el && barcode) {
                      try {
                        const isEAN13 = /^\d{13}$/.test(barcode.trim());
                        JsBarcode(el, barcode.trim(), {
                          format: isEAN13 ? 'EAN13' : 'CODE128',
                          width: 1.5,
                          height: 40,
                          displayValue: true,
                          fontSize: 11,
                          margin: 2,
                        });
                      } catch (e) {}
                    }
                  }}
                ></svg>
              </div>
            ) : (
              qrDataUrl && <img src={qrDataUrl} alt="QR" style={{ width: '80px', height: '80px', margin: '0 auto' }} />
            )}
            {showPrice && (
              <div style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '4px' }}>
                Rs. {unitPrice} {unitName && `/ ${unitName}`}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

