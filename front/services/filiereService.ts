import api from '@/lib/api';

export const filiereService = {
  // Récupérer toutes les filières
  getAll: async () => {
    const response = await api.get('/api/v1/filieres/');
    return response.data;
  },

  // ✅ NOUVEAU : Récupérer les domaines uniques
  getDomains: async () => {
    const response = await api.get('/api/v1/filieres/meta/domains');
    return response.data.domains; // Retourne directement le tableau
  },

  // Créer une filière
  create: async (data: { domain: string; name: string; levels: string }) => {
    const response = await api.post('/api/v1/filieres/', data);
    return response.data;
  },

  // Mettre à jour une filière
  update: async (id: number, data: any) => {
    const response = await api.put(`/api/v1/filieres/${id}`, data);
    return response.data;
  },

  // Supprimer une filière
  delete: async (id: number) => {
    const response = await api.delete(`/api/v1/filieres/${id}`);
    return response.data;
  }
};

export default filiereService;