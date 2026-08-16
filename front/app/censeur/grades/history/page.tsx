'use client';

import { useState, useEffect } from 'react';
import {
  CheckCircle, Clock, Search, Filter, Loader2,
  Calendar, User, BookOpen
} from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

export default function CenseurGradesHistoryPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/v1/grades/');
      const allGrades = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      const validated = allGrades.filter((g: any) => g.status === 'validated');
      setGrades(validated);
    } catch (error) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const filteredGrades = grades.filter(g => {
    const matchSearch = 
      (g.student_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (g.course_title || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || g.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'validated':
        return <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full flex items-center gap-1"><CheckCircle size={10} /> Validé</span>;
      case 'draft':
        return <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full">Brouillon</span>;
      case 'rejected':
        return <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">Rejeté</span>;
      default:
        return <span className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded-full">{status}</span>;
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Non définie';
    return new Date(dateStr).toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-slate-400';
    if (score < 5) return 'text-red-600';
    if (score < 10) return 'text-orange-600';
    if (score < 15) return 'text-blue-600';
    return 'text-green-600';
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
        <h1 className="text-3xl font-bold text-slate-900">Historique des validations</h1>
        <p className="text-slate-500 mt-1">Consultez l'historique des notes validées</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total validées</p>
              <p className="text-2xl font-bold text-slate-900">{grades.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <BookOpen size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Cours évalués</p>
              <p className="text-2xl font-bold text-slate-900">
                {new Set(grades.map(g => g.course_id)).size}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <User size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Étudiants notés</p>
              <p className="text-2xl font-bold text-slate-900">
                {new Set(grades.map(g => g.student_id)).size}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Calendar size={20} className="text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Dernière validation</p>
              <p className="text-sm font-bold text-slate-900">
                {grades.length > 0 ? formatDate(grades[0].validated_at || grades[0].updated_at) : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="🔍 Rechercher par étudiant ou cours..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          >
            <option value="">Tous les statuts</option>
            <option value="validated">Validées</option>
            <option value="draft">Brouillons</option>
            <option value="rejected">Rejetées</option>
          </select>
        </div>
      </div>

      {/* Liste */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredGrades.length === 0 ? (
          <div className="p-16 text-center">
            <CheckCircle size={48} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Aucune note dans l'historique</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredGrades.map((grade) => (
              <div key={grade.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-bold text-lg ${
                      grade.score >= 10 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {grade.score !== null ? grade.score.toFixed(1) : '?'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900">{grade.student_name || 'Étudiant'}</p>
                        {getStatusBadge(grade.status)}
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5">
                        {grade.course_title || 'Cours'} • {grade.session_name || 'Session'}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar size={10} />
                          Validé le {formatDate(grade.validated_at || grade.updated_at)}
                        </span>
                        {grade.validated_by_name && (
                          <span className="flex items-center gap-1">
                            <User size={10} />
                            Par {grade.validated_by_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${getScoreColor(grade.score)}`}>
                      {grade.score !== null ? `${grade.score.toFixed(2)}` : '--'}
                    </p>
                    <p className="text-xs text-slate-400">/20</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}