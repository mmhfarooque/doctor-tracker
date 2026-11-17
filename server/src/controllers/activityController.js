import Activity from '../models/Activity.js';
import User from '../models/User.js';
import { isDoctor } from '../utils/scope.js';

const scopeFor = (req) => (isDoctor(req) ? { doctors: req.user.doctor } : {});

// Critical events: a status change to Critical, or a patient admitted as Critical
const CRITICAL = { $or: [{ type: 'patient.status', to: 'Critical' }, { type: 'patient.admitted', to: 'Critical' }] };

// @route GET /api/activity?limit=
export const getActivity = async (req, res, next) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const items = await Activity.find(scopeFor(req)).sort({ createdAt: -1 }).limit(limit).lean();
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/alerts — latest critical-patient alerts and how many are unread for this user
export const getAlerts = async (req, res, next) => {
  try {
    const filter = { ...scopeFor(req), ...CRITICAL };
    const seen = req.user.alertsSeenAt || new Date(0);
    const [items, unread] = await Promise.all([
      Activity.find(filter).sort({ createdAt: -1 }).limit(15).lean(),
      Activity.countDocuments({ ...filter, createdAt: { $gt: seen } }),
    ]);
    res.json({ success: true, data: { unread, seenAt: seen, items } });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/alerts/seen
export const markAlertsSeen = async (req, res, next) => {
  try {
    await User.updateOne({ _id: req.user._id }, { alertsSeenAt: new Date() });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};
