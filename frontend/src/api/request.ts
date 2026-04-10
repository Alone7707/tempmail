import axios from 'axios';
import { useAuthStore } from '../stores/auth';

const inferDefaultApiBaseUrl = () => {
  const envBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (envBaseUrl) {
    if (envBaseUrl.startsWith('/')) {
      return envBaseUrl;
    }
    return envBaseUrl.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined' && window.location?.hostname) {
    return `http://${window.location.hostname}:3000/api`;
  }

  return 'http://localhost:3000/api';
};

const request = axios.create({
  baseURL: inferDefaultApiBaseUrl(),
  timeout: 10000,
});

request.interceptors.request.use((config) => {
  const authStore = useAuthStore();
  if (authStore.token) {
    config.headers.Authorization = `Bearer ${authStore.token}`;
  }
  return config;
});

request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error?.response?.status === 401) {
      const authStore = useAuthStore();
      authStore.logout();
    }
    return Promise.reject(error);
  },
);

export default request;
