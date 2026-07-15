'use client';

import { useState, useEffect } from 'react';
import { Users, GraduationCap, BookOpen, TrendingUp, TrendingDown, Bot, Loader2 } from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { dashboardService } from '@/services/dashboardService';
import { toast } from 'react-hot-toast';

// Couleurs pour les graphiques
const CHART_COLORS = ['#FF6B00', '#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#8b5cf6'];

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) setUser(JSON.parse(userStr));
    
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await dashboardService.getStats();
      setStats(data);
    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
      toast.error('Erreur lors du chargement du dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Formatage des nombres
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('fr-FR').format(num);
  };

  // Calcul du pourcentage de croissance
  const getGrowthPercent = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  // Préparer les données pour le PieChart (filières)
  const getFiliereData = () => {
    if (!stats?.students?.by_filiere) return [];
    const total = Object.values(stats.students.by_filiere).reduce((a: number, b: any) => a + b, 0);
    return Object.entries(stats.students.by_filiere).map(([name, value]: any, idx: number) => ({
      name: name.length > 15 ? name.substring(0, 15) + '...' : name,
      fullName: name,
      value: Math.round((value / total) * 100),
      count: value,
      color: CHART_COLORS[idx % CHART_COLORS.length]
    }));
  };

  // Préparer les données pour le LineChart
  const getChartData = () => {
    return stats?.monthly_inscriptions || [];
  };

  // Formater la date relative
  // Remplace la fonction existante par celle-ci
const formatTimeAgo = (dateStr: string | null) => {
  if (!dateStr) return "Récemment";
  
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  
  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 30) return `Il y a ${diffDays}j`;
  return `Il y a ${diffMonths} mois`;
};

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-12 h-12 animate-spin text-[#FF6B00]" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Impossible de charger les données</p>
      </div>
    );
  }

  const filiereData = getFiliereData();
  const chartData = getChartData();

  return (
    <div className="space-y-6 px-2">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
        <p className="text-slate-500 mt-1">
          Bonjour {user?.full_name || 'Administrateur'}, voici un aperçu de votre université.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Étudiants */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">Étudiants</p>
              <p className="text-3xl font-bold text-slate-900">
                {formatNumber(stats.students.total)}
              </p>
              <p className="text-xs mt-2 flex items-center text-green-600">
                <TrendingUp size={12} className="mr-1" />
                +{stats.students.new_this_month} ce mois
                {stats.students.last_month > 0 && (
                  <span className="ml-2 text-slate-400">
                    ({Math.round((stats.students.new_this_month / stats.students.last_month) * 100)}% croissance)
                  </span>
                )}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Users size={20} className="text-blue-600" />
            </div>
          </div>
        </div>

        {/* Enseignants */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">Enseignants</p>
              <p className="text-3xl font-bold text-slate-900">
                {formatNumber(stats.teachers.total)}
              </p>
              <p className="text-xs mt-2 flex items-center text-green-600">
                <TrendingUp size={12} className="mr-1" />
                +{stats.teachers.new_this_month} ce mois
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <GraduationCap size={20} className="text-orange-600" />
            </div>
          </div>
        </div>

        {/* Cours */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">Cours</p>
              <p className="text-3xl font-bold text-slate-900">
                {formatNumber(stats.courses.total)}
              </p>
              <p className="text-xs mt-2 flex items-center text-slate-500">
                <BookOpen size={12} className="mr-1" />
                Matières actives
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <BookOpen size={20} className="text-green-600" />
            </div>
          </div>
        </div>

        {/* Alertes */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">Enseignants sans cours</p>
              <p className="text-3xl font-bold text-slate-900">
                {stats.alerts.teachers_without_courses}
              </p>
              <p className="text-xs mt-2 flex items-center text-orange-600">
                <TrendingDown size={12} className="mr-1" />
                À assigner
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <GraduationCap size={20} className="text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Line Chart - Inscriptions */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-semibold text-slate-900">Inscriptions (6 derniers mois)</h3>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#FF6B00" 
                  strokeWidth={2}
                  dot={{ fill: '#FF6B00', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-slate-400">
              Aucune donnée disponible
            </div>
          )}
        </div>

        {/* Pie Chart - Répartition par filière */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900 mb-6">Répartition par filière</h3>
          {filiereData.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={220}>
                <PieChart>
                  <Pie
                    data={filiereData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    dataKey="value"
                  >
                    {filiereData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {filiereData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-slate-600" title={item.fullName}>{item.name}</span>
                    </div>
                    <span className="font-medium text-slate-900">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-slate-400">
              Aucune filière configurée
            </div>
          )}
        </div>
      </div>

      {/* Activities & AI Assistant */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Activities */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm lg:col-span-2">
          <div className="mb-6">
            <h3 className="text-base font-semibold text-slate-900">Activités récentes</h3>
          </div>
          {stats.recent_activities.length > 0 ? (
            <div className="space-y-4">
              {stats.recent_activities.map((activity: any, idx: number) => (
                <div key={idx} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Users size={18} className="text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{activity.description}</p>
                    <p className="text-xs text-slate-500">{formatTimeAgo(activity.time)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              Aucune activité récente
            </div>
          )}
        </div>

        {/* AI Assistant */}
        <div className="bg-gradient-to-br from-[#0a1628] to-[#1e293b] rounded-xl p-6 text-white">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-[#FF6B00] rounded-lg flex items-center justify-center">
              <Bot size={18} className="text-white" />
            </div>
            <h3 className="text-base font-semibold">Assistant IA</h3>
          </div>
          <p className="text-sm text-slate-300 mb-6">
            Bonjour {user?.full_name?.split(' ')[0] || 'Administrateur'} 👋<br />
            Voici un résumé intelligent de votre université aujourd'hui.
          </p>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-xs text-slate-400">Étudiants</p>
              <p className="text-lg font-bold">{stats.students.total}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-xs text-slate-400">Enseignants</p>
              <p className="text-lg font-bold">{stats.teachers.total}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3 col-span-2">
              <p className="text-xs text-slate-400">Nouveaux ce mois</p>
              <p className="text-lg font-bold">+{stats.students.new_this_month}</p>
            </div>
          </div>
          <button className="w-full bg-white text-[#0a1628] font-semibold py-2 rounded-lg text-sm hover:bg-slate-100 transition-colors">
            Voir plus d'insights
          </button>
        </div>
      </div>
    </div>
  );
}