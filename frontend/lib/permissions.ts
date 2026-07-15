export type Role = 'admin' | 'teacher' | 'censeur' | 'secretary' | 'accountant' | 'guard' | 'student';

export interface MenuItem {
  label: string;
  href: string;
  icon: string;
  permission: string;
}

export interface MenuSection {
  title: string;
  color: string;
  items: MenuItem[];
}

export const MENU_BY_ROLE: Record<Role, MenuSection[]> = {
  admin: [
    {
      title: 'ACADÉMIQUE',
      color: 'blue',
      items: [
        { label: 'Étudiants', href: '/admin/students', icon: 'Users', permission: 'student:list' },
        { label: 'Enseignants', href: '/admin/teachers', icon: 'GraduationCap', permission: 'teacher:list' },
        { label: 'Censeurs', href: '/admin/censors', icon: 'UserCheck', permission: 'censor:read' },
        { label: 'Cours', href: '/admin/courses', icon: 'BookOpen', permission: 'course:read' },
        { label: 'Notes', href: '/admin/grades', icon: 'FileText', permission: 'grade:read' },
        { label: 'Présences', href: '/admin/attendance', icon: 'Calendar', permission: 'attendance:read' },
        { label: 'Emploi du temps', href: '/admin/schedule', icon: 'CalendarClock', permission: 'course:read' },
      ]
    },
    {
      title: 'ADMINISTRATION',
      color: 'orange',
      items: [
        { label: 'Secrétariat', href: '/admin/secretariat', icon: 'Briefcase', permission: 'secretary:read' },
        { label: 'Comptables', href: '/admin/accountants', icon: 'Calculator', permission: 'accountant:read' },
        { label: 'Gardiens', href: '/admin/guards', icon: 'Shield', permission: 'guard:read' },
        { label: 'Paiements', href: '/admin/payments', icon: 'CreditCard', permission: 'payment:read' },
        { label: 'Documents', href: '/admin/documents', icon: 'FileText', permission: 'document:read' },
        { label: 'Annonces', href: '/admin/announcements', icon: 'Bell', permission: 'announcement:create' },
      ]
    },
    {
      title: 'PILOTAGE',
      color: 'purple',
      items: [
        { label: 'Rapports', href: '/admin/reports', icon: 'BarChart3', permission: 'report:read' },
        { label: 'Assistant IA', href: '/admin/ai', icon: 'Bot', permission: 'ai:access' },
      ]
    },
    {
      title: 'SYSTÈME',
      color: 'gray',
      items: [
        { label: 'Comptes', href: '/admin/accounts', icon: 'Users', permission: 'user:manage' },
        { label: 'Rôles & Permissions', href: '/admin/roles', icon: 'Lock', permission: 'role:manage' },
        { label: 'Paramètres', href: '/admin/settings', icon: 'Settings', permission: 'university:config' },
      ]
    }
  ],
  
  teacher: [
    {
      title: 'ACADÉMIQUE',
      color: 'blue',
      items: [
        { label: 'Mes cours', href: '/teacher/courses', icon: 'BookOpen', permission: 'course:read' },
        { label: 'Mes étudiants', href: '/teacher/students', icon: 'Users', permission: 'student:list' },
        { label: 'Notes', href: '/teacher/grades', icon: 'FileText', permission: 'grade:create' },
        { label: 'Présences', href: '/teacher/attendance', icon: 'Calendar', permission: 'attendance:create' },
        { label: 'Emploi du temps', href: '/teacher/schedule', icon: 'CalendarClock', permission: 'course:read' },
      ]
    },
    {
      title: 'DOCUMENTS',
      color: 'orange',
      items: [
        { label: 'Supports de cours', href: '/teacher/documents', icon: 'FileText', permission: 'document:read' },
      ]
    },
    {
      title: 'IA',
      color: 'purple',
      items: [
        { label: 'Assistant pédagogique', href: '/teacher/ai', icon: 'Bot', permission: 'ai:access' },
      ]
    }
  ],
  
  student: [
    {
      title: 'ACADÉMIQUE',
      color: 'blue',
      items: [
        { label: 'Mes cours', href: '/student/courses', icon: 'BookOpen', permission: 'course:read' },
        { label: 'Mes notes', href: '/student/grades', icon: 'FileText', permission: 'grade:read' },
        { label: 'Mes présences', href: '/student/attendance', icon: 'Calendar', permission: 'attendance:read' },
        { label: 'Mon emploi du temps', href: '/student/schedule', icon: 'CalendarClock', permission: 'course:read' },
      ]
    },
    {
      title: 'DOCUMENTS',
      color: 'orange',
      items: [
        { label: 'Mes documents', href: '/student/documents', icon: 'FileText', permission: 'document:read' },
        { label: 'Carte étudiante', href: '/student/card', icon: 'CreditCard', permission: 'document:read' },
        { label: 'Bulletin', href: '/student/transcript', icon: 'FileText', permission: 'document:read' },
      ]
    },
    {
      title: 'FINANCE',
      color: 'green',
      items: [
        { label: 'Mes paiements', href: '/student/payments', icon: 'CreditCard', permission: 'payment:read' },
      ]
    }
  ],
  
  // ... autres rôles à compléter de la même façon
};

export function getUserMenu(role: Role): MenuSection[] {
  return MENU_BY_ROLE[role] || [];
}

export function hasPermission(userPermissions: string[], required: string): boolean {
  return userPermissions.includes(required);
}