'use client';

import { useState, useEffect } from 'react';
import {
  Loader2, Download, FileText, Search, Users, Award,
  TrendingUp, Calendar, Eye, CheckCircle2, AlertCircle
} from 'lucide-react';
import { studentService } from '@/services/studentService';
import { examSessionService, ExamSession } from '@/services/examSessionService';
import { reportCardService, ReportCard } from '@/services/reportCardService';
import { useToast } from '@/components/ToastProvider';
import { classService, ClassRoom } from '@/services/classService';

export default function AdminReportCardsPage() {
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
      toast.error('Erreur lors du chargement');
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
      toast.error('Erreur lors du chargement des bulletins');
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
      toast.success('Bulletin téléchargé');
    } catch (error) {
      toast.error('Erreur lors de la génération du PDF');
    } finally {
      setGenerating(null);
    }
  };

  const handleGenerateAll = async () => {
    if (!selectedSessionId) return;
    
    setGenerating(-1);
    try {
      for (const card of reportCards) {
        await handleGeneratePDF(card.student.id);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      toast.success('Tous les bulletins ont été générés');
    } catch (error) {
      toast.error('Erreur lors de la génération des bulletins');
    } finally {
      setGenerating(null);
    }
  };

  const filteredCards = reportCards.filter(card => {
    const name = `${card.student.first_name} ${card.student.last_name}`.toLowerCase();
    return name.includes(search.toLowerCase()) ||
           card.student.matricule?.toLowerCase().includes(search.toLowerCase());
  });

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

  const stats = {
    total: reportCards.length,
    withGrades: reportCards.filter(c => c.average !== null).length,
    excellent: reportCards.filter(c => c.mention === 'Excellent').length,
    average: reportCards.filter(c => c.average !== null).reduce((sum, c) => sum + (c.average || 0), 0) / 
             (reportCards.filter(c => c.average !== null).length || 1)
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
          <p className="text-slate-500 mt-1">Générez et téléchargez les bulletins des étudiants</p>
        </div>
        
        {reportCards.length > 0 && (
          <button
            onClick={handleGenerateAll}
            disabled={generating !== null}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#FF6B00] to-orange-500 hover:from-[#e55f00] hover:to-orange-600 text-white rounded-xl text-sm font-medium transition-all shadow-md disabled:opacity-50"
          >
            {generating === -1 ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Télécharger tous les bulletins
          </button>
        )}
      </div>

      {/* Sélecteurs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              {sessions.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              <Users size={12} className="inline mr-1" />
              Classe (optionnel)
            </label>
            <select
              value={selectedClassId || ''}
              onChange={(e) => setSelectedClassId(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            >
              <option value="">Toutes les classes</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      {reportCards.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total</p>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Avec notes</p>
                <p className="text-2xl font-bold text-slate-900">{stats.withGrades}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Award size={20} className="text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Excellents</p>
                <p className="text-2xl font-bold text-slate-900">{stats.excellent}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <TrendingUp size={20} className="text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Moyenne classe</p>
                <p className="text-2xl font-bold text-slate-900">{stats.average.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Liste des bulletins */}
      {loadingCards ? (
        <div className="flex items-center justify-center py-16 bg-white rounded-2xl border border-slate-200">
          <Loader2 className="animate-spin text-[#FF6B00]" size={32} />
        </div>
      ) : reportCards.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <AlertCircle size={48} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Aucun bulletin disponible</p>
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
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Moyenne</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Rang</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Mention</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCards.map((card, index) => (
                  <tr key={card.student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-xs text-slate-400">{index + 1}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-[#FF6B00] to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                          {card.student.first_name[0]}{card.student.last_name[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">
                            {card.student.first_name} {card.student.last_name}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-xs text-slate-500 font-mono">{card.student.matricule || 'N/A'}</p>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-sm font-bold text-slate-900">
                        {card.average !== null ? `${card.average.toFixed(2)}/20` : '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-sm font-semibold text-slate-700">
                        {card.rank ? `${card.rank}/${stats.total}` : '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {card.mention && (
                        <span className={`text-xs px-2 py-1 rounded font-medium ${getMentionColor(card.mention)}`}>
                          {card.mention}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleGeneratePDF(card.student.id)}
                        disabled={generating === card.student.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        {generating === card.student.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Download size={12} />
                        )}
                        PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}