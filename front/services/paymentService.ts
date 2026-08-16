import api from '@/lib/api';

export const paymentService = {
  getAll: async (params?: { student_id?: number; payment_type?: string; status?: string; page?: number; page_size?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.student_id) queryParams.append('student_id', params.student_id.toString());
    if (params?.payment_type) queryParams.append('payment_type', params.payment_type);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    
    const response = await api.get(`/api/v1/payments/?${queryParams.toString()}`);
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get(`/api/v1/payments/${id}`);
    return response.data;
  },

  create: async (data: {
    student_id: number;
    amount: number;
    currency?: string;
    payment_type: string;
    payment_method: string;
    description?: string;
    payment_date?: string;
  }) => {
    const response = await api.post('/api/v1/payments/', data);
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/api/v1/payments/stats');
    return response.data;
  },

  getReceipt: async (paymentId: number) => {
    const response = await api.get(`/api/v1/payments/${paymentId}/receipt`, {
      responseType: 'blob'
    });
    return response.data;
  }
};

export default paymentService;