'use client';

import { useState, useEffect } from 'react';
import { 
  Megaphone, Calendar, Tag, AlertCircle, Clock, 
  Search, Filter, Eye, ChevronRight, X, Sparkles, Bell
} from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

interface Announcement {
  id: number;
  title: string;
  content: string;
  category?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  target_audience?: string;
  published_at?: string;
  created_at?: string;
  event_date?: string;
}

export default function StudentAnnouncementsPage() {
  const toast = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/v1/announcements/');
      const list = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.data) ? res.data.data : []);
      setAnnouncements(list);
    } catch (error) {
      console.error('Erreur chargement annonces:', error);
      toast.error('Erreur lors du chargement des annonces');
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { value: 'all', label: 'Toutes les annonces' },
    { value: 'academic', label: 'Académique' },
    { value: 'exam', label: 'Examens' },
    { value: 'administrative', label: 'Administratif' },
    { value: 'event', label: 'Événements' },
  ];

  const filteredAnnouncements = announcements.filter((a) => {
    const q = search.toLowerCase();
    const matchSearch = a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q);
    const matchCat = filterCategory === 'all' || a.category === filterCategory;
    return matchSearch && matchCat;
  });

  const getPriorityBadge = (p?: string) => {
    switch (p) {
      case 'urgent':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200 animate-pulse">Urgent</span>;
      case 'high':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200">Important</span>;
      case 'low':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">Info</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Générale</span>;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-orange-100 text-[#FF6B00]">
              <Megaphone size={22} />
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Annonces & Communications</h1>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Consultez les informations officielles, dates d'examens et actualités de votre université.
          </p>
        </div>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher une annonce..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {categories.map((c) => (
            <button
              key={c.value}
              onClick={() => setFilterCategory(c.value)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                filterCategory === c.value
                  ? 'bg-[#FF6B00] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Liste des annonces */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-12 h-12 border-4 border-orange-200 border-t-[#FF6B00] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm font-medium">Chargement des annonces officielles...</p>
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Bell size={28} />
          </div>
          <h3 className="font-bold text-slate-800 text-base">Aucune annonce pour le moment</h3>
          <p className="text-slate-500 text-xs">
            {search ? 'Aucun résultat ne correspond à votre recherche.' : 'Vous êtes à jour ! Aucune nouvelle annonce officielle n\'a été publiée.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAnnouncements.map((a) => (
            <div
              key={a.id}
              onClick={() => setSelectedAnnouncement(a)}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group hover:border-orange-300 relative"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  {getPriorityBadge(a.priority)}
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Calendar size={13} />
                    <span>
                      {a.published_at || a.created_at
                        ? new Date(a.published_at || a.created_at || '').toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })
                        : 'Récent'}
                    </span>
                  </div>
                </div>

                <h3 className="font-bold text-slate-900 text-base group-hover:text-[#FF6B00] transition-colors leading-snug">
                  {a.title}
                </h3>

                <p className="text-slate-600 text-xs line-clamp-3 leading-relaxed">
                  {a.content}
                </p>
              </div>

              <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-[#FF6B00]">
                <span>Lire l'annonce complète</span>
                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Détail Annonce */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                {getPriorityBadge(selectedAnnouncement.priority)}
                <h2 className="text-lg font-bold text-slate-900 mt-2">
                  {selectedAnnouncement.title}
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Calendar size={14} />
                  <span>
                    Publié le {new Date(selectedAnnouncement.published_at || selectedAnnouncement.created_at || '').toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="border-t border-slate-100 pt-4 text-slate-700 text-sm leading-relaxed whitespace-pre-line bg-slate-50/50 p-4 rounded-xl border">
              {selectedAnnouncement.content}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="px-5 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-all"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
