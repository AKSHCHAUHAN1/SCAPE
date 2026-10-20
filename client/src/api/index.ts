import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Configured Axios instance for all SCAPE API calls.
 *
 * Features:
 * - Base URL from environment
 * - JSON content type
 * - Request/response interceptors for auth token injection & refresh
 * - Correlation ID generation for request tracing
 */
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send HttpOnly refresh token cookie
});

let refreshInFlight: Promise<string> | null = null;

// Request interceptor: attach access token
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState?.()?.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401 → token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthRequest = typeof originalRequest?.url === 'string' &&
      ['/auth/login', '/auth/register', '/auth/refresh'].some((path) => originalRequest.url?.endsWith(path));

    if (error.response?.status === 401 && !originalRequest?._retry && !isAuthRequest) {
      originalRequest._retry = true;

      try {
        if (!refreshInFlight) {
          refreshInFlight = axios
            .post<{ accessToken: string }>(`${API_URL}/auth/refresh`, {}, { withCredentials: true })
            .then(({ data }) => data.accessToken)
            .finally(() => {
              refreshInFlight = null;
            });
        }
        const accessToken = await refreshInFlight;
        useAuthStore.getState?.()?.setAccessToken(accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch {
        useAuthStore.getState?.()?.logout();
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

// Lazy import to avoid circular dependency
import { useAuthStore } from '@/store/authStore';

export default apiClient;
export { authApi } from './auth.js';
export { servicesApi } from './services.js';
export { templatesApi } from './templates.js';
export { deploymentsApi } from './deployments.js';
export { costsApi } from './costs.js';
export { auditApi } from './audit.js';
export { teamsApi } from './teams.js';

