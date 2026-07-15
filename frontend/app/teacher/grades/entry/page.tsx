'use client';

import { useState, useEffect } from 'react';
import {
  Edit3, Save, CheckCircle, Clock, AlertTriangle,
  Search, Loader2, Users, BookOpen, Award, Download,
  Upload, MessageSquare, TrendingUp, TrendingDown
} from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

interface Student {
  student_id: number;
  student_name: string;
  matricule: string;
  cc_score: number | null;
  exam_score: number | null;
  score: number | null;
  comment: string | null;
  status: string;
  grade_id: number | null;
}

export default function TeacherGradesEntryPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Record<number, { cc: string; exam: string; comment: string }>>({});
  const [search, setSearch] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [ccCoeff, setCcCoeff] = useState(0.3);
  const [examCoeff, setExamCoeff] = useState(0.7);

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
      if (coursesRes.data.length > 0) setSelectedCourse(coursesRes.data[0].id);
      if (sessionsData.length > 0) setSelectedSession(sessionsData[0].id);
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

      const gradesMap: Record<number, { cc: string; exam: string; comment: string }> = {};
      studentsList.forEach((s: any) => {
        gradesMap[s.student_id] = {
          cc: s.cc_score?.toString() || '',
          exam: s.exam_score?.toString() || '',
          comment: s.comment || ''
        };
      });
      setGrades(gradesMap);
      setHasChanges(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleGradeChange = (studentId: number, field: 'cc' | 'exam' | 'comment', value: string) => {
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
    if (!isNaN(cc) && !isNaN(exam)) return cc * ccCoeff + exam * examCoeff;
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
        comment: g.comment || null
      }));

    if (gradesArray.length === 0) {
      toast.error('Aucune note à sauvegarder');
      return;
    }

    setSaving(true);
    try {
      await api.post('/api/v1/grades/bulk', {
        session_id: selectedSession,
        course_id: selectedCourse,
        grades: gradesArray,
        status: status,
        cc_coefficient: ccCoeff,
        exam_coefficient: examCoeff
      });
      toast.success(status === 'validated' ? '✅ Notes validées' : '✅ Brouillon sauvegardé');
      setHasChanges(false);
      loadStudentsAndGrades();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const exportCSV = () => {
    const course = courses.find(c => c.id === selectedCourse);
    const session = sessions.find(s => s.id === selectedSession);
    
    let csv = 'Matricule,Nom,CC,Examen,Finale,Commentaire\n';
    students.forEach(s => {
      const g = grades[s.student_id];
      const final = calculateFinal(s.student_id);
      csv += `${s.matricule},${s.student_name},${g?.cc || ''},${g?.exam || ''},${final?.toFixed(2) || ''},"${g?.comment || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notes_${course?.code || 'cours'}_${session?.name || 'session'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export CSV réussi');
  };

  const importCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').slice(1);
      let imported = 0;

      lines.forEach(line => {
        if (!line.trim()) return;
        const parts = line.split(',');
        const matricule = parts[0]?.trim();
        const cc = parts[2]?.trim();
        const exam = parts[3]?.trim();
        const comment = parts[5]?.replace(/"/g, '').trim();

        const student = students.find(s => s.matricule === matricule);
        if (student) {
          setGrades(prev => ({
            ...prev,
            [student.student_id]: {
              cc: cc || prev[student.student_id]?.cc || '',
              exam: exam || prev[student.student_id]?.exam || '',
              comment: comment || prev[student.student_id]?.comment || ''
            }
          }));
          imported++;
        }
      });

      setHasChanges(true);
      toast.success(`${imported} notes importées`);
    };
    reader.readAsText(file);
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
    })(),
    min: (() => {
      const finals = students.map(s => calculateFinal(s.student_id)).filter(f => f !== null) as number[];
      return finals.length > 0 ? Math.min(...finals) : 0;
    })(),
    max: (() => {
      const finals = students.map(s => calculateFinal(s.student_id)).filter(f => f !== null) as number[];
      return finals.length > 0 ? Math.max(...finals) : 0;
    })(),
    passRate: (() => {
      const finals = students.map(s => calculateFinal(s.student_id)).filter(f => f !== null) as number[];
      if (finals.length === 0) return 0;
      const passing = finals.filter(f => f >= 10).length;
      return (passing / finals.length) * 100;
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

        {/* Coefficients */}
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-200">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-2">Coefficient CC</label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={ccCoeff}
              onChange={(e) => setCcCoeff(parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-2">Coefficient Examen</label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={examCoeff}
              onChange={(e) => setExamCoeff(parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      {selectedCourse && selectedSession && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
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
              <p className="text-xs text-slate-500">Saisies</p>
            </div>
            <p className="text-2xl font-bold text-green-600">{stats.graded}/{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Award size={16} className="text-purple-600" />
              <p className="text-xs text-slate-500">Moyenne</p>
            </div>
            <p className="text-2xl font-bold text-purple-600">{stats.average.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown size={16} className="text-red-600" />
              <p className="text-xs text-slate-500">Min</p>
            </div>
            <p className="text-2xl font-bold text-red-600">{stats.min.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-green-600" />
              <p className="text-xs text-slate-500">Max</p>
            </div>
            <p className="text-2xl font-bold text-green-600">{stats.max.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size={16} className="text-blue-600" />
              <p className="text-xs text-slate-500">Réussite</p>
            </div>
            <p className="text-2xl font-bold text-blue-600">{stats.passRate.toFixed(0)}%</p>
          </div>
        </div>
      )}

      {/* Actions */}
      {students.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap gap-3">
          <div className="flex-1 relative min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="🔍 Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-sm font-medium"
          >
            <Download size={16} />
            Export CSV
          </button>
          <label className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium cursor-pointer">
            <Upload size={16} />
            Import CSV
            <input type="file" accept=".csv" onChange={importCSV} className="hidden" />
          </label>
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
                      <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase">CC ({(ccCoeff * 100).toFixed(0)}%)</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Examen ({(examCoeff * 100).toFixed(0)}%)</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Finale</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Commentaire</th>
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
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={grades[student.student_id]?.comment || ''}
                              onChange={(e) => handleGradeChange(student.student_id, 'comment', e.target.value)}
                              placeholder="Commentaire..."
                              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                            />
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
                    {saving ? 'Envoi...' : 'Valider'}
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