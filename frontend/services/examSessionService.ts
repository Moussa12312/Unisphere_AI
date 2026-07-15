import api from '@/lib/api';

export interface ExamSession {
  id: number;
  name: string;
  session_type: string;
  start_date: string;
  end_date: string;
  status: string;
  description: string | null;
  university_id: number;
}

export const examSessionService = {
  getAll: async (): Promise<ExamSession[]> => {
    try {
      const response = await api.get('/api/v1/exam-sessions/');
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Erreur chargement sessions:', error);
      return [];
    }
  },

  create: async (data: any): Promise<any> => {
    const response = await api.post('/api/v1/exam-sessions/', data);
    return response.data;
  },

  update: async (id: number, data: any): Promise<any> => {
    const response = await api.put(`/api/v1/exam-sessions/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<any> => {
    const response = await api.delete(`/api/v1/exam-sessions/${id}`);
    return response.data;
  }
};

export default examSessionService;