'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar, Plus, Search, Edit3, Trash2, Eye, X, Save,
  Loader2, AlertTriangle, FileText, CheckCircle2, Clock, Lock, Unlock
} from 'lucide-react';
import { examSessionService, ExamSession } from '@/services/examSessionService';
import { useToast } from '@/components/ToastProvider';
import { getApiErrorMessage } from '@/lib/errorHandler';

interface ExamSessionsManagerProps {
  basePath?: string; // ex: '/secretary/exam-sessions' ou '/censeur/exams/sessions'
  roleTitle?: string;
}

export default function ExamSessionsManager({
  basePath = '/secretary/exam-sessions',
  roleTitle = 'Gestion des Sessions d\'Examens'
}: ExamSessionsManagerProps) {
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
      toast.error('Erreur lors du chargement des sessions');
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
      toast.success('Session mise à jour avec succès');
      setShowEditModal(false);
      setSelectedSession(null);
      resetForm();
      loadSessions();
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, 'Erreur lors de la mise à jour'));
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

  const handleToggleStatus = async (session: ExamSession) => {
    try {
      const updated = await examSessionService.toggleStatus(session.id);
      toast.success(`Statut modifié : ${updated.status === 'open' ? 'Ouverte' : updated.status === 'closed' ? 'Fermée' : 'Brouillon'}`);
      loadSessions();
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, 'Erreur lors du changement de statut'));
    }
  };

  const openEditModal = (session: ExamSession) => {
    setSelectedSession(session);
    setFormData({
      name: session.name,
      session_type: session.session_type,
      start_date: session.start_date.split('T')[0],
      end_date: session.end_date.split('T')[0],
      status: session.status,
      description: session.description || '',
    });
    setShowEditModal(true);
  };

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.name.toLowerCase().includes(search.toLowerCase()) ||
                         session.description?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !filterStatus || session.status === filterStatus;
    const matchesType = !filterType || session.session_type === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getTypeInfo = (type: string) => {
    return sessionTypes.find(t => t.value === type) || { label: type, color: 'bg-slate-100 text-slate-700' };
  };

  const getStatusInfo = (status: string) => {
    return statuses.find(s => s.value === status) || { label: status, icon: FileText, color: 'bg-slate-100 text-slate-700' };
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#FF6B00] to-orange-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-orange-500/20">
              <Calendar size={20} />
            </div>
            {roleTitle}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Planifiez et gérez les périodes d'examens (Semestre 1, Semestre 2, Partiels, Rattrapages).
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#FF6B00] to-orange-500 hover:from-[#e55f00] hover:to-orange-600 text-white rounded-xl text-sm font-semibold shadow-md shadow-orange-500/20 transition-all cursor-pointer"
        >
          <Plus size={16} />
          Nouvelle session
        </button>
      </div>

      {/* Filtres et recherche */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher une session..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:bg-white transition-all"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          >
            <option value="">Tous les types</option>
            {sessionTypes.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          >
            <option value="">Tous les statuts</option>
            {statuses.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grille des sessions */}
      {filteredSessions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <FileText size={48} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-bold text-slate-800 text-base">Aucune session trouvée</h3>
          <p className="text-slate-500 text-xs mt-1">Créez votre première session d'examen pour commencer à planifier.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSessions.map((session) => {
            const typeInfo = getTypeInfo(session.session_type);
            const statusInfo = getStatusInfo(session.status);
            const StatusIcon = statusInfo.icon;

            return (
              <div
                key={session.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${typeInfo.color}`}>
                      {typeInfo.label}
                    </span>
                    <button
                      onClick={() => handleToggleStatus(session)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${statusInfo.color}`}
                      title="Cliquer pour changer le statut"
                    >
                      <StatusIcon size={12} />
                      {statusInfo.label}
                    </button>
                  </div>

                  <h3 className="font-bold text-slate-900 text-base mb-1">{session.name}</h3>
                  {session.description && (
                    <p className="text-slate-500 text-xs line-clamp-2 mb-3">{session.description}</p>
                  )}

                  <div className="space-y-1.5 text-xs text-slate-600 mt-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <Clock size={13} className="text-slate-400" />
                      <span>Du {new Date(session.start_date).toLocaleDateString('fr-FR')} au {new Date(session.end_date).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 mt-5 pt-3 border-t border-slate-100">
                  <Link
                    href={`${basePath}/${session.id}/schedule`}
                    className="flex-1 text-center py-2 px-3 bg-slate-50 hover:bg-orange-50 text-slate-700 hover:text-[#FF6B00] rounded-xl text-xs font-semibold border border-slate-200 hover:border-orange-200 transition-colors"
                  >
                    Planning des épreuves
                  </Link>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(session)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      title="Modifier"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedSession(session);
                        setShowDeleteModal(true);
                      }}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Supprimer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Création */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-lg">Nouvelle session d'examen</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nom de la session *</label>
                <input
                  type="text"
                  placeholder="Ex: Examens Semestre 1 - Session Principale"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Type de session *</label>
                <select
                  value={formData.session_type}
                  onChange={(e) => setFormData({ ...formData, session_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  {sessionTypes.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Date début *</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Date fin *</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Description (Optionnel)</label>
                <textarea
                  rows={2}
                  placeholder="Instructions ou précisions sur cette session..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex-1 py-2.5 bg-[#FF6B00] hover:bg-orange-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Modification */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-lg">Modifier la session</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nom de la session *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Type de session *</label>
                <select
                  value={formData.session_type}
                  onChange={(e) => setFormData({ ...formData, session_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  {sessionTypes.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Date début *</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Date fin *</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Statut</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  {statuses.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleEdit}
                disabled={saving}
                className="flex-1 py-2.5 bg-[#FF6B00] hover:bg-orange-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Suppression */}
      {showDeleteModal && selectedSession && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4 text-center">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Supprimer la session ?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Êtes-vous sûr de vouloir supprimer « {selectedSession.name} » ? Toutes les épreuves et données associées seront définitivement supprimées.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

