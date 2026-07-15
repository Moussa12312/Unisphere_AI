'use client';

import { useState, useEffect } from 'react';
import { 
  TrendingUp, Users, Award, 
  DollarSign, Activity, Target,
  Download, ArrowUpRight, ArrowDownRight,
  AlertCircle, RefreshCw, Wifi, WifiOff
} from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer
} from 'recharts';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function StatisticsPage() {
  const [period, setPeriod] = useState('year');
  const [loading, setLoading] = useState(true);
  const [backendError, setBackendError] = useState<string | null>(null);
  
  const [overview, setOverview] = useState<any>(null);
  const [inscriptions, setInscriptions] = useState<any[]>([]);
  const [filieres, setFilieres] = useState<any[]>([]);
  const [performance, setPerformance] = useState<any[]>([]);
  const [revenus, setRevenus] = useState<any[]>([]);
  const [assiduite, setAssiduite] = useState<any[]>([]);

  useEffect(() => {
    loadAllStats();
  }, [period]);

  const loadAllStats = async () => {
    setLoading(true);
    setBackendError(null);
    
    try {
      // ✅ Test de connexion au backend
      const healthCheck = await api.get('/health').catch(() => null);
      if (!healthCheck) {
        setBackendError('Backend inaccessible. Vérifiez que le serveur tourne sur http://localhost:8000');
        setLoading(false);
        return;
      }

      // ✅ Charger toutes les stats en parallèle
      const [overviewRes, inscriptionsRes, filieresRes, performanceRes, revenusRes, assiduiteRes] = await Promise.all([
        api.get(`/api/v1/statistics/overview?period=${period}`).catch(e => {
          console.error('❌ Overview error:', e.response?.data || e.message);
          return null;
        }),
        api.get('/api/v1/statistics/inscriptions/monthly').catch(() => null),
        api.get('/api/v1/statistics/filieres/distribution').catch(() => null),
        api.get('/api/v1/statistics/performance/by-level').catch(() => null),
        api.get('/api/v1/statistics/revenue/monthly').catch(() => null),
        api.get('/api/v1/statistics/attendance/monthly').catch(() => null),
      ]);

      // ✅ Traiter les résultats
      if (overviewRes) {
        setOverview(overviewRes.data);
        console.log('✅ Overview:', overviewRes.data);
      } else {
        setBackendError('Impossible de charger les statistiques. Vérifiez les logs du backend.');
      }

      setInscriptions(Array.isArray(inscriptionsRes?.data) ? inscriptionsRes.data : []);
      setFilieres(Array.isArray(filieresRes?.data) ? filieresRes.data : []);
      setPerformance(Array.isArray(performanceRes?.data) ? performanceRes.data : []);
      setRevenus(Array.isArray(revenusRes?.data) ? revenusRes.data : []);
      setAssiduite(Array.isArray(assiduiteRes?.data) ? assiduiteRes.data : []);
      
    } catch (error: any) {
      console.error('❌ Erreur générale:', error);
      
      if (error.code === 'ERR_NETWORK') {
        setBackendError('Backend inaccessible. Vérifiez que le serveur tourne sur http://localhost:8000');
      } else if (error.response?.status === 401) {
        setBackendError('Session expirée. Veuillez vous reconnecter.');
      } else {
        setBackendError(error.response?.data?.detail || 'Erreur lors du chargement');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatFCFA = (value: number) => {
    if (!value) return '0 FCFA';
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M FCFA`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K FCFA`;
    return `${value.toLocaleString()} FCFA`;
  };

  // ✅ KPIs avec valeurs par défaut
  const kpis = [
    { 
      label: 'Taux de réussite', 
      value: overview ? `${overview.success_rate || 0}%` : '0%', 
      change: '+4.2%', 
      trend: 'up' as const,
      icon: Award,
      bgColor: 'bg-gradient-to-br from-orange-400 to-red-500'
    },
    { 
      label: 'Étudiants actifs', 
      value: overview ? (overview.total_students || 0).toString() : '0', 
      change: '+12', 
      trend: 'up' as const,
      icon: Users,
      bgColor: 'bg-gradient-to-br from-blue-500 to-indigo-600'
    },
    { 
      label: 'Revenus', 
      value: overview ? formatFCFA(overview.total_revenue || 0) : '0 FCFA', 
      change: '+8.5%', 
      trend: 'up' as const,
      icon: DollarSign,
      bgColor: 'bg-gradient-to-br from-yellow-500 to-emerald-500'
    },
    { 
      label: 'Taux d\'assiduité', 
      value: overview ? `${overview.attendance_rate || 0}%` : '0%', 
      change: '-2.1%', 
      trend: 'down' as const,
      icon: Activity,
      bgColor: 'bg-gradient-to-br from-red-500 to-pink-600'
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B00] border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-500">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  // ✅ Message d'erreur si backend inaccessible
  if (backendError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="bg-white rounded-2xl border border-red-200 p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <WifiOff size={32} className="text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Backend inaccessible</h2>
          <p className="text-slate-600 mb-4">{backendError}</p>
          <div className="bg-slate-50 rounded-lg p-3 mb-4 text-left">
            <p className="text-xs font-mono text-slate-600">
              <strong>Vérifications :</strong><br/>
              1. Le backend tourne-t-il ?<br/>
              2. Port 8000 accessible ?<br/>
              3. Token JWT valide ?
            </p>
          </div>
          <button
            onClick={loadAllStats}
            className="flex items-center gap-2 px-4 py-2 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-sm font-medium mx-auto"
          >
            <RefreshCw size={16} />
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const maxInscription = Math.max(...inscriptions.map(i => i.inscriptions || 0), 1);
  const maxRevenue = Math.max(...revenus.map(r => r.revenus || 0), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tableau de bord</h1>
          <p className="text-slate-500 mt-1">Analyse des performances de votre université</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            {['month', 'quarter', 'year'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  period === p 
                    ? 'bg-[#FF6B00] text-white shadow-md' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {p === 'month' ? 'Ce mois' : p === 'quarter' ? 'Ce trimestre' : 'Cette année'}
              </button>
            ))}
          </div>
          
          <button 
            onClick={loadAllStats}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-xl transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 ${kpi.bgColor} rounded-xl flex items-center justify-center shadow-lg`}>
                <kpi.icon className="text-white" size={24} />
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                kpi.trend === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {kpi.trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {kpi.change}
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900 mb-1">{kpi.value}</p>
            <p className="text-sm text-slate-500">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Inscriptions */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Évolution des inscriptions</h3>
              <p className="text-sm text-slate-500 mt-1">6 derniers mois</p>
            </div>
          </div>
          {inscriptions.length === 0 ? (
            <div className="h-[350px] flex items-center justify-center text-slate-400">
              Aucune donnée disponible
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={inscriptions}>
                <defs>
                  <linearGradient id="colorInscriptions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF6B00" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#FF6B00" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="inscriptions" 
                  stroke="#FF6B00" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorInscriptions)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Répartition par filière */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-2">Répartition par filière</h3>
          <p className="text-sm text-slate-500 mb-6">Distribution des étudiants</p>
          {filieres.length === 0 ? (
            <div className="h-[250px] flex items-center justify-center text-slate-400">
              Aucune donnée
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={filieres}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {filieres.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-6 space-y-2">
                {filieres.map((filiere, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: filiere.color }}></div>
                      <span className="text-slate-600">{filiere.name}</span>
                    </div>
                    <span className="font-semibold text-slate-900">{filiere.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Performance et Revenus */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance par niveau */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Performance par niveau</h3>
              <p className="text-sm text-slate-500 mt-1">Moyenne des notes</p>
            </div>
            <Target className="text-[#FF6B00]" size={24} />
          </div>
          {performance.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-slate-400">
              Aucune donnée
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={true} vertical={false} />
                <XAxis type="number" domain={[0, 20]} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} width={80} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
                  }} 
                />
                <Bar dataKey="taux" fill="#FF6B00" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Revenus mensuels */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Revenus mensuels</h3>
              <p className="text-sm text-slate-500 mt-1">Évolution des paiements</p>
            </div>
            <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full text-sm font-semibold">
              <TrendingUp size={16} />
              En cours
            </div>
          </div>
          {revenus.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-slate-400">
              Aucun revenu enregistré
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenus}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                  }} 
                  formatter={(value: any) => [`${Number(value).toLocaleString()} FCFA`, 'Revenus']}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenus" 
                  stroke="#10B981" 
                  strokeWidth={3}
                  dot={{ fill: '#10B981', r: 5, strokeWidth: 2, stroke: '#fff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Assiduité */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Taux d'assiduité</h3>
            <p className="text-sm text-slate-500 mt-1">Présents vs Absents</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-slate-600">Présents</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-slate-600">Absents</span>
            </div>
          </div>
        </div>
        {assiduite.length === 0 ? (
          <div className="h-[350px] flex items-center justify-center text-slate-400">
            Aucune donnée d'assiduité
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={assiduite}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} unit="%" domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
                }}
                formatter={(value: any, name: any) => [
                  `${value}%`,
                  name === 'presents' ? 'Présents' : 'Absents'
                ]}
              />
              <Line 
                type="monotone" 
                dataKey="presents" 
                stroke="#10B981" 
                strokeWidth={3}
                name="Présents"
                dot={{ fill: '#10B981', r: 5, strokeWidth: 2, stroke: '#fff' }}
              />
              <Line 
                type="monotone" 
                dataKey="absents" 
                stroke="#EF4444" 
                strokeWidth={3}
                name="Absents"
                dot={{ fill: '#EF4444', r: 5, strokeWidth: 2, stroke: '#fff' }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}