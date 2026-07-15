'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Loader2, Award, AlertCircle } from 'lucide-react';
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

  const getScoreColor = (score: number, max: number) => {
    const percentage = (score / max) * 100;
    if (percentage >= 70) return 'bg-green-100 text-green-700 border-green-200';
    if (percentage >= 50) return 'bg-orange-100 text-orange-700 border-orange-200';
    return 'bg-red-100 text-red-700 border-red-200';
  };

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-[#FF6B00]" size={32} /></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mes Notes & Évaluations</h1>
          <p className="text-slate-500 mt-1">Historique complet de vos résultats académiques.</p>
        </div>
        <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
          <Award size={18} />
          <span>Total : {grades.length} évaluation{grades.length > 1 ? 's' : ''}</span>
        </div>
      </div>

      {grades.length === 0 ? (
        <div className="bg-white p-10 rounded-xl border border-slate-200 text-center">
          <AlertCircle size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">Aucune note n'a été enregistrée pour le moment.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Matière</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Note</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Coef</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Appréciation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {grades.map((grade) => (
                  <tr key={grade.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#FF6B00]/10 rounded-lg">
                          <TrendingUp size={16} className="text-[#FF6B00]" />
                        </div>
                        <span className="font-medium text-slate-900">{grade.subject}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium">{grade.exam_type}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-bold border ${getScoreColor(grade.score, grade.max_score)}`}>
                        {grade.score}/{grade.max_score}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-mono">x{grade.coefficient}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{grade.date}</td>
                    <td className="px-6 py-4 text-sm text-slate-500 italic max-w-xs truncate">
                      {grade.comment || "-"}
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