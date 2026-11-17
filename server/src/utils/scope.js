/**
 * Data scoping by role. Doctors only ever see their own patients; admins and nurses see everyone.
 * Archived patients are hidden unless explicitly requested.
 */
export const isDoctor = (req) => req.user?.role === 'doctor';
export const isAdmin = (req) => req.user?.role === 'admin';

export const patientScope = (req, { archived = false } = {}) => ({
  archivedAt: archived ? { $ne: null } : null,
  ...(isDoctor(req) ? { doctor: req.user.doctor } : {}),
});

/** True when the current user may act on a patient that belongs to `doctorId`. */
export const canAccessDoctor = (req, doctorId) => !isDoctor(req) || String(req.user.doctor) === String(doctorId);
