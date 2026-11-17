import Activity from '../models/Activity.js';

/**
 * Records an audit event inside the caller's transaction; failures abort the mutation.
 */
export const logActivity = async (req, { type, patient, doctors = [], from = '', to = '', note = '', changes = [] }) => {
  await Activity.create({
    type,
    changes,
    patient: patient?._id || null,
    patientName: patient?.name || '',
    doctors: doctors.filter(Boolean),
    actor: { id: req.user?._id, name: req.user?.name, role: req.user?.role },
    from: String(from || ''),
    to: String(to || ''),
    note: String(note || '').slice(0, 300),
  });
};

export const logActivities = async (req, events) => {
  await Activity.insertMany(
    events.map((e) => ({
      type: e.type,
      changes: e.changes || [],
      patient: e.patient?._id || null,
      patientName: e.patient?.name || '',
      doctors: (e.doctors || []).filter(Boolean),
      actor: { id: req.user?._id, name: req.user?.name, role: req.user?.role },
      from: String(e.from || ''),
      to: String(e.to || ''),
      note: String(e.note || '').slice(0, 300),
    }))
  );
};
