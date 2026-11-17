import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';

// @desc    Get dashboard analytics & statistics using optimized MongoDB aggregation pipelines
// @route   GET /api/dashboard/stats
// @access  Private
export const getDashboardStats = async (req, res, next) => {
  try {
    // All six queries are independent, so they run in parallel (one round-trip of latency instead of six)
    // Timeline covers the last 12 months so the pipeline stays bounded as data grows.
    const since = new Date();
    since.setMonth(since.getMonth() - 11, 1);
    since.setHours(0, 0, 0, 0);

    const [
      totalDoctors,
      totalPatients,
      patientsPerDoctor,
      monthlyRegistrations,
      specialtyDistribution,
      statusDistribution,
      recentPatients,
      patientsBySpecialty,
    ] = await Promise.all([
      Doctor.estimatedDocumentCount(),
      Patient.estimatedDocumentCount(),
      Patient.aggregate([
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
      ]),
      Patient.aggregate([
        { $match: { admissionDate: { $gte: since } } },
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
      ]),
      Doctor.aggregate([
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
      ]),
      Patient.aggregate([
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
      ]),
      Patient.find().populate('doctor', 'name specialization').sort({ createdAt: -1 }).limit(5).select('-__v').lean(),
      Patient.aggregate([
        { $lookup: { from: 'doctors', localField: 'doctor', foreignField: '_id', as: 'doc' } },
        { $unwind: '$doc' },
        { $group: { _id: '$doc.specialization', patients: { $sum: 1 } } },
      ]),
    ]);

    // Each specialty: number of doctors and number of patients under them
    const patientsBySpec = Object.fromEntries(patientsBySpecialty.map((p) => [p._id, p.patients]));
    const specialties = specialtyDistribution
      .map((s) => ({ ...s, patients: patientsBySpec[s.specialty] || 0 }))
      .sort((a, b) => b.patients - a.patients);

    const avgPatientsPerDoctor = totalDoctors > 0 ? (totalPatients / totalDoctors).toFixed(1) : 0;

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
        specialtyDistribution: specialties,
        statusDistribution,
        recentPatients,
      },
    });
  } catch (error) {
    next(error);
  }
};
