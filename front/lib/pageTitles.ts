import {
    LayoutDashboard, Users, BookOpen, Calendar, FileText, Calculator,
    CreditCard, MessageSquare, Bell, Settings, GraduationCap, Shield,
    ClipboardList, Receipt, FileCheck, Folder, Award, User, Mail,
    Wallet, Banknote, BookMarked, FileSearch, Briefcase, Heart,
    Building2, KeyRound, Globe, AlertTriangle, QrCode, FileSpreadsheet,
    Book, Clock, BarChart3, Handshake, ScrollText, Library, MapPin,
    Pencil, Plus, Eye, Camera, UserPlus, Edit3, Trash2
  } from 'lucide-react';
  
  export interface PageTitle {
    title: string;
    subtitle?: string;
    icon: any;
    color?: string;
  }
  
  // ==========================================
  // CONFIGURATION DES ROUTES STATIQUES
  // ==========================================
  export const pageTitles: Record<string, PageTitle> = {
    // ==========================================
    // ADMIN - Pages principales
    // ==========================================
    '/admin/dashboard': { title: 'Dashboard Admin', subtitle: 'Vue d\'ensemble de votre université', icon: LayoutDashboard },
    '/admin/students': { title: 'Gestion des étudiants', subtitle: 'Inscriptions et dossiers étudiants', icon: Users },
    '/admin/students/[Id]': { title: 'Nouvel étudiant', subtitle: 'Inscrire un nouvel étudiant', icon: UserPlus },
    '/admin/students/create': { title: 'Nouvel étudiant', subtitle: 'Inscrire un nouvel étudiant', icon: UserPlus },
    '/admin/teachers/[Id]': { title: 'Scan de documents', subtitle: 'Scanner les documents étudiants', icon: Camera },
    '/admin/teachers': { title: 'Gestion des enseignants', subtitle: 'Corps professoral', icon: Briefcase },
    '/admin/teachers/create': { title: 'Nouvel enseignant', subtitle: 'Ajouter un enseignant', icon: UserPlus },
    '/admin/courses/[Id]': { title: 'Gestion des classes', subtitle: 'Salles et groupes', icon: User },
    '/admin/courses': { title: 'Gestion des cours', subtitle: 'Programmes pédagogiques', icon: BookOpen },
    '/admin/courses/create': { title: 'Nouveau cours', subtitle: 'Créer un cours', icon: Plus },
    '/admin/schedules': { title: 'Emplois du temps', subtitle: 'Planification des cours', icon: Calendar },
    '/admin/grades': { title: 'Gestion des notes', subtitle: 'Évaluations et résultats', icon: FileText },
    '/admin/exam-sessions': { title: 'Sessions d\'examens', subtitle: 'Planification des examens', icon: ClipboardList },
    '/admin/exam-sessions/new': { title: 'Nouvelle session', subtitle: 'Créer une session d\'examen', icon: Plus },
    '/admin/financial-reports': { title: 'Gestion financière', subtitle: 'Revenus et paiements', icon: Calculator },
    '/admin/payments': { title: 'Paiements', subtitle: 'Suivi des paiements', icon: CreditCard },
    '/admin/payments/new': { title: 'Nouveau paiement', subtitle: 'Enregistrer un paiement', icon: Plus },
    '/admin/payment-deadlines': { title: 'Échéances de paiement', subtitle: 'Calendrier des paiements', icon: Clock },
    '/admin/payment-tranches': { title: 'Tranches de paiement', subtitle: 'Configuration des tranches', icon: Wallet },
    '/admin/academic-fees': { title: 'Frais académiques', subtitle: 'Tarification par filière', icon: Banknote },
    '/admin/announcements': { title: 'Annonces', subtitle: 'Communication officielle', icon: Bell },
    '/admin/announcements/new': { title: 'Nouvelle annonce', subtitle: 'Créer une annonce', icon: Plus },
    '/admin/messages': { title: 'Messagerie', subtitle: 'Boîte de réception', icon: MessageSquare },
    '/admin/certificates': { title: 'Attestations', subtitle: 'Demandes et documents', icon: FileCheck },
    '/admin/documents': { title: 'Documents', subtitle: 'Gestion documentaire', icon: Folder },
    '/admin/attendance': { title: 'Présences', subtitle: 'Suivi des présences', icon: ClipboardList },
    '/admin/qr-scanner': { title: 'Scanner QR', subtitle: 'Scan des cartes étudiantes', icon: QrCode },
    '/admin/incidents': { title: 'Incidents', subtitle: 'Rapports et suivi', icon: AlertTriangle },
    '/admin/incidents/new': { title: 'Nouvel incident', subtitle: 'Signaler un incident', icon: Plus },
    '/admin/censors': { title: 'Gestion des censeurs', subtitle: 'Comptes censeurs', icon: Shield },
    '/admin/ai-assistant': { title: 'Assistant IA', subtitle: 'Intelligence artificielle', icon: Globe },
    '/admin/security': { title: 'Sécurité', subtitle: 'Audit et protection', icon: Shield },
    '/admin/settings': { title: 'Paramètres', subtitle: 'Configuration de l\'université', icon: Settings },
    '/admin/alumni': { title: 'Gestion Alumni', subtitle: 'Communauté des anciens', icon: Award },
    '/admin/reports': { title: 'Rapports', subtitle: 'Statistiques et analyses', icon: BarChart3 },
    '/admin/profile': { title: 'Mon profil', subtitle: 'Informations personnelles', icon: User },
  
    // ==========================================
    // SECRETARY
    // ==========================================
    '/secretary/dashboard': { title: 'Dashboard Secrétaire', subtitle: 'Vue d\'ensemble', icon: LayoutDashboard },
    '/secretary/students': { title: 'Gestion des étudiants', subtitle: 'Inscriptions et dossiers', icon: Users },
    '/secretary/students/new': { title: 'Nouvel étudiant', subtitle: 'Inscrire un étudiant', icon: UserPlus },
    '/secretary/registrations': { title: 'Nouvelles inscriptions', subtitle: 'Traitement des demandes', icon: FileText },
    '/secretary/certificates': { title: 'Attestations', subtitle: 'Demandes en cours', icon: FileCheck },
    '/secretary/documents-validation': { title: 'Validation des documents', subtitle: 'Documents à vérifier', icon: Folder },
    '/secretary/announcements': { title: 'Annonces', subtitle: 'Communication', icon: Bell },
    '/secretary/messages': { title: 'Messagerie', subtitle: 'Boîte de réception', icon: MessageSquare },
    '/secretary/profile': { title: 'Mon profil', subtitle: 'Informations personnelles', icon: User },
    '/secretary/settings': { title: 'Paramètres', subtitle: 'Configuration du compte', icon: Settings },
  
    // ==========================================
    // TEACHER
    // ==========================================
    '/teacher/dashboard': { title: 'Dashboard Enseignant', subtitle: 'Vue d\'ensemble', icon: LayoutDashboard },
    '/teacher/courses': { title: 'Mes cours', subtitle: 'Cours assignés', icon: BookOpen },
    '/teacher/grades': { title: 'Saisie des notes', subtitle: 'Évaluations', icon: FileText },
    '/teacher/schedule': { title: 'Mon emploi du temps', subtitle: 'Planning des cours', icon: Calendar },
    '/teacher/attendance': { title: 'Présences', subtitle: 'Appel des étudiants', icon: ClipboardList },
    '/teacher/materials': { title: 'Supports de cours', subtitle: 'Documents pédagogiques', icon: BookMarked },
    '/teacher/materials/new': { title: 'Nouveau support', subtitle: 'Uploader un document', icon: Plus },
    '/teacher/messages': { title: 'Messagerie', subtitle: 'Boîte de réception', icon: MessageSquare },
    '/teacher/profile': { title: 'Mon profil', subtitle: 'Informations personnelles', icon: User },
  
    // ==========================================
    // STUDENT
    // ==========================================
    '/student/dashboard': { title: 'Dashboard Étudiant', subtitle: 'Bienvenue dans votre espace', icon: LayoutDashboard },
    '/student/courses': { title: 'Mes cours', subtitle: 'Supports de cours PDF', icon: BookOpen },
    '/student/grades': { title: 'Mes notes', subtitle: 'Résultats et moyennes', icon: FileText },
    '/student/schedule': { title: 'Mon emploi du temps', subtitle: 'Planning de la semaine', icon: Calendar },
    '/student/attendance': { title: 'Mes présences', subtitle: 'Historique de présence', icon: ClipboardList },
    '/student/payments': { title: 'Mes paiements', subtitle: 'Suivi des paiements', icon: Calculator },
    '/student/receipts': { title: 'Mes reçus', subtitle: 'Reçus de paiement', icon: Receipt },
    '/student/card': { title: 'Carte étudiante', subtitle: 'Votre carte numérique', icon: CreditCard },
    '/student/certificates': { title: 'Attestations', subtitle: 'Documents officiels', icon: FileCheck },
    '/student/requests': { title: 'Mes demandes', subtitle: 'Demandes de documents', icon: FileSearch },
    '/student/requests/new': { title: 'Nouvelle demande', subtitle: 'Demander un document', icon: Plus },
    '/student/files': { title: 'Mes dossiers', subtitle: 'Documents administratifs', icon: Folder },
    '/student/alumni': { title: 'Communauté Alumni', subtitle: 'Réseau des anciens', icon: Award },
    '/student/messages': { title: 'Messagerie', subtitle: 'Boîte de réception', icon: MessageSquare },
    '/student/profile': { title: 'Mon profil', subtitle: 'Informations personnelles', icon: User },
    '/student/settings': { title: 'Paramètres', subtitle: 'Personnalisation', icon: Settings },
  
    // ==========================================
    // CENSEUR
    // ==========================================
    '/censeur/dashboard': { title: 'Dashboard Censeur', subtitle: 'Vue d\'ensemble', icon: LayoutDashboard },
    '/censeur/grades': { title: 'Validation des notes', subtitle: 'Notes à valider', icon: FileCheck },
    '/censeur/reports': { title: 'Rapports', subtitle: 'Statistiques académiques', icon: BarChart3 },
    '/censeur/incidents': { title: 'Incidents', subtitle: 'Suivi des incidents', icon: AlertTriangle },
    '/censeur/messages': { title: 'Messagerie', subtitle: 'Boîte de réception', icon: MessageSquare },
    '/censeur/profile': { title: 'Mon profil', subtitle: 'Informations personnelles', icon: User },
  
    // ==========================================
    // ACCOUNTANT
    // ==========================================
    '/accountant/dashboard': { title: 'Dashboard Comptable', subtitle: 'Vue financière', icon: LayoutDashboard },
    '/accountant/payments': { title: 'Paiements', subtitle: 'Encaissements', icon: CreditCard },
    '/accountant/reports': { title: 'Rapports financiers', subtitle: 'Analyses', icon: BarChart3 },
    '/accountant/messages': { title: 'Messagerie', subtitle: 'Boîte de réception', icon: MessageSquare },
    '/accountant/profile': { title: 'Mon profil', subtitle: 'Informations personnelles', icon: User },
  
    // ==========================================
    // GUARD
    // ==========================================
    '/guard/dashboard': { title: 'Dashboard Gardien', subtitle: 'Vue d\'ensemble', icon: LayoutDashboard },
    '/guard/incidents': { title: 'Incidents', subtitle: 'Signalements', icon: AlertTriangle },
    '/guard/messages': { title: 'Messagerie', subtitle: 'Boîte de réception', icon: MessageSquare },
    '/guard/profile': { title: 'Mon profil', subtitle: 'Informations personnelles', icon: User },
  
    // ==========================================
    // ALUMNI
    // ==========================================
    '/alumni/dashboard': { title: 'Dashboard Alumni', subtitle: 'Votre espace ancien', icon: LayoutDashboard },
    '/alumni/profile': { title: 'Mon profil Alumni', subtitle: 'Parcours et expériences', icon: User },
    '/alumni/requests': { title: 'Demandes de mentorat', subtitle: 'Étudiants à encadrer', icon: Handshake },
    '/alumni/students': { title: 'Mes étudiants', subtitle: 'Étudiants mentorés', icon: Users },
    '/alumni/messages': { title: 'Messagerie Alumni', subtitle: 'Conversations', icon: MessageSquare },
  
    // ==========================================
    // PAGES PUBLIQUES
    // ==========================================
    '/login': { title: 'Connexion', subtitle: 'Accédez à votre espace', icon: KeyRound },
    '/register': { title: 'Inscription', subtitle: 'Créer un compte', icon: UserPlus },
    '/register-alumni': { title: 'Inscription Alumni', subtitle: 'Rejoindre la communauté', icon: Award },
    '/forgot-password': { title: 'Mot de passe oublié', subtitle: 'Réinitialisation', icon: KeyRound },
  };
  
  // ==========================================
  // PATTERNS DE ROUTES DYNAMIQUES
  // ==========================================
  interface DynamicRoutePattern {
    pattern: RegExp;
    getTitle: (matches: RegExpMatchArray, segments: string[]) => PageTitle;
  }
  
  const dynamicPatterns: DynamicRoutePattern[] = [
    // ==========================================
    // ÉTUDIANTS - Routes dynamiques
    // ==========================================
    {
      pattern: /^\/admin\/students\/(\d+)\/edit$/,
      getTitle: () => ({ title: 'Modifier l\'étudiant', subtitle: 'Édition du dossier étudiant', icon: Edit3 })
    },
    {
      pattern: /^\/admin\/students\/(\d+)\/view$/,
      getTitle: () => ({ title: 'Dossier étudiant', subtitle: 'Détail du dossier', icon: Eye })
    },
    {
      pattern: /^\/admin\/students\/(\d+)\/documents$/,
      getTitle: () => ({ title: 'Documents étudiant', subtitle: 'Dossier administratif', icon: Folder })
    },
    {
      pattern: /^\/admin\/students\/(\d+)\/payments$/,
      getTitle: () => ({ title: 'Paiements étudiant', subtitle: 'Historique financier', icon: CreditCard })
    },
    {
      pattern: /^\/admin\/students\/(\d+)\/grades$/,
      getTitle: () => ({ title: 'Notes étudiant', subtitle: 'Résultats académiques', icon: FileText })
    },
    {
      pattern: /^\/admin\/students\/(\d+)\/attendance$/,
      getTitle: () => ({ title: 'Présences étudiant', subtitle: 'Historique de présence', icon: ClipboardList })
    },
    {
      pattern: /^\/admin\/students\/(\d+)\/schedule$/,
      getTitle: () => ({ title: 'Emploi du temps', subtitle: 'Planning de l\'étudiant', icon: Calendar })
    },
    {
      pattern: /^\/admin\/students\/(\d+)\/card$/,
      getTitle: () => ({ title: 'Carte étudiante', subtitle: 'Génération de carte', icon: CreditCard })
    },
    {
      pattern: /^\/admin\/students\/(\d+)$/,
      getTitle: () => ({ title: 'Détail étudiant', subtitle: 'Profil complet', icon: User })
    },
  
    // ==========================================
    // ENSEIGNANTS - Routes dynamiques
    // ==========================================
    {
      pattern: /^\/admin\/teachers\/(\d+)\/edit$/,
      getTitle: () => ({ title: 'Modifier l\'enseignant', subtitle: 'Édition du profil', icon: Edit3 })
    },
    {
      pattern: /^\/admin\/teachers\/(\d+)\/courses$/,
      getTitle: () => ({ title: 'Cours de l\'enseignant', subtitle: 'Cours assignés', icon: BookOpen })
    },
    {
      pattern: /^\/admin\/teachers\/(\d+)\/schedule$/,
      getTitle: () => ({ title: 'Emploi du temps', subtitle: 'Planning enseignant', icon: Calendar })
    },
    {
      pattern: /^\/admin\/teachers\/(\d+)$/,
      getTitle: () => ({ title: 'Détail enseignant', subtitle: 'Profil complet', icon: Briefcase })
    },
  
    // ==========================================
    // COURS - Routes dynamiques
    // ==========================================
    {
      pattern: /^\/admin\/courses\/(\d+)\/edit$/,
      getTitle: () => ({ title: 'Modifier le cours', subtitle: 'Édition du cours', icon: Edit3 })
    },
    {
      pattern: /^\/admin\/courses\/(\d+)\/students$/,
      getTitle: () => ({ title: 'Étudiants du cours', subtitle: 'Liste des inscrits', icon: Users })
    },
    {
      pattern: /^\/admin\/courses\/(\d+)\/materials$/,
      getTitle: () => ({ title: 'Supports du cours', subtitle: 'Documents pédagogiques', icon: BookMarked })
    },
    {
      pattern: /^\/admin\/courses\/(\d+)\/grades$/,
      getTitle: () => ({ title: 'Notes du cours', subtitle: 'Évaluations', icon: FileText })
    },
    {
      pattern: /^\/admin\/courses\/(\d+)$/,
      getTitle: () => ({ title: 'Détail du cours', subtitle: 'Informations complètes', icon: BookOpen })
    },
  
    // ==========================================
    // CLASSES - Routes dynamiques
    // ==========================================
    {
      pattern: /^\/admin\/classes\/(\d+)\/edit$/,
      getTitle: () => ({ title: 'Modifier la classe', subtitle: 'Édition de la classe', icon: Edit3 })
    },
    {
      pattern: /^\/admin\/classes\/(\d+)\/students$/,
      getTitle: () => ({ title: 'Étudiants de la classe', subtitle: 'Liste des étudiants', icon: Users })
    },
    {
      pattern: /^\/admin\/classes\/(\d+)\/schedule$/,
      getTitle: () => ({ title: 'Emploi du temps', subtitle: 'Planning de la classe', icon: Calendar })
    },
    {
      pattern: /^\/admin\/classes\/(\d+)$/,
      getTitle: () => ({ title: 'Détail de la classe', subtitle: 'Informations complètes', icon: Building2 })
    },
  
    // ==========================================
    // SESSIONS D'EXAMEN - Routes dynamiques
    // ==========================================
    {
      pattern: /^\/admin\/exam-sessions\/(\d+)\/edit$/,
      getTitle: () => ({ title: 'Modifier la session', subtitle: 'Édition de session', icon: Edit3 })
    },
    {
      pattern: /^\/admin\/exam-sessions\/(\d+)\/grades$/,
      getTitle: () => ({ title: 'Notes de la session', subtitle: 'Résultats d\'examen', icon: FileText })
    },
    {
      pattern: /^\/admin\/exam-sessions\/(\d+)$/,
      getTitle: () => ({ title: 'Détail session', subtitle: 'Session d\'examen', icon: ClipboardList })
    },
  
    // ==========================================
    // PAIEMENTS - Routes dynamiques
    // ==========================================
    {
      pattern: /^\/admin\/payments\/(\d+)\/edit$/,
      getTitle: () => ({ title: 'Modifier le paiement', subtitle: 'Édition du paiement', icon: Edit3 })
    },
    {
      pattern: /^\/admin\/payments\/(\d+)\/receipt$/,
      getTitle: () => ({ title: 'Reçu de paiement', subtitle: 'Détail du reçu', icon: Receipt })
    },
    {
      pattern: /^\/admin\/payments\/(\d+)$/,
      getTitle: () => ({ title: 'Détail paiement', subtitle: 'Transaction', icon: CreditCard })
    },
  
    // ==========================================
    // ANNONCES - Routes dynamiques
    // ==========================================
    {
      pattern: /^\/admin\/announcements\/(\d+)\/edit$/,
      getTitle: () => ({ title: 'Modifier l\'annonce', subtitle: 'Édition de l\'annonce', icon: Edit3 })
    },
    {
      pattern: /^\/admin\/announcements\/(\d+)$/,
      getTitle: () => ({ title: 'Détail annonce', subtitle: 'Annonce complète', icon: Bell })
    },
  
    // ==========================================
    // INCIDENTS - Routes dynamiques
    // ==========================================
    {
      pattern: /^\/admin\/incidents\/(\d+)\/edit$/,
      getTitle: () => ({ title: 'Modifier l\'incident', subtitle: 'Suivi de l\'incident', icon: Edit3 })
    },
    {
      pattern: /^\/admin\/incidents\/(\d+)$/,
      getTitle: () => ({ title: 'Détail incident', subtitle: 'Rapport d\'incident', icon: AlertTriangle })
    },
  
    // ==========================================
    // CENSEURS - Routes dynamiques
    // ==========================================
    {
      pattern: /^\/admin\/censors\/(\d+)\/edit$/,
      getTitle: () => ({ title: 'Modifier le censeur', subtitle: 'Édition du compte', icon: Edit3 })
    },
    {
      pattern: /^\/admin\/censors\/(\d+)$/,
      getTitle: () => ({ title: 'Détail censeur', subtitle: 'Profil censeur', icon: Shield })
    },
  
    // ==========================================
    // ATTESTATIONS - Routes dynamiques
    // ==========================================
    {
      pattern: /^\/admin\/certificates\/(\d+)\/edit$/,
      getTitle: () => ({ title: 'Modifier l\'attestation', subtitle: 'Édition du document', icon: Edit3 })
    },
    {
      pattern: /^\/admin\/certificates\/(\d+)\/download$/,
      getTitle: () => ({ title: 'Télécharger l\'attestation', subtitle: 'Document PDF', icon: FileCheck })
    },
    {
      pattern: /^\/admin\/certificates\/(\d+)$/,
      getTitle: () => ({ title: 'Détail attestation', subtitle: 'Demande d\'attestation', icon: FileCheck })
    },
  
    // ==========================================
    // ALUMNI - Routes dynamiques
    // ==========================================
    {
      pattern: /^\/admin\/alumni\/(\d+)\/edit$/,
      getTitle: () => ({ title: 'Modifier l\'alumni', subtitle: 'Édition du profil', icon: Edit3 })
    },
    {
      pattern: /^\/admin\/alumni\/(\d+)$/,
      getTitle: () => ({ title: 'Détail alumni', subtitle: 'Profil alumni', icon: Award })
    },
    {
      pattern: /^\/alumni\/students\/(\d+)$/,
      getTitle: () => ({ title: 'Détail étudiant', subtitle: 'Profil de l\'étudiant mentoré', icon: User })
    },
    {
      pattern: /^\/student\/alumni\/(\d+)$/,
      getTitle: () => ({ title: 'Profil Alumni', subtitle: 'Parcours de l\'alumni', icon: Award })
    },
  
    // ==========================================
    // ÉTUDIANT - Routes dynamiques
    // ==========================================
    {
      pattern: /^\/student\/receipts\/(\d+)$/,
      getTitle: () => ({ title: 'Détail du reçu', subtitle: 'Reçu de paiement', icon: Receipt })
    },
    {
      pattern: /^\/student\/certificates\/(\d+)\/download$/,
      getTitle: () => ({ title: 'Télécharger l\'attestation', subtitle: 'Document PDF', icon: FileCheck })
    },
    {
      pattern: /^\/student\/requests\/(\d+)$/,
      getTitle: () => ({ title: 'Détail de la demande', subtitle: 'Suivi de la demande', icon: FileSearch })
    },
  
    // ==========================================
    // ENSEIGNANT - Routes dynamiques
    // ==========================================
    {
      pattern: /^\/teacher\/courses\/(\d+)\/grades$/,
      getTitle: () => ({ title: 'Saisie des notes', subtitle: 'Notes du cours', icon: FileText })
    },
    {
      pattern: /^\/teacher\/courses\/(\d+)\/attendance$/,
      getTitle: () => ({ title: 'Appel du cours', subtitle: 'Présences des étudiants', icon: ClipboardList })
    },
    {
      pattern: /^\/teacher\/courses\/(\d+)\/materials$/,
      getTitle: () => ({ title: 'Supports du cours', subtitle: 'Documents du cours', icon: BookMarked })
    },
    {
      pattern: /^\/teacher\/courses\/(\d+)\/materials\/new$/,
      getTitle: () => ({ title: 'Nouveau support', subtitle: 'Uploader un document', icon: Plus })
    },
    {
      pattern: /^\/teacher\/courses\/(\d+)$/,
      getTitle: () => ({ title: 'Détail du cours', subtitle: 'Informations du cours', icon: BookOpen })
    },
  
    // ==========================================
    // MESSAGES - Routes dynamiques
    // ==========================================
    {
      pattern: /^\/(\w+)\/messages\/(\d+)$/,
      getTitle: () => ({ title: 'Conversation', subtitle: 'Fil de discussion', icon: MessageSquare })
    },
    {
      pattern: /^\/(\w+)\/messages\/compose$/,
      getTitle: () => ({ title: 'Nouveau message', subtitle: 'Composer un message', icon: Plus })
    },
  
    // ==========================================
    // SCAN SESSION - Routes dynamiques
    // ==========================================
    {
      pattern: /^\/scan-session\/([a-zA-Z0-9_-]+)$/,
      getTitle: () => ({ title: 'Session de scan', subtitle: 'Scanner vos documents', icon: Camera })
    },
  
    // ==========================================
    // RAPPORTS - Routes dynamiques
    // ==========================================
    {
      pattern: /^\/admin\/reports\/students$/,
      getTitle: () => ({ title: 'Rapport étudiants', subtitle: 'Statistiques des étudiants', icon: Users })
    },
    {
      pattern: /^\/admin\/reports\/financial$/,
      getTitle: () => ({ title: 'Rapport financier', subtitle: 'Analyse financière', icon: Calculator })
    },
    {
      pattern: /^\/admin\/reports\/academic$/,
      getTitle: () => ({ title: 'Rapport académique', subtitle: 'Performances académiques', icon: BarChart3 })
    },
    {
      pattern: /^\/admin\/reports\/attendance$/,
      getTitle: () => ({ title: 'Rapport présences', subtitle: 'Statistiques de présence', icon: ClipboardList })
    },
  ];
  
  // ==========================================
  // FONCTION PRINCIPALE : Récupérer le titre
  // ==========================================
  export function getPageTitle(pathname: string): PageTitle {
    // 1. Correspondance exacte (le plus rapide)
    if (pageTitles[pathname]) {
      return pageTitles[pathname];
    }
  
    // 2. Tester les patterns dynamiques
    const segments = pathname.split('/').filter(Boolean);
    
    for (const { pattern, getTitle } of dynamicPatterns) {
      const match = pathname.match(pattern);
      if (match) {
        return getTitle(match, segments);
      }
    }
  
    // 3. Recherche par préfixe (fallback)
    for (const [route, config] of Object.entries(pageTitles)) {
      if (pathname.startsWith(route)) {
        return config;
      }
    }
  
    // 4. Détection intelligente basée sur les segments
    if (segments.length >= 2) {
      const role = segments[0];
      const section = segments[1];
      
      // Détection des actions courantes
      const lastSegment = segments[segments.length - 1];
      const secondLastSegment = segments[segments.length - 2];
      
      // Pages d'édition
      if (lastSegment === 'edit' || lastSegment === 'modifier') {
        const baseSection = getSectionTitle(section);
        return {
          title: `Modifier ${baseSection.toLowerCase()}`,
          subtitle: 'Édition des informations',
          icon: Edit3
        };
      }
      
      // Pages de création
      if (lastSegment === 'new' || lastSegment === 'create' || lastSegment === 'ajouter') {
        const baseSection = getSectionTitle(section);
        return {
          title: `Nouveau ${baseSection.toLowerCase()}`,
          subtitle: 'Création d\'un nouvel élément',
          icon: Plus
        };
      }
      
      // Pages de détail (ID numérique)
      if (/^\d+$/.test(lastSegment)) {
        const baseSection = getSectionTitle(section);
        return {
          title: `Détail ${baseSection.toLowerCase()}`,
          subtitle: 'Informations détaillées',
          icon: Eye
        };
      }
      
      // Sous-section d'une entité
      if (/^\d+$/.test(secondLastSegment)) {
        const baseSection = getSectionTitle(section);
        const subSection = getSectionTitle(lastSegment);
        return {
          title: `${subSection} - ${baseSection}`,
          subtitle: 'Sous-section',
          icon: getSectionIcon(lastSegment)
        };
      }
    }
  
    // 5. Fallback : titre par défaut basé sur le rôle
    const role = segments[0] || 'home';
    const defaultTitles: Record<string, PageTitle> = {
      admin: { title: 'Administration', icon: Shield },
      secretary: { title: 'Secrétariat', icon: FileText },
      teacher: { title: 'Espace Enseignant', icon: BookOpen },
      student: { title: 'Espace Étudiant', icon: GraduationCap },
      censeur: { title: 'Censure', icon: ClipboardList },
      accountant: { title: 'Comptabilité', icon: Calculator },
      guard: { title: 'Sécurité', icon: Shield },
      alumni: { title: 'Espace Alumni', icon: Award },
    };
  
    return defaultTitles[role] || { title: 'UniSphere AI', icon: LayoutDashboard };
  }
  
  // ==========================================
  // FONCTIONS UTILITAIRES
  // ==========================================
  
  /**
   * Récupère le titre d'une section basée sur le nom du segment
   */
  function getSectionTitle(section: string): string {
    const sections: Record<string, string> = {
      students: 'Étudiant',
      teachers: 'Enseignant',
      classes: 'Classe',
      courses: 'Cours',
      schedules: 'Emploi du temps',
      grades: 'Notes',
      'exam-sessions': 'Session d\'examen',
      payments: 'Paiement',
      'payment-deadlines': 'Échéance',
      'payment-tranches': 'Tranche',
      'academic-fees': 'Frais académique',
      announcements: 'Annonce',
      messages: 'Message',
      certificates: 'Attestation',
      documents: 'Document',
      attendance: 'Présence',
      incidents: 'Incident',
      censors: 'Censeur',
      alumni: 'Alumni',
      materials: 'Support',
      receipts: 'Reçu',
      requests: 'Demande',
      reports: 'Rapport',
      settings: 'Paramètre',
      profile: 'Profil',
      files: 'Dossier',
      card: 'Carte',
    };
    
    return sections[section] || section.charAt(0).toUpperCase() + section.slice(1);
  }
  
  /**
   * Récupère l'icône d'une section basée sur le nom du segment
   */
  function getSectionIcon(section: string): any {
    const icons: Record<string, any> = {
      students: Users,
      teachers: Briefcase,
      classes: Building2,
      courses: BookOpen,
      schedules: Calendar,
      grades: FileText,
      'exam-sessions': ClipboardList,
      payments: CreditCard,
      announcements: Bell,
      messages: MessageSquare,
      certificates: FileCheck,
      documents: Folder,
      attendance: ClipboardList,
      incidents: AlertTriangle,
      alumni: Award,
      materials: BookMarked,
      receipts: Receipt,
      requests: FileSearch,
      reports: BarChart3,
      edit: Edit3,
      new: Plus,
      create: Plus,
      view: Eye,
      delete: Trash2,
      download: FileCheck,
    };
    
    return icons[section] || FileText;
  }
  
  /**
   * Récupère le breadcrumb complet pour une page
   */
  export function getBreadcrumb(pathname: string): Array<{ label: string; href: string }> {
    const segments = pathname.split('/').filter(Boolean);
    const breadcrumb: Array<{ label: string; href: string }> = [];
    
    if (segments.length === 0) return breadcrumb;
    
    // Accueil (dashboard du rôle)
    const role = segments[0];
    breadcrumb.push({
      label: 'Accueil',
      href: `/${role}/dashboard`
    });
    
    // Construire le chemin progressivement
    let currentPath = '';
    
    for (let i = 1; i < segments.length; i++) {
      const segment = segments[i];
      currentPath += `/${segment}`;
      
      // Ignorer les IDs numériques dans le breadcrumb
      if (/^\d+$/.test(segment)) continue;
      
      // Ignorer les actions (edit, new, view)
      if (['edit', 'new', 'create', 'view', 'delete'].includes(segment)) {
        const actionLabels: Record<string, string> = {
          edit: 'Modifier',
          new: 'Nouveau',
          create: 'Créer',
          view: 'Voir',
          delete: 'Supprimer'
        };
        breadcrumb.push({
          label: actionLabels[segment] || segment,
          href: `/${role}${currentPath}`
        });
        continue;
      }
      
      const pageTitle = getPageTitle(`/${role}${currentPath}`);
      breadcrumb.push({
        label: pageTitle.title,
        href: `/${role}${currentPath}`
      });
    }
    
    return breadcrumb;
  }