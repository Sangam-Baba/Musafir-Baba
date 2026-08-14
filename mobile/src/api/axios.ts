import axios from 'axios';
import { API_BASE_URL } from '../utils/config';
import { getItem } from '../utils/storage';
import { refreshAccessToken, isRefreshEndpoint } from './tokenRefresh';

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
    const config = error.config;
    if (
      error.response?.status === 401 &&
      config &&
      !config.__retried &&
      !isRefreshEndpoint(config.url || '')
    ) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        config.__retried = true;
        config.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(config);
      }
      // refreshAccessToken already logged the store out on failure
    }
    return Promise.reject(error);
  }
);

