'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, BookOpen, GraduationCap, UserCheck, UserCog, User, FileText, Calendar, Calculator, CreditCard,
  Bell, BarChart3, Bot, Settings, ChevronDown, ChevronRight,
  Upload, CheckCircle, Award, TrendingUp, MessageSquare,
  ClipboardList, Receipt, AlertCircle, FileCheck, School, Building2, DollarSign, Shield, KeyRound,
  QrCode, Edit3, Clock, AlertTriangle, RotateCcw, FileBarChart,
  BrainCircuit, UserPlus, Folder, Users2, ScrollText, FileSearch, Scale, Lock, HelpCircle,
  Layers, FileSpreadsheet, Printer, Megaphone, LogOut, X
} from 'lucide-react';
import { authService } from '@/services/authService';
import LogoutConfirmModal from '@/components/LogoutConfirmModal';
import { useRouter } from 'next/navigation';
import { useUniversityLogo } from '@/hooks/useUniversityLogo';
import { useSettings } from '@/contexts/SettingsContext';
import { API_BASE_URL } from '@/lib/api';

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
  // 👨‍💻 ADMIN
  // ==========================================
  admin: [
    {
      title: 'TABLEAU DE BORD',
      items: [
        { label: 'Vue d\'ensemble', href: '/admin/dashboard', icon: LayoutDashboard },
      ]
    },

    {
      title: 'SCOLARITÉ',
      items: [
        { label: 'Étudiants', href: '/admin/students', icon: Users },
        { label: 'Cartes Étudiants (4 Styles)', href: '/secretary/student-cards', icon: CreditCard },
        { label: 'Inscription en masse', href: '/admin/students/bulk', icon: FileSpreadsheet },
        { label: 'Enseignants', href: '/admin/teachers', icon: GraduationCap },
        { label: 'Cours', href: '/admin/courses', icon: BookOpen },
        { label: 'Unités d\'Enseignement (UEs)', href: '/admin/teaching-units', icon: Layers },
        { label: 'Notes & Résultats', href: '/admin/grades', icon: FileText },
      ]
    },

    {
      title: 'DOCUMENTS & CERTIFICATIONS',
      items: [
        { label: 'Générer documents officiels', href: '/secretary/documents/generate', icon: FileCheck },
        { label: 'Cartes Étudiants (4 Styles & Couleurs)', href: '/secretary/student-cards', icon: CreditCard },
        { label: 'Tous les documents & archives', href: '/secretary/documents', icon: FileText },
        { label: 'Demandes d\'attestations & relevés', href: '/secretary/certificate-requests', icon: ScrollText },
      ]
    },

    {
      title: 'FINANCES',
      items: [
        { label: 'Reçus', href: '/accountant/receipts', icon: Printer },
        { label: 'Statistiques financières', href: '/admin/statistics', icon: TrendingUp },
        { label: 'Rapports financiers', href: '/admin/financial-reports', icon: Receipt },
      ]
    },

    {
      title: 'ORGANISATION',
      items: [
        { label: 'Personnel', href: '/admin/staff', icon: UserCog },
        { label: 'Filières & Niveaux', href: '/admin/filieres', icon: School },
      ]
    },

    {
      title: 'COMMUNAUTÉ',
      items: [
        { label: 'Alumni', href: '/admin/alumni', icon: Award },
        { label: 'Annonces', href: '/admin/announcements', icon: Bell },
      ]
    },

    {
      title: 'DÉLIBÉRATIONS',
      items: [
        { label: 'Sessions de jury', href: '/admin/deliberations/sessions', icon: Users },
        { label: 'Règles de validation', href: '/admin/deliberations/rules', icon: Settings },
        { label: 'Décisions', href: '/admin/deliberations/decisions', icon: Scale },
        { label: 'Procès-verbaux', href: '/admin/deliberations/minutes', icon: FileText },
      ]
    },

    {
      title: 'PARAMÈTRES',
      items: [
        { label: 'Profil Université', href: '/admin/settings', icon: Building2 },
        { label: 'Configuration', href: '/admin/settings/config', icon: GraduationCap },
        { label: 'Sécurité & Audit', href: '/admin/settings/security', icon: Shield },
        { label: 'Mots de passe oubliés', href: '/admin/settings/password-requests', icon: KeyRound },
        { label: 'Guide & Manuel', href: '/guide', icon: HelpCircle },
      ]
    }
  ],

  // ==========================================
  // 👨‍💼 SECRÉTAIRE
  // ==========================================
  secretary: [
    {
      title: 'TABLEAU DE BORD',
      items: [
        { label: 'Activités du jour', href: '/secretary/dashboard', icon: LayoutDashboard },
      ]
    },

    {
      title: 'ÉTUDIANTS',
      items: [
        { label: 'Tous les étudiants', href: '/secretary/students', icon: Users },
        { label: 'Inscriptions', href: '/secretary/students/enrollment', icon: UserPlus },
        { label: 'Inscription en masse', href: '/secretary/students/bulk', icon: FileSpreadsheet },
        { label: 'Dossiers', href: '/secretary/students/files', icon: Folder },
        { label: 'Cartes Étudiants (Impression)', href: '/secretary/student-cards', icon: CreditCard },
        { label: 'Mots de passe étudiants', href: '/secretary/students/password-requests', icon: KeyRound },
      ]
    },

    {
      title: 'PÉDAGOGIE & ENSEIGNEMENT',
      items: [
        { label: 'Enseignants', href: '/secretary/teachers', icon: GraduationCap },
        { label: 'Classes', href: '/secretary/classes', icon: Users2 },
        { label: 'Cours & Modules', href: '/secretary/courses', icon: BookOpen },
        { label: 'Emploi du temps', href: '/secretary/schedule', icon: Calendar },
        { label: 'Faire l\'appel (Présences)', href: '/teacher/attendance', icon: UserCheck },
      ]
    },

    {
      title: 'EXAMENS & NOTES',
      items: [
        { label: 'Saisie des notes', href: '/secretary/grades/entry', icon: Edit3 },
        { label: 'Notes à valider', href: '/secretary/grades/pending', icon: CheckCircle, badge: 'urgent' },
        { label: 'Sessions d\'examens', href: '/secretary/exam-sessions', icon: FileText },
        { label: 'Bulletins de notes', href: '/secretary/grades/report-cards', icon: FileCheck },
        { label: 'Relevés de notes', href: '/secretary/documents', icon: ScrollText },
        { label: 'Rattrapages', href: '/secretary/exams/makeup', icon: RotateCcw },
        { label: 'Anomalies', href: '/secretary/grades/anomalies', icon: AlertTriangle },
      ]
    },

    {
      title: 'SUIVI ACADÉMIQUE',
      items: [
        { label: 'Unités d\'Enseignement (UEs)', href: '/secretary/teaching-units', icon: Layers },
        { label: 'Performance', href: '/secretary/academic/performance', icon: TrendingUp },
        { label: 'Statistiques', href: '/secretary/academic/statistics', icon: BarChart3 },
        { label: 'Rapports académiques', href: '/secretary/academic/reports', icon: FileBarChart },
      ]
    },

    {
      title: 'DOCUMENTS & CERTIFICATIONS',
      items: [
        { label: 'Générer documents officiels', href: '/secretary/documents/generate', icon: FileCheck },
        { label: 'Cartes Étudiants (4 Styles & Couleurs)', href: '/secretary/student-cards', icon: CreditCard },
        { label: 'Tous les documents & archives', href: '/secretary/documents', icon: FileText },
        { label: 'Demandes d\'attestations & relevés', href: '/secretary/certificate-requests', icon: ScrollText },
        { label: 'Upload Cours PDF', href: '/secretary/upload-materials', icon: Upload },
      ]
    },

    {
      title: 'COMMUNICATION',
      items: [
        { label: 'Annonces', href: '/secretary/announcements', icon: Bell },
        { label: 'Messages', href: '/secretary/messages', icon: MessageSquare },
      ]
    },

    {
      title: 'PARAMÈTRES',
      items: [
        { label: 'Paramètre', href: '/secretary/settings', icon: Settings },
        { label: 'Guide & Manuel', href: '/guide', icon: HelpCircle },
      ]
    }
  ],

  // ==========================================
  // 👨‍⚖️ CENSEUR (avec saisie des notes)
  // ==========================================
  censeur: [
    {
      title: 'TABLEAU DE BORD',
      items: [
        { label: 'Vue d\'ensemble', href: '/censeur/dashboard', icon: LayoutDashboard },
      ]
    },

    {
      title: 'NOTES',
      items: [
        { label: 'Saisie des notes', href: '/censeur/grades/entry', icon: Edit3 },
        { label: 'Notes à valider', href: '/censeur/grades/pending', icon: CheckCircle, badge: 'urgent' },
        { label: 'Bulletins de notes', href: '/censeur/bulletins', icon: FileCheck },
        { label: 'Historique', href: '/censeur/grades/history', icon: Clock },
        { label: 'Anomalies', href: '/censeur/grades/anomalies', icon: AlertTriangle },
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
      title: 'SUIVI ACADÉMIQUE',
      items: [
        { label: 'Unités d\'Enseignement (UEs)', href: '/censeur/teaching-units', icon: Layers },
        { label: 'Performance', href: '/censeur/academic/performance', icon: TrendingUp },
        { label: 'Statistiques', href: '/censeur/academic/statistics', icon: BarChart3 },
        { label: 'Rapports', href: '/censeur/academic/reports', icon: FileBarChart },
      ]
    },

    {
      title: 'DOCUMENTS',
      items: [
        { label: 'Bulletins validés', href: '/censeur/documents/report-cards', icon: FileCheck },
        { label: 'Relevés de notes', href: '/censeur/documents/transcripts', icon: ScrollText },
      ]
    },

    {
      title: 'PARAMÈTRES',
      items: [
        { label: 'Paramètre', href: '/censeur/settings', icon: Settings },
        { label: 'Règles d\'anomalies', href: '/censeur/settings/anomalies', icon: AlertTriangle },
        { label: 'Guide & Manuel', href: '/guide', icon: HelpCircle },
      ]
    }
  ],

  // ==========================================
  // 👨‍💼 COMPTABLE
  // ==========================================
  accountant: [
    {
      title: 'TABLEAU DE BORD',
      items: [
        { label: 'Vue financière', href: '/accountant/dashboard', icon: LayoutDashboard },
      ]
    },

    {
      title: 'REÇUS',
      items: [
        { label: 'Reçus', href: '/accountant/receipts', icon: Printer },
      ]
    },

    {
      title: 'PAIEMENTS',
      items: [
        { label: 'Enregistrer paiement', href: '/accountant/payments/create', icon: Calculator },
        { label: 'Historique paiements', href: '/accountant/payments', icon: Receipt },
        { label: 'Échéances', href: '/accountant/payments/installments', icon: Calendar },
        { label: 'Impayés', href: '/accountant/payments/unpaid', icon: AlertCircle },
      ]
    },

    {
      title: 'FINANCES',
      items: [
        { label: 'Budget', href: '/accountant/budget', icon: BarChart3 },
        { label: 'Trésorerie', href: '/accountant/treasury', icon: DollarSign },
        { label: 'Fournisseurs', href: '/accountant/suppliers', icon: Building2 },
        { label: 'Dépenses', href: '/accountant/expenses', icon: TrendingUp },
        { label: 'Salaires', href: '/accountant/payroll', icon: Users },
        { label: 'Immobilisations', href: '/accountant/fixed-assets', icon: School },
      ]
    },

    {
      title: 'COMPTABILITÉ GÉNÉRALE',
      items: [
        { label: 'Journal comptable', href: '/accountant/ledger', icon: BookOpen },
        { label: 'Balance & Plan comptable', href: '/accountant/trial-balance', icon: Scale },
        { label: 'Clôture & Rapprochement', href: '/accountant/closing', icon: Lock },
      ]
    },

    {
      title: 'RAPPORTS',
      items: [
        { label: 'Rapport journalier', href: '/accountant/reports/daily', icon: FileText },
        { label: 'Rapport mensuel', href: '/accountant/reports/monthly', icon: BarChart3 },
        { label: 'États financiers', href: '/accountant/financial-statements', icon: FileBarChart },
        { label: 'Statistiques', href: '/accountant/statistics', icon: TrendingUp },
      ]
    },

    {
      title: 'PARAMÈTRES',
      items: [
        { label: 'Paramètre', href: '/accountant/settings', icon: Settings },
        { label: 'Guide & Manuel', href: '/guide', icon: HelpCircle },
      ]
    }
  ],

  // ==========================================
  // 👨‍🏫 ENSEIGNANT
  // ==========================================
  teacher: [
    {
      title: 'TABLEAU DE BORD',
      items: [
        { label: 'Mes cours du jour', href: '/teacher/dashboard', icon: LayoutDashboard },
      ]
    },

    {
      title: 'ENSEIGNEMENT',
      items: [
        { label: 'Liste de mes cours', href: '/teacher/courses', icon: BookOpen },
        { label: 'Mes étudiants', href: '/teacher/students', icon: Users },
        { label: 'Emploi du temps', href: '/teacher/schedule', icon: Calendar },
        { label: 'Mes supports déposés', href: '/teacher/materials', icon: FileText },
      ]
    },

    {
      title: 'ÉVALUATIONS',
      items: [
        { label: 'Saisie des notes', href: '/teacher/grades/entry', icon: Edit3 },
        { label: 'Faire l\'appel', href: '/teacher/attendance', icon: UserCheck },
      ]
    },

    {
      title: 'OUTILS',
      items: [
        { label: 'Documents', href: '/teacher/documents', icon: FileText },
        { label: 'Assistant IA', href: '/teacher/ai-assistant', icon: BrainCircuit },
      ]
    },

    {
      title: 'PARAMÈTRES',
      items: [
        { label: 'Paramètre', href: '/teacher/settings', icon: Settings },
        { label: 'Guide & Manuel', href: '/guide', icon: HelpCircle },
      ]
    }
  ],

  // ==========================================
  // 👨‍🎓 ÉTUDIANT
  // ==========================================
  student: [
    {
      title: 'MON ESPACE',
      items: [
        { label: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
      ]
    },

    {
      title: 'PÉDAGOGIE',
      items: [
        { label: 'Mes cours (PDF)', href: '/student/courses', icon: BookOpen },
        { label: 'Mes notes', href: '/student/grades', icon: FileText },
        { label: 'Mon emploi du temps', href: '/student/schedule', icon: Calendar },
        { label: 'Présences', href: '/student/attendance', icon: ClipboardList },
      ]
    },

    {
      title: 'MA SCOLARITÉ',
      items: [
        { label: 'Mes paiements', href: '/student/payments', icon: Calculator },
        { label: 'Mes reçus', href: '/student/receipts', icon: Receipt },
      ]
    },

    {
      title: 'MES DOCUMENTS',
      items: [
        { label: 'Carte étudiante', href: '/student/card', icon: CreditCard },
        { label: 'Attestations', href: '/student/certificates', icon: FileCheck },
        { label: 'Demandes', href: '/student/requests', icon: FileSearch },
        { label: 'Dossiers', href: '/student/files', icon: Folder },
      ]
    },

    {
      title: 'COMMUNAUTÉ & RÉSEAU',
      items: [
        { label: 'Réseau Alumni', href: '/student/alumni', icon: GraduationCap },
        { label: 'Annonces', href: '/student/announcements', icon: Megaphone },
      ]
    },

    {
      title: 'PARAMÈTRES',
      items: [
        { label: 'Mon profil', href: '/student/profile', icon: User },
        { label: 'Paramètres', href: '/student/settings', icon: Settings },
        { label: 'Guide & Manuel', href: '/guide', icon: HelpCircle },
      ]
    }
  ],

  // ==========================================
  // 🛡️ GARDIEN
  // ==========================================
  guard: [
    {
      title: 'TABLEAU DE BORD',
      items: [
        { label: 'Accueil', href: '/guard/dashboard', icon: LayoutDashboard },
      ]
    },

    {
      title: 'CONTRÔLE D\'ACCÈS',
      items: [
        { label: 'Scanner QR Code', href: '/guard/scanner', icon: QrCode },
        { label: 'Présences du jour', href: '/guard/attendance/today', icon: CheckCircle },
        { label: 'Historique', href: '/guard/attendance/history', icon: FileText },
      ]
    },

    {
      title: 'RAPPORTS',
      items: [
        { label: 'Incidents', href: '/guard/incidents', icon: AlertTriangle },
        { label: 'Statistiques', href: '/guard/statistics', icon: BarChart3 },
      ]
    },

    {
      title: 'MON COMPTE',
      items: [
        { label: 'Profil', href: '/guard/profile', icon: UserCog },
        { label: 'Paramètre', href: '/guard/settings', icon: Settings },
        { label: 'Guide & Manuel', href: '/guide', icon: HelpCircle },
      ]
    },
  ],

  // ==========================================
  // 👨 ALUMNI
  // ==========================================
  alumni: [
    {
      title: 'TABLEAU DE BORD',
      items: [
        { label: 'Dashboard', href: '/alumni/dashboard', icon: LayoutDashboard },
        { label: 'Mon profil', href: '/alumni/profile', icon: Award },
      ]
    },
    {
      title: 'MENTORAT',
      items: [
        { label: 'Mes étudiants', href: '/alumni/students', icon: GraduationCap },
        { label: 'Demandes', href: '/alumni/requests', icon: Bell },
      ]
    },
    {
      title: 'COMMUNICATION',
      items: [
        { label: 'Messages', href: '/alumni/messages', icon: MessageSquare },
      ]
    },
    {
      title: 'AUTRE',
      items: [
        { label: 'Paramètres', href: '/alumni/settings', icon: Settings },
        { label: 'Guide & Manuel', href: '/guide', icon: HelpCircle },
      ]
    }
  ],

  // ==========================================
  // 🛡️ SUPER ADMIN (SaaS Platform Owner)
  // ==========================================
  superadmin: [
    {
      title: 'TABLEAU DE BORD',
      items: [
        { label: "Vue d'ensemble", href: '/superadmin/dashboard', icon: LayoutDashboard },
      ]
    },
    {
      title: 'FLOTTE UNIVERSITÉS',
      items: [
        { label: 'Universités', href: '/superadmin/universities', icon: Building2 },
        { label: 'Créer Université', href: '/superadmin/universities/new', icon: UserPlus },
      ]
    },
    {
      title: 'FACTURATION & MODÈLE',
      items: [
        { label: 'Tarifs & Abonnements', href: '/superadmin/plans', icon: DollarSign },
        { label: 'Factures Clients', href: '/superadmin/invoices', icon: FileText },
        { label: 'Encaissements', href: '/superadmin/payments', icon: Receipt },
      ]
    },
    {
      title: 'SUPERVISION & SAAS',
      items: [
        { label: 'Centre Incidents & Pannes', href: '/superadmin/incidents', icon: AlertTriangle },
        { label: 'Sécurité & Audit Global', href: '/superadmin/audit', icon: Shield },
      ]
    },
    {
      title: 'COMMUNICATION',
      items: [
        { label: 'Support & Messagerie', href: '/superadmin/messages', icon: MessageSquare },
        { label: 'Notifications', href: '/superadmin/notifications', icon: Bell },
      ]
    },
    {
      title: 'PARAMÈTRES',
      items: [
        { label: 'Mon Profil', href: '/superadmin/profile', icon: User },
        { label: 'Paramètres SaaS', href: '/superadmin/settings', icon: Settings },
      ]
    }
  ],
  super_admin: [
    {
      title: 'TABLEAU DE BORD',
      items: [
        { label: "Vue d'ensemble", href: '/superadmin/dashboard', icon: LayoutDashboard },
      ]
    },
    {
      title: 'FLOTTE UNIVERSITÉS',
      items: [
        { label: 'Universités', href: '/superadmin/universities', icon: Building2 },
        { label: 'Créer Université', href: '/superadmin/universities/new', icon: UserPlus },
      ]
    },
    {
      title: 'FACTURATION & MODÈLE',
      items: [
        { label: 'Tarifs & Abonnements', href: '/superadmin/plans', icon: DollarSign },
        { label: 'Factures Clients', href: '/superadmin/invoices', icon: FileText },
        { label: 'Encaissements', href: '/superadmin/payments', icon: Receipt },
      ]
    },
    {
      title: 'SUPERVISION & SAAS',
      items: [
        { label: 'Centre Incidents & Pannes', href: '/superadmin/incidents', icon: AlertTriangle },
        { label: 'Sécurité & Audit Global', href: '/superadmin/audit', icon: Shield },
      ]
    },
    {
      title: 'COMMUNICATION',
      items: [
        { label: 'Support & Messagerie', href: '/superadmin/messages', icon: MessageSquare },
        { label: 'Notifications', href: '/superadmin/notifications', icon: Bell },
      ]
    },
    {
      title: 'PARAMÈTRES',
      items: [
        { label: 'Mon Profil', href: '/superadmin/profile', icon: User },
        { label: 'Paramètres SaaS', href: '/superadmin/settings', icon: Settings },
      ]
    }
  ],

};

MENU_CONFIG.director = MENU_CONFIG.admin;
MENU_CONFIG.directeur = MENU_CONFIG.admin;

export default function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const menu = MENU_CONFIG[userRole] || MENU_CONFIG.admin;
  const [expandedSections, setExpandedSections] = useState<string[]>(
    menu.map(section => section.title)
  );

  const { logoUrl, universityName, slogan, loading } = useUniversityLogo();
  const { settings } = useSettings();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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

  const getRoleLabel = () => {
    switch (userRole) {
      case 'admin': return 'Administrateur';
      case 'secretary': return 'Secrétaire';
      case 'censeur': return 'Censeur';
      case 'teacher': return 'Enseignant';
      case 'student': return 'Étudiant';
      case 'accountant': return 'Comptable';
      case 'guard': return 'Gardien';
      case 'alumni': return 'Alumni';
      case 'super_admin':
      case 'superadmin': return 'Super Admin';
      default: return 'Utilisateur';
    }
  };

  const sidebarBg = settings?.sidebarColor || '#0a1628';

  return (
    <>
    <aside style={{ backgroundColor: sidebarBg }} className="h-screen w-58 text-white flex flex-col overflow-hidden transition-colors duration-200">

      {/* En-tête de la Sidebar - SaaS Modern Style */}
      <div className="px-4 py-3.5 border-b border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-3">
          {userRole === 'super_admin' || userRole === 'superadmin' ? (
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
              {userRole === 'super_admin' || userRole === 'superadmin' ? 'UniSphere AI' : universityName}
            </h1>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              {userRole === 'super_admin' || userRole === 'superadmin' ? 'Administration SaaS' : (slogan || 'Plateforme Éducative')}
            </p>
          </div>
        </div>
      </div>


      {/* Menu Scrollable */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
        {menu.map((section) => (
          <div key={section.title}>
            <button
              onClick={() => toggleSection(section.title)}
              className="flex items-center justify-between w-full text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 hover:text-white transition-colors px-3 py-2"
            >
              {section.title}
              {expandedSections.includes(section.title) ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </button>

            {expandedSections.includes(section.title) && (
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${isActive
                          ? 'bg-[#FF6B00] text-white font-medium'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon size={18} />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">
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

      {/* USER PROFILE et Déconnexion */}
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

    {/* Modal de confirmation de déconnexion avec Portal (100% viewport) */}
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