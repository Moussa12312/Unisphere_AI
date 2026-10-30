'use client';

import { useState, useEffect } from 'react';
import {
  Loader2, Save, CheckCircle2, AlertCircle, Edit3,
  Search, Users, BookOpen, Calendar
} from 'lucide-react';
import { examSessionService, ExamSession } from '@/services/examSessionService';
import { courseService, Course } from '@/services/courseService';
import { classService, ClassRoom } from '@/services/classService';
import { gradeService, GradeEntry } from '@/services/gradeService';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { getApiErrorMessage } from '@/lib/errorHandler';

export default function SecretaryGradesEntryPage() {
  const toast = useToast();
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [grades, setGrades] = useState<GradeEntry[]>([]);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [search, setSearch] = useState('');
  const [ccCoeff, setCcCoeff] = useState(0.3);
  const [examCoeff, setExamCoeff] = useState(0.7);
  const [maxGrade, setMaxGrade] = useState(20.0);
  const [isLocked, setIsLocked] = useState(false);
  const [togglingLock, setTogglingLock] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [sessionsData, classesData, coursesData, configRes, lockRes] = await Promise.all([
        examSessionService.getAll(),
        classService.getAll(),
        courseService.getAll(),
        api.get('/api/v1/settings/academic/config').catch(() => ({ data: {} })),
        api.get('/api/v1/grades/lock-status').catch(() => ({ data: { is_locked: false } }))
      ]);
      setSessions(sessionsData.filter((s: ExamSession) => s.status !== 'closed'));
      setClasses(classesData);
      setCourses(coursesData);
      setIsLocked(!!lockRes?.data?.is_locked);
      if (configRes?.data) {
        if (configRes.data.default_cc_coefficient !== undefined) setCcCoeff(configRes.data.default_cc_coefficient);
        if (configRes.data.default_exam_coefficient !== undefined) setExamCoeff(configRes.data.default_exam_coefficient);
        if (configRes.data.max_grade !== undefined) setMaxGrade(configRes.data.max_grade);
      }
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLock = async () => {
    setTogglingLock(true);
    try {
      const res = await api.post('/api/v1/grades/toggle-lock');
      setIsLocked(res.data.is_locked);
      toast.success(res.data.message);
    } catch (err: any) {
      toast.error('Erreur lors de la modification du verrouillage des notes');
    } finally {
      setTogglingLock(false);
    }
  };

  useEffect(() => {
    if (selectedSessionId && selectedClassId && selectedCourseId) {
      loadGrades();
    }
  }, [selectedSessionId, selectedClassId, selectedCourseId]);

  const loadGrades = async () => {
    if (!selectedSessionId || !selectedCourseId) return;
    setLoadingGrades(true);
    try {
      const contextData = await gradeService.getByContext(selectedSessionId, selectedCourseId);
      setGrades(contextData.students);
      const ctx = contextData as any;
      if (ctx.default_cc_coefficient !== undefined) setCcCoeff(ctx.default_cc_coefficient);
      if (ctx.default_exam_coefficient !== undefined) setExamCoeff(ctx.default_exam_coefficient);
      if (ctx.max_grade !== undefined) setMaxGrade(ctx.max_grade);
      setHasChanges(false);
    } catch (error) {
      toast.error('Erreur lors du chargement des notes');
    } finally {
      setLoadingGrades(false);
    }
  };

  // ✅ Gérer CC et Examen dynamiquement selon la configuration de l'établissement (Plafond strict 20/20)
  const handleGradeChange = (studentId: number, field: 'cc_score' | 'exam_score', value: string) => {
    let parsedVal: number | null = null;
    if (value !== '') {
      const num = parseFloat(value);
      if (isNaN(num)) return;
      if (num < 0) {
        parsedVal = 0;
        toast.warning('La note ne peut pas être inférieure à 0.');
      } else if (num > maxGrade) {
        parsedVal = maxGrade;
        toast.warning(`La note maximale autorisée est de ${maxGrade}/20.`);
      } else {
        parsedVal = Math.round(num * 100) / 100;
      }
    }

    setGrades(prev => prev.map(g => {
      if (g.student_id === studentId) {
        const updated = { ...g, [field]: parsedVal };
        // Calculer la note finale automatiquement avec les coefficients réels
        const cc = updated.cc_score;
        const exam = updated.exam_score;
        if (cc !== null && exam !== null && !isNaN(cc) && !isNaN(exam)) {
          const calculated = Math.round((cc * ccCoeff + exam * examCoeff) * 100) / 100;
          updated.score = Math.min(maxGrade, Math.max(0, calculated));
        } else if (cc !== null && !isNaN(cc)) {
          updated.score = Math.min(maxGrade, Math.max(0, cc));
        } else if (exam !== null && !isNaN(exam)) {
          updated.score = Math.min(maxGrade, Math.max(0, exam));
        } else {
          updated.score = null;
        }
        updated.status = updated.score !== null ? 'draft' : 'not_graded';
        return updated;
      }
      return g;
    }));
    setHasChanges(true);
  };

  const handleSave = async (status: 'draft' | 'validated') => {
    if (!selectedSessionId || !selectedCourseId) return;

    // Validation préalable stricte du barème 0 à 20
    for (const g of grades) {
      if (g.cc_score !== null && (g.cc_score < 0 || g.cc_score > maxGrade)) {
        toast.error(`La note CC de ${g.student_name} (${g.cc_score}) dépasse le barème (0-${maxGrade}).`);
        return;
      }
      if (g.exam_score !== null && (g.exam_score < 0 || g.exam_score > maxGrade)) {
        toast.error(`La note d'examen de ${g.student_name} (${g.exam_score}) dépasse le barème (0-${maxGrade}).`);
        return;
      }
    }

    setSaving(true);
    try {
      const gradesData = grades
        .filter(g => g.cc_score !== null || g.exam_score !== null)
        .map(g => ({
          student_id: g.student_id,
          cc_score: g.cc_score,
          exam_score: g.exam_score,
          comment: g.comment || ''
        }));

      await gradeService.bulkSave({
        session_id: selectedSessionId,
        course_id: selectedCourseId,
        grades: gradesData,
        status,
        cc_coefficient: ccCoeff,
        exam_coefficient: examCoeff
      });

      toast.success(
        status === 'validated'
          ? 'Notes envoyées au censeur pour validation'
          : 'Brouillon sauvegardé'
      );
      setHasChanges(false);
      loadGrades();
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, 'Erreur lors de la sauvegarde'));
    } finally {
      setSaving(false);
    }
  };

  const filteredCourses = selectedClassId
    ? courses.filter(c => {
        const selectedClass = classes.find(cl => cl.id === selectedClassId);
        if (!selectedClass) return false;

        const matchLevel = !c.level || c.level === selectedClass.level;
        if (!matchLevel) return false;

        const cleanClassFiliere = (selectedClass.filiere_name || '').toLowerCase().trim();
        const cleanCourseDept = (c.department || '').toLowerCase().trim();
        const cleanCourseFiliere = (c.filiere_name || '').toLowerCase().trim();

        const matchFiliere = 
          (c.filiere_id && selectedClass.filiere_id && c.filiere_id === selectedClass.filiere_id) ||
          (cleanCourseFiliere && cleanCourseFiliere === cleanClassFiliere) ||
          (cleanCourseDept && cleanCourseDept === cleanClassFiliere) ||
          (cleanCourseDept && cleanClassFiliere.includes(cleanCourseDept)) ||
          (cleanCourseFiliere && cleanClassFiliere.includes(cleanCourseFiliere)) ||
          (cleanClassFiliere && cleanCourseDept.includes(cleanClassFiliere));

        return matchFiliere;
      })
    : courses;

  const filteredGrades = grades.filter(g => {
    const name = `${g.student_name}`.toLowerCase();
    return name.includes(search.toLowerCase()) ||
      g.matricule.toLowerCase().includes(search.toLowerCase());
  });

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-slate-400';
    if (score < 5) return 'text-red-700 bg-red-50 border-red-200';
    if (score < 10) return 'text-orange-700 bg-orange-50 border-orange-200';
    if (score < 15) return 'text-blue-700 bg-blue-50 border-blue-200';
    return 'text-green-700 bg-green-50 border-green-200';
  };

  const selectedSession = sessions.find(s => s.id === selectedSessionId);
  const selectedClass = classes.find(c => c.id === selectedClassId);
  const selectedCourse = courses.find(c => c.id === selectedCourseId);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#FF6B00] to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Edit3 size={24} className="text-white" />
            </div>
            Saisie des notes
          </h1>
          <p className="text-slate-500 mt-1">Saisissez les notes CC et Examen par cours</p>
        </div>

        <div>
          <button
            onClick={handleToggleLock}
            disabled={togglingLock}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm ${
              isLocked
                ? 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {isLocked ? (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
                🔒 Saisie clôturée (Rouvrir la saisie)
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-200"></span>
                🔓 Saisie ouverte (Fermer la saisie)
              </>
            )}
          </button>
        </div>
      </div>

      {isLocked && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-sm text-amber-800">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p>
            <strong>Attention :</strong> La saisie et modification des notes est actuellement clôturée par l'administration. Les modifications sont temporairement verrouillées.
          </p>
        </div>
      )}

      {/* Sélecteurs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              <Calendar size={12} className="inline mr-1" />
              Session *
            </label>
            <select
              value={selectedSessionId || ''}
              onChange={(e) => setSelectedSessionId(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            >
              <option value="">Sélectionner...</option>
              {sessions.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              <Users size={12} className="inline mr-1" />
              Classe *
            </label>
            <select
              value={selectedClassId || ''}
              onChange={(e) => {
                setSelectedClassId(e.target.value ? parseInt(e.target.value) : null);
                setSelectedCourseId(null);
              }}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            >
              <option value="">Sélectionner...</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              <BookOpen size={12} className="inline mr-1" />
              Cours *
            </label>
            <select
              value={selectedCourseId || ''}
              onChange={(e) => setSelectedCourseId(e.target.value ? parseInt(e.target.value) : null)}
              disabled={!selectedClassId}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white disabled:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            >
              <option value="">
                {!selectedClassId ? 'Choisissez classe...' : 'Sélectionner...'}
              </option>
              {filteredCourses.map(c => (
                <option key={c.id} value={c.id}>{c.title} ({c.code})</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            {selectedSession && selectedClass && selectedCourse && (
              <div className="p-3 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg text-xs">
                <p className="font-semibold text-orange-800">{selectedCourse.title}</p>
                <p className="text-orange-600">{selectedClass.name} • {selectedSession.name}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contenu */}
      {selectedSessionId && selectedClassId && selectedCourseId ? (
        <>
          {/* Barre d'outils */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="relative w-96">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="🔍 Rechercher un étudiant..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>
              <div className="text-sm text-slate-600">
                {filteredGrades.length} étudiant{filteredGrades.length > 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Tableau */}
          {loadingGrades ? (
            <div className="flex items-center justify-center py-16 bg-white rounded-2xl border border-slate-200">
              <Loader2 className="animate-spin text-[#FF6B00]" size={32} />
            </div>
          ) : grades.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
              <AlertCircle size={48} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Aucun étudiant trouvé</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">#</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Étudiant</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Matricule</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase w-32">CC ({Math.round(ccCoeff * 100)}%)</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase w-32">Examen ({Math.round(examCoeff * 100)}%)</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase w-32">Finale</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase w-24">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredGrades.map((grade, index) => (
                      <tr key={grade.student_id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 text-xs text-slate-400">{index + 1}</td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-900 text-sm">{grade.student_name}</p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-xs text-slate-500 font-mono">{grade.matricule}</p>
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="number"
                            min="0"
                            max={maxGrade}
                            step="0.25"
                            value={grade.cc_score !== null ? grade.cc_score : ''}
                            onChange={(e) => handleGradeChange(grade.student_id, 'cc_score', e.target.value)}
                            placeholder={`0-${maxGrade}`}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="number"
                            min="0"
                            max={maxGrade}
                            step="0.25"
                            value={grade.exam_score !== null ? grade.exam_score : ''}
                            onChange={(e) => handleGradeChange(grade.student_id, 'exam_score', e.target.value)}
                            placeholder={`0-${maxGrade}`}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                          />
                        </td>
                        <td className="py-3 px-4 text-center">
                          {grade.score !== null ? (
                            <span className={`inline-block px-3 py-1 rounded-lg font-bold text-sm ${getScoreColor(grade.score)}`}>
                              {grade.score.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {grade.score === null ? (
                            <span className="text-xs px-2 py-1 bg-slate-100 text-slate-500 rounded">Non noté</span>
                          ) : grade.status === 'validated' ? (
                            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded flex items-center gap-1 justify-center">
                              <CheckCircle2 size={10} /> Validé
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded">Brouillon</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Boutons */}
              <div className="border-t border-slate-200 p-4 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  {hasChanges ? (
                    <span className="flex items-center gap-1 text-orange-600">
                      <AlertCircle size={12} /> Modifications non sauvegardées
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 size={12} /> Sauvegardé
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSave('draft')}
                    disabled={saving || !hasChanges}
                    className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    Sauvegarder brouillon
                  </button>
                  <button
                    onClick={() => handleSave('validated')}
                    disabled={saving || !hasChanges}
                    className="px-4 py-2 bg-gradient-to-r from-[#FF6B00] to-orange-500 hover:from-[#e55f00] hover:to-orange-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    Valider et envoyer
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <Edit3 size={48} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Sélectionnez une session, une classe et un cours pour commencer</p>
        </div>
      )}
    </div>
  );
}