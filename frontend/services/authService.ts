import api from '@/lib/api';
import { LoginResponse, User } from '@/types/auth';

export const authService = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await api.post('/api/v1/auth/login', {
      email: email,
      password: password,
      remember_me: false
    });
    return response.data;
  },

  saveAuth: (token: string, user: any) => {
    if (typeof window !== 'undefined') {
      // ✅ CORRIGÉ : Utiliser 'token' au lieu de 'access_token'
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('role', user.role);
    }
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      // ✅ CORRIGÉ : Supprimer 'token' au lieu de 'access_token'
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('role');
      localStorage.removeItem('university');
      window.location.href = '/login';
    }
  },

  isAuthenticated: (): boolean => {
    if (typeof window === 'undefined') return false;
    // ✅ CORRIGÉ : Vérifier 'token' au lieu de 'access_token'
    return !!localStorage.getItem('token');
  },

  getCurrentUser: (): User | null => {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },
};

export default authService;