/**
 * Sri Lankan Phone Number Validation Utility
 * Supports mobile numbers only (not landline):
 * - Mobile: 07X XXXXXX (e.g., 0712345678)
 * - Only 10 digits, numbers only
 */

/**
 * Validates a Sri Lankan mobile phone number
 * @param {string} phoneNumber - The phone number to validate (10 digits, numbers only)
 * @returns {object} - { isValid: boolean, message: string, formatted: string }
 */
export const validateSriLankanPhone = (phoneNumber) => {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return {
      isValid: false,
      message: 'Phone number is required',
      formatted: ''
    };
  }

  // Remove all whitespace
  let cleaned = phoneNumber.trim().replace(/\s/g, '');

  // Check if it contains only numbers
  if (!/^[0-9]+$/.test(cleaned)) {
    return {
      isValid: false,
      message: 'Only numbers allowed',
      formatted: ''
    };
  }

  // Check if it's exactly 10 digits
  if (cleaned.length !== 10) {
    return {
      isValid: false,
      message: 'Must be exactly 10 digits',
      formatted: ''
    };
  }

  // Check if it starts with 0
  if (!cleaned.startsWith('0')) {
    return {
      isValid: false,
      message: 'Must start with 0',
      formatted: ''
    };
  }

  // Check if it's a valid mobile prefix (07X)
  const prefix = cleaned.slice(0, 3);
  const validMobilePrefixes = ['070', '071', '072', '073', '074', '075', '076', '077', '078'];

  if (!validMobilePrefixes.includes(prefix)) {
    return {
      isValid: false,
      message: 'Invalid mobile prefix. Use 070-078',
      formatted: ''
    };
  }

  // Format the number as XXXXXXXXXX (store as-is, can display with spaces if needed)
  const formatted = cleaned;

  return {
    isValid: true,
    message: 'Valid mobile number',
    formatted: formatted,
    type: 'mobile'
  };
};

/**
 * Formats a Sri Lankan mobile phone number to standard format
 * @param {string} phoneNumber - The phone number to format
 * @returns {string} - Formatted phone number or original if invalid
 */
export const formatSriLankanPhone = (phoneNumber) => {
  const validation = validateSriLankanPhone(phoneNumber);
  return validation.isValid ? validation.formatted : phoneNumber;
};

/**
 * Normalizes a phone number for storage/comparison
 * Removes all formatting, returns just digits
 * @param {string} phoneNumber - The phone number to normalize
 * @returns {string} - Normalized phone number (digits only)
 */
export const normalizeSriLankanPhone = (phoneNumber) => {
  if (!phoneNumber) return '';
  
  // Remove all non-numeric characters
  return phoneNumber.replace(/[^0-9]/g, '');
};

/**
 * Check if a phone number is valid
 * @param {string} phoneNumber - The phone number to check
 * @returns {boolean} - True if valid
 */
export const isValidSriLankanPhone = (phoneNumber) => {
  return validateSriLankanPhone(phoneNumber).isValid;
};
