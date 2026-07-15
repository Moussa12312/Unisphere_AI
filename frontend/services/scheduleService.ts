import api from '@/lib/api';

export interface Schedule {
  id: number;
  course_id: number;
  course_title: string;
  class_id: number;
  class_name: string;
  teacher_id: number;
  teacher_name: string;
  room: string;
  building: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  university_id: number;
}

export const scheduleService = {
  getAll: async (): Promise<Schedule[]> => {
    try {
      const response = await api.get('/api/v1/schedules/');
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Erreur chargement emplois du temps:', error);
      return [];
    }
  },

  create: async (data: any): Promise<any> => {
    const response = await api.post('/api/v1/schedules/', data);
    return response.data;
  },

  update: async (id: number, data: any): Promise<any> => {
    const response = await api.put(`/api/v1/schedules/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<any> => {
    const response = await api.delete(`/api/v1/schedules/${id}`);
    return response.data;
  }
};

export default scheduleService;