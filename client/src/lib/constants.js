// Clinical vocabulary shared by every page. Values must match the API enums.

export const PATIENT_STATUSES = [
  { value: 'Critical', label: 'Critical', tone: 'critical', bar: 'bg-critical' },
  { value: 'Under Observation', label: 'Under observation', tone: 'watch', bar: 'bg-watch' },
  { value: 'Recovering', label: 'Recovering', tone: 'recovering', bar: 'bg-recovering' },
  { value: 'Stable', label: 'Stable', tone: 'stable', bar: 'bg-stable' },
  { value: 'Discharged', label: 'Discharged', tone: 'discharged', bar: 'bg-discharged' },
];

export const DOCTOR_STATUSES = [
  { value: 'Active', label: 'Active', tone: 'stable' },
  { value: 'On Leave', label: 'On leave', tone: 'watch' },
  { value: 'Inactive', label: 'Inactive', tone: 'discharged' },
];

export const GENDERS = ['Female', 'Male', 'Other'];

export const TONE_CLASSES = {
  critical: 'bg-critical-soft text-critical',
  watch: 'bg-watch-soft text-watch',
  recovering: 'bg-recovering-soft text-recovering',
  stable: 'bg-stable-soft text-stable',
  discharged: 'bg-discharged-soft text-discharged',
};

export const DOT_CLASSES = {
  critical: 'bg-critical',
  watch: 'bg-watch',
  recovering: 'bg-recovering',
  stable: 'bg-stable',
  discharged: 'bg-discharged',
};

export const findStatus = (list, value) => list.find((s) => s.value === value) || { value, label: value, tone: 'discharged' };

export const FOLLOW_UP_FILTERS = [
  { value: 'overdue', label: 'Overdue follow-up' },
  { value: 'today', label: 'Follow-up due today' },
  { value: 'week', label: 'Follow-up in next 7 days' },
  { value: 'none', label: 'No follow-up planned' },
];

export const SHIFT_TYPES = [
  { value: 'Day', label: 'Day', hours: '08:00–16:00', tone: 'bg-[#E5EDFB] text-[#24509E] border-[#C9D9F5]' },
  { value: 'Evening', label: 'Evening', hours: '16:00–24:00', tone: 'bg-[#FBF0D9] text-[#7A4E00] border-[#F0DDB0]' },
  { value: 'Night', label: 'Night', hours: '00:00–08:00', tone: 'bg-[#ECE8F7] text-[#4B3A8A] border-[#D8CFF0]' },
  { value: 'On-call', label: 'On call', hours: '24 h from 08:00', tone: 'bg-pine-50 text-pine-800 border-pine-200' },
];

export const findShiftType = (value) => SHIFT_TYPES.find((s) => s.value === value) || SHIFT_TYPES[0];
