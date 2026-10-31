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
  // 🎓 Attestation de scolarité
  generateEnrollmentCertificate: async (studentId: number): Promise<Blob> => {
    const response = await api.get(`/api/v1/documents/generate-enrollment-certificate/${studentId}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // 🏆 Attestation de réussite
  generateAchievementCertificate: async (studentId: number, sessionId?: number): Promise<Blob> => {
    const params = sessionId ? { session_id: sessionId } : {};
    const response = await api.get(`/api/v1/documents/generate-achievement-certificate/${studentId}`, {
      params,
      responseType: 'blob'
    });
    return response.data;
  },

  // 📊 Relevé de notes officiel LMD
  generateTranscript: async (studentId: number): Promise<Blob> => {
    const response = await api.get(`/api/v1/documents/generate-transcript/${studentId}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // ⏱️ Attestation d'assiduité / présence
  generateAttendanceCertificate: async (studentId: number): Promise<Blob> => {
    const response = await api.get(`/api/v1/documents/generate-attendance-certificate/${studentId}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // 🏢 Convention de stage tripartite
  generateInternshipAgreement: async (studentId: number, params?: {
    company_name?: string;
    company_address?: string;
    company_tutor?: string;
    start_date?: string;
    end_date?: string;
    mission_description?: string;
  }): Promise<Blob> => {
    const response = await api.get(`/api/v1/documents/generate-internship-agreement/${studentId}`, {
      params,
      responseType: 'blob'
    });
    return response.data;
  },

  // ✉️ Lettre de recommandation officielle
  generateRecommendationLetter: async (studentId: number, params?: {
    target_entity?: string;
    appreciation?: string;
  }): Promise<Blob> => {
    const response = await api.get(`/api/v1/documents/generate-recommendation-letter/${studentId}`, {
      params,
      responseType: 'blob'
    });
    return response.data;
  },

  // 🏛️ Attestation d'admission
  generateAdmissionLetter: async (studentId: number, params?: {
    specialty?: string;
    academic_year?: string;
  }): Promise<Blob> => {
    const response = await api.get(`/api/v1/documents/generate-admission-letter/${studentId}`, {
      params,
      responseType: 'blob'
    });
    return response.data;
  },

  // 📚 Dépôt de mémoire & autorisation de soutenance
  generateThesisSubmission: async (studentId: number, params?: {
    thesis_title?: string;
    supervisor_name?: string;
    academic_year?: string;
  }): Promise<Blob> => {
    const response = await api.get(`/api/v1/documents/generate-thesis-submission/${studentId}`, {
      params,
      responseType: 'blob'
    });
    return response.data;
  },

  // 🔄 Certificat de transfert / radiation
  generateTransferCertificate: async (studentId: number, params?: {
    target_institution?: string;
    academic_year?: string;
  }): Promise<Blob> => {
    const response = await api.get(`/api/v1/documents/generate-transfer-certificate/${studentId}`, {
      params,
      responseType: 'blob'
    });
    return response.data;
  },

  // 📋 Feuille d'émargement officielle d'examen
  generateExamAttendanceSheet: async (params?: {
    filiere?: string;
    level?: string;
    course_name?: string;
    room_name?: string;
    session_title?: string;
    exam_date?: string;
  }): Promise<Blob> => {
    const response = await api.get(`/api/v1/documents/generate-exam-attendance-sheet`, {
      params,
      responseType: 'blob'
    });
    return response.data;
  },

  // 📩 Convocation individuelle aux examens
  generateExamConvocation: async (studentId: number, params?: {
    session_title?: string;
    academic_year?: string;
  }): Promise<Blob> => {
    const response = await api.get(`/api/v1/documents/generate-exam-convocation/${studentId}`, {
      params,
      responseType: 'blob'
    });
    return response.data;
  },

  // ⚖️ PV de délibération de jury d'examen
  generateJuryDeliberationPV: async (params?: {
    filiere?: string;
    level?: string;
    session_title?: string;
    academic_year?: string;
  }): Promise<Blob> => {
    const response = await api.get(`/api/v1/documents/generate-jury-deliberation-pv`, {
      params,
      responseType: 'blob'
    });
    return response.data;
  },

  // 🚗 Ordre de mission officiel du personnel
  generateMissionOrder: async (params?: {
    staff_name?: string;
    staff_title?: string;
    staff_matricule?: string;
    mission_purpose?: string;
    destination?: string;
    start_date?: string;
    end_date?: string;
    transport_mode?: string;
    budget_charge?: string;
    teacher_id?: number;
  }): Promise<Blob> => {
    const response = await api.get(`/api/v1/documents/generate-mission-order`, {
      params,
      responseType: 'blob'
    });
    return response.data;
  },

  // 👨‍🏫 Attestation de service fait enseignant
  generateServiceCompletion: async (teacherId: number, params?: {
    course_name?: string;
    total_hours?: number;
    academic_year?: string;
    level?: string;
  }): Promise<Blob> => {
    const response = await api.get(`/api/v1/documents/generate-service-completion/${teacherId}`, {
      params,
      responseType: 'blob'
    });
    return response.data;
  },

  // 💰 Quitus financier & Attestation de paiement
  generatePaymentCertificate: async (studentId: number): Promise<Blob> => {
    const response = await api.get(`/api/v1/documents/generate-payment-certificate/${studentId}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  generateFinancialStatement: async (studentId: number): Promise<Blob> => {
    const response = await api.get(`/api/v1/documents/generate-financial-statement/${studentId}`, {
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

  downloadDocument: async (documentId: number): Promise<Blob> => {
    const response = await api.get(`/api/v1/documents/${documentId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  }
};

export default documentService;
