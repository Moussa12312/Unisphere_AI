'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Folder, Upload, FileText, Image as ImageIcon, Trash2,
  Loader2, CheckCircle, AlertCircle, Eye, Download,
  IdCard, User, FileCheck, XCircle, GraduationCap, RefreshCw
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useConfirm } from '@/hooks/useConfirm';
import api, { API_BASE_URL } from '@/lib/api';

interface StudentFile {
  id: string;
  name: string;
  filename: string;
  path: string;
  size: number;
  status: string; // pending, validated, rejected
  uploaded_at: string;
}

const NEW_STUDENT_DOCS = [
  { id: 'birth_certificate', label: "Acte de naissance", description: "Extrait officiel ou acte légalisé", icon: FileText, required: true },
  { id: 'bac_diploma', label: "Diplôme / Attestation du Bac", description: "Attestation de réussite ou diplôme officiel", icon: FileCheck, required: true },
  { id: 'bac_transcript', label: "Relevé de notes du Bac", description: "Relevé de notes officiel de l'examen", icon: FileText, required: true },
  { id: 'id_document', label: "Pièce d'identité (CNI / Passeport)", description: "Carte nationale d'identité ou passeport", icon: IdCard, required: true },
  { id: 'medical_certificate', label: "Certificat médical d'aptitude", description: "Certificat d'aptitude physique délivré par un médecin", icon: FileText, required: false },
  { id: 'photo', label: "Photo d'identité", description: "Photo d'identité récente", icon: User, required: false },
];

const RETURNING_STUDENT_DOCS = [
  { id: 'previous_transcript', label: "Relevé de notes N-1", description: "Relevé académique de l'année précédente", icon: FileText, required: true },
  { id: 'success_certificate', label: "Attestation de passage / réussite", description: "Décision du jury autorisant l'accès à l'année supérieure", icon: FileCheck, required: true },
  { id: 'financial_clearance', label: "Quitus financier / Solde scolarité", description: "Attestation prouvant le solde de la scolarité N-1", icon: FileText, required: true },
  { id: 'id_document', label: "Ancienne carte d'étudiant / CNI", description: "Carte d'étudiant ou pièce d'identité", icon: IdCard, required: false },
  { id: 'reenrollment_form', label: "Fiche de réinscription signée", description: "Formulaire officiel de réinscription", icon: FileText, required: false },
  { id: 'photo', label: "Photo d'identité", description: "Photo d'identité à jour", icon: User, required: false },
];

