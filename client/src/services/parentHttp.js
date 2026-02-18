import axios from 'axios';
import { toast } from 'react-toastify';
import { clearParentToken, getParentToken } from '../utils/parentAuth';

// Prefer same-origin (CRA proxy in dev, same host in prod). Override via REACT_APP_API_BASE_URL if needed.
const baseURL = process.env.REACT_APP_API_BASE_URL || '';

export const parentApi = axios.create({
  baseURL,
  withCredentials: true,
});

parentApi.interceptors.request.use(
  (config) => {
    const token = getParentToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

parentApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || '';
    const isParentAuthEndpoint =
      requestUrl.includes('/api/parent/login') ||
      requestUrl.includes('/api/parent/verify') ||
      requestUrl.includes('/api/parent/forgot-password') ||
      requestUrl.includes('/api/parent/reset-password');

    if (status === 401 && !isParentAuthEndpoint) {
      clearParentToken();
      toast.warning('Your parent session has expired. Please login again.');
      window.location.href = '/parent/login';
    }
    return Promise.reject(error);
  }
);

export default parentApi;
