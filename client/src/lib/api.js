import axios from 'axios';
import { SESSION_EXPIRED, clearStoredSession } from './session';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});

// Attach the JWT to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    try {
      const token = localStorage.getItem('token');
      if (token && token.split('.').length === 3) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // storage unavailable — request goes out unauthenticated and the API answers 401
    }
  }
  return config;
});

// An expired or revoked token ends the session; AuthContext listens and routes to /login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginCall = error.config?.url?.includes('/auth/login');
    if (typeof window !== 'undefined' && error.response?.status === 401 && !isLoginCall) {
      clearStoredSession();
      window.dispatchEvent(new Event(SESSION_EXPIRED));
    }
    return Promise.reject(error);
  },
);

export default api;
