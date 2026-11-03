'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, BookOpen, GraduationCap, UserCheck, UserCog, User, FileText, Calendar, Calculator, CreditCard,
  Bell, BarChart3, Bot, Settings, ChevronDown, ChevronRight,
  Upload, CheckCircle, Award, TrendingUp, TrendingDown, MessageSquare,
  ClipboardList, Receipt, AlertCircle, FileCheck, School, Building2, DollarSign, Shield, KeyRound,
  QrCode, Edit3, Clock, AlertTriangle, RotateCcw, FileBarChart,
  BrainCircuit, UserPlus, Folder, Users2, ScrollText, FileSearch, Scale, Lock, HelpCircle,
  Layers, FileSpreadsheet, Printer, Megaphone, LogOut, X, Sparkles, Database
} from 'lucide-react';
import { authService } from '@/services/authService';
import LogoutConfirmModal from '@/components/LogoutConfirmModal';
import { useUniversityLogo } from '@/hooks/useUniversityLogo';
import { useSettings } from '@/contexts/SettingsContext';

interface SidebarProps {
  userRole: string;
}

const MENU_CONFIG: Record<string, Array<{
  title: string;
  items: Array<{
    label: string;
    href: string;
    icon: any;
    badge?: string | number;
  }>;
}>> = {

  // ==========================================
  // 👨‍💻 1. ADMIN (Direction Générale)
  // ==========================================
  admin: [
    {
      title: 'VUE GÉNÉRALE',
      items: [
        { label: "Vue d'ensemble", href: '/admin/dashboard', icon: LayoutDashboard },
        { label: 'Statistiques', href: '/admin/statistics', icon: BarChart3 },
      ]
    },
    {
      title: 'SCOLARITÉ',
      items: [
        { label: 'Étudiants', href: '/admin/students', icon: Users },
        { label: 'Import en masse', href: '/admin/students/bulk', icon: FileSpreadsheet },
        { label: 'Enseignants', href: '/admin/teachers', icon: GraduationCap },
        { label: 'Cours', href: '/admin/courses', icon: BookOpen },
        { label: "Unités (UE)", href: '/admin/teaching-units', icon: Layers },

      ]
    },
    {
      title: 'STRUCTURE',
      items: [
        { label: 'Personnel', href: '/admin/staff', icon: UserCog },
        { label: 'Filières & Niveaux', href: '/admin/filieres', icon: School },
      ]
    },
    {
      title: 'FINANCES',
      items: [
        { label: 'Paiements', href: '/admin/payments', icon: CreditCard },
        { label: 'Dépenses', href: '/admin/expenses', icon: TrendingDown },
        { label: 'Frais & Tranches', href: '/admin/settings/config?tab=frais', icon: DollarSign },
        { label: 'Reçus', href: '/accountant/receipts', icon: Printer },
        { label: 'Rapports financiers', href: '/admin/financial-reports', icon: Receipt },
      ]
    },
    {
      title: 'COMMUNICATION',
      items: [
        { label: 'Annonces', href: '/admin/announcements', icon: Bell },
        { label: 'Messagerie', href: '/admin/messages', icon: MessageSquare },
        { label: 'Alumni', href: '/admin/alumni', icon: Award },
      ]
    },
    {
      title: 'DÉLIBÉRATIONS',
      items: [
        { label: 'Sessions de jury', href: '/admin/deliberations/sessions', icon: Users },
        { label: 'Règles', href: '/admin/deliberations/rules', icon: Settings },
        { label: 'Décisions', href: '/admin/deliberations/decisions', icon: Scale },
        { label: 'Procès-verbaux', href: '/admin/deliberations/minutes', icon: FileText },
      ]
    },
    {
      title: 'PARAMÈTRES',
      items: [
        { label: 'Établissement', href: '/admin/settings', icon: Building2 },
        { label: 'Configuration LMD', href: '/admin/settings/config', icon: GraduationCap },
        { label: "Bascule d'année", href: '/admin/academic-year-transition', icon: Calendar },
        { label: 'Sécurité & Audit', href: '/admin/settings/security', icon: Shield },
        { label: 'Mots de passe', href: '/admin/settings/password-requests', icon: KeyRound },
        { label: 'Guide', href: '/guide', icon: HelpCircle },
      ]
    }
  ],

  // ==========================================
  // 👨‍💼 2. SECRÉTAIRE (Secrétariat & Scolarité)
  // ==========================================
  secretary: [
    {
      title: 'TABLEAU DE BORD',
      items: [
        { label: 'Activités', href: '/secretary/dashboard', icon: LayoutDashboard },
      ]
    },
    {
      title: 'ÉTUDIANTS',
      items: [
        { label: 'Liste Étudiants', href: '/secretary/students', icon: Users },
        { label: 'Inscriptions', href: '/secretary/students/enrollment', icon: UserPlus },
        { label: 'Import en masse', href: '/secretary/students/bulk', icon: FileSpreadsheet },
        { label: 'Mots de passe', href: '/secretary/students/password-requests', icon: KeyRound },
      ]
    },
    {
      title: 'PÉDAGOGIE',
      items: [
        { label: 'Emploi du temps', href: '/secretary/schedule', icon: Calendar },
        { label: 'Classes & Salles', href: '/secretary/classes', icon: Users2 },
        { label: 'Salles de cours', href: '/secretary/rooms', icon: School },
        { label: 'Cours', href: '/secretary/courses', icon: BookOpen },
        { label: 'Enseignants', href: '/secretary/teachers', icon: GraduationCap },
        { label: "Unités (UE)", href: '/secretary/teaching-units', icon: Layers },
        { label: 'Présences', href: '/secretary/attendance', icon: UserCheck },
      ]
    },
    {
      title: 'EXAMENS',
      items: [
        { label: 'Sessions', href: '/secretary/exam-sessions', icon: FileText },
        { label: 'Calendrier', href: '/secretary/exams/calendar', icon: Calendar },
        { label: 'Saisie des notes', href: '/secretary/grades/entry', icon: Edit3 },
        { label: 'Notes à valider', href: '/secretary/grades/pending', icon: CheckCircle, badge: 'urgent' },
        { label: 'Bulletins', href: '/secretary/bulletins', icon: FileCheck },
        { label: 'Historique', href: '/secretary/grades/history', icon: Clock },
        { label: 'Rattrapages', href: '/secretary/exams/makeup', icon: RotateCcw },
        { label: 'Anomalies', href: '/secretary/grades/anomalies', icon: AlertTriangle },
        { label: 'Règles anomalies', href: '/secretary/settings/anomalies', icon: AlertCircle },
      ]
    },
    {
      title: 'DOCUMENTS',
      items: [
        { label: 'Actes officiels', href: '/secretary/documents/generate', icon: FileCheck },
        { label: 'Relevés de notes', href: '/secretary/documents/transcripts', icon: ScrollText },
        { label: 'Procès-verbaux', href: '/secretary/documents/report-cards', icon: FileCheck },
        { label: "Demandes d'actes", href: '/secretary/certificate-requests', icon: ScrollText },
        { label: 'Archives', href: '/secretary/documents', icon: FileText },
        { label: 'Supports PDF', href: '/secretary/upload-materials', icon: Upload },
      ]
    },
    {
      title: 'STATISTIQUES',
      items: [
        { label: 'Statistiques', href: '/secretary/academic/statistics', icon: BarChart3 },
        { label: 'Rapports', href: '/secretary/academic/reports', icon: FileBarChart },
        { label: 'Indicateurs', href: '/secretary/academic/performance', icon: TrendingUp },
      ]
    },
    {
      title: 'COMMUNICATION',
      items: [
        { label: 'Annonces', href: '/secretary/announcements', icon: Bell },
        { label: 'Messagerie', href: '/secretary/messages', icon: MessageSquare },
        { label: 'Paramètres', href: '/secretary/settings', icon: Settings },
        { label: 'Guide', href: '/guide', icon: HelpCircle },
      ]
    }
  ],

  // ==========================================
  // 👨‍⚖️ 3. CENSEUR (Direction des Études)
  // ==========================================
  censeur: [
    {
      title: 'DIRECTION ÉTUDES',
      items: [
        { label: 'Tableau de bord', href: '/censeur/dashboard', icon: LayoutDashboard },
      ]
    },
    {
      title: 'ÉVALUATIONS',
      items: [
        { label: 'Saisie des notes', href: '/censeur/grades/entry', icon: Edit3 },
        { label: 'Notes à valider', href: '/censeur/grades/pending', icon: CheckCircle, badge: 'urgent' },
        { label: 'Anomalies', href: '/censeur/grades/anomalies', icon: AlertTriangle },
        { label: 'Historique', href: '/censeur/grades/history', icon: Clock },
      ]
    },
    {
      title: 'EXAMENS',
      items: [
        { label: 'Calendrier', href: '/censeur/exams/calendar', icon: Calendar },
        { label: 'Sessions', href: '/censeur/exams/sessions', icon: FileText },
        { label: 'Rattrapages', href: '/censeur/exams/makeup', icon: RotateCcw },
      ]
    },
    {
      title: 'DÉLIBÉRATIONS',
      items: [
        { label: 'Bulletins', href: '/censeur/bulletins', icon: FileCheck },
        { label: 'Relevés de notes', href: '/censeur/documents/transcripts', icon: ScrollText },
        { label: 'Procès-verbaux', href: '/censeur/documents/report-cards', icon: FileCheck },
      ]
    },
    {
      title: 'ANALYSE',
      items: [
        { label: "Unités (UE)", href: '/censeur/teaching-units', icon: Layers },
        { label: 'Indicateurs', href: '/censeur/academic/performance', icon: TrendingUp },
        { label: 'Statistiques', href: '/censeur/academic/statistics', icon: BarChart3 },
        { label: 'Rapports', href: '/censeur/academic/reports', icon: FileBarChart },
      ]
    },
    {
      title: 'PARAMÈTRES',
      items: [
        { label: 'Règles', href: '/censeur/settings/anomalies', icon: AlertTriangle },
        { label: 'Paramètres', href: '/censeur/settings', icon: Settings },
        { label: 'Guide', href: '/guide', icon: HelpCircle },
      ]
    }
  ],

  // ==========================================
  // 👨‍💼 4. COMPTABLE (Service Financier)
  // ==========================================
  accountant: [
    {
      title: 'DIRECTION FINANCIÈRE',
      items: [
        { label: 'Vue financière', href: '/accountant/dashboard', icon: LayoutDashboard },
      ]
    },
    {
      title: 'RECOUVREMENT',
      items: [
        { label: 'Nouveau paiement', href: '/accountant/payments/create', icon: Calculator },
        { label: 'Encaissements', href: '/accountant/payments', icon: Receipt },
        { label: 'Reçus', href: '/accountant/receipts', icon: Printer },
        { label: 'Relances impayés', href: '/accountant/payments/unpaid', icon: AlertCircle },
        { label: 'Échéanciers', href: '/accountant/payments/installments', icon: Calendar },
      ]
    },
    {
      title: 'TRÉSORERIE & DÉPENSES',
      items: [
        { label: 'Trésorerie', href: '/accountant/treasury', icon: DollarSign },
        { label: 'Dépenses', href: '/accountant/expenses', icon: TrendingUp },
        { label: 'Fournisseurs', href: '/accountant/suppliers', icon: Building2 },
        { label: 'Salaires', href: '/accountant/payroll', icon: Users },
        { label: 'Budget', href: '/accountant/budget', icon: BarChart3 },
        { label: 'Immobilisations', href: '/accountant/fixed-assets', icon: School },
      ]
    },
    {
      title: 'COMPTABILITÉ',
      items: [
        { label: 'Journal', href: '/accountant/ledger', icon: BookOpen },
        { label: 'Grand Livre', href: '/accountant/trial-balance', icon: Scale },
        { label: 'Clôture', href: '/accountant/closing', icon: Lock },
      ]
    },
    {
      title: 'RAPPORTS',
      items: [
        { label: 'États financiers', href: '/accountant/financial-statements', icon: FileBarChart },
        { label: 'Caisse journalière', href: '/accountant/reports/daily', icon: FileText },
        { label: 'Bilan mensuel', href: '/accountant/reports/monthly', icon: BarChart3 },
        { label: 'Statistiques', href: '/accountant/statistics', icon: TrendingUp },
      ]
    },
    {
      title: 'MON COMPTE',
      items: [
        { label: 'Paramètres', href: '/accountant/settings', icon: Settings },
        { label: 'Guide', href: '/guide', icon: HelpCircle },
      ]
    }
  ],

  // ==========================================
  // 👨‍🏫 5. ENSEIGNANT (Corps Professoral)
  // ==========================================
  teacher: [
    {
      title: 'ESPACE COURS',
      items: [
        { label: 'Cours du jour', href: '/teacher/dashboard', icon: LayoutDashboard },
        { label: 'Emploi du temps', href: '/teacher/schedule', icon: Calendar },
      ]
    },
    {
      title: 'CLASSES',
      items: [
        { label: 'Mes cours', href: '/teacher/courses', icon: BookOpen },
        { label: 'Mes étudiants', href: '/teacher/students', icon: Users },
        { label: 'Supports déposés', href: '/teacher/materials', icon: FileText },
        { label: 'Présences', href: '/teacher/attendance', icon: UserCheck },
      ]
    },
    {
      title: 'ÉVALUATIONS',
      items: [
        { label: 'Saisie des notes', href: '/teacher/grades/entry', icon: Edit3 },
        { label: 'Examens', href: '/teacher/documents', icon: FileText },
      ]
    },
    {
      title: 'OUTILS',
      items: [
        { label: 'Assistant IA', href: '/teacher/ai-assistant', icon: BrainCircuit },
        { label: 'Messagerie', href: '/teacher/messages', icon: MessageSquare },
      ]
    },
    {
      title: 'MON COMPTE',
      items: [
        { label: 'Mon profil', href: '/teacher/profile', icon: User },
        { label: 'Paramètres', href: '/teacher/settings', icon: Settings },
        { label: 'Guide', href: '/guide', icon: HelpCircle },
      ]
    }
  ],

  // ==========================================
  // 👨‍🎓 6. ÉTUDIANT (Portail Étudiant)
  // ==========================================
  student: [
    {
      title: 'MON ESPACE',
      items: [
        { label: 'Tableau de bord', href: '/student/dashboard', icon: LayoutDashboard },
        { label: 'Mon profil', href: '/student/profile', icon: User },
        { label: 'Ma carte QR', href: '/student/card', icon: CreditCard },
      ]
    },
    {
      title: 'PÉDAGOGIE',
      items: [
        { label: 'Mes cours & PDF', href: '/student/courses', icon: BookOpen },
        { label: 'Emploi du temps', href: '/student/schedule', icon: Calendar },
        { label: 'Présences', href: '/student/attendance', icon: ClipboardList },
      ]
    },
    {
      title: 'RÉSULTATS',
      items: [
        { label: 'Mes notes', href: '/student/grades', icon: FileText },
        { label: 'Attestations', href: '/student/certificates', icon: FileCheck },
        { label: 'Demandes', href: '/student/requests', icon: FileSearch },
        { label: 'Mon dossier', href: '/student/files', icon: Folder },
      ]
    },
    {
      title: 'SCOLARITÉ',
      items: [
        { label: 'Mes paiements', href: '/student/payments', icon: Calculator },
        { label: 'Mes reçus', href: '/student/receipts', icon: Receipt },
      ]
    },
    {
      title: 'RÉSEAU',
      items: [
        { label: 'Annonces', href: '/student/announcements', icon: Megaphone },
        { label: 'Messagerie', href: '/student/messages', icon: MessageSquare },
        { label: 'Alumni', href: '/student/alumni', icon: GraduationCap },
      ]
    },
    {
      title: 'PARAMÈTRES',
      items: [
        { label: 'Paramètres', href: '/student/settings', icon: Settings },
        { label: 'Guide', href: '/guide', icon: HelpCircle },
      ]
    }
  ],

  // ==========================================
  // 🛡️ 7. SURVEILLANT GÉNÉRAL / GARDIEN (Portique & Sécurité)
  // ==========================================
  guard: [
    {
      title: 'CONTRÔLE',
      items: [
        { label: 'Accueil portique', href: '/guard/dashboard', icon: LayoutDashboard },
        { label: 'Scanner QR', href: '/guard/scanner', icon: QrCode },
      ]
    },
    {
      title: 'PASSAGES',
      items: [
        { label: 'Pointages du jour', href: '/guard/attendance/today', icon: CheckCircle },
        { label: 'Historique', href: '/guard/attendance/history', icon: FileText },
      ]
    },
    {
      title: 'SÉCURITÉ',
      items: [
        { label: 'Incidents', href: '/guard/incidents', icon: AlertTriangle },
        { label: 'Fréquentation', href: '/guard/statistics', icon: BarChart3 },
      ]
    },
    {
      title: 'MON COMPTE',
      items: [
        { label: 'Profil', href: '/guard/profile', icon: UserCog },
        { label: 'Paramètres', href: '/guard/settings', icon: Settings },
        { label: 'Guide', href: '/guide', icon: HelpCircle },
      ]
    }
  ],

  // ==========================================
  // 🎓 8. ALUMNI (Réseau des Anciens)
  // ==========================================
  alumni: [
    {
      title: 'ESPACE DIPLÔMÉ',
      items: [
        { label: 'Tableau de bord', href: '/alumni/dashboard', icon: LayoutDashboard },
        { label: 'Mon profil', href: '/alumni/profile', icon: Award },
      ]
    },
    {
      title: 'MENTORAT',
      items: [
        { label: 'Étudiants mentorés', href: '/alumni/students', icon: GraduationCap },
        { label: 'Demandes', href: '/alumni/requests', icon: Bell },
      ]
    },
    {
      title: 'RÉSEAU',
      items: [
        { label: 'Messagerie', href: '/alumni/messages', icon: MessageSquare },
        { label: 'Paramètres', href: '/alumni/settings', icon: Settings },
        { label: 'Guide', href: '/guide', icon: HelpCircle },
      ]
    }
  ],

  // ==========================================
  // 🛡️ 9. SUPER ADMIN (Plateforme SaaS)
  // ==========================================
  superadmin: [
    {
      title: 'PILOTAGE SAAS',
      items: [
        { label: "Vue d'ensemble", href: '/superadmin/dashboard', icon: LayoutDashboard },
      ]
    },
    {
      title: 'DÉMONSTRATION',
      items: [
        { label: 'Univ_Demo', href: '/superadmin/demo', icon: Sparkles, badge: '8 Rôles' },
      ]
    },
    {
      title: 'FLOTTE CLIENTS',
      items: [
        { label: 'Universités', href: '/superadmin/universities', icon: Building2 },
        { label: 'Nouvelle université', href: '/superadmin/universities/new', icon: UserPlus },
      ]
    },
    {
      title: 'FACTURATION',
      items: [
        { label: 'Tarifs & Plans', href: '/superadmin/plans', icon: DollarSign },
        { label: 'Factures', href: '/superadmin/invoices', icon: FileText },
        { label: 'Encaissements', href: '/superadmin/payments', icon: Receipt },
      ]
    },
    {
      title: 'INFRASTRUCTURE',
      items: [
        { label: 'Sauvegardes Cloud', href: '/superadmin/database', icon: Database },
        { label: 'Incidents', href: '/superadmin/incidents', icon: AlertTriangle },
        { label: 'Sécurité & Audit', href: '/superadmin/audit', icon: Shield },
      ]
    },
    {
      title: 'RELATION CLIENT',
      items: [
        { label: 'Support', href: '/superadmin/messages', icon: MessageSquare },
        { label: 'Notifications', href: '/superadmin/notifications', icon: Bell },
      ]
    },
    {
      title: 'PARAMÈTRES',
      items: [
        { label: 'Profil SaaS', href: '/superadmin/profile', icon: User },
        { label: 'Configuration', href: '/superadmin/settings', icon: Settings },
      ]
    }
  ]
};

