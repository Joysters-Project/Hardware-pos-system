/**
 * Utilities for GS1 EAN-13 barcode generation and validation.
 */

/**
 * Calculates the standard GS1 Modulo-10 check digit for a 12-digit string.
 * @param {string} twelveDigits - 12 numeric characters
 * @returns {number} The 13th check digit (0-9)
 */
export function calculateEAN13CheckDigit(twelveDigits) {
  if (!twelveDigits || twelveDigits.length !== 12 || !/^\d{12}$/.test(twelveDigits)) {
    throw new Error('EAN-13 check digit calculation requires exactly 12 numeric digits');
  }

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(twelveDigits[i], 10);
    // 0-indexed: index 0 (1st pos) weight 1, index 1 (2nd pos) weight 3, etc.
    const weight = i % 2 === 0 ? 1 : 3;
    sum += digit * weight;
  }

  const remainder = sum % 10;
  return remainder === 0 ? 0 : 10 - remainder;
}

/**
 * Validates whether a 13-digit code is a valid EAN-13 barcode.
 * @param {string} code 
 * @returns {boolean}
 */
export function validateEAN13(code) {
  if (!code || typeof code !== 'string') return false;
  const trimmed = code.trim();
  if (!/^\d{13}$/.test(trimmed)) return false;

  const payload = trimmed.slice(0, 12);
  const expectedCheckDigit = calculateEAN13CheckDigit(payload);
  return parseInt(trimmed[12], 10) === expectedCheckDigit;
}

/**
 * Generates a valid 13-digit EAN-13 barcode.
 * Defaults to prefix '479' (Sri Lanka country code) followed by 9 random digits and the computed check digit.
 * @param {string} prefix - Country/company prefix (e.g., '479')
 * @returns {string} 13-digit EAN-13 barcode string
 */
export function generateEAN13(prefix = '479') {
  const cleanPrefix = String(prefix).replace(/\D/g, '').slice(0, 6) || '479';
  const remainingCount = 12 - cleanPrefix.length;
  
  let randomPart = '';
  for (let i = 0; i < remainingCount; i++) {
    randomPart += Math.floor(Math.random() * 10).toString();
  }

  const twelveDigits = cleanPrefix + randomPart;
  const checkDigit = calculateEAN13CheckDigit(twelveDigits);
  return twelveDigits + checkDigit.toString();
}

