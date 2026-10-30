'use client';

import { useState, useEffect } from 'react';
import { 
  ShieldAlert, RefreshCw, Filter, Search, Building2,
  CheckCircle, XCircle, Clock, Globe, Shield, AlertTriangle
} from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

export default function SuperAdminAuditPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [universities, setUniversities] = useState<{ id: number; name: string }[]>([]);
  const [selectedUniv, setSelectedUniv] = useState<string>('');
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({
    total_actions: 0,
    failed_attempts: 0,
    today_actions: 0,
    suspicious_ips: 0
  });

  useEffect(() => {
    loadAudit();
  }, [selectedUniv]);

  const loadAudit = async () => {
    setLoading(true);
    try {
      const url = selectedUniv 
        ? `/api/v1/superadmin/audit-logs?university_id=${selectedUniv}`
        : '/api/v1/superadmin/audit-logs';
      const res = await api.get(url);
      setLogs(res.data.data || []);
      setStats(res.data.stats || { total_actions: 0, failed_attempts: 0, today_actions: 0, suspicious_ips: 0 });
      if (res.data.universities) {
        setUniversities(res.data.universities);
      }
    } catch (err: any) {
      toast.error('Erreur de chargement des logs d\'audit');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(l => 
    !search || 
    (l.action || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.user || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.university_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.ip || '').includes(search)
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-[#FF6B00] flex items-center justify-center">
              <ShieldAlert size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Sécurité & Audit Multi-Universités</h1>
              <p className="text-sm text-slate-500">Traçabilité globale de toutes les universités UniSphere AI</p>
            </div>
          </div>
        </div>

        <button
          onClick={loadAudit}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-medium transition-colors shadow-sm self-start sm:self-auto"
        >
          <RefreshCw size={15} /> Actualiser
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">Actions Totales</span>
            <Globe className="text-blue-500" size={18} />
          </div>
          <p className="text-2xl font-black text-slate-900">{stats.total_actions}</p>
          <p className="text-xs text-slate-400 mt-1">Plateforme entière</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">Aujourd'hui</span>
            <Clock className="text-emerald-500" size={18} />
          </div>
          <p className="text-2xl font-black text-emerald-600">{stats.today_actions}</p>
          <p className="text-xs text-slate-400 mt-1">Activité des 24h</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">Échecs & Refus</span>
            <XCircle className="text-rose-500" size={18} />
          </div>
          <p className="text-2xl font-black text-rose-600">{stats.failed_attempts}</p>
          <p className="text-xs text-slate-400 mt-1">Tentatives bloquées</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">IPs Suspectes</span>
            <Shield className="text-amber-500" size={18} />
          </div>
          <p className="text-2xl font-black text-amber-600">{stats.suspicious_ips}</p>
          <p className="text-xs text-slate-400 mt-1">Surveillance active</p>
        </div>
      </div>

      {/* Barre de filtres */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Sélecteur d'Université */}
        <div className="flex items-center gap-2 flex-1">
          <Building2 size={18} className="text-slate-400 flex-shrink-0" />
          <select
            value={selectedUniv}
            onChange={(e) => setSelectedUniv(e.target.value)}
            className="w-full sm:w-auto min-w-[240px] px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          >
            <option value="">🏫 Toutes les Universités (Vue Globale)</option>
            {universities.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        {/* Recherche rapide */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher action, email, IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          />
        </div>
      </div>

      {/* Table des logs d'audit */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Université</th>
                <th className="py-3 px-4">Utilisateur</th>
                <th className="py-3 px-4">Adresse IP</th>
                <th className="py-3 px-4 text-center">Statut</th>
                <th className="py-3 px-4 text-right">Date & Heure</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="animate-spin text-[#FF6B00]" size={18} />
                      Chargement des logs d'audit multi-universités...
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Aucun événement d'audit enregistré pour cette sélection.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {log.action}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 font-medium text-slate-800">
                        <Building2 size={13} className="text-[#FF6B00]" />
                        {log.university_name}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {log.user}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {log.ip}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                        log.status_code === 'success'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {log.status_code === 'success' ? <CheckCircle size={10} /> : <XCircle size={10} />}
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500 whitespace-nowrap">
                      {log.time ? new Date(log.time).toLocaleString('fr-FR') : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
