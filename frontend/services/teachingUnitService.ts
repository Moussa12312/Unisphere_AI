import api from '@/lib/api';

export interface TeachingUnitCourse {
  id: number;
  code: string;
  title: string;
  credits: number;
  hours: number;
  teacher_id?: number | null;
  teacher_name?: string | null;
}

export interface TeachingUnit {
  id: number;
  code: string;
  name: string;
  credits: number;
  category: 'Fondamentale' | 'Méthodologique' | 'Transversale' | 'Découverte';
  semester: string;
  level: string;
  description?: string | null;
  filiere_id?: number | null;
  filiere_name?: string | null;
  courses_count: number;
  courses: TeachingUnitCourse[];
}

export interface LMDCurriculumSemester {
  semester: string;
  total_credits: number;
  is_valid_30_ects: boolean;
  units_count: number;
  units: TeachingUnit[];
}

export interface LMDCurriculum {
  filiere: {
    id: number;
    name: string;
    domain: string;
  };
  level: string;
  total_year_credits: number;
  is_valid_60_ects: boolean;
  semesters: Record<string, LMDCurriculumSemester>;
}

export const teachingUnitService = {
  getAll: async (filters?: { filiere_id?: number; level?: string; semester?: string }): Promise<TeachingUnit[]> => {
    try {
      const response = await api.get('/api/v1/teaching-units/', { params: filters });
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Erreur chargement UEs:', error);
      return [];
    }
  },

  getCurriculum: async (filiereId: number, level: string): Promise<LMDCurriculum | null> => {
    try {
      const response = await api.get(`/api/v1/teaching-units/curriculum/${filiereId}/${level}`);
      return response.data;
    } catch (error) {
      console.error('Erreur chargement maquette LMD:', error);
      return null;
    }
  },

  getById: async (id: number): Promise<TeachingUnit> => {
    const response = await api.get(`/api/v1/teaching-units/${id}`);
    return response.data;
  },

  create: async (data: {
    code: string;
    name: string;
    credits?: number;
    category?: string;
    semester?: string;
    level?: string;
    description?: string;
    filiere_id?: number;
    course_ids?: number[];
  }): Promise<TeachingUnit> => {
    const response = await api.post('/api/v1/teaching-units/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<TeachingUnit> & { course_ids?: number[] }): Promise<TeachingUnit> => {
    const response = await api.put(`/api/v1/teaching-units/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete(`/api/v1/teaching-units/${id}`);
    return response.data;
  },

  assignCourses: async (id: number, courseIds: number[]): Promise<any> => {
    const response = await api.post(`/api/v1/teaching-units/${id}/courses`, { course_ids: courseIds });
    return response.data;
  }
};

export default teachingUnitService;
