import Shift, { SHIFT_TYPES } from '../models/Shift.js';
import Doctor from '../models/Doctor.js';
import { isValidObjectId, asString } from '../utils/validators.js';
import { sanitizeString } from '../utils/sanitize.js';

const DAY = 86400000;

// @route GET /api/shifts?from=YYYY-MM-DD&days=7
export const getShifts = async (req, res, next) => {
  try {
    const from = new Date(asString(req.query.from) || Date.now());
    if (Number.isNaN(from.getTime())) return res.status(400).json({ success: false, message: 'Invalid start date' });
    from.setHours(0, 0, 0, 0);
    const days = Math.min(31, Math.max(1, parseInt(req.query.days, 10) || 7));
    const to = new Date(from.getTime() + days * DAY);
    const shifts = await Shift.find({ start: { $lt: to }, end: { $gt: from } })
      .populate('doctor', 'name specialization')
      .sort({ start: 1 })
      .lean();
    res.json({ success: true, data: shifts.filter((s) => s.doctor), range: { from, to } });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/shifts   { doctor, date: 'YYYY-MM-DD', type, note }   (admin)
export const createShift = async (req, res, next) => {
  try {
    const doctorId = asString(req.body.doctor);
    const type = asString(req.body.type);
    const date = asString(req.body.date);
    if (!isValidObjectId(doctorId)) return res.status(400).json({ success: false, message: 'Choose a doctor' });
    if (!SHIFT_TYPES[type]) return res.status(400).json({ success: false, message: 'Choose a shift type' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ success: false, message: 'Choose a valid date' });
    const doctor = await Doctor.findById(doctorId).select('name');
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });

    const [y, m, d] = date.split('-').map(Number);
    const { startHour, hours } = SHIFT_TYPES[type];
    const start = new Date(y, m - 1, d, startHour, 0, 0, 0);
    if (Number.isNaN(start.getTime())) return res.status(400).json({ success: false, message: 'Choose a valid date' });
    const end = new Date(start.getTime() + hours * 3600000);

    const clash = await Shift.exists({ doctor: doctor._id, start: { $lt: end }, end: { $gt: start } });
    if (clash) return res.status(409).json({ success: false, message: `${doctor.name} already has a shift that overlaps this time` });

    const shift = await Shift.create({ doctor: doctor._id, type, start, end, note: sanitizeString(asString(req.body.note), 200) });
    await shift.populate('doctor', 'name specialization');
    res.status(201).json({ success: true, message: 'Shift added', data: shift });
  } catch (error) {
    next(error);
  }
};

// @route DELETE /api/shifts/:id   (admin)
export const deleteShift = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid shift ID' });
    const result = await Shift.deleteOne({ _id: req.params.id });
    if (!result.deletedCount) return res.status(404).json({ success: false, message: 'Shift not found' });
    res.json({ success: true, message: 'Shift removed' });
  } catch (error) {
    next(error);
  }
};
