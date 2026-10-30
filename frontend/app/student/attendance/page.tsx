'use client';

import { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  TrendingUp,
  AlertTriangle,
  Calendar,
  BookOpen,
  History,
  FileCheck2,
  ShieldCheck
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface CourseStats {
  course_id: number;
  course_name: string;
  total: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  rate: number;
}

interface DetailedAttendance {
  id: number;
  date: string;
  status: 'present' | 'late' | 'absent' | 'excused' | string;
  course: string;
  comment?: string;
}

export default function StudentAttendancePage() {
  const [courses, setCourses] = useState<CourseStats[]>([]);
  const [history, setHistory] = useState<DetailedAttendance[]>([]);
  const [activeTab, setActiveTab] = useState<'courses' | 'history'>('courses');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllAttendanceData();
  }, []);

  const loadAllAttendanceData = async () => {
    try {
      setLoading(true);
      const [resCourses, resHistory] = await Promise.all([
        api.get('/api/v1/attendance/me/courses'),
        api.get('/api/v1/students/me/attendance')
      ]);
      setCourses(resCourses.data || []);
      setHistory(resHistory.data || []);
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors du chargement des présences');
    } finally {
      setLoading(false);
    }
  };

  // Calcul des métriques globales
  const totalSessions = courses.reduce((acc, c) => acc + c.total, 0);
  const totalPresent = courses.reduce((acc, c) => acc + c.present, 0);
  const totalLate = courses.reduce((acc, c) => acc + c.late, 0);
  const totalAbsent = courses.reduce((acc, c) => acc + c.absent, 0);
  const totalExcused = courses.reduce((acc, c) => acc + c.excused, 0);
  const globalRate =
    totalSessions > 0
      ? Math.round(((totalPresent + totalLate + totalExcused) / totalSessions) * 100)
      : 100;

  const getRateColor = (rate: number) => {
    if (rate >= 80) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (rate >= 60) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-rose-700 bg-rose-50 border-rose-200';
  };

  const getRateBarColor = (rate: number) => {
    if (rate >= 80) return 'bg-emerald-500';
    if (rate >= 60) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'present':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={12} className="text-emerald-600" />
            Présent
          </span>
        );
      case 'late':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={12} className="text-amber-600" />
            En retard
          </span>
        );
      case 'absent':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle size={12} className="text-rose-600" />
            Absent
          </span>
        );
      case 'excused':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <ShieldCheck size={12} className="text-blue-600" />
            Justifié
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <Loader2 className="animate-spin text-[#FF6B00]" size={36} />
        <p className="text-slate-500 text-sm">Chargement de votre assiduité...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Mon Assiduité & Présences</h1>
          <p className="text-slate-500 text-sm mt-1">
            Suivi académique officiel, taux d'assiduité LMD et journal des cours
          </p>
        </div>

        {/* Onglets d'affichage */}
        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold self-start md:self-auto">
          <button
            onClick={() => setActiveTab('courses')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
              activeTab === 'courses'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen size={14} />
            Par Module ({courses.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
              activeTab === 'history'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History size={14} />
            Journal Détaillé ({history.length})
          </button>
        </div>
      </div>

      {/* CARTES KPI SYNTHÈSE GLOBALE */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Taux Global</span>
            <TrendingUp size={16} className={globalRate >= 80 ? 'text-emerald-600' : 'text-amber-600'} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-black ${globalRate >= 80 ? 'text-emerald-700' : 'text-amber-700'}`}>
              {globalRate}%
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {globalRate >= 80 ? 'Excellente assiduité' : 'Attention requise'}
          </p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Séances Totales</span>
          <span className="text-3xl font-black text-slate-900">{totalSessions}</span>
          <p className="text-[11px] text-slate-400 mt-1">Cours programmés</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block mb-2">Présences</span>
          <span className="text-3xl font-black text-emerald-700">{totalPresent}</span>
          <p className="text-[11px] text-emerald-600/70 mt-1">À l'heure</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-amber-600 uppercase tracking-wider block mb-2">Retards</span>
          <span className="text-3xl font-black text-amber-700">{totalLate}</span>
          <p className="text-[11px] text-amber-600/70 mt-1">Comptabilisés</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-rose-600 uppercase tracking-wider block mb-2">Absences</span>
          <span className="text-3xl font-black text-rose-700">{totalAbsent}</span>
          <p className="text-[11px] text-rose-600/70 mt-1">
            {totalExcused > 0 ? `${totalExcused} justifiée(s)` : 'Non justifiées'}
          </p>
        </div>
      </div>

      {/* VUE 1 : PAR MODULE */}
      {activeTab === 'courses' && (
        <div className="space-y-4">
          {courses.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
              <TrendingUp size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="font-bold text-slate-800 text-base mb-1">Aucune présence enregistrée</h3>
              <p className="text-slate-500 text-sm">
                Les présences enregistrées lors des cours par vos enseignants apparaîtront ici.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((course) => (
                <div
                  key={course.course_id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 hover:border-orange-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <h3 className="font-bold text-slate-900 text-base line-clamp-2 leading-snug">
                        {course.course_name}
                      </h3>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-black border flex items-center gap-1 flex-shrink-0 ${getRateColor(
                          course.rate
                        )}`}
                      >
                        {course.rate >= 80 ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                        {course.rate}%
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-2.5 mb-4 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${getRateBarColor(course.rate)}`}
                        style={{ width: `${course.rate}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
                      <div className="p-2 bg-slate-50 rounded-xl">
                        <p className="font-extrabold text-slate-900 text-base">{course.total}</p>
                        <p className="text-slate-400 text-[10px] uppercase font-bold">Séances</p>
                      </div>
                      <div className="p-2 bg-emerald-50 rounded-xl">
                        <p className="font-extrabold text-emerald-700 text-base">{course.present}</p>
                        <p className="text-emerald-600 text-[10px] uppercase font-bold">Présent</p>
                      </div>
                      <div className="p-2 bg-amber-50 rounded-xl">
                        <p className="font-extrabold text-amber-700 text-base">{course.late}</p>
                        <p className="text-amber-600 text-[10px] uppercase font-bold">Retard</p>
                      </div>
                      <div className="p-2 bg-rose-50 rounded-xl">
                        <p className="font-extrabold text-rose-700 text-base">{course.absent}</p>
                        <p className="text-rose-600 text-[10px] uppercase font-bold">Absent</p>
                      </div>
                    </div>

                    {course.excused > 0 && (
                      <p className="text-[11px] text-blue-600 font-medium mt-3 flex items-center gap-1 bg-blue-50/60 px-2 py-1 rounded-lg">
                        <AlertCircle size={12} /> {course.excused} absence(s) justifiée(s)
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VUE 2 : JOURNAL DÉTAILLÉ */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Historique chronologique des séances d'appel</h2>
              <p className="text-xs text-slate-500">Enregistré par les enseignants en salle de cours</p>
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              {history.length} séance(s)
            </span>
          </div>

          {history.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">
              Aucun historique de présence disponible.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[640px] w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 sm:px-6 py-3">Date</th>
                    <th className="px-4 sm:px-6 py-3">Module / Cours</th>
                    <th className="px-4 sm:px-6 py-3">Statut</th>
                    <th className="px-4 sm:px-6 py-3">Observation / Commentaire</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 sm:px-6 py-3.5 font-medium text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-slate-400" />
                          {item.date}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 font-semibold text-slate-900">
                        {item.course}
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 whitespace-nowrap">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 text-xs text-slate-500">
                        {item.comment ? (
                          <span className="italic">« {item.comment} »</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}