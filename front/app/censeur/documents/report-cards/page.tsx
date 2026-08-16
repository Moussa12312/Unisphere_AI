'use client';

import { useState, useEffect } from 'react';
import {
  FileCheck, Loader2, Search, Download, Eye,
  Calendar, Users, GraduationCap, Filter
} from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

export default function CenseurReportCardsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [sessions, setSessions] = useState<any[]>([]);
  const [filterSession, setFilterSession] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [docsRes, sessionsRes] = await Promise.all([
        api.get('/api/v1/documents/my-documents').catch(() => ({ data: [] })),
        api.get('/api/v1/exam-sessions/').catch(() => ({ data: [] }))
      ]);
      
      const allDocs = Array.isArray(docsRes.data) ? docsRes.data : (docsRes.data?.data || []);
      const bulletins = allDocs.filter((d: any) => 
        d.document_type === 'report_card' || d.document_type === 'transcript'
      );
      
      setDocuments(bulletins);
      
      const allSessions = Array.isArray(sessionsRes.data) ? sessionsRes.data : (sessionsRes.data?.data || []);
      setSessions(allSessions);
    } catch (error) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (docId: number, title: string) => {
    try {
      const response = await api.get(`/api/v1/documents/${docId}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Document téléchargé');
    } catch (error) {
      toast.error('Erreur de téléchargement');
    }
  };

  const handleView = async (docId: number) => {
    try {
      const response = await api.get(`/api/v1/documents/${docId}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
    } catch (error) {
      toast.error('Erreur d\'ouverture');
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchSearch = doc.title.toLowerCase().includes(search.toLowerCase());
    const matchSession = !filterSession || doc.session_id?.toString() === filterSession;
    return matchSearch && matchSession;
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
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
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <FileCheck size={24} className="text-white" />
          </div>
          Bulletins validés
        </h1>
        <p className="text-slate-500 mt-1">Consultez et téléchargez les bulletins validés</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <FileCheck size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total bulletins</p>
              <p className="text-2xl font-bold text-slate-900">{documents.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Étudiants</p>
              <p className="text-2xl font-bold text-slate-900">
                {new Set(documents.map(d => d.student_id)).size}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Calendar size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Sessions</p>
              <p className="text-2xl font-bold text-slate-900">{sessions.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Download size={20} className="text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Téléchargés</p>
              <p className="text-2xl font-bold text-slate-900">
                {documents.reduce((sum, d) => sum + (d.download_count || 0), 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="🔍 Rechercher un bulletin..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>
          <select
            value={filterSession}
            onChange={(e) => setFilterSession(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          >
            <option value="">Toutes les sessions</option>
            {sessions.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Liste */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredDocuments.length === 0 ? (
          <div className="p-16 text-center">
            <FileCheck size={48} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Aucun bulletin validé</p>
            <p className="text-xs text-slate-400 mt-1">
              Les bulletins générés apparaîtront ici
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredDocuments.map((doc) => (
              <div key={doc.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl flex items-center justify-center text-white">
                      <GraduationCap size={20} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">{doc.title}</h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={10} />
                          {formatDate(doc.created_at)}
                        </span>
                        {doc.download_count > 0 && (
                          <span className="flex items-center gap-1">
                            <Download size={10} />
                            {doc.download_count} téléchargement{doc.download_count > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      {doc.description && (
                        <p className="text-xs text-slate-400 mt-1">{doc.description}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleView(doc.id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Voir"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => handleDownload(doc.id, doc.title)}
                      className="p-2 text-[#FF6B00] hover:bg-orange-50 rounded-lg transition-colors"
                      title="Télécharger"
                    >
                      <Download size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}