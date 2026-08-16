'use client';
import { useState, useEffect } from 'react';
import {
  FileSearch, Plus, Clock, CheckCircle, XCircle,
  Download, Loader2, FileText, Calendar, Award,
  ScrollText, AlertCircle, Eye
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface CertificateRequest {
  id: number;
  request_type: string;
  status: string;
  created_at: string;
  file_path: string | null;
  rejection_reason: string | null;
}

const REQUEST_TYPES = [
  { 
    id: 'scolarite',
    label: 'Attestation de scolarité',
    description: 'Certifie votre inscription pour l\'année en cours',
    icon: Calendar,
    color: 'from-blue-500 to-indigo-600',
    bg: 'bg-blue-100',
    text: 'text-blue-700'
  },
  { 
    id: 'reussite',
    label: 'Attestation de réussite',
    description: 'Certifie la validation de votre année universitaire',
    icon: Award,
    color: 'from-green-500 to-emerald-600',
    bg: 'bg-green-100',
    text: 'text-green-700'
  },
  { 
    id: 'presence',
    label: 'Attestation de présence',
    description: 'Certifie votre assiduité aux cours',
    icon: Clock,
    color: 'from-orange-500 to-red-600',
    bg: 'bg-orange-100',
    text: 'text-orange-700'
  },
  { 
    id: 'releve',
    label: 'Relevé de notes',
    description: 'Détail de toutes vos notes par session',
    icon: ScrollText,
    color: 'from-purple-500 to-pink-600',
    bg: 'bg-purple-100',
    text: 'text-purple-700'
  }
];

export default function StudentRequestsPage() {
  const [requests, setRequests] = useState<CertificateRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState<number | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/v1/certificates/me');
      setRequests(res.data || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async () => {
    if (!selectedType) return;
    
    setSubmitting(true);
    try {
      await api.post('/api/v1/certificates/me', { request_type: selectedType });
      toast.success('✅ Demande envoyée avec succès !');
      setShowModal(false);
      setSelectedType(null);
      loadRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la demande');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async (req: CertificateRequest) => {
    setDownloading(req.id);
    try {
      const response = await api.get(`/api/v1/certificates/me/${req.id}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${req.request_type.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('📄 Document téléchargé');
    } catch (error: any) {
      toast.error('Erreur de téléchargement');
    } finally {
      setDownloading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { bg: string; text: string; icon: any; label: string }> = {
      pending: { bg: 'bg-orange-100', text: 'text-orange-700', icon: Clock, label: 'En cours de traitement' },
      approved: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle, label: 'Disponible' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle, label: 'Refusé' }
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

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <FileSearch size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Mes demandes de documents</h1>
            <p className="text-blue-100">
              Demandez vos attestations et suivez leur statut
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur">
            <div className="flex items-center gap-2">
              <FileText size={20} />
              <span className="text-2xl font-bold">{requests.length}</span>
            </div>
            <p className="text-sm text-blue-100 mt-1">Total demandes</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur">
            <div className="flex items-center gap-2">
              <Clock size={20} />
              <span className="text-2xl font-bold">{pendingCount}</span>
            </div>
            <p className="text-sm text-blue-100 mt-1">En traitement</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur">
            <div className="flex items-center gap-2">
              <CheckCircle size={20} />
              <span className="text-2xl font-bold">{approvedCount}</span>
            </div>
            <p className="text-sm text-blue-100 mt-1">Disponibles</p>
          </div>
        </div>
      </div>

      {/* Bouton nouvelle demande */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl font-medium transition-colors shadow-lg"
        >
          <Plus size={18} />
          Nouvelle demande
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="animate-spin text-[#FF6B00]" />
        </div>
      )}

      {/* Empty state */}
      {!loading && requests.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <FileSearch size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 mb-4">Vous n'avez encore fait aucune demande</p>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl font-medium"
          >
            Faire ma première demande
          </button>
        </div>
      )}

      {/* Liste des demandes */}
      {!loading && requests.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {requests.map((req) => {
              const typeInfo = REQUEST_TYPES.find(t => t.id === req.request_type) || REQUEST_TYPES[0];
              const Icon = typeInfo.icon;
              
              return (
                <div key={req.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${typeInfo.bg}`}>
                      <Icon size={20} className={typeInfo.text} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900">{typeInfo.label}</h3>
                      <p className="text-sm text-slate-500">
                        Demandé le {new Date(req.created_at).toLocaleDateString('fr-FR')}
                      </p>
                      {req.rejection_reason && (
                        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                          <AlertCircle size={12} />
                          {req.rejection_reason}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(req.status)}
                      {req.status === 'approved' && req.file_path && (
                        <button
                          onClick={() => handleDownload(req)}
                          disabled={downloading === req.id}
                          className="flex items-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg disabled:opacity-50"
                        >
                          {downloading === req.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Download size={14} />
                          )}
                          Télécharger
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal nouvelle demande */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Plus className="text-[#FF6B00]" size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Nouvelle demande de document</h2>
                <p className="text-sm text-slate-500">Choisissez le type de document souhaité</p>
              </div>
            </div>

            <div className="space-y-3">
              {REQUEST_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                      selectedType === type.id
                        ? 'border-[#FF6B00] bg-orange-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${type.color} flex items-center justify-center text-white`}>
                      <Icon size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{type.label}</p>
                      <p className="text-xs text-slate-500">{type.description}</p>
                    </div>
                    {selectedType === type.id && (
                      <CheckCircle size={20} className="text-[#FF6B00]" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedType(null);
                }}
                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200"
              >
                Annuler
              </button>
              <button
                onClick={handleRequest}
                disabled={!selectedType || submitting}
                className="flex-1 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <FileSearch size={16} />
                )}
                Envoyer la demande
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}