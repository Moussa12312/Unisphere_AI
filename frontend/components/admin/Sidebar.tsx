'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, Users, GraduationCap, UserCheck, UserCog,
  BookOpen, FileText, Calendar, Calculator, CreditCard,
  Bell, BarChart3, Bot, Settings, ChevronDown, ChevronRight,
  Upload, CheckCircle, Award, TrendingUp, MessageSquare,
  ClipboardList, Receipt, AlertCircle, FileCheck, School, Building2, DollarSign, Shield,
  QrCode, Edit3, Clock, AlertTriangle, RotateCcw, FileBarChart,
  BrainCircuit, UserPlus, Folder, Users2, ScrollText, FileSearch, Scale
} from 'lucide-react';
import { authService } from '@/services/authService';
import { useRouter } from 'next/navigation';
import { useUniversityLogo } from '@/hooks/useUniversityLogo';

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
        { label: 'Enseignants', href: '/admin/teachers', icon: GraduationCap },
        { label: 'Cours', href: '/admin/courses', icon: BookOpen },
        { label: 'Notes & Résultats', href: '/admin/grades', icon: FileText },
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
      title: 'FINANCES',
      items: [
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
      title: 'PARAMÈTRES',
      items: [
        { label: 'Profil Université', href: '/admin/settings', icon: Building2 },
        { label: 'Configuration', href: '/admin/settings/config', icon: GraduationCap },
        { label: 'Sécurité & Audit', href: '/admin/settings/security', icon: Shield },
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
        { label: 'Dossiers', href: '/secretary/students/files', icon: Folder }, // ✅ CORRIGÉ
      ]
    },

    {
      title: 'PÉDAGOGIE',
      items: [
        { label: 'Enseignants', href: '/secretary/teachers', icon: GraduationCap },
        { label: 'Classes', href: '/secretary/classes', icon: Users2 },
        { label: 'Cours & Matières', href: '/secretary/courses', icon: BookOpen },
        { label: 'Emploi du temps', href: '/secretary/schedule', icon: Calendar },
      ]
    },

    {
      title: 'NOTES',
      items: [
        { label: 'Saisie des notes', href: '/secretary/grades/entry', icon: Edit3 },
        { label: 'Sessions d\'examens', href: '/secretary/exam-sessions', icon: FileText },
        { label: 'Bulletins', href: '/secretary/grades/report-cards', icon: FileCheck },
      ]
    },

    {
      title: 'DOCUMENTS',
      items: [
        { label: 'Générer documents', href: '/secretary/documents/generate', icon: FileCheck },
        { label: 'Mes documents', href: '/secretary/documents', icon: FileText },
        { label: 'Upload Cours PDF', href: '/secretary/upload-materials', icon: Upload },
      ]
    },

    {
      title: 'COMMUNICATION',
      items: [
        { label: 'Annonces', href: '/secretary/announcements', icon: Bell },
        { label: 'Messages', href: '/secretary/messages', icon: MessageSquare },
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
        { label: 'Vue d\'ensemble', href: '/censeur/dashboard', icon: LayoutDashboard},
      ]
    },

    {
      title: 'NOTES',
      items: [
        { label: 'Saisie des notes', href: '/censeur/grades/entry', icon: Edit3 },
        { label: 'Notes à valider', href: '/censeur/grades/pending', icon: CheckCircle, badge: 'urgent' },
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
        { label: 'Configuration anomalies', href: '/censeur/settings/anomalies', icon: Settings },  // ✅ NOUVEAU
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
      title: 'PAIEMENTS',
      items: [
        { label: 'Enregistrer paiement', href: '/accountant/payments/create', icon: Calculator },
        { label: 'Historique paiements', href: '/accountant/payments', icon: Receipt },
        { label: 'Échéances', href: '/accountant/payments/installments', icon: Calendar },
        { label: 'Impayés', href: '/accountant/payments/unpaid', icon: AlertCircle },
      ]
    },

    {
      title: 'RAPPORTS',
      items: [
        { label: 'Rapport journalier', href: '/accountant/reports/daily', icon: FileText },
        { label: 'Rapport mensuel', href: '/accountant/reports/monthly', icon: BarChart3 },
        { label: 'Statistiques', href: '/accountant/statistics', icon: TrendingUp },
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
      title: 'PARAMÈTRES',
      items: [
        { label: 'Profil ', href: '/student/profile', icon: Building2 },
        { label: 'paramètre', href: '/student/settings', icon: Shield },
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
    }
  ]
};

export default function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const menu = MENU_CONFIG[userRole] || MENU_CONFIG.admin;
  const [expandedSections, setExpandedSections] = useState<string[]>(
    menu.map(section => section.title)
  );
  
  const { logoUrl, universityName, slogan, loading } = useUniversityLogo();
  const [currentUser, setCurrentUser] = useState<any>(null);

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

  const handleLogout = () => {
    authService.logout();
    router.push('/login');
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
      default: return 'Utilisateur';
    }
  };

  return (
    <aside className="h-screen w-58 bg-[#0a1628] text-white flex flex-col overflow-hidden">
      
      {/* En-tête de la Sidebar */}
      <div className="p-0 border-b border-white/10">
        <div className="flex items-center">
          <div className="flex items-left justify-center">
            <img 
              src={logoUrl?.startsWith('http') ? logoUrl : `http://localhost:8000/uploads/logos/${logoUrl}`}
              alt="Logo Université" 
              className="object-contain -mb-6 -ml-5 -mr-3"
              style={{ width: '120px', height: '90px'}}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white leading-tight line-clamp-2 tracking-tight p-1">
              {universityName}
            </h1>
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
                        className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                          isActive
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

      {/* USER PROFILE et Slogan */}
      <div className="border-t border-white/10 bg-[#0a1628] flex-shrink-0 p-1 mb-3">
        <div className="flex items-center gap-3 pl-1 -m-1">
          <div className="w-10 h-10 bg-[#FF6B00] rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
            {currentUser?.full_name?.charAt(0).toUpperCase() || userRole.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {currentUser?.full_name || getRoleLabel()}
            </p>
            <p className="text-xs text-slate-400 truncate">
              {currentUser?.email || 'Non connecté'}
            </p>
          </div>
        </div>
        
        <div className="text-center p-1 mt-3 border-t border-white/10">
          <p className="text-xs text-slate-500">
            Propulsé par <span className="text-[#FF6B00] font-semibold">UniSphere AI</span>
          </p>
        </div>
      </div>
    </aside>
  );
}