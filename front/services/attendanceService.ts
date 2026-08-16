import api from '@/lib/api';

export interface Attendance {
  id: number;
  student_id: number;
  student_name: string;
  matricule: string;
  level: string;
  class_name: string;
  status: string;
  method: string;
  scan_time: string | null;
  date: string | null;
  scanned_by: string | null;
}

export interface AttendanceStats {
  attendance_rate: number;
  total_students: number;
  total_present: number;
  total_absent: number;
  by_level: Array<{
    level: string;
    total: number;
    present: number;
    rate: number;
  }>;
  trends: {
    best_day: string;
    worst_day: string;
    weekly_avg: number;
    avg_late: number;
  };
}

export const attendanceService = {
  getHistory: async (params?: {
    start_date?: string;
    end_date?: string;
    student_id?: number;
    limit?: number;
  }): Promise<Attendance[]> => {
    const response = await api.get('/api/v1/attendance/history', { params });
    return Array.isArray(response.data) ? response.data : [];
  },

  getStatistics: async (period: string = 'week'): Promise<AttendanceStats> => {
    const response = await api.get('/api/v1/attendance/statistics', {
      params: { period }
    });
    return response.data;
  },

  getTodayStats: async (): Promise<any> => {
    const response = await api.get('/api/v1/attendance/today/stats');
    return response.data;
  },

  getRecentScans: async (limit: number = 5): Promise<Attendance[]> => {
    const response = await api.get('/api/v1/attendance/recent', {
      params: { limit }
    });
    return Array.isArray(response.data) ? response.data : [];
  },

  scanQR: async (matricule: string): Promise<any> => {
    const response = await api.post('/api/v1/attendance/scan', { matricule });
    return response.data;
  },

  updateStatus: async (attendanceId: number, status: string): Promise<any> => {
    const response = await api.put(`/api/v1/attendance/${attendanceId}/status`, { status });
    return response.data;
  },

  getConfig: async (): Promise<any> => {
    const response = await api.get('/api/v1/attendance/config');
    return response.data;
  },

  updateConfig: async (lateThreshold: string): Promise<any> => {
    const response = await api.put('/api/v1/attendance/config', {
      late_threshold: lateThreshold
    });
    return response.data;
  }
};

export default attendanceService;