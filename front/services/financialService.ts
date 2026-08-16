import api from '@/lib/api';

export const financialService = {
  // Dashboard
  getOverview: async (period: string = 'year') => {
    const response = await api.get(`/api/v1/financials/overview?period=${period}`);
    return response.data;
  },

  // ✅ MODIFIÉ : Ajout du paramètre period
  getMonthly: async (months: number = 6, period: string = 'year') => {
    const response = await api.get(`/api/v1/financials/monthly?months=${months}&period=${period}`);
    return response.data;
  },

  getTypes: async (period: string = 'year') => {
    const response = await api.get(`/api/v1/financials/types?period=${period}`);
    return response.data;
  },

  // ✅ MODIFIÉ : Ajout du paramètre period
  getTransactions: async (limit: number = 5, period: string = 'year') => {
    const response = await api.get(`/api/v1/financials/transactions?limit=${limit}&period=${period}`);
    return response.data;
  },

  // Stats des reliquats
  getInstallmentsStats: async () => {
    const response = await api.get('/api/v1/financials/installments/stats');
    return response.data;
  },

  // Paiements
  getPayments: async (filters: {
    student_id?: number;
    status?: string;
    payment_type?: string;
    period?: string;
    page?: number;
    limit?: number;
  } = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    const response = await api.get(`/api/v1/financials/payments?${params.toString()}`);
    return response.data;
  },

  payInstallment: async (installmentId: number, data: {
    amount: number;
    payment_method: string;
    description?: string;
  }) => {
    const response = await api.post(`/api/v1/financials/installments/${installmentId}/pay`, data);
    return response.data;
  },


  createPayment: async (data: {
    student_id: number;
    amount: number;
    payment_type: string;
    payment_method: string;
    description?: string;
    academic_year?: string;
  }) => {
    const response = await api.post('/api/v1/financials/payments', data);
    return response.data;
  },

  getPaymentDetail: async (paymentId: number) => {
    const response = await api.get(`/api/v1/financials/payments/${paymentId}`);
    return response.data;
  },

  // Impayés
  getUnpaid: async () => {
    const response = await api.get('/api/v1/financials/unpaid');
    return response.data;
  },

  // Échéances
  getInstallments: async (status?: string) => {
    const params = status ? `?status=${status}` : '';
    const response = await api.get(`/api/v1/financials/installments${params}`);
    return response.data;
  },

  // Historique complet d'un étudiant
  getStudentHistory: async (studentId: number) => {
    const response = await api.get(`/api/v1/financials/student/${studentId}/history`);
    return response.data;
  },

  // Bloquer/débloquer pour examens
  toggleExamBlock: async (studentId: number, block: boolean) => {
    const response = await api.put(`/api/v1/financials/student/${studentId}/exam-block?block=${block}`);
    return response.data;
  },

  // Générer un reçu
  getReceipts: async () => {
    const response = await api.get('/api/v1/students/me/receipts');
    return response.data;
  },

  getReceipt: async (id: number) => {
    const response = await api.get(`/api/v1/students/me/receipts/${id}`);
    return response.data;
  },
};





export default financialService;