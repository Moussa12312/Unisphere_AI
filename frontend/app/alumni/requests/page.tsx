'use client';
import { useState, useEffect } from 'react';
import {
  Bell, CheckCircle, XCircle, Clock, Users, GraduationCap,
  Loader2, MessageSquare
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function AlumniRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const res = await api.get('/api/v1/alumni/me/requests');
      setRequests(res.data || []);
    } catch (error) {
      toast.error('Erreur de chargement des demandes');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id: number) => {
    setProcessingId(id);
    try {
      await api.put(`/api/v1/alumni/connections/${id}/accept`);
      toast.success('Demande acceptée avec succès !');
      loadRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la validation');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: number) => {
    if (!confirm('Voulez-vous vraiment refuser cette demande ?')) return;
    setProcessingId(id);
    try {
      await api.put(`/api/v1/alumni/connections/${id}/reject`);
      toast.success('Demande rejetée');
      loadRequests();
    } catch (error) {
      toast.error('Erreur lors du rejet');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={40} className="animate-spin text-[#FF6B00]" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Demandes de mentorat</h1>
        <p className="text-slate-500 text-sm mt-1">{requests.length} demande(s) en attente de réponse</p>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 sm:p-16 text-center shadow-sm">
          <Bell size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-700 font-semibold text-base">Aucune demande en attente</p>
          <p className="text-xs text-slate-400 mt-1">Les nouvelles demandes de mentorat des étudiants apparaîtront ici.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req.id} className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-base sm:text-lg shrink-0 shadow-md">
                    {req.student?.first_name?.[0]}{req.student?.last_name?.[0]}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                        {req.student?.first_name} {req.student?.last_name}
                      </h3>
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full border border-orange-200">
                        {req.student?.matricule}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600">
                      {req.student?.level} - {req.student?.filiere}
                    </p>
                    {req.message && (
                      <div className="mt-2.5 p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs sm:text-sm text-slate-700 italic">
                        "{req.message}"
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2.5">
                      <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${
                        req.connection_type === 'mentor' ? 'bg-purple-100 text-purple-700' :
                        req.connection_type === 'directeur_memoire' ? 'bg-blue-100 text-blue-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {req.connection_type === 'mentor' ? '🎓 Mentorat' :
                         req.connection_type === 'directeur_memoire' ? '📚 Direction mémoire' : '🤝 Ami'}
                      </span>
                      {req.created_at && (
                        <span className="text-[11px] text-slate-400">
                          {new Date(req.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto self-end sm:self-center shrink-0">
                  <button
                    onClick={() => handleAccept(req.id)}
                    disabled={processingId === req.id}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm disabled:opacity-50"
                  >
                    {processingId === req.id ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                    Accepter
                  </button>
                  <button
                    onClick={() => handleReject(req.id)}
                    disabled={processingId === req.id}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-xl text-xs sm:text-sm font-semibold transition-all border border-slate-200 hover:border-red-200 disabled:opacity-50"
                  >
                    <XCircle size={15} />
                    Refuser
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
