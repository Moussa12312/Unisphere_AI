import api from '@/lib/api';

export const universityService = {
  getInfo: async () => {
    const response = await api.get(`/api/v1/settings/university/profile?t=${Date.now()}`);
    return response.data;
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
    const response = await api.get('/api/v1/university/card-config');
    return response.data;
  },

  updateCardConfig: async (config: any) => {
    const response = await api.put('/api/v1/settings/university/card-config', config);
    return response.data;
  }
};