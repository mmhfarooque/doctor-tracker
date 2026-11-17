import express from 'express';
import { getActivity, getAlerts, markAlertsSeen } from '../controllers/activityController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);
router.get('/activity', getActivity);
router.get('/alerts', getAlerts);
router.post('/alerts/seen', markAlertsSeen);
export default router;
