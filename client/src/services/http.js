import axios from 'axios';
import { toast } from 'react-toastify';

// Prefer same-origin (CRA proxy in dev, same host in prod). Override via REACT_APP_API_BASE_URL if needed.
const baseURL = process.env.REACT_APP_API_BASE_URL || '';

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sms_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || '';
    const isAuthEndpoint =
      requestUrl.includes('/api/auth/login') ||
      requestUrl.includes('/api/auth/register') ||
      requestUrl.includes('/api/auth/verify-otp') ||
      requestUrl.includes('/api/auth/forgot-password') ||
      requestUrl.includes('/api/auth/reset-password');

    if (status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('sms_token');
      localStorage.removeItem('sms_user');

      toast.warning('Your session has expired. Please login again.');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
