import api from '@/lib/api';

export interface Material {
  id: number;
  title: string;
  description?: string;
  file_path: string;
  file_type: string;
  file_size: number;
  original_name?: string;
  course_id?: number;
  course_title?: string;
  course_code?: string;
  visibility: string;
  download_count: number;
  created_at: string;
}

export const materialService = {
  getAll: async (courseId?: number): Promise<Material[]> => {
    const params = courseId ? { course_id: courseId } : {};
    const response = await api.get('/api/v1/teacher/materials', { params });
    return Array.isArray(response.data) ? response.data : [];
  },

  upload: async (data: FormData): Promise<any> => {
    const response = await api.post('/api/v1/teacher/materials', data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  delete: async (id: number): Promise<any> => {
    const response = await api.delete(`/api/v1/teacher/materials/${id}`);
    return response.data;
  },

  incrementDownload: async (id: number): Promise<any> => {
    const response = await api.post(`/api/v1/teacher/materials/${id}/download`);
    return response.data;
  }
};

export default materialService;