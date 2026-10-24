import api from '@/lib/api';

export interface Room {
  id: number;
  name: string;
  building: string | null;
  capacity: number | null;
  room_type: string;
  is_available: boolean;
  display_name: string;
}

export const roomService = {
  getAll: async (): Promise<Room[]> => {
    try {
      const response = await api.get('/api/v1/rooms/');
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Erreur chargement des salles:', error);
      return [];
    }
  },

  create: async (data: {
    name: string;
    building?: string | null;
    capacity?: number | null;
    room_type?: string;
  }): Promise<Room> => {
    const response = await api.post('/api/v1/rooms/', data);
    return response.data;
  },

  delete: async (id: number): Promise<any> => {
    const response = await api.delete(`/api/v1/rooms/${id}`);
    return response.data;
  }
};

export default roomService;
