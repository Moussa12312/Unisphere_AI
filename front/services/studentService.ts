import api from '@/lib/api';
import { Student } from '@/types/student';

export const studentService = {
  getAll: async (): Promise<Student[]> => {
    const response = await api.get('/api/v1/students/');
    return response.data;
  },

  create: async (student: Partial<Student>) => {
    const response = await api.post('/api/v1/students/', student);
    return response.data;
  },

  update: async (id: number, student: Partial<Student>) => {
    const response = await api.put(`/api/v1/students/${id}`, student);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/api/v1/students/${id}`);
    return response.data;
  },

  getById: async (id: number): Promise<Student> => {
    const response = await api.get(`/api/v1/students/${id}`);
    return response.data;
  },

  getMyProfile: async (): Promise<Student> => {
    const response = await api.get('/api/v1/students/me');
    return response.data;
  },

  resetPassword: async (id: number): Promise<{ temp_password: string; message: string }> => {
    const response = await api.post(`/api/v1/students/${id}/reset-password`);
    return response.data;
  },
};

export default studentService;