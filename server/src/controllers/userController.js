import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import { isValidEmail, sanitizeString } from '../utils/sanitize.js';
import { isValidObjectId, asString } from '../utils/validators.js';

const ROLES = ['admin', 'doctor', 'nurse'];
export const strongPassword = (p) => typeof p === 'string' && p.length >= 8 && p.length <= 128 && /[A-Za-z]/.test(p) && /[0-9]/.test(p);

const publicUser = (u) => ({ _id: u._id, name: u.name, email: u.email, role: u.role, doctor: u.doctor, createdAt: u.createdAt });

// @route GET /api/users   (admin)
export const getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password -__v').populate('doctor', 'name specialization').sort({ role: 1, name: 1 }).lean();
    res.json({ success: true, data: users.map(publicUser) });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/users  (admin) — also used by POST /api/auth/register
export const createUser = async (req, res, next) => {
  try {
    const name = asString(req.body.name);
    const email = asString(req.body.email).toLowerCase().trim().slice(0, 100);
    const { password } = req.body;
    const role = ROLES.includes(req.body.role) ? req.body.role : 'nurse';

    if (!name.trim() || !email || !password) return res.status(400).json({ success: false, message: 'Please provide name, email, and password' });
    if (!isValidEmail(email)) return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
    if (!strongPassword(password)) {
      return res.status(400).json({ success: false, message: 'Password must be 8–128 characters and include at least one letter and one number' });
    }

    let doctor = null;
    if (role === 'doctor') {
      const doctorId = asString(req.body.doctor);
      if (!isValidObjectId(doctorId)) return res.status(400).json({ success: false, message: 'Link the doctor account to a doctor record' });
      doctor = await Doctor.findById(doctorId).select('_id');
      if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });
      if (await User.exists({ doctor: doctor._id })) {
        return res.status(400).json({ success: false, message: 'That doctor already has a login' });
      }
    }
    if (await User.exists({ email })) return res.status(400).json({ success: false, message: 'A user with this email already exists' });

    const user = await User.create({ name: sanitizeString(name, 100), email, password, role, doctor: doctor?._id || null });
    res.status(201).json({ success: true, message: 'Account created', data: publicUser(user) });
  } catch (error) {
    next(error);
  }
};

// @route DELETE /api/users/:id   (admin; cannot delete yourself)
export const deleteUser = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid user ID' });
    if (String(req.user._id) === req.params.id) return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
    const result = await User.deleteOne({ _id: req.params.id });
    if (!result.deletedCount) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'Account removed' });
  } catch (error) {
    next(error);
  }
};
