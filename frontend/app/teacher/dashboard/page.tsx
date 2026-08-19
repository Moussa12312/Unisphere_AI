'use client';

import { useState, useEffect } from 'react';
import {
  BookOpen, Users, Edit3, Bell, Calendar, TrendingUp,
  Award, Clock, CheckCircle, AlertCircle, Loader2
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

export default function TeacherDashboardPage() {
  const toast = useToast();
  const [stats, setStats] = useState<any>(null);
  const [recentGrades, setRecentGrades] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [statsRes, gradesRes, scheduleRes] = await Promise.all([
        api.get('/api/v1/teacher/dashboard').catch(() => ({ data: null })),
        api.get('/api/v1/teacher/recent-grades').catch(() => ({ data: [] })),
        api.get('/api/v1/teacher/schedule/today').catch(() => ({ data: [] }))
      ]);

      setStats(statsRes.data);
      setRecentGrades(Array.isArray(gradesRes.data) ? gradesRes.data : []);
      setSchedule(Array.isArray(scheduleRes.data) ? scheduleRes.data : []);
    } catch (error) {
      console.error('Erreur dashboard:', error);
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-[#FF6B00]" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec horloge */}
      <div className="bg-gradient-to-br from-[#0a1628] to-[#1e293b] rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#FF6B00] to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
              <BookOpen size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Bonjour, {stats?.teacher_name || 'Enseignant'} 👨‍🏫</h1>
              <p className="text-slate-300 mt-1">Bienvenue dans votre espace enseignant</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-300">
              {new Date().toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <BookOpen size={20} className="text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-1">Mes cours</p>
          <p className="text-2xl font-bold text-slate-900">{stats?.courses_count || 0}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Users size={20} className="text-green-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-1">Étudiants</p>
          <p className="text-2xl font-bold text-slate-900">{stats?.students_count || 0}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Edit3 size={20} className="text-orange-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-1">Notes à saisir</p>
          <p className="text-2xl font-bold text-orange-600">{stats?.pending_grades || 0}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Bell size={20} className="text-purple-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-1">Messages</p>
          <p className="text-2xl font-bold text-purple-600">{stats?.unread_messages || 0}</p>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/teacher/courses"
          className="group bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white hover:shadow-xl transition-all hover:scale-[1.02]"
        >
          <BookOpen size={32} className="mb-3" />
          <h3 className="text-xl font-bold mb-1">Mes cours</h3>
          <p className="text-sm text-white/80">Voir mes cours assignés</p>
        </Link>

        <Link
          href="/teacher/grades"
          className="group bg-gradient-to-br from-[#FF6B00] to-orange-500 rounded-2xl p-6 text-white hover:shadow-xl transition-all hover:scale-[1.02]"
        >
          <Edit3 size={32} className="mb-3" />
          <h3 className="text-xl font-bold mb-1">Saisir des notes</h3>
          <p className="text-sm text-white/80">Saisie groupée des notes</p>
        </Link>

        <Link
          href="/teacher/attendance"
          className="group bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white hover:shadow-xl transition-all hover:scale-[1.02]"
        >
          <Users size={32} className="mb-3" />
          <h3 className="text-xl font-bold mb-1">Présences</h3>
          <p className="text-sm text-white/80">Voir les présences</p>
        </Link>
      </div>

      {/* Contenu en 2 colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Emploi du temps du jour */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar size={20} className="text-[#FF6B00]" />
              Cours du jour
            </h2>
            <Link
              href="/teacher/schedule"
              className="text-sm text-[#FF6B00] hover:underline font-medium"
            >
              Voir tout →
            </Link>
          </div>

          {schedule.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar size={48} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Aucun cours aujourd'hui</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {schedule.map((slot: any, idx: number) => (
                <div key={idx} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center justify-center min-w-[70px]">
                      <div className="text-xs text-slate-500">Début</div>
                      <div className="text-lg font-bold text-[#FF6B00]">{slot.start_time}</div>
                    </div>
                    <div className="text-slate-300">→</div>
                    <div className="flex flex-col items-center justify-center min-w-[70px]">
                      <div className="text-xs text-slate-500">Fin</div>
                      <div className="text-lg font-bold text-slate-700">{slot.end_time}</div>
                    </div>
                    <div className="h-12 w-px bg-slate-200 mx-2"></div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{slot.course_title}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Users size={12} />
                          {slot.class_name}
                        </span>
                        {slot.room && (
                          <span className="flex items-center gap-1">
                            📍 {slot.room}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dernières notes saisies */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Award size={20} className="text-[#FF6B00]" />
              Dernières notes
            </h2>
            <Link
              href="/teacher/grades"
              className="text-sm text-[#FF6B00] hover:underline font-medium"
            >
              Voir tout →
            </Link>
          </div>

          {recentGrades.length === 0 ? (
            <div className="p-12 text-center">
              <Award size={48} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Aucune note saisie récemment</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentGrades.slice(0, 5).map((grade: any, idx: number) => (
                <div key={idx} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                      grade.score >= 15 ? 'bg-green-100 text-green-700' :
                      grade.score >= 10 ? 'bg-blue-100 text-blue-700' :
                      grade.score >= 5 ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {grade.score?.toFixed(1)}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{grade.student_name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {grade.course_title} • {grade.session_name}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      grade.status === 'validated'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      {grade.status === 'validated' ? 'Validé' : 'Brouillon'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats de performance avec moyenne pondérée */}
      {stats?.average_grade && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={20} />
              <h3 className="font-semibold">Moyenne pondérée</h3>
            </div>
            <p className="text-4xl font-bold">{stats.average_grade.toFixed(2)}/20</p>
            <p className="text-sm opacity-80 mt-2">Calculée avec les crédits</p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle size={20} />
              <h3 className="font-semibold">Taux de réussite</h3>
            </div>
            <p className="text-4xl font-bold">{stats.success_rate?.toFixed(1) || 0}%</p>
            <p className="text-sm opacity-80 mt-2">Étudiants avec moyenne ≥ 10</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-6 text-white">
            <div className="flex items-center gap-2 mb-3">
              <Award size={20} />
              <h3 className="font-semibold">Total notes</h3>
            </div>
            <p className="text-4xl font-bold">{stats.total_grades || 0}</p>
            <p className="text-sm opacity-80 mt-2">Notes saisies</p>
          </div>
        </div>
      )}
    </div>
  );
}