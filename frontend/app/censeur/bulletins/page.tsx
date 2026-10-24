'use client';

import { useState, useEffect } from 'react';
import {
  Loader2, Download, FileText, Search, Users, Award,
  TrendingUp, Calendar, Eye, CheckCircle2, AlertCircle, Printer, X
} from 'lucide-react';
import { studentService } from '@/services/studentService';
import { examSessionService, ExamSession } from '@/services/examSessionService';
import { reportCardService, StudentDetail } from '@/services/reportCardService';
import { classService, ClassRoom } from '@/services/classService';
import { useToast } from '@/components/ToastProvider';

export default function CenseurBulletinsPage() {
  const toast = useToast();
  
  const [students, setStudents] = useState<any[]>([]);
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [reportCards, setReportCards] = useState<any[]>([]);
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
      const [studentsData, sessionsData, classesData] = await Promise.all([
        studentService.getAll(),
        examSessionService.getAll(),
        classService.getAll()
      ]);
      
      setStudents(studentsData);
      setSessions(sessionsData);
      setClasses(classesData);
      
      if (sessionsData.length > 0) {
        setSelectedSessionId(sessionsData[0].id);
      }
    } catch (error) {
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSessionId) {
      loadReportCards();
    }
  }, [selectedSessionId, selectedClassId]);

  const loadReportCards = async () => {
    if (!selectedSessionId) return;
    
    setLoadingCards(true);
    try {
      let filteredStudents = students;
      
      if (selectedClassId) {
        const selectedClass = classes.find(c => c.id === selectedClassId);
        if (selectedClass) {
          filteredStudents = students.filter(s => 
            s.filiere === selectedClass.filiere_name && s.level === selectedClass.level
          );
        }
      }
      
      const cards = await Promise.all(
        filteredStudents.map(async (student) => {
          try {
            const card = await reportCardService.calculate(student.id, selectedSessionId);
            return {
              student,
              ...card
            };
          } catch (error) {
            return {
              student,
              average: null,
              mention: null,
              rank: null,
              error: true
            };
          }
        })
      );
      
      setReportCards(cards.filter(c => !c.error));
    } catch (error) {
      toast.error('Erreur lors du calcul des bulletins');
    } finally {
      setLoadingCards(false);
    }
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
      toast.success('Bulletin officiel téléchargé (1 page)');
    } catch (error) {
      toast.error('Erreur lors de la génération du PDF');
    } finally {
      setGenerating(null);
    }
  };

  const handlePreview = async (studentId: number) => {
    if (!selectedSessionId) return;
    try {
      const pdfBlob = await reportCardService.generatePDF(studentId, selectedSessionId);
      const url = window.URL.createObjectURL(pdfBlob);
      window.open(url, '_blank');
    } catch (error) {
      toast.error("Erreur lors de l'aperçu du bulletin");
    }
  };

  const handlePrint = async (studentId: number) => {
    if (!selectedSessionId) return;
    try {
      const pdfBlob = await reportCardService.generatePDF(studentId, selectedSessionId);
      const url = window.URL.createObjectURL(pdfBlob);
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.src = url;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        }, 200);
      };
    } catch (error) {
      toast.error("Erreur lors de l'impression du bulletin");
    }
  };

  const handleViewDetail = async (studentId: number) => {
    if (!selectedSessionId) return;
    setLoadingDetail(true);
    try {
      const detail = await reportCardService.getStudentDetail(studentId, selectedSessionId);
      setSelectedStudentDetail(detail);
    } catch (error) {
      toast.error('Erreur lors du chargement des détails');
    } finally {
      setLoadingDetail(false);
    }
  };

  const filteredCards = reportCards.filter(card => {
    const name = `${card.student.first_name} ${card.student.last_name}`.toLowerCase();
    return name.includes(search.toLowerCase()) ||
           card.student.matricule?.toLowerCase().includes(search.toLowerCase());
  });

  const stats = {
    total: reportCards.length,
    passed: reportCards.filter(c => c.average !== null && c.average >= 10).length,
    failed: reportCards.filter(c => c.average !== null && c.average < 10).length,
    average: reportCards.length > 0 && reportCards.some(c => c.average !== null)
      ? reportCards.reduce((sum, c) => sum + (c.average || 0), 0) / reportCards.filter(c => c.average !== null).length
      : 0
  };

  const getMentionColor = (mention: string | null) => {
    switch (mention) {
      case 'Excellent': return 'text-green-700 bg-green-50 border-green-200';
      case 'Très Bien': return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'Bien': return 'text-indigo-700 bg-indigo-50 border-indigo-200';
      case 'Assez Bien': return 'text-purple-700 bg-purple-50 border-purple-200';
      case 'Passable': return 'text-orange-700 bg-orange-50 border-orange-200';
      default: return 'text-red-700 bg-red-50 border-red-200';
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
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#FF6B00] to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30">
              <FileText size={24} className="text-white" />
            </div>
            Bulletins & Relevés de notes (Censeur)
          </h1>
          <p className="text-slate-500 mt-1">Édition, consultation et impression des bulletins officiels sur une page</p>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users size={20} className="text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500">Étudiants notés</p>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>

        <div className="bg-white rounded-xl border border-green-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 size={20} className="text-green-600" />
            </div>
          </div>
          <p className="text-xs text-green-600">Admis (≥ 10/20)</p>
          <p className="text-2xl font-bold text-green-600">{stats.passed}</p>
        </div>

        <div className="bg-white rounded-xl border border-red-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle size={20} className="text-red-600" />
            </div>
          </div>
          <p className="text-xs text-red-600">Rattrapage / Ajournés</p>
          <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
        </div>

        <div className="bg-white rounded-xl border border-orange-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Award size={20} className="text-[#FF6B00]" />
            </div>
          </div>
          <p className="text-xs text-orange-600">Moyenne générale</p>
          <p className="text-2xl font-bold text-[#FF6B00]">{stats.average.toFixed(2)}/20</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="🔍 Rechercher par nom ou matricule..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>

          <select
            value={selectedSessionId || ''}
            onChange={(e) => setSelectedSessionId(e.target.value ? parseInt(e.target.value) : null)}
            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          >
            <option value="">Sélectionner une session...</option>
            {sessions.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.session_type})</option>
            ))}
          </select>

          <select
            value={selectedClassId || ''}
            onChange={(e) => setSelectedClassId(e.target.value ? parseInt(e.target.value) : null)}
            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          >
            <option value="">Toutes les classes</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.level})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tableau des bulletins */}
      {loadingCards ? (
        <div className="flex items-center justify-center py-16 bg-white rounded-2xl border border-slate-200">
          <Loader2 className="animate-spin text-[#FF6B00]" size={32} />
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <FileText size={48} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Aucun bulletin trouvé pour cette sélection</p>
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
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Filière</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Moyenne</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Rang</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Mention</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase w-48">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCards.map((card, index) => (
                  <tr key={card.student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-xs text-slate-400">{index + 1}</td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900 text-sm">
                        {card.student.first_name} {card.student.last_name}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-xs text-slate-500 font-mono">{card.student.matricule || 'N/A'}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                        {card.student.filiere || 'N/A'} ({card.student.level || 'L3'})
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-sm font-bold ${
                        (card.average || 0) >= 10 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {card.average !== null ? `${card.average.toFixed(2)}/20` : '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                        {card.rank ? `${card.rank}/${stats.total}` : '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {card.mention && (
                        <span className={`text-xs px-2 py-0.5 rounded border font-semibold ${getMentionColor(card.mention)}`}>
                          {card.mention}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleViewDetail(card.student.id)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Détails"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => handlePrint(card.student.id)}
                          className="p-1.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Imprimer (1 page)"
                        >
                          <Printer size={15} />
                        </button>
                        <button
                          onClick={() => handleGeneratePDF(card.student.id)}
                          disabled={generating === card.student.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                          title="Télécharger PDF (1 page)"
                        >
                          {generating === card.student.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Download size={12} />
                          )}
                          <span>PDF</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Détails Étudiant */}
      {selectedStudentDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
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
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Infos résumé */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">Filière</p>
                  <p className="text-sm font-semibold text-slate-900">{selectedStudentDetail.student.filiere || 'N/A'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">Niveau</p>
                  <p className="text-sm font-semibold text-slate-900">{selectedStudentDetail.student.level || 'L3'}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg p-3 text-white">
                  <p className="text-xs opacity-80">Moyenne générale</p>
                  <p className="text-xl font-bold">
                    {(selectedStudentDetail.statistics.weighted_average || selectedStudentDetail.statistics.average || 0).toFixed(2)}/20
                  </p>
                </div>
                <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-lg p-3 text-white">
                  <p className="text-xs opacity-80">Rang / Mention</p>
                  <p className="text-lg font-bold">
                    {selectedStudentDetail.statistics.rank}/{selectedStudentDetail.statistics.total_students} • {selectedStudentDetail.statistics.mention}
                  </p>
                </div>
              </div>

              {/* Tableau des matières */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                      <tr>
                        <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-600 uppercase">Code</th>
                        <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-600 uppercase">Cours</th>
                        <th className="text-center py-2.5 px-3 text-xs font-semibold text-slate-600 uppercase">CC (30%)</th>
                        <th className="text-center py-2.5 px-3 text-xs font-semibold text-slate-600 uppercase">Exam (70%)</th>
                        <th className="text-center py-2.5 px-3 text-xs font-semibold text-slate-600 uppercase">Note /20</th>
                        <th className="text-center py-2.5 px-3 text-xs font-semibold text-slate-600 uppercase">Crédits</th>
                        <th className="text-center py-2.5 px-3 text-xs font-semibold text-slate-600 uppercase">Mention</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {selectedStudentDetail.subjects.map((sub) => (
                        <tr key={sub.course_id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono text-xs text-slate-500">{sub.course_code}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-800">{sub.course_title}</td>
                          <td className="py-2.5 px-3 text-center">{sub.cc_score !== null ? sub.cc_score.toFixed(2) : '-'}</td>
                          <td className="py-2.5 px-3 text-center">{sub.exam_score !== null ? sub.exam_score.toFixed(2) : '-'}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded font-bold ${
                              sub.score >= 10 ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'
                            }`}>
                              {sub.score.toFixed(2)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-purple-700">{sub.credits || 3}</td>
                          <td className="py-2.5 px-3 text-center text-xs font-medium text-slate-600">{sub.letter_grade}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actions modal */}
              <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => handlePrint(selectedStudentDetail.student.id)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                >
                  <Printer size={16} />
                  Imprimer (1 page)
                </button>
                <button
                  onClick={() => handlePreview(selectedStudentDetail.student.id)}
                  className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                >
                  <Eye size={16} />
                  Aperçu (1 page)
                </button>
                <button
                  onClick={() => handleGeneratePDF(selectedStudentDetail.student.id)}
                  className="px-4 py-2 bg-gradient-to-r from-[#FF6B00] to-orange-500 hover:from-[#e55f00] hover:to-orange-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-all"
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
