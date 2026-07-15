import api from '@/lib/api';

export const universityService = {
  getInfo: async () => {
    // ✅ CORRECTION : Appel du bon endpoint + paramètre anti-cache
    const response = await api.get(`/api/v1/settings/university/profile?t=${Date.now()}`);
    return response.data;
  },

  uploadLogo: async (logoFile: File, removeBg: boolean = false) => {
    const formData = new FormData();
    formData.append('logo', logoFile);
    formData.append('remove_bg', removeBg ? 'true' : 'false');
    
    // ✅ CORRECTION : Appel du bon endpoint backend
    const response = await api.post('/api/v1/settings/university/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }
};