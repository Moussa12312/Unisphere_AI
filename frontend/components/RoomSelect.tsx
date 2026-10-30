'use client';

import { useState, useEffect } from 'react';
import { Building2, Plus, Check, Loader2, Sparkles, X } from 'lucide-react';
import { roomService, Room } from '@/services/roomService';
import { toast } from 'react-hot-toast';

interface RoomSelectProps {
  roomValue: string;
  buildingValue?: string;
  onRoomChange: (room: string, building?: string) => void;
  label?: string;
  required?: boolean;
  className?: string;
}

export default function RoomSelect({
  roomValue,
  buildingValue = '',
  onRoomChange,
  label = 'Salle & Bâtiment',
  required = false,
  className = ''
}: RoomSelectProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [savingNew, setSavingNew] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomBuilding, setNewRoomBuilding] = useState('');
  const [newRoomCapacity, setNewRoomCapacity] = useState('');
  const [isManualMode, setIsManualMode] = useState(false);

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    setLoading(true);
    try {
      const data = await roomService.getAll();
      setRooms(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__ADD_NEW__') {
      setShowAddModal(true);
      return;
    }
    if (val === '__MANUAL__') {
      setIsManualMode(true);
      return;
    }

    if (!val) {
      onRoomChange('', '');
      return;
    }

    const matched = rooms.find((r) => r.name === val);
    if (matched) {
      onRoomChange(matched.name, matched.building || '');
    } else {
      onRoomChange(val, buildingValue);
    }
  };

  const handleCreateNewRoom = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if (!newRoomName.trim()) {
      toast.error('Le nom de la salle est obligatoire');
      return;
    }

    setSavingNew(true);
    try {
      const created = await roomService.create({
        name: newRoomName.trim(),
        building: newRoomBuilding.trim() || null,
        capacity: newRoomCapacity ? parseInt(newRoomCapacity) : null,
        room_type: 'classroom'
      });

      toast.success(`Salle "${created.name}" créée et enregistrée en base !`);
      await loadRooms();
      onRoomChange(created.name, created.building || '');
      setShowAddModal(false);
      setNewRoomName('');
      setNewRoomBuilding('');
      setNewRoomCapacity('');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la création de la salle');
    } finally {
      setSavingNew(false);
    }
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <button
          type="button"
          onClick={() => setIsManualMode(!isManualMode)}
          className="text-[11px] text-[#FF6B00] hover:underline font-medium"
        >
          {isManualMode ? 'Choisir dans la liste enregistrée' : 'Saisie libre'}
        </button>
      </div>

      {!isManualMode ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Menu déroulant des salles en base */}
          <div className="sm:col-span-2 relative">
            <select
              value={roomValue}
              onChange={handleSelectChange}
              disabled={loading}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00] text-slate-800 font-medium"
            >
              <option value="">Sélectionner une salle enregistrée en base...</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name} {r.building ? `(${r.building})` : ''} {r.capacity ? `[${r.capacity} pl.]` : ''}
                </option>
              ))}
              <option disabled>──────────────</option>
              <option value="__ADD_NEW__" className="text-[#FF6B00] font-bold">
                ➕ Enregistrer une nouvelle salle en base...
              </option>
              <option value="__MANUAL__">✏️ Passer en saisie libre</option>
            </select>
          </div>

          {/* Bâtiment associé en affichage/confirmation */}
          <div className="relative">
            <input
              type="text"
              value={buildingValue}
              onChange={(e) => onRoomChange(roomValue, e.target.value)}
              placeholder="Bâtiment / Bloc"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              title="Bâtiment ou bloc (renseigné automatiquement si lié à la salle)"
            />
          </div>
        </div>
      ) : (
        /* Mode saisie libre si besoin exceptionnel */
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            value={roomValue}
            onChange={(e) => onRoomChange(e.target.value, buildingValue)}
            placeholder="Nom de la salle"
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          />
          <input
            type="text"
            value={buildingValue}
            onChange={(e) => onRoomChange(roomValue, e.target.value)}
            placeholder="Bâtiment"
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          />
        </div>
      )}

      {/* MODAL CRÉATION RAPIDE D'UNE SALLE EN BASE */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-orange-100 text-[#FF6B00] rounded-xl">
                  <Building2 size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Nouvelle Salle</h3>
                  <p className="text-[11px] text-slate-500">Enregistrer une salle dans la base</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 mt-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nom de la salle <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Salle 104, Amphi B, Labo Info 2"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateNewRoom();
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bâtiment / Bloc
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Bloc A, Campus"
                    value={newRoomBuilding}
                    onChange={(e) => setNewRoomBuilding(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateNewRoom();
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Capacité (places)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Ex: 50"
                    value={newRoomCapacity}
                    onChange={(e) => setNewRoomCapacity(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateNewRoom();
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-medium"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleCreateNewRoom}
                  disabled={savingNew}
                  className="px-4 py-1.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5"
                >
                  {savingNew ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Enregistrer en base
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
