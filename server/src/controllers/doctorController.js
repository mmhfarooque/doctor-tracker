import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';

// @desc    Get all doctors with search, filters & pagination
// @route   GET /api/doctors
// @access  Private
export const getDoctors = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const { search, specialization, hospital, status, startDate, endDate, sortBy = 'createdAt', order = 'desc' } = req.query;

    const query = {};

    // Search functionality (name, email, specialization, hospital)
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { specialization: searchRegex },
        { hospital: searchRegex },
      ];
    }

    // Filter by Specialization
    if (specialization && specialization !== 'all') {
      query.specialization = specialization;
    }

    // Filter by Hospital
    if (hospital && hospital !== 'all') {
      query.hospital = hospital;
    }

    // Filter by Status
    if (status && status !== 'all') {
      query.status = status;
    }

    // Date-wise filtering
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    // Sort order
    const sort = {};
    sort[sortBy] = order === 'asc' ? 1 : -1;

    const [total, doctors] = await Promise.all([
      Doctor.countDocuments(query),
      Doctor.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    // Attach patient count to each doctor for rich UI presentation
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

    const existingDoctor = await Doctor.findOne({ email: email.toLowerCase().trim() });
    if (existingDoctor) {
      return res.status(400).json({
        success: false,
        message: 'A doctor with this email address already exists',
      });
    }

    const doctor = await Doctor.create({
      name,
      specialization,
      hospital,
      phone,
      email: email.toLowerCase().trim(),
      status: status || 'Active',
      experienceYears: experienceYears || 5,
      bio: bio || '',
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
    const { name, specialization, hospital, phone, email, status, experienceYears, bio } = req.body;

    let doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
    }

    // Check email uniqueness if changing email
    if (email && email.toLowerCase().trim() !== doctor.email) {
      const emailExists = await Doctor.findOne({ email: email.toLowerCase().trim() });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'A doctor with this email address already exists',
        });
      }
    }

    doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      {
        name: name || doctor.name,
        specialization: specialization || doctor.specialization,
        hospital: hospital || doctor.hospital,
        phone: phone || doctor.phone,
        email: email ? email.toLowerCase().trim() : doctor.email,
        status: status || doctor.status,
        experienceYears: experienceYears !== undefined ? experienceYears : doctor.experienceYears,
        bio: bio !== undefined ? bio : doctor.bio,
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

// @desc    Delete doctor and cascade or detach patients
// @route   DELETE /api/doctors/:id
// @access  Private
export const deleteDoctor = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
    }

    // Delete associated patients or check if any exist
    await Patient.deleteMany({ doctor: doctor._id });
    await Doctor.findByIdAndDelete(req.params.id);

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
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
    }

    const { search, condition, status, page = 1, limit = 20 } = req.query;
    const query = { doctor: doctor._id };

    if (search && search.trim() !== '') {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ name: regex }, { condition: regex }, { phone: regex }];
    }

    if (condition && condition !== 'all') {
      query.condition = condition;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [total, patients] = await Promise.all([
      Patient.countDocuments(query),
      Patient.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
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
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        totalPages: Math.ceil(total / parseInt(limit, 10)),
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

    const patient = await Patient.create({
      name,
      age,
      gender,
      condition,
      status: status || 'Stable',
      phone: phone || '',
      email: email ? email.toLowerCase().trim() : '',
      doctor: doctor._id,
      notes: notes || '',
      admissionDate: admissionDate ? new Date(admissionDate) : new Date(),
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
