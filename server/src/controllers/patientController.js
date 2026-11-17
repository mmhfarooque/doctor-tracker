import Patient from '../models/Patient.js';
import Doctor from '../models/Doctor.js';
import Activity from '../models/Activity.js';
import { escapeRegex, sanitizeString, isValidEmail } from '../utils/sanitize.js';
import { isValidObjectId, isValidPhone, asString, parseBoundedInt, PATIENT_STATUSES, GENDERS } from '../utils/validators.js';
import { patientScope, isAdmin, isDoctor } from '../utils/scope.js';
import { logActivity, logActivities } from '../utils/activity.js';
import { toCsv } from '../utils/csv.js';

const POPULATE_DOCTOR = 'name specialization hospital email phone';

// ---------- helpers ----------

const parseDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const startOfDay = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

/** Builds the Mongo filter for list + export from query params, always inside the caller's scope. */
const buildListFilter = (req) => {
  const { search, condition, status, doctor, startDate, endDate, followUp, archived } = req.query;
  const wantArchived = archived === 'true' && isAdmin(req);
  const query = patientScope(req, { archived: wantArchived });

  if (typeof search === 'string' && search.trim()) {
    const rx = new RegExp(escapeRegex(search), 'i');
    query.$or = [{ name: rx }, { condition: rx }, { phone: rx }, { email: rx }];
  }
  if (typeof condition === 'string' && condition.trim() && condition !== 'all') {
    query.condition = new RegExp(escapeRegex(condition), 'i');
  }
  if (typeof status === 'string' && PATIENT_STATUSES.includes(status)) {
    query.status = status;
  }
  // Doctors are already pinned to their own patients by patientScope
  if (!isDoctor(req) && typeof doctor === 'string' && isValidObjectId(doctor)) {
    query.doctor = doctor;
  }
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (start || end) {
    query.admissionDate = {};
    if (start) query.admissionDate.$gte = start;
    if (end) {
      end.setHours(23, 59, 59, 999);
      query.admissionDate.$lte = end;
    }
  }
  if (typeof followUp === 'string') {
    const today = startOfDay();
    const tomorrow = new Date(today.getTime() + 86400000);
    const weekEnd = new Date(today.getTime() + 7 * 86400000);
    const active = { $ne: 'Discharged' };
    const statusFilter = query.status ? query.status : active;
    if (followUp === 'overdue') Object.assign(query, { followUpDate: { $lt: today }, status: statusFilter });
    if (followUp === 'today') Object.assign(query, { followUpDate: { $gte: today, $lt: tomorrow }, status: statusFilter });
    if (followUp === 'week') Object.assign(query, { followUpDate: { $gte: today, $lt: weekEnd }, status: statusFilter });
    if (followUp === 'none') Object.assign(query, { followUpDate: null, status: statusFilter });
  }
  return query;
};

const SORTABLE = ['createdAt', 'name', 'age', 'condition', 'status', 'admissionDate', 'followUpDate'];
const buildSort = (req) => {
  const sortBy = SORTABLE.includes(req.query.sortBy) ? req.query.sortBy : 'createdAt';
  return { [sortBy]: req.query.order === 'asc' ? 1 : -1, _id: 1 };
};

/** Loads a patient the caller is allowed to see, or sends the error response and returns null. */
const loadPatient = async (req, res, { archived = false } = {}) => {
  if (!isValidObjectId(req.params.id)) {
    res.status(400).json({ success: false, message: 'Invalid patient ID format' });
    return null;
  }
  const patient = await Patient.findOne({ _id: req.params.id, ...patientScope(req, { archived }) });
  if (!patient) {
    res.status(404).json({ success: false, message: 'Patient not found' });
    return null;
  }
  return patient;
};

