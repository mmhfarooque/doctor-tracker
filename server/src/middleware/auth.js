import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/** Verifies the Bearer JWT and loads the current user (role and linked doctor included). */
export const protect = async (req, res, next) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }
  try {
    const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET, { algorithms: ['HS256'] });
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User no longer exists' });
    }
    // A doctor login must be linked to a doctor record, otherwise it could see nothing meaningful
    if (req.user.role === 'doctor' && !req.user.doctor) {
      return res.status(403).json({ success: false, message: 'This doctor account is not linked to a doctor record' });
    }
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Not authorized, token failed verification' });
  }
};

/** Allows the request only for the listed roles. */
export const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to do this' });
    }
    next();
  };