// Alias de rôles pour garantir 100% de tolérance
MENU_CONFIG.super_admin = MENU_CONFIG.superadmin;
MENU_CONFIG.director = MENU_CONFIG.admin;
MENU_CONFIG.directeur = MENU_CONFIG.admin;
MENU_CONFIG.enseignant = MENU_CONFIG.teacher;
MENU_CONFIG.professeur = MENU_CONFIG.teacher;
MENU_CONFIG.etudiant = MENU_CONFIG.student;
MENU_CONFIG.secretaire = MENU_CONFIG.secretary;
MENU_CONFIG.comptable = MENU_CONFIG.accountant;
MENU_CONFIG.gardien = MENU_CONFIG.guard;

export default function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const normalizedRole = (userRole || '').toLowerCase().trim();
  const isSuperAdmin = normalizedRole === 'super_admin' || normalizedRole === 'superadmin';
  const menu = MENU_CONFIG[normalizedRole] || MENU_CONFIG[userRole] || MENU_CONFIG.admin;

  const [expandedSections, setExpandedSections] = useState<string[]>(
    menu.map(section => section.title)
  );

  const { logoUrl, universityName, slogan, loading } = useUniversityLogo();
  const { settings } = useSettings();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    setExpandedSections(menu.map(section => section.title));
  }, [userRole]);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch (e) {
        console.error('Erreur parsing user:', e);
      }
    }
  }, []);

  const toggleSection = (title: string) => {
    setExpandedSections(prev =>
      prev.includes(title)
        ? prev.filter(s => s !== title)
        : [...prev, title]
    );
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    authService.logout();
  };

  const sidebarBg = settings?.sidebarColor || '#0a1628';

  return (
    <>
      <aside style={{ backgroundColor: sidebarBg }} className="h-screen w-58 text-white flex flex-col overflow-hidden transition-colors duration-200">

        {/* En-tête de la Sidebar */}
        <div className="px-4 py-3.5 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            {isSuperAdmin ? (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0a1628] to-[#1e293b] border border-[#FF6B00]/40 flex items-center justify-center flex-shrink-0 shadow-md">
                <Shield className="text-[#FF6B00]" size={22} />
              </div>
            ) : logoUrl ? (
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 p-1 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm">
                <img
                  src={logoUrl}
                  alt="Logo Université"
                  className="w-full h-full object-contain rounded-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6B00] to-amber-500 border border-white/20 flex items-center justify-center flex-shrink-0 shadow-md">
                <span className="text-lg font-extrabold text-white">
                  {universityName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-bold text-white truncate leading-snug tracking-wide">
                {isSuperAdmin ? 'UniSphere AI' : universityName}
              </h1>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                {isSuperAdmin ? 'Administration SaaS' : (slogan || 'Plateforme Éducative')}
              </p>
            </div>
          </div>
        </div>

        {/* Menu Scrollable */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
          {menu.map((section) => (
            <div key={section.title} className="space-y-1">
              <button
                type="button"
                onClick={() => toggleSection(section.title)}
                className="flex items-center justify-between w-full text-[11px] font-semibold text-slate-400 uppercase tracking-wider hover:text-white transition-colors px-2.5 py-1.5 rounded-md hover:bg-white/5"
              >
                <span>{section.title}</span>
                {expandedSections.includes(section.title) ? (
                  <ChevronDown size={14} className="text-slate-400" />
                ) : (
                  <ChevronRight size={14} className="text-slate-400" />
                )}
              </button>

              {expandedSections.includes(section.title) && (
                <ul className="space-y-1 pt-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || (item.href.includes('?') && pathname === item.href.split('?')[0]);

                    if (item.href === '/superadmin/demo' || item.href === '/admin/demo' || item.href === '#univ-demo') {
                      if (!isSuperAdmin) {
                        return null;
                      }
                      const isDemoActive = pathname === '/superadmin/demo' || pathname === '/admin/demo';
                      const targetHref = '/superadmin/demo';
                      return (
                        <li key={item.href}>
                          <Link
                            href={targetHref}
                            className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-xs transition-all border font-bold group shadow-xs ${isDemoActive
                              ? 'bg-gradient-to-r from-amber-500 to-[#FF6B00] border-amber-300 text-white shadow-md'
                              : 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border-amber-400/40 text-amber-200'
                              }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <Icon size={16} className="text-amber-400 group-hover:scale-110 transition-transform" />
                              <span>{item.label}</span>
                            </div>
                            {item.badge && (
                              <span className="text-[10px] bg-[#FF6B00] text-white px-2 py-0.5 rounded-full font-black">
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        </li>
                      );
                    }

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-xs transition-all ${isActive
                            ? 'bg-[#FF6B00] text-white font-medium shadow-xs'
                            : 'text-slate-300 hover:bg-white/5 hover:text-white'
                            }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon size={16} />
                            <span>{item.label}</span>
                          </div>
                          {item.badge && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${item.badge === 'urgent' ? 'bg-rose-500 text-white animate-pulse' : 'bg-white/20 text-white'
                              }`}>
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))}
        </nav>

        {/* Profil utilisateur et Déconnexion */}
        <div className="border-t border-white/10 bg-[#0a1628] flex-shrink-0 p-3 mb-1 space-y-2">
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-600/30 border border-rose-500/20 active:scale-98 transition-all"
          >
            <LogOut size={15} />
            <span>Se déconnecter</span>
          </button>
          <p className="text-[11px] text-slate-500 text-center">
            Propulsé par <span className="text-[#FF6B00] font-semibold">UniSphere AI</span>
          </p>
        </div>
      </aside>

      {/* Modal de confirmation de déconnexion */}
      <LogoutConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={confirmLogout}
        userName={currentUser?.full_name || 'Utilisateur'}
        userRole={userRole}
      />
    </>
  );
}
