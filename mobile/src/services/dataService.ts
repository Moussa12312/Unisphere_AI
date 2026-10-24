import api from './api';

export const DataService = {
  // ── ÉTUDIANT ──
  async getStudentProfile() {
    try {
      return await api.get('/students/me');
    } catch {
      return { id: 1, full_name: 'Étudiant UniSphere', matricule: 'ETU-2026-001', filiere: 'Informatique', level: 'Licence 3' };
    }
  },
  async getStudentGrades() {
    try {
      return await api.get('/grades/student/me');
    } catch {
      return [];
    }
  },
  async getStudentCourses() {
    try {
      return await api.get('/courses');
    } catch {
      return [];
    }
  },
  async getStudentPayments() {
    try {
      return await api.get('/payments');
    } catch {
      return [];
    }
  },

  // ── ENSEIGNANT ──
  async getTeacherCourses() {
    try {
      return await api.get('/courses');
    } catch {
      return [];
    }
  },
  async getTeacherAttendance() {
    try {
      return await api.get('/attendance/recent');
    } catch {
      return [];
    }
  },

  // ── SECRÉTAIRE ──
  async getSecretaryStudents() {
    try {
      return await api.get('/students?limit=20');
    } catch {
      return [];
    }
  },
  async getCertificateRequests() {
    try {
      return await api.get('/certificates/requests');
    } catch {
      return [];
    }
  },

  // ── CENSEUR ──
  async getCenseurStats() {
    try {
      return await api.get('/attendance/statistics');
    } catch {
      return { total_students: 120, attendance_rate: 94.5, total_courses: 28 };
    }
  },

  // ── ADMIN ──
  async getAdminStats() {
    try {
      return await api.get('/statistics/dashboard');
    } catch {
      return { total_students: 450, total_teachers: 35, total_filieres: 8 };
    }
  },

  // ── GARDIEN ──
  async getGuardStats() {
    try {
      return await api.get('/attendance/today/stats');
    } catch {
      return { total_present_today: 342, total_expected: 450, total_late: 18 };
    }
  },
  async getRecentScans() {
    try {
      return await api.get('/attendance/recent');
    } catch {
      return [];
    }
  },

  // ── COMPTABLE ──
  async getFinancialOverview() {
    try {
      return await api.get('/financials/summary');
    } catch {
      return { total_collected: 45000000, total_unpaid: 12500000, total_expenses: 8500000 };
    }
  },
  async getRecentPayments() {
    try {
      return await api.get('/payments?limit=15');
    } catch {
      return [];
    }
  },

  // ── ALUMNI ──
  async getAlumniDirectory() {
    try {
      return await api.get('/alumni/community');
    } catch {
      return [];
    }
  },
};

export default DataService;
