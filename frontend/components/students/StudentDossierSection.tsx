'use client';

import { useState, useEffect, useRef } from 'react';
import {
  FileText, CheckCircle2, AlertCircle, Download, Upload,
  RefreshCw, Check, Clock, AlertTriangle, ShieldCheck, Eye
} from 'lucide-react';
import api from '@/lib/api';
import { API_BASE_URL } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

interface DocumentItem {
  key: string;
  label: string;
  description: string;
  required: boolean;
  uploaded: boolean;
  path: string | null;
  download_url: string;
}

interface DossierData {
  student_id: number;
  student_name: string;
  student_type: 'new' | 'returning';
  student_type_label: string;
  file_status: string;
  completion_rate: number;
  required_count: number;
  uploaded_count: number;
  documents: DocumentItem[];
}

interface StudentDossierSectionProps {
  studentId: number | string;
  readOnly?: boolean;
  onUpdate?: () => void;
}

export default function StudentDossierSection({
  studentId,
  readOnly = false,
  onUpdate
}: StudentDossierSectionProps) {
  const toast = useToast();
  const [dossier, setDossier] = useState<DossierData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingDocKey, setUploadingDocKey] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedKeyForUpload, setSelectedKeyForUpload] = useState<string | null>(null);

  useEffect(() => {
    if (studentId) {
      loadDossier();
    }
  }, [studentId]);

  const loadDossier = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/v1/students/${studentId}/dossier`);
      const data = res.data;
      if (data) {
        const rawDocs = Array.isArray(data.documents)
          ? data.documents
          : (Array.isArray(data.checklist) ? data.checklist : []);
        
        // Normalize each document item so it has both key/code, uploaded/is_uploaded, and path/file_path
        const normalizedDocs: DocumentItem[] = rawDocs.map((item: any) => ({
          key: item.key || item.code || '',
          label: item.label || 'Document',
          description: item.description || '',
          required: Boolean(item.required),
          uploaded: Boolean(item.uploaded ?? item.is_uploaded),
          path: item.path || item.file_path || null,
          download_url: item.download_url || `/api/v1/students/${studentId}/dossier/download/${item.key || item.code}`
        }));

        setDossier({
          ...data,
          student_type: data.student_type || 'new',
          student_type_label: data.student_type_label || (data.student_type === 'returning' ? 'Ancien Étudiant (Réinscription)' : 'Nouvel Étudiant (Inscription)'),
          file_status: data.file_status || 'incomplete',
          completion_rate: typeof data.completion_rate === 'number' ? data.completion_rate : 0,
          required_count: typeof data.required_count === 'number' ? data.required_count : 0,
          uploaded_count: typeof data.uploaded_count === 'number' ? data.uploaded_count : 0,
          documents: normalizedDocs
        });
      } else {
        setDossier(null);
      }
    } catch (err: any) {
      console.error('Erreur chargement dossier:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerUpload = (key: string) => {
    setSelectedKeyForUpload(key);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedKeyForUpload) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Le fichier ne doit pas dépasser 10MB');
      return;
    }

    try {
      setUploadingDocKey(selectedKeyForUpload);
      const formData = new FormData();
      formData.append('document_type', selectedKeyForUpload);
      formData.append('doc_type', selectedKeyForUpload);
      formData.append('file', file);

      await api.post(`/api/v1/students/${studentId}/dossier/upload`, formData);
      toast.success('Document téléversé avec succès !');
      await loadDossier();
      if (onUpdate) onUpdate();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur lors du téléversement');
    } finally {
      setUploadingDocKey(null);
      setSelectedKeyForUpload(null);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      setStatusUpdating(true);
      await api.patch(`/api/v1/students/${studentId}/dossier/status`, {
        status: newStatus
      });
      toast.success(`Statut du dossier mis à jour : ${newStatus}`);
      await loadDossier();
      if (onUpdate) onUpdate();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la mise à jour du statut');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleDownload = async (doc: DocumentItem) => {
    try {
      const response = await api.get(doc.download_url, {
        responseType: 'blob'
      });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', `${doc.key}_etudiant_${studentId}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      toast.error('Erreur lors du téléchargement du fichier');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-3">
          <RefreshCw size={18} className="animate-spin text-[#FF6B00]" />
          <span className="text-sm text-slate-500">Chargement du dossier administratif...</span>
        </div>
      </div>
    );
  }

  if (!dossier) return null;

  const isReturning = dossier.student_type === 'returning';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,image/*"
        className="hidden"
      />

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText size={20} className="text-[#FF6B00]" />
            <h3 className="text-base font-bold text-slate-900">
              Dossier d'inscription & Pièces administratives
            </h3>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                isReturning
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-orange-100 text-[#FF6B00]'
              }`}
            >
              {dossier.student_type_label}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isReturning
              ? 'Contrôle des pièces requises pour la réinscription académique'
              : 'Contrôle des pièces requises pour la première inscription (L1 / Transfert)'}
          </p>
        </div>

        {/* Global status badge and actions */}
        <div className="flex items-center gap-2">
          {dossier.file_status === 'validated' && (
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold flex items-center gap-1.5">
              <ShieldCheck size={14} /> Dossier Validé
            </span>
          )}
          {dossier.file_status === 'complete' && (
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold flex items-center gap-1.5">
              <CheckCircle2 size={14} /> Dossier Complet
            </span>
          )}
          {dossier.file_status === 'incomplete' && (
            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold flex items-center gap-1.5">
              <AlertCircle size={14} /> Dossier Incomplet
            </span>
          )}

          {!readOnly && (
            <div className="flex items-center gap-1 ml-2">
              {dossier.file_status !== 'validated' ? (
                <button
                  type="button"
                  disabled={statusUpdating}
                  onClick={() => handleStatusChange('validated')}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
                  title="Valider définitivement ce dossier"
                >
                  <ShieldCheck size={13} /> Valider
                </button>
              ) : (
                <button
                  type="button"
                  disabled={statusUpdating}
                  onClick={() => handleStatusChange('complete')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                >
                  Dé-valider
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Completion bar */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-semibold text-slate-700">Taux de complétude du dossier</span>
          <span className="font-bold text-[#FF6B00]">
            {dossier.uploaded_count} / {dossier.required_count} pièces requises fournies ({dossier.completion_rate}%)
          </span>
        </div>
        <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              dossier.completion_rate === 100
                ? 'bg-green-500'
                : dossier.completion_rate >= 50
                ? 'bg-[#FF6B00]'
                : 'bg-amber-500'
            }`}
            style={{ width: `${dossier.completion_rate}%` }}
          />
        </div>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(dossier.documents || []).map((doc) => (
          <div
            key={doc.key}
            className={`p-4 rounded-xl border transition-all ${
              doc.uploaded
                ? 'border-green-200 bg-green-50/30'
                : doc.required
                ? 'border-amber-200 bg-amber-50/20'
                : 'border-slate-200 bg-slate-50/30'
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      doc.required
                        ? 'bg-red-100 text-red-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {doc.required ? 'Obligatoire *' : 'Optionnel'}
                  </span>
                  {doc.uploaded ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                      <CheckCircle2 size={12} /> Fourni
                    </span>
                  ) : (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                      <AlertCircle size={12} /> Manquant
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-bold text-slate-900 mt-1">{doc.label}</h4>
                <p className="text-xs text-slate-500 mt-0.5">{doc.description}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-200/60 text-xs">
              {doc.uploaded ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownload(doc)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                  >
                    <Download size={13} /> Télécharger
                  </button>
                  {!readOnly && (
                    <button
                      type="button"
                      disabled={uploadingDocKey === doc.key}
                      onClick={() => handleTriggerUpload(doc.key)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
                      title="Remplacer par un nouveau fichier"
                    >
                      <Upload size={12} /> Remplacer
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 w-full justify-between">
                  <span className="text-xs text-amber-700 font-medium">Document non transmis</span>
                  {!readOnly && (
                    <button
                      type="button"
                      disabled={uploadingDocKey === doc.key}
                      onClick={() => handleTriggerUpload(doc.key)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg font-medium transition-colors"
                    >
                      {uploadingDocKey === doc.key ? (
                        <>
                          <RefreshCw size={12} className="animate-spin" /> Envoi...
                        </>
                      ) : (
                        <>
                          <Upload size={13} /> Joindre ce fichier
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
