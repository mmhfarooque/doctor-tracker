// Tiny event bridge so the axios layer (outside React) can tell the app a session ended.
export const SESSION_EXPIRED = 'doctor-tracker:session-expired';

export const readStoredSession = () => {
  if (typeof window === 'undefined') return { token: null, user: null };
  try {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return token && user ? { token, user } : { token: null, user: null };
  } catch {
    return { token: null, user: null };
  }
};

export const clearStoredSession = () => {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  } catch {
    // storage unavailable (private mode) — nothing to clear
  }
};
