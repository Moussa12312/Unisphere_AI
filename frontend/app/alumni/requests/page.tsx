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

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const res = await api.get('/api/v1/alumni/me/requests');
      setRequests(res.data || []);
    } catch (error) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id: number) => {
    try {
      await api.put(`/api/v1/alumni/connections/${id}/accept`);
      toast.success('✅ Demande acceptée !');
      loadRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  };

  const handleReject = async (id: number) => {
    if (!confirm('Rejeter cette demande ?')) return;
    try {
      await api.put(`/api/v1/alumni/connections/${id}/reject`);
      toast.success('Demande rejetée');
      loadRequests();
    } catch (error) {
      toast.error('Erreur');
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
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Demandes de mentorat</h1>
        <p className="text-slate-500 mt-1">{requests.length} demande(s) en attente</p>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <Bell size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">Aucune demande en attente</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req.id} className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-lg">
                  {req.student?.first_name?.[0]}{req.student?.last_name?.[0]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900">
                      {req.student?.first_name} {req.student?.last_name}
                    </h3>
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
                      {req.student?.matricule}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">
                    {req.student?.level} - {req.student?.filiere}
                  </p>
                  {req.message && (
                    <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-700 italic">"{req.message}"</p>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      req.connection_type === 'mentor' ? 'bg-purple-100 text-purple-700' :
                      req.connection_type === 'directeur_memoire' ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {req.connection_type === 'mentor' ? '🎓 Mentorat' :
                       req.connection_type === 'directeur_memoire' ? '📚 Direction mémoire' : '🤝 Ami'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAccept(req.id)}
                    className="flex items-center gap-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
                  >
                    <CheckCircle size={16} />
                    Accepter
                  </button>
                  <button
                    onClick={() => handleReject(req.id)}
                    className="flex items-center gap-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
                  >
                    <XCircle size={16} />
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