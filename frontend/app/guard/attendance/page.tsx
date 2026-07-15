'use client';

import { useState, useEffect } from 'react';
import {
  Users, CheckCircle, XCircle, Clock, AlertTriangle,
  Search, Filter, Calendar, Download, Loader2,
  TrendingUp, UserCheck, UserX, MapPin
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

export default function GuardAttendancePage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterLevel, setFilterLevel] = useState('');

  useEffect(() => {
    loadAttendance();
  }, [filterDate]);

  const loadAttendance = async () => {
    setLoading(true);
    try {
      const [attendanceRes, statsRes] = await Promise.all([
        api.get(`/api/v1/attendance/?date=${filterDate}`).catch(() => ({ data: [] })),
        api.get(`/api/v1/attendance/stats?date=${filterDate}`).catch(() => ({ data: null }))
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
    const matchLevel = !filterLevel || record.level === filterLevel;
    return matchSearch && matchStatus && matchLevel;
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
      case 'excused':
        return {
          label: 'Excusé',
          color: 'text-blue-700 bg-blue-100 border-blue-200',
          icon: AlertTriangle,
          iconColor: 'text-blue-600'
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
    const headers = ['Matricule', 'Nom', 'Niveau', 'Statut', 'Heure scan', 'Salle'];
    const rows = filteredAttendance.map(record => [
      record.matricule,
      record.student_name,
      record.level,
      getStatusConfig(record.status).label,
      formatTime(record.scan_time),
      record.room || '-'
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
    link.download = `presences_${filterDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Export CSV réussi');
  };

  const levels = [...new Set(attendance.map(a => a.level).filter(Boolean))];

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
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30">
              <Users size={24} className="text-white" />
            </div>
            Présences
          </h1>
          <p className="text-slate-500 mt-1">Consultez les présences des étudiants</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/guard/attendance/today"
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
          >
            <Calendar size={16} />
            Aujourd'hui
          </Link>
          <Link
            href="/guard/attendance/history"
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"
          >
            <Clock size={16} />
            Historique
          </Link>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users size={20} className="text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-1">Total étudiants</p>
            <p className="text-2xl font-bold text-slate-900">{stats.total || 0}</p>
          </div>

          <div className="bg-white rounded-xl border border-green-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <UserCheck size={20} className="text-green-600" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-1">Présents</p>
            <p className="text-2xl font-bold text-green-600">{stats.present || 0}</p>
          </div>

          <div className="bg-white rounded-xl border border-orange-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock size={20} className="text-orange-600" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-1">Retards</p>
            <p className="text-2xl font-bold text-orange-600">{stats.late || 0}</p>
          </div>

          <div className="bg-white rounded-xl border border-red-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <UserX size={20} className="text-red-600" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-1">Absents</p>
            <p className="text-2xl font-bold text-red-600">{stats.absent || 0}</p>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
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
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          >
            <option value="">Tous les statuts</option>
            <option value="present">✅ Présents</option>
            <option value="late">⏰ Retards</option>
            <option value="absent">❌ Absents</option>
            <option value="excused">ℹ️ Excusés</option>
          </select>
          <button
            onClick={exportToCSV}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
        {filteredAttendance.length !== attendance.length && (
          <p className="text-xs text-slate-500 mt-3">
            {filteredAttendance.length} résultat{filteredAttendance.length > 1 ? 's' : ''} sur {attendance.length}
          </p>
        )}
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredAttendance.length === 0 ? (
          <div className="text-center py-16">
            <Users size={48} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Aucune présence trouvée</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Étudiant</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Matricule</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Niveau</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Statut</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Heure</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Salle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAttendance.map((record, idx) => {
                  const statusConfig = getStatusConfig(record.status);
                  const StatusIcon = statusConfig.icon;
                  return (
                    <tr key={record.id || idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#FF6B00]/10 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-[#FF6B00] font-bold text-sm">
                              {record.student_name?.charAt(0) || '?'}
                            </span>
                          </div>
                          <p className="font-semibold text-slate-900 text-sm">
                            {record.student_name}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs text-slate-600">{record.matricule}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded">
                          {record.level}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${statusConfig.color}`}>
                          <StatusIcon size={12} className={statusConfig.iconColor} />
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-slate-600 font-medium">
                          {formatTime(record.scan_time)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {record.room ? (
                          <div className="flex items-center gap-1 text-sm text-slate-600">
                            <MapPin size={12} className="text-green-600" />
                            {record.room}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}