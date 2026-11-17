import express from 'express';
import { login, getMe } from '../controllers/authController.js';
import { createUser } from '../controllers/userController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', login);
router.post('/register', protect, authorize('admin'), createUser); // only admins create accounts
router.get('/me', protect, getMe);

export default router;
