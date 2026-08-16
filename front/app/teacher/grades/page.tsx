'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Edit3, Save, CheckCircle, Clock, AlertTriangle,
  Search, Loader2, Users, BookOpen, Award
} from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

export default function TeacherGradesPage() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [grades, setGrades] = useState<Record<number, { cc: string; exam: string }>>({});
  const [search, setSearch] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedCourse && selectedSession) {
      loadStudentsAndGrades();
    }
  }, [selectedCourse, selectedSession]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [coursesRes, sessionsRes] = await Promise.all([
        api.get('/api/v1/teacher/courses'),
        api.get('/api/v1/exam-sessions/').catch(() => ({ data: [] }))
      ]);
      setCourses(Array.isArray(coursesRes.data) ? coursesRes.data : []);
      const sessionsData = Array.isArray(sessionsRes.data) ? sessionsRes.data : [];
      setSessions(sessionsData);

      // ✅ LIRE LES PARAMÈTRES URL
      const courseParam = searchParams.get('course');
      if (courseParam) {
        setSelectedCourse(parseInt(courseParam));
      } else if (coursesRes.data.length > 0) {
        setSelectedCourse(coursesRes.data[0].id);
      }

      if (sessionsData.length > 0) {
        setSelectedSession(sessionsData[0].id);
      }
    } catch (error) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const loadStudentsAndGrades = async () => {
    if (!selectedCourse || !selectedSession) return;
    try {
      const response = await api.get('/api/v1/grades/by-context', {
        params: { session_id: selectedSession, course_id: selectedCourse }
      });
      const data = response.data;
      const studentsList = data.students || [];
      setStudents(studentsList);

      const gradesMap: Record<number, { cc: string; exam: string }> = {};
      studentsList.forEach((s: any) => {
        gradesMap[s.student_id] = {
          cc: s.cc_score?.toString() || '',
          exam: s.exam_score?.toString() || ''
        };
      });
      setGrades(gradesMap);
      setHasChanges(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleGradeChange = (studentId: number, field: 'cc' | 'exam', value: string) => {
    setGrades(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value }
    }));
    setHasChanges(true);
  };

  const calculateFinal = (studentId: number): number | null => {
    const g = grades[studentId];
    if (!g) return null;
    const cc = parseFloat(g.cc);
    const exam = parseFloat(g.exam);
    if (isNaN(cc) && isNaN(exam)) return null;
    if (!isNaN(cc) && !isNaN(exam)) return cc * 0.3 + exam * 0.7;
    if (!isNaN(cc)) return cc;
    return exam;
  };

  const getGradeColor = (score: number | null): string => {
    if (score === null) return 'text-slate-400';
    if (score >= 15) return 'text-green-600 bg-green-50';
    if (score >= 10) return 'text-blue-600 bg-blue-50';
    if (score >= 5) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  // ✅ CORRECTION CRITIQUE : Envoyer session_id et course_id
  const handleSave = async (status: 'draft' | 'validated') => {
    if (!selectedCourse || !selectedSession) {
      toast.error('Veuillez sélectionner un cours et une session');
      return;
    }

    const gradesArray = Object.entries(grades)
      .filter(([_, g]) => g.cc || g.exam)
      .map(([studentId, g]) => ({
        student_id: parseInt(studentId),
        cc_score: g.cc ? parseFloat(g.cc) : null,
        exam_score: g.exam ? parseFloat(g.exam) : null,
        comment: ''
      }));

    if (gradesArray.length === 0) {
      toast.error('Aucune note à sauvegarder');
      return;
    }

    setSaving(true);
    try {
      await api.post('/api/v1/grades/bulk', {
        session_id: selectedSession,      // ✅ AJOUTÉ
        course_id: selectedCourse,         // ✅ AJOUTÉ
        grades: gradesArray,
        status: status,
        cc_coefficient: 0.3,
        exam_coefficient: 0.7
      });

      toast.success(status === 'validated'
        ? '✅ Notes envoyées au censeur pour validation'
        : '✅ Brouillon sauvegardé');
      setHasChanges(false);
      loadStudentsAndGrades();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = students.filter(s => {
    const fullName = s.student_name.toLowerCase();
    return fullName.includes(search.toLowerCase()) ||
      s.matricule.toLowerCase().includes(search.toLowerCase());
  });

  const stats = {
    total: students.length,
    graded: Object.keys(grades).filter(k => grades[parseInt(k)].cc || grades[parseInt(k)].exam).length,
    average: (() => {
      const finals = students.map(s => calculateFinal(s.student_id)).filter(f => f !== null) as number[];
      return finals.length > 0 ? finals.reduce((a, b) => a + b, 0) / finals.length : 0;
    })()
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
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-[#FF6B00] to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
            <Edit3 size={24} className="text-white" />
          </div>
          Saisie des notes
        </h1>
        <p className="text-slate-500 mt-1">Saisissez les notes CC et Examen pour vos étudiants</p>
      </div>

      {/* Sélecteurs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-2">Session</label>
            <select
              value={selectedSession || ''}
              onChange={(e) => setSelectedSession(parseInt(e.target.value))}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            >
              <option value="">Sélectionner une session</option>
              {sessions.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-2">Cours</label>
            <select
              value={selectedCourse || ''}
              onChange={(e) => setSelectedCourse(parseInt(e.target.value))}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            >
              <option value="">Sélectionner un cours</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.title} ({c.level})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      {selectedCourse && selectedSession && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users size={16} className="text-blue-600" />
              <p className="text-xs text-slate-500">Étudiants</p>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size={16} className="text-green-600" />
              <p className="text-xs text-slate-500">Notes saisies</p>
            </div>
            <p className="text-2xl font-bold text-green-600">{stats.graded}/{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Award size={16} className="text-purple-600" />
              <p className="text-xs text-slate-500">Moyenne</p>
            </div>
            <p className="text-2xl font-bold text-purple-600">{stats.average.toFixed(2)}/20</p>
          </div>
        </div>
      )}

      {/* Recherche */}
      {students.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="🔍 Rechercher un étudiant..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>
        </div>
      )}

      {/* Tableau */}
      {selectedCourse && selectedSession && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {students.length === 0 ? (
            <div className="p-16 text-center">
              <BookOpen size={48} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Aucun étudiant dans ce cours</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">N°</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Étudiant</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Matricule</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase">CC (30%)</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Examen (70%)</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Finale</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map((student, idx) => {
                      const final = calculateFinal(student.student_id);
                      return (
                        <tr key={student.student_id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 text-sm text-slate-500">{idx + 1}</td>
                          <td className="py-3 px-4">
                            <p className="font-semibold text-slate-900 text-sm">{student.student_name}</p>
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-slate-600">{student.matricule}</td>
                          <td className="py-3 px-4">
                            <input
                              type="number"
                              min="0"
                              max="20"
                              step="0.25"
                              value={grades[student.student_id]?.cc || ''}
                              onChange={(e) => handleGradeChange(student.student_id, 'cc', e.target.value)}
                              placeholder="0-20"
                              className="w-20 px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="number"
                              min="0"
                              max="20"
                              step="0.25"
                              value={grades[student.student_id]?.exam || ''}
                              onChange={(e) => handleGradeChange(student.student_id, 'exam', e.target.value)}
                              placeholder="0-20"
                              className="w-20 px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                            />
                          </td>
                          <td className="py-3 px-4 text-center">
                            {final !== null ? (
                              <span className={`inline-block px-3 py-1 rounded-lg font-bold text-sm ${getGradeColor(final)}`}>
                                {final.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Boutons */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  {hasChanges && (
                    <span className="flex items-center gap-1 text-orange-600">
                      <AlertTriangle size={14} />
                      Modifications non sauvegardées
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSave('draft')}
                    disabled={saving || !hasChanges}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    <Clock size={16} />
                    {saving ? 'Sauvegarde...' : 'Brouillon'}
                  </button>
                  <button
                    onClick={() => handleSave('validated')}
                    disabled={saving || !hasChanges}
                    className="flex items-center gap-2 px-4 py-2 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    <CheckCircle size={16} />
                    {saving ? 'Envoi...' : 'Valider et envoyer'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}