/** Validates and normalises the editable patient fields present in the body. */
const readPatientFields = (body, { requireCore }) => {
  const out = {};
  const name = asString(body.name);
  const condition = asString(body.condition);

  if (requireCore) {
    if (!name.trim() || body.age === undefined || body.age === '' || !body.gender || !condition.trim()) {
      return { error: 'Patient name, age, gender, and condition are required' };
    }
  }
  if (name.trim()) out.name = sanitizeString(name);
  if (condition.trim()) out.condition = sanitizeString(condition);
  if (body.age !== undefined && body.age !== '') {
    const age = parseBoundedInt(body.age, 0, 130);
    if (age === null) return { error: 'Please provide a valid age between 0 and 130' };
    out.age = age;
  }
  if (body.gender !== undefined && body.gender !== '') {
    if (!GENDERS.includes(body.gender)) return { error: 'Gender must be Male, Female or Other' };
    out.gender = body.gender;
  }
  if (body.status !== undefined && body.status !== '') {
    if (!PATIENT_STATUSES.includes(body.status)) return { error: 'Unknown clinical status' };
    out.status = body.status;
  }
  if (typeof body.phone === 'string') {
    if (body.phone && !isValidPhone(body.phone)) return { error: 'Please provide a valid phone number' };
    out.phone = sanitizeString(body.phone);
  }
  if (typeof body.email === 'string') {
    const email = body.email.toLowerCase().trim();
    if (email && !isValidEmail(email)) return { error: 'Please provide a valid patient email address' };
    out.email = email;
  }
  if (typeof body.notes === 'string') out.notes = sanitizeString(body.notes, 2000);
  if (body.admissionDate !== undefined && body.admissionDate !== '') {
    const d = parseDate(body.admissionDate);
    if (!d) return { error: 'Invalid admission date' };
    out.admissionDate = d;
  }
  if (body.followUpDate !== undefined) {
    if (body.followUpDate === '' || body.followUpDate === null) out.followUpDate = null;
    else {
      const d = parseDate(body.followUpDate);
      if (!d) return { error: 'Invalid follow-up date' };
      out.followUpDate = d;
    }
  }
  return { fields: out };
};

// Fields a nurse may change; everything else needs an admin or the patient's own doctor
const NURSE_FIELDS = ['status', 'notes', 'followUpDate'];

const sameValue = (a, b) => {
  if (a instanceof Date || b instanceof Date) return (a ? new Date(a).getTime() : null) === (b ? new Date(b).getTime() : null);
  return String(a ?? '') === String(b ?? '');
};

/** Keeps dischargeDate consistent with status changes. */
const applyDischarge = (patient, nextStatus) => {
  if (!nextStatus) return;
  if (nextStatus === 'Discharged' && patient.status !== 'Discharged') patient.dischargeDate = new Date();
  if (nextStatus !== 'Discharged') patient.dischargeDate = null;
};

// ---------- list / read ----------

// @route GET /api/patients
export const getPatients = async (req, res, next) => {
  try {
    const page = Math.min(10000, Math.max(1, parseInt(req.query.page, 10) || 1));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const query = buildListFilter(req);

    const [total, patients] = await Promise.all([
      Patient.countDocuments(query),
      Patient.find(query)
        .populate('doctor', POPULATE_DOCTOR)
        .sort(buildSort(req))
        .skip((page - 1) * limit)
        .limit(limit)
        .select('-__v')
        .lean(),
    ]);

    res.json({ success: true, data: patients, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/patients/export — CSV of the current filter (max 5000 rows)
export const exportPatients = async (req, res, next) => {
  try {
    const patients = await Patient.find(buildListFilter(req)).populate('doctor', 'name specialization').sort(buildSort(req)).limit(5000).lean();
    const fmt = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
    const csv = toCsv(
      ['Name', 'Age', 'Gender', 'Condition', 'Status', 'Doctor', 'Specialty', 'Admitted', 'Follow-up', 'Discharged', 'Phone', 'Email'],
      patients.map((p) => [
        p.name,
        p.age,
        p.gender,
        p.condition,
        p.status,
        p.doctor?.name,
        p.doctor?.specialization,
        fmt(p.admissionDate),
        fmt(p.followUpDate),
        fmt(p.dischargeDate),
        p.phone,
        p.email,
      ])
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="patients-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send('﻿' + csv); // BOM so Excel reads UTF-8 names correctly
  } catch (error) {
    next(error);
  }
};

// @route GET /api/patients/:id
export const getPatientById = async (req, res, next) => {
  try {
    const patient = await loadPatient(req, res);
    if (!patient) return;
    await patient.populate('doctor', POPULATE_DOCTOR + ' maxPatients');
    res.json({ success: true, data: patient });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/patients/:id/history
export const getPatientHistory = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid patient ID format' });
    const scope = patientScope(req);
    delete scope.archivedAt; // history of archived records stays readable
    const exists = await Patient.exists({ _id: req.params.id, ...scope });
    if (!exists) return res.status(404).json({ success: false, message: 'Patient not found' });
    const events = await Activity.find({ patient: req.params.id }).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ success: true, data: events });
  } catch (error) {
    next(error);
  }
};

// ---------- write ----------

// @route POST /api/patients            (admin; doctor → always under themselves)
export const createPatient = async (req, res, next) => {
  try {
    const { fields, error } = readPatientFields(req.body, { requireCore: true });
    if (error) return res.status(400).json({ success: false, message: error });

    const doctorId = isDoctor(req) ? String(req.user.doctor) : asString(req.body.doctor);
    if (!isValidObjectId(doctorId)) return res.status(400).json({ success: false, message: 'Invalid assigned doctor ID format' });
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ success: false, message: 'Assigned doctor not found' });

    const patient = new Patient({ status: 'Stable', admissionDate: new Date(), ...fields, doctor: doctor._id });
    if (patient.status === 'Discharged') patient.dischargeDate = new Date();
    await patient.save();
    await patient.populate('doctor', POPULATE_DOCTOR);

    await logActivity(req, { type: 'patient.admitted', patient, doctors: [doctor._id], to: patient.status, note: `Admitted under ${doctor.name}` });
    res.status(201).json({ success: true, message: 'Patient created successfully', data: patient });
  } catch (error) {
    next(error);
  }
};

// @route PUT /api/patients/:id
export const updatePatient = async (req, res, next) => {
  try {
    const patient = await loadPatient(req, res);
    if (!patient) return;

    const { fields, error } = readPatientFields(req.body, { requireCore: false });
    if (error) return res.status(400).json({ success: false, message: error });

    if (req.user.role === 'nurse') {
      const forbidden = Object.keys(fields).filter((k) => !NURSE_FIELDS.includes(k) && !sameValue(fields[k], patient[k]));
      if (forbidden.length) {
        return res.status(403).json({ success: false, message: 'Nurses can only update clinical status, notes and follow-up date' });
      }
    }

    // Reassignment through the edit form is allowed for admins and logged as a transfer
    let newDoctor = null;
    const requestedDoctor = asString(req.body.doctor);
    if (requestedDoctor && requestedDoctor !== String(patient.doctor)) {
      if (!isAdmin(req)) return res.status(403).json({ success: false, message: 'Use Transfer to move a patient to another doctor' });
      if (!isValidObjectId(requestedDoctor)) return res.status(400).json({ success: false, message: 'Invalid assigned doctor ID format' });
      newDoctor = await Doctor.findById(requestedDoctor);
      if (!newDoctor) return res.status(404).json({ success: false, message: 'Assigned doctor not found' });
    }

    const before = { status: patient.status, followUpDate: patient.followUpDate, doctor: patient.doctor };
    const changed = Object.keys(fields).filter((k) => !sameValue(fields[k], patient[k]));
    applyDischarge(patient, fields.status);
    Object.assign(patient, fields);
    if (newDoctor) patient.doctor = newDoctor._id;
    await patient.save();

    const events = [];
    if (changed.includes('status')) {
      events.push({ type: 'patient.status', patient, doctors: [patient.doctor], from: before.status, to: fields.status });
    }
    if (changed.includes('followUpDate')) {
      events.push({
        type: 'patient.followup',
        patient,
        doctors: [patient.doctor],
        to: fields.followUpDate ? fields.followUpDate.toISOString().slice(0, 10) : '',
        note: fields.followUpDate ? 'Follow-up scheduled' : 'Follow-up cleared',
      });
    }
    if (newDoctor) {
      const oldDoc = await Doctor.findById(before.doctor).select('name').lean();
      events.push({ type: 'patient.transferred', patient, doctors: [before.doctor, newDoctor._id], from: oldDoc?.name || '', to: newDoctor.name });
    }
    if (changed.some((k) => !['status', 'followUpDate'].includes(k))) {
      events.push({ type: 'patient.updated', patient, doctors: [patient.doctor], note: 'Record details updated' });
    }
    if (events.length) await logActivities(req, events);

    await patient.populate('doctor', POPULATE_DOCTOR);
    res.json({ success: true, message: 'Patient updated successfully', data: patient });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/patients/:id/transfer   { doctor, reason }   (admin; doctor for own patients)
export const transferPatient = async (req, res, next) => {
  try {
    const patient = await loadPatient(req, res);
    if (!patient) return;
    const target = asString(req.body.doctor);
    if (!isValidObjectId(target)) return res.status(400).json({ success: false, message: 'Choose the doctor to transfer to' });
    if (target === String(patient.doctor)) return res.status(400).json({ success: false, message: 'The patient is already under this doctor' });
    const [fromDoc, toDoc] = await Promise.all([Doctor.findById(patient.doctor).select('name'), Doctor.findById(target)]);
    if (!toDoc) return res.status(404).json({ success: false, message: 'Doctor not found' });

    patient.doctor = toDoc._id;
    await patient.save();
    await logActivity(req, {
      type: 'patient.transferred',
      patient,
      doctors: [fromDoc?._id, toDoc._id],
      from: fromDoc?.name,
      to: toDoc.name,
      note: sanitizeString(asString(req.body.reason), 300),
    });
    await patient.populate('doctor', POPULATE_DOCTOR);
    res.json({ success: true, message: `Transferred to ${toDoc.name}`, data: patient });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/patients/:id/archive   (admin)
export const archivePatient = async (req, res, next) => {
  try {
    const patient = await loadPatient(req, res);
    if (!patient) return;
    patient.archivedAt = new Date();
    patient.archivedBy = req.user._id;
    await patient.save();
    await logActivity(req, { type: 'patient.archived', patient, doctors: [patient.doctor] });
    res.json({ success: true, message: 'Patient archived' });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/patients/:id/restore   (admin)
export const restorePatient = async (req, res, next) => {
  try {
    const patient = await loadPatient(req, res, { archived: true });
    if (!patient) return;
    patient.archivedAt = null;
    patient.archivedBy = null;
    await patient.save();
    await logActivity(req, { type: 'patient.restored', patient, doctors: [patient.doctor] });
    res.json({ success: true, message: 'Patient restored' });
  } catch (error) {
    next(error);
  }
};

// @route DELETE /api/patients/:id   (admin) — permanent; works on active or archived records
export const deletePatient = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid patient ID format' });
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });
    await Patient.deleteOne({ _id: patient._id });
    await logActivity(req, { type: 'patient.deleted', patient, doctors: [patient.doctor], note: 'Permanently deleted' });
    res.json({ success: true, message: 'Patient deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/patients/bulk   { ids: [], action: 'status' | 'archive' | 'restore', status }
export const bulkPatients = async (req, res, next) => {
  try {
    const { action, status } = req.body;
    const ids = Array.isArray(req.body.ids) ? [...new Set(req.body.ids.filter((id) => isValidObjectId(id)))].slice(0, 100) : [];
    if (!ids.length) return res.status(400).json({ success: false, message: 'Select at least one patient' });

    if (action === 'status') {
      if (!PATIENT_STATUSES.includes(status)) return res.status(400).json({ success: false, message: 'Unknown clinical status' });
      const patients = await Patient.find({ _id: { $in: ids }, ...patientScope(req) });
      const changed = patients.filter((p) => p.status !== status);
      const events = changed.map((p) => {
        const from = p.status;
        applyDischarge(p, status);
        p.status = status;
        return { type: 'patient.status', patient: p, doctors: [p.doctor], from, to: status, note: 'Bulk update' };
      });
      await Promise.all(changed.map((p) => p.save()));
      await logActivities(req, events);
      return res.json({ success: true, message: `${changed.length} patient(s) updated`, updated: changed.length });
    }

    if (action === 'archive' || action === 'restore') {
      if (!isAdmin(req)) return res.status(403).json({ success: false, message: 'You do not have permission to do this' });
      const archiving = action === 'archive';
      const patients = await Patient.find({ _id: { $in: ids }, archivedAt: archiving ? null : { $ne: null } });
      await Patient.updateMany(
        { _id: { $in: patients.map((p) => p._id) } },
        archiving ? { archivedAt: new Date(), archivedBy: req.user._id } : { archivedAt: null, archivedBy: null }
      );
      await logActivities(
        req,
        patients.map((p) => ({ type: archiving ? 'patient.archived' : 'patient.restored', patient: p, doctors: [p.doctor], note: 'Bulk action' }))
      );
      return res.json({ success: true, message: `${patients.length} patient(s) ${archiving ? 'archived' : 'restored'}`, updated: patients.length });
    }

    res.status(400).json({ success: false, message: 'Unknown bulk action' });
  } catch (error) {
    next(error);
  }
};
