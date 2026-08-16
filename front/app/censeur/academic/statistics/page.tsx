'use client';

import { useState, useEffect } from 'react';
import {
  BarChart3, Loader2, TrendingUp, Award,
  Filter, BookOpen, PieChart
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart as RPieChart,
  Pie, Cell, Legend
} from 'recharts';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

export default function CenseurStatisticsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    loadStatistics();
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

  const loadStatistics = async () => {
    setLoading(true);
    try {
      const params = selectedSession ? { session_id: selectedSession } : {};
      const response = await api.get('/api/v1/academic/statistics', { params });
      setData(response.data);
    } catch (error) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  // Préparer données pour graphique distribution
  const getDistributionData = () => {
    if (!data?.distribution) return [];
    return Object.entries(data.distribution).map(([name, value]) => ({
      name,
      value: value as number
    }));
  };

  // Préparer données pour mentions
  const getMentionsData = () => {
    if (!data?.mentions) return [];
    return Object.entries(data.mentions).map(([name, value], idx) => ({
      name,
      value: value as number,
      color: COLORS[idx % COLORS.length]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-[#FF6B00]" size={32} />
      </div>
    );
  }

  const distributionData = getDistributionData();
  const mentionsData = getMentionsData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <BarChart3 size={24} className="text-white" />
          </div>
          Statistiques avancées
        </h1>
        <p className="text-slate-500 mt-1">Analyse détaillée des résultats</p>
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

      {/* Stats principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <BookOpen size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total notes</p>
              <p className="text-2xl font-bold text-slate-900">{data?.total_grades || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Moyenne</p>
              <p className="text-2xl font-bold text-slate-900">{data?.global_average?.toFixed(2) || 0}/20</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Award size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Note max</p>
              <p className="text-2xl font-bold text-green-700">{data?.max_score || 0}/20</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <TrendingUp size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Note min</p>
              <p className="text-2xl font-bold text-red-700">{data?.min_score || 0}/20</p>
            </div>
          </div>
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribution des notes */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <BarChart3 size={20} className="text-[#FF6B00]" />
            Distribution des notes
          </h2>
          {distributionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={distributionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip />
                <Bar dataKey="value" fill="#FF6B00" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-400">
              Aucune donnée
            </div>
          )}
        </div>

        {/* Répartition par mention */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <PieChart size={20} className="text-[#FF6B00]" />
            Répartition par mention
          </h2>
          {mentionsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <RPieChart>
              <Pie
                data={mentionsData}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="value"
                label={(entry: any) => `${((entry.percent || 0) * 100).toFixed(0)}%`}
              >
                  {mentionsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </RPieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-400">
              Aucune donnée
            </div>
          )}
        </div>
      </div>

      {/* Performance par matière */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <BookOpen size={20} className="text-[#FF6B00]" />
            Performance par matière
          </h2>
        </div>

        {data?.courses_stats?.length === 0 ? (
          <div className="p-16 text-center">
            <BookOpen size={48} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Aucune statistique par matière</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Matière</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Notes</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Moyenne</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Min</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Max</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Réussite</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.courses_stats?.map((course: any) => (
                  <tr key={course.course_id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900">{course.course_title}</p>
                      <p className="text-xs text-slate-500">{course.course_code}</p>
                    </td>
                    <td className="py-3 px-4 text-center font-medium">{course.total_grades}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-3 py-1 rounded-lg font-bold ${
                        course.average >= 14 ? 'bg-green-100 text-green-700' :
                        course.average >= 12 ? 'bg-blue-100 text-blue-700' :
                        course.average >= 10 ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {course.average}/20
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-red-600 font-medium">{course.min}</td>
                    <td className="py-3 px-4 text-center text-green-600 font-medium">{course.max}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <div className="w-16 bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${course.success_rate}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium">{course.success_rate}%</span>
                      </div>
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