/**
 * Keeps legacy purchase-order references numeric in documents and messages.
 * New purchase orders are stored as numeric strings; this handles records
 * created before that format was introduced.
 */
const formatPurchaseOrderNumber = (poNumber, poId) => {
  const value = String(poNumber ?? '').trim();

  if (/^\d+$/.test(value)) return value;

  const legacyMatch = value.match(/^PO(?:[-_]\d{4})?[-_]?(\d+)$/i);
  if (legacyMatch) return legacyMatch[1];

  return poId === null || poId === undefined ? '' : String(poId);
};

module.exports = { formatPurchaseOrderNumber };
