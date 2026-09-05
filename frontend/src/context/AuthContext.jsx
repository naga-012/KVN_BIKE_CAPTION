import React, { createContext, useContext, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('kvn_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('kvn_token') || null);
  const [loading, setLoading] = useState(false);

  const saveAuth = (tokenData, userData) => {
    localStorage.setItem('kvn_token', tokenData);
    localStorage.setItem('kvn_user', JSON.stringify(userData));
    setToken(tokenData);
    setUser(userData);
  };

  const login = async (identifier, password) => {
    setLoading(true);
    try {
      const data = await api.post('/auth/login', { identifier, password });
      saveAuth(data.token, data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const loginWithOtp = async (phone, otp, name = '') => {
    setLoading(true);
    try {
      const data = await api.post('/auth/verify-otp', { phone, otp, name });
      saveAuth(data.token, data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const register = async (form) => {
    setLoading(true);
    try {
      const data = await api.post('/auth/register', form);
      saveAuth(data.token, data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('kvn_token');
    localStorage.removeItem('kvn_user');
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        loginWithOtp,
        register,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
