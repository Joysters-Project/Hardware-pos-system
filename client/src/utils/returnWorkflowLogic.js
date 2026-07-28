/**
 * returnWorkflowLogic.js
 * Pure business logic for the Return Processing workflow.
 * No React imports — only data, rules, and helper functions.
 * Separated from UI for reusability and maintainability.
 */

// ─── Condition Definitions ─────────────────────────────────────────────────

export const CONDITIONS = [
  { value: 'BRAND_NEW',          label: 'Brand New / Sealed',          icon: '📦' },
  { value: 'OPENED_UNUSED',      label: 'Opened but Unused',           icon: '🔓' },
  { value: 'DEFECTIVE',          label: 'Defective / Malfunctioning',  icon: '⚠️' },
  { value: 'MINOR_DAMAGE',       label: 'Minor Physical Damage',       icon: '🔧' },
  { value: 'MAJOR_DAMAGE',       label: 'Major Physical Damage',       icon: '💥' },
  { value: 'MISSING_ACCESSORIES',label: 'Missing Accessories',         icon: '🔍' },
  { value: 'USED',               label: 'Used Product',                icon: '♻️' },
];

// ─── Action Definitions ────────────────────────────────────────────────────
// Internal action keys; mapActionToBackend() converts for API submission.

export const ACTIONS = {
  REFUND:           { label: 'Customer Refund',           backend: 'REFUND',          destination: 'STOCK'    },
  STOCK:            { label: 'Return to Stock',           backend: 'REFUND',          destination: 'STOCK'    },
  REPAIR:           { label: 'Supplier Repair',           backend: 'REPAIR',          destination: 'REPAIR'   },
  EXCHANGE:         { label: 'Supplier Exchange',         backend: 'EXCHANGE',        destination: 'REPAIR'   },
  SUPPLIER_CLAIM:   { label: 'Supplier Claim',            backend: 'SUPPLIER_RETURN', destination: 'REPAIR'   },
  SCRAP:            { label: 'Scrap / Write-off',         backend: 'SCRAP',           destination: 'WRITEOFF' },
  REJECT:           { label: 'Reject Return',             backend: 'SCRAP',           destination: 'WRITEOFF' },
  PARTIAL_REFUND:   { label: 'Partial Refund',            backend: 'REFUND',          destination: 'STOCK'    },
};

// ─── Condition → Valid Actions ─────────────────────────────────────────────

const CONDITION_ACTIONS = {
  BRAND_NEW:           ['REFUND', 'STOCK', 'EXCHANGE'],
  OPENED_UNUSED:       ['EXCHANGE', 'REFUND', 'STOCK'],
  DEFECTIVE:           ['REPAIR', 'EXCHANGE', 'REFUND'],
  MINOR_DAMAGE:        ['PARTIAL_REFUND', 'REPAIR', 'REFUND'],
  MAJOR_DAMAGE:        ['SUPPLIER_CLAIM', 'SCRAP', 'REJECT'],
  MISSING_ACCESSORIES: ['PARTIAL_REFUND', 'EXCHANGE', 'REFUND'],
  USED:                ['REPAIR', 'REFUND', 'REJECT'],
};

// ─── Condition → Recommended Action ───────────────────────────────────────

const CONDITION_RECOMMENDATION = {
  BRAND_NEW:           { recommended: 'REFUND',        alternative: 'STOCK'  },
  OPENED_UNUSED:       { recommended: 'EXCHANGE',      alternative: 'REFUND' },
  DEFECTIVE:           { recommended: 'REPAIR',        alternative: 'EXCHANGE' },
  MINOR_DAMAGE:        { recommended: 'PARTIAL_REFUND',alternative: 'REPAIR' },
  MAJOR_DAMAGE:        { recommended: 'SUPPLIER_CLAIM',alternative: 'SCRAP'  },
  MISSING_ACCESSORIES: { recommended: 'PARTIAL_REFUND',alternative: 'EXCHANGE' },
  USED:                { recommended: 'REPAIR',        alternative: 'REJECT' },
};

// ─── Validation Messages ───────────────────────────────────────────────────

