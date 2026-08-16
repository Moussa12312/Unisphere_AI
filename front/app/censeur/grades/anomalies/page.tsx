'use client';

import { useState, useEffect } from 'react';
import {
  AlertTriangle, Search, Filter, Loader2,
  CheckCircle, XCircle, Eye, TrendingUp, Settings, TrendingDown
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

export default function CenseurAnomaliesPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ total: 0, high: 0, medium: 0, low: 0 });
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    loadAnomalies();
  }, []);

  const loadAnomalies = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/v1/grades/anomalies');
      setAnomalies(response.data.anomalies || []);
      setStats({
        total: response.data.total || 0,
        high: response.data.high || 0,
        medium: response.data.medium || 0,
        low: response.data.low || 0
      });
    } catch (error) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async (gradeId: number) => {
    try {
      await api.put(`/api/v1/grades/${gradeId}/validate`);
      toast.success('Note validée malgré l\'anomalie');
      loadAnomalies();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  };

  const handleReject = async (gradeId: number) => {
    const reason = prompt('Raison du rejet :');
    if (reason === null) return;
    
    try {
      await api.put(`/api/v1/grades/${gradeId}/reject`, null, {
        params: { reason }
      });
      toast.success('Note rejetée');
      loadAnomalies();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  };

  const filteredAnomalies = anomalies.filter(a => {
    const matchSearch = 
      a.student_name.toLowerCase().includes(search.toLowerCase()) ||
      a.course_title.toLowerCase().includes(search.toLowerCase()) ||
      a.matricule.toLowerCase().includes(search.toLowerCase());
    const matchSeverity = !filterSeverity || a.severity === filterSeverity;
    const matchType = !filterType || a.anomaly_type === filterType;
    return matchSearch && matchSeverity && matchType;
  });

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full font-bold flex items-center gap-1"><AlertTriangle size={10} /> Critique</span>;
      case 'medium':
        return <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full font-medium">Moyen</span>;
      case 'low':
        return <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">Faible</span>;
      default:
        return null;
    }
  };

  const getScoreColor = (score: number) => {
    if (score > 18) return 'text-green-600 bg-green-50';
    if (score < 5) return 'text-red-600 bg-red-50';
    return 'text-slate-600 bg-slate-50';
  };

  const anomalyTypes = [...new Set(anomalies.map(a => a.anomaly_type))];

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/30">
              <AlertTriangle size={24} className="text-white" />
            </div>
            Détection d'anomalies
          </h1>
          <p className="text-slate-500 mt-1">Notes suspectes nécessitant une vérification</p>
        </div>
        
        {/* ✅ NOUVEAU BOUTON CONFIGURATION */}
        <Link
          href="/censeur/settings/anomalies"
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
        >
          <Settings size={16} />
          Configurer
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <AlertTriangle size={20} className="text-slate-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total anomalies</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <TrendingDown size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Critiques</p>
              <p className="text-2xl font-bold text-red-700">{stats.high}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-orange-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <AlertTriangle size={20} className="text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Moyennes</p>
              <p className="text-2xl font-bold text-orange-700">{stats.medium}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-yellow-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <TrendingUp size={20} className="text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Faibles</p>
              <p className="text-2xl font-bold text-yellow-700">{stats.low}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="🔍 Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          >
            <option value="">Toutes les sévérités</option>
            <option value="high">🔴 Critique</option>
            <option value="medium">🟠 Moyen</option>
            <option value="low">🟡 Faible</option>
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          >
            <option value="">Tous les types</option>
            {anomalyTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Liste */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredAnomalies.length === 0 ? (
          <div className="p-16 text-center">
            <CheckCircle size={48} className="text-green-300 mx-auto mb-3" />
            <p className="text-slate-500">Aucune anomalie détectée</p>
            <p className="text-xs text-slate-400 mt-1">Toutes les notes semblent normales</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredAnomalies.map((anomaly) => (
              <div key={anomaly.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center font-bold ${getScoreColor(anomaly.score)}`}>
                      <span className="text-xl">{anomaly.score.toFixed(1)}</span>
                      <span className="text-[10px]">/20</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-slate-900">{anomaly.student_name}</p>
                        {getSeverityBadge(anomaly.severity)}
                      </div>
                      <p className="text-sm text-slate-500">
                        {anomaly.matricule} • {anomaly.course_title} • {anomaly.session_name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 bg-red-50 text-red-700 rounded">
                          ⚠️ {anomaly.anomaly_type}
                        </span>
                        {anomaly.comment && (
                          <span className="text-xs text-slate-400 italic">💬 {anomaly.comment}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleValidate(anomaly.id)}
                      className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                      title="Valider malgré l'anomalie"
                    >
                      <CheckCircle size={12} />
                      Valider
                    </button>
                    <button
                      onClick={() => handleReject(anomaly.id)}
                      className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                      title="Rejeter la note"
                    >
                      <XCircle size={12} />
                      Rejeter
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <AlertTriangle size={16} />
          Critères de détection
        </h3>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>🔴 <strong>Critique</strong> : Note &lt; 3 ou note exceptionnelle</li>
          <li>🟠 <strong>Moyen</strong> : Note entre 3 et 5, ou entre 18 et 19</li>
          <li>🟡 <strong>Faible</strong> : Note entre 5 et 6, ou entre 19 et 20</li>
        </ul>
      </div>
    </div>
  );
}