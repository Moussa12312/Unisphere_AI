'use client';
import { useState, useEffect } from 'react';
import { TrendingUp, Users, Wallet, AlertCircle } from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import financialService from '@/services/financialService';
import { toast } from 'react-hot-toast';

export default function AccountantStatsPage() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [monthly, setMonthly] = useState<any[]>([]);
  const [installmentsStats, setInstallmentsStats] = useState<any>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ov, m, inst] = await Promise.all([
        financialService.getOverview('year'),
        financialService.getMonthly(12, 'year'),
        financialService.getInstallmentsStats()
      ]);
      setOverview(ov);
      setMonthly(m);
      setInstallmentsStats(inst);
    } catch (error) {
      toast.error('Erreur');
    } finally {
      setLoading(false);
    }
  };

  const formatFCFA = (v: number) => {
    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M FCFA`;
    if (v >= 1000) return `${(v / 1000).toFixed(0)}K FCFA`;
    return `${v} FCFA`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B00] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Statistiques financières</h1>
        <p className="text-slate-500 mt-1">Analyse détaillée de la santé financière</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
            <TrendingUp size={20} className="text-green-600" />
          </div>
          <p className="text-sm text-slate-500">Revenus totaux</p>
          <p className="text-2xl font-bold text-slate-900">{formatFCFA(overview?.total_revenue || 0)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mb-3">
            <Wallet size={20} className="text-orange-600" />
          </div>
          <p className="text-sm text-slate-500">Reliquats</p>
          <p className="text-2xl font-bold text-slate-900">{formatFCFA(installmentsStats?.total_balance || 0)}</p>
          <p className="text-xs text-slate-400 mt-1">{installmentsStats?.students_with_balance || 0} étudiants</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mb-3">
            <AlertCircle size={20} className="text-red-600" />
          </div>
          <p className="text-sm text-slate-500">Impayés</p>
          <p className="text-2xl font-bold text-slate-900">{formatFCFA(overview?.unpaid || 0)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
            <Users size={20} className="text-blue-600" />
          </div>
          <p className="text-sm text-slate-500">Taux recouvrement</p>
          <p className="text-2xl font-bold text-slate-900">{overview?.collection_rate || 0}%</p>
        </div>
      </div>

      {/* Graphique d'évolution */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="font-bold text-slate-900 mb-4">Évolution des revenus vs impayés</h3>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={monthly}>
            <defs>
              <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorImp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip formatter={(v: any) => [`${Number(v).toLocaleString()} FCFA`]} />
            <Area type="monotone" dataKey="revenus" stroke="#10B981" strokeWidth={3} fill="url(#colorRev)" />
            <Area type="monotone" dataKey="impayes" stroke="#EF4444" strokeWidth={3} fill="url(#colorImp)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Comparaison mensuelle */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="font-bold text-slate-900 mb-4">Comparaison mensuelle</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip />
            <Bar dataKey="revenus" fill="#10B981" name="Revenus" />
            <Bar dataKey="impayes" fill="#EF4444" name="Impayés" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}