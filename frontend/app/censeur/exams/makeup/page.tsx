'use client';

import { useState, useEffect } from 'react';
import {
  RotateCcw, Loader2, Search, Calendar, Users,
  CheckCircle, AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

export default function CenseurMakeupExamsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadMakeupSessions();
  }, []);

  const loadMakeupSessions = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/v1/exam-sessions/');
      const data = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      const makeup = data.filter((s: any) => s.session_type === 'makeup');
      setSessions(makeup);
    } catch (error) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const filteredSessions = sessions.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase())
  );

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
          <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
            <RotateCcw size={24} className="text-white" />
          </div>
          Examens de rattrapage
        </h1>
        <p className="text-slate-500 mt-1">Sessions de rattrapage pour les étudiants en difficulté</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <RotateCcw size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total rattrapages</p>
              <p className="text-2xl font-bold text-slate-900">{sessions.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-green-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">En cours</p>
              <p className="text-2xl font-bold text-green-700">
                {sessions.filter(s => s.status === 'open').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <Calendar size={20} className="text-slate-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Terminés</p>
              <p className="text-2xl font-bold text-slate-700">
                {sessions.filter(s => s.status === 'closed').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recherche */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="🔍 Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          />
        </div>
      </div>

      {/* Liste */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredSessions.length === 0 ? (
          <div className="p-16 text-center">
            <RotateCcw size={48} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Aucune session de rattrapage</p>
            <p className="text-xs text-slate-400 mt-1">
              Les sessions de rattrapage apparaîtront ici
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredSessions.map(session => (
              <div key={session.id} className="p-5 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center text-white">
                      <RotateCcw size={20} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">{session.name}</h3>
                      <p className="text-sm text-slate-500 mt-1">
                        📅 {session.start_date ? new Date(session.start_date).toLocaleDateString('fr-FR') : '?'} 
                        {' → '}
                        {session.end_date ? new Date(session.end_date).toLocaleDateString('fr-FR') : '?'}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    session.status === 'open' ? 'bg-green-100 text-green-700' :
                    session.status === 'closed' ? 'bg-slate-100 text-slate-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {session.status === 'open' ? 'En cours' :
                     session.status === 'closed' ? 'Terminée' : 'À venir'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}