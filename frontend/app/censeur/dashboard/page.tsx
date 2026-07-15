'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CheckCircle, AlertTriangle, Clock, TrendingUp,
  FileCheck, Users, BookOpen, Calendar,
  Loader2, Award, XCircle, FileText, Edit3, Settings
} from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

export default function CenseurDashboardPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [anomaliesEnabled, setAnomaliesEnabled] = useState(true); // ✅ NOUVEAU
  const [stats, setStats] = useState<any>({
    pending_validations: 0,
    validated_today: 0,
    anomalies: 0,
    upcoming_exams: 0,
    total_students: 0,
    total_courses: 0,
    average_rate: 0,
    success_rate: 0
  });
  const [pendingGrades, setPendingGrades] = useState<any[]>([]);
  const [recentValidations, setRecentValidations] = useState<any[]>([]);
  const [upcomingExams, setUpcomingExams] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // ✅ VÉRIFIER SI LES ANOMALIES SONT ACTIVÉES
      const configRes = await api.get('/api/v1/grades/anomalies/config').catch(() => ({ 
        data: { enable_anomalies: true } 
      }));
      
      // ✅ UTILISER UNE VARIABLE LOCALE (pas le state)
      const enabled = configRes.data.enable_anomalies !== false;
      setAnomaliesEnabled(enabled);
  
      const [
        sessionsRes,
        coursesRes,
        studentsRes,
        gradesRes
      ] = await Promise.all([
        api.get('/api/v1/exam-sessions/').catch(() => ({ data: [] })),
        api.get('/api/v1/courses/').catch(() => ({ data: [] })),
        api.get('/api/v1/students/').catch(() => ({ data: [] })),
        api.get('/api/v1/grades/').catch(() => ({ data: [] }))
      ]);
  
      const sessions = Array.isArray(sessionsRes.data) ? sessionsRes.data : [];
      const courses = Array.isArray(coursesRes.data) ? coursesRes.data : [];
      const students = Array.isArray(studentsRes.data) ? studentsRes.data : [];
      const grades = Array.isArray(gradesRes.data) ? gradesRes.data : [];
  
      const pending = grades.filter((g: any) => g.status === 'draft' || g.status === 'pending');
      const validatedToday = grades.filter((g: any) => {
        if (!g.validated_at) return false;
        const today = new Date().toDateString();
        return new Date(g.validated_at).toDateString() === today;
      });
      
      // ✅ UTILISER LA VARIABLE LOCALE `enabled` (pas le state)
      const anomalies = enabled ? grades.filter((g: any) => 
        g.score !== null && (g.score > 18 || g.score < 5)
      ) : [];
  
      const now = new Date();
      const upcoming = sessions.filter((s: any) => {
        if (!s.start_date) return false;
        return new Date(s.start_date) >= now && s.status === 'open';
      });
  
      const gradedStudents = grades.filter((g: any) => g.score !== null);
      const passed = gradedStudents.filter((g: any) => g.score >= 10);
      const successRate = gradedStudents.length > 0 
        ? (passed.length / gradedStudents.length) * 100 
        : 0;
  
      // ✅ MOYENNE SIMPLE (fallback)
      const allScores = gradedStudents.map((g: any) => g.score);
      const averageRate = allScores.length > 0
        ? allScores.reduce((a: number, b: number) => a + b, 0) / allScores.length
        : 0;
  
      // ✅ MOYENNE PONDÉRÉE (si sessions existent)
      let weightedAverage = averageRate;
      if (sessions.length > 0) {
        try {
          // On prend la première session pour calculer la moyenne pondérée globale
          const weightedRes = await api.get('/api/v1/grades/weighted-average/0', {
            params: { session_id: sessions[0].id }
          }).catch(() => null);
          
          if (weightedRes?.data?.weighted_average) {
            weightedAverage = weightedRes.data.weighted_average;
          }
        } catch (error) {
          // Ignorer l'erreur, garder averageRate
        }
      }
  
      setStats({
        pending_validations: pending.length,
        validated_today: validatedToday.length,
        anomalies: anomalies.length,
        upcoming_exams: upcoming.length,
        total_students: students.length,
        total_courses: courses.length,
        average_rate: weightedAverage,  // ✅ CORRIGÉ
        success_rate: successRate
      });
  
      setPendingGrades(pending.slice(0, 5));
      
      const validated = grades
        .filter((g: any) => g.status === 'validated')
        .sort((a: any, b: any) => new Date(b.validated_at || b.updated_at || 0).getTime() - new Date(a.validated_at || a.updated_at || 0).getTime())
        .slice(0, 5);
      setRecentValidations(validated);
      
      setUpcomingExams(upcoming.slice(0, 5));
  
    } catch (error) {
      console.error('Erreur dashboard:', error);
      toast.error('Erreur lors du chargement');
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
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Tableau de bord Censeur</h1>
        <p className="text-slate-500 mt-1">Vue d'ensemble de la validation des notes et du suivi académique</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/censeur/grades" className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg transition-all group">
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Clock className="text-white" size={24} />
            </div>
            {stats.pending_validations > 0 && (
              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">
                À traiter
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mb-1">Notes à valider</p>
          <p className="text-3xl font-bold text-slate-900">{stats.pending_validations}</p>
        </Link>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30">
              <CheckCircle className="text-white" size={24} />
            </div>
          </div>
          <p className="text-sm text-slate-500 mb-1">Validées aujourd'hui</p>
          <p className="text-3xl font-bold text-slate-900">{stats.validated_today}</p>
        </div>

        {/* ✅ ANOMALIES SEULEMENT SI ACTIVÉES */}
        {anomaliesEnabled ? (
          <Link href="/censeur/grades/anomalies" className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg transition-all group">
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/30">
                <AlertTriangle className="text-white" size={24} />
              </div>
              {stats.anomalies > 0 && (
                <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold animate-pulse">
                  Urgent
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 mb-1">Anomalies détectées</p>
            <p className="text-3xl font-bold text-slate-900">{stats.anomalies}</p>
          </Link>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-5 opacity-50">
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 bg-slate-300 rounded-xl flex items-center justify-center">
                <AlertTriangle className="text-white" size={24} />
              </div>
            </div>
            <p className="text-sm text-slate-500 mb-1">Anomalies</p>
            <p className="text-lg font-bold text-slate-400">Désactivées</p>
          </div>
        )}

        <Link href="/censeur/exams/calendar" className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg transition-all group">
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Calendar className="text-white" size={24} />
            </div>
          </div>
          <p className="text-sm text-slate-500 mb-1">Examens à venir</p>
          <p className="text-3xl font-bold text-slate-900">{stats.upcoming_exams}</p>
        </Link>
      </div>

      {/* Stats secondaires */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-5 text-white shadow-lg">
          <Users size={20} className="opacity-80 mb-2" />
          <p className="text-xs opacity-80">Étudiants</p>
          <p className="text-2xl font-bold">{stats.total_students}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl p-5 text-white shadow-lg">
          <BookOpen size={20} className="opacity-80 mb-2" />
          <p className="text-xs opacity-80">Cours</p>
          <p className="text-2xl font-bold">{stats.total_courses}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl p-5 text-white shadow-lg">
          <TrendingUp size={20} className="opacity-80 mb-2" />
          <p className="text-xs opacity-80">Moyenne générale</p>
          <p className="text-2xl font-bold">{stats.average_rate.toFixed(2)}/20</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-5 text-white shadow-lg">
          <Award size={20} className="opacity-80 mb-2" />
          <p className="text-xs opacity-80">Taux de réussite</p>
          <p className="text-2xl font-bold">{stats.success_rate.toFixed(0)}%</p>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="bg-gradient-to-r from-[#0a1628] to-[#1e293b] rounded-2xl p-6 text-white">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <FileCheck size={20} />
          Actions rapides
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link
            href="/censeur/grades/entry"
            className="flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl text-sm font-medium transition-all border border-white/20"
          >
            <Edit3 size={16} />
            Saisir des notes
          </Link>
          <Link
            href="/censeur/grades"
            className="flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl text-sm font-medium transition-all border border-white/20"
          >
            <CheckCircle size={16} />
            Valider des notes
          </Link>
          {anomaliesEnabled && (
            <Link
              href="/censeur/grades/anomalies"
              className="flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl text-sm font-medium transition-all border border-white/20"
            >
              <AlertTriangle size={16} />
              Voir anomalies
            </Link>
          )}
          <Link
            href="/censeur/settings/anomalies"
            className="flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl text-sm font-medium transition-all border border-white/20"
          >
            <Settings size={16} />
            Config anomalies
          </Link>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Notes à valider */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Clock size={20} className="text-orange-500" />
              Notes en attente de validation
            </h2>
            <Link href="/censeur/grades" className="text-sm text-[#FF6B00] hover:underline">
              Voir tout →
            </Link>
          </div>
          
          {pendingGrades.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle size={48} className="text-green-300 mx-auto mb-3" />
              <p className="text-slate-500">Aucune note en attente</p>
              <p className="text-xs text-slate-400 mt-1">Toutes les notes sont validées</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingGrades.map((grade: any, idx: number) => (
                <div key={grade.id || idx} className="flex items-center justify-between p-3 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                      {grade.score?.toFixed(0) || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {grade.student_name || 'Étudiant'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {grade.course_title || 'Cours'} • {grade.session_name || 'Session'}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 bg-orange-200 text-orange-800 rounded-full font-medium">
                    Brouillon
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Examens à venir */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar size={20} className="text-blue-500" />
              Prochains examens
            </h2>
            <Link href="/censeur/exams/calendar" className="text-sm text-[#FF6B00] hover:underline">
              Voir tout →
            </Link>
          </div>
          
          {upcomingExams.length === 0 ? (
            <div className="text-center py-8">
              <Calendar size={48} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Aucun examen à venir</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingExams.map((exam: any, idx: number) => (
                <div key={exam.id || idx} className="p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                  <p className="text-sm font-semibold text-slate-900">{exam.name}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {exam.start_date ? new Date(exam.start_date).toLocaleDateString('fr-FR') : 'Date non définie'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Validations récentes */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle size={20} className="text-green-500" />
            Validations récentes
          </h2>
          <Link href="/censeur/grades/history" className="text-sm text-[#FF6B00] hover:underline">
            Voir tout →
          </Link>
        </div>
        
        {recentValidations.length === 0 ? (
          <div className="text-center py-8">
            <FileText size={48} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Aucune validation récente</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentValidations.map((grade: any, idx: number) => (
              <div key={grade.id || idx} className="flex items-center justify-between p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                    <CheckCircle size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {grade.student_name || 'Étudiant'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {grade.course_title || 'Cours'} • Note: {grade.score?.toFixed(2)}/20
                    </p>
                  </div>
                </div>
                <span className="text-xs px-2 py-1 bg-green-200 text-green-800 rounded-full font-medium">
                  Validé
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}