'use client';

import { useState, useEffect } from 'react';
import { 
  FileText, Download, Loader2, Search, Clock, 
  CheckCircle2, AlertCircle, Upload, X 
} from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

interface CertificateRequest {
  id: number;
  student_name: string;
  matricule: string;
  type: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  file_path: string | null;
  rejection_reason: string | null;
}

export default function SecretaryCertificateRequestsPage() {
  const toast = useToast();
  
  const [requests, setRequests] = useState<CertificateRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [search, setSearch] = useState('');
  
  // États pour le modal d'upload/refus
  const [actionModal, setActionModal] = useState<{ type: 'upload' | 'reject', requestId: number } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadRequests();
  }, [filter]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const statusParam = filter === 'all' ? '' : `?status=${filter}`;
      const res = await api.get(`/api/v1/certificates/secretary/requests${statusParam}`);
      setRequests(res.data || []);
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors du chargement des demandes');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (requestId: number, file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      await api.post(`/api/v1/certificates/secretary/requests/${requestId}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success('Attestation validée et envoyée à l\'étudiant');
      setActionModal(null);
      loadRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  const handleReject = async (requestId: number) => {
    if (!rejectionReason.trim()) {
      toast.error('Veuillez fournir un motif de refus');
      return;
    }
    setProcessing(true);
    try {
      await api.put(`/api/v1/certificates/secretary/requests/${requestId}/status`, {
        status: 'rejected',
        rejection_reason: rejectionReason
      });
      toast.success('Demande refusée');
      setActionModal(null);
      setRejectionReason('');
      loadRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors du refus');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { bg: string; text: string; icon: any; label: string }> = {
      pending: { bg: 'bg-orange-100', text: 'text-orange-700', icon: Clock, label: 'En attente' },
      approved: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2, label: 'Validée' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle, label: 'Refusée' }
    };
    const config = configs[status] || configs.pending;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
        <Icon size={14} />
        {config.label}
      </span>
    );
  };

  const filteredRequests = requests.filter(req => {
    const matchSearch = `${req.student_name} ${req.matricule}`.toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-[#FF6B00] to-orange-500 rounded-xl flex items-center justify-center">
            <FileText size={24} className="text-white" />
          </div>
          Demandes d'attestations
        </h1>
        <p className="text-slate-500 mt-1">Traitez les demandes de documents soumises par les étudiants</p>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock size={20} className="text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">En attente</p>
              <p className="text-2xl font-bold text-slate-900">
                {requests.filter(r => r.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Validées</p>
              <p className="text-2xl font-bold text-slate-900">
                {requests.filter(r => r.status === 'approved').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres et Recherche */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="🔍 Rechercher par nom ou matricule..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>
          <div className="flex gap-2">
            {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === f 
                    ? 'bg-[#FF6B00] text-white' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f === 'all' ? 'Toutes' : f === 'pending' ? 'En attente' : f === 'approved' ? 'Validées' : 'Refusées'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Liste des demandes */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px] bg-white rounded-2xl border border-slate-200">
          <Loader2 className="animate-spin text-[#FF6B00]" size={32} />
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <FileText size={48} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Aucune demande dans cette catégorie</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((req) => (
            <div key={req.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-slate-900">{req.student_name}</h3>
                    {getStatusBadge(req.status)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-600 mb-2">
                    <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-xs">{req.matricule}</span>
                    <span>•</span>
                    <span>{req.type}</span>
                    <span>•</span>
                    <span>Demandée le {new Date(req.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                  {req.status === 'rejected' && req.rejection_reason && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700 flex items-start gap-2">
                        <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                        <span><strong>Motif du refus :</strong> {req.rejection_reason}</span>
                      </p>
                    </div>
                  )}
                </div>
                
                {req.status === 'pending' && (
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-sm font-medium cursor-pointer transition-colors">
                      {uploading && actionModal?.requestId === req.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Upload size={16} />
                      )}
                      Valider & Upload PDF
                      <input
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        disabled={uploading && actionModal?.requestId === req.id}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUpload(req.id, file);
                        }}
                      />
                    </label>
                    <button
                      onClick={() => setActionModal({ type: 'reject', requestId: req.id })}
                      className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      <X size={16} />
                      Refuser
                    </button>
                  </div>
                )}
                
                {req.status === 'approved' && req.file_path && (
                  <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-4 py-2 rounded-lg">
                    <CheckCircle2 size={16} />
                    Document fourni
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Refus */}
      {actionModal?.type === 'reject' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
              <AlertCircle size={20} className="text-red-600" />
              Refuser la demande
            </h3>
            <p className="text-sm text-slate-500 mb-4">Veuillez indiquer la raison du refus pour que l'étudiant puisse corriger ou comprendre.</p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-lg text-sm mb-4 focus:ring-2 focus:ring-red-500 focus:outline-none resize-none"
              rows={3}
              placeholder="Ex: Frais de scolarité impayés, ou document incomplet..."
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setActionModal(null); setRejectionReason(''); }}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
              >
                Annuler
              </button>
              <button
                onClick={() => handleReject(actionModal.requestId)}
                disabled={processing || !rejectionReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {processing && <Loader2 size={16} className="animate-spin" />}
                Confirmer le refus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}