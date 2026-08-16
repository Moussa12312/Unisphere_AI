import api from '@/lib/api';

export interface Course {
  id: number;
  title: string;
  code: string;
  department: string;
  level: string;
  credits: number;
  hours: number;
  teacher_id: number | null;
  teacher_name: string;
  filiere_id?: number;
}

export interface CourseHistory {
  id: number;
  action: string;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  user_name: string;
  created_at: string;
}

export const courseService = {
  getAll: async (): Promise<Course[]> => {
    try {
      const response = await api.get('/api/v1/courses/');
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Erreur chargement cours:', error);
      return [];
    }
  },

  getById: async (id: number): Promise<Course> => {
    const response = await api.get(`/api/v1/courses/${id}`);
    return response.data;
  },

  create: async (data: any): Promise<any> => {
    const response = await api.post('/api/v1/courses/', data);
    return response.data;
  },

  update: async (id: number, data: any): Promise<any> => {
    const response = await api.put(`/api/v1/courses/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<any> => {
    const response = await api.delete(`/api/v1/courses/${id}`);
    return response.data;
  },

  getHistory: async (id: number): Promise<CourseHistory[]> => {
    try {
      const response = await api.get(`/api/v1/courses/${id}/history`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Erreur chargement historique:', error);
      return [];
    }
  }
};

export default courseService;