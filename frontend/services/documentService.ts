import api from '@/lib/api';

export interface Document {
  id: number;
  document_type: string;
  title: string;
  description: string | null;
  file_path: string | null;
  student_id: number | null;
  generated_by: number | null;
  created_at: string;
  download_count: number;
}

export const documentService = {
  generateEnrollmentCertificate: async (studentId: number): Promise<Blob> => {
    const response = await api.get(`/api/v1/documents/generate-enrollment-certificate/${studentId}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  generateTranscript: async (studentId: number, sessionId?: number): Promise<Blob> => {
    const params = sessionId ? { session_id: sessionId } : {};
    const response = await api.get(`/api/v1/documents/generate-transcript/${studentId}`, {
      params,
      responseType: 'blob'
    });
    return response.data;
  },

  uploadCourseMaterial: async (formData: FormData): Promise<any> => {
    const response = await api.post('/api/v1/documents/upload-course-material', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  getMyDocuments: async (): Promise<Document[]> => {
    const response = await api.get('/api/v1/documents/my-documents');
    return Array.isArray(response.data) ? response.data : [];
  },

  // ✅ NOUVEAU : Télécharger un document par ID
  downloadDocument: async (documentId: number): Promise<Blob> => {
    const response = await api.get(`/api/v1/documents/${documentId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  }
};

export default documentService;