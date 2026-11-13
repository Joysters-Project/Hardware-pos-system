import { useEffect, useRef } from 'react';

/**
 * Custom React hook to detect hardware barcode / QR code scanners (keyboard-wedge).
 *
 * Characteristics of hardware scanners:
 * - Emits characters in rapid succession (< 50ms between keystrokes).
 * - Concludes transmission with an Enter key.
 * - Minimum scan length is typically >= 4 characters.
 *
 * Safety:
 * - Does NOT hijack regular user inputs (quantity, discount, amount received, customer name, etc.).
 * - If the search box itself is focused, cleans up any text deposited by the scanner so it doesn't leave stray queries.
 * - Refocuses the designated search input after every scan.
 *
 * @param {Object} options
 * @param {(code: string) => void} options.onScan - Callback invoked when a scan is detected
 * @param {string} [options.searchInputId='pos-search'] - DOM ID of the POS search input
 * @param {number} [options.maxIntervalMs=50] - Maximum millisecond threshold between characters
 * @param {number} [options.minLength=4] - Minimum character length to qualify as a barcode
 * @param {boolean} [options.enabled=true] - Whether scanner listener is active
 */
export function useBarcodeScanner({
  onScan,
  searchInputId = 'pos-search',
  maxIntervalMs = 60,
  minLength = 4,
  enabled = true,
}) {
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!enabled) return;

    let buffer = [];
    let lastKeyTime = 0;

    const handleKeyDown = (e) => {
      // Ignore functional modifier keys
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        return;
      }

      const target = e.target;
      const isSearchInput = target && target.id === searchInputId;
      const isOtherInput = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) && !isSearchInput;

      // Do NOT hijack normal user inputs (quantity, discount, payment amount, customer fields, etc.)
      if (isOtherInput) {
        buffer = [];
        return;
      }

      const now = Date.now();

      // Check if this concludes a scan transmission
      if (e.key === 'Enter') {
        if (buffer.length >= minLength) {
          // Check intervals between consecutive keystrokes
          let isScanner = true;
          for (let i = 1; i < buffer.length; i++) {
            if (buffer[i].time - buffer[i - 1].time > maxIntervalMs + 30) {
              isScanner = false;
              break;
            }
          }

          if (isScanner) {
            e.preventDefault();
            e.stopPropagation();

            const code = buffer.map((item) => item.char).join('').trim();
            buffer = [];

            // If characters landed in search input, clear them out
            if (isSearchInput && target) {
              target.value = '';
              // Also trigger change/input event if React controlled input
              const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype,
                'value'
              )?.set;
              if (nativeInputValueSetter) {
                nativeInputValueSetter.call(target, '');
                target.dispatchEvent(new Event('input', { bubbles: true }));
              }
            }

            if (code && onScanRef.current) {
              onScanRef.current(code);
            }

            // Always return focus to the scan/search area
            if (searchInputId) {
              setTimeout(() => {
                const el = document.getElementById(searchInputId);
                if (el) el.focus();
              }, 50);
            }
            return;
          }
        }

        // If not a scanner, reset buffer and let normal Enter handle (e.g. human pressing Enter in search)
        buffer = [];
        return;
      }

      // Collect printable characters
      if (e.key.length === 1) {
        // If too much time elapsed since last character, reset buffer (human typing paused)
        if (buffer.length > 0 && now - lastKeyTime > maxIntervalMs + 50) {
          buffer = [];
        }

        buffer.push({ char: e.key, time: now });
        lastKeyTime = now;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [searchInputId, maxIntervalMs, minLength, enabled]);
}

