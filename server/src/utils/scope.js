import Activity from '../models/Activity.js';

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

/** Check current assignment in MongoDB without materializing a whole caseload in Node. */
export const readActivity = async (req, { filter = {}, limit = 20, count = false } = {}) => {
  const pipeline = [{ $match: filter }];
  if (!count) pipeline.push({ $sort: { createdAt: -1, _id: -1 } });
  if (isDoctor(req)) {
    pipeline.push(
      { $lookup: {
        from: 'patients',
        localField: 'patient',
        foreignField: '_id',
        pipeline: [{ $match: { doctor: req.user.doctor } }, { $project: { _id: 1 } }],
        as: 'currentAssignment',
      } },
      { $match: { 'currentAssignment.0': { $exists: true } } },
      { $project: { currentAssignment: 0 } }
    );
  }
  if (count) {
    const rows = await Activity.aggregate([...pipeline, { $count: 'total' }]);
    return rows[0]?.total || 0;
  }
  return Activity.aggregate([...pipeline, { $limit: Math.min(50, Math.max(1, limit)) }]);
};
