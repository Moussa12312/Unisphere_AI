'use client';
import { useState, useEffect, useRef } from 'react';
import {
  Folder, Upload, FileText, Image as ImageIcon, Trash2,
  Loader2, CheckCircle, AlertCircle, Eye, Download,
  IdCard, User, FileCheck, XCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useConfirm } from '@/hooks/useConfirm';

interface StudentFile {

  id: string;
  name: string;
  filename: string;
  path: string;
  size: number;
  status: string; // pending, validated, rejected
  uploaded_at: string;
}

const DOCUMENT_TYPES = [
  { id: 'cni', label: 'Carte d\'identité', icon: IdCard, required: true },
  { id: 'birth_certificate', label: 'Acte de naissance', icon: FileText, required: true },
  { id: 'photo', label: 'Photo d\'identité', icon: User, required: true },
  { id: 'bac', label: 'Diplôme du BAC', icon: FileCheck, required: false },
  { id: 'other', label: 'Autre document', icon: FileText, required: false },
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedType) return;
    
    // Vérifier la taille (max 10 Mo)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Le fichier est trop volumineux (max 10 Mo)');
      return;
    }
    
    // Vérifier le type
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
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
      
      toast.success(`✅ ${DOCUMENT_TYPES.find(d => d.id === selectedType)?.label} ajouté !`);
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
      validated: { bg: 'bg-green-100', text: 'text-green-700', label: 'Validé' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejeté' }
    };
    const config = configs[status] || configs.pending;
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const completionRate = Math.round(
    (DOCUMENT_TYPES.filter(t => t.required && files.some(f => f.name === t.id)).length / 
     DOCUMENT_TYPES.filter(t => t.required).length) * 100
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={40} className="animate-spin text-[#FF6B00]" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Folder size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Mon dossier étudiant</h1>
            <p className="text-green-100">
              Gérez vos documents administratifs
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="bg-white/10 rounded-xl p-4 backdrop-blur mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Complétion du dossier</span>
            <span className="text-lg font-bold">{completionRate}%</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div
              className="bg-white rounded-full h-2 transition-all"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Alertes */}
      {completionRate < 100 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900">Dossier incomplet</p>
            <p className="text-sm text-amber-700 mt-1">
              Veuillez compléter votre dossier en ajoutant tous les documents requis.
            </p>
          </div>
        </div>
      )}

      {completionRate === 100 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-green-900">Dossier complet</p>
            <p className="text-sm text-green-700 mt-1">
              Votre dossier est complet et en cours de validation par l'administration.
            </p>
          </div>
        </div>
      )}

      {/* Documents requis */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <FileText size={18} className="text-[#FF6B00]" />
            Documents requis
          </h2>
        </div>
        
        <div className="divide-y divide-slate-100">
          {DOCUMENT_TYPES.map((docType) => {
            const existingFile = files.find(f => f.name === docType.id);
            const Icon = docType.icon;
            const isUploading = uploading === docType.id;
            
            return (
              <div key={docType.id} className="p-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    existingFile ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'
                  }`}>
                    <Icon size={20} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-slate-900">{docType.label}</h3>
                      {docType.required && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                          Requis
                        </span>
                      )}
                    </div>
                    {existingFile ? (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-slate-500">
                          {existingFile.filename} ({formatFileSize(existingFile.size)})
                        </span>
                        {getStatusBadge(existingFile.status)}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">Document manquant</p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {existingFile && (
                      <>
                        <a
                          href={`${API_BASE_URL}/${existingFile.path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                          title="Voir le document"
                        >
                          <Eye size={16} />
                        </a>
                        <button
                          onClick={() => handleDelete(existingFile.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                          title="Supprimer"
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
                      className="flex items-center gap-1 px-3 py-2 bg-[#FF6B00] hover:bg-[#e55f00] text-white text-xs rounded-lg disabled:opacity-50"
                    >
                      {isUploading ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Upload size={14} />
                      )}
                      {existingFile ? 'Remplacer' : 'Ajouter'}
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
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Folder size={18} className="text-[#FF6B00]" />
              Historique des uploads ({files.length})
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Document</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Fichier</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Taille</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {files.map((file) => (
                  <tr key={file.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {DOCUMENT_TYPES.find(t => t.id === file.name)?.label || file.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-sm">{file.filename}</td>
                    <td className="px-4 py-3 text-slate-600 text-sm">{formatFileSize(file.size)}</td>
                    <td className="px-4 py-3 text-slate-600 text-sm">
                      {new Date(file.uploaded_at).toLocaleDateString('fr-FR')}
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