export default function StudentFilesPage() {
  const [files, setFiles] = useState<StudentFile[]>([]);
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Charger les infos de l'étudiant
      const profileRes = await api.get('/api/v1/students/me');
      setStudentInfo(profileRes.data);
      
      // Charger les fichiers du dossier
      const filesRes = await api.get('/api/v1/students/me/files');
      setFiles(filesRes.data || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const isReturning = studentInfo?.student_type === 'returning';
  const documentTypes = isReturning ? RETURNING_STUDENT_DOCS : NEW_STUDENT_DOCS;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedType) return;
    
    // Vérifier la taille (max 10 Mo)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Le fichier est trop volumineux (max 10 Mo)');
      return;
    }
    
    // Vérifier le type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Format non supporté. Utilisez JPG, PNG ou PDF.');
      return;
    }
    
    setUploading(selectedType);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', selectedType);
    
    try {
      await api.post('/api/v1/students/me/files', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const docLabel = documentTypes.find(d => d.id === selectedType)?.label || selectedType;
      toast.success(`✅ ${docLabel} ajouté !`);
      await loadData();
      setSelectedType(null);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur d\'upload');
    } finally {
      setUploading(null);
    }
  };

  const confirmModal = useConfirm();

  const handleDelete = async (fileId: string) => {
    const ok = await confirmModal({
      title: 'Supprimer ce document ?',
      message: 'Voulez-vous vraiment supprimer ce document de votre dossier ?',
      confirmText: 'Supprimer',
      variant: 'danger',
      icon: 'trash'
    });
    if (!ok) return;

    try {
      await api.delete(`/api/v1/students/me/files/${fileId}`);
      toast.success('Document supprimé avec succès');
      await loadData();
    } catch (error) {
      toast.error('Erreur de suppression');
    }
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'En attente de validation' },
      complete: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Dossier complet' },
      validated: { bg: 'bg-green-100', text: 'text-green-700', label: 'Validé par l\'administration' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejeté' }
    };
    const config = configs[status] || configs.pending;
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const requiredCount = documentTypes.filter(t => t.required).length;
  const providedRequiredCount = documentTypes.filter(t => t.required && files.some(f => f.name === t.id)).length;
  const completionRate = requiredCount > 0 ? Math.round((providedRequiredCount / requiredCount) * 100) : 100;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={40} className="animate-spin text-[#FF6B00]" />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-slate-900 rounded-2xl p-4 sm:p-8 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
              <Folder size={22} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold">Mon dossier administratif</h1>
                <span className="text-[11px] sm:text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-semibold">
                  {isReturning ? '🔄 Ancien Étudiant (Réinscription)' : '🎓 Nouvel Étudiant'}
                </span>
              </div>
              <p className="text-emerald-100 text-xs sm:text-sm mt-0.5">
                {isReturning 
                  ? 'Transmettez vos pièces requises pour valider votre réinscription'
                  : 'Transmettez l\'ensemble des pièces nécessaires à la validation définitive de votre inscription'}
              </p>
            </div>
          </div>
          {studentInfo?.matricule && (
            <div className="text-left md:text-right pl-13 md:pl-0">
              <span className="text-[11px] text-emerald-200">Matricule</span>
              <p className="font-mono font-bold text-white text-base sm:text-lg">{studentInfo.matricule}</p>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="bg-white/10 rounded-xl p-3 sm:p-4 backdrop-blur mt-4 border border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className="text-xs sm:text-sm font-medium">Complétion ({providedRequiredCount} / {requiredCount} pièces obligatoires)</span>
            <span className="text-base sm:text-lg font-bold">{completionRate}%</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${
                completionRate === 100 ? 'bg-green-400' : 'bg-[#FF6B00]'
              }`}
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Alertes d'état */}
      {studentInfo?.file_status === 'validated' ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-green-900">Dossier Validé par l'Administration 🎉</p>
            <p className="text-sm text-green-700 mt-1">
              Félicitations, l'ensemble de vos documents a été vérifié et validé définitivement par la scolarité.
            </p>
          </div>
        </div>
      ) : completionRate < 100 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900">Dossier incomplet</p>
            <p className="text-sm text-amber-700 mt-1">
              Veuillez téléverser tous les documents signalés comme <strong>Requis</strong> pour permettre à la scolarité d'instruire votre inscription.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-900">Dossier complet en attente de vérification</p>
            <p className="text-sm text-blue-700 mt-1">
              Tous vos documents obligatoires ont bien été transmis. L'administration procède actuellement à leur validation.
            </p>
          </div>
        </div>
      )}

      {/* Documents requis */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <FileText size={18} className="text-[#FF6B00]" />
            Pièces du dossier ({documentTypes.length})
          </h2>
          <span className="text-xs text-slate-500">Formats acceptés : PDF, JPG, PNG (max 10 Mo)</span>
        </div>
        
        <div className="divide-y divide-slate-100">
          {documentTypes.map((docType) => {
            const existingFile = files.find(f => f.name === docType.id || (docType.id === 'id_document' && f.name === 'cni'));
            const Icon = docType.icon;
            const isUploading = uploading === docType.id;
            
            return (
              <div key={docType.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    existingFile ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'
                  }`}>
                    <Icon size={20} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900">{docType.label}</h3>
                      {docType.required ? (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[11px] font-bold rounded-full">
                          Obligatoire *
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[11px] font-medium rounded-full">
                          Optionnel
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{docType.description}</p>
                    {existingFile ? (
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-xs text-slate-600 font-mono bg-slate-100 px-2 py-0.5 rounded">
                          {existingFile.filename} ({formatFileSize(existingFile.size)})
                        </span>
                        {getStatusBadge(existingFile.status)}
                      </div>
                    ) : (
                      <p className="text-xs text-amber-600 font-medium mt-1">⚠️ Pièce manquante à fournir</p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {existingFile && (
                      <>
                        <a
                          href={`${API_BASE_URL}/${existingFile.path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Visualiser le fichier"
                        >
                          <Eye size={16} />
                        </a>
                        <button
                          onClick={() => handleDelete(existingFile.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer ce fichier"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                    
                    <button
                      onClick={() => {
                        setSelectedType(docType.id);
                        setTimeout(() => fileInputRef.current?.click(), 100);
                      }}
                      disabled={isUploading}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-[#FF6B00] hover:bg-[#e55f00] text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors shadow-sm"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 size={13} className="animate-spin" />
                          Envoi...
                        </>
                      ) : (
                        <>
                          <Upload size={13} />
                          {existingFile ? 'Remplacer' : 'Téléverser'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Input file caché */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Historique des uploads */}
      {files.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Folder size={18} className="text-[#FF6B00]" />
              Fichiers transmis ({files.length})
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-[640px] w-full">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Document</th>
                  <th className="px-4 py-3 text-left">Nom du fichier</th>
                  <th className="px-4 py-3 text-left">Taille</th>
                  <th className="px-4 py-3 text-left">Date d'envoi</th>
                  <th className="px-4 py-3 text-left">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {files.map((file) => (
                  <tr key={file.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {documentTypes.find(t => t.id === file.name)?.label || file.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">{file.filename}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{formatFileSize(file.size)}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {new Date(file.uploaded_at).toLocaleDateString('fr-FR')} à {new Date(file.uploaded_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(file.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}