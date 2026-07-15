'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users, UserPlus, FileText, Calendar, Clock, TrendingUp,
  AlertCircle, CheckCircle, Bell, BookOpen, Edit3,
  ArrowRight, Activity, Folder, Megaphone, GraduationCap
} from 'lucide-react';
import api from '@/lib/api';
import { announcementService } from '@/services/announcementService';
import { useToast } from '@/components/ToastProvider';

export default function SecretaryDashboardPage() {
  const toast = useToast();
  const [stats, setStats] = useState({
    totalStudents: 0,
    pendingEnrollments: 0,
    totalTeachers: 0,
    totalCourses: 0,
    announcementsToday: 0,
    documentsGenerated: 0
  });
  const [recentStudents, setRecentStudents] = useState<any[]>([]);
  const [recentAnnouncements, setRecentAnnouncements] = useState<any[]>([]);
  const [urgentTasks, setUrgentTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Charger toutes les données en parallèle
      const [studentsRes, teachersRes, coursesRes, announcementsData] = await Promise.all([
        api.get('/api/v1/students/').catch(() => ({ data: [] })),
        api.get('/api/v1/teachers/').catch(() => ({ data: [] })),
        api.get('/api/v1/courses/').catch(() => ({ data: [] })),
        announcementService.getAll().catch(() => [])
      ]);

      // ✅ Sécuriser : toujours un tableau
      const students = Array.isArray(studentsRes.data) ? studentsRes.data : [];
      const teachers = Array.isArray(teachersRes.data) ? teachersRes.data : [];
      const courses = Array.isArray(coursesRes.data) ? coursesRes.data : [];
      const announcements = Array.isArray(announcementsData) ? announcementsData : [];

      // Calculer les statistiques
      const today = new Date().toDateString();
      const announcementsToday = announcements.filter((a: any) => 
        new Date(a.created_at || a.published_at || Date.now()).toDateString() === today
      ).length;

      // Étudiants récents (5 derniers inscrits)
      const recentStudents = [...students]
        .filter((s: any) => s.created_at)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

      // Annonces récentes (5 dernières)
      const recentAnnouncements = [...announcements]
        .filter((a: any) => a.created_at || a.published_at)
        .sort((a, b) => {
          const dateA = new Date(a.created_at || a.published_at || 0).getTime();
          const dateB = new Date(b.created_at || b.published_at || 0).getTime();
          return dateB - dateA;
        })
        .slice(0, 5);

      // Générer les tâches urgentes dynamiquement
      const tasks: any[] = [];
      
      // Vérifier les inscriptions en attente
      const pendingStudents = students.filter((s: any) => s.status === 'pending');
      if (pendingStudents.length > 0) {
        tasks.push({
          id: 1,
          task: `Valider ${pendingStudents.length} inscription${pendingStudents.length > 1 ? 's' : ''} en attente`,
          priority: 'high',
          href: '/secretary/students/enrollment'
        });
      }

      // Vérifier s'il y a peu de cours
      if (courses.length === 0) {
        tasks.push({
          id: 2,
          task: 'Créer les cours pour cette année',
          priority: 'medium',
          href: '/secretary/courses'
        });
      }

      // Vérifier s'il y a peu d'enseignants
      if (teachers.length === 0) {
        tasks.push({
          id: 3,
          task: 'Ajouter des enseignants',
          priority: 'medium',
          href: '/secretary/teachers'
        });
      }

      // Tâche par défaut si aucune tâche urgente
      if (tasks.length === 0) {
        tasks.push({
          id: 1,
          task: 'Aucune tâche urgente pour le moment',
          priority: 'low',
          href: '/secretary/students'
        });
      }

      setStats({
        totalStudents: students.length,
        pendingEnrollments: pendingStudents.length,
        totalTeachers: teachers.length,
        totalCourses: courses.length,
        announcementsToday,
        documentsGenerated: 0
      });

      setRecentStudents(recentStudents);
      setRecentAnnouncements(recentAnnouncements);
      setUrgentTasks(tasks);
    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    return date.toLocaleDateString('fr-FR');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B00] border-t-transparent"></div>
      </div>
    );
  }

  const kpiCards = [
    {
      title: 'Total étudiants',
      value: stats.totalStudents,
      icon: Users,
      color: 'blue',
      trend: 'Inscrits',
      href: '/secretary/students'
    },
    {
      title: 'Inscriptions en attente',
      value: stats.pendingEnrollments,
      icon: UserPlus,
      color: 'orange',
      trend: stats.pendingEnrollments > 0 ? 'À traiter' : 'Tout est bon',
      href: '/secretary/students/enrollment'
    },
    {
      title: 'Enseignants',
      value: stats.totalTeachers,
      icon: GraduationCap,
      color: 'green',
      trend: 'Actifs',
      href: '/secretary/teachers'
    },
    {
      title: 'Cours',
      value: stats.totalCourses,
      icon: BookOpen,
      color: 'yellow',
      trend: 'Cette année',
      href: '/secretary/courses'
    }
  ];

  const colorClasses: Record<string, { bg: string; text: string; icon: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', icon: 'bg-blue-500' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-700', icon: 'bg-orange-500' },
    green: { bg: 'bg-green-50', text: 'text-green-700', icon: 'bg-green-500' },
    yellow: { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: 'bg-yellow-500' },
    red: { bg: 'bg-red-50', text: 'text-red-700', icon: 'bg-red-500' },
    slate: { bg: 'bg-slate-50', text: 'text-slate-700', icon: 'bg-slate-500' }
  };

  const priorityClasses: Record<string, { bg: string; text: string; label: string }> = {
    high: { bg: 'bg-red-100', text: 'text-red-700', label: 'Urgent' },
    medium: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Important' },
    low: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Normal' }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Tableau de bord</h1>
        <p className="text-slate-500 mt-1">Bienvenue ! Voici un aperçu de vos activités</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 min-[599px]:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpiCards.map((kpi, idx) => {
          const Icon = kpi.icon;
          const colors = colorClasses[kpi.color];
          return (
            <Link
              key={idx}
              href={kpi.href}
              className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 ${colors.icon} rounded-xl flex items-center justify-center shadow-lg`}>
                  <Icon className="text-white" size={24} />
                </div>
                <ArrowRight size={16} className="text-slate-400 group-hover:text-[#FF6B00] group-hover:translate-x-1 transition-all" />
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">{kpi.title}</p>
                <p className="text-3xl font-bold text-slate-900">{kpi.value}</p>
                <p className={`text-xs ${colors.text} mt-2 font-medium`}>{kpi.trend}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Actions rapides */}
      <div className="bg-gradient-to-r from-[#0a1628] to-[#1e293b] rounded-2xl p-6 text-white">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Activity size={20} />
          Actions rapides
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link
            href="/secretary/students/enrollment"
            className="flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl text-sm font-medium transition-all border border-white/20"
          >
            <UserPlus size={16} />
            Nouvelle inscription
          </Link>
          <Link
            href="/secretary/grades/entry"
            className="flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl text-sm font-medium transition-all border border-white/20"
          >
            <Edit3 size={16} />
            Saisir des notes
          </Link>
          <Link
            href="/secretary/documents/generate"
            className="flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl text-sm font-medium transition-all border border-white/20"
          >
            <FileText size={16} />
            Générer document
          </Link>
          <Link
            href="/secretary/announcements"
            className="flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl text-sm font-medium transition-all border border-white/20"
          >
            <Megaphone size={16} />
            Publier annonce
          </Link>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne gauche */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tâches urgentes */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <AlertCircle size={20} className="text-[#FF6B00]" />
                Tâches urgentes
              </h2>
              <span className="text-xs bg-[#FF6B00]/10 text-[#FF6B00] px-2 py-1 rounded-full font-semibold">
                {urgentTasks.filter(t => t.priority !== 'low').length} à traiter
              </span>
            </div>
            <div className="space-y-3">
              {urgentTasks.map((task) => {
                const priority = priorityClasses[task.priority];
                return (
                  <Link
                    key={task.id}
                    href={task.href}
                    className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all group"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`w-2 h-2 rounded-full ${priority.bg.replace('100', '500')}`}></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{task.task}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${priority.bg} ${priority.text}`}>
                        {priority.label}
                      </span>
                      <ArrowRight size={14} className="text-slate-400 group-hover:text-[#FF6B00] transition-colors" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Étudiants récemment inscrits */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Users size={20} className="text-blue-500" />
                Étudiants récemment inscrits
              </h2>
              <Link href="/secretary/students" className="text-sm text-[#FF6B00] hover:underline">
                Voir tout
              </Link>
            </div>
            {recentStudents.length === 0 ? (
              <div className="text-center py-8">
                <Users size={48} className="text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">Aucun étudiant inscrit pour le moment</p>
                <Link 
                  href="/secretary/students/enrollment" 
                  className="inline-block mt-3 text-sm text-[#FF6B00] hover:underline"
                >
                  Inscrire un étudiant →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentStudents.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-all"
                  >
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-sm">
                        {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        {student.first_name} {student.last_name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {student.matricule} • {student.level} {student.filiere}
                      </p>
                    </div>
                    <span className="text-xs text-slate-400 flex-shrink-0">
                      {getTimeAgo(student.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Colonne droite */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Bell size={20} className="text-purple-500" />
                Annonces récentes
              </h2>
              <Link href="/secretary/announcements" className="text-sm text-[#FF6B00] hover:underline">
                Voir tout
              </Link>
            </div>
            {recentAnnouncements.length === 0 ? (
              <div className="text-center py-8">
                <Bell size={48} className="text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">Aucune annonce publiée</p>
                <Link 
                  href="/secretary/announcements" 
                  className="inline-block mt-3 text-sm text-[#FF6B00] hover:underline"
                >
                  Publier une annonce →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentAnnouncements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all"
                  >
                    <p className="text-sm font-semibold text-slate-900 line-clamp-2">
                      {announcement.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {announcement.content}
                    </p>
                    <p className="text-xs text-slate-400 mt-2">
                      {getTimeAgo(announcement.created_at || announcement.published_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Accès rapides */}
          <div className="bg-orange-500 rounded-2xl p-6 text-white">
            <h2 className="text-lg font-bold mb-4">Accès rapides</h2>
            <div className="space-y-2">
              <Link
                href="/secretary/students"
                className="flex items-center justify-between p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
              >
                <span className="text-sm font-medium">Tous les étudiants</span>
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/secretary/courses"
                className="flex items-center justify-between p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
              >
                <span className="text-sm font-medium">Cours & Matières</span>
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/secretary/schedule"
                className="flex items-center justify-between p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
              >
                <span className="text-sm font-medium">Emploi du temps</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}