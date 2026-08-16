'use client';

import { useState, useEffect } from 'react';
import {
  Loader2, AlertCircle, Download, CheckCircle2, FileText, Search, Users, Award,
  ChevronRight, ChevronDown, TrendingUp, Eye, FolderOpen, X
} from 'lucide-react';
import { reportCardService, StudentDetail } from '@/services/reportCardService';
import { studentService } from '@/services/studentService';
import { examSessionService, ExamSession } from '@/services/examSessionService';
import { useToast } from '@/components/ToastProvider';

export default function SecretaryReportCardsPage() {
  const toast = useToast();
  
  const [students, setStudents] = useState<any[]>([]);
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const [expandedFilieres, setExpandedFilieres] = useState<Set<string>>(new Set());
  const [reportCards, setReportCards] = useState<Map<number, any>>(new Map());
  const [loadingCards, setLoadingCards] = useState(false);
  const [generating, setGenerating] = useState<number | null>(null);
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<StudentDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [studentsData, sessionsData] = await Promise.all([
        studentService.getAll(),
        examSessionService.getAll()
      ]);
      
      setStudents(studentsData);
      setSessions(sessionsData);
      
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
    if (selectedSessionId) {
      loadReportCards();
    }
  }, [selectedSessionId]);

  const loadReportCards = async () => {
    if (!selectedSessionId) return;
    
    setLoadingCards(true);
    try {
      const cardsMap = new Map<number, any>();
      
      for (const student of students) {
        try {
          const card = await reportCardService.calculate(student.id, selectedSessionId);
          cardsMap.set(student.id, { student, ...card });
        } catch (error) {
          // Student has no grades
        }
      }
      
      setReportCards(cardsMap);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoadingCards(false);
    }
  };

  // ✅ AJOUT : Calcul de globalStats à partir de reportCards
  const globalStats = {
    total: students.length,
    passed: Array.from(reportCards.values()).filter((c: any) => 
      c.average !== null && c.average !== undefined && c.average >= 10
    ).length,
    failed: Array.from(reportCards.values()).filter((c: any) => 
      c.average !== null && c.average !== undefined && c.average < 10
    ).length,
    average: (() => {
      const averages = Array.from(reportCards.values())
        .map((c: any) => c.average)
        .filter((a: any) => a !== null && a !== undefined) as number[];
      return averages.length > 0 
        ? averages.reduce((sum: number, a: number) => sum + a, 0) / averages.length 
        : 0;
    })(),
    successRate: (() => {
      const withGrades = Array.from(reportCards.values()).filter((c: any) => 
        c.average !== null && c.average !== undefined
      ).length;
      const passed = Array.from(reportCards.values()).filter((c: any) => 
        c.average !== null && c.average !== undefined && c.average >= 10
      ).length;
      return withGrades > 0 ? (passed / withGrades) * 100 : 0;
    })()
  };

  const handleGeneratePDF = async (studentId: number) => {
    if (!selectedSessionId) return;
    
    setGenerating(studentId);
    try {
      const pdfBlob = await reportCardService.generatePDF(studentId, selectedSessionId);
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bulletin_${studentId}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('Bulletin téléchargé');
    } catch (error) {
      toast.error('Erreur lors de la génération');
    } finally {
      setGenerating(null);
    }
  };

  const handleViewDetail = async (studentId: number) => {
    if (!selectedSessionId) return;
    
    setLoadingDetail(true);
    try {
      const detail = await reportCardService.getStudentDetail(studentId, selectedSessionId);
      setSelectedStudentDetail(detail);
    } catch (error) {
      toast.error('Erreur lors du chargement du détail');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handlePreview = async (studentId: number) => {
    if (!selectedSessionId) return;
    
    try {
      const pdfBlob = await reportCardService.generatePDF(studentId, selectedSessionId);
      const url = window.URL.createObjectURL(pdfBlob);
      window.open(url, '_blank');
    } catch (error) {
      toast.error('Erreur lors de l\'aperçu');
    }
  };

  const toggleDomain = (domain: string) => {
    const newSet = new Set(expandedDomains);
    newSet.has(domain) ? newSet.delete(domain) : newSet.add(domain);
    setExpandedDomains(newSet);
  };

  const toggleFiliere = (key: string) => {
    const newSet = new Set(expandedFilieres);
    newSet.has(key) ? newSet.delete(key) : newSet.add(key);
    setExpandedFilieres(newSet);
  };

  // Grouper les étudiants par domaine et filière
  const groupedStudents = students.reduce((acc: any, student: any) => {
    const filiereStr = student.filiere || 'Non défini';
    const [domain, filiere] = filiereStr.split(' - ');
    const d = domain || 'Non défini';
    const f = filiere || 'Non défini';
    
    if (!acc[d]) acc[d] = {};
    if (!acc[d][f]) acc[d][f] = [];
    acc[d][f].push(student);
    return acc;
  }, {});

  const sortedDomains = Object.keys(groupedStudents).sort();

  const getMentionColor = (mention: string | null) => {
    switch (mention) {
      case 'Excellent': return 'text-green-700 bg-green-50';
      case 'Très Bien': return 'text-blue-700 bg-blue-50';
      case 'Bien': return 'text-indigo-700 bg-indigo-50';
      case 'Assez Bien': return 'text-purple-700 bg-purple-50';
      case 'Passable': return 'text-orange-700 bg-orange-50';
      default: return 'text-red-700 bg-red-50';
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <FileText size={24} className="text-white" />
            </div>
            Bulletins de notes
          </h1>
          <p className="text-slate-500 mt-1">Visualisez et téléchargez les bulletins par domaine et filière</p>
        </div>
        
        <div className="flex items-center gap-3">
          <select
            value={selectedSessionId || ''}
            onChange={(e) => setSelectedSessionId(e.target.value ? parseInt(e.target.value) : null)}
            className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          >
            {sessions.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats globales */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Users size={20} className="opacity-80" />
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Total</span>
          </div>
          <p className="text-3xl font-bold">{globalStats.total}</p>
          <p className="text-xs opacity-80 mt-1">Étudiants</p>
        </div>
        
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle2 size={20} className="opacity-80" />
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Admis</span>
          </div>
          <p className="text-3xl font-bold">{globalStats.passed}</p>
          <p className="text-xs opacity-80 mt-1">Moyenne ≥ 10</p>
        </div>
        
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <AlertCircle size={20} className="opacity-80" />
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Échec</span>
          </div>
          <p className="text-3xl font-bold">{globalStats.failed}</p>
          <p className="text-xs opacity-80 mt-1">Moyenne &lt; 10</p>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp size={20} className="opacity-80" />
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Moy.</span>
          </div>
          <p className="text-3xl font-bold">{globalStats.average.toFixed(2)}</p>
          <p className="text-xs opacity-80 mt-1">/20</p>
        </div>
        
        <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Award size={20} className="opacity-80" />
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Réussite</span>
          </div>
          <p className="text-3xl font-bold">{globalStats.successRate.toFixed(0)}%</p>
          <p className="text-xs opacity-80 mt-1">Taux de réussite</p>
        </div>
      </div>

      {/* Recherche */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
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

      {/* Liste hiérarchique */}
      {loadingCards ? (
        <div className="flex items-center justify-center py-16 bg-white rounded-2xl border border-slate-200">
          <Loader2 className="animate-spin text-[#FF6B00]" size={32} />
        </div>
      ) : (
        <div className="space-y-3">
          {sortedDomains.map((domain) => {
            const isDomainExpanded = expandedDomains.has(domain);
            const filieres = Object.keys(groupedStudents[domain]);
            const domainCount = filieres.reduce((sum: number, f: string) => sum + groupedStudents[domain][f].length, 0);
            
            return (
              <div key={domain} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleDomain(domain)}
                  className="w-full px-6 py-4 bg-gradient-to-r from-slate-50 to-white hover:from-slate-100 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    {isDomainExpanded ? (
                      <ChevronDown size={20} className="text-slate-500" />
                    ) : (
                      <ChevronRight size={20} className="text-slate-500" />
                    )}
                    <FolderOpen size={20} className="text-[#FF6B00]" />
                    <div className="text-left">
                      <h3 className="font-semibold text-slate-900">{domain}</h3>
                      <p className="text-xs text-slate-500">{domainCount} étudiants</p>
                    </div>
                  </div>
                </button>

                {isDomainExpanded && (
                  <div className="border-t border-slate-200">
                    {filieres.sort().map((filiere) => {
                      const filiereKey = `${domain} - ${filiere}`;
                      const isFiliereExpanded = expandedFilieres.has(filiereKey);
                      const filiereStudents = groupedStudents[domain][filiere];
                      
                      return (
                        <div key={filiereKey}>
                          <button
                            onClick={() => toggleFiliere(filiereKey)}
                            className="w-full px-6 py-3 pl-16 bg-blue-50/50 hover:bg-blue-50 transition-colors flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              {isFiliereExpanded ? (
                                <ChevronDown size={16} className="text-slate-500" />
                              ) : (
                                <ChevronRight size={16} className="text-slate-500" />
                              )}
                              <span className="font-medium text-slate-900">{filiere}</span>
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                {filiereStudents.length}
                              </span>
                            </div>
                          </button>

                          {isFiliereExpanded && (
                            <div className="divide-y divide-slate-100">
                              {filiereStudents
                                .sort((a: any, b: any) => (a.last_name || '').localeCompare(b.last_name || '', 'fr'))
                                .map((student: any) => {
                                  const card = reportCards.get(student.id);
                                  
                                  return (
                                    <div key={student.id} className="px-6 py-3 pl-24 hover:bg-slate-50 flex items-center justify-between">
                                      <div className="flex items-center gap-3 flex-1">
                                        <div className="w-8 h-8 bg-gradient-to-br from-[#FF6B00] to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                                          {student.first_name[0]}{student.last_name[0]}
                                        </div>
                                        <div>
                                          <p className="font-medium text-slate-900 text-sm">
                                            {student.first_name} {student.last_name}
                                          </p>
                                          <p className="text-xs text-slate-500 font-mono">{student.matricule}</p>
                                        </div>
                                      </div>
                                      
                                      <div className="flex items-center gap-4">
                                        {card && card.average !== null && card.average !== undefined ? (
                                          <>
                                            <div className="text-right">
                                              <p className="text-sm font-bold text-slate-900">{card.average.toFixed(2)}/20</p>
                                              {card.mention && (
                                                <span className={`text-xs px-2 py-0.5 rounded ${getMentionColor(card.mention)}`}>
                                                  {card.mention}
                                                </span>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-1">
                                              <button
                                                onClick={() => handleViewDetail(student.id)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Voir les détails"
                                              >
                                                <Eye size={16} />
                                              </button>
                                              <button
                                                onClick={() => handleGeneratePDF(student.id)}
                                                disabled={generating === student.id}
                                                className="p-2 text-[#FF6B00] hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                                                title="Télécharger PDF"
                                              >
                                                {generating === student.id ? (
                                                  <Loader2 size={16} className="animate-spin" />
                                                ) : (
                                                  <Download size={16} />
                                                )}
                                              </button>
                                            </div>
                                          </>
                                        ) : (
                                          <span className="text-xs text-slate-400 italic">Aucune note</span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ✅ MODAL DÉTAIL ÉTUDIANT - EN DEHORS DE LA BOUCLE */}
      {selectedStudentDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {selectedStudentDetail.student.first_name} {selectedStudentDetail.student.last_name}
                </h2>
                <p className="text-sm text-slate-500">
                  {selectedStudentDetail.student.matricule} • {selectedStudentDetail.session.name}
                </p>
              </div>
              <button
                onClick={() => setSelectedStudentDetail(null)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Infos étudiant */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">Filière</p>
                  <p className="text-sm font-semibold text-slate-900">{selectedStudentDetail.student.filiere || 'N/A'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">Niveau</p>
                  <p className="text-sm font-semibold text-slate-900">{selectedStudentDetail.student.level || 'N/A'}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg p-3 text-white">
                  <p className="text-xs opacity-80">Moyenne</p>
                  <p className="text-xl font-bold">
                    {(selectedStudentDetail.statistics.weighted_average || selectedStudentDetail.statistics.average || 0).toFixed(2)}/20
                  </p>
                </div>
                <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-lg p-3 text-white">
                  <p className="text-xs opacity-80">Rang</p>
                  <p className="text-xl font-bold">{selectedStudentDetail.statistics.rank}/{selectedStudentDetail.statistics.total_students}</p>
                </div>
              </div>

              {/* Tableau des matières avec crédits */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                      <tr>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Code</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Matière</th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase">CC</th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Examen</th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Note/20</th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Crédits</th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Moy. Pond.</th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase">%</th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Mention</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedStudentDetail.subjects.map((subject) => (
                        <tr key={subject.course_id} className="hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">
                              {subject.course_code}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-medium text-slate-900 text-sm">{subject.course_title}</p>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="text-sm text-slate-600">
                              {subject.cc_score?.toFixed(2) || '-'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="text-sm text-slate-600">
                              {subject.exam_score?.toFixed(2) || '-'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex items-center justify-center w-14 px-2 py-1 border rounded text-sm font-bold ${
                              subject.score >= 16 ? 'text-green-700 bg-green-50 border-green-200' :
                              subject.score >= 14 ? 'text-blue-700 bg-blue-50 border-blue-200' :
                              subject.score >= 12 ? 'text-indigo-700 bg-indigo-50 border-indigo-200' :
                              subject.score >= 10 ? 'text-orange-700 bg-orange-50 border-orange-200' :
                              'text-red-700 bg-red-50 border-red-200'
                            }`}>
                              {subject.score.toFixed(2)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs font-bold rounded">
                              {subject.credits || subject.coefficient || 1}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center text-sm text-slate-600 font-medium">
                            {subject.weighted_average?.toFixed(2) || (subject.score * (subject.credits || subject.coefficient || 1)).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-center text-sm text-slate-600">{subject.percentage}%</td>
                          <td className="py-3 px-4 text-center">
                            <span className="text-xs font-semibold text-slate-700">{subject.letter_grade}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gradient-to-r from-slate-100 to-slate-50 font-bold">
                      <tr>
                        <td colSpan={4} className="py-3 px-4 text-sm">TOTAL</td>
                        <td className="py-3 px-4 text-center text-sm">
                          {(selectedStudentDetail.statistics.weighted_average || selectedStudentDetail.statistics.average || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center text-sm">
                          <span className="text-purple-700">
                            {selectedStudentDetail.statistics.obtained_credits || 0}/{selectedStudentDetail.statistics.total_credits || selectedStudentDetail.statistics.total_coefficients || 0}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-sm">
                          {selectedStudentDetail.statistics.total_weighted?.toFixed(2) || '0.00'}
                        </td>
                        <td className="py-3 px-4 text-center text-sm">
                          {(((selectedStudentDetail.statistics.weighted_average || selectedStudentDetail.statistics.average || 0) / 20) * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`text-xs px-2 py-1 rounded ${
                            selectedStudentDetail.statistics.mention === 'Excellent' ? 'bg-green-100 text-green-700' :
                            selectedStudentDetail.statistics.mention === 'Très Bien' ? 'bg-blue-100 text-blue-700' :
                            selectedStudentDetail.statistics.mention === 'Bien' ? 'bg-indigo-100 text-indigo-700' :
                            selectedStudentDetail.statistics.mention === 'Assez Bien' ? 'bg-purple-100 text-purple-700' :
                            selectedStudentDetail.statistics.mention === 'Passable' ? 'bg-orange-100 text-orange-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {selectedStudentDetail.statistics.mention}
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* ✅ AJOUT : Résumé des crédits */}
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
                  <p className="text-xs text-purple-600 mb-1">Crédits inscrits</p>
                  <p className="text-2xl font-bold text-purple-700">
                    {selectedStudentDetail.statistics.total_credits || selectedStudentDetail.statistics.total_coefficients || 0}
                  </p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                  <p className="text-xs text-green-600 mb-1">Crédits obtenus</p>
                  <p className="text-2xl font-bold text-green-700">
                    {selectedStudentDetail.statistics.obtained_credits || 0}
                  </p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                  <p className="text-xs text-blue-600 mb-1">Moyenne pondérée</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {(selectedStudentDetail.statistics.weighted_average || selectedStudentDetail.statistics.average || 0).toFixed(2)}/20
                  </p>
                </div>
              </div>

              {/* Boutons télécharger */}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => handlePreview(selectedStudentDetail.student.id)}
                  className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium flex items-center gap-2"
                >
                  <Eye size={16} />
                  Aperçu PDF
                </button>
                <button
                  onClick={() => handleGeneratePDF(selectedStudentDetail.student.id)}
                  className="px-4 py-2 bg-gradient-to-r from-[#FF6B00] to-orange-500 hover:from-[#e55f00] hover:to-orange-600 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                >
                  <Download size={16} />
                  Télécharger PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}