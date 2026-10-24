import api from '@/lib/api';

export const academicFeeService = {
  // ✅ Récupérer tous les frais académiques
  getFees: async (academicYear?: string) => {
    try {
      const params = academicYear ? `?academic_year=${academicYear}` : '';
      const response = await api.get(`/api/v1/academic-fees/${params}`);
      
      if (Array.isArray(response.data)) return response.data;
      if (response.data?.data && Array.isArray(response.data.data)) return response.data.data;
      return [];
    } catch (error) {
      console.error('Erreur chargement frais:', error);
      return [];
    }
  },

  // ✅ Récupérer tous les deadlines
  getDeadlines: async (academicYear?: string) => {
    try {
      const params = academicYear ? `?academic_year=${academicYear}` : '';
      const response = await api.get(`/api/v1/payment-deadlines/${params}`);
      
      if (Array.isArray(response.data)) return response.data;
      if (response.data?.data && Array.isArray(response.data.data)) return response.data.data;
      return [];
    } catch (error) {
      console.error('Erreur chargement deadlines:', error);
      return [];
    }
  },

  // ✅ Créer ou mettre à jour un deadline
  createOrUpdateDeadline: async (data: any) => {
    try {
      const response = await api.post('/api/v1/payment-deadlines/', data);
      return response.data;
    } catch (error) {
      console.error('Erreur création deadline:', error);
      throw error;
    }
  },

  // ✅ Supprimer un deadline
  deleteDeadline: async (id: number) => {
    try {
      const response = await api.delete(`/api/v1/payment-deadlines/${id}`);
      return response.data;
    } catch (error) {
      console.error('Erreur suppression deadline:', error);
      throw error;
    }
  },

  // ✅ Créer ou mettre à jour un frais académique
  createOrUpdateFee: async (data: any) => {
    try {
      const response = await api.post('/api/v1/academic-fees/', data);
      return response.data;
    } catch (error) {
      console.error('Erreur création frais:', error);
      throw error;
    }
  },

  // ✅ Synchroniser les 3 pôles associés (Gestion & Economie, Communication & Medias, Informatique & Technologies)
  syncDomainGroup: async (data?: { source_domain?: string; target_domains?: string[]; academic_year?: string }) => {
    try {
      const response = await api.post('/api/v1/academic-fees/sync-domains', data || {});
      return response.data;
    } catch (error) {
      console.error('Erreur synchronisation pôles:', error);
      throw error;
    }
  },

  // ✅ Supprimer un frais académique
  deleteFee: async (id: number) => {
    try {
      const response = await api.delete(`/api/v1/academic-fees/${id}`);
      return response.data;
    } catch (error) {
      console.error('Erreur suppression frais:', error);
      throw error;
    }
  },

  // ✅ Tranches de paiement
  getTranches: async (academicYear?: string, level?: string) => {
    try {
      let url = '/api/v1/payment-tranches/?';
      if (academicYear) url += `academic_year=${academicYear}&`;
      if (level) url += `level=${level}&`;
      const response = await api.get(url);
      if (Array.isArray(response.data)) return response.data;
      if (response.data?.data && Array.isArray(response.data.data)) return response.data.data;
      return [];
    } catch (error) {
      console.error('Erreur chargement tranches:', error);
      return [];
    }
  },

  createTranche: async (data: any) => {
    const response = await api.post('/api/v1/payment-tranches/', data);
    return response.data;
  },

  deleteTranche: async (id: number) => {
    const response = await api.delete(`/api/v1/payment-tranches/${id}`);
    return response.data;
  }
};

export default academicFeeService;