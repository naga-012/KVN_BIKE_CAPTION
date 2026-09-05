import axios from 'axios';

const getDefaultApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== 'undefined' && window.location.hostname.includes('onrender.com')) {
    return 'https://kvn-backend.onrender.com/api';
  }
  return 'http://localhost:5000/api';
};

const rawApiUrl = getDefaultApiUrl();
const API_BASE_URL = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl.replace(/\/$/, '')}/api`;

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
});

// Attach JWT token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('kvn_captain_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors uniformly
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    let message = error.response?.data?.message || error.response?.data?.detail;
    if (!message) {
      if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
        message = 'Server is waking up (Render free tier takes ~30s). Please retry in a moment!';
      } else if (error.message === 'Network Error') {
        message = 'Unable to reach KVN server. The server may still be spinning up, please retry in a moment.';
      } else {
        message = error.message || 'An unexpected network error occurred';
      }
    }
    return Promise.reject(new Error(message));
  }
);

export default api;
