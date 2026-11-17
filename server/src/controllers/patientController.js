import Patient from '../models/Patient.js';
import Doctor from '../models/Doctor.js';
import { escapeRegex, sanitizeString, isValidEmail } from '../utils/sanitize.js';

// @desc    Get all patients with search, filters & pagination
// @route   GET /api/patients
// @access  Private
export const getPatients = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const { search, condition, status, doctor, startDate, endDate, sortBy = 'createdAt', order = 'desc' } = req.query;

    const query = {};

    // Search functionality with regex escaping to prevent ReDoS
    if (search && typeof search === 'string' && search.trim() !== '') {
      const cleanSearch = escapeRegex(search.trim());
      const searchRegex = new RegExp(cleanSearch, 'i');
      query.$or = [
        { name: searchRegex },
        { condition: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
      ];
    }

    // Filter by Condition
    if (condition && typeof condition === 'string' && condition !== 'all') {
      const cleanCond = escapeRegex(condition.trim());
      query.condition = new RegExp(cleanCond, 'i');
    }

    // Filter by Status
    if (status && typeof status === 'string' && status !== 'all') {
      query.status = sanitizeString(status);
    }

    // Filter by Assigned Doctor (validate ObjectId format)
    if (doctor && typeof doctor === 'string' && doctor !== 'all') {
      if (/^[0-9a-fA-F]{24}$/.test(doctor)) {
        query.doctor = doctor;
      }
    }

    // Date-wise filtering
    if (startDate || endDate) {
      query.admissionDate = {};
      if (startDate) {
        const start = new Date(startDate);
        if (!isNaN(start.getTime())) {
          query.admissionDate.$gte = start;
        }
      }
      if (endDate) {
        const end = new Date(endDate);
        if (!isNaN(end.getTime())) {
          end.setHours(23, 59, 59, 999);
          query.admissionDate.$lte = end;
        }
      }
      if (Object.keys(query.admissionDate).length === 0) {
        delete query.admissionDate;
      }
    }

    // Whitelist allowed sort keys
    const allowedSortFields = ['createdAt', 'name', 'age', 'condition', 'status', 'admissionDate'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sort = {};
    sort[safeSortBy] = order === 'asc' ? 1 : -1;

    const [total, patients] = await Promise.all([
      Patient.countDocuments(query),
      Patient.find(query)
        .populate('doctor', 'name specialization hospital email')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    res.json({
      success: true,
      data: patients,
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

// @desc    Get single patient by ID
// @route   GET /api/patients/:id
// @access  Private
export const getPatientById = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id).populate(
      'doctor',
      'name specialization hospital email phone'
    );

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    res.json({
      success: true,
      data: patient,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new patient
// @route   POST /api/patients
// @access  Private
export const createPatient = async (req, res, next) => {
  try {
    const { name, age, gender, condition, status, phone, email, doctor, notes, admissionDate } = req.body;

    if (!name || age === undefined || !gender || !condition || !doctor) {
      return res.status(400).json({
        success: false,
        message: 'Name, age, gender, condition, and doctor are required fields',
      });
    }

    const safeAge = parseInt(age, 10);
    if (isNaN(safeAge) || safeAge < 0 || safeAge > 130) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid age between 0 and 130',
      });
    }

    // Verify doctor exists
    const doctorExists = await Doctor.findById(doctor);
    if (!doctorExists) {
      return res.status(404).json({
        success: false,
        message: 'Assigned doctor not found',
      });
    }

    let cleanEmail = '';
    if (email) {
      cleanEmail = email.toLowerCase().trim();
      if (!isValidEmail(cleanEmail)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid patient email address',
        });
      }
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
      email: cleanEmail,
      doctor,
      notes: sanitizeString(notes || ''),
      admissionDate: admissionDate && !isNaN(new Date(admissionDate).getTime()) ? new Date(admissionDate) : new Date(),
    });

    const populatedPatient = await Patient.findById(patient._id).populate('doctor', 'name specialization hospital');

    res.status(201).json({
      success: true,
      message: 'Patient created successfully',
      data: populatedPatient,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update patient information
// @route   PUT /api/patients/:id
// @access  Private
export const updatePatient = async (req, res, next) => {
  try {
    const { name, age, gender, condition, status, phone, email, doctor, notes, admissionDate } = req.body;

    let patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    if (doctor) {
      const doctorExists = await Doctor.findById(doctor);
      if (!doctorExists) {
        return res.status(404).json({
          success: false,
          message: 'Assigned doctor not found',
        });
      }
    }

    let cleanEmail = patient.email;
    if (email) {
      cleanEmail = email.toLowerCase().trim();
      if (!isValidEmail(cleanEmail)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid patient email address',
        });
      }
    }

    let safeAge = patient.age;
    if (age !== undefined) {
      const parsedAge = parseInt(age, 10);
      if (isNaN(parsedAge) || parsedAge < 0 || parsedAge > 130) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid age between 0 and 130',
        });
      }
      safeAge = parsedAge;
    }

    patient = await Patient.findByIdAndUpdate(
      req.params.id,
      {
        name: name ? sanitizeString(name) : patient.name,
        age: safeAge,
        gender: gender && ['Male', 'Female', 'Other'].includes(gender) ? gender : patient.gender,
        condition: condition ? sanitizeString(condition) : patient.condition,
        status: status && ['Stable', 'Critical', 'Under Observation', 'Recovering', 'Discharged'].includes(status)
          ? status
          : patient.status,
        phone: phone !== undefined ? sanitizeString(phone) : patient.phone,
        email: cleanEmail,
        doctor: doctor || patient.doctor,
        notes: notes !== undefined ? sanitizeString(notes) : patient.notes,
        admissionDate: admissionDate && !isNaN(new Date(admissionDate).getTime()) ? new Date(admissionDate) : patient.admissionDate,
      },
      { new: true, runValidators: true }
    ).populate('doctor', 'name specialization hospital');

    res.json({
      success: true,
      message: 'Patient updated successfully',
      data: patient,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete patient
// @route   DELETE /api/patients/:id
// @access  Private
export const deletePatient = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    await Patient.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Patient deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
