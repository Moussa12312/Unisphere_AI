'use client';

import { useState, useEffect } from 'react';
import {
  Loader2, CheckCircle2, AlertCircle, FileText, TrendingUp,
  Users, Award, ArrowRight, Search, BarChart3, Download,
  Eye, Calendar, BookOpen, Filter, GraduationCap
} from 'lucide-react';
import { examSessionService, ExamSession } from '@/services/examSessionService';
import { courseService, Course } from '@/services/courseService';
import { classService, ClassRoom } from '@/services/classService';
import { gradeService, GradeEntry, GradeStats } from '@/services/gradeService';
import { useToast } from '@/components/ToastProvider';

export default function AdminGradesPage() {
  const toast = useToast();
  
  // Données de base
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Sélections
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  
  // Notes
  const [grades, setGrades] = useState<GradeEntry[]>([]);
  const [stats, setStats] = useState<GradeStats | null>(null);
  const [loadingGrades, setLoadingGrades] = useState(false);
  
  // Filtres
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [sessionsData, classesData, coursesData] = await Promise.all([
        examSessionService.getAll(),
        classService.getAll(),
        courseService.getAll()
      ]);
      
      setSessions(sessionsData);
      setClasses(classesData);
      setCourses(coursesData);
      
      // Auto-sélectionner la session la plus récente
      if (sessionsData.length > 0) {
        setSelectedSessionId(sessionsData[0].id);
      }
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSessionId && selectedCourseId) {
      loadGrades();
    }
  }, [selectedSessionId, selectedCourseId]);

  const loadGrades = async () => {
    if (!selectedSessionId || !selectedCourseId) return;
    
    setLoadingGrades(true);
    try {
      const [contextData, statsData] = await Promise.all([
        gradeService.getByContext(selectedSessionId, selectedCourseId),
        gradeService.getStats(selectedSessionId, selectedCourseId)
      ]);
      
      setGrades(contextData.students);
      setStats(statsData);
    } catch (error) {
      toast.error('Erreur lors du chargement des notes');
    } finally {
      setLoadingGrades(false);
    }
  };

  // Filtrer les cours selon la classe
  const filteredCourses = selectedClassId
    ? courses.filter(c => {
        const selectedClass = classes.find(cl => cl.id === selectedClassId);
        if (!selectedClass) return false;
        return c.department === selectedClass.filiere_name && c.level === selectedClass.level;
      })
    : courses;

  // Filtrer les étudiants
  const filteredGrades = grades.filter(g => {
    const matchSearch = g.student_name.toLowerCase().includes(search.toLowerCase()) ||
                        g.matricule.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || 
                        (statusFilter === 'graded' && g.score !== null) ||
                        (statusFilter === 'not_graded' && g.score === null) ||
                        (statusFilter === 'validated' && g.status === 'validated') ||
                        (statusFilter === 'failed' && g.score !== null && g.score < 10) ||
                        (statusFilter === 'passed' && g.score !== null && g.score >= 10);
    return matchSearch && matchStatus;
  });

  // Couleur de la note
  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-slate-400 bg-slate-50';
    if (score < 5) return 'text-red-700 bg-red-50 border-red-200';
    if (score < 10) return 'text-orange-700 bg-orange-50 border-orange-200';
    if (score < 15) return 'text-blue-700 bg-blue-50 border-blue-200';
    return 'text-green-700 bg-green-50 border-green-200';
  };

  // Mention selon la note
  const getMention = (score: number | null) => {
    if (score === null) return { label: 'Non noté', color: 'text-slate-500' };
    if (score < 10) return { label: 'Insuffisant', color: 'text-red-600' };
    if (score < 12) return { label: 'Passable', color: 'text-orange-600' };
    if (score < 14) return { label: 'Assez Bien', color: 'text-blue-600' };
    if (score < 16) return { label: 'Bien', color: 'text-indigo-600' };
    return { label: 'Très Bien', color: 'text-green-600' };
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!selectedSessionId || !selectedCourseId || grades.length === 0) return;
    
    const headers = ['Matricule', 'Nom', 'Note /20', 'Mention', 'Statut', 'Commentaire'];
    const rows = filteredGrades.map(g => {
      const mention = getMention(g.score);
      return [
        g.matricule,
        g.student_name,
        g.score !== null ? g.score : '',
        mention.label,
        g.status,
        g.comment || ''
      ];
    });
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `notes_${selectedSession?.name || 'export'}_${selectedCourse?.title || 'cours'}.csv`;
    link.click();
    
    toast.success('Export CSV généré');
  };

  const selectedSession = sessions.find(s => s.id === selectedSessionId);
  const selectedClass = classes.find(c => c.id === selectedClassId);
  const selectedCourse = courses.find(c => c.id === selectedCourseId);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B00] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <GraduationCap size={24} className="text-white" />
            </div>
            Consultation des notes
          </h1>
          <p className="text-slate-500 mt-1">Visualisez les notes des étudiants par session</p>
        </div>
        
        {selectedSessionId && selectedCourseId && (
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-medium transition-all shadow-md"
          >
            <Download size={16} />
            Exporter CSV
          </button>
        )}
      </div>

      {/* Sélecteurs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <Filter size={16} className="text-[#FF6B00]" />
          Contexte de consultation
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Session */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              <Calendar size={12} className="inline mr-1" />
              Session d'examen
            </label>
            <select
              value={selectedSessionId || ''}
              onChange={(e) => setSelectedSessionId(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            >
              <option value="">Sélectionner une session...</option>
              {sessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} • {s.status === 'open' ? '🟢' : s.status === 'draft' ? '📝' : '🔒'}
                </option>
              ))}
            </select>
          </div>

          {/* Classe */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              <Users size={12} className="inline mr-1" />
              Classe
            </label>
            <select
              value={selectedClassId || ''}
              onChange={(e) => {
                setSelectedClassId(e.target.value ? parseInt(e.target.value) : null);
                setSelectedCourseId(null);
              }}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            >
              <option value="">Sélectionner une classe...</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Cours */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              <BookOpen size={12} className="inline mr-1" />
              Cours / Matière
            </label>
            <select
              value={selectedCourseId || ''}
              onChange={(e) => setSelectedCourseId(e.target.value ? parseInt(e.target.value) : null)}
              disabled={!selectedClassId}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white disabled:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            >
              <option value="">
                {!selectedClassId ? 'Choisissez une classe...' : 'Sélectionner un cours...'}
              </option>
              {filteredCourses.map(c => (
                <option key={c.id} value={c.id}>{c.title} ({c.code})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Info du contexte */}
        {selectedSession && selectedClass && selectedCourse && (
          <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
            <div className="flex items-center gap-2 text-sm text-blue-800 flex-wrap">
              <CheckCircle2 size={16} className="flex-shrink-0" />
              <span className="font-semibold">{selectedSession.name}</span>
              <ArrowRight size={14} className="text-blue-400" />
              <span className="font-semibold">{selectedClass.name}</span>
              <ArrowRight size={14} className="text-blue-400" />
              <span className="font-semibold">{selectedCourse.title}</span>
              <span className="text-xs bg-blue-200 px-2 py-0.5 rounded-full ml-auto">
                {selectedCourse.code}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Contenu principal */}
      {selectedSessionId && selectedCourseId ? (
        <>
          {/* Statistiques */}
          {stats && stats.total_students > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white shadow-lg shadow-blue-500/20">
                <div className="flex items-center justify-between mb-2">
                  <Users size={20} className="opacity-80" />
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Total</span>
                </div>
                <p className="text-3xl font-bold">{stats.total_students}</p>
                <p className="text-xs opacity-80 mt-1">Étudiants inscrits</p>
              </div>
              
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-4 text-white shadow-lg shadow-green-500/20">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle2 size={20} className="opacity-80" />
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Notés</span>
                </div>
                <p className="text-3xl font-bold">{stats.graded_students}</p>
                <p className="text-xs opacity-80 mt-1">Étudiants évalués</p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-4 text-white shadow-lg shadow-purple-500/20">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp size={20} className="opacity-80" />
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Moy.</span>
                </div>
                <p className="text-3xl font-bold">{stats.average}</p>
                <p className="text-xs opacity-80 mt-1">Moyenne /20</p>
              </div>
              
              <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl p-4 text-white shadow-lg shadow-orange-500/20">
                <div className="flex items-center justify-between mb-2">
                  <Award size={20} className="opacity-80" />
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Réussite</span>
                </div>
                <p className="text-3xl font-bold">{stats.pass_rate}%</p>
                <p className="text-xs opacity-80 mt-1">Taux de réussite</p>
              </div>
              
              <div className="bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl p-4 text-white shadow-lg shadow-slate-700/20">
                <div className="flex items-center justify-between mb-2">
                  <BarChart3 size={20} className="opacity-80" />
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Range</span>
                </div>
                <p className="text-3xl font-bold">{stats.min}-{stats.max}</p>
                <p className="text-xs opacity-80 mt-1">Note min / max</p>
              </div>
            </div>
          )}

          {/* Distribution graphique */}
          {stats && stats.total_students > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <BarChart3 size={16} className="text-[#FF6B00]" />
                Distribution des notes
              </h3>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { range: '0-5', count: stats.distribution['0-5'], color: 'from-red-500 to-red-600', label: 'Très insuffisant' },
                  { range: '5-10', count: stats.distribution['5-10'], color: 'from-orange-500 to-orange-600', label: 'Insuffisant' },
                  { range: '10-15', count: stats.distribution['10-15'], color: 'from-blue-500 to-blue-600', label: 'Passable/Bien' },
                  { range: '15-20', count: stats.distribution['15-20'], color: 'from-green-500 to-green-600', label: 'Très bien' },
                ].map((item) => {
                  const percentage = stats.graded_students > 0 
                    ? (item.count / stats.graded_students) * 100 
                    : 0;
                  return (
                    <div key={item.range} className="relative">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-700">{item.range}</span>
                        <span className="text-xs text-slate-500">{item.count}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full bg-gradient-to-r ${item.color} transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{item.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Barre d'outils */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2 relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="🔍 Rechercher un étudiant..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              >
                <option value="all">Tous les étudiants</option>
                <option value="graded">Notés</option>
                <option value="not_graded">Non notés</option>
                <option value="passed">Admis (≥10)</option>
                <option value="failed">Échec (&lt;10)</option>
                <option value="validated">Validés</option>
              </select>
              <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('table')}
                  className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                    viewMode === 'table' 
                      ? 'bg-white shadow-sm text-slate-900' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Tableau
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                    viewMode === 'cards' 
                      ? 'bg-white shadow-sm text-slate-900' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Cartes
                </button>
              </div>
            </div>
            
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <span>{filteredGrades.length} étudiant{filteredGrades.length > 1 ? 's' : ''}</span>
              <span>•</span>
              <span>sur {grades.length} au total</span>
            </div>
          </div>

          {/* Contenu */}
          {loadingGrades ? (
            <div className="flex items-center justify-center py-16 bg-white rounded-2xl border border-slate-200">
              <Loader2 className="animate-spin text-[#FF6B00]" size={32} />
            </div>
          ) : grades.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
              <AlertCircle size={48} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Aucun étudiant trouvé pour ce cours</p>
            </div>
          ) : viewMode === 'table' ? (
            /* Vue Tableau */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase w-12">#</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Étudiant</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Matricule</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Crédits</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase">CC</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Examen</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Finale /20</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase w-32">Mention</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase w-24">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredGrades.map((grade: any, index) => {
                      const mention = getMention(grade.score);
                      return (
                        <tr key={grade.student_id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 text-xs text-slate-400 font-mono">{index + 1}</td>
                          <td className="py-3 px-4">
                            <p className="font-semibold text-slate-900 text-sm">{grade.student_name}</p>
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-xs text-slate-500 font-mono">{grade.matricule}</p>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs font-bold rounded">
                              {grade.course_credits || 3}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="text-sm text-slate-700">
                              {grade.cc_score?.toFixed(2) || '-'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="text-sm text-slate-700">
                              {grade.exam_score?.toFixed(2) || '-'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className={`inline-flex items-center justify-center w-16 px-3 py-1.5 border rounded-lg text-sm font-bold ${getScoreColor(grade.score)}`}>
                              {grade.score !== null ? grade.score.toFixed(2) : '--'}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-xs font-medium ${mention.color}`}>
                              {mention.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {grade.score === null ? (
                              <span className="text-xs px-2 py-1 bg-slate-100 text-slate-500 rounded">
                                Non noté
                              </span>
                            ) : grade.status === 'validated' ? (
                              <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded flex items-center gap-1 justify-center">
                                <CheckCircle2 size={10} />
                                Validé
                              </span>
                            ) : (
                              <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded">
                                Brouillon
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Vue Cartes */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredGrades.map((grade) => {
                const mention = getMention(grade.score);
                return (
                  <div key={grade.student_id} className="bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#FF6B00] to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {grade.student_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">{grade.student_name}</p>
                          <p className="text-xs text-slate-500 font-mono">{grade.matricule}</p>
                        </div>
                      </div>
                      {grade.status === 'validated' && (
                        <CheckCircle2 size={16} className="text-green-600" />
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <div>
                        <p className="text-xs text-slate-500">Note</p>
                        <p className={`text-2xl font-bold ${getScoreColor(grade.score).split(' ')[0]}`}>
                          {grade.score !== null ? grade.score.toFixed(2) : '--'}
                          <span className="text-xs text-slate-400 font-normal">/20</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Mention</p>
                        <p className={`text-sm font-semibold ${mention.color}`}>{mention.label}</p>
                      </div>
                    </div>
                    
                    {grade.comment && (
                      <p className="mt-3 text-xs text-slate-600 italic bg-slate-50 p-2 rounded-lg">
                        💬 {grade.comment}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <Eye size={48} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Sélectionnez une session, une classe et un cours pour consulter les notes</p>
        </div>
      )}
    </div>
  );
}