import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';

// @desc    Get dashboard analytics & statistics using optimized MongoDB aggregation pipelines
// @route   GET /api/dashboard/stats
// @access  Private
export const getDashboardStats = async (req, res, next) => {
  try {
    // 1. Overall counts
    const [totalDoctors, totalPatients] = await Promise.all([
      Doctor.countDocuments(),
      Patient.countDocuments(),
    ]);

    // 2. Patients per Doctor aggregation (Clean data aggregation)
    const patientsPerDoctor = await Patient.aggregate([
      {
        $group: {
          _id: '$doctor',
          patientCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'doctors',
          localField: '_id',
          foreignField: '_id',
          as: 'doctorDetails',
        },
      },
      {
        $unwind: '$doctorDetails',
      },
      {
        $project: {
          _id: 1,
          doctorName: '$doctorDetails.name',
          specialization: '$doctorDetails.specialization',
          hospital: '$doctorDetails.hospital',
          patientCount: 1,
        },
      },
      {
        $sort: { patientCount: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    // Average patients per doctor
    const avgPatientsPerDoctor = totalDoctors > 0 ? (totalPatients / totalDoctors).toFixed(1) : 0;

    // 3. Date-based statistics (Monthly admissions over the past 6-12 months)
    const monthlyRegistrations = await Patient.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$admissionDate' },
            month: { $month: '$admissionDate' },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 },
      },
      {
        $project: {
          _id: 0,
          period: {
            $concat: [
              { $toString: '$_id.year' },
              '-',
              {
                $cond: {
                  if: { $lt: ['$_id.month', 10] },
                  then: { $concat: ['0', { $toString: '$_id.month' }] },
                  else: { $toString: '$_id.month' },
                },
              },
            ],
          },
          admissions: '$count',
        },
      },
    ]);

    // 4. Specialization breakdown (Distribution of doctors across specialties)
    const specialtyDistribution = await Doctor.aggregate([
      {
        $group: {
          _id: '$specialization',
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          specialty: '$_id',
          count: 1,
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    // 5. Patient status / condition breakdown
    const statusDistribution = await Patient.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          status: '$_id',
          count: 1,
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    // 6. Recent activities (Latest admitted patients)
    const recentPatients = await Patient.find()
      .populate('doctor', 'name specialization')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    res.json({
      success: true,
      data: {
        totals: {
          doctors: totalDoctors,
          patients: totalPatients,
          avgPatientsPerDoctor: parseFloat(avgPatientsPerDoctor),
        },
        patientsPerDoctor,
        monthlyRegistrations,
        specialtyDistribution,
        statusDistribution,
        recentPatients,
      },
    });
  } catch (error) {
    next(error);
  }
};
