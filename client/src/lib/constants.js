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
