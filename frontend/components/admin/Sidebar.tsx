'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, BookOpen, GraduationCap, UserCheck, UserCog, User, FileText, Calendar, Calculator, CreditCard,
  Bell, BarChart3, Bot, Settings, ChevronDown, ChevronRight,
  Upload, CheckCircle, Award, TrendingUp, MessageSquare,
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
  // 👨‍💻 1. ADMIN (Direction Générale & Rectorat)
  // ==========================================
  admin: [
    {
      title: 'VUE GÉNÉRALE',
      items: [
        { label: "Vue d'ensemble", href: '/admin/dashboard', icon: LayoutDashboard },
        { label: 'Statistiques & Audit', href: '/admin/statistics', icon: BarChart3 },
      ]
    },
    {
      title: 'PÉDAGOGIE & SCOLARITÉ',
      items: [
        { label: 'Étudiants', href: '/admin/students', icon: Users },
        { label: 'Inscription en masse', href: '/admin/students/bulk', icon: FileSpreadsheet },
        { label: 'Enseignants', href: '/admin/teachers', icon: GraduationCap },
        { label: 'Cours & Programmes', href: '/admin/courses', icon: BookOpen },
        { label: "Unités d'Enseignement (UEs)", href: '/admin/teaching-units', icon: Layers },
        { label: 'Notes & Résultats', href: '/admin/grades', icon: FileText },
      ]
    },
    {
      title: 'EXAMENS & DÉLIBÉRATIONS',
      items: [
        { label: 'Sessions de jury', href: '/admin/deliberations/sessions', icon: Users },
        { label: 'Règles de validation', href: '/admin/deliberations/rules', icon: Settings },
        { label: 'Décisions de jury', href: '/admin/deliberations/decisions', icon: Scale },
        { label: 'Procès-verbaux', href: '/admin/deliberations/minutes', icon: FileText },
      ]
    },
    {
      title: 'FINANCES & TARIFICATION',
      items: [
        { label: 'Supervision des Paiements', href: '/admin/payments', icon: CreditCard },
        { label: 'Scolarités, Tranches & Pénalités', href: '/admin/settings/config?tab=frais', icon: DollarSign },
        { label: 'Reçus certifiés', href: '/accountant/receipts', icon: Printer },
        { label: 'Rapports financiers', href: '/admin/financial-reports', icon: Receipt },
      ]
    },
    {
      title: 'REGISTRE & DOCUMENTS',
      items: [
        { label: 'Générer documents officiels', href: '/secretary/documents/generate', icon: FileCheck },
        { label: 'Cartes Étudiants avec QR', href: '/secretary/student-cards', icon: CreditCard },
        { label: 'Tous les documents & archives', href: '/secretary/documents', icon: FileText },
        { label: "Demandes d'attestations & relevés", href: '/secretary/certificate-requests', icon: ScrollText },
      ]
    },
    {
      title: 'STRUCTURE & RESSOURCES',
      items: [
        { label: 'Personnel & Staff', href: '/admin/staff', icon: UserCog },
        { label: 'Filières & Niveaux', href: '/admin/filieres', icon: School },
      ]
    },
    {
      title: 'COMMUNICATION & RÉSEAU',
      items: [
        { label: 'Annonces officielles', href: '/admin/announcements', icon: Bell },
        { label: 'Messagerie interne', href: '/admin/messages', icon: MessageSquare },
        { label: 'Réseau Alumni', href: '/admin/alumni', icon: Award },
      ]
    },
    {
      title: 'PARAMÈTRES ÉTABLISSEMENT',
      items: [
        { label: 'Profil Établissement', href: '/admin/settings', icon: Building2 },
        { label: 'Configuration Générale & LMD', href: '/admin/settings/config', icon: GraduationCap },
        { label: 'Bascule Année Académique', href: '/admin/academic-year-transition', icon: Calendar },
        { label: 'Sécurité & Audit', href: '/admin/settings/security', icon: Shield },
        { label: 'Mots de passe oubliés', href: '/admin/settings/password-requests', icon: KeyRound },
        { label: 'Guide & Manuel', href: '/guide', icon: HelpCircle },
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
        { label: 'Activités de la scolarité', href: '/secretary/dashboard', icon: LayoutDashboard },
      ]
    },
    {
      title: 'GESTION DES ÉTUDIANTS',
      items: [
        { label: 'Tous les étudiants', href: '/secretary/students', icon: Users },
        { label: 'Inscriptions', href: '/secretary/students/enrollment', icon: UserPlus },
        { label: 'Inscription en masse', href: '/secretary/students/bulk', icon: FileSpreadsheet },
        { label: 'Dossiers scolaires', href: '/secretary/students/files', icon: Folder },
        { label: 'Cartes Étudiants avec QR', href: '/secretary/student-cards', icon: CreditCard },
        { label: 'Mots de passe étudiants', href: '/secretary/students/password-requests', icon: KeyRound },
      ]
    },
    {
      title: 'PÉDAGOGIE & PLANNING',
      items: [
        { label: 'Emploi du temps', href: '/secretary/schedule', icon: Calendar },
        { label: 'Classes & Salles', href: '/secretary/classes', icon: Users2 },
        { label: 'Cours & Modules', href: '/secretary/courses', icon: BookOpen },
        { label: 'Corps Enseignant', href: '/secretary/teachers', icon: GraduationCap },
        { label: "Unités d'Enseignement (UEs)", href: '/secretary/teaching-units', icon: Layers },
        { label: "Faire l'appel (Présences)", href: '/teacher/attendance', icon: UserCheck },
      ]
    },
    {
      title: 'EXAMENS & NOTES',
      items: [
        { label: "Sessions d'examens", href: '/secretary/exam-sessions', icon: FileText },
        { label: 'Saisie des notes', href: '/secretary/grades/entry', icon: Edit3 },
        { label: 'Notes à valider', href: '/secretary/grades/pending', icon: CheckCircle, badge: 'urgent' },
        { label: 'Bulletins de notes', href: '/secretary/grades/report-cards', icon: FileCheck },
        { label: 'Rattrapages', href: '/secretary/exams/makeup', icon: RotateCcw },
        { label: 'Anomalies de notes', href: '/secretary/grades/anomalies', icon: AlertTriangle },
      ]
    },
    {
      title: 'REGISTRE DOCUMENTAIRE',
      items: [
        { label: 'Générer documents officiels', href: '/secretary/documents/generate', icon: FileCheck },
        { label: "Demandes d'attestations & relevés", href: '/secretary/certificate-requests', icon: ScrollText },
        { label: 'Tous les documents & archives', href: '/secretary/documents', icon: FileText },
        { label: 'Upload Cours PDF', href: '/secretary/upload-materials', icon: Upload },
      ]
    },
    {
      title: 'SUIVI & STATISTIQUES',
      items: [
        { label: 'Statistiques académiques', href: '/secretary/academic/statistics', icon: BarChart3 },
        { label: 'Rapports de scolarité', href: '/secretary/academic/reports', icon: FileBarChart },
        { label: 'Indicateurs de performance', href: '/secretary/academic/performance', icon: TrendingUp },
      ]
    },
    {
      title: 'COMMUNICATION & COMPTE',
      items: [
        { label: 'Annonces officielles', href: '/secretary/announcements', icon: Bell },
        { label: 'Messagerie interne', href: '/secretary/messages', icon: MessageSquare },
        { label: 'Mon Profil & Paramètres', href: '/secretary/settings', icon: Settings },
        { label: 'Guide & Manuel', href: '/guide', icon: HelpCircle },
      ]
    }
  ],

  // ==========================================
  // 👨‍⚖️ 3. CENSEUR (Direction des Études & Examens)
  // ==========================================
  censeur: [
    {
      title: 'DIRECTION DES ÉTUDES',
      items: [
        { label: 'Tableau de bord pédagogique', href: '/censeur/dashboard', icon: LayoutDashboard },
      ]
    },
    {
      title: 'ÉVALUATIONS & NOTES',
      items: [
        { label: 'Saisie des notes', href: '/censeur/grades/entry', icon: Edit3 },
        { label: 'Notes à valider', href: '/censeur/grades/pending', icon: CheckCircle, badge: 'urgent' },
        { label: 'Anomalies de saisie', href: '/censeur/grades/anomalies', icon: AlertTriangle },
        { label: 'Historique des notes', href: '/censeur/grades/history', icon: Clock },
      ]
    },
    {
      title: "SESSIONS D'EXAMENS",
      items: [
        { label: 'Calendrier des examens', href: '/censeur/exams/calendar', icon: Calendar },
        { label: "Sessions d'examens", href: '/censeur/exams/sessions', icon: FileText },
        { label: 'Épreuves de rattrapage', href: '/censeur/exams/makeup', icon: RotateCcw },
      ]
    },
    {
      title: 'DÉLIBÉRATIONS & BULLETINS',
      items: [
        { label: 'Bulletins certifiés', href: '/censeur/bulletins', icon: FileCheck },
        { label: 'Relevés de notes officiels', href: '/censeur/documents/transcripts', icon: ScrollText },
        { label: 'Procès-verbaux & Décisions', href: '/censeur/documents/report-cards', icon: FileCheck },
      ]
    },
    {
      title: 'PERFORMANCE & RAPPORTS',
      items: [
        { label: "Unités d'Enseignement (UEs)", href: '/censeur/teaching-units', icon: Layers },
        { label: 'Indicateurs de performance', href: '/censeur/academic/performance', icon: TrendingUp },
        { label: 'Statistiques pédagogiques', href: '/censeur/academic/statistics', icon: BarChart3 },
        { label: 'Rapports académiques', href: '/censeur/academic/reports', icon: FileBarChart },
      ]
    },
    {
      title: 'PARAMÈTRES & OUTILS',
      items: [
        { label: "Règles d'anomalies", href: '/censeur/settings/anomalies', icon: AlertTriangle },
        { label: 'Paramètres du compte', href: '/censeur/settings', icon: Settings },
        { label: 'Guide & Manuel', href: '/guide', icon: HelpCircle },
      ]
    }
  ],

  // ==========================================
  // 👨‍💼 4. COMPTABLE (Service Financier & Recouvrement)
  // ==========================================
  accountant: [
    {
      title: 'DIRECTION FINANCIÈRE',
      items: [
        { label: 'Vue financière & Trésorerie', href: '/accountant/dashboard', icon: LayoutDashboard },
      ]
    },
    {
      title: 'RECOUVREMENT & SCOLARITÉ',
      items: [
        { label: 'Enregistrer un paiement', href: '/accountant/payments/create', icon: Calculator },
        { label: 'Journal des encaissements', href: '/accountant/payments', icon: Receipt },
        { label: 'Émission de Reçus', href: '/accountant/receipts', icon: Printer },
        { label: 'Relance Impayés (SMS/WhatsApp)', href: '/accountant/payments/unpaid', icon: AlertCircle },
        { label: 'Échéances des Tranches', href: '/accountant/payments/installments', icon: Calendar },
      ]
    },
    {
      title: 'TRÉSORERIE & DÉPENSES',
      items: [
        { label: 'Trésorerie & Caisses', href: '/accountant/treasury', icon: DollarSign },
        { label: 'Dépenses & Décaissements', href: '/accountant/expenses', icon: TrendingUp },
        { label: 'Gestion Fournisseurs', href: '/accountant/suppliers', icon: Building2 },
        { label: 'Salaires & Paie', href: '/accountant/payroll', icon: Users },
        { label: 'Suivi Budgétaire', href: '/accountant/budget', icon: BarChart3 },
        { label: 'Immobilisations & Actifs', href: '/accountant/fixed-assets', icon: School },
      ]
    },
    {
      title: 'COMPTABILITÉ GÉNÉRALE',
      items: [
        { label: 'Journal comptable', href: '/accountant/ledger', icon: BookOpen },
        { label: 'Balance & Grand Livre', href: '/accountant/trial-balance', icon: Scale },
        { label: 'Clôture & Rapprochement bancaire', href: '/accountant/closing', icon: Lock },
      ]
    },
    {
      title: 'RAPPORTS & ÉTATS',
      items: [
        { label: 'États financiers officiels', href: '/accountant/financial-statements', icon: FileBarChart },
        { label: 'Rapport journalier de caisse', href: '/accountant/reports/daily', icon: FileText },
        { label: "Rapport mensuel d'activité", href: '/accountant/reports/monthly', icon: BarChart3 },
        { label: 'Statistiques financières', href: '/accountant/statistics', icon: TrendingUp },
      ]
    },
    {
      title: 'MON COMPTE',
      items: [
        { label: 'Paramètres financiers', href: '/accountant/settings', icon: Settings },
        { label: 'Guide & Manuel', href: '/guide', icon: HelpCircle },
      ]
    }
  ],

  // ==========================================
  // 👨‍🏫 5. ENSEIGNANT (Corps Professoral)
  // ==========================================
  teacher: [
    {
      title: 'MON ESPACE PÉDAGOGIQUE',
      items: [
        { label: 'Mes cours du jour', href: '/teacher/dashboard', icon: LayoutDashboard },
        { label: 'Emploi du temps', href: '/teacher/schedule', icon: Calendar },
      ]
    },
    {
      title: 'GESTION DES CLASSES',
      items: [
        { label: 'Liste de mes cours', href: '/teacher/courses', icon: BookOpen },
        { label: 'Mes étudiants inscrits', href: '/teacher/students', icon: Users },
        { label: 'Supports & Devoirs déposés', href: '/teacher/materials', icon: FileText },
        { label: "Faire l'appel (Présences)", href: '/teacher/attendance', icon: UserCheck },
      ]
    },
    {
      title: 'ÉVALUATIONS & NOTES',
      items: [
        { label: 'Saisie des notes CC & Examens', href: '/teacher/grades/entry', icon: Edit3 },
        { label: "Documents & Feuilles d'examen", href: '/teacher/documents', icon: FileText },
      ]
    },
    {
      title: 'ASSISTANT & OUTILS',
      items: [
        { label: 'Assistant Pédagogique IA', href: '/teacher/ai-assistant', icon: BrainCircuit },
        { label: 'Messagerie interne', href: '/teacher/messages', icon: MessageSquare },
      ]
    },
    {
      title: 'MON COMPTE',
      items: [
        { label: 'Mon Profil Enseignant', href: '/teacher/profile', icon: User },
        { label: 'Paramètres', href: '/teacher/settings', icon: Settings },
        { label: 'Guide & Manuel', href: '/guide', icon: HelpCircle },
      ]
    }
  ],

  // ==========================================
  // 👨‍🎓 6. ÉTUDIANT (Portail Étudiant)
  // ==========================================
  student: [
    {
      title: 'MON ESPACE ÉTUDIANT',
      items: [
        { label: 'Tableau de bord', href: '/student/dashboard', icon: LayoutDashboard },
        { label: 'Mon profil', href: '/student/profile', icon: User },
        { label: 'Ma Carte Étudiante QR', href: '/student/card', icon: CreditCard },
      ]
    },
    {
      title: 'SUIVI PÉDAGOGIQUE',
      items: [
        { label: 'Mes cours & Supports PDF', href: '/student/courses', icon: BookOpen },
        { label: 'Mon emploi du temps', href: '/student/schedule', icon: Calendar },
        { label: 'Présences & Pointages', href: '/student/attendance', icon: ClipboardList },
      ]
    },
    {
      title: 'RÉSULTATS & DOCUMENTS',
      items: [
        { label: 'Mes notes semestrielles', href: '/student/grades', icon: FileText },
        { label: 'Mes attestations officielles', href: '/student/certificates', icon: FileCheck },
        { label: 'Demandes administratives', href: '/student/requests', icon: FileSearch },
        { label: 'Dossier administratif', href: '/student/files', icon: Folder },
      ]
    },
    {
      title: 'FINANCES & SCOLARITÉ',
      items: [
        { label: 'Mes paiements scolarité', href: '/student/payments', icon: Calculator },
        { label: 'Mes reçus certifiés', href: '/student/receipts', icon: Receipt },
      ]
    },
    {
      title: 'COMMUNAUTÉ & RÉSEAU',
      items: [
        { label: 'Annonces officielles', href: '/student/announcements', icon: Megaphone },
        { label: 'Messagerie interne', href: '/student/messages', icon: MessageSquare },
        { label: 'Réseau Alumni & Mentorat', href: '/student/alumni', icon: GraduationCap },
      ]
    },
    {
      title: 'PARAMÈTRES',
      items: [
        { label: 'Paramètres du compte', href: '/student/settings', icon: Settings },
        { label: 'Guide & Manuel', href: '/guide', icon: HelpCircle },
      ]
    }
  ],

  // ==========================================
  // 🛡️ 7. GARDIEN (Portique & Contrôle d'Accès)
  // ==========================================
  guard: [
    {
      title: 'POSTE DE CONTRÔLE',
      items: [
        { label: 'Accueil & Portique', href: '/guard/dashboard', icon: LayoutDashboard },
        { label: 'Scanner QR Code officiel', href: '/guard/scanner', icon: QrCode },
      ]
    },
    {
      title: 'SUIVI DES ENTRÉES',
      items: [
        { label: 'Pointages du jour', href: '/guard/attendance/today', icon: CheckCircle },
        { label: 'Historique des passages', href: '/guard/attendance/history', icon: FileText },
      ]
    },
    {
      title: 'SÉCURITÉ & RAPPORTS',
      items: [
        { label: 'Registre des incidents', href: '/guard/incidents', icon: AlertTriangle },
        { label: 'Statistiques de fréquentation', href: '/guard/statistics', icon: BarChart3 },
      ]
    },
    {
      title: 'MON COMPTE',
      items: [
        { label: 'Profil de poste', href: '/guard/profile', icon: UserCog },
        { label: 'Paramètres', href: '/guard/settings', icon: Settings },
        { label: 'Guide & Manuel', href: '/guide', icon: HelpCircle },
      ]
    }
  ],

  // ==========================================
  // 🎓 8. ALUMNI (Réseau des Anciens & Mentorat)
  // ==========================================
  alumni: [
    {
      title: 'ESPACE DIPLÔMÉ',
      items: [
        { label: 'Tableau de bord', href: '/alumni/dashboard', icon: LayoutDashboard },
        { label: 'Mon profil certifié', href: '/alumni/profile', icon: Award },
      ]
    },
    {
      title: 'MENTORAT & PARTAGE',
      items: [
        { label: 'Étudiants mentorés', href: '/alumni/students', icon: GraduationCap },
        { label: 'Demandes de mentorat', href: '/alumni/requests', icon: Bell },
      ]
    },
    {
      title: 'COMMUNICATION & RÉSEAU',
      items: [
        { label: 'Messagerie privée', href: '/alumni/messages', icon: MessageSquare },
        { label: 'Paramètres', href: '/alumni/settings', icon: Settings },
        { label: 'Guide & Manuel', href: '/guide', icon: HelpCircle },
      ]
    }
  ],

  // ==========================================
  // 🛡️ 9. SUPER ADMIN (Gestionnaire Plateforme SaaS)
  // ==========================================
  superadmin: [
    {
      title: 'PILOTAGE SAAS',
      items: [
        { label: "Vue d'ensemble", href: '/superadmin/dashboard', icon: LayoutDashboard },
      ]
    },
    {
      title: 'DÉMONSTRATION COMMERCIALE',
      items: [
        { label: 'Univ_Demo', href: '/superadmin/demo', icon: Sparkles, badge: '8 Rôles' },
      ]
    },
    {
      title: 'FLOTTE DES UNIVERSITÉS',
      items: [
        { label: 'Universités clientes', href: '/superadmin/universities', icon: Building2 },
        { label: 'Créer un établissement', href: '/superadmin/universities/new', icon: UserPlus },
      ]
    },
    {
      title: 'FACTURATION & LICENCES',
      items: [
        { label: 'Tarifs & Abonnements SaaS', href: '/superadmin/plans', icon: DollarSign },
        { label: 'Factures clients', href: '/superadmin/invoices', icon: FileText },
        { label: 'Encaissements reçus', href: '/superadmin/payments', icon: Receipt },
      ]
    },
    {
      title: 'INFRASTRUCTURE & SÉCURITÉ',
      items: [
        { label: 'Centre Sauvegarde Cloud Nocturne', href: '/superadmin/database', icon: Database },
        { label: 'Pannes & Incidents système', href: '/superadmin/incidents', icon: AlertTriangle },
        { label: 'Sécurité & Audit Global', href: '/superadmin/audit', icon: Shield },
      ]
    },
    {
      title: 'RELATION CLIENT & SUPPORT',
      items: [
        { label: 'Support & Messagerie client', href: '/superadmin/messages', icon: MessageSquare },
        { label: 'Centre de notifications', href: '/superadmin/notifications', icon: Bell },
      ]
    },
    {
      title: 'PARAMÈTRES SAAS',
      items: [
        { label: 'Mon Profil SuperAdmin', href: '/superadmin/profile', icon: User },
        { label: 'Configuration SaaS', href: '/superadmin/settings', icon: Settings },
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

        {/* En-tête de la Sidebar - SaaS Modern Style */}
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
                      // 🛑 SÉCURITÉ ABSOLUE : Seul le Super Admin est autorisé à voir l'espace démo
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
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              item.badge === 'urgent' ? 'bg-rose-500 text-white animate-pulse' : 'bg-white/20 text-white'
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