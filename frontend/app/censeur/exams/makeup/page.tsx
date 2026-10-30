'use client';

import { useState, useEffect } from 'react';
import {
  RotateCcw, Loader2, Search, Calendar, Users,
  CheckCircle, AlertCircle, FileSpreadsheet, Plus, ArrowRight, BookOpen
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { exportToExcel } from '@/lib/exportExcel';

interface MakeupCandidate {
  grade_id: number;
  student_id: number;
  student_name: string;
  matricule: string;
  level: string;
  filiere: string;
  course_id: number;
  course_title: string;
  course_code: string;
  credits: number;
  session_id: number;
  session_name: string;
  score: number;
  cc_score?: number;
  exam_score?: number;
  points_missing: number;
}

export default function CenseurMakeupExamsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<MakeupCandidate[]>([]);
  const [activeTab, setActiveTab] = useState<'sessions' | 'candidates'>('candidates');
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState('');

  useEffect(() => {
    loadAllMakeupData();
  }, []);

  const loadAllMakeupData = async () => {
    setLoading(true);
    try {
      const [sessionsRes, candidatesRes] = await Promise.all([
        api.get('/api/v1/exam-sessions/').catch(() => ({ data: [] })),
        api.get('/api/v1/exam-sessions/makeup/candidates').catch(() => ({ data: { candidates: [] } }))
      ]);

      const allSessions = Array.isArray(sessionsRes.data) ? sessionsRes.data : (sessionsRes.data?.data || []);
      const makeupSessions = allSessions.filter((s: any) => s.session_type === 'makeup');
      setSessions(makeupSessions);

      const candidateList = candidatesRes.data?.candidates || [];
      setCandidates(candidateList);
    } catch (error) {
      toast.error('Erreur de chargement des données de rattrapage');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCandidatesExcel = () => {
    if (candidates.length === 0) {
      toast.error('Aucun candidat à exporter');
      return;
    }
    const rows = candidates.map(c => ({
      Matricule: c.matricule,
      Étudiant: c.student_name,
      Niveau: c.level,
      Filière: c.filiere,
      Cours: c.course_title,
      Code: c.course_code,
      'Note Session Normale': `${c.score}/20`,
      'Points Manquants': c.points_missing,
      Session: c.session_name
    }));
    exportToExcel(rows, {
      filename: `convoques_rattrapage_${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: 'Rattrapages'
    });
    toast.success('Liste des rattrapages exportée en Excel');
  };

  const filteredSessions = sessions.filter(s =>
    (s.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const filteredCandidates = candidates.filter(c => {
    const matchSearch =
      (c.student_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.matricule || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.course_title || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.filiere || '').toLowerCase().includes(search.toLowerCase());
    const matchLevel = !filterLevel || c.level === filterLevel;
    return matchSearch && matchLevel;
  });

  const uniqueLevels = [...new Set(candidates.map(c => c.level).filter(Boolean))];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-[#FF6B00]" size={36} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20 text-white">
              <RotateCcw size={22} />
            </div>
            Sessions & Candidats au Rattrapage
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Gestion des examens de rattrapage et des étudiants ajournés (&lt; 10/20).
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportCandidatesExcel}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-sm"
          >
            <FileSpreadsheet size={16} />
            Exporter Convocations (Excel)
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-slate-200 gap-4">
        <button
          onClick={() => setActiveTab('candidates')}
          className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'candidates'
              ? 'border-[#FF6B00] text-[#FF6B00]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users size={16} />
          Étudiants ajournés à rattraper ({candidates.length})
        </button>
        <button
          onClick={() => setActiveTab('sessions')}
          className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'sessions'
              ? 'border-[#FF6B00] text-[#FF6B00]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Calendar size={16} />
          Sessions d'examen programmées ({sessions.length})
        </button>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <RotateCcw size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Modules en échec</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-900">{candidates.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Étudiants concernés</p>
              <p className="text-xl sm:text-2xl font-bold text-red-700">
                {new Set(candidates.map(c => c.student_id)).size}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Sessions rattrapage</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-700">{sessions.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <CheckCircle size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Barème admission</p>
              <p className="text-xl sm:text-2xl font-bold text-emerald-700">&ge; 10/20</p>
            </div>
          </div>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={
                activeTab === 'candidates'
                  ? '🔍 Rechercher par étudiant, matricule, cours, filière...'
                  : '🔍 Rechercher une session...'
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>
          {activeTab === 'candidates' && (
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            >
              <option value="">Tous les niveaux</option>
              {uniqueLevels.map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* VUE 1 : CANDIDATS AU RATTRAPAGE */}
      {activeTab === 'candidates' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {filteredCandidates.length === 0 ? (
            <div className="p-16 text-center">
              <CheckCircle size={48} className="text-emerald-400 mx-auto mb-3" />
              <p className="text-slate-700 font-bold text-base">Aucun étudiant ajourné au rattrapage !</p>
              <p className="text-xs text-slate-500 mt-1">
                Tous les étudiants ont validé leurs modules avec une note supérieure ou égale à 10/20.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto min-w-[750px]">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Étudiant</th>
                    <th className="py-3 px-4">Filière & Niveau</th>
                    <th className="py-3 px-4">Module à rattraper</th>
                    <th className="py-3 px-4 text-center">Note Obtenue</th>
                    <th className="py-3 px-4 text-center">Points Manquants</th>
                    <th className="py-3 px-4">Session d'origine</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCandidates.map((cand) => (
                    <tr key={`${cand.student_id}-${cand.course_id}`} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{cand.student_name}</p>
                        <p className="font-mono text-xs text-[#FF6B00]">{cand.matricule}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-800">{cand.filiere}</span>
                        <span className="ml-2 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-bold">
                          {cand.level}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">{cand.course_title}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{cand.course_code} ({cand.credits} crédits)</p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2.5 py-1 rounded-lg font-black text-xs bg-red-100 text-red-700 border border-red-200">
                          {cand.score !== null ? `${cand.score.toFixed(1)}/20` : 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-amber-700 font-bold">
                          -{cand.points_missing} pts
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">
                        {cand.session_name}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VUE 2 : SESSIONS DE RATTRAPAGE */}
      {activeTab === 'sessions' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {filteredSessions.length === 0 ? (
            <div className="p-16 text-center">
              <RotateCcw size={48} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-bold">Aucune session de rattrapage créée</p>
              <p className="text-xs text-slate-400 mt-1">
                Créez une session de type "Rattrapage" dans la gestion des sessions pour programmer les épreuves.
              </p>
              <Link
                href="/censeur/exams/sessions"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-xs font-semibold"
              >
                <Plus size={14} /> Créer une session de rattrapage
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredSessions.map(session => (
                <div key={session.id} className="p-4 sm:p-5 hover:bg-slate-50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 sm:gap-4 flex-1">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs">
                        <RotateCcw size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm sm:text-base">{session.name}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          📅 {session.start_date ? new Date(session.start_date).toLocaleDateString('fr-FR') : '?'}
                          {' → '}
                          {session.end_date ? new Date(session.end_date).toLocaleDateString('fr-FR') : '?'}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold self-start sm:self-auto ${
                      session.status === 'open' ? 'bg-green-100 text-green-700' :
                      session.status === 'closed' ? 'bg-slate-100 text-slate-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {session.status === 'open' ? 'En cours' :
                       session.status === 'closed' ? 'Clôturée' : 'À venir'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}