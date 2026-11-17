import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';
import Shift from '../models/Shift.js';
import { escapeRegex, sanitizeString, isValidEmail } from '../utils/sanitize.js';
import { isValidObjectId, isValidPhone, asString, parseBoundedInt, DOCTOR_STATUSES, PATIENT_STATUSES } from '../utils/validators.js';
import { canAccessDoctor } from '../utils/scope.js';
import { logActivities } from '../utils/activity.js';
import { createPatient, archivePatient } from './patientController.js';

// Active caseload = not discharged and not archived (what counts against a doctor's capacity)
const ACTIVE = { archivedAt: null, status: { $ne: 'Discharged' } };

const caseloads = async (doctorIds) => {
  const rows = await Patient.aggregate([
    { $match: { doctor: { $in: doctorIds }, ...ACTIVE } },
    { $group: { _id: '$doctor', count: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((r) => [String(r._id), r.count]));
};

const readDoctorFields = (body, { requireCore }) => {
  const name = asString(body.name);
  const specialization = asString(body.specialization);
  const hospital = asString(body.hospital);
  const phone = asString(body.phone);
  const email = asString(body.email).toLowerCase().trim();
  if (requireCore && (!name.trim() || !specialization.trim() || !hospital.trim() || !phone.trim() || !email)) {
    return { error: 'Name, specialization, hospital, phone, and email are required fields' };
  }
  const out = {};
  if (name.trim()) out.name = sanitizeString(name);
  if (specialization.trim()) out.specialization = sanitizeString(specialization);
  if (hospital.trim()) out.hospital = sanitizeString(hospital);
  if (phone.trim()) {
    if (!isValidPhone(phone)) return { error: 'Please provide a valid phone number' };
    out.phone = sanitizeString(phone);
  }
  if (email) {
    if (!isValidEmail(email)) return { error: 'Please provide a valid email address' };
    out.email = email;
  }
  if (body.status !== undefined && body.status !== '') {
    if (!DOCTOR_STATUSES.includes(body.status)) return { error: 'Unknown availability status' };
    out.status = body.status;
  }
  if (body.experienceYears !== undefined && body.experienceYears !== '') {
    const years = parseBoundedInt(body.experienceYears, 0, 70);
    if (years === null) return { error: 'Experience must be a number between 0 and 70' };
    out.experienceYears = years;
  }
  if (body.maxPatients !== undefined && body.maxPatients !== '') {
    const cap = parseBoundedInt(body.maxPatients, 1, 200);
    if (cap === null) return { error: 'Capacity must be a number between 1 and 200' };
    out.maxPatients = cap;
  }
  if (typeof body.bio === 'string') out.bio = sanitizeString(body.bio, 1000);
  return { fields: out };
};

// @route GET /api/doctors
export const getDoctors = async (req, res, next) => {
  try {
    const page = Math.min(10000, Math.max(1, parseInt(req.query.page, 10) || 1));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const { search, specialization, hospital, status, startDate, endDate, sortBy = 'createdAt', order = 'desc' } = req.query;
    const query = {};

    if (typeof search === 'string' && search.trim()) {
      const rx = new RegExp(escapeRegex(search), 'i');
      query.$or = [{ name: rx }, { email: rx }, { specialization: rx }, { hospital: rx }];
    }
    if (typeof specialization === 'string' && specialization && specialization !== 'all') query.specialization = sanitizeString(specialization);
    if (typeof hospital === 'string' && hospital && hospital !== 'all') query.hospital = sanitizeString(hospital);
    if (typeof status === 'string' && DOCTOR_STATUSES.includes(status)) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      const s = new Date(startDate);
      const e = new Date(endDate);
      if (startDate && !Number.isNaN(s.getTime())) query.createdAt.$gte = s;
      if (endDate && !Number.isNaN(e.getTime())) {
        e.setHours(23, 59, 59, 999);
        query.createdAt.$lte = e;
      }
      if (!Object.keys(query.createdAt).length) delete query.createdAt;
    }

    const allowedSort = ['createdAt', 'name', 'specialization', 'hospital', 'experienceYears'];
    const sort = { [allowedSort.includes(sortBy) ? sortBy : 'createdAt']: order === 'asc' ? 1 : -1, _id: 1 };

    const [total, doctors] = await Promise.all([
      Doctor.countDocuments(query),
      Doctor.find(query).sort(sort).skip((page - 1) * limit).limit(limit).select('-__v').lean(),
    ]);
    const counts = await caseloads(doctors.filter((d) => canAccessDoctor(req, d._id)).map((d) => d._id));

    res.json({
      success: true,
      data: doctors.map((d) => ({ ...d, ...(canAccessDoctor(req, d._id) ? { patientCount: counts[String(d._id)] || 0 } : {}) })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/doctors/filters
export const getDoctorFilters = async (req, res, next) => {
  try {
    const [specializations, hospitals] = await Promise.all([Doctor.distinct('specialization'), Doctor.distinct('hospital')]);
    res.json({ success: true, data: { specializations: specializations.sort(), hospitals: hospitals.sort() } });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/doctors/:id  — profile with caseload, status breakdown and shifts
export const getDoctorById = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid doctor ID format' });
    const doctor = await Doctor.findById(req.params.id).select('-__v').lean();
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });

    if (!canAccessDoctor(req, doctor._id)) return res.json({ success: true, data: doctor });

    const now = new Date();
    const [byStatus, onCall, nextShift] = await Promise.all([
      Patient.aggregate([{ $match: { doctor: doctor._id, archivedAt: null } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Shift.findOne({ doctor: doctor._id, start: { $lte: now }, end: { $gt: now } }).lean(),
      Shift.findOne({ doctor: doctor._id, start: { $gt: now } }).sort({ start: 1 }).lean(),
    ]);
    const statusCounts = Object.fromEntries(byStatus.map((s) => [s._id, s.count]));
    const patientCount = PATIENT_STATUSES.filter((s) => s !== 'Discharged').reduce((sum, s) => sum + (statusCounts[s] || 0), 0);

    res.json({ success: true, data: { ...doctor, patientCount, statusCounts, currentShift: onCall, nextShift } });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/doctors   (admin)
export const createDoctor = async (req, res, next) => {
  try {
    const { fields, error } = readDoctorFields(req.body, { requireCore: true });
    if (error) return res.status(400).json({ success: false, message: error });
    if (await Doctor.exists({ email: fields.email })) {
      return res.status(400).json({ success: false, message: 'A doctor with this email address already exists' });
    }
    const doctor = await Doctor.create({ status: 'Active', experienceYears: 5, ...fields });
    res.status(201).json({ success: true, message: 'Doctor created successfully', data: doctor });
  } catch (error) {
    next(error);
  }
};

// @route PUT /api/doctors/:id   (admin)
export const updateDoctor = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid doctor ID format' });
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });
    const { fields, error } = readDoctorFields(req.body, { requireCore: false });
    if (error) return res.status(400).json({ success: false, message: error });
    if (fields.email && fields.email !== doctor.email && (await Doctor.exists({ email: fields.email }))) {
      return res.status(400).json({ success: false, message: 'A doctor with this email address already exists' });
    }
    Object.assign(doctor, fields);
    await doctor.save();
    res.json({ success: true, message: 'Doctor updated successfully', data: doctor });
  } catch (error) {
    next(error);
  }
};

// @route DELETE /api/doctors/:id   (admin) — refused while any patient (incl. archived) still points to this doctor
export const deleteDoctor = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid doctor ID format' });
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });
    const assigned = await Patient.countDocuments({ doctor: doctor._id });
    if (assigned > 0) {
      return res.status(409).json({
        success: false,
        message: `This doctor still has ${assigned} patient record(s). Reassign them to another doctor first.`,
        assigned,
      });
    }
    await Promise.all([Doctor.deleteOne({ _id: doctor._id }), Shift.deleteMany({ doctor: doctor._id })]);
    res.json({ success: true, message: 'Doctor deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/doctors/:id/reassign   { doctor }   (admin) — moves every patient to another doctor
export const reassignDoctorPatients = async (req, res, next) => {
  try {
    const target = asString(req.body.doctor);
    if (!isValidObjectId(req.params.id) || !isValidObjectId(target)) {
      return res.status(400).json({ success: false, message: 'Choose the doctor who takes over these patients' });
    }
    if (target === req.params.id) return res.status(400).json({ success: false, message: 'Choose a different doctor' });
    const from = await Doctor.findById(req.params.id);
    const to = await Doctor.findById(target);
    if (!from || !to) return res.status(404).json({ success: false, message: 'Doctor not found' });

    const patients = await Patient.find({ doctor: from._id }).select('name doctor');
    await Patient.updateMany({ doctor: from._id }, { doctor: to._id });
    await logActivities(
      req,
      patients.map((p) => ({ type: 'patient.transferred', patient: p, doctors: [from._id, to._id], from: from.name, to: to.name, note: 'Caseload reassigned' }))
    );
    res.json({ success: true, message: `${patients.length} patient(s) moved to ${to.name}`, moved: patients.length });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/doctors/:id/patients   — a doctor login may only open its own roster
export const getDoctorPatients = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid doctor ID format' });
    if (!canAccessDoctor(req, req.params.id)) return res.status(403).json({ success: false, message: 'You can only view your own patients' });
    const doctor = await Doctor.findById(req.params.id).select('name specialization hospital');
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });

    const { search, condition, status } = req.query;
    const query = { doctor: doctor._id, archivedAt: null };
    if (typeof search === 'string' && search.trim()) {
      const rx = new RegExp(escapeRegex(search), 'i');
      query.$or = [{ name: rx }, { condition: rx }, { phone: rx }];
    }
    if (typeof condition === 'string' && condition && condition !== 'all') query.condition = new RegExp(escapeRegex(condition), 'i');
    if (typeof status === 'string' && PATIENT_STATUSES.includes(status)) query.status = status;

    const page = Math.min(10000, Math.max(1, parseInt(req.query.page, 10) || 1));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const [total, patients] = await Promise.all([
      Patient.countDocuments(query),
      Patient.find(query).sort({ createdAt: -1, _id: 1 }).skip((page - 1) * limit).limit(limit).select('-__v').lean(),
    ]);
    res.json({ success: true, doctor, data: patients, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/doctors/:id/patients   — admit under this doctor (admin, or the doctor themselves)
export const addPatientToDoctor = async (req, res, next) => {
  if (!isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid doctor ID format' });
  if (!canAccessDoctor(req, req.params.id)) return res.status(403).json({ success: false, message: 'You can only admit patients under yourself' });
  req.body = { ...req.body, doctor: req.params.id };
  return createPatient(req, res, next);
};

// @route DELETE /api/doctors/:id/patients/:patientId   (admin) — removes from the list by archiving (restorable)
export const deletePatientFromDoctor = async (req, res, next) => {
  const { id: doctorId, patientId } = req.params;
  if (!isValidObjectId(doctorId, patientId)) return res.status(400).json({ success: false, message: 'Invalid doctor or patient ID format' });
  const belongs = await Patient.exists({ _id: patientId, doctor: doctorId, archivedAt: null }).catch(() => null);
  if (!belongs) return res.status(404).json({ success: false, message: 'Patient not found under this doctor' });
  req.params = { id: patientId };
  return archivePatient(req, res, next);
};

