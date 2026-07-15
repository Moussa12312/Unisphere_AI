import api from '@/lib/api';

export interface GradeEntry {
  student_id: number;
  student_name: string;
  matricule: string;
  cc_score: number | null;
  exam_score: number | null;
  score: number | null;
  status: string;
  comment: string | null;
  grade_id: number | null;
}

export interface GradeContext {
  course: {
    id: number;
    title: string;
    code: string;
    level: string;
    department: string;
  };
  students: GradeEntry[];
}

export interface GradeStats {
  total_students: number;
  graded_students: number;
  average: number;
  min: number;
  max: number;
  pass_rate: number;
  distribution: {
    "0-5": number;
    "5-10": number;
    "10-15": number;
    "15-20": number;
  };
}

export const gradeService = {
  // ✅ Récupérer les notes avec CC + Examen
  getByContext: async (sessionId: number, courseId: number): Promise<GradeContext> => {
    const response = await api.get('/api/v1/grades/by-context', {
      params: { session_id: sessionId, course_id: courseId }
    });
    return response.data;
  },

  // ✅ Sauvegarder avec CC + Examen
  bulkSave: async (data: {
    session_id: number;
    course_id: number;
    grades: Array<{ 
      student_id: number; 
      cc_score?: number | null; 
      exam_score?: number | null;
      score?: number | null;
      comment?: string 
    }>;
    status: string;
    cc_coefficient?: number;
    exam_coefficient?: number;
  }): Promise<any> => {
    const response = await api.post('/api/v1/grades/bulk', data);
    return response.data;
  },

  getStats: async (sessionId: number, courseId: number): Promise<GradeStats> => {
    const response = await api.get('/api/v1/grades/stats', {
      params: { session_id: sessionId, course_id: courseId }
    });
    return response.data;
  },

  getSessionsWithStats: async (courseId: number): Promise<any[]> => {
    const response = await api.get(`/api/v1/grades/sessions-with-stats/${courseId}`);
    return Array.isArray(response.data) ? response.data : [];
  }
};

export default gradeService;