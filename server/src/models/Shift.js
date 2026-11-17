import mongoose from 'mongoose';

export const SHIFT_TYPES = {
  Day: { startHour: 8, hours: 8 },
  Evening: { startHour: 16, hours: 8 },
  Night: { startHour: 0, hours: 8 },
  'On-call': { startHour: 8, hours: 24 },
};

const shiftSchema = new mongoose.Schema(
  {
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    type: { type: String, enum: Object.keys(SHIFT_TYPES), required: true },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

shiftSchema.index({ start: 1, end: 1 });
shiftSchema.index({ doctor: 1, start: 1 });

const Shift = mongoose.model('Shift', shiftSchema);
export default Shift;
