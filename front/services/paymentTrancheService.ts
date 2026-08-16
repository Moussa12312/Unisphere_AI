import api from '@/lib/api';

export const paymentTrancheService = {
  getAll: async (params?: { level?: string; payment_type?: string; academic_year?: string }) => {
    try {
      const queryParams = new URLSearchParams();
      if (params?.level) queryParams.append('level', params.level);
      if (params?.payment_type) queryParams.append('payment_type', params.payment_type);
      if (params?.academic_year) queryParams.append('academic_year', params.academic_year);

      const response = await api.get(`/api/v1/payment-tranches/?${queryParams.toString()}`);
      return response.data || [];
    } catch (error) {
      console.error('Erreur chargement tranches:', error);
      return [];
    }
  },

  getById: async (id: number) => {
    try {
      const response = await api.get(`/api/v1/payment-tranches/${id}`);
      return response.data;
    } catch (error) {
      console.error('Erreur chargement tranche:', error);
      return null;
    }
  },

  create: async (data: any) => {
    const response = await api.post('/api/v1/payment-tranches/', data);
    return response.data;
  },

  update: async (id: number, data: any) => {
    const response = await api.put(`/api/v1/payment-tranches/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/api/v1/payment-tranches/${id}`);
    return response.data;
  }
};

export default paymentTrancheService;