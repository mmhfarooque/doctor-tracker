// What each role may do in the UI. The API enforces the same rules; this only hides controls a user can't use.
const RULES = {
  'doctor.manage': ['admin'],
  'patient.create': ['admin', 'doctor'],
  'patient.editAll': ['admin', 'doctor'],
  'patient.transfer': ['admin', 'doctor'],
  'patient.archive': ['admin'],
  'patient.delete': ['admin'],
  'patient.viewArchived': ['admin'],
  'patient.bulkStatus': ['admin', 'doctor', 'nurse'],
  'shift.manage': ['admin'],
  'team.manage': ['admin'],
};

export const can = (user, action) => Boolean(user && RULES[action]?.includes(user.role));

export const ROLE_LABELS = { admin: 'Administrator', doctor: 'Doctor', nurse: 'Nurse' };
