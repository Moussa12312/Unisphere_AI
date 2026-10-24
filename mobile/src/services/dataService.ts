import api from './api';

export const DataService = {
  // ── ÉTUDIANT ──
  async getStudentProfile() {
    return await api.get<any>('/students/me');
  },
  async getStudentDashboard() {
    return await api.get<any>('/students/me/dashboard');
  },
  async getStudentGrades() {
    return await api.get<any[]>('/students/me/grades');
  },
  async getStudentCourses() {
    return await api.get<any[]>('/students/me/courses');
  },
  async getStudentCard() {
    return await api.get<any>('/students/me/card');
  },
  async getStudentSchedule() {
    return await api.get<any[]>('/students/me/schedule');
  },
  async getStudentPayments() {
    return await api.get<any>('/students/me/payments');
  },
  async getStudentAttendance() {
    return await api.get<any>('/students/me/attendance');
  },

  // ── ENSEIGNANT ──
  async getTeacherCourses() {
    return await api.get<any[]>('/courses');
  },
  async getTeacherAttendance() {
    return await api.get<any>('/attendance/today/stats');
  },
  async getTeacherRecentScans() {
    return await api.get<any[]>('/attendance/recent');
  },

  // ── SECRÉTAIRE ──
  async getSecretaryStudents(limit = 50) {
    return await api.get<any>(`/students?limit=${limit}`);
  },
  async getSecretaryCertificates() {
    return await api.get<any[]>('/certificates/secretary/requests');
  },
  async getSecretaryRooms() {
    return await api.get<any[]>('/rooms');
  },
  async getSecretaryClasses() {
    return await api.get<any[]>('/classes');
  },

  // ── CENSEUR ──
  async getCenseurStats() {
    return await api.get<any>('/attendance/statistics');
  },
  async getCenseurClasses() {
    return await api.get<any[]>('/classes');
  },
  async getCenseurAnomalies() {
    return await api.get<any>('/grades/anomalies');
  },

  // ── ADMIN ──
  async getAdminStats() {
    return await api.get<any>('/dashboard/stats');
  },
  async getAdminUsers() {
    return await api.get<any[]>('/users?all_roles=true');
  },

  // ── GARDIEN ──
  async getGuardStats() {
    return await api.get<any>('/attendance/today/stats');
  },
  async getRecentScans(limit = 10) {
    return await api.get<any[]>(`/attendance/recent?limit=${limit}`);
  },
  async scanQr(matricule: string) {
    return await api.post<any>('/attendance/scan', { matricule });
  },

  // ── COMPTABLE ──
  async getFinancialOverview() {
    return await api.get<any>('/financials/overview');
  },
  async getRecentPayments(limit = 25) {
    return await api.get<any>(`/payments?limit=${limit}`);
  },

  // ── ALUMNI ──
  async getAlumniCommunity(search = '') {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return await api.get<any[]>(`/alumni/community${query}`);
  },
  async getAlumniProfile() {
    return await api.get<any>('/alumni/me/profile');
  },
  async getAlumniPromotions() {
    return await api.get<any[]>('/alumni/promotions');
  },
};

export default DataService;
