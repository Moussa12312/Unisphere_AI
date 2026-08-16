'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp, Loader2, Award, Users, CheckCircle,
  AlertTriangle, BookOpen, Filter
} from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

export default function CenseurPerformancePage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    loadPerformance();
  }, [selectedSession]);

  const loadSessions = async () => {
    try {
      const response = await api.get('/api/v1/exam-sessions/');
      const data = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      setSessions(data);
    } catch (error) {
      console.error(error);
    }
  };

  const loadPerformance = async () => {
    setLoading(true);
    try {
      const params = selectedSession ? { session_id: selectedSession } : {};
      const response = await api.get('/api/v1/academic/performance', { params });
      setData(response.data);
    } catch (error) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const getAverageColor = (avg: number) => {
    if (avg >= 14) return 'text-green-600 bg-green-50';
    if (avg >= 12) return 'text-blue-600 bg-blue-50';
    if (avg >= 10) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
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
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
            <TrendingUp size={24} className="text-white" />
          </div>
          Performance académique
        </h1>
        <p className="text-slate-500 mt-1">Analyse des performances par classe et filière</p>
      </div>

      {/* Filtre session */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center gap-3">
          <Filter size={16} className="text-slate-400" />
          <select
            value={selectedSession || ''}
            onChange={(e) => setSelectedSession(e.target.value ? parseInt(e.target.value) : null)}
            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          >
            <option value="">Toutes les sessions</option>
            {sessions.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats globales */}
      {data?.global_stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-5 text-white shadow-lg">
            <Users size={20} className="opacity-80 mb-2" />
            <p className="text-xs opacity-80">Étudiants</p>
            <p className="text-2xl font-bold">{data.global_stats.total_students}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl p-5 text-white shadow-lg">
            <BookOpen size={20} className="opacity-80 mb-2" />
            <p className="text-xs opacity-80">Notes saisies</p>
            <p className="text-2xl font-bold">{data.global_stats.total_grades}</p>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl p-5 text-white shadow-lg">
            <TrendingUp size={20} className="opacity-80 mb-2" />
            <p className="text-xs opacity-80">Moyenne générale</p>
            <p className="text-2xl font-bold">{data.global_stats.global_average}/20</p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-5 text-white shadow-lg">
            <CheckCircle size={20} className="opacity-80 mb-2" />
            <p className="text-xs opacity-80">Taux de réussite</p>
            <p className="text-2xl font-bold">{data.global_stats.global_success_rate}%</p>
          </div>
        </div>
      )}

      {/* Performance par classe */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Award size={20} className="text-[#FF6B00]" />
            Performance par classe
          </h2>
        </div>

        {data?.performance?.length === 0 ? (
          <div className="p-16 text-center">
            <TrendingUp size={48} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Aucune donnée de performance</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Classe</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Filière</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Étudiants</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Moyenne</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Réussite</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Excellent</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Échec</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.performance?.map((perf: any, idx: number) => (
                  <tr key={perf.class_id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900">{perf.class_name}</p>
                      <p className="text-xs text-slate-500">{perf.level}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                        {perf.filiere}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-medium text-slate-900">{perf.total_students}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-3 py-1 rounded-lg font-bold ${getAverageColor(perf.average)}`}>
                        {perf.average}/20
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <div className="w-16 bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${perf.success_rate}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium text-slate-600">{perf.success_rate}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-green-600 font-medium">{perf.excellent}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-red-600 font-medium">{perf.failed}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}