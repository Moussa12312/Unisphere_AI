'use client';

import { useState, useEffect } from 'react';
import {
  Calendar, Search, Download, Loader2,
  TrendingUp, Filter, ChevronLeft, ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

export default function GuardAttendanceHistoryPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/v1/attendance/history');
      const data = Array.isArray(response.data) 
        ? response.data 
        : (response.data?.data || []);
      setHistory(data);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter(record => {
    const matchSearch = 
      (record.student_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (record.matricule || '').toLowerCase().includes(search.toLowerCase());
    const matchDate = !filterDate || record.date === filterDate;
    return matchSearch && matchDate;
  });

  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'present':
        return { label: 'Présent', color: 'text-green-700 bg-green-100' };
      case 'late':
        return { label: 'Retard', color: 'text-orange-700 bg-orange-100' };
      case 'absent':
        return { label: 'Absent', color: 'text-red-700 bg-red-100' };
      default:
        return { label: status, color: 'text-slate-700 bg-slate-100' };
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '--:--';
    return new Date(dateStr).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Matricule', 'Nom', 'Statut', 'Heure'];
    const rows = filteredHistory.map(record => [
      record.date,
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
    link.download = `historique_presences.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Export CSV réussi');
  };

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
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Calendar size={24} className="text-white" />
            </div>
            Historique des présences
          </h1>
          <p className="text-slate-500 mt-1">Consultez l'historique complet</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/guard/attendance/today"
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
          >
            Aujourd'hui
          </Link>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp size={20} className="text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-1">Total enregistrements</p>
          <p className="text-2xl font-bold text-slate-900">{history.length}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Calendar size={20} className="text-purple-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-1">Jours enregistrés</p>
          <p className="text-2xl font-bold text-slate-900">
            {new Set(history.map(h => h.date)).size}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Calendar size={20} className="text-green-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-1">Filtrés</p>
          <p className="text-2xl font-bold text-slate-900">{filteredHistory.length}</p>
        </div>
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
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => { setFilterDate(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          />
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {paginatedHistory.length === 0 ? (
          <div className="text-center py-16">
            <Calendar size={48} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Aucun historique trouvé</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Date</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Étudiant</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Matricule</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Statut</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Heure</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedHistory.map((record, idx) => {
                    const statusConfig = getStatusConfig(record.status);
                    return (
                      <tr key={record.id || idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4">
                          <span className="text-sm text-slate-600">
                            {formatDate(record.date)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-[#FF6B00]/10 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-[#FF6B00] font-bold text-xs">
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
                          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-slate-600 font-medium">
                            {formatTime(record.scan_time)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
                <p className="text-sm text-slate-500">
                  Page {currentPage} sur {totalPages} • {filteredHistory.length} enregistrement{filteredHistory.length > 1 ? 's' : ''}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}