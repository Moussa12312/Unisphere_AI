'use client';

import { useState, useEffect } from 'react';
import {
  Megaphone, Plus, Edit3, Trash2, Search, Calendar,
  Users, Eye, Send, Loader2, X, AlertCircle, CheckCircle,
  Bell, FileText, Filter
} from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

interface Announcement {
  id: number;
  title: string;
  content: string;
  target_roles: string[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_active: boolean;
  created_at: string;
  expires_at?: string;
  author_name?: string;
  read_count?: number;
}

const ROLE_OPTIONS = [
  { value: 'student', label: 'Étudiants', color: 'bg-blue-100 text-blue-700' },
  { value: 'teacher', label: 'Enseignants', color: 'bg-purple-100 text-purple-700' },
  { value: 'admin', label: 'Administrateurs', color: 'bg-red-100 text-red-700' },
  { value: 'secretary', label: 'Secrétaires', color: 'bg-green-100 text-green-700' },
  { value: 'censeur', label: 'Censeurs', color: 'bg-orange-100 text-orange-700' },
  { value: 'accountant', label: 'Comptables', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'guard', label: 'Gardiens', color: 'bg-slate-100 text-slate-700' },
  { value: 'alumni', label: 'Alumni', color: 'bg-pink-100 text-pink-700' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Basse', color: 'bg-slate-100 text-slate-700', icon: '📋' },
  { value: 'normal', label: 'Normale', color: 'bg-blue-100 text-blue-700', icon: '📢' },
  { value: 'high', label: 'Haute', color: 'bg-orange-100 text-orange-700', icon: '⚠️' },
  { value: 'urgent', label: 'Urgente', color: 'bg-red-100 text-red-700', icon: '🚨' },
];

export default function AnnouncementsPage() {
  const toast = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewAnnouncement, setViewAnnouncement] = useState<Announcement | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    target_roles: [] as string[],
    priority: 'normal',
    expires_at: '',
  });

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/v1/announcements/');
      setAnnouncements(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de chargement des annonces');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingAnnouncement(null);
    setFormData({
      title: '',
      content: '',
      target_roles: [],
      priority: 'normal',
      expires_at: '',
    });
    setShowModal(true);
  };

  const openEditModal = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      target_roles: announcement.target_roles || [],
      priority: announcement.priority || 'normal',
      expires_at: announcement.expires_at ? announcement.expires_at.split('T')[0] : '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Titre et contenu obligatoires');
      return;
    }
    if (formData.target_roles.length === 0) {
      toast.error('Sélectionnez au moins un destinataire');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        expires_at: formData.expires_at || null,
      };

      if (editingAnnouncement) {
        await api.put(`/api/v1/announcements/${editingAnnouncement.id}`, payload);
        toast.success('Annonce modifiée avec succès');
      } else {
        await api.post('/api/v1/announcements/', payload);
        toast.success('Annonce publiée avec succès');
      }

      setShowModal(false);
      loadAnnouncements();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer cette annonce ?')) return;
    try {
      await api.delete(`/api/v1/announcements/${id}`);
      toast.success('Annonce supprimée');
      loadAnnouncements();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur de suppression');
    }
  };

  const toggleRole = (role: string) => {
    setFormData(prev => ({
      ...prev,
      target_roles: prev.target_roles.includes(role)
        ? prev.target_roles.filter(r => r !== role)
        : [...prev.target_roles, role]
    }));
  };

  const selectAllRoles = () => {
    setFormData(prev => ({
      ...prev,
      target_roles: ROLE_OPTIONS.map(r => r.value)
    }));
  };

  const filteredAnnouncements = announcements.filter(a => {
    const matchSearch = !search || 
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.content.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'all' || 
      (a.target_roles && a.target_roles.includes(filterRole));
    return matchSearch && matchRole;
  });

  const getPriorityInfo = (priority: string) => {
    return PRIORITY_OPTIONS.find(p => p.value === priority) || PRIORITY_OPTIONS[1];
  };

  const getRoleInfo = (role: string) => {
    return ROLE_OPTIONS.find(r => r.value === role);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 size={32} className="animate-spin text-[#FF6B00]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">

      {/* Stats rapides */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FF6B00]/10 rounded-lg flex items-center justify-center">
              <Megaphone size={20} className="text-[#FF6B00]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{announcements.length}</p>
              <p className="text-xs text-slate-500">Total</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {announcements.filter(a => a.priority === 'urgent').length}
              </p>
              <p className="text-xs text-slate-500">Urgentes</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {announcements.filter(a => a.is_active !== false).length}
              </p>
              <p className="text-xs text-slate-500">Actives</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {ROLE_OPTIONS.length}
              </p>
              <p className="text-xs text-slate-500">Rôles cibles</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher une annonce..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>
          <div>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg font-medium shadow-md shadow-orange-500/20 transition-colors"
            >
              <Plus size={18} />
              Nouvelle annonce
            </button>
          </div>
          <div className="relative">
            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="pl-10 pr-8 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-white"
            >
              <option value="all">Tous les rôles</option>
              {ROLE_OPTIONS.map(role => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Liste des annonces */}
      {filteredAnnouncements.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Megaphone size={48} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Aucune annonce</p>
          <p className="text-slate-400 text-sm mt-1">
            {search || filterRole !== 'all' 
              ? 'Aucun résultat pour ces filtres' 
              : 'Créez votre première annonce'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAnnouncements.map((announcement) => {
            const priorityInfo = getPriorityInfo(announcement.priority);
            return (
              <div
                key={announcement.id}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-all group"
              >
                <div className="flex items-start gap-4">
                  {/* Icône priorité */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${priorityInfo.color}`}>
                    {priorityInfo.icon}
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-bold text-slate-900 text-lg">
                        {announcement.title}
                      </h3>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${priorityInfo.color}`}>
                        {priorityInfo.label}
                      </span>
                    </div>

                    <p className="text-slate-600 text-sm line-clamp-2 mb-3">
                      {announcement.content}
                    </p>

                    {/* Rôles cibles */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {announcement.target_roles?.map(role => {
                        const roleInfo = getRoleInfo(role);
                        return roleInfo ? (
                          <span 
                            key={role} 
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleInfo.color}`}
                          >
                            {roleInfo.label}
                          </span>
                        ) : null;
                      })}
                    </div>

                    {/* Métadonnées */}
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {formatDate(announcement.created_at)}
                      </span>
                      {announcement.author_name && (
                        <span className="flex items-center gap-1">
                          <Users size={12} />
                          {announcement.author_name}
                        </span>
                      )}
                      {announcement.read_count !== undefined && (
                        <span className="flex items-center gap-1">
                          <Eye size={12} />
                          {announcement.read_count} vue(s)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setViewAnnouncement(announcement)}
                      className="p-2 hover:bg-blue-50 rounded-lg text-blue-600"
                      title="Voir"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => openEditModal(announcement)}
                      className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
                      title="Modifier"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(announcement.id)}
                      className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                      title="Supprimer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Création/Édition */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Megaphone size={22} className="text-[#FF6B00]" />
                {editingAnnouncement ? 'Modifier l\'annonce' : 'Nouvelle annonce'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Titre */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Titre *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Report des examens du semestre"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>

              {/* Contenu */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Contenu *
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={6}
                  placeholder="Rédigez le contenu de votre annonce..."
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00] resize-none"
                />
              </div>

              {/* Priorité */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Priorité
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {PRIORITY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, priority: opt.value })}
                      className={`p-3 rounded-lg border-2 transition-all text-center ${
                        formData.priority === opt.value
                          ? 'border-[#FF6B00] bg-orange-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-2xl mb-1">{opt.icon}</div>
                      <div className="text-xs font-medium">{opt.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Destinataires */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Destinataires *
                  </label>
                  <button
                    type="button"
                    onClick={selectAllRoles}
                    className="text-xs text-[#FF6B00] hover:underline"
                  >
                    Sélectionner tous
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {ROLE_OPTIONS.map(role => (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => toggleRole(role.value)}
                      className={`p-2.5 rounded-lg border-2 transition-all text-sm font-medium ${
                        formData.target_roles.includes(role.value)
                          ? 'border-[#FF6B00] bg-orange-50 text-[#FF6B00]'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {role.label}
                    </button>
                  ))}
                </div>
                {formData.target_roles.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">
                    ⚠️ Sélectionnez au moins un destinataire
                  </p>
                )}
              </div>

              {/* Date d'expiration */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Date d'expiration (optionnel)
                </label>
                <input
                  type="date"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
                <p className="text-xs text-slate-500 mt-1">
                  L'annonce sera automatiquement masquée après cette date
                </p>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-slate-200 p-5 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
                {editingAnnouncement ? 'Modifier' : 'Publier'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Vue détaillée */}
      {viewAnnouncement && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Détail de l'annonce</h2>
              <button
                onClick={() => setViewAnnouncement(null)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${getPriorityInfo(viewAnnouncement.priority).color}`}>
                  {getPriorityInfo(viewAnnouncement.priority).icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-900">{viewAnnouncement.title}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${getPriorityInfo(viewAnnouncement.priority).color}`}>
                    Priorité {getPriorityInfo(viewAnnouncement.priority).label}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-slate-700 whitespace-pre-wrap">{viewAnnouncement.content}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Destinataires :</p>
                <div className="flex flex-wrap gap-2">
                  {viewAnnouncement.target_roles?.map(role => {
                    const roleInfo = getRoleInfo(role);
                    return roleInfo ? (
                      <span key={role} className={`text-sm px-3 py-1 rounded-full ${roleInfo.color}`}>
                        {roleInfo.label}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">Créée le</p>
                  <p className="font-medium">{formatDate(viewAnnouncement.created_at)}</p>
                </div>
                {viewAnnouncement.expires_at && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500">Expire le</p>
                    <p className="font-medium">{formatDate(viewAnnouncement.expires_at)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}