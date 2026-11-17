import Patient from '../models/Patient.js';
import Doctor from '../models/Doctor.js';

// @desc    Get all patients with search, filters & pagination
// @route   GET /api/patients
// @access  Private
export const getPatients = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const { search, condition, status, doctor, startDate, endDate, sortBy = 'createdAt', order = 'desc' } = req.query;

    const query = {};

    // Search functionality (name, condition, phone, email)
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { condition: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
      ];
    }

    // Filter by Condition
    if (condition && condition !== 'all') {
      query.condition = new RegExp(condition.trim(), 'i');
    }

    // Filter by Status
    if (status && status !== 'all') {
      query.status = status;
    }

    // Filter by Assigned Doctor
    if (doctor && doctor !== 'all') {
      query.doctor = doctor;
    }

    // Date-wise filtering (admissionDate or createdAt)
    if (startDate || endDate) {
      query.admissionDate = {};
      if (startDate) {
        query.admissionDate.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.admissionDate.$lte = end;
      }
    }

    // Sort order
    const sort = {};
    sort[sortBy] = order === 'asc' ? 1 : -1;

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

    // Verify doctor exists
    const doctorExists = await Doctor.findById(doctor);
    if (!doctorExists) {
      return res.status(404).json({
        success: false,
        message: 'Assigned doctor not found',
      });
    }

    const patient = await Patient.create({
      name,
      age,
      gender,
      condition,
      status: status || 'Stable',
      phone: phone || '',
      email: email ? email.toLowerCase().trim() : '',
      doctor,
      notes: notes || '',
      admissionDate: admissionDate ? new Date(admissionDate) : new Date(),
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

    patient = await Patient.findByIdAndUpdate(
      req.params.id,
      {
        name: name || patient.name,
        age: age !== undefined ? age : patient.age,
        gender: gender || patient.gender,
        condition: condition || patient.condition,
        status: status || patient.status,
        phone: phone !== undefined ? phone : patient.phone,
        email: email !== undefined ? email.toLowerCase().trim() : patient.email,
        doctor: doctor || patient.doctor,
        notes: notes !== undefined ? notes : patient.notes,
        admissionDate: admissionDate ? new Date(admissionDate) : patient.admissionDate,
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
