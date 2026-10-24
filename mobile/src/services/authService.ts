import api from './api';
import Storage from './storage';
import { AuthUser, LoginResponse } from '../types/auth';

export const AuthService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const res = await api.post<LoginResponse>('/auth/login', {
      email: email.trim(),
      password,
      remember_me: true,
    });

    if (res.access_token) {
      await Storage.setItem('unisphere_token', res.access_token);
      if (res.user) {
        await Storage.setItem('unisphere_user', JSON.stringify(res.user));
        await Storage.setItem('unisphere_role', res.user.role);
      }
    }
    return res;
  },

  async getStoredToken(): Promise<string | null> {
    return Storage.getItem('unisphere_token');
  },

  async getStoredUser(): Promise<AuthUser | null> {
    const raw = await Storage.getItem('unisphere_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  async getStoredRole(): Promise<string | null> {
    return Storage.getItem('unisphere_role');
  },

  async setDevRole(role: string): Promise<void> {
    await Storage.setItem('unisphere_role', role);
  },

  async logout(): Promise<void> {
    await Storage.removeItem('unisphere_token');
    await Storage.removeItem('unisphere_user');
    await Storage.removeItem('unisphere_role');
  },
};

export default AuthService;
