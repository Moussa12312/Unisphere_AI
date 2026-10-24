'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp, Loader2, Award, AlertCircle, FileCheck,
  Download, Calendar, BookOpen
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface Grade {
  id: number;
  subject: string;
  score: number;
  max_score: number;
  coefficient: number;
  exam_type: string;
  date: string;
  comment: string;
}

export default function StudentGradesPage() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingLMD, setDownloadingLMD] = useState(false);

  useEffect(() => {
    loadGrades();
  }, []);

  const loadGrades = async () => {
    try {
      const res = await api.get('/api/v1/students/me/grades');
      setGrades(res.data);
    } catch (error) {
      toast.error('Erreur de chargement des notes');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadLMD = async () => {
    setDownloadingLMD(true);
    try {
      const response = await api.get('/api/v1/report-cards/me/lmd-pdf', {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `releve_notes_lmd.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('📄 Relevé de notes officiel LMD téléchargé avec succès !');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors du téléchargement du relevé');
    } finally {
      setDownloadingLMD(false);
    }
  };

  const getScoreColor = (score: number, max: number) => {
    const percentage = (score / max) * 100;
    if (percentage >= 70) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (percentage >= 50) return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  // Calcul moyenne générale
  const totalWeighted = grades.reduce((sum, g) => sum + (g.score * (g.coefficient || 1)), 0);
  const totalCoeff = grades.reduce((sum, g) => sum + (g.coefficient || 1), 0);
  const average = totalCoeff > 0 ? (totalWeighted / totalCoeff) : 0;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="animate-spin text-[#FF6B00]" size={36} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Mes Notes & Évaluations</h1>
          <p className="text-slate-500 text-sm mt-1">Résultats académiques structurés selon le système LMD.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-semibold">
            <Award size={18} className="text-blue-600" />
            <span>Moyenne générale : {average.toFixed(2)}/20</span>
          </div>

          <button
            onClick={handleDownloadLMD}
            disabled={downloadingLMD || grades.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#FF6B00] to-orange-500 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
          >
            {downloadingLMD ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <FileCheck size={16} />
            )}
            <span>Relevé Officiel LMD</span>
          </button>
        </div>
      </div>

      {grades.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center shadow-sm">
          <AlertCircle size={48} className="mx-auto text-slate-300 mb-3" />
          <h3 className="text-lg font-bold text-slate-800">Aucune note enregistrée</h3>
          <p className="text-slate-500 text-sm mt-1">Vos évaluations continues et notes d'examen apparaîtront ici.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Vue Mobile (Cartes adaptatives) */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {grades.map((grade) => (
              <div key={grade.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Calendar size={13} />
                    {grade.date || 'Session en cours'}
                  </span>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                    {grade.exam_type}
                  </span>
                </div>

                <div className="font-bold text-slate-900 text-base flex items-center justify-between">
                  <span>{grade.subject}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getScoreColor(grade.score, grade.max_score)}`}>
                    {grade.score}/{grade.max_score}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                  <span>Coefficient : <b>x{grade.coefficient}</b></span>
                  {grade.comment && <span className="italic truncate max-w-[200px]">{grade.comment}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Vue Tablette & Desktop (Tableau élégant) */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Module (ECUE)</th>
                    <th className="px-6 py-4">Épreuve</th>
                    <th className="px-6 py-4">Note obtenue</th>
                    <th className="px-6 py-4">Coefficient</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Appréciation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {grades.map((grade) => (
                    <tr key={grade.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-[#FF6B00]/10 rounded-lg text-[#FF6B00]">
                            <BookOpen size={16} />
                          </div>
                          <span className="font-semibold text-slate-900">{grade.subject}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                        <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-medium">
                          {grade.exam_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getScoreColor(grade.score, grade.max_score)}`}>
                          {grade.score}/{grade.max_score}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-slate-700 whitespace-nowrap">
                        x{grade.coefficient}
                      </td>
                      <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                        {grade.date || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-slate-500 italic max-w-xs truncate">
                        {grade.comment || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}