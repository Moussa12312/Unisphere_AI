'use client';

import { useState, useEffect } from 'react';
import {
  Users, CheckCircle, XCircle, Clock, AlertTriangle,
  Search, Download, Loader2, Calendar, TrendingUp,
  UserCheck, UserX, Zap
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

export default function GuardAttendanceTodayPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadTodayAttendance();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadTodayAttendance = async () => {
    setLoading(true);
    try {
      const [attendanceRes, statsRes] = await Promise.all([
        api.get(`/api/v1/attendance/?date=${today}`).catch(() => ({ data: [] })),
        api.get(`/api/v1/attendance/stats?date=${today}`).catch(() => ({ data: null }))
      ]);
      
      const data = Array.isArray(attendanceRes.data) 
        ? attendanceRes.data 
        : (attendanceRes.data?.data || []);
      
      setAttendance(data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const filteredAttendance = attendance.filter(record => {
    const matchSearch = 
      (record.student_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (record.matricule || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || record.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'present':
        return {
          label: 'Présent',
          color: 'text-green-700 bg-green-100 border-green-200',
          icon: CheckCircle,
          iconColor: 'text-green-600'
        };
      case 'late':
        return {
          label: 'En retard',
          color: 'text-orange-700 bg-orange-100 border-orange-200',
          icon: Clock,
          iconColor: 'text-orange-600'
        };
      case 'absent':
        return {
          label: 'Absent',
          color: 'text-red-700 bg-red-100 border-red-200',
          icon: XCircle,
          iconColor: 'text-red-600'
        };
      default:
        return {
          label: status,
          color: 'text-slate-700 bg-slate-100 border-slate-200',
          icon: Clock,
          iconColor: 'text-slate-600'
        };
    }
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '--:--';
    return new Date(dateStr).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportToCSV = () => {
    const headers = ['Matricule', 'Nom', 'Statut', 'Heure scan'];
    const rows = filteredAttendance.map(record => [
      record.matricule,
      record.student_name,
      getStatusConfig(record.status).label,
      formatTime(record.scan_time)
    ]);
    
    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');
    
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `presences_aujourdhui_${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Export CSV réussi');
  };

  const attendanceRate = stats?.total > 0 
    ? Math.round(((stats.present + stats.late) / stats.total) * 100) 
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-[#FF6B00]" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec horloge */}
      <div className="bg-gradient-to-br from-[#0a1628] to-[#1e293b] rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <Calendar size={24} className="text-[#FF6B00]" />
              Présences du jour
            </h1>
            <p className="text-slate-300 mt-1">
              {currentTime.toLocaleDateString('fr-FR', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold font-mono">
              {currentTime.toLocaleTimeString('fr-FR', { 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit' 
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Stats en temps réel */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users size={20} className="text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-1">Total</p>
          <p className="text-2xl font-bold text-slate-900">{stats?.total || 0}</p>
        </div>

        <div className="bg-white rounded-xl border border-green-200 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <UserCheck size={20} className="text-green-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-1">Présents</p>
          <p className="text-2xl font-bold text-green-600">{stats?.present || 0}</p>
        </div>

        <div className="bg-white rounded-xl border border-orange-200 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock size={20} className="text-orange-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-1">Retards</p>
          <p className="text-2xl font-bold text-orange-600">{stats?.late || 0}</p>
        </div>

        <div className="bg-white rounded-xl border border-red-200 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <UserX size={20} className="text-red-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-1">Absents</p>
          <p className="text-2xl font-bold text-red-600">{stats?.absent || 0}</p>
        </div>

        <div className="bg-gradient-to-br from-[#FF6B00] to-orange-500 rounded-xl p-4 text-white hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
          </div>
          <p className="text-xs text-white/80 mb-1">Taux de présence</p>
          <p className="text-2xl font-bold">{attendanceRate}%</p>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Link
            href="/guard/scanner"
            className="flex items-center gap-2 px-4 py-2 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-sm font-medium"
          >
            <Zap size={16} />
            Scanner QR
          </Link>
          <Link
            href="/guard/attendance"
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"
          >
            <Calendar size={16} />
            Toutes les présences
          </Link>
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="🔍 Rechercher par nom ou matricule..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          >
            <option value="">Tous les statuts</option>
            <option value="present">✅ Présents</option>
            <option value="late">⏰ Retards</option>
            <option value="absent">❌ Absents</option>
          </select>
        </div>
      </div>

      {/* Liste */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredAttendance.length === 0 ? (
          <div className="text-center py-16">
            <Users size={48} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Aucune présence aujourd'hui</p>
            <Link
              href="/guard/scanner"
              className="inline-block mt-4 text-sm text-[#FF6B00] hover:underline"
            >
              Commencer à scanner →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredAttendance.map((record, idx) => {
              const statusConfig = getStatusConfig(record.status);
              const StatusIcon = statusConfig.icon;
              return (
                <div key={record.id || idx} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 bg-[#FF6B00]/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-[#FF6B00] font-bold">
                          {record.student_name?.charAt(0) || '?'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 truncate">
                          {record.student_name}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                          <span className="font-mono">{record.matricule}</span>
                          <span>•</span>
                          <span>{record.level}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium text-slate-900">
                          {formatTime(record.scan_time)}
                        </p>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full border ${statusConfig.color}`}>
                        <StatusIcon size={12} className={statusConfig.iconColor} />
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}