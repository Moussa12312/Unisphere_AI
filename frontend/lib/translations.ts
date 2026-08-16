export type Language = 'fr' | 'en' | 'ar' | 'bm';

export interface Translation {
  // Navigation
  dashboard: string;
  students: string;
  teachers: string;
  courses: string;
  payments: string;
  messages: string;
  notifications: string;
  settings: string;
  profile: string;
  logout: string;
  
  // Actions
  save: string;
  cancel: string;
  delete: string;
  edit: string;
  create: string;
  search: string;
  
  // Common
  welcome: string;
  loading: string;
  error: string;
  success: string;
  
  // Roles
  admin: string;
  secretary: string;
  teacher: string;
  student: string;
  accountant: string;
  censeur: string;
  guard: string;
  alumni: string;
}

export const translations: Record<Language, Translation> = {
  fr: {
    dashboard: 'Tableau de bord',
    students: 'Étudiants',
    teachers: 'Enseignants',
    courses: 'Cours',
    payments: 'Paiements',
    messages: 'Messages',
    notifications: 'Notifications',
    settings: 'Paramètres',
    profile: 'Profil',
    logout: 'Déconnexion',
    save: 'Enregistrer',
    cancel: 'Annuler',
    delete: 'Supprimer',
    edit: 'Modifier',
    create: 'Créer',
    search: 'Rechercher',
    welcome: 'Bienvenue',
    loading: 'Chargement...',
    error: 'Erreur',
    success: 'Succès',
    admin: 'Administrateur',
    secretary: 'Secrétaire',
    teacher: 'Enseignant',
    student: 'Étudiant',
    accountant: 'Comptable',
    censeur: 'Censeur',
    guard: 'Gardien',
    alumni: 'Alumni',
  },
  en: {
    dashboard: 'Dashboard',
    students: 'Students',
    teachers: 'Teachers',
    courses: 'Courses',
    payments: 'Payments',
    messages: 'Messages',
    notifications: 'Notifications',
    settings: 'Settings',
    profile: 'Profile',
    logout: 'Logout',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    create: 'Create',
    search: 'Search',
    welcome: 'Welcome',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    admin: 'Administrator',
    secretary: 'Secretary',
    teacher: 'Teacher',
    student: 'Student',
    accountant: 'Accountant',
    censeur: 'Censor',
    guard: 'Guard',
    alumni: 'Alumni',
  },
  ar: {
    dashboard: 'لوحة التحكم',
    students: 'الطلاب',
    teachers: 'المعلمون',
    courses: 'الدورات',
    payments: 'المدفوعات',
    messages: 'الرسائل',
    notifications: 'الإشعارات',
    settings: 'الإعدادات',
    profile: 'الملف الشخصي',
    logout: 'تسجيل الخروج',
    save: 'حفظ',
    cancel: 'إلغاء',
    delete: 'حذف',
    edit: 'تعديل',
    create: 'إنشاء',
    search: 'بحث',
    welcome: 'مرحبا',
    loading: 'جاري التحميل...',
    error: 'خطأ',
    success: 'نجاح',
    admin: 'المسؤول',
    secretary: 'السكرتير',
    teacher: 'المعلم',
    student: 'الطالب',
    accountant: 'المحاسب',
    censeur: 'الرقيب',
    guard: 'الحارس',
    alumni: 'الخريج',
  },
  bm: {
    dashboard: 'Baarakɛyɔrɔ',
    students: 'Kalanbagaw',
    teachers: 'Kalanbagaw',
    courses: 'Kalanni',
    payments: 'Wari',
    messages: 'Bataw',
    notifications: 'Kunnafoni',
    settings: 'Sɛbɛn',
    profile: 'Profil',
    logout: 'Bɔ',
    save: 'A mara',
    cancel: 'A ban',
    delete: 'A kɛlɛ',
    edit: 'A sɛmɛntiya',
    create: 'A da',
    search: 'A ɲini',
    welcome: 'I ni ce',
    loading: 'A lo...',
    error: 'Gɛlɛya',
    success: 'A ɲɛna',
    admin: 'Admin',
    secretary: 'Sekretɛri',
    teacher: 'Kalanbagaw',
    student: 'Kalanbaga',
    accountant: 'Kɔmpu',
    censeur: 'Censeur',
    guard: 'Guard',
    alumni: 'Alumni',
  },
};

export function getTranslation(lang: Language): Translation {
  return translations[lang] || translations.fr;
}

export function applyLanguage(lang: Language) {
  if (typeof window === 'undefined') return;
  
  // Changer l'attribut lang du HTML
  document.documentElement.lang = lang;
  
  // Pour l'arabe, activer RTL
  if (lang === 'ar') {
    document.documentElement.dir = 'rtl';
  } else {
    document.documentElement.dir = 'ltr';
  }
  
  console.log(`🌍 Langue appliquée : ${lang}`);
}