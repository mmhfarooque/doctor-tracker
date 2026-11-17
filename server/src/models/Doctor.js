import mongoose from 'mongoose';

const doctorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Doctor name is required'],
      trim: true,
    },
    specialization: {
      type: String,
      required: [true, 'Specialization is required'],
      trim: true,
    },
    hospital: {
      type: String,
      required: [true, 'Hospital is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ['Active', 'On Leave', 'Inactive'],
      default: 'Active',
      index: true,
    },
    experienceYears: {
      type: Number,
      default: 5,
      min: [0, 'Experience cannot be negative'],
      max: [70, 'Experience cannot exceed 70 years'],
    },
    bio: {
      type: String,
      default: '',
    },
    // Maximum number of active (not discharged, not archived) patients before the doctor is flagged as overloaded
    maxPatients: {
      type: Number,
      default: 10,
      min: [1, 'Capacity must be at least 1'],
      max: [200, 'Capacity cannot exceed 200'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes matching the list endpoint's filter + default sort (equality first, then sort key).
// Search uses escaped case-insensitive regex, so no text index is kept (it would never be used).
doctorSchema.index({ createdAt: -1 });
doctorSchema.index({ specialization: 1, createdAt: -1 });
doctorSchema.index({ hospital: 1, createdAt: -1 });

const Doctor = mongoose.model('Doctor', doctorSchema);
export default Doctor;
