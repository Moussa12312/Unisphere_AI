'use client';

import { useState, useEffect } from 'react';
import {
  FileBarChart, Loader2, Calendar, Download,
  TrendingUp, Users, CheckCircle, BookOpen
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

export default function CenseurReportsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/v1/academic/reports');
      setReports(response.data.reports || []);
    } catch (error) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-100 text-green-700';
      case 'closed': return 'bg-slate-100 text-slate-700';
      case 'upcoming': return 'bg-blue-100 text-blue-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return 'En cours';
      case 'closed': return 'Terminée';
      case 'upcoming': return 'À venir';
      default: return status;
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('fr-FR');
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
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <FileBarChart size={24} className="text-white" />
          </div>
          Rapports académiques
        </h1>
        <p className="text-slate-500 mt-1">Rapports par session d'examen</p>
      </div>

      {/* Liste des rapports */}
      <div className="space-y-4">
        {reports.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
            <FileBarChart size={48} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Aucun rapport disponible</p>
            <p className="text-xs text-slate-400 mt-1">
              Les rapports seront générés automatiquement à partir des sessions
            </p>
          </div>
        ) : (
          reports.map((report) => (
            <div key={report.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0 w-full">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center text-white shrink-0">
                    <FileBarChart size={20} className="sm:w-6 sm:h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">{report.session_name}</h3>
                      <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-semibold ${getStatusColor(report.status)}`}>
                        {getStatusLabel(report.status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {formatDate(report.start_date)} → {formatDate(report.end_date)}
                      </span>
                    </div>
                    
                    {/* Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                      <div className="bg-blue-50 rounded-lg p-2.5">
                        <div className="flex items-center gap-1.5">
                          <Users size={13} className="text-blue-600" />
                          <span className="text-[11px] text-slate-600 font-medium">Étudiants</span>
                        </div>
                        <p className="text-base sm:text-xl font-bold text-blue-700 mt-0.5">{report.students_count}</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-2.5">
                        <div className="flex items-center gap-1.5">
                          <BookOpen size={13} className="text-purple-600" />
                          <span className="text-[11px] text-slate-600 font-medium">Cours</span>
                        </div>
                        <p className="text-base sm:text-xl font-bold text-purple-700 mt-0.5">{report.courses_count}</p>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-2.5">
                        <div className="flex items-center gap-1.5">
                          <TrendingUp size={13} className="text-orange-600" />
                          <span className="text-[11px] text-slate-600 font-medium">Moyenne</span>
                        </div>
                        <p className="text-base sm:text-xl font-bold text-orange-700 mt-0.5">{report.average}/20</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-2.5">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle size={13} className="text-green-600" />
                          <span className="text-[11px] text-slate-600 font-medium">Réussite</span>
                        </div>
                        <p className="text-base sm:text-xl font-bold text-green-700 mt-0.5">{report.success_rate}%</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <Link
                    href={`/censeur/exams/sessions/${report.id}`}
                    className="w-full sm:w-auto justify-center px-4 py-2 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <FileBarChart size={14} />
                    Voir détails
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}