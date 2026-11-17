'use client';

import { createContext, useCallback, useContext, useEffect, useEffectEvent, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import api from '../lib/api';
import useHydrated from '../hooks/useHydrated';
import { SESSION_EXPIRED, clearStoredSession, readStoredSession } from '../lib/session';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Read once on the client; the shell shows a loader until hydrated, so server/client markup still match
  const [session, setSession] = useState(readStoredSession);
  const hydrated = useHydrated();
  const pathname = usePathname();
  const router = useRouter();
  const user = session.user;

  const logout = useCallback(() => {
    clearStoredSession();
    setSession({ token: null, user: null });
    router.replace('/login');
  }, [router]);

  // Confirm the stored token is still valid (it expires after 12h); a 401 triggers SESSION_EXPIRED
  const verifySession = useEffectEvent(() => {
    if (!session.token) return;
    api
      .get('/auth/me')
      .then((res) => setSession((s) => ({ ...s, user: { ...s.user, ...res.data.data } })))
      .catch(() => {});
  });
  useEffect(() => {
    verifySession();
  }, []);

  useEffect(() => {
    const onExpired = () => {
      setSession({ token: null, user: null });
      router.replace('/login');
    };
    window.addEventListener(SESSION_EXPIRED, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED, onExpired);
  }, [router]);

  // Route guard
  useEffect(() => {
    if (!hydrated) return;
    const isPublic = pathname === '/login';
    if (!user && !isPublic) router.replace('/login');
    else if (user && isPublic) router.replace('/');
  }, [hydrated, user, pathname, router]);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (!response.data.success) return { success: false, message: response.data.message };
    const { token, ...userData } = response.data.data;
    try {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch {
      // storage unavailable: the session lasts for this tab only
    }
    setSession({ token, user: userData });
    router.replace('/');
    return { success: true };
  };

  return <AuthContext.Provider value={{ user, hydrated, login, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
