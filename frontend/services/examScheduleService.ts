import api from '@/lib/api';

export interface ExamScheduleItem {
  id: number;
  session_id: number;
  class_id: number;
  class_name: string;
  level: string;
  course_id: number;
  course_title: string;
  course_code: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  time_slot: string;
  room: string;
  building: string;
  supervisor_id: number | null;
  supervisor_name: string;
  notes: string;
}

export interface ExamMatrixData {
  session: {
    id: number;
    name: string;
    session_type: string;
    start_date: string | null;
    end_date: string | null;
    status: string;
    description: string | null;
  };
  classes: Array<{
    id: number;
    name: string;
    level: string;
    room: string | null;
  }>;
  dates: string[];
  time_slots: string[];
  items: ExamScheduleItem[];
}

export const examScheduleService = {
  getBySession: async (sessionId: number, classId?: number): Promise<ExamScheduleItem[]> => {
    try {
      const url = classId 
        ? `/api/v1/exam-sessions/${sessionId}/schedules?class_id=${classId}`
        : `/api/v1/exam-sessions/${sessionId}/schedules`;
      const response = await api.get(url);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Erreur chargement épreuves examen:', error);
      return [];
    }
  },

  getMatrix: async (sessionId: number): Promise<ExamMatrixData> => {
    const response = await api.get(`/api/v1/exam-sessions/${sessionId}/matrix`);
    return response.data;
  },

  create: async (sessionId: number, data: any): Promise<ExamScheduleItem> => {
    const response = await api.post(`/api/v1/exam-sessions/${sessionId}/schedules`, data);
    return response.data;
  },

  update: async (sessionId: number, scheduleId: number, data: any): Promise<ExamScheduleItem> => {
    const response = await api.put(`/api/v1/exam-sessions/${sessionId}/schedules/${scheduleId}`, data);
    return response.data;
  },

  delete: async (sessionId: number, scheduleId: number): Promise<any> => {
    const response = await api.delete(`/api/v1/exam-sessions/${sessionId}/schedules/${scheduleId}`);
    return response.data;
  }
};

export default examScheduleService;
