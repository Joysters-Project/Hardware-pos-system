import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X, RefreshCw, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';

export default function CameraScannerModal({ isOpen, onClose, onScan }) {
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [error, setError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [continuousMode, setContinuousMode] = useState(false);
  const [lastScannedResult, setLastScannedResult] = useState(null);

  const scannerRef = useRef(null);
  const scannerInstanceRef = useRef(null);
  const lastScannedCodeRef = useRef('');
  const lastScannedTimeRef = useRef(0);
  const isStoppingRef = useRef(false);

  const isSecureContext = typeof window !== 'undefined' && (
    window.isSecureContext ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.protocol === 'https:'
  );

  // Initialize camera list
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setIsInitializing(true);
    setLastScannedResult(null);
    lastScannedCodeRef.current = '';
    lastScannedTimeRef.current = 0;

    if (!isSecureContext) {
      setError('Camera scanning requires a secure connection (HTTPS) or localhost. Please open the system via HTTPS or localhost.');
      setIsInitializing(false);
      return;
    }

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (!devices || devices.length === 0) {
          setError('No camera detected on this device. Please connect a webcam or camera.');
          setIsInitializing(false);
          return;
        }

        setCameras(devices);

        // Prefer back / environment camera if available
        const backCam = devices.find((d) =>
          d.label.toLowerCase().includes('back') ||
          d.label.toLowerCase().includes('rear') ||
          d.label.toLowerCase().includes('environment')
        );
        setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        setIsInitializing(false);
      })
      .catch((err) => {
        console.error('Camera listing error:', err);
        setError('Camera permission was denied or camera is inaccessible. Please allow camera permissions in your browser.');
        setIsInitializing(false);
      });

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  // Start scanner when camera is selected
  useEffect(() => {
    if (!isOpen || !selectedCameraId || !scannerRef.current || error) return;

    let mounted = true;

    const startScanner = async () => {
      await stopScanner();
      if (!mounted) return;

      const elementId = 'pos-camera-scanner-viewport';
      const el = document.getElementById(elementId);
      if (!el) return;

      try {
        const formats = [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE,
        ];

        const html5QrCode = new Html5Qrcode(elementId, {
          formatsToSupport: formats,
          verbose: false,
        });
        scannerInstanceRef.current = html5QrCode;

        const config = {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const qrboxWidth = Math.floor(minEdge * 0.8);
            const qrboxHeight = Math.floor(qrboxWidth * 0.65);
            return { width: Math.max(qrboxWidth, 220), height: Math.max(qrboxHeight, 150) };
          },
          aspectRatio: 1.333333,
        };

        await html5QrCode.start(
          selectedCameraId,
          config,
          (decodedText) => {
            handleSuccessfulScan(decodedText);
          },
          () => {
            // Ignore frame parse misses
          }
        );
      } catch (err) {
        console.error('Failed to start Html5Qrcode:', err);
        if (mounted) {
          setError('Failed to start camera preview. Please ensure no other application is using the camera.');
        }
      }
    };

    startScanner();

    return () => {
      mounted = false;
      stopScanner();
    };
  }, [isOpen, selectedCameraId]);

  const stopScanner = async () => {
    if (isStoppingRef.current) return;
    const scanner = scannerInstanceRef.current;
    if (scanner) {
      isStoppingRef.current = true;
      try {
        if (scanner.isScanning) {
          await scanner.stop();
        }
        scanner.clear();
      } catch (e) {
        console.warn('Error stopping scanner:', e);
      } finally {
        scannerInstanceRef.current = null;
        isStoppingRef.current = false;
      }
    }
  };

  const handleSuccessfulScan = (code) => {
    if (!code) return;
    const trimmed = code.trim();
    const now = Date.now();

    // 1.5 second debounce for the same barcode
    if (trimmed === lastScannedCodeRef.current && now - lastScannedTimeRef.current < 1500) {
      return;
    }

    lastScannedCodeRef.current = trimmed;
    lastScannedTimeRef.current = now;
    setLastScannedResult(trimmed);

    if (onScan) {
      onScan(trimmed);
    }

    if (!continuousMode) {
      handleClose();
    }
  };

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="scan-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/80">
          <div className="flex items-center gap-2 text-gray-800 font-bold text-lg">
            <Camera className="w-5 h-5 text-red-700" />
            <span>Scan with Camera</span>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-lg transition-colors"
            title="Close camera scanner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport Area */}
        <div className="p-5 flex flex-col items-center">
          {error ? (
            <div className="w-full p-4 my-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold">Scanner Error</p>
                <p className="mt-0.5 text-red-600">{error}</p>
              </div>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center">
              <div
                ref={scannerRef}
                id="pos-camera-scanner-viewport"
                className="w-full bg-black rounded-xl overflow-hidden shadow-inner aspect-[4/3] flex items-center justify-center text-gray-400 text-sm"
              >
                {isInitializing && <span>Initializing camera...</span>}
              </div>

              {/* Aiming guideline note */}
              <p className="text-xs text-gray-500 mt-2 text-center">
                Position the barcode or QR code inside the viewfinder. Supports EAN, UPC, Code 128, and QR.
              </p>
            </div>
          )}

          {/* Last Scanned Feedback Banner */}
          {lastScannedResult && continuousMode && (
            <div className="w-full mt-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center justify-between text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Scanned: <code className="font-mono font-bold">{lastScannedResult}</code>
              </span>
              <span className="text-emerald-600">Added to bill</span>
            </div>
          )}

          {/* Controls */}
          <div className="w-full mt-4 flex flex-col gap-3 pt-3 border-t border-gray-100">
            {/* Camera Switcher */}
            {cameras.length > 1 && (
              <div className="flex items-center justify-between text-sm">
                <label className="text-gray-600 font-medium flex items-center gap-1.5">
                  <RefreshCw className="w-4 h-4 text-gray-500" />
                  Camera:
                </label>
                <select
                  value={selectedCameraId}
                  onChange={(e) => setSelectedCameraId(e.target.value)}
                  className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-red-600"
                >
                  {cameras.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label || `Camera ${c.id.slice(0, 5)}...`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Continuous Mode Toggle */}
            <div className="flex items-center justify-between">
              <label htmlFor="continuous-scan-toggle" className="text-sm text-gray-700 font-medium cursor-pointer">
                Continuous scanning mode
              </label>
              <input
                id="continuous-scan-toggle"
                type="checkbox"
                checked={continuousMode}
                onChange={(e) => setContinuousMode(e.target.checked)}
                className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Done / Close
          </button>
        </div>
      </div>
    </div>
  );
}

