'use client';
import { useState, useEffect } from 'react';
import {
  CheckCircle, XCircle, Clock, AlertTriangle,
  Search, Loader2, Lock, Unlock
} from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/hooks/useConfirm';

export default function CenseurPendingGradesPage() {
  const toast = useToast();
  const { confirm } = useConfirm();
  
  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterSession, setFilterSession] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [sessions, setSessions] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [lockingAction, setLockingAction] = useState(false);

  useEffect(() => {
    loadPendingGrades();
    loadLockStatus();
  }, []);

  const loadLockStatus = async () => {
    try {
      const res = await api.get('/api/v1/grades/lock-status');
      setIsLocked(res.data?.is_locked || false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleLock = async () => {
    const actionLabel = isLocked ? 'rouvrir' : 'fermer (verrouiller)';
    const ok = await confirm({
      title: `${isLocked ? 'Rouvrir' : 'Fermer'} la saisie des notes ?`,
      message: `Êtes-vous sûr de vouloir ${actionLabel} la saisie des notes pour les examens ? ${
        !isLocked ? 'Plus aucune note ne pourra être modifiée ou saisie tant que le verrouillage est actif.' : ''
      }`,
      confirmText: isLocked ? 'Rouvrir la saisie' : 'Fermer la saisie',
      cancelText: 'Annuler',
      variant: isLocked ? 'info' : 'warning',
      icon: 'alert'
    });

    if (ok) {
      setLockingAction(true);
      try {
        const res = await api.post('/api/v1/grades/toggle-lock', {});
        setIsLocked(res.data?.is_locked);
        toast.success(res.data?.message || 'Statut de saisie mis à jour');
      } catch (err: any) {
        toast.error(err.response?.data?.detail || 'Erreur lors du changement de verrouillage');
      } finally {
        setLockingAction(false);
      }
    }
  };

  const loadPendingGrades = async () => {
    setLoading(true);
    try {
      const [gradesRes, sessionsRes, coursesRes] = await Promise.all([
        api.get('/api/v1/grades/').catch(() => ({ data: [] })),
        api.get('/api/v1/exam-sessions/').catch(() => ({ data: [] })),
        api.get('/api/v1/courses/').catch(() => ({ data: [] }))
      ]);
      const allGrades = Array.isArray(gradesRes.data) ? gradesRes.data : (gradesRes.data?.data || []);
      const pending = allGrades.filter((g: any) => g.status === 'draft' || g.status === 'pending');
      setGrades(pending);
      setSessions(Array.isArray(sessionsRes.data) ? sessionsRes.data : (sessionsRes.data?.data || []));
      setCourses(Array.isArray(coursesRes.data) ? coursesRes.data : (coursesRes.data?.data || []));
    } catch (error) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async (gradeId: number, studentName: string) => {
    const ok = await confirm({
      title: 'Valider cette note ?',
      message: `Voulez-vous valider la note de ${studentName} ? Elle sera définitive et visible par l'étudiant.`,
      confirmText: 'Valider',
      cancelText: 'Annuler',
      variant: 'success',
      icon: 'check'
    });

    if (ok) {
      try {
        await api.put(`/api/v1/grades/${gradeId}/validate`);
        toast.success('Note validée avec succès');
        loadPendingGrades();
      } catch (error: any) {
        toast.error(error.response?.data?.detail || 'Erreur de validation');
      }
    }
  };

  const handleReject = async (gradeId: number, studentName: string) => {
    const ok = await confirm({
      title: 'Rejeter cette note ?',
      message: `Voulez-vous vraiment rejeter la note de ${studentName} ? L'enseignant devra la ressaisir.`,
      confirmText: 'Rejeter',
      cancelText: 'Annuler',
      variant: 'warning',
      icon: 'alert'
    });

    if (ok) {
      try {
        await api.put(`/api/v1/grades/${gradeId}/reject`, null, {
          params: { reason: null }
        });
        toast.success('Note rejetée');
        loadPendingGrades();
      } catch (error: any) {
        toast.error(error.response?.data?.detail || 'Erreur');
      }
    }
  };

  const filteredGrades = grades.filter(g => {
    const matchSearch =
      (g.student_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (g.course_title || '').toLowerCase().includes(search.toLowerCase());
    const matchSession = !filterSession || g.session_id?.toString() === filterSession;
    const matchCourse = !filterCourse || g.course_id?.toString() === filterCourse;
    return matchSearch && matchSession && matchCourse;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-[#FF6B00]" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-green-500/20">
              <CheckCircle size={22} />
            </div>
            Notes à valider
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">Validez ou rejetez les notes saisies par les enseignants et secrétaires</p>
        </div>

        <button
          onClick={handleToggleLock}
          disabled={lockingAction}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all self-start sm:self-auto ${
            isLocked
              ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20'
              : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20'
          }`}
          title={isLocked ? 'La saisie est actuellement fermée' : 'La saisie est actuellement ouverte'}
        >
          {lockingAction ? (
            <Loader2 size={16} className="animate-spin" />
          ) : isLocked ? (
            <Unlock size={16} className="text-amber-200" />
          ) : (
            <Lock size={16} className="text-orange-400" />
          )}
          {isLocked ? 'Rouvrir la saisie des notes' : 'Fermer la saisie des notes'}
        </button>
      </div>

      {isLocked && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2.5 text-xs text-amber-800">
          <Lock size={16} className="text-amber-600 shrink-0" />
          <span><strong>Saisie des notes verrouillée :</strong> Les sessions d'examens sont clôturées. Aucune modification de note n'est actuellement permise aux enseignants.</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="🔍 Rechercher par étudiant ou cours..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>
          <select value={filterSession} onChange={(e) => setFilterSession(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]">
            <option value="">Toutes les sessions</option>
            {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]">
            <option value="">Tous les cours</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <Clock size={20} className="text-orange-600 mb-2" />
          <p className="text-xs text-slate-600">En attente</p>
          <p className="text-xl sm:text-2xl font-bold text-orange-700">{grades.length}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <AlertTriangle size={20} className="text-red-600 mb-2" />
          <p className="text-xs text-slate-600">Anomalies</p>
          <p className="text-xl sm:text-2xl font-bold text-red-700">
            {grades.filter(g => g.score !== null && (g.score > 18 || g.score < 5)).length}
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <CheckCircle size={20} className="text-blue-600 mb-2" />
          <p className="text-xs text-slate-600">Filtrées</p>
          <p className="text-xl sm:text-2xl font-bold text-blue-700">{filteredGrades.length}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <CheckCircle size={20} className="text-green-600 mb-2" />
          <p className="text-xs text-slate-600">Sessions</p>
          <p className="text-xl sm:text-2xl font-bold text-green-700">{sessions.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredGrades.length === 0 ? (
          <div className="p-16 text-center">
            <CheckCircle size={48} className="text-green-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Aucune note en attente de validation</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredGrades.map((grade) => {
              const hasAnomaly = grade.score !== null && (grade.score > 18 || grade.score < 5);
              return (
                <div key={grade.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center font-bold text-base sm:text-lg shrink-0 ${
                        hasAnomaly ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {grade.score !== null ? grade.score.toFixed(1) : '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-slate-900 text-sm truncate">{grade.student_name || 'Étudiant'}</p>
                          {hasAnomaly && (
                            <span className="text-[10px] px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-bold flex items-center gap-1">
                              <AlertTriangle size={10} /> Anomalie
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          {grade.course_title || 'Cours'} • {grade.session_name || 'Session'}
                        </p>
                        {grade.comment && (
                          <p className="text-xs text-slate-400 mt-0.5 italic">💬 {grade.comment}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button
                        onClick={() => handleValidate(grade.id, grade.student_name || 'cet étudiant')}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-xs"
                      >
                        <CheckCircle size={14} /> Valider
                      </button>
                      <button
                        onClick={() => handleReject(grade.id, grade.student_name || 'cet étudiant')}
                        className="px-3.5 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-xs"
                      >
                        <XCircle size={14} /> Rejeter
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}