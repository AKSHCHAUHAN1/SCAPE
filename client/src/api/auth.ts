import apiClient from './index.js';
import type { User } from '../types/index.js';

export interface RegisterPayload {
  email: string;
  password: string;
  role?: 'developer' | 'team_lead' | 'devops' | 'admin';
  teamId?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponseData {
  accessToken: string;
  user: User;
}

export const authApi = {
  /**
   * Register a new user account.
   */
  async register(payload: RegisterPayload): Promise<AuthResponseData> {
    const { data } = await apiClient.post<AuthResponseData>('/auth/register', payload);
    return data;
  },

  /**
   * Log in with existing credentials.
   */
  async login(payload: LoginPayload): Promise<AuthResponseData> {
    const { data } = await apiClient.post<AuthResponseData>('/auth/login', payload);
    return data;
  },

  /**
   * Terminate user session and clear refresh cookie.
   */
  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },

  /**
   * Fetch currently authenticated user profile.
   */
  async getMe(): Promise<User> {
    const { data } = await apiClient.get<User>('/users/me');
    return data;
  },
};
