'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, GraduationCap, Calendar, QrCode, CreditCard, 
  BookOpen, CheckSquare, Award, Clock, Users, DollarSign, 
  Settings, FileText, PieChart, ShieldCheck, MessageSquare,
  Building2, Receipt, AlertTriangle
} from 'lucide-react';

interface MobileBottomNavProps {
  userRole: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

/**
 * Retourne les onglets mobiles selon le rôle utilisateur (prioritaire)
 * L'URL n'est utilisée qu'en fallback si le rôle est inconnu.
 */
function getNavItemsByRole(role: string): NavItem[] | null {
  const normalized = (role || '').toLowerCase().trim();
  switch (normalized) {
    case 'super_admin':
    case 'superadmin':
      return [
        { label: 'Accueil', href: '/superadmin/dashboard', icon: Home },
        { label: 'Universités', href: '/superadmin/universities', icon: Building2 },
        { label: 'Factures', href: '/superadmin/invoices', icon: Receipt },
        { label: 'Incidents', href: '/superadmin/incidents', icon: AlertTriangle },
        { label: 'Réglages', href: '/superadmin/settings', icon: Settings },
      ];
    case 'student':
    case 'etudiant':
      return [
        { label: 'Accueil', href: '/student/dashboard', icon: Home },
        { label: 'Planning', href: '/student/schedule', icon: Calendar },
        { label: 'Carte QR', href: '/student/card', icon: QrCode },
        { label: 'Notes', href: '/student/grades', icon: Award },
        { label: 'Paiements', href: '/student/payments', icon: CreditCard },
      ];
    case 'teacher':
    case 'enseignant':
    case 'professeur':
      return [
        { label: 'Accueil', href: '/teacher/dashboard', icon: Home },
        { label: 'Mes Cours', href: '/teacher/courses', icon: BookOpen },
        { label: 'Faire Appel', href: '/teacher/attendance', icon: CheckSquare },
        { label: 'Planning', href: '/teacher/schedule', icon: Calendar },
        { label: 'Notes', href: '/teacher/grades', icon: Award },
      ];
    case 'guard':
    case 'gardien':
      return [
        { label: 'Accueil', href: '/guard/dashboard', icon: Home },
        { label: 'Scanner QR', href: '/guard/scanner', icon: QrCode },
        { label: 'Pointage', href: '/guard/attendance', icon: Clock },
        { label: 'Stats', href: '/guard/statistics', icon: ShieldCheck },
      ];
    case 'secretary':
    case 'secretaire':
      return [
        { label: 'Accueil', href: '/secretary/dashboard', icon: Home },
        { label: 'Étudiants', href: '/secretary/students', icon: Users },
        { label: 'Planning', href: '/secretary/schedule', icon: Calendar },
        { label: 'Examens', href: '/secretary/exam-sessions', icon: Award },
        { label: 'Documents', href: '/secretary/documents', icon: FileText },
      ];
    case 'censeur':
    case 'censor':
      return [
        { label: 'Accueil', href: '/censeur/dashboard', icon: Home },
        { label: 'Assiduité', href: '/censeur/attendance', icon: Clock },
        { label: 'Notes', href: '/censeur/grades', icon: Award },
        { label: 'Bulletins', href: '/censeur/bulletins', icon: FileText },
        { label: 'Planning', href: '/censeur/schedule', icon: Calendar },
      ];
    case 'accountant':
    case 'comptable':
      return [
        { label: 'Accueil', href: '/accountant/dashboard', icon: Home },
        { label: 'Paiements', href: '/accountant/payments', icon: CreditCard },
        { label: 'Dépenses', href: '/accountant/expenses', icon: DollarSign },
        { label: 'Reçus', href: '/accountant/receipts', icon: FileText },
        { label: 'Salaires', href: '/accountant/payroll', icon: PieChart },
      ];
    case 'alumni':
      return [
        { label: 'Accueil', href: '/alumni/dashboard', icon: Home },
        { label: 'Étudiants', href: '/alumni/students', icon: Users },
        { label: 'Mentorat', href: '/alumni/requests', icon: Award },
        { label: 'Messages', href: '/alumni/messages', icon: MessageSquare },
        { label: 'Profil', href: '/alumni/settings', icon: Settings },
      ];
    case 'admin':
    case 'director':
    case 'directeur':
      return [
        { label: 'Dashboard', href: '/admin/dashboard', icon: Home },
        { label: 'Étudiants', href: '/admin/students', icon: Users },
        { label: 'Présences', href: '/admin/attendance', icon: Clock },
        { label: 'Finances', href: '/admin/payments', icon: DollarSign },
        { label: 'Réglages', href: '/admin/settings', icon: Settings },
      ];
    default:
      return null;
  }
}

export default function MobileBottomNav({ userRole }: MobileBottomNavProps) {
  const pathname = usePathname();

  const getNavItems = (): NavItem[] => {
    // ✅ PRIORITÉ 1 : toujours se baser sur le rôle utilisateur authentifié
    // pour éviter que l'admin voie les onglets secrétaire sur /secretary/...
    const byRole = getNavItemsByRole(userRole);
    if (byRole) return byRole;

    // ✅ PRIORITÉ 2 : fallback URL (rôle inconnu / non chargé)
    if (pathname?.startsWith('/superadmin')) {
      return [
        { label: 'Accueil', href: '/superadmin/dashboard', icon: Home },
        { label: 'Universités', href: '/superadmin/universities', icon: Building2 },
        { label: 'Factures', href: '/superadmin/invoices', icon: Receipt },
        { label: 'Incidents', href: '/superadmin/incidents', icon: AlertTriangle },
        { label: 'Réglages', href: '/superadmin/settings', icon: Settings },
      ];
    }
    if (pathname?.startsWith('/secretary')) {
      return [
        { label: 'Accueil', href: '/secretary/dashboard', icon: Home },
        { label: 'Étudiants', href: '/secretary/students', icon: Users },
        { label: 'Planning', href: '/secretary/schedule', icon: Calendar },
        { label: 'Examens', href: '/secretary/exam-sessions', icon: Award },
        { label: 'Documents', href: '/secretary/documents', icon: FileText },
      ];
    }
    if (pathname?.startsWith('/student')) {
      return [
        { label: 'Accueil', href: '/student/dashboard', icon: Home },
        { label: 'Planning', href: '/student/schedule', icon: Calendar },
        { label: 'Carte QR', href: '/student/card', icon: QrCode },
        { label: 'Notes', href: '/student/grades', icon: Award },
        { label: 'Paiements', href: '/student/payments', icon: CreditCard },
      ];
    }
    // Défaut : admin
    return [
      { label: 'Dashboard', href: '/admin/dashboard', icon: Home },
      { label: 'Étudiants', href: '/admin/students', icon: Users },
      { label: 'Présences', href: '/admin/attendance', icon: Clock },
      { label: 'Finances', href: '/admin/payments', icon: DollarSign },
      { label: 'Réglages', href: '/admin/settings', icon: Settings },
    ];
  };

  const navItems = getNavItems();

  return (
    <nav 
      aria-label="Navigation mobile"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/80 px-2 py-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] md:hidden print:hidden transition-all duration-300"
    >
      <div className="grid grid-cols-5 items-center w-full max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          // Les liens "Accueil/Dashboard" ne sont actifs que sur correspondance exacte
          const isDashboard = item.href.endsWith('/dashboard');
          const isActive = pathname === item.href || (!isDashboard && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all duration-150 ${
                isActive
                  ? 'text-[#FF6B00] font-bold'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <div className={`relative p-1 rounded-lg transition-colors ${isActive ? 'bg-orange-50' : 'bg-transparent'}`}>
                <Icon size={19} strokeWidth={isActive ? 2.5 : 2} />
                {isActive && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#FF6B00] rounded-full" />
                )}
              </div>
              <span className="text-[9.5px] sm:text-[10px] mt-0.5 tracking-tight leading-tight truncate max-w-full text-center">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
