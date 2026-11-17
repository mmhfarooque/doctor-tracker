import mongoose from 'mongoose';

/**
 * Append-only audit trail: who did what to which patient, and when.
 * Powers the patient timeline, the dashboard activity feed and critical-patient alerts.
 */
const activitySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: [
        'patient.admitted',
        'patient.updated',
        'patient.status',
        'patient.transferred',
        'patient.archived',
        'patient.restored',
        'patient.deleted',
        'patient.followup',
      ],
    },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', default: null },
    patientName: { type: String, default: '' }, // kept so the feed still reads correctly after a hard delete
    // Every doctor this event concerns (both sides of a transfer) — scopes the feed for doctor logins
    doctors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' }],
    actor: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name: String,
      role: String,
    },
    changes: [{ _id: false, field: String, from: String, to: String }],
    from: { type: String, default: '' },
    to: { type: String, default: '' },
    note: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

activitySchema.index({ patient: 1, createdAt: -1 });
activitySchema.index({ createdAt: -1 });
activitySchema.index({ doctors: 1, createdAt: -1 });
activitySchema.index({ type: 1, to: 1, createdAt: -1 });

const Activity = mongoose.model('Activity', activitySchema);
export default Activity;
