'use client';

import { useState, useEffect } from 'react';
import {
  Bell, Plus, Search, Trash2, X, Save, Loader2,
  AlertTriangle, Calendar, FileText, Award, MessageSquare, MapPin
} from 'lucide-react';
import { announcementService, Announcement } from '@/services/announcementService';
import { useToast } from '@/components/ToastProvider';

export default function SecretaryAnnouncementsPage() {
  const toast = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general',
    priority: 'normal',
    target_audience: 'all',
    event_date: '',
  });

  const [saving, setSaving] = useState(false);

  const announcementTypes = [
    { value: 'general', label: '📣 Annonce générale', icon: MessageSquare },
    { value: 'homework', label: '📝 Devoir / Exercice', icon: FileText },
    { value: 'exam', label: '📅 Examen', icon: Calendar },
    { value: 'report_card', label: '📊 Bulletin', icon: Award },
    { value: 'room_change', label: '🏫 Changement de salle', icon: MapPin },
    { value: 'urgent', label: '⚠️ Urgent', icon: AlertTriangle },
  ];

  const priorities = [
    { value: 'low', label: 'Basse', color: 'bg-blue-100 text-blue-700' },
    { value: 'normal', label: 'Normale', color: 'bg-green-100 text-green-700' },
    { value: 'high', label: 'Haute', color: 'bg-orange-100 text-orange-700' },
    { value: 'urgent', label: 'Urgente', color: 'bg-red-100 text-red-700' },
  ];

  const targetAudiences = [
    { value: 'all', label: '👥 Tout le monde' },
    { value: 'students', label: '🎓 Étudiants uniquement' },
    { value: 'teachers', label: '👨‍🏫 Enseignants uniquement' },
  ];

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const data = await announcementService.getAll();
      setAnnouncements(data);
    } catch (error) {
      console.error('Erreur chargement:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.title || !formData.content) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setSaving(true);
    try {
      await announcementService.create({
        title: formData.title,
        content: formData.content,
        category: formData.category,
        priority: formData.priority,
        target_audience: formData.target_audience,
        event_date: formData.event_date || null,
        is_published: true,
        published_at: new Date().toISOString(),
      });
      
      toast.success('Annonce créée avec succès');
      setShowCreateModal(false);
      setFormData({ 
        title: '', 
        content: '', 
        category: 'general', 
        priority: 'normal',
        target_audience: 'all',
        event_date: '' 
      });
      loadAnnouncements();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAnnouncement) return;

    setSaving(true);
    try {
      await announcementService.delete(selectedAnnouncement.id);
      toast.success('Annonce supprimée avec succès');
      setShowDeleteModal(false);
      setSelectedAnnouncement(null);
      loadAnnouncements();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
    } finally {
      setSaving(false);
    }
  };

  const filteredAnnouncements = announcements.filter(announcement => {
    const matchSearch = 
      announcement.title.toLowerCase().includes(search.toLowerCase()) ||
      announcement.content.toLowerCase().includes(search.toLowerCase());
    
    const matchType = !filterType || announcement.category === filterType;
    
    return matchSearch && matchType;
  });

  const getTypeIcon = (type: string) => {
    const typeConfig = announcementTypes.find(t => t.value === type);
    const Icon = typeConfig?.icon || Bell;
    return <Icon size={16} />;
  };

  const getPriorityColor = (priority: string) => {
    const priorityConfig = priorities.find(p => p.value === priority);
    return priorityConfig?.color || 'bg-slate-100 text-slate-700';
  };

  const getTypeLabel = (type: string) => {
    const typeConfig = announcementTypes.find(t => t.value === type);
    return typeConfig?.label || type;
  };

  const getTargetLabel = (target: string) => {
    const targetConfig = targetAudiences.find(t => t.value === target);
    return targetConfig?.label || target;
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
          <h1 className="text-3xl font-bold text-slate-900">Annonces</h1>
          <p className="text-slate-500 mt-1">Gérez les communications aux étudiants et enseignants</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-sm font-medium transition-all shadow-md"
        >
          <Plus size={16} />
          Nouvelle annonce
        </button>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="🔍 Rechercher dans les annonces..."
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
            {announcementTypes.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Liste des annonces */}
      <div className="space-y-3">
        {filteredAnnouncements.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
            <Bell size={48} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Aucune annonce</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-block mt-4 text-sm text-[#FF6B00] hover:underline"
            >
              Créer la première annonce →
            </button>
          </div>
        ) : (
          filteredAnnouncements.map((announcement) => (
            <div key={announcement.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(announcement.category)}
                      <span className="text-xs font-medium text-slate-600">
                        {getTypeLabel(announcement.category)}
                      </span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(announcement.priority)}`}>
                      {announcement.priority}
                    </span>
                    <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
                      {getTargetLabel(announcement.target_audience)}
                    </span>
                    {announcement.event_date && (
                      <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700 flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(announcement.event_date).toLocaleDateString('fr-FR', { 
                          day: 'numeric', 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{announcement.title}</h3>
                  <p className="text-sm text-slate-600 whitespace-pre-line">{announcement.content}</p>
                  <p className="text-xs text-slate-400 mt-3">
                    Publié le {new Date(announcement.published_at || announcement.created_at).toLocaleDateString('fr-FR')} à {new Date(announcement.published_at || announcement.created_at).toLocaleTimeString('fr-FR')}
                  </p>
                </div>
                <button
                  onClick={() => { setSelectedAnnouncement(announcement); setShowDeleteModal(true); }}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Supprimer"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL CRÉATION */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">Nouvelle annonce</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Type d'annonce *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  {announcementTypes.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Priorité *</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  {priorities.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Destinataires *</label>
                <select
                  value={formData.target_audience}
                  onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  {targetAudiences.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Date de l'événement <span className="text-slate-400">(optionnel)</span>
                </label>
                <input
                  type="date"
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
                <p className="text-xs text-slate-400 mt-1">
                  💡 Pour les devoirs, examens, bulletins... Laissez vide pour une annonce générale
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Titre *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Examen de Mathématiques - L1 Info"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Contenu *</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Détails de l'annonce..."
                  rows={5}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] resize-none"
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
                className="flex-1 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Création...' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SUPPRESSION */}
      {showDeleteModal && selectedAnnouncement && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="text-red-600" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Supprimer cette annonce ?</h3>
                <p className="text-sm text-slate-500">Cette action est irréversible</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-6">
              Voulez-vous vraiment supprimer l'annonce <strong>{selectedAnnouncement.title}</strong> ?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setSelectedAnnouncement(null); }}
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
    </div>
  );
}