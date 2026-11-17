import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';
import { escapeRegex, sanitizeString, isValidEmail } from '../utils/sanitize.js';
import { isValidObjectId } from '../utils/validators.js';

// @desc    Get all doctors with search, filters & pagination
// @route   GET /api/doctors
// @access  Private
export const getDoctors = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const { search, specialization, hospital, status, startDate, endDate, sortBy = 'createdAt', order = 'desc' } = req.query;

    const query = {};

    // Search functionality with sanitized regex to prevent ReDoS
    if (search && typeof search === 'string' && search.trim() !== '') {
      const cleanSearch = escapeRegex(search.trim());
      const searchRegex = new RegExp(cleanSearch, 'i');
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { specialization: searchRegex },
        { hospital: searchRegex },
      ];
    }

    // Filter by Specialization
    if (specialization && typeof specialization === 'string' && specialization !== 'all') {
      query.specialization = sanitizeString(specialization);
    }

    // Filter by Hospital
    if (hospital && typeof hospital === 'string' && hospital !== 'all') {
      query.hospital = sanitizeString(hospital);
    }

    // Filter by Status
    if (status && typeof status === 'string' && status !== 'all') {
      query.status = sanitizeString(status);
    }

    // Date-wise filtering
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        if (!isNaN(start.getTime())) {
          query.createdAt.$gte = start;
        }
      }
      if (endDate) {
        const end = new Date(endDate);
        if (!isNaN(end.getTime())) {
          end.setHours(23, 59, 59, 999);
          query.createdAt.$lte = end;
        }
      }
      if (Object.keys(query.createdAt).length === 0) {
        delete query.createdAt;
      }
    }

    // Whitelist allowed sort fields to prevent injection
    const allowedSortFields = ['createdAt', 'name', 'specialization', 'hospital', 'experienceYears'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sort = {};
    sort[safeSortBy] = order === 'asc' ? 1 : -1;

    const [total, doctors] = await Promise.all([
      Doctor.countDocuments(query),
      Doctor.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    // Attach patient count to each doctor
    const doctorIds = doctors.map((d) => d._id);
    const patientCounts = await Patient.aggregate([
      { $match: { doctor: { $in: doctorIds } } },
      { $group: { _id: '$doctor', count: { $sum: 1 } } },
    ]);

    const countMap = {};
    patientCounts.forEach((pc) => {
      countMap[pc._id.toString()] = pc.count;
    });

    const doctorsWithCounts = doctors.map((d) => ({
      ...d,
      patientCount: countMap[d._id.toString()] || 0,
    }));

    res.json({
      success: true,
      data: doctorsWithCounts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single doctor by ID
// @route   GET /api/doctors/:id
// @access  Private
export const getDoctorById = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid doctor ID format' });
    }

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
    }

    const patientCount = await Patient.countDocuments({ doctor: doctor._id });

    res.json({
      success: true,
      data: {
        ...doctor.toObject(),
        patientCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new doctor
// @route   POST /api/doctors
// @access  Private
export const createDoctor = async (req, res, next) => {
  try {
    const { name, specialization, hospital, phone, email, status, experienceYears, bio } = req.body;

    if (!name || !specialization || !hospital || !phone || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name, specialization, hospital, phone, and email are required fields',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    const existingDoctor = await Doctor.findOne({ email: cleanEmail });
    if (existingDoctor) {
      return res.status(400).json({
        success: false,
        message: 'A doctor with this email address already exists',
      });
    }

    const doctor = await Doctor.create({
      name: sanitizeString(name),
      specialization: sanitizeString(specialization),
      hospital: sanitizeString(hospital),
      phone: sanitizeString(phone),
      email: cleanEmail,
      status: ['Active', 'On Leave', 'Inactive'].includes(status) ? status : 'Active',
      experienceYears: Math.max(0, parseInt(experienceYears, 10) || 5),
      bio: sanitizeString(bio || ''),
    });

    res.status(201).json({
      success: true,
      message: 'Doctor created successfully',
      data: doctor,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update doctor
// @route   PUT /api/doctors/:id
// @access  Private
export const updateDoctor = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid doctor ID format' });
    }

    const { name, specialization, hospital, phone, email, status, experienceYears, bio } = req.body;

    let doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
    }

    // Check email format and uniqueness if changing email
    let cleanEmail = doctor.email;
    if (email) {
      cleanEmail = email.toLowerCase().trim();
      if (!isValidEmail(cleanEmail)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid email address',
        });
      }
      if (cleanEmail !== doctor.email) {
        const emailExists = await Doctor.findOne({ email: cleanEmail });
        if (emailExists) {
          return res.status(400).json({
            success: false,
            message: 'A doctor with this email address already exists',
          });
        }
      }
    }

    doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      {
        name: name ? sanitizeString(name) : doctor.name,
        specialization: specialization ? sanitizeString(specialization) : doctor.specialization,
        hospital: hospital ? sanitizeString(hospital) : doctor.hospital,
        phone: phone ? sanitizeString(phone) : doctor.phone,
        email: cleanEmail,
        status: status && ['Active', 'On Leave', 'Inactive'].includes(status) ? status : doctor.status,
        experienceYears: experienceYears !== undefined ? Math.max(0, parseInt(experienceYears, 10)) : doctor.experienceYears,
        bio: bio !== undefined ? sanitizeString(bio) : doctor.bio,
      },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Doctor updated successfully',
      data: doctor,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete doctor and cascade assigned patients
// @route   DELETE /api/doctors/:id
// @access  Private
export const deleteDoctor = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid doctor ID format' });
    }

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
    }

    await Promise.all([
      Patient.deleteMany({ doctor: doctor._id }),
      Doctor.findByIdAndDelete(req.params.id),
    ]);

    res.json({
      success: true,
      message: 'Doctor and assigned patients deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    View corresponding patients for each doctor
// @route   GET /api/doctors/:id/patients
// @access  Private
export const getDoctorPatients = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid doctor ID format' });
    }

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
    }

    const { search, condition, status, page = 1, limit = 20 } = req.query;
    const query = { doctor: doctor._id };

    if (search && typeof search === 'string' && search.trim() !== '') {
      const cleanSearch = escapeRegex(search.trim());
      const regex = new RegExp(cleanSearch, 'i');
      query.$or = [{ name: regex }, { condition: regex }, { phone: regex }];
    }

    if (condition && condition !== 'all') {
      query.condition = sanitizeString(condition);
    }

    if (status && status !== 'all') {
      query.status = sanitizeString(status);
    }

    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (safePage - 1) * safeLimit;

    const [total, patients] = await Promise.all([
      Patient.countDocuments(query),
      Patient.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
    ]);

    res.json({
      success: true,
      doctor: {
        _id: doctor._id,
        name: doctor.name,
        specialization: doctor.specialization,
        hospital: doctor.hospital,
      },
      data: patients,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add new patients under a specific doctor
// @route   POST /api/doctors/:id/patients
// @access  Private
export const addPatientToDoctor = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid doctor ID format' });
    }

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
    }

    const { name, age, gender, condition, status, phone, email, notes, admissionDate } = req.body;

    if (!name || age === undefined || !gender || !condition) {
      return res.status(400).json({
        success: false,
        message: 'Patient name, age, gender, and condition are required',
      });
    }

    const safeAge = parseInt(age, 10);
    if (isNaN(safeAge) || safeAge < 0 || safeAge > 130) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid age between 0 and 130',
      });
    }

    const patient = await Patient.create({
      name: sanitizeString(name),
      age: safeAge,
      gender: ['Male', 'Female', 'Other'].includes(gender) ? gender : 'Male',
      condition: sanitizeString(condition),
      status: ['Stable', 'Critical', 'Under Observation', 'Recovering', 'Discharged'].includes(status)
        ? status
        : 'Stable',
      phone: sanitizeString(phone || ''),
      email: email ? email.toLowerCase().trim() : '',
      doctor: doctor._id,
      notes: sanitizeString(notes || ''),
      admissionDate: admissionDate && !isNaN(new Date(admissionDate).getTime()) ? new Date(admissionDate) : new Date(),
    });

    res.status(201).json({
      success: true,
      message: 'Patient added under doctor successfully',
      data: patient,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete patients from the doctor's patient list
// @route   DELETE /api/doctors/:id/patients/:patientId
// @access  Private
export const deletePatientFromDoctor = async (req, res, next) => {
  try {
    const { id: doctorId, patientId } = req.params;

    if (!isValidObjectId(doctorId, patientId)) {
      return res.status(400).json({ success: false, message: 'Invalid doctor or patient ID format' });
    }

    const patient = await Patient.findOne({ _id: patientId, doctor: doctorId });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found under this doctor',
      });
    }

    await Patient.findByIdAndDelete(patientId);

    res.json({
      success: true,
      message: 'Patient removed from doctor roster successfully',
    });
  } catch (error) {
    next(error);
  }
};
