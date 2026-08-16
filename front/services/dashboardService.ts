import api from '@/lib/api';

export const dashboardService = {
  getStats: async () => {
    const response = await api.get('/api/v1/dashboard/stats');
    return response.data;
  }
};