'use client';

import { useState, useEffect } from 'react';
import { 
  Shield, Clock, AlertCircle, CheckCircle, 
  ArrowRight, Loader2, RefreshCw, Filter,
  TrendingUp, TrendingDown, Activity, Lock
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

interface AuditLog {
  id: number;
  action: string;
  user: string;
  ip: string;
  time: string;
  time_ago: string;
  status: string;
  status_code: string;
}

interface SecuritySettings {
  two_factor_enabled: boolean;
  password_expiry_days: number;
  password_expiry_enabled: boolean;
  session_timeout_minutes: number;
  max_login_attempts: number;
  ip_whitelist_enabled: boolean;
}

interface SecurityStats {
  total_actions: number;
  failed_attempts: number;
  today_actions: number;
  suspicious_ips: number;
}

export default function SecuritySettingsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<SecuritySettings | null>(null);
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [filter, setFilter] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [logsRes, settingsRes, statsRes] = await Promise.all([
        api.get('/api/v1/security/audit-logs').catch(() => ({ data: { data: [] } })),
        api.get('/api/v1/security/settings').catch(() => ({ data: null })),
        api.get('/api/v1/security/stats').catch(() => ({ data: null }))
      ]);

      setLogs(logsRes.data?.data || []);
      setSettings(settingsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error(error);
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key: keyof SecuritySettings, value: boolean) => {
    if (!settings) return;
    
    setSaving(true);
    try {
      const updatedSettings = { ...settings, [key]: value };
      await api.put('/api/v1/security/settings', updatedSettings);
      setSettings(updatedSettings);
      toast.success('Paramètre mis à jour');
    } catch (error) {
      toast.error('Erreur de mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const filteredLogs = logs.filter(log => 
    !filter || 
    log.action.toLowerCase().includes(filter.toLowerCase()) ||
    log.user.toLowerCase().includes(filter.toLowerCase())
  );

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
          <h1 className="text-3xl font-bold text-slate-900">Sécurité & Audit</h1>
          <p className="text-slate-500 mt-1">Surveillez l'activité et renforcez la sécurité</p>
        </div>
        <button
          onClick={loadAll}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"
        >
          <RefreshCw size={16} />
          Actualiser
        </button>
      </div>

      {/* Stats rapides */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Activity size={16} className="text-blue-600" />
              <p className="text-xs text-slate-500">Actions totales</p>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.total_actions}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-green-600" />
              <p className="text-xs text-slate-500">Aujourd'hui</p>
            </div>
            <p className="text-2xl font-bold text-green-600">{stats.today_actions}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={16} className="text-red-600" />
              <p className="text-xs text-slate-500">Échecs</p>
            </div>
            <p className="text-2xl font-bold text-red-600">{stats.failed_attempts}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Lock size={16} className="text-orange-600" />
              <p className="text-xs text-slate-500">IPs suspectes</p>
            </div>
            <p className="text-2xl font-bold text-orange-600">{stats.suspicious_ips}</p>
          </div>
        </div>
      )}

      {/* Carte politique */}
      <div className="bg-gradient-to-r from-[#0a1628] to-[#1e293b] rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#FF6B00] rounded-xl flex items-center justify-center shadow-lg">
              <Shield className="text-white" size={28} />
            </div>
            <div>
              <h3 className="text-lg font-bold">Politique de sécurité UniSphere AI</h3>
              <p className="text-sm text-slate-300 mt-1">
                5 catégories • 20 règles • Dernière mise à jour : Juillet 2026
              </p>
            </div>
          </div>
          <Link
            href="/admin/settings/security/policy"
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg text-sm font-medium transition-all border border-white/20"
          >
            Consulter
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      {/* Paramètres de sécurité */}
      {settings && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center">
                <Shield className="text-white" size={20} />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Paramètres de sécurité</h2>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <p className="font-semibold text-slate-900">Authentification à deux facteurs (2FA)</p>
                <p className="text-sm text-slate-500">Obliger les administrateurs à utiliser un code SMS ou une application.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={settings.two_factor_enabled}
                  onChange={(e) => handleToggle('two_factor_enabled', e.target.checked)}
                  disabled={saving}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF6B00]"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <p className="font-semibold text-slate-900">Expiration des mots de passe</p>
                <p className="text-sm text-slate-500">Forcer le changement tous les {settings.password_expiry_days} jours.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={settings.password_expiry_enabled}
                  onChange={(e) => handleToggle('password_expiry_enabled', e.target.checked)}
                  disabled={saving}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF6B00]"></div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Journal d'audit */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
              <Clock className="text-white" size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Journal d'audit</h2>
          </div>
          <div className="relative">
            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filtrer..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>
        </div>
        
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <Clock size={48} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Aucune activité enregistrée</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-600">Action</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Utilisateur</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Adresse IP</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Date & Heure</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{log.action}</td>
                    <td className="px-4 py-3 text-slate-600">{log.user}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{log.ip}</td>
                    <td className="px-4 py-3 text-slate-500">{log.time_ago}</td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 text-xs font-semibold ${
                        log.status === 'Succès' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {log.status === 'Succès' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                        {log.status}
                      </span>
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