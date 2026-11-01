'use client';

import { useState } from 'react';
import { Mail, ShieldCheck, X, Loader2, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface ChangeUserEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultIdentifier?: string;
  onSuccess?: () => void;
}

export default function ChangeUserEmailModal({
  isOpen,
  onClose,
  defaultIdentifier = '',
  onSuccess
}: ChangeUserEmailModalProps) {
  const [identifier, setIdentifier] = useState(defaultIdentifier);
  const [newEmail, setNewEmail] = useState('');
  const [reason, setReason] = useState('Correction administrative de l\'adresse email');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !newEmail.trim()) {
      toast.error('Veuillez renseigner le matricule/email actuel et le nouvel email.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/api/v1/admin/change-user-email', {
        identifier: identifier.trim(),
        new_email: newEmail.trim().toLowerCase(),
        reason_message: reason.trim() || undefined
      });

      toast.success(res.data?.message || 'Email modifié avec succès !');
      setIdentifier('');
      setNewEmail('');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Erreur lors de la modification de l\'email.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative">
        
        {/* Bouton Fermer */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X size={20} />
        </button>

        {/* En-tête */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0754C7] to-[#1768E8] text-white flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
            <Mail size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Modifier l'email d'un compte</h2>
            <p className="text-xs text-slate-500">Étudiant (via matricule/email) ou Enseignant</p>
          </div>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3 text-xs text-amber-900 flex items-start gap-2">
            <span className="text-base shrink-0">ℹ️</span>
            <p className="leading-relaxed">
              Cette action met à jour l'adresse email de connexion et l'envoi des codes de sécurité OTP. Une alerte sera envoyée pour notifier l'utilisateur.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Matricule ou Ancien Email *
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="ex: STU-2026-001 ou prof.kone@gmail.com"
              required
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/10 outline-none transition-all font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Nouvelle Adresse Email (Réelle & Accessible) *
            </label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="ex: nouveau.email@gmail.com"
              required
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/10 outline-none transition-all font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Motif / Message explicatif (Optionnel)
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Correction suite à une faute de frappe signalée par l'étudiant."
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/10 outline-none transition-all resize-none text-slate-700"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-orange-600 active:scale-[0.98] text-white font-bold text-sm transition-all shadow-md shadow-orange-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Modification en cours...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Enregistrer la modification</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
