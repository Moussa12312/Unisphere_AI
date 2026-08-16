import api from '@/lib/api';

export interface DeliberationRule {
  id: number;
  name: string;
  filiere?: string;
  level?: string;
  min_average: number;
  max_failed_courses: number;
  catchup_min_average: number;
}

export interface DeliberationSession {
  id: number;
  title: string;
  filiere: string;
  level: string;
  academic_year: string;
  session_date?: string;
  status: 'draft' | 'in_progress' | 'completed';
  jury_members?: string;
  rule_id?: number;
  decisions_count: number;
  created_at?: string;
}

export interface DecisionProposal {
  student_id: number;
  student_name: string;
  matricule: string;
  average: number;
  failed_courses_count: number;
  proposed_decision: string;
  final_decision: string | null;
  decision_id: number | null;
}

export const deliberationService = {
  // Règles
  getRules: async (): Promise<DeliberationRule[]> => {
    const response = await api.get('/api/v1/deliberations/rules');
    return response.data;
  },
  createRule: async (data: Partial<DeliberationRule>) => {
    const response = await api.post('/api/v1/deliberations/rules', data);
    return response.data;
  },
  updateRule: async (id: number, data: Partial<DeliberationRule>) => {
    const response = await api.put(`/api/v1/deliberations/rules/${id}`, data);
    return response.data;
  },
  deleteRule: async (id: number) => {
    const response = await api.delete(`/api/v1/deliberations/rules/${id}`);
    return response.data;
  },

  // Sessions
  getSessions: async (): Promise<DeliberationSession[]> => {
    const response = await api.get('/api/v1/deliberations/sessions');
    return response.data;
  },
  createSession: async (data: Partial<DeliberationSession>) => {
    const response = await api.post('/api/v1/deliberations/sessions', data);
    return response.data;
  },
  deleteSession: async (id: number) => {
    const response = await api.delete(`/api/v1/deliberations/sessions/${id}`);
    return response.data;
  },
  completeSession: async (id: number) => {
    const response = await api.post(`/api/v1/deliberations/sessions/${id}/complete`);
    return response.data;
  },

  // Décisions
  getProposals: async (sessionId: number): Promise<DecisionProposal[]> => {
    const response = await api.get(`/api/v1/deliberations/sessions/${sessionId}/proposals`);
    return response.data;
  },
  saveDecision: async (sessionId: number, data: {
    student_id: number; average: number; failed_courses_count: number; decision: string; comment?: string;
  }) => {
    const response = await api.post(`/api/v1/deliberations/sessions/${sessionId}/decisions`, data);
    return response.data;
  },

  // Procès-verbaux
  getMinutes: async () => {
    const response = await api.get('/api/v1/deliberations/minutes');
    return response.data;
  },
  getMinuteDetail: async (sessionId: number) => {
    const response = await api.get(`/api/v1/deliberations/minutes/${sessionId}`);
    return response.data;
  },
};
