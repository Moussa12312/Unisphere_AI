'use client';

import { useState, useEffect } from 'react';
import {
  Calendar, Plus, Search, Edit3, Trash2, Eye, X, Save,
  Loader2, AlertTriangle, FileText, CheckCircle2, Clock, Lock
} from 'lucide-react';
import { examSessionService, ExamSession } from '@/services/examSessionService';
import { useToast } from '@/components/ToastProvider';
import { getApiErrorMessage } from '@/lib/errorHandler';

export default function SecretaryExamSessionsPage() {
  const toast = useToast();
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  const [selectedSession, setSelectedSession] = useState<ExamSession | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    session_type: 'semester1',
    start_date: '',
    end_date: '',
    status: 'draft',
    description: '',
  });

  const [saving, setSaving] = useState(false);

  const sessionTypes = [
    { value: 'semester1', label: 'Semestre 1', color: 'bg-blue-100 text-blue-700' },
    { value: 'semester2', label: 'Semestre 2', color: 'bg-purple-100 text-purple-700' },
    { value: 'partial', label: 'Partiel', color: 'bg-orange-100 text-orange-700' },
    { value: 'makeup', label: 'Rattrapage', color: 'bg-red-100 text-red-700' },
    { value: 'final', label: 'Examen final', color: 'bg-green-100 text-green-700' },
  ];

  const statuses = [
    { value: 'draft', label: 'Brouillon', icon: FileText, color: 'bg-slate-100 text-slate-700' },
    { value: 'open', label: 'Ouverte', icon: CheckCircle2, color: 'bg-green-100 text-green-700' },
    { value: 'closed', label: 'Fermée', icon: Lock, color: 'bg-red-100 text-red-700' },
  ];

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const data = await examSessionService.getAll();
      setSessions(data);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      session_type: 'semester1',
      start_date: '',
      end_date: '',
      status: 'draft',
      description: '',
    });
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.start_date || !formData.end_date) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setSaving(true);
    try {
      await examSessionService.create(formData);
      toast.success('Session créée avec succès');
      setShowCreateModal(false);
      resetForm();
      loadSessions();
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, 'Erreur lors de la création'));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedSession) return;

    setSaving(true);
    try {
      await examSessionService.update(selectedSession.id, formData);
      toast.success('Session modifiée avec succès');
      setShowEditModal(false);
      resetForm();
      loadSessions();
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, 'Erreur lors de la modification'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSession) return;

    setSaving(true);
    try {
      await examSessionService.delete(selectedSession.id);
      toast.success('Session supprimée avec succès');
      setShowDeleteModal(false);
      setSelectedSession(null);
      loadSessions();
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, 'Erreur lors de la suppression'));
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (session: ExamSession) => {
    setSelectedSession(session);
    setFormData({
      name: session.name,
      session_type: session.session_type,
      start_date: session.start_date,
      end_date: session.end_date,
      status: session.status,
      description: session.description || '',
    });
    setShowEditModal(true);
  };

  const filteredSessions = sessions.filter(session => {
    const matchSearch = session.name.toLowerCase().includes(search.toLowerCase()) ||
                        (session.description || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || session.status === filterStatus;
    const matchType = !filterType || session.session_type === filterType;
    return matchSearch && matchStatus && matchType;
  });

  const stats = {
    total: sessions.length,
    open: sessions.filter(s => s.status === 'open').length,
    closed: sessions.filter(s => s.status === 'closed').length,
    draft: sessions.filter(s => s.status === 'draft').length,
  };

  const getTypeLabel = (type: string) => sessionTypes.find(t => t.value === type)?.label || type;
  const getTypeColor = (type: string) => sessionTypes.find(t => t.value === type)?.color || 'bg-slate-100 text-slate-700';
  const getStatusConfig = (status: string) => statuses.find(s => s.value === status) || statuses[0];

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B00] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Sessions d'examens</h1>
          <p className="text-slate-500 mt-1">Gérez les périodes d'évaluation</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-sm font-medium transition-all shadow-md"
        >
          <Plus size={16} />
          Nouvelle session
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Ouvertes</p>
              <p className="text-2xl font-bold text-slate-900">{stats.open}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Lock size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Fermées</p>
              <p className="text-2xl font-bold text-slate-900">{stats.closed}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <FileText size={20} className="text-slate-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Brouillons</p>
              <p className="text-2xl font-bold text-slate-900">{stats.draft}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="🔍 Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          >
            <option value="">Tous les types</option>
            {sessionTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          >
            <option value="">Tous les statuts</option>
            {statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {/* Liste */}
      <div className="space-y-3">
        {filteredSessions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
            <Calendar size={48} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Aucune session trouvée</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-block mt-4 text-sm text-[#FF6B00] hover:underline"
            >
              Créer la première session →
            </button>
          </div>
        ) : (
          filteredSessions.map((session) => {
            const statusConfig = getStatusConfig(session.status);
            const StatusIcon = statusConfig.icon;
            
            return (
              <div key={session.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className={`text-xs px-2 py-1 rounded ${getTypeColor(session.session_type)}`}>
                        {getTypeLabel(session.session_type)}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${statusConfig.color} flex items-center gap-1`}>
                        <StatusIcon size={12} />
                        {statusConfig.label}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">{session.name}</h3>
                    {session.description && (
                      <p className="text-sm text-slate-600 mb-2">{session.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        Du {formatDate(session.start_date)} au {formatDate(session.end_date)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setSelectedSession(session); setShowDetailModal(true); }}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Voir"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => openEditModal(session)}
                      className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                      title="Modifier"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => { setSelectedSession(session); setShowDeleteModal(true); }}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL CRÉATION */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">Nouvelle session</h2>
              <button onClick={() => { setShowCreateModal(false); resetForm(); }} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nom de la session *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Semestre 1 - 2025/2026"
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
                  {sessionTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
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

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Statut</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  {statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description optionnelle..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Création...' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MODIFICATION */}
      {showEditModal && selectedSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">Modifier la session</h2>
              <button onClick={() => { setShowEditModal(false); resetForm(); }} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nom *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                  {sessionTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
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

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Statut</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  {statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => { setShowEditModal(false); resetForm(); }}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleEdit}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SUPPRESSION */}
      {showDeleteModal && selectedSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="text-red-600" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Supprimer cette session ?</h3>
                <p className="text-sm text-slate-500">Cette action est irréversible</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-6">
              Voulez-vous vraiment supprimer la session <strong>{selectedSession.name}</strong> ?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setSelectedSession(null); }}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DÉTAIL */}
      {showDetailModal && selectedSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">Détails de la session</h2>
              <button onClick={() => setShowDetailModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">Nom</p>
                <p className="text-lg font-semibold text-slate-900">{selectedSession.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Type</p>
                  <span className={`text-xs px-2 py-1 rounded ${getTypeColor(selectedSession.session_type)}`}>
                    {getTypeLabel(selectedSession.session_type)}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Statut</p>
                  <span className={`text-xs px-2 py-1 rounded ${getStatusConfig(selectedSession.status).color}`}>
                    {getStatusConfig(selectedSession.status).label}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Date début</p>
                  <p className="text-sm font-semibold text-slate-900">{formatDate(selectedSession.start_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Date fin</p>
                  <p className="text-sm font-semibold text-slate-900">{formatDate(selectedSession.end_date)}</p>
                </div>
              </div>

              {selectedSession.description && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Description</p>
                  <p className="text-sm text-slate-700">{selectedSession.description}</p>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowDetailModal(false)}
              className="w-full mt-5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}