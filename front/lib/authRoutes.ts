export const ROLE_DASHBOARD_ROUTES: Record<string, string> = {
  admin: '/admin/dashboard',
  secretary: '/secretary/dashboard',
  censeur: '/censeur/dashboard',
  teacher: '/teacher/dashboard',
  student: '/student/dashboard',
  accountant: '/accountant/dashboard',
  guard: '/guard/dashboard',
};

export function getDashboardRoute(role: string): string {
  return ROLE_DASHBOARD_ROUTES[role] || '/login';
}
