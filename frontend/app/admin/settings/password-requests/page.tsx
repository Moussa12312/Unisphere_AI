'use client';

import { useState, useEffect } from 'react';
import { KeyRound, CheckCircle, XCircle, Search, RefreshCw, UserCheck, ShieldAlert, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function AdminPasswordResetRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'resolved' | 'all'>('pending');
  const [search, setSearch] = useState('');

  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadRequests();
  }, [statusFilter]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/v1/password-reset/requests?status=${statusFilter}`);
      setRequests(res.data || []);
    } catch (err: any) {
      toast.error('Erreur lors du chargement des demandes');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    if (newPassword.trim().length < 6) {
      toast.error('Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    setProcessing(true);
    try {
      const res = await api.post(`/api/v1/password-reset/requests/${selectedRequest.id}/resolve`, {
        new_password: newPassword.trim(),
        admin_note: adminNote.trim() || undefined
      });
      toast.success(res.data.message || 'Mot de passe réinitialisé !');
      setSelectedRequest(null);
      setNewPassword('');
      setAdminNote('');
      loadRequests();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la réinitialisation');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (reqId: number) => {
    if (!confirm('Rejeter cette demande de réinitialisation ?')) return;
    try {
      await api.post(`/api/v1/password-reset/requests/${reqId}/reject`, {});
      toast.success('Demande rejetée.');
      loadRequests();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur');
    }
  };

  const filtered = requests.filter(r => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      r.full_name?.toLowerCase().includes(s) ||
      r.email?.toLowerCase().includes(s) ||
      r.role?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <KeyRound className="text-[#FF6B00]" size={28} />
            Demandes de mot de passe oublié
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Traitement sécurisé des réinitialisations de comptes pour l'établissement
          </p>
        </div>

        <button
          onClick={loadRequests}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 self-start sm:self-auto"
        >
          <RefreshCw size={14} />
          Actualiser
        </button>
      </div>

      {/* Filtres & Recherche */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex gap-2">
          {(['pending', 'resolved', 'all'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === tab
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab === 'pending' ? 'En attente' : tab === 'resolved' ? 'Traitées' : 'Toutes'}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher nom, email, rôle..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          />
        </div>
      </div>

      {/* Table & Mobile Cards */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 size={32} className="animate-spin text-[#FF6B00]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
          Aucune demande trouvée.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">Utilisateur</th>
                  <th className="p-3.5">Rôle</th>
                  <th className="p-3.5">Message</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Statut</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{r.full_name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{r.email}</div>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 capitalize">
                        {r.role}
                      </span>
                    </td>
                    <td className="p-3.5 max-w-xs truncate text-slate-600 italic">
                      "{r.message}"
                    </td>
                    <td className="p-3.5 text-slate-500">
                      {r.created_at ? new Date(r.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : r.status === 'resolved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {r.status === 'pending' ? 'En attente' : r.status === 'resolved' ? 'Résolue' : 'Rejetée'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-2">
                      {r.status === 'pending' && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedRequest(r);
                              setNewPassword('unisphere2026');
                            }}
                            className="px-3 py-1.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-xs font-bold transition-all"
                          >
                            Réinitialiser
                          </button>
                          <button
                            onClick={() => handleReject(r.id)}
                            className="px-2.5 py-1.5 border border-slate-200 text-slate-500 hover:text-red-600 rounded-lg text-xs transition-colors"
                          >
                            Rejeter
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Réinitialisation */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#FF6B00] flex items-center justify-center">
                <UserCheck size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Réinitialiser le mot de passe</h3>
                <p className="text-xs text-slate-500">{selectedRequest.full_name} ({selectedRequest.email})</p>
              </div>
            </div>

            <form onSubmit={handleResolve} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nouveau mot de passe temporaire *
                </label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 caractères (ex: unisphere2026)"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Note administrative (optionnelle)
                </label>
                <textarea
                  rows={2}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Identité vérifiée par téléphone..."
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#FF6B00] resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="px-4 py-2 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50"
                >
                  {processing ? 'Validation...' : 'Appliquer et Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

