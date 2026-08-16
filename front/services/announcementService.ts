import api from '@/lib/api';

export interface Announcement {
  id: number;
  title: string;
  content: string;
  category: string;
  priority: string;
  target_audience: string;
  is_published: boolean;
  published_at: string | null;
  expires_at: string | null;
  event_date: string | null;
  created_at: string;
  created_by: number | null;
  university_id: number;
}

export const announcementService = {
  getAll: async (): Promise<Announcement[]> => {
    try {
      const response = await api.get('/api/v1/announcements/');
      // Gérer les deux formats possibles
      if (Array.isArray(response.data)) {
        return response.data;
      }
      if (response.data?.data && Array.isArray(response.data.data)) {
        return response.data.data;
      }
      return [];
    } catch (error) {
      console.error('Erreur chargement annonces:', error);
      return [];
    }
  },

  create: async (data: any): Promise<any> => {
    const response = await api.post('/api/v1/announcements/', data);
    return response.data;
  },

  update: async (id: number, data: any): Promise<any> => {
    const response = await api.put(`/api/v1/announcements/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<any> => {
    const response = await api.delete(`/api/v1/announcements/${id}`);
    return response.data;
  }
};

export default announcementService;