import api from '@/lib/api';

export interface ReportCard {
  id: number;
  student_id: number;
  session_id: number;
  average: number;
  rank: number | null;
  mention: string | null;
  status: string;
  total_credits: number;      // ✅ Crédits totaux
  obtained_credits: number;   // ✅ Crédits obtenus
  generated_at: string;
}

export interface StudentDetail {
  student: {
    id: number;
    first_name: string;
    last_name: string;
    matricule: string;
    filiere: string;
    level: string;
    date_of_birth: string | null;
  };
  session: {
    id: number;
    name: string;
    session_type: string;
  };
  subjects: Array<{
    course_id: number;
    course_code: string;
    course_title: string;
    score: number;
    cc_score: number | null;        // ✅ AJOUTÉ
    exam_score: number | null;      // ✅ AJOUTÉ
    credits: number;                // ✅ AJOUTÉ
    coefficient: number;
    weighted_average: number;
    percentage: number;
    letter_grade: string;
    status: string;
    comment: string | null;
  }>;
  statistics: {
    average: number;
    weighted_average: number;       // ✅ AJOUTÉ (moyenne pondérée)
    mention: string;
    rank: number;
    total_students: number;
    total_coefficients: number;
    total_credits: number;          // ✅ AJOUTÉ
    obtained_credits: number;       // ✅ AJOUTÉ
    total_weighted: number;
  };
}

export const reportCardService = {
  // ✅ Calculer le bulletin avec moyenne pondérée
  calculate: async (studentId: number, sessionId: number): Promise<any> => {
    const response = await api.get(`/api/v1/report-cards/calculate/${studentId}`, {
      params: { session_id: sessionId }
    });
    return response.data;
  },

  // ✅ Récupérer le détail avec CC, Examen et crédits
  getStudentDetail: async (studentId: number, sessionId: number): Promise<StudentDetail> => {
    const response = await api.get(`/api/v1/report-cards/student-detail/${studentId}`, {
      params: { session_id: sessionId }
    });
    return response.data;
  },

  // ✅ Générer le PDF avec toutes les infos
  generatePDF: async (studentId: number, sessionId: number): Promise<Blob> => {
    const response = await api.get(`/api/v1/report-cards/generate-pdf/${studentId}`, {
      params: { session_id: sessionId },
      responseType: 'blob'
    });
    return response.data;
  },

  // ✅ Récupérer tous les bulletins d'un étudiant
  getStudentReportCards: async (studentId: number): Promise<ReportCard[]> => {
    const response = await api.get(`/api/v1/report-cards/student/${studentId}`);
    return Array.isArray(response.data) ? response.data : [];
  }
};

export default reportCardService;