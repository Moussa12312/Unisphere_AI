import api from '@/lib/api';

export const teacherService = {
  // ✅ GET - Liste des enseignants
  getAll: async () => {
    try {
      const response = await api.get('/api/v1/teachers/');
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error("Erreur chargement enseignants:", error);
      return [];
    }
  },

  // ✅ GET - Détail d'un enseignant
  getById: async (id: number) => {
    const response = await api.get(`/api/v1/teachers/${id}`);
    return response.data;
  },

  // ✅ POST - Créer un enseignant (FormData)
  create: async (formData: FormData) => {
    const response = await api.post('/api/v1/teachers/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // ✅ PUT - Modifier un enseignant
  update: async (id: number, data: any) => {
    // ✅ Si c'est un FormData, envoyer en multipart
    if (data instanceof FormData) {
      const response = await api.put(`/api/v1/teachers/${id}`, data, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    }
    // ✅ Sinon, envoyer en JSON
    const response = await api.put(`/api/v1/teachers/${id}`, data);
    return response.data;
  },

  // ✅ DELETE - Supprimer un enseignant
  delete: async (id: number) => {
    const response = await api.delete(`/api/v1/teachers/${id}`);
    return response.data;
  },

  // ✅ POST - Upload photo
  uploadPhoto: async (id: number, photo: File) => {
    const formData = new FormData();
    formData.append('photo', photo);
    
    const response = await api.post(`/api/v1/teachers/upload-photo/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // ✅ POST - Réinitialiser mot de passe
  resetPassword: async (id: number) => {
    const response = await api.post(`/api/v1/teachers/${id}/reset-password`);
    return response.data;
  },

  // ✅ PUT - Changer mot de passe
  updatePassword: async (id: number, password: string) => {
    const response = await api.put(`/api/v1/teachers/${id}/password`, { password });
    return response.data;
  }
};

export default teacherService;