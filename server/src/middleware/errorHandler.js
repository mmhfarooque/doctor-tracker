export const errorHandler = (err, req, res, _next) => {
  const isProduction = process.env.NODE_ENV === 'production';
  console.error('[Error] Request failed');

  // Errors raised by Express / body-parser carry their own 4xx status (413 too large, 415, 400 …)
  let statusCode = Number.isInteger(err.status) && err.status >= 400 && err.status < 600 ? err.status : 500;
  if (res.statusCode >= 400 && statusCode === 500) statusCode = res.statusCode;
  let message = err.expose || statusCode < 500 ? err.message : 'Internal Server Error';

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for ${err.path || 'a field'}`;
  }

  // Duplicate key (unique index). keyValue is not present on every driver error, so guard it.
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || err.keyPattern || {})[0];
    message = field ? `A record with this ${field} already exists` : 'This record already exists';
  }

  // Mongoose validation
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Invalid record fields';
  }

  if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Malformed JSON request body';
  }

  if (err.type === 'entity.too.large') {
    statusCode = 413;
    message = 'Request body is too large';
  }

  if (err.message === 'Blocked by CORS policy') {
    statusCode = 403;
    message = 'Origin not allowed';
  }

  if (isProduction && statusCode >= 500) {
    message = 'Internal Server Error';
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
};
