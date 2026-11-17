import express from 'express';
import { getShifts, createShift, deleteShift } from '../controllers/shiftController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);
router.get('/', getShifts);
router.post('/', authorize('admin'), createShift);
router.delete('/:id', authorize('admin'), deleteShift);
export default router;
