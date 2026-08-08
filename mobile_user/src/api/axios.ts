import axios from 'axios';
import { API_BASE_URL } from '../utils/config';
import { getItem, setItem, removeItem } from '../utils/storage';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // required so the rider_refresh_token cookie is sent/stored
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await getItem('rider_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Access tokens are short-lived (15m). On a 401, try to silently refresh
// using the httpOnly refresh cookie and retry the original request once,
// instead of failing every call once the token expires.
let isRefreshing = false;
let pendingRequests: ((token: string | null) => void)[] = [];

function resolvePendingRequests(token: string | null) {
  pendingRequests.forEach((callback) => callback(token));
  pendingRequests = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthRoute = originalRequest?.url?.includes('/rider/auth/');

    if (error.response?.status !== 401 || isAuthRoute || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingRequests.push((token) => {
          if (!token) return reject(error);
          originalRequest._retry = true;
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(apiClient(originalRequest));
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;
    try {
      const refreshResponse = await axios.post(
        `${API_BASE_URL}/rider/auth/refresh`,
        {},
        { withCredentials: true }
      );
      const newToken = refreshResponse.data.accessToken;
      await setItem('rider_token', newToken);
      resolvePendingRequests(newToken);
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      resolvePendingRequests(null);
      await removeItem('rider_token');
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  }
);
