/**
 * Sanitization and Security Utility Functions
 */

/**
 * Escapes regex special characters to prevent ReDoS and Regex Injection
 * @param {string} str
 * @returns {string}
 */
export const escapeRegex = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Strips HTML tags and script elements to prevent XSS attacks
 * @param {string} str
 * @returns {string}
 */
export const sanitizeString = (str) => {
  if (typeof str !== 'string') return '';
  return str
    .trim()
    .replace(/<[^>]*>?/gm, '') // Strip HTML tags
    .replace(/[<>]/g, ''); // Strip remaining angle brackets
};

/**
 * Validates email format strictly
 * @param {string} email
 * @returns {boolean}
 */
export const isValidEmail = (email) => {
  if (typeof email !== 'string') return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(email.trim());
};

/**
 * Deep sanitizes object keys and values to prevent NoSQL operator injection (e.g. $where, $gt)
 * @param {any} obj
 * @returns {any}
 */
export const sanitizeQuery = (obj) => {
  if (obj === null || typeof obj !== 'object') {
    return typeof obj === 'string' ? sanitizeString(obj) : obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeQuery);
  }

  const clean = {};
  for (const key of Object.keys(obj)) {
    // Strip keys starting with '$' to prevent MongoDB operator injection from query strings
    if (key.startsWith('$')) {
      continue;
    }
    clean[key] = sanitizeQuery(obj[key]);
  }
  return clean;
};
