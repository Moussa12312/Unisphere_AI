'use client';
import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Printer } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import financialService from '@/services/financialService';
import { toast } from 'react-hot-toast';

export default function MonthlyReportPage() {
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [typeData, setTypeData] = useState<any[]>([]);
  const [overview, setOverview] = useState<any>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [monthly, types, ov] = await Promise.all([
        financialService.getMonthly(12, 'year'),
        financialService.getTypes('year'),
        financialService.getOverview('year')
      ]);
      setMonthlyData(monthly);
      setTypeData(types);
      setOverview(ov);
    } catch (error) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const formatFCFA = (v: number) => {
    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
    return v.toString();
  };

  const totalYear = monthlyData.reduce((sum, m) => sum + m.revenus, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B00] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Rapport mensuel</h1>
          <p className="text-slate-500 mt-1">Analyse financière sur 12 mois</p>
        </div>
        <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-[#FF6B00] text-white rounded-lg">
          <Printer size={16} /> Imprimer
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total annuel</p>
              <p className="text-2xl font-bold text-green-600">{formatFCFA(totalYear)} FCFA</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <BarChart3 size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Taux recouvrement</p>
              <p className="text-2xl font-bold text-slate-900">{overview?.collection_rate || 0}%</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <TrendingUp size={20} className="text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Moyenne mensuelle</p>
              <p className="text-2xl font-bold text-slate-900">{formatFCFA(totalYear / 12)} FCFA</p>
            </div>
          </div>
        </div>
      </div>

      {/* Graphique revenus mensuels */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="font-bold text-slate-900 mb-4">Évolution des revenus (12 mois)</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip formatter={(v: any) => [`${Number(v).toLocaleString()} FCFA`]} />
            <Bar dataKey="revenus" fill="#FF6B00" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Répartition par type */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4">Répartition par type</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={typeData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value">
                {typeData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {typeData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-slate-600">{item.name}</span>
                </div>
                <span className="font-semibold">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4">Tableau récapitulatif</h3>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 text-xs font-semibold text-slate-500">Mois</th>
                <th className="text-right py-2 text-xs font-semibold text-slate-500">Revenus</th>
                <th className="text-right py-2 text-xs font-semibold text-slate-500">Impayés</th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.map((m, idx) => (
                <tr key={idx} className="border-b border-slate-100">
                  <td className="py-2 text-sm">{m.month}</td>
                  <td className="py-2 text-sm text-right text-green-600 font-semibold">{formatFCFA(m.revenus)}</td>
                  <td className="py-2 text-sm text-right text-red-600">{formatFCFA(m.impayes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}