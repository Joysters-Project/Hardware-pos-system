/**
 * Sri Lankan Phone Number Validation Utility
 * Supports mobile numbers (07X) and landline numbers (0XX area codes)
 */

const VALID_MOBILE_PREFIXES = ['070','071','072','073','074','075','076','077','078'];
// Sri Lankan landline area codes (first 3 digits)
const VALID_LANDLINE_PREFIXES = [
  '011','021','023','024','025','026','027',
  '031','032','033','034','035','036','037','038',
  '041','045','047',
  '051','052','054','055','057',
  '063','065','066','067',
  '081','091'
];

export const validateSriLankanPhone = (phoneNumber) => {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return { isValid: false, message: 'Phone number is required', formatted: '' };
  }

  const cleaned = phoneNumber.trim().replace(/\s/g, '');

  if (!/^[0-9]+$/.test(cleaned)) {
    return { isValid: false, message: 'Only numbers allowed', formatted: '' };
  }

  if (cleaned.length !== 10) {
    return { isValid: false, message: 'Must be exactly 10 digits', formatted: '' };
  }

  if (!cleaned.startsWith('0')) {
    return { isValid: false, message: 'Must start with 0', formatted: '' };
  }

  const prefix = cleaned.slice(0, 3);

  if (VALID_MOBILE_PREFIXES.includes(prefix)) {
    return { isValid: true, message: 'Valid mobile number', formatted: cleaned, type: 'mobile' };
  }

  if (VALID_LANDLINE_PREFIXES.includes(prefix)) {
    return { isValid: true, message: 'Valid landline number', formatted: cleaned, type: 'landline' };
  }

  return { isValid: false, message: 'Invalid phone prefix. Use 07X for mobile or a valid area code for landline', formatted: '' };
};

export const formatSriLankanPhone = (phoneNumber) => {
  const validation = validateSriLankanPhone(phoneNumber);
  return validation.isValid ? validation.formatted : phoneNumber;
};

export const normalizeSriLankanPhone = (phoneNumber) => {
  if (!phoneNumber) return '';
  return phoneNumber.replace(/[^0-9]/g, '');
};

export const isValidSriLankanPhone = (phoneNumber) => {
  return validateSriLankanPhone(phoneNumber).isValid;
};

export const filterSriLankanPhoneInput = (input) => {
  if (!input) return '';
  let cleaned = input.replace(/[^0-9]/g, '').slice(0, 10);
  if (cleaned.length === 0) return '';
  if (cleaned[0] !== '0') return '';
  return cleaned;
};
