import api from '@/lib/api';
import { getDashboardRoute } from '@/lib/authRoutes';
import { getApiErrorMessage } from '@/lib/errorHandler';
import { LoginResponse, RegisterPayload, User } from '@/types/auth';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';
const REMEMBER_EMAIL_KEY = 'remembered_email';

export const authService = {
  login: async (email: string, password: string, rememberMe = false): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/api/v1/auth/login', {
      email: email.trim().toLowerCase(),
      password,
      remember_me: rememberMe,
    });
    return response.data;
  },

  register: async (payload: RegisterPayload) => {
    const formData = new FormData();
    formData.append('university_name', payload.university_name.trim());
    formData.append('country', payload.country);
    formData.append('university_email', payload.university_email.trim().toLowerCase());
    formData.append('admin_full_name', payload.admin_full_name.trim());
    formData.append('admin_email', payload.admin_email.trim().toLowerCase());
    formData.append('admin_phone', payload.admin_phone.trim());
    formData.append('admin_password', payload.admin_password);
    formData.append('logo', payload.logo);

    const response = await api.post('/api/v1/auth/register', formData);
    return response.data;
  },

  saveAuth: (token: string, user: User, rememberEmail?: string) => {
    if (typeof window === 'undefined') return;

    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem('role', user.role);

    if (rememberEmail) {
      localStorage.setItem(REMEMBER_EMAIL_KEY, rememberEmail);
    } else {
      localStorage.removeItem(REMEMBER_EMAIL_KEY);
    }
  },

  getRememberedEmail: (): string => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(REMEMBER_EMAIL_KEY) || '';
  },

  logout: () => {
    if (typeof window === 'undefined') return;

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('role');
    localStorage.removeItem('university');
    window.location.href = '/login';
  },

  isAuthenticated: (): boolean => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem(TOKEN_KEY);
  },

  getCurrentUser: (): User | null => {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem(USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  },

  getDashboardRoute: (role: string) => getDashboardRoute(role),

  generateNotifications: async () => {
    await api.post('/api/v1/notifications/generate');
  },

  parseError: (error: unknown, fallback: string) => getApiErrorMessage(error, fallback),
};

export default authService;
