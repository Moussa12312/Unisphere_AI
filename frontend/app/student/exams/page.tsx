'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar, Clock, MapPin, User, FileText, Printer, AlertCircle,
  CheckCircle2, Sparkles, Filter, ChevronRight, Building2, BookOpen,
  CalendarCheck, Timer, ArrowLeft, RefreshCw, Loader2
} from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { useUniversityLogo } from '@/hooks/useUniversityLogo';

interface ExamItem {
  id: number;
  session_id: number;
  session_name: string;
  session_type: string;
  course_id: number;
  course_title: string;
  course_code: string;
  credits: number;
  class_id: number;
  class_name: string;
  exam_date: string | null;
  formatted_date: string;
  start_time: string;
  end_time: string;
  time_slot: string;
  room: string;
  building: string;
  supervisor_name: string;
  notes: string;
  status: 'passed' | 'today' | 'upcoming';
}

interface ExamScheduleResponse {
  student: {
    id: number;
    name: string;
    matricule: string;
    filiere: string;
    level: string;
    class_name: string | null;
  };
  sessions: Array<{
    id: number;
    name: string;
    session_type: string;
    status: string;
    start_date: string | null;
    end_date: string | null;
  }>;
  active_session: number | null;
  total_exams: number;
  upcoming_exams: number;
  schedules: ExamItem[];
}

