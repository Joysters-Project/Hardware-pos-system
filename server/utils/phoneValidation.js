/**
 * Sri Lankan Phone Number Validation Utility
 * Supports mobile (07X XXXXXXX) and landline (0XX XXXXXXX) — 10 digits total.
 *
 * Mobile prefixes : 070–078
 * Landline prefixes: 011 (Colombo), 031–038, 041, 045, 047, 051, 052, 054, 055, 057, 063, 065–067
 */

const MOBILE_PREFIXES   = ['070','071','072','073','074','075','076','077','078'];
const LANDLINE_PREFIXES = [
  '011','031','032','033','034','035','036','037','038',
  '041','045','047','051','052','054','055','057',
  '063','065','066','067',
];
const ALL_PREFIXES = new Set([...MOBILE_PREFIXES, ...LANDLINE_PREFIXES]);

const validateSriLankanPhone = (phoneNumber) => {
  if (!phoneNumber || typeof phoneNumber !== 'string')
    return { isValid: false, message: 'Phone number is required', formatted: '', type: null };

  const cleaned = phoneNumber.trim().replace(/\s/g, '');

  if (!/^\d+$/.test(cleaned))
    return { isValid: false, message: 'Only numbers allowed', formatted: '', type: null };

  if (cleaned.length !== 10)
    return { isValid: false, message: 'Must be exactly 10 digits', formatted: '', type: null };

  if (!cleaned.startsWith('0'))
    return { isValid: false, message: 'Must start with 0', formatted: '', type: null };

  const prefix = cleaned.slice(0, 3);

  if (!ALL_PREFIXES.has(prefix))
    return { isValid: false, message: 'Invalid prefix. Use a valid Sri Lankan mobile (07X) or landline area code', formatted: '', type: null };

  const type = MOBILE_PREFIXES.includes(prefix) ? 'mobile' : 'landline';
  return { isValid: true, message: `Valid ${type} number`, formatted: cleaned, type };
};

const normalizeSriLankanPhone = (phoneNumber) => {
  if (!phoneNumber) return '';
  return phoneNumber.replace(/[^0-9]/g, '');
};

const isValidSriLankanPhone = (phoneNumber) => validateSriLankanPhone(phoneNumber).isValid;

module.exports = { validateSriLankanPhone, normalizeSriLankanPhone, isValidSriLankanPhone };