const VALIDATION_HINTS = {
  BRAND_NEW: {
    REFUND:         null,
    STOCK:          '📦 Item will be returned to sellable stock.',
    EXCHANGE:       null,
  },
  OPENED_UNUSED: {
    REFUND:         '⚠️ Refund on opened items may require manager approval.',
    EXCHANGE:       null,
    STOCK:          '⚠️ Opened items returned to stock may reduce resale value.',
  },
  DEFECTIVE: {
    REPAIR:         '🔧 Defective items are best handled via supplier repair.',
    EXCHANGE:       null,
    REFUND:         '⚠️ Refunding a defective product — ensure supplier claim is recorded separately.',
  },
  MINOR_DAMAGE: {
    PARTIAL_REFUND: '💡 A partial refund reflects the reduced value of the item.',
    REPAIR:         '🔧 Minor damage may be repairable by the supplier.',
    REFUND:         '⚠️ Full refund for minor damage requires manager approval.',
  },
  MAJOR_DAMAGE: {
    SUPPLIER_CLAIM: '📋 File a supplier claim for heavily damaged items.',
    SCRAP:          '🗑️ This item will be written off from inventory.',
    REJECT:         '🚫 Return rejected — no stock or financial change will occur.',
  },
  MISSING_ACCESSORIES: {
    PARTIAL_REFUND: '💡 Partial refund reflects missing accessories.',
    EXCHANGE:       null,
    REFUND:         '⚠️ Full refund requires all accessories to be accounted for.',
  },
  USED: {
    REPAIR:         '🔧 Used items sent for supplier service.',
    REFUND:         '⚠️ Refund for used product requires manager approval.',
    REJECT:         '🚫 Return rejected — used product cannot be accepted.',
  },
};

// ─── Stock Movement Descriptions ──────────────────────────────────────────

const STOCK_MOVEMENT = {
  REFUND:         '📈 Increase Sellable Stock',
  STOCK:          '📈 Increase Sellable Stock',
  PARTIAL_REFUND: '📈 Increase Sellable Stock',
  REPAIR:         '🔨 Move to Supplier Repair Queue',
  EXCHANGE:       '🔄 Move to Supplier Exchange Queue',
  SUPPLIER_CLAIM: '📋 Move to Supplier Claim Queue',
  SCRAP:          '🗑️ Move to Scrap / Write-off Inventory',
  REJECT:         '🚫 No Stock Change (Return Rejected)',
};

// ─── Public API ────────────────────────────────────────────────────────────

/** Returns the valid action keys for a given condition. */
export function getValidActions(condition) {
  return CONDITION_ACTIONS[condition] || ['REFUND', 'STOCK', 'SCRAP'];
}

/** Returns { recommended, alternative } action keys for a condition. */
export function getRecommendation(condition) {
  return CONDITION_RECOMMENDATION[condition] || { recommended: 'REFUND', alternative: null };
}

/** Returns a validation hint string (or null) for a condition+action pair. */
export function getValidationHint(condition, action) {
  return VALIDATION_HINTS[condition]?.[action] ?? null;
}

/** Returns a human-readable stock movement description for an action. */
export function getStockMovement(action) {
  return STOCK_MOVEMENT[action] || '—';
}

/** Returns the label for a condition value. */
export function getConditionLabel(value) {
  return CONDITIONS.find(c => c.value === value)?.label || value;
}

/** Returns the label for an action key. */
export function getActionLabel(key) {
  return ACTIONS[key]?.label || key;
}

/** Maps a frontend action key to backend action + destination strings. */
export function mapActionToBackend(action) {
  return ACTIONS[action] || { backend: 'SCRAP', destination: 'WRITEOFF' };
}

/** Calculates the customer payment for a repair/exchange item. */
export function calcCustomerPayment(item) {
  if (!['REPAIR', 'EXCHANGE'].includes(item.action)) return 0;
  if (item.has_warranty_answer === 'YES' && item.warranty_status === 'VALID') return 0;
  const cost = parseFloat(item.repair_cost) || 0;
  const discount = parseFloat(item.discount_percentage) || 0;
  return Math.max(0, cost - cost * (discount / 100));
}

/** Returns true if this action requires the warranty workflow. */
export function requiresWarranty(action) {
  return ['REPAIR', 'EXCHANGE'].includes(action);
}

/** Returns true if this action requires manager approval notification. */
export function requiresManagerApproval(condition, action) {
  const approvalNeeded = {
    OPENED_UNUSED:   ['REFUND'],
    MINOR_DAMAGE:    ['REFUND'],
    USED:            ['REFUND'],
    MAJOR_DAMAGE:    ['SUPPLIER_CLAIM', 'SCRAP', 'REJECT'],
  };
  return approvalNeeded[condition]?.includes(action) ?? false;
}
