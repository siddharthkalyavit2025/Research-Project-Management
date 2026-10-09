import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi, getStoredToken, setStoredToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const data = await authApi.me();
      setUser(data);
    } catch (err) {
      console.warn('Failed to fetch current user profile:', err);
      setStoredToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();

    const handleExpired = () => {
      setUser(null);
    };
    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, []);

  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    setStoredToken(res.access_token);
    setUser(res.user);
    return res.user;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      setStoredToken(null);
      setUser(null);
    }
  };

  const hasRole = (allowedRoles) => {
    if (!user) return false;
    if (typeof allowedRoles === 'string') return user.role === allowedRoles;
    return allowedRoles.includes(user.role);
  };

  const isAdmin = user?.role === 'Admin';
  const isLabManager = user?.role === 'Lab Manager';
  const isResearcher = user?.role === 'Researcher';
  const canManage = isAdmin || isLabManager;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
        hasRole,
        isAdmin,
        isLabManager,
        isResearcher,
        canManage,
        refetchUser: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
