'use client';

import { useState, useEffect } from 'react';
import { 
  Building2, Plus, Search, MapPin, Users, CheckCircle2, 
  XCircle, Trash2, Loader2, RefreshCw 
} from 'lucide-react';
import roomService, { Room } from '@/services/roomService';
import { toast } from 'react-hot-toast';

export default function CenseurRoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    building: '',
    capacity: 40,
    room_type: 'Salle de cours'
  });

  const loadRooms = async () => {
    setLoading(true);
    try {
      const data = await roomService.getAll();
      setRooms(data);
    } catch (e) {
      toast.error('Erreur chargement des salles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Veuillez entrer le nom de la salle');
      return;
    }

    setSubmitting(true);
    try {
      await roomService.create({
        name: formData.name.trim(),
        building: formData.building.trim() || undefined,
        capacity: Number(formData.capacity) || 40,
        room_type: formData.room_type
      });
      toast.success('Salle ajoutée avec succès');
      setShowAddModal(false);
      setFormData({ name: '', building: '', capacity: 40, room_type: 'Salle de cours' });
      await loadRooms();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Erreur lors de l'ajout de la salle");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette salle ?')) return;
    try {
      await roomService.delete(id);
      toast.success('Salle supprimée');
      setRooms(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur suppression');
    }
  };

  const filteredRooms = rooms.filter(r => 
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.building && r.building.toLowerCase().includes(search.toLowerCase())) ||
    (r.room_type && r.room_type.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="text-[#FF6B00]" size={26} />
            Gestion des Salles & Espaces
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Supervisez les salles de cours, amphithéâtres et laboratoires pour les emplois du temps.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadRooms()}
            className="p-2.5 text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-xs"
            title="Actualiser"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-[#FF6B00] text-white rounded-xl text-sm font-semibold hover:opacity-95 shadow-md shadow-orange-500/20 transition-all"
          >
            <Plus size={18} />
            <span>Nouvelle Salle</span>
          </button>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom de salle, bâtiment ou type..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B00] shadow-xs"
        />
      </div>

      {/* Liste des salles */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-[#FF6B00] mb-2" />
          <p className="text-sm">Chargement des salles...</p>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="py-16 bg-white border border-slate-200 rounded-2xl text-center p-6 shadow-xs">
          <Building2 size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-base font-semibold text-slate-700">Aucune salle trouvée</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {search ? 'Aucune salle ne correspond à votre recherche.' : 'Créez votre première salle pour organiser les cours et examens.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRooms.map((room) => (
            <div 
              key={room.id}
              className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4 group"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#FF6B00] flex-shrink-0">
                      <Building2 size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base leading-tight">
                        {room.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                        <MapPin size={12} className="text-slate-400" />
                        {room.building || 'Bâtiment Principal'}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    room.is_available 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {room.is_available ? (
                      <>
                        <CheckCircle2 size={11} />
                        Disponible
                      </>
                    ) : (
                      <>
                        <XCircle size={11} />
                        Occupée
                      </>
                    )}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Users size={14} className="text-slate-400" />
                    Capacité: <strong className="text-slate-800">{room.capacity || 40} places</strong>
                  </span>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[11px] font-medium">
                    {room.room_type || 'Salle de cours'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end pt-2">
                <button
                  onClick={() => handleDelete(room.id)}
                  className="opacity-80 sm:opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-all text-xs flex items-center gap-1"
                  title="Supprimer"
                >
                  <Trash2 size={15} />
                  <span>Supprimer</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Ajout Salle */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <Building2 size={20} className="text-[#FF6B00]" />
                Ajouter une salle
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nom ou Numéro de Salle *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="ex: Amphi A, Salle 102, Labo Info..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bâtiment
                </label>
                <input
                  type="text"
                  value={formData.building}
                  onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                  placeholder="ex: Bâtiment Sciences, Aile Ouest..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Capacité (étudiants)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Type d'espace
                  </label>
                  <select
                    value={formData.room_type}
                    onChange={(e) => setFormData({ ...formData, room_type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  >
                    <option value="Salle de cours">Salle de cours</option>
                    <option value="Amphithéâtre">Amphithéâtre</option>
                    <option value="Laboratoire">Laboratoire</option>
                    <option value="Atelier">Atelier</option>
                    <option value="Bibliothèque">Bibliothèque</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-gradient-to-r from-orange-500 to-[#FF6B00] text-white text-sm font-semibold rounded-xl hover:opacity-95 shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  <span>Enregistrer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
