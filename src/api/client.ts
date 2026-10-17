import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

export function getApiBaseUrl(): string {
  const env = (import.meta as any).env || {};
  const envUrl = env.EXPO_PUBLIC_API_URL || env.VITE_API_URL || 'https://api-queuemic.laravel.cloud';
  const cleanUrl = String(envUrl).trim().replace(/\/+$/, '');
  return cleanUrl.endsWith('/api/v1') ? cleanUrl : `${cleanUrl}/api/v1`;
}

export const API_BASE_URL = getApiBaseUrl();
export const API_HOST = API_BASE_URL;

// Base API client configured for Laravel 13 backend
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 20000,
});

// Inject transient bearer session token, version headers, and dynamic baseURL on every outgoing request
apiClient.interceptors.request.use(
  (config) => {
    config.baseURL = getApiBaseUrl();
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      config.headers['X-Session-Token'] = token;
    }

    config.headers['X-App-Version'] = '1.0.0';
    config.headers['X-Platform'] = 'web';

    return config;
  },
  (error) => {
    console.warn('⚠️ [API Request Config Error]:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const status = error?.response?.status;
    const data = error?.response?.data;
    const url = error?.config?.url;
    const msg = data?.message || error.message || 'Unknown network error';

    console.warn(`❌ [API Error ${status || 'NETWORK'}] ${url}:`, {
      message: msg,
      details: data,
      status: status,
      rawError: error,
    });

    const errorPayload = typeof data === 'object' && data !== null ? { ...data, status: status ?? error?.status } : error;
    return Promise.reject(errorPayload);
  }
);
