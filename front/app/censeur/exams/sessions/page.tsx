'use client';
import { useState, useEffect } from 'react';
import {
  FileText, Plus, Edit3, Trash2, Loader2, Search,
  Calendar
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/hooks/useConfirm';

export default function CenseurExamsSessionsPage() {
  const toast = useToast();
  const { confirm } = useConfirm();
  
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    session_type: 'first_session',
    start_date: '',
    end_date: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/v1/exam-sessions/');
      const data = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      setSessions(data);
    } catch (error) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.start_date || !formData.end_date) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    setSaving(true);
    try {
      await api.post('/api/v1/exam-sessions/', formData);
      toast.success('Session créée avec succès');
      setShowCreateModal(false);
      setFormData({ name: '', session_type: 'first_session', start_date: '', end_date: '' });
      loadSessions();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (session: any) => {
    const ok = await confirm({
      title: 'Supprimer cette session ?',
      message: `Voulez-vous vraiment supprimer la session "${session.name}" ? Toutes les données associées seront perdues.`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
      icon: 'trash'
    });
    
    if (ok) {
      try {
        await api.delete(`/api/v1/exam-sessions/${session.id}`);
        toast.success('Session supprimée');
        loadSessions();
      } catch (error: any) {
        toast.error(error.response?.data?.detail || 'Erreur');
      }
    }
  };

  const filteredSessions = sessions.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-100 text-green-700 border-green-200';
      case 'closed': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'upcoming': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return 'En cours';
      case 'closed': return 'Terminée';
      case 'upcoming': return 'À venir';
      default: return status || 'Non défini';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'first_session': return '1ère session';
      case 'second_session': return '2ème session';
      case 'makeup': return 'Rattrapage';
      default: return type;
    }
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
              <FileText size={24} className="text-white" />
            </div>
            Sessions d'examens
          </h1>
          <p className="text-slate-500 mt-1">Gérez les sessions d'examens de l'université</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#FF6B00] to-orange-500 hover:from-[#e55f00] hover:to-orange-600 text-white rounded-xl text-sm font-medium transition-all shadow-md"
        >
          <Plus size={16} />
          Nouvelle session
        </button>
      </div>

      {/* Recherche */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="🔍 Rechercher une session..."
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
            <FileText size={48} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Aucune session trouvée</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-block mt-4 text-sm text-[#FF6B00] hover:underline"
            >
              Créer la première session →
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredSessions.map(session => (
              <div key={session.id} className="p-5 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center text-white">
                      <Calendar size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900">{session.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(session.status)}`}>
                          {getStatusLabel(session.status)}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                          {getTypeLabel(session.session_type)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500">
                        📅 {session.start_date ? new Date(session.start_date).toLocaleDateString('fr-FR') : '?'}
                        {' → '}
                        {session.end_date ? new Date(session.end_date).toLocaleDateString('fr-FR') : '?'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/censeur/exams/sessions/${session.id}`}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Voir"
                    >
                      <Edit3 size={16} />
                    </Link>
                    <button
                      onClick={() => handleDelete(session)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal création */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">Nouvelle session</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nom *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Session 2025-2026"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Type *</label>
                <select
                  value={formData.session_type}
                  onChange={(e) => setFormData({ ...formData, session_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  <option value="first_session">1ère session</option>
                  <option value="second_session">2ème session</option>
                  <option value="makeup">Rattrapage</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Date début *</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Date fin *</label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#FF6B00] to-orange-500 hover:from-[#e55f00] hover:to-orange-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'Création...' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}