/**
 * Formats current numeric PO numbers and the application's legacy PO formats
 * for display. New POs are generated as numeric strings by the API; this
 * compatibility layer keeps historic records numeric until the data migration
 * has been applied.
 */
export function formatPurchaseOrderNumber(poNumber, poId) {
  const value = String(poNumber ?? '').trim();

  if (/^\d+$/.test(value)) return value;

  const legacyMatch = value.match(/^PO(?:[-_]\d{4})?[-_]?(\d+)$/i);
  if (legacyMatch) return legacyMatch[1];

  return poId === null || poId === undefined ? '' : String(poId);
}
