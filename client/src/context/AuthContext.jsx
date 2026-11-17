'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import api from '../lib/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      }
    } catch (err) {
      console.warn('Storage read error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Route protection redirect
  useEffect(() => {
    if (!loading && typeof window !== 'undefined') {
      const isPublicRoute = pathname === '/login';
      if (!user && !isPublicRoute) {
        window.location.href = '/login';
      } else if (user && isPublicRoute) {
        window.location.href = '/';
      }
    }
  }, [user, loading, pathname]);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.success) {
      const { token: receivedToken, ...userData } = response.data.data;
      try {
        localStorage.setItem('token', receivedToken);
        localStorage.setItem('user', JSON.stringify(userData));
      } catch (err) {
        console.warn('Storage write error:', err);
      }
      setToken(receivedToken);
      setUser(userData);
      window.location.href = '/';
      return { success: true };
    }
    return { success: false, message: response.data.message };
  };

  const logout = () => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch (err) {
      console.warn('Storage remove error:', err);
    }
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
