import api from '@/lib/api';

export const universityService = {
  getInfo: async () => {
    // Si on est dans l'espace superadmin ou avec le rôle superadmin, retourner directement l'identité SaaS
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const role = localStorage.getItem('role');
      if (path.startsWith('/superadmin') || role === 'super_admin' || role === 'superadmin') {
        return {
          id: 0,
          name: 'UniSphere AI',
          logo: null,
          slogan: 'Administration SaaS',
          theme: 'dark-navy',
          primary_color: '#FF6B00'
        };
      }
    }

    try {
      const response = await api.get(`/api/v1/settings/university/profile?t=${Date.now()}`);
      return response.data;
    } catch (err) {
      return {
        id: 0,
        name: 'UniSphere AI',
        logo: null,
        slogan: 'Plateforme Intelligente Universitaire',
        theme: 'light-orange',
        primary_color: '#FF6B00'
      };
    }
  },

  uploadLogo: async (logoFile: File, removeBg: boolean = false) => {
    const formData = new FormData();
    formData.append('logo', logoFile);
    formData.append('remove_bg', removeBg ? 'true' : 'false');
    
    const response = await api.post('/api/v1/settings/university/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  getCardConfig: async () => {
    const response = await api.get('/api/v1/settings/university/card-config');
    return response.data;
  },

  updateCardConfig: async (config: any) => {
    const response = await api.put('/api/v1/settings/university/card-config', config);
    return response.data;
  }
};