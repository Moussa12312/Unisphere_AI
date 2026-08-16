'use client';

import { useState, useEffect } from 'react';
import {
  BarChart3, Loader2, TrendingUp, Users,
  CheckCircle, Clock, XCircle, Calendar,
  Download, Filter
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

export default function GuardStatisticsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [period, setPeriod] = useState('week');

  useEffect(() => {
    loadStats();
  }, [period]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/v1/attendance/statistics?period=${period}`);
      setStats(response.data);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    if (!stats) return;
    
    const report = `
RAPPORT DE PRÉSENCE - ${period.toUpperCase()}
============================================

TAUX DE PRÉSENCE GLOBAL: ${stats.attendance_rate?.toFixed(1) || 0}%

STATISTIQUES PAR NIVEAU:
${stats.by_level?.map((level: any) => 
  `- ${level.level}: ${level.rate?.toFixed(1)}% (${level.present}/${level.total})`
).join('\n') || 'Aucune donnée'}

TOP 5 MEILLEURS NIVEAUX:
${stats.by_level?.slice(0, 5).map((level: any, idx: number) => 
  `${idx + 1}. ${level.level}: ${level.rate?.toFixed(1)}%`
).join('\n') || 'Aucune donnée'}

Généré le: ${new Date().toLocaleString('fr-FR')}
    `.trim();
    
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rapport_presences_${period}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Rapport exporté');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-[#FF6B00]" size={32} />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <BarChart3 size={48} className="text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">Aucune statistique disponible</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <BarChart3 size={24} className="text-white" />
            </div>
            Statistiques
          </h1>
          <p className="text-slate-500 mt-1">Analyse des présences</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          >
            <option value="day">Aujourd'hui</option>
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
            <option value="year">Cette année</option>
          </select>
          <button
            onClick={exportReport}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"
          >
            <Download size={16} />
            Exporter
          </button>
        </div>
      </div>

      {/* Stats principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-6 text-white">
          <TrendingUp size={24} className="mb-3 opacity-80" />
          <p className="text-sm opacity-80 mb-1">Taux de présence</p>
          <p className="text-3xl font-bold">{stats.attendance_rate?.toFixed(1) || 0}%</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users size={20} className="text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-1">Total étudiants</p>
          <p className="text-2xl font-bold text-slate-900">{stats.total_students || 0}</p>
        </div>

        <div className="bg-white rounded-xl border border-green-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle size={20} className="text-green-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-1">Présences</p>
          <p className="text-2xl font-bold text-green-600">{stats.total_present || 0}</p>
        </div>

        <div className="bg-white rounded-xl border border-red-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle size={20} className="text-red-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-1">Absences</p>
          <p className="text-2xl font-bold text-red-600">{stats.total_absent || 0}</p>
        </div>
      </div>

      {/* Statistiques par niveau */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <BarChart3 size={20} className="text-[#FF6B00]" />
          Présence par niveau
        </h2>
        {stats.by_level && stats.by_level.length > 0 ? (
          <div className="space-y-3">
            {stats.by_level.map((level: any, idx: number) => (
              <div key={idx} className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-slate-900">{level.level}</span>
                    <span className="text-xs text-slate-500">
                      {level.present}/{level.total} étudiants
                    </span>
                  </div>
                  <span className={`text-lg font-bold ${
                    level.rate >= 75 ? 'text-green-600' :
                    level.rate >= 50 ? 'text-orange-600' :
                    'text-red-600'
                  }`}>
                    {level.rate?.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      level.rate >= 75 ? 'bg-green-500' :
                      level.rate >= 50 ? 'bg-orange-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${level.rate}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-slate-500 py-8">Aucune donnée disponible</p>
        )}
      </div>

      {/* Tendances */}
      {stats.trends && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-[#FF6B00]" />
            Tendances
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-green-50 rounded-xl">
              <p className="text-xs text-green-600 mb-1">Meilleur jour</p>
              <p className="text-lg font-bold text-green-700">{stats.trends.best_day || '-'}</p>
            </div>
            <div className="p-4 bg-red-50 rounded-xl">
              <p className="text-xs text-red-600 mb-1">Pire jour</p>
              <p className="text-lg font-bold text-red-700">{stats.trends.worst_day || '-'}</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-xl">
              <p className="text-xs text-blue-600 mb-1">Moyenne hebdo</p>
              <p className="text-lg font-bold text-blue-700">{stats.trends.weekly_avg?.toFixed(1) || 0}%</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-xl">
              <p className="text-xs text-orange-600 mb-1">Retards moyens</p>
              <p className="text-lg font-bold text-orange-700">{stats.trends.avg_late || 0}/jour</p>
            </div>
          </div>
        </div>
      )}

      {/* Actions rapides */}
      <div className="bg-gradient-to-r from-[#0a1628] to-[#1e293b] rounded-2xl p-6 text-white">
        <h2 className="text-lg font-bold mb-4">Actions rapides</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Link
            href="/guard/attendance/today"
            className="flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl text-sm font-medium border border-white/20"
          >
            <Calendar size={16} />
            Présences du jour
          </Link>
          <Link
            href="/guard/attendance/history"
            className="flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl text-sm font-medium border border-white/20"
          >
            <Clock size={16} />
            Historique
          </Link>
          <Link
            href="/guard/scanner"
            className="flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl text-sm font-medium border border-white/20"
          >
            <Users size={16} />
            Scanner QR
          </Link>
        </div>
      </div>
    </div>
  );
}