'use client';

import { useState, useEffect } from 'react';
import { X, Send, Loader2, Users, User as UserIcon } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

import { filiereService } from '@/services/filiereService';

interface BroadcastMessageModalProps {
  onClose: () => void;
  onSent?: () => void;
}

const TARGET_OPTIONS = [
  { value: 'all_students', label: '🎓 Tous les étudiants', needsLevel: true },
  { value: 'all_teachers', label: '👨‍🏫 Tous les enseignants', needsLevel: false },
  { value: 'all_secretaries', label: '📋 Toutes les secrétaires', needsLevel: false },
  { value: 'all_accountants', label: '💰 Tous les comptables', needsLevel: false },
  { value: 'all_censeurs', label: '⚖️ Tous les censeurs', needsLevel: false },
  { value: 'all_alumni', label: '🎓 Tous les alumni', needsLevel: false },
  { value: 'all_guards', label: '🛡️ Tous les gardiens', needsLevel: false },
  { value: 'all_admins', label: '👑 Tous les admins', needsLevel: false },
  { value: 'all_staff', label: '🏢 Tout le personnel (Admin, Secrétaire, Comptable, Censeur, Alumni, Gardien)', needsLevel: false },
  { value: 'individual', label: '👤 Une personne en particulier', needsLevel: false },
];

const LEVELS = ['L1', 'L2', 'L3', 'M1', 'M2'];

export default function BroadcastMessageModal({ onClose, onSent }: BroadcastMessageModalProps) {
  const toast = useToast();
  const [targetType, setTargetType] = useState('all_students');
  const [level, setLevel] = useState('');
  const [filiere, setFiliere] = useState('');
  const [availableFilieres, setAvailableFilieres] = useState<any[]>([]);
  const [recipientId, setRecipientId] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  const selectedOption = TARGET_OPTIONS.find(o => o.value === targetType);

  useEffect(() => {
    loadFilieres();
    if (targetType === 'individual') {
      loadUsers();
    }
  }, [targetType]);

  const loadFilieres = async () => {
    try {
      const data = await filiereService.getAll() || [];
      setAvailableFilieres(data);
    } catch (e) {}
  };


  const loadUsers = async () => {
    try {
      const response = await api.get('/api/v1/messages/users');
      setUsers(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des destinataires');
    }
  };

  const handleSend = async () => {
    if (!subject.trim() || !content.trim()) {
      toast.error('Le sujet et le message sont obligatoires');
      return;
    }
    if (targetType === 'individual' && !recipientId) {
      toast.error('Choisissez un destinataire');
      return;
    }

    setSending(true);
    try {
      const response = await api.post('/api/v1/messages/broadcast', {
        target_type: targetType,
        recipient_id: recipientId ? parseInt(recipientId) : undefined,
        subject,
        content,
        level: level || undefined,
        filiere: filiere || undefined,
      });
      toast.success(response.data.message || 'Message envoyé avec succès');
      onSent?.();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users size={20} className="text-[#FF6B00]" />
            Message groupé
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Destinataires *</label>
            <select
              value={targetType}
              onChange={(e) => { setTargetType(e.target.value); setLevel(''); setFiliere(''); setRecipientId(''); }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            >
              {TARGET_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {selectedOption?.needsLevel && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Niveau (optionnel)</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  <option value="">Tous les niveaux</option>
                  {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Filière (optionnel)</label>
                <select
                  value={filiere}
                  onChange={(e) => setFiliere(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  <option value="">Toutes les filières</option>
                  {availableFilieres.map(f => (
                    <option key={f.id} value={f.name}>{f.name}</option>
                  ))}
                </select>
              </div>

            </div>
          )}

          {targetType === 'individual' && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Destinataire *</label>
              <select
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              >
                <option value="">Sélectionner...</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Sujet *</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Message *</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium">
            Annuler
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex-1 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {sending ? 'Envoi...' : 'Envoyer'}
          </button>
        </div>
      </div>
    </div>
  );
}
