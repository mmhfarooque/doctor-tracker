import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';
import Shift from '../models/Shift.js';
import { patientScope, isDoctor, readActivity } from '../utils/scope.js';

const DAY = 86400000;

// @route GET /api/dashboard/stats — everything the dashboard needs, scoped to the caller's patients
export const getDashboardStats = async (req, res, next) => {
  try {
    const scope = patientScope(req); // archived hidden; doctors see only their own patients
    const active = { ...scope, status: { $ne: 'Discharged' } };
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + DAY);
    const weekEnd = new Date(today.getTime() + 7 * DAY);
    const since = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const monthKey = (field) => ({ $dateToString: { format: '%Y-%m', date: field } });

    const [
      totalDoctors,
      totalPatients,
      activePatients,
      caseload,
      admissions,
      discharges,
      specialties,
      statusDistribution,
      recentPatients,
      followUpCounts,
      dueList,
      stay,
      onCall,
      recentActivity,
    ] = await Promise.all([
      isDoctor(req) ? 1 : Doctor.estimatedDocumentCount(),
      Patient.countDocuments(scope),
      Patient.countDocuments(active),
      // Active caseload per doctor vs capacity
      Doctor.aggregate([
        ...(isDoctor(req) ? [{ $match: { _id: req.user.doctor } }] : []),
        {
          $lookup: {
            from: 'patients',
            let: { id: '$_id' },
            pipeline: [{ $match: { $expr: { $eq: ['$doctor', '$$id'] }, archivedAt: null, status: { $ne: 'Discharged' } } }, { $count: 'n' }],
            as: 'active',
          },
        },
        {
          $project: {
            doctorName: '$name',
            specialization: 1,
            maxPatients: 1,
            patientCount: { $ifNull: [{ $first: '$active.n' }, 0] },
          },
        },
        { $addFields: { load: { $divide: ['$patientCount', '$maxPatients'] } } },
        { $sort: { load: -1, patientCount: -1 } },
        { $limit: 12 },
      ]),
      Patient.aggregate([
        { $match: { ...scope, admissionDate: { $gte: since } } },
        { $group: { _id: monthKey('$admissionDate'), count: { $sum: 1 } } },
      ]),
      Patient.aggregate([
        { $match: { ...scope, dischargeDate: { $gte: since } } },
        { $group: { _id: monthKey('$dischargeDate'), count: { $sum: 1 } } },
      ]),
      Patient.aggregate([
        { $match: scope },
        { $lookup: { from: 'doctors', localField: 'doctor', foreignField: '_id', as: 'doc' } },
        { $unwind: '$doc' },
        { $group: { _id: '$doc.specialization', patients: { $sum: 1 }, doctors: { $addToSet: '$doctor' } } },
        { $project: { _id: 0, specialty: '$_id', patients: 1, count: { $size: '$doctors' } } },
        { $sort: { patients: -1 } },
      ]),
      Patient.aggregate([{ $match: scope }, { $group: { _id: '$status', count: { $sum: 1 } } }, { $project: { _id: 0, status: '$_id', count: 1 } }]),
      Patient.find(scope).populate('doctor', 'name specialization').sort({ createdAt: -1 }).limit(5).select('-__v').lean(),
      Patient.aggregate([
        { $match: { ...active, followUpDate: { $ne: null, $lt: weekEnd } } },
        {
          $group: {
            _id: null,
            overdue: { $sum: { $cond: [{ $lt: ['$followUpDate', today] }, 1, 0] } },
            today: { $sum: { $cond: [{ $and: [{ $gte: ['$followUpDate', today] }, { $lt: ['$followUpDate', tomorrow] }] }, 1, 0] } },
            week: { $sum: { $cond: [{ $gte: ['$followUpDate', today] }, 1, 0] } },
          },
        },
      ]),
      Patient.find({ ...active, followUpDate: { $ne: null, $lt: weekEnd } })
        .populate('doctor', 'name')
        .sort({ followUpDate: 1 })
        .limit(6)
        .select('name condition status followUpDate doctor')
        .lean(),
      Patient.aggregate([
        { $match: { ...scope, dischargeDate: { $gte: since } } },
        { $project: { days: { $divide: [{ $subtract: ['$dischargeDate', '$admissionDate'] }, DAY] } } },
        { $group: { _id: null, avgDays: { $avg: '$days' }, discharged: { $sum: 1 } } },
      ]),
      Shift.find({ start: { $lte: now }, end: { $gt: now } }).populate('doctor', 'name specialization').sort({ type: 1 }).lean(),
      readActivity(req, { limit: 8 }),
    ]);

    // Fill all 12 months so the chart shows gaps as zero
    const admitMap = Object.fromEntries(admissions.map((a) => [a._id, a.count]));
    const dischargeMap = Object.fromEntries(discharges.map((d) => [d._id, d.count]));
    const monthly = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return { period, admissions: admitMap[period] || 0, discharges: dischargeMap[period] || 0 };
    });

    const fu = followUpCounts[0] || { overdue: 0, today: 0, week: 0 };
    const doctorsForAvg = isDoctor(req) ? 1 : totalDoctors;

    res.json({
      success: true,
      data: {
        scope: isDoctor(req) ? 'doctor' : 'all',
        totals: {
          doctors: totalDoctors,
          patients: totalPatients,
          activePatients,
          avgPatientsPerDoctor: doctorsForAvg ? Number((activePatients / doctorsForAvg).toFixed(1)) : 0,
          avgLengthOfStay: stay[0] ? Number(stay[0].avgDays.toFixed(1)) : null,
          dischargedLast12Months: stay[0]?.discharged || 0,
        },
        patientsPerDoctor: caseload,
        overCapacity: caseload.filter((d) => d.patientCount >= d.maxPatients),
        monthlyRegistrations: monthly,
        specialtyDistribution: specialties,
        statusDistribution,
        recentPatients,
        followUps: { overdue: fu.overdue, today: fu.today, week: fu.week, due: dueList },
        onCall: onCall.filter((s) => s.doctor),
        recentActivity,
      },
    });
  } catch (error) {
    next(error);
  }
};
