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
      <div className="bg-gradient-to-br from-[#0a1628] to-[#1e293b] rounded-2xl p-4 sm:p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2.5">
              <Calendar size={22} className="text-[#FF6B00]" />
              Présences du jour
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 capitalize">
              {currentTime.toLocaleDateString('fr-FR', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}
            </p>
          </div>
          <div className="sm:text-right bg-white/10 sm:bg-transparent rounded-xl p-2.5 sm:p-0 flex items-center justify-between sm:block">
            <span className="text-xs text-slate-300 sm:hidden">Heure locale :</span>
            <p className="text-2xl sm:text-3xl font-bold font-mono text-[#FF6B00] sm:text-white">
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2.5 mb-2 sm:mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users size={18} className="text-blue-600" />
            </div>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 mb-0.5">Total</p>
          <p className="text-xl sm:text-2xl font-bold text-slate-900">{stats?.total || 0}</p>
        </div>

        <div className="bg-white rounded-xl border border-green-200 p-3 sm:p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2.5 mb-2 sm:mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <UserCheck size={18} className="text-green-600" />
            </div>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 mb-0.5">Présents</p>
          <p className="text-xl sm:text-2xl font-bold text-green-600">{stats?.present || 0}</p>
        </div>

        <div className="bg-white rounded-xl border border-orange-200 p-3 sm:p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2.5 mb-2 sm:mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock size={18} className="text-orange-600" />
            </div>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 mb-0.5">Retards</p>
          <p className="text-xl sm:text-2xl font-bold text-orange-600">{stats?.late || 0}</p>
        </div>

        <div className="bg-white rounded-xl border border-red-200 p-3 sm:p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2.5 mb-2 sm:mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <UserX size={18} className="text-red-600" />
            </div>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 mb-0.5">Absents</p>
          <p className="text-xl sm:text-2xl font-bold text-red-600">{stats?.absent || 0}</p>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-gradient-to-br from-[#FF6B00] to-orange-500 rounded-xl p-3 sm:p-4 text-white hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2.5 mb-2 sm:mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
          </div>
          <p className="text-[11px] sm:text-xs text-white/80 mb-0.5">Taux de présence</p>
          <p className="text-xl sm:text-2xl font-bold">{attendanceRate}%</p>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
          <Link
            href="/guard/scanner"
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-sm font-semibold shadow-sm shadow-[#FF6B00]/30 transition-all active:scale-95"
          >
            <Zap size={16} />
            Scanner QR
          </Link>
          <Link
            href="/guard/attendance"
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-all"
          >
            <Calendar size={16} />
            Historique
          </Link>
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-medium shadow-sm transition-all"
        >
          <Download size={16} />
          Exporter CSV
        </button>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par nom ou matricule..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
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
          <div className="text-center py-12 px-4">
            <Users size={40} className="text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 font-medium">Aucune présence aujourd'hui</p>
            <Link
              href="/guard/scanner"
              className="inline-block mt-3 text-sm text-[#FF6B00] font-semibold hover:underline"
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
                <div key={record.id || idx} className="p-3.5 sm:p-4 hover:bg-slate-50/80 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 bg-[#FF6B00]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-[#FF6B00] font-bold text-sm sm:text-base">
                          {record.student_name?.charAt(0) || '?'}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 text-sm sm:text-base truncate">
                          {record.student_name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 flex-wrap">
                          <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">{record.matricule}</span>
                          {record.level && (
                            <>
                              <span>•</span>
                              <span>{record.level}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Clock size={13} className="text-slate-400" />
                        <span className="text-xs sm:text-sm font-semibold font-mono">
                          {formatTime(record.scan_time)}
                        </span>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full border ${statusConfig.color}`}>
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