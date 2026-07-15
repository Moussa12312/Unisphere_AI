import api from '@/lib/api';

export const statisticsService = {
  // Vue d'ensemble (KPIs)
  getOverview: async (period: string = 'year') => {
    const response = await api.get(`/api/v1/statistics/overview?period=${period}`);
    return response.data;
  },

  // Inscriptions par mois
  getMonthlyInscriptions: async (months: number = 6) => {
    const response = await api.get(`/api/v1/statistics/inscriptions/monthly?months=${months}`);
    return response.data;
  },

  // Répartition par filière
  getFiliereDistribution: async () => {
    const response = await api.get('/api/v1/statistics/filieres/distribution');
    return response.data;
  },

  // Performance par niveau
  getPerformanceByLevel: async () => {
    const response = await api.get('/api/v1/statistics/performance/by-level');
    return response.data;
  },

  // Revenus mensuels
  getMonthlyRevenue: async (months: number = 6) => {
    const response = await api.get(`/api/v1/statistics/revenue/monthly?months=${months}`);
    return response.data;
  },

  // Assiduité mensuelle
  getMonthlyAttendance: async (months: number = 6) => {
    const response = await api.get(`/api/v1/statistics/attendance/monthly?months=${months}`);
    return response.data;
  }
};