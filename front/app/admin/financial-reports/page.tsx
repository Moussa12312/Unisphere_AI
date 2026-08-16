'use client';

import { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, AlertCircle,
  Download, ArrowUpRight, ArrowDownRight, Clock, CheckCircle,
  Wallet
} from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend
} from 'recharts';
import financialService from '@/services/financialService';
import { useToast } from '@/components/ToastProvider';

export default function FinancialReportsPage() {
  const [period, setPeriod] = useState('year');
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const [overview, setOverview] = useState<any>(null);
  const [installmentsStats, setInstallmentsStats] = useState<any>(null);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [typeData, setTypeData] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [overviewRes, installmentsRes, monthlyRes, typeRes, txRes] = await Promise.all([
        financialService.getOverview(period),
        financialService.getInstallmentsStats(),
        financialService.getMonthly(6, period),  
        financialService.getTypes(period),       
        financialService.getTransactions(5, period),  
      ]);

      setOverview(overviewRes);
      setInstallmentsStats(installmentsRes);
      setMonthlyData(monthlyRes);
      setTypeData(typeRes);
      setTransactions(txRes);
    } catch (error) {
      console.error('Erreur chargement finances:', error);
      toast.error('Erreur lors du chargement des données financières');
    } finally {
      setLoading(false);
    }
  };

  const formatFCFA = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toString();
  };

  const formatFullFCFA = (value: number) => {
    return new Intl.NumberFormat('fr-FR').format(value) + ' FCFA';
  };

  const kpis = [
    { 
      label: 'Revenus totaux', 
      value: overview ? `${formatFCFA(overview.total_revenue)} FCFA` : '0 FCFA', 
      fullValue: overview ? formatFullFCFA(overview.total_revenue) : '0 FCFA',
      subtitle: overview ? `${overview.total_payments || 0} paiement(s)` : '',
      change: '+12.5%', 
      trend: 'up' as const,
      icon: DollarSign,
      bgColor: 'bg-green-500'
    },
    { 
      label: 'Reliquats en attente', 
      value: installmentsStats ? `${formatFCFA(installmentsStats.total_balance)} FCFA` : '0 FCFA',
      fullValue: installmentsStats ? formatFullFCFA(installmentsStats.total_balance) : '0 FCFA',
      subtitle: installmentsStats ? `${installmentsStats.students_with_balance || 0} étudiant(s)` : '',
      change: 'En attente', 
      trend: 'neutral' as const,
      icon: Wallet,
      bgColor: 'bg-orange-500'
    },
    { 
      label: 'Impayés', 
      value: overview ? `${formatFCFA(overview.unpaid)} FCFA` : '0 FCFA', 
      fullValue: overview ? formatFullFCFA(overview.unpaid) : '0 FCFA',
      subtitle: 'Paiements échoués',
      change: '-8.3%', 
      trend: 'down' as const,
      icon: AlertCircle,
      bgColor: 'bg-red-500'
    },
    { 
      label: 'Taux recouvrement', 
      value: overview ? `${overview.collection_rate}%` : '0%', 
      fullValue: overview ? `${overview.collection_rate}%` : '0%',
      subtitle: overview ? `Sur ${formatFullFCFA((overview.total_revenue || 0) + (overview.late || 0))}` : '',
      change: '+4.1%', 
      trend: 'up' as const,
      icon: CheckCircle,
      bgColor: 'bg-blue-500'
    },
  ];

  const handleExport = () => toast.success('Export en cours...');

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      failed: 'bg-red-100 text-red-700',
      partial: 'bg-orange-100 text-orange-700',
      refunded: 'bg-slate-100 text-slate-700'
    };
    const labels: Record<string, string> = {
      completed: 'Payé',
      pending: 'En attente',
      failed: 'Échoué',
      partial: 'Partiel',
      refunded: 'Remboursé'
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-slate-100 text-slate-700'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getPaymentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      scolarite: 'Scolarité',
      inscription: 'Inscription',
      autre: 'Autre'
    };
    return labels[type] || type;
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            {['month', 'quarter', 'year'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  period === p ? 'bg-[#FF6B00] text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {p === 'month' ? 'Ce mois' : p === 'quarter' ? 'Ce trimestre' : 'Cette année'}
              </button>
            ))}
          </div>
          
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-[#FF6B00] text-white rounded-xl text-sm font-medium hover:bg-[#e55f00] transition-all shadow-md hover:shadow-lg">
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* KPIs - 4 cartes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-xl transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 ${kpi.bgColor} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                  <Icon className="text-white" size={24} />
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                  kpi.trend === 'up' ? 'bg-green-100 text-green-700' : 
                  kpi.trend === 'down' ? 'bg-red-100 text-red-700' :
                  'bg-orange-100 text-orange-700'
                }`}>
                  {kpi.trend === 'up' ? <ArrowUpRight size={14} /> : 
                   kpi.trend === 'down' ? <ArrowDownRight size={14} /> :
                   <Clock size={14} />}
                  {kpi.change}
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900 mb-1">{kpi.value}</p>
              <p className="text-sm text-slate-500">{kpi.label}</p>
              {kpi.subtitle && (
                <p className="text-xs text-slate-400 mt-1">{kpi.subtitle}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Graphiques principaux */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenus vs Impayés */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Revenus vs Impayés</h3>
              <p className="text-sm text-slate-500 mt-1">Évolution sur 6 mois</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-slate-600">Revenus</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-slate-600">Impayés</span>
              </div>
            </div>
          </div>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorRevenus" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorImpayes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: 'none', borderRadius: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}
                  formatter={(value: any) => [`${Number(value).toLocaleString()} FCFA`]}
                />
                <Area type="monotone" dataKey="revenus" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenus)" />
                <Area type="monotone" dataKey="impayes" stroke="#EF4444" strokeWidth={3} fillOpacity={1} fill="url(#colorImpayes)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[350px] text-slate-400">
              Aucune donnée disponible
            </div>
          )}
        </div>

        {/* Répartition par type */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-2">Types de paiement</h3>
          <p className="text-sm text-slate-500 mb-6">Répartition des revenus</p>
          {typeData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={typeData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                    {typeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-6 space-y-2">
                {typeData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-slate-600">{item.name}</span>
                    </div>
                    <span className="font-semibold text-slate-900">{item.value}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-slate-400">
              Aucune donnée disponible
            </div>
          )}
        </div>
      </div>

      {/* Transactions récentes */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Transactions récentes</h3>
            <p className="text-sm text-slate-500 mt-1">Derniers paiements enregistrés</p>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Étudiant</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Type</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Montant</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Statut</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length > 0 ? transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 text-sm font-medium">
                        {tx.student.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-slate-900">{tx.student}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-slate-600">{getPaymentTypeLabel(tx.type)}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm font-semibold text-slate-900">
                      {Number(tx.amount).toLocaleString()} FCFA
                    </span>
                  </td>
                  <td className="py-3 px-4">{getStatusBadge(tx.status)}</td>
                  <td className="py-3 px-4"><span className="text-sm text-slate-500">{tx.date}</span></td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="text-center py-8 text-slate-500">Aucune transaction récente</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}