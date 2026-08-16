'use client';

import { useState, useEffect } from 'react';
import { FileText, Download, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

// ✅ Composant React valide avec export default
export default function StudentCertificatesPage() {
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<number | null>(null);

  useEffect(() => {
    loadCertificates();
  }, []);

  const loadCertificates = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/v1/certificates/me');
      setCertificates(res.data || []);
    } catch (error) {
      console.error(error);
      toast.error('Erreur de chargement des attestations');
    } finally {
      setLoading(false);
    }
  };

  const requestCertificate = async (type: string) => {
    setRequesting(type);
    try {
      await api.post('/api/v1/certificates/me', { type });
      toast.success(`Demande d'attestation envoyée avec succès`);
      await loadCertificates();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la demande');
    } finally {
      setRequesting(null);
    }
  };

  const downloadCertificate = async (cert: any) => {
    setDownloading(cert.id);
    try {
      const response = await api.get(`/api/v1/certificates/me/${cert.id}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${cert.type.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Attestation téléchargée');
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.detail || 'Erreur de téléchargement');
    } finally {
      setDownloading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { bg: string; text: string; icon: any; label: string }> = {
      pending: { bg: 'bg-orange-100', text: 'text-orange-700', icon: Clock, label: 'En cours' },
      approved: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle, label: 'Disponible' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle, label: 'Refusé' }
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

  const availableTypes = [
    { type: 'Attestation de scolarité', description: 'Certifie votre inscription pour l\'année en cours' },
    { type: 'Attestation de réussite', description: 'Certifie la validation de votre année' },
    { type: 'Attestation de présence', description: 'Certifie votre assiduité aux cours' },
    { type: 'Relevé de notes', description: 'Détail de toutes vos notes' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B00] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Attestations & Certificats</h1>
        <p className="text-slate-500 mt-1">Demandez et téléchargez vos documents officiels</p>
      </div>

      {/* Attestations disponibles à la demande */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Demander une attestation</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {availableTypes.map((item) => (
            <div key={item.type} className="border border-slate-200 rounded-lg p-4 hover:border-[#FF6B00] transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className="font-medium text-slate-900">{item.type}</h3>
                  <p className="text-sm text-slate-500 mt-1">{item.description}</p>
                </div>
                <button
                  onClick={() => requestCertificate(item.type)}
                  disabled={requesting === item.type}
                  className="flex-shrink-0 px-4 py-2 bg-[#FF6B00] text-white rounded-lg text-sm font-medium hover:bg-[#e55f00] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {requesting === item.type ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    'Demander'
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Historique des attestations */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Mes attestations</h2>
          <p className="text-sm text-slate-500 mt-1">Historique de vos demandes</p>
        </div>
        
        {certificates.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={48} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Aucune attestation demandée</p>
            <p className="text-sm text-slate-400 mt-1">Demandez votre première attestation ci-dessus</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {certificates.map((cert) => (
              <div key={cert.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-900">{cert.type}</h3>
                    <p className="text-sm text-slate-500">
                      Demandée le {new Date(cert.created_at).toLocaleDateString('fr-FR')}
                    </p>
                    {cert.status === 'rejected' && cert.rejection_reason && (
                      <p className="text-xs text-red-600 mt-1">Motif : {cert.rejection_reason}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(cert.status)}
                  {cert.status === 'approved' && (
                    <button
                      onClick={() => downloadCertificate(cert)}
                      disabled={downloading === cert.id}
                      className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors disabled:opacity-50"
                    >
                      {downloading === cert.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Download size={16} />
                      )}
                      Télécharger
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}