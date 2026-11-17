/**
 * Validates critical environment variables at startup.
 * Prevents insecure production defaults or missing secrets.
 */
export const validateEnv = () => {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!process.env.MONGODB_URI) {
    console.error('FATAL CONFIG ERROR: MONGODB_URI is required but not defined in environment variables.');
    process.exit(1);
  }

  if (isProduction) {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      console.error(
        'FATAL SECURITY ERROR: In production mode, JWT_SECRET must be explicitly set and be at least 32 characters long.'
      );
      process.exit(1);
    }
  } else {
    if (!process.env.JWT_SECRET) {
      console.warn(
        '[SECURITY WARNING]: JWT_SECRET is not set in development. Using internal fallback secret. DO NOT deploy without setting JWT_SECRET.'
      );
    }
  }
};
