/**
 * Middleware to sanitize user input against NoSQL Injection and Prototype Pollution Attacks.
 * Recursively removes any keys starting with '$' or containing '.', as well as
 * prototype pollution keys (__proto__, constructor, prototype) in req.body, req.query, and req.params.
 */
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function cleanObject(obj) {
  if (obj === null || typeof obj !== 'object') {
    return;
  }

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      if (typeof obj[i] === 'object' && obj[i] !== null) {
        cleanObject(obj[i]);
      }
    }
    return;
  }

  for (const key of Object.keys(obj)) {
    // Check for MongoDB operators, dotted property paths, or prototype pollution attempts
    if (
      key.startsWith('$') ||
      key.includes('.') ||
      FORBIDDEN_KEYS.has(key)
    ) {
      delete obj[key];
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      cleanObject(obj[key]);
    }
  }
}

export const mongoSanitizeMiddleware = (req, res, next) => {
  if (req.body) cleanObject(req.body);
  if (req.query) cleanObject(req.query);
  if (req.params) cleanObject(req.params);
  next();
};
