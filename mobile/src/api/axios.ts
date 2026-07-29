import axios from 'axios';
import { ENV } from '../config/env';
import { getItem, removeItem } from '../utils/storage';

export const apiClient = axios.create({
  baseURL: ENV.API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getItem('partner_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      removeItem('partner_token');
      // Dispatch custom event or handle store update directly from UI layer
    }
    return Promise.reject(error);
  }
);
