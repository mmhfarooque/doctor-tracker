import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { isValidEmail, sanitizeString } from '../utils/sanitize.js';

// Precomputed valid bcrypt hash used to equalize execution time on non-existent accounts
const DUMMY_HASH = '$2a$10$wT2gVz3sR1mP7Qn9t4K8qu5e0Y1zX3mS8Vn3t4K9qu6e1Y2zX4mS9';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'doctor_tracker_jwt_secret_key_2026', {
    expiresIn: '30d',
    algorithm: 'HS256',
  });
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password',
      });
    }

    const cleanEmail = email.toLowerCase().trim().slice(0, 100);
    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email address format',
      });
    }

    const user = await User.findOne({ email: cleanEmail });

    let isMatch = false;
    if (user) {
      isMatch = await user.comparePassword(password);
    } else {
      // Execute dummy bcrypt comparison to neutralize time-based user enumeration side-channel attacks
      await bcrypt.compare(password, DUMMY_HASH);
    }

    if (user && isMatch) {
      res.json({
        success: true,
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          token: generateToken(user._id),
        },
      });
    } else {
      // Uniform generic error message
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Register a new user (admin)
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password || typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password',
      });
    }

    const cleanEmail = email.toLowerCase().trim().slice(0, 100);
    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    if (password.length < 6 || password.length > 128) {
      return res.status(400).json({
        success: false,
        message: 'Password must be between 6 and 128 characters long',
      });
    }

    const userExists = await User.findOne({ email: cleanEmail });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists',
      });
    }

    const user = await User.create({
      name: sanitizeString(name, 100),
      email: cleanEmail,
      password,
    });

    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password -__v');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};
