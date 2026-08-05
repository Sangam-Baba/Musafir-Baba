import axios from 'axios';
import { API_BASE_URL } from '../utils/config';
import { getItem, removeItem } from '../utils/storage';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await getItem('partner_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      await removeItem('partner_token');
      // Dispatch custom event or handle store update directly from UI layer
    }
    return Promise.reject(error);
  }
);

