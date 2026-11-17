export const initials = (name = '') =>
  name
    .replace(/^Dr\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

export const formatDate = (value, opts = { day: 'numeric', month: 'short', year: 'numeric' }) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', opts);
};

// yyyy-mm-dd for <input type="date">
export const toDateInput = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
};

export const monthLabel = (period) => {
  // period = "2026-07"
  const [y, m] = period.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'short' });
};

export const apiError = (err, fallback) => err?.response?.data?.message || fallback;

export const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

export const relativeTime = (value) => {
  if (!value) return '';
  const diff = (Date.now() - new Date(value).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)} d ago`;
  return formatDate(value, { day: 'numeric', month: 'short' });
};

const dayStart = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

/** 'overdue' | 'today' | 'soon' (≤7 days) | 'later' | null */
export const followUpState = (value) => {
  if (!value) return null;
  const days = Math.round((dayStart(value) - dayStart(new Date())) / 86400000);
  if (days < 0) return 'overdue';
  if (days === 0) return 'today';
  if (days <= 7) return 'soon';
  return 'later';
};

export const lengthOfStay = (admitted, discharged) => {
  if (!admitted) return null;
  const end = discharged ? new Date(discharged) : new Date();
  return Math.max(0, Math.round((dayStart(end) - dayStart(admitted)) / 86400000));
};

/** Downloads an authenticated file (e.g. CSV export) without exposing the token in a URL. */
export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
