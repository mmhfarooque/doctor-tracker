/**
 * Middleware to sanitize user input against NoSQL Injection Attacks.
 * Recursively removes any keys starting with '$' or containing '.' in req.body, req.query, and req.params.
 */
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
    // If key starts with '$' or contains '.', delete it to prevent MongoDB operator injection
    if (key.startsWith('$') || key.includes('.')) {
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
