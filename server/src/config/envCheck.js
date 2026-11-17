/**
 * Validates critical environment variables at startup.
 * Fails fast instead of falling back to insecure defaults.
 */
export const validateEnv = () => {
  if (!process.env.MONGODB_URI) {
    console.error('FATAL CONFIG ERROR: MONGODB_URI is required but not defined in environment variables.');
    process.exit(1);
  }

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error('FATAL SECURITY ERROR: JWT_SECRET must be set and be at least 32 characters long.');
    process.exit(1);
  }
};

export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '12h';
