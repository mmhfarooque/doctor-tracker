/**
 * Sanitization and Security Utility Functions
 */

/**
 * Escapes regex special characters to prevent ReDoS and Regex Injection.
 * Automatically bounds the string to 100 characters to prevent query CPU exhaustion.
 * @param {string} str
 * @returns {string}
 */
export const escapeRegex = (str) => {
  if (typeof str !== 'string') return '';
  const bounded = str.trim().slice(0, 100);
  return bounded.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Strips HTML tags and script elements to prevent XSS attacks.
 * Bounds the string length to safe limits.
 * @param {string} str
 * @param {number} maxLength
 * @returns {string}
 */
export const sanitizeString = (str, maxLength = 300) => {
  if (typeof str !== 'string') return '';
  return str
    .trim()
    .slice(0, maxLength)
    .replace(/<[^>]*>?/gm, '') // Strip HTML tags
    .replace(/[<>]/g, ''); // Strip remaining angle brackets
};

/**
 * Validates email format strictly
 * @param {string} email
 * @returns {boolean}
 */
export const isValidEmail = (email) => {
  if (typeof email !== 'string' || email.length > 254) return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(email.trim());
};