export default function StudentExamsSchedulePage() {
  const toast = useToast();
  const { universityName, logoUrl } = useUniversityLogo();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ExamScheduleResponse | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'passed'>('all');

  useEffect(() => {
    loadExamSchedule();
  }, [selectedSessionId]);

  const loadExamSchedule = async () => {
    setLoading(true);
    try {
      const url = selectedSessionId !== 'all'
        ? `/api/v1/students/me/exam-schedule?session_id=${selectedSessionId}`
        : '/api/v1/students/me/exam-schedule';
      const res = await api.get(url);
      setData(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur lors du chargement du calendrier des examens');
    } finally {
      setLoading(false);
    }
  };

  const schedules = data?.schedules || [];

  // Filtrage par statut
  const filteredSchedules = schedules.filter(item => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'upcoming') return item.status === 'upcoming' || item.status === 'today';
    if (statusFilter === 'passed') return item.status === 'passed';
    return true;
  });

  const nextExam = schedules.find(it => it.status === 'upcoming' || it.status === 'today');

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">

      {/* En-tête avec Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/student/schedule"
              className="text-xs text-slate-500 hover:text-[#FF6B00] inline-flex items-center gap-1 font-medium transition-colors"
            >
              <ArrowLeft size={13} />
              Emploi du temps des cours
            </Link>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-xs font-semibold text-[#FF6B00]">Examens & Épreuves</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <span>Calendrier de mes Examens</span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange-100 dark:bg-orange-950/50 text-[#FF6B00] border border-orange-200 dark:border-orange-900">
              Session Officielle
            </span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Dates, horaires, salles et consignes de vos épreuves écrites et pratiques.
          </p>
        </div>

        {/* Boutons d'action */}
        <div className="flex items-center gap-2 print:hidden">
          <button
            onClick={() => window.print()}
            disabled={loading || schedules.length === 0}
            className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Printer size={15} />
            <span>Imprimer la convocation</span>
          </button>

          <button
            onClick={loadExamSchedule}
            disabled={loading}
            className="p-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            title="Rafraîchir"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* En-tête imprimable (Visible UNIQUEMENT à l'impression) */}
      <div className="hidden print:block pb-6 mb-4 border-b border-slate-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl && (
              <img src={logoUrl} alt="Logo" className="w-12 h-12 object-contain" />
            )}
            <div>
              <h2 className="text-lg font-bold text-slate-900 uppercase">{universityName}</h2>
              <p className="text-xs text-slate-600">DIRECTION DES EXAMENS & DU CONTRÔLE ACADÉMIQUE</p>
            </div>
          </div>
          <div className="text-right">
            <h3 className="text-sm font-extrabold text-[#FF6B00]">CONVOCATION AUX ÉPREUVES</h3>
            <p className="text-xs text-slate-600">Année Académique 2026-2027</p>
          </div>
        </div>

        {data?.student && (
          <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-2 text-xs">
            <div>
              <p><strong>Étudiant :</strong> {data.student.name}</p>
              <p><strong>Matricule :</strong> {data.student.matricule}</p>
            </div>
            <div>
              <p><strong>Filière :</strong> {data.student.filiere} ({data.student.level})</p>
              <p><strong>Classe :</strong> {data.student.class_name || 'Auditeur Libre'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Cartes Résumé & Prochaine Épreuve */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <BookOpen size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Épreuves</p>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white">
              {loading ? '...' : (data?.total_exams || 0)}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-orange-50 dark:bg-orange-950/50 text-[#FF6B00] flex items-center justify-center shrink-0">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Épreuves Restantes</p>
            <p className="text-xl font-extrabold text-[#FF6B00]">
              {loading ? '...' : (data?.upcoming_exams || 0)}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3 sm:col-span-2">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CalendarCheck size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-500 font-medium">Prochaine Épreuve</p>
            {nextExam ? (
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {nextExam.course_title} <span className="text-xs font-normal text-slate-400">({nextExam.formatted_date || nextExam.exam_date} à {nextExam.start_time})</span>
              </p>
            ) : (
              <p className="text-xs text-emerald-600 font-semibold">Toutes les épreuves sont terminées !</p>
            )}
          </div>
        </div>
      </div>

      {/* Barre de filtres & Sessions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs print:hidden">
        {/* Sélecteur de session */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">
            Session d'examen :
          </label>
          <select
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            className="text-xs font-bold px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          >
            <option value="all">Toutes les sessions</option>
            {data?.sessions.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.session_type === 'rattrapage' ? 'Rattrapage' : 'Normale'})
              </option>
            ))}
          </select>
        </div>

        {/* Filtres par statut */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-[#0a1628] dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Toutes ({schedules.length})
          </button>
          <button
            onClick={() => setStatusFilter('upcoming')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'upcoming'
                ? 'bg-[#FF6B00] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            À venir ({data?.upcoming_exams || 0})
          </button>
          <button
            onClick={() => setStatusFilter('passed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'passed'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Passées ({(data?.total_exams || 0) - (data?.upcoming_exams || 0)})
          </button>
        </div>
      </div>

      {/* Contenu principal : Liste des épreuves */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Loader2 className="animate-spin text-[#FF6B00]" size={36} />
          <p className="text-xs text-slate-500 mt-3 font-medium">Chargement de votre calendrier d'examens...</p>
        </div>
      ) : filteredSchedules.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-200 dark:border-slate-800 text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-[#FF6B00] flex items-center justify-center mx-auto mb-4">
            <Calendar size={32} />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Aucune épreuve planifiée</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
            Aucun examen ne correspond à vos critères de recherche pour le moment.
            Le calendrier officiel sera publié par la Direction des Études dès la clôture des plannings.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSchedules.map((item, idx) => (
            <div
              key={item.id || idx}
              className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                item.status === 'today'
                  ? 'bg-orange-50/40 dark:bg-orange-950/20 border-orange-300 dark:border-orange-800 shadow-md ring-2 ring-[#FF6B00]/20'
                  : item.status === 'upcoming'
                  ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs hover:border-[#FF6B00]/40'
                  : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-75'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">

                {/* Bloc Gauche : Date & Matière */}
                <div className="flex items-start gap-4">
                  {/* Badge Date */}
                  <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 border ${
                    item.status === 'today'
                      ? 'bg-[#FF6B00] text-white border-orange-500 shadow-md'
                      : item.status === 'upcoming'
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                  }`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      {item.exam_date ? new Date(item.exam_date).toLocaleDateString('fr-FR', { month: 'short' }) : 'EXAM'}
                    </span>
                    <span className="text-lg font-black leading-none mt-0.5">
                      {item.exam_date ? new Date(item.exam_date).getDate() : '--'}
                    </span>
                  </div>

                  {/* Infos Matière */}
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-[11px] font-extrabold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono">
                        {item.course_code || 'CODE'}
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {item.session_name}
                      </span>
                      {item.status === 'today' && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-orange-600 text-white animate-pulse">
                          AUJOURD'HUI
                        </span>
                      )}
                    </div>
                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                      {item.course_title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {item.formatted_date || item.exam_date}
                    </p>
                  </div>
                </div>

                {/* Bloc Milieu & Droit : Horaires, Salle & Surveillant */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">

                  {/* Horaire */}
                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <Clock size={16} className="text-[#FF6B00] shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase">Horaire</p>
                      <p className="font-bold text-slate-800 dark:text-slate-200">{item.time_slot}</p>
                    </div>
                  </div>

                  {/* Salle & Bâtiment */}
                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <MapPin size={16} className="text-blue-500 shrink-0" />
                    <div className="truncate">
                      <p className="text-[10px] text-slate-400 font-semibold uppercase">Salle d'Examen</p>
                      <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                        {item.room || 'Salle non assignée'} {item.building ? `(${item.building})` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Surveillant */}
                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <User size={16} className="text-emerald-500 shrink-0" />
                    <div className="truncate">
                      <p className="text-[10px] text-slate-400 font-semibold uppercase">Surveillant</p>
                      <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                        {item.supervisor_name || 'Enseignant responsable'}
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Consignes / Notes particulières */}
              {item.notes && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50/60 dark:bg-amber-950/30 p-2.5 rounded-xl">
                  <AlertCircle size={14} className="shrink-0 mt-0.5 text-amber-500" />
                  <span><strong>Consigne :</strong> {item.notes}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Rappel des consignes générales d'examen */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden">
        <div className="space-y-1">
          <h4 className="text-sm font-extrabold flex items-center gap-2">
            <Sparkles size={16} className="text-[#FF6B00]" />
            Règlement des Épreuves & Contrôle d'Accès
          </h4>
          <p className="text-xs text-slate-300">
            Présentation obligatoire de la <strong>Carte d'Étudiant avec QR Code</strong> active. Les téléphones et montres connectées sont strictement interdits dans les salles.
          </p>
        </div>
        <Link
          href="/student/card"
          className="px-4 py-2 bg-[#FF6B00] hover:bg-orange-600 text-white rounded-xl text-xs font-bold whitespace-nowrap shadow-md transition-colors inline-flex items-center gap-1.5"
        >
          <span>Vérifier ma carte QR</span>
          <ChevronRight size={14} />
        </Link>
      </div>

    </div>
  );
}
