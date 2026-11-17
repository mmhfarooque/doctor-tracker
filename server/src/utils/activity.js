import Activity from '../models/Activity.js';

/**
 * Records an audit event. Never throws: a logging failure must not fail the user's action.
 */
export const logActivity = async (req, { type, patient, doctors = [], from = '', to = '', note = '' }) => {
  try {
    await Activity.create({
      type,
      patient: patient?._id || null,
      patientName: patient?.name || '',
      doctors: doctors.filter(Boolean),
      actor: { id: req.user?._id, name: req.user?.name, role: req.user?.role },
      from: String(from || ''),
      to: String(to || ''),
      note: String(note || '').slice(0, 300),
    });
  } catch (err) {
    console.error('[Activity] could not record event:', err.message);
  }
};

export const logActivities = async (req, events) => {
  try {
    await Activity.insertMany(
      events.map((e) => ({
        type: e.type,
        patient: e.patient?._id || null,
        patientName: e.patient?.name || '',
        doctors: (e.doctors || []).filter(Boolean),
        actor: { id: req.user?._id, name: req.user?.name, role: req.user?.role },
        from: String(e.from || ''),
        to: String(e.to || ''),
        note: String(e.note || '').slice(0, 300),
      }))
    );
  } catch (err) {
    console.error('[Activity] could not record events:', err.message);
  }
};
