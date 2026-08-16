import api from '@/lib/api';

export interface StudentStats {
  student_id: number;
  student_name: string;
  average_grade: number | null;
  attendance_rate: number | null;
  attendance_details: {
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
  };
  payment_status: string;
  total_payments: number;
  total_grades: number;
}

export const studentStatsService = {
  getStats: async (studentId: number): Promise<StudentStats> => {
    const response = await api.get(`/api/v1/students/${studentId}/stats`);
    return response.data;
  },

  getMyStats: async (): Promise<StudentStats> => {
    const response = await api.get('/api/v1/students/me/stats');
    return response.data;
  }
};

export default studentStatsService;