import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Patient name is required'],
      trim: true,
      index: true,
    },
    age: {
      type: Number,
      required: [true, 'Age is required'],
      min: [0, 'Age cannot be negative'],
      max: [130, 'Age cannot exceed 130'],
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      required: [true, 'Gender is required'],
    },
    condition: {
      type: String,
      required: [true, 'Patient condition / diagnosis is required'],
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['Stable', 'Critical', 'Under Observation', 'Recovering', 'Discharged'],
      default: 'Stable',
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: [true, 'Assigned doctor is required'],
      index: true,
    },
    admissionDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Performance compound indexes for searching, filtering, and date sorting
patientSchema.index({ doctor: 1, createdAt: -1 });
patientSchema.index({ condition: 1, status: 1 });
patientSchema.index({ admissionDate: -1 });
patientSchema.index({ name: 'text', condition: 'text' });

const Patient = mongoose.model('Patient', patientSchema);
export default Patient;
