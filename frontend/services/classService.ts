import api from '@/lib/api';

export interface ClassRoom {
  id: number;
  name: string;
  filiere_id: number | null;
  filiere_name: string;
  level: string;
  room: string | null;
  building: string | null;
  capacity: number | null;
  academic_year: string;
  main_teacher_id: number | null;
  main_teacher_name: string;
  university_id: number;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  category: string;
  priority: string;
  target_audience: string;
  is_published: boolean;
  published_at: string;
  expires_at: string | null;
  event_date: string | null;
  university_id: number;
  created_by: number | null;
}

export const classService = {
  // ✅ CLASSES
  getAll: async (): Promise<ClassRoom[]> => {
    try {
      const response = await api.get('/api/v1/classes/');
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Erreur chargement classes:', error);
      return [];
    }
  },

  getById: async (id: number): Promise<ClassRoom> => {
    const response = await api.get(`/api/v1/classes/${id}`);
    return response.data;
  },

  create: async (data: any): Promise<any> => {
    const response = await api.post('/api/v1/classes/', data);
    return response.data;
  },

  update: async (id: number, data: any): Promise<any> => {
    const response = await api.put(`/api/v1/classes/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<any> => {
    const response = await api.delete(`/api/v1/classes/${id}`);
    return response.data;
  },

  // ✅ ANNONCES (utilise /api/v1/announcements/)
  getAnnouncements: async (): Promise<Announcement[]> => {
    try {
      const response = await api.get('/api/v1/announcements/');
      // L'API renvoie {data: [...], total, page, ...}
      if (response.data?.data && Array.isArray(response.data.data)) {
        return response.data.data;
      }
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Erreur chargement annonces:', error);
      return [];
    }
  },

  createAnnouncement: async (data: any): Promise<any> => {
    const response = await api.post('/api/v1/announcements/', data);
    return response.data;
  },

  deleteAnnouncement: async (id: number): Promise<any> => {
    const response = await api.delete(`/api/v1/announcements/${id}`);
    return response.data;
  }
};

export default classService;