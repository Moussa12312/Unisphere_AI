'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import {
  Camera, Upload, Check, X, Loader2, FileText,
  Image as ImageIcon, User, CheckCircle, AlertCircle,
  Trash2, Sparkles
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface Document {
  type: string;
  filename: string;
  path: string;
  size: number;
  content_type: string;
  uploaded_at: string;
  ocr_data?: any;
}

interface SessionInfo {
  token: string;
  university_name: string;
  university_logo: string | null;
  student_name: string;
  student_level: string | null;
  student_filiere: string | null;
  student_id: number | null;
  status: string;
  documents: Document[];
  expires_at: string;
}

const DOCUMENT_TYPES = [
  { id: 'cni', label: 'Carte d\'identité', icon: User, required: true },
  { id: 'birth_certificate', label: 'Acte de naissance', icon: FileText, required: true },
  { id: 'photo', label: 'Photo d\'identité', icon: ImageIcon, required: true },
  { id: 'bac', label: 'Baccalauréat', icon: FileText, required: false },
  { id: 'other', label: 'Autre document', icon: FileText, required: false },
];

export default function ScanSessionPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSession();
  }, [token]);

  const loadSession = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/v1/scan-sessions/${token}`);
      setSession(res.data);
      setError(null);
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Erreur de chargement';
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedType) return;
    
    setUploading(true);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', selectedType);
    
    try {
      const res = await api.post(`/api/v1/scan-sessions/${token}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success(`✅ ${DOCUMENT_TYPES.find(d => d.id === selectedType)?.label} ajouté !`);
      
      // Recharger la session
      await loadSession();
      setSelectedType(null);
      
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur d\'upload');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (index: number) => {
    if (!confirm('Supprimer ce document ?')) return;
    
    try {
      await api.delete(`/api/v1/scan-sessions/${token}/document/${index}`);
      toast.success('Document supprimé');
      await loadSession();
    } catch (err: any) {
      toast.error('Erreur de suppression');
    }
  };

  const handleComplete = async () => {
    if (!session || session.documents.length === 0) {
      toast.error('Veuillez ajouter au moins un document');
      return;
    }
    
    if (!confirm('Confirmer l\'envoi de tous les documents ?')) return;
    
    setCompleting(true);
    try {
      await api.post(`/api/v1/scan-sessions/${token}/complete`);
      toast.success('🎉 Documents envoyés avec succès !');
      await loadSession();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur');
    } finally {
      setCompleting(false);
    }
  };

  // Compter le temps restant
  const getTimeRemaining = () => {
    if (!session) return '';
    const expires = new Date(session.expires_at).getTime();
    const now = Date.now();
    const diff = expires - now;
    
    if (diff <= 0) return 'Expiré';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}min`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
        <Loader2 size={40} className="animate-spin text-[#FF6B00]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Session invalide</h2>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const isCompleted = session.status === 'completed';

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#FF6B00] to-amber-600 text-white p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <Sparkles size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold">{session.university_name}</h1>
            <p className="text-orange-100 text-sm">UniSphere AI - Session de scan</p>
          </div>
        </div>
        
        <div className="bg-white/10 backdrop-blur rounded-xl p-3 mt-3">
          <p className="text-xs text-orange-100">Dossier de</p>
          <p className="text-lg font-bold">{session.student_name}</p>
          {session.student_level && (
            <p className="text-sm text-orange-100">
              {session.student_level} {session.student_filiere && `- ${session.student_filiere}`}
            </p>
          )}
        </div>
        
        <div className="flex items-center justify-between mt-3 text-sm">
          <span className="text-orange-100">⏰ Expire dans</span>
          <span className="font-bold">{getTimeRemaining()}</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Message de succès */}
        {isCompleted && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-green-900">Documents envoyés avec succès !</p>
              <p className="text-sm text-green-700 mt-1">
                Vous pouvez fermer cette page. Les documents ont été ajoutés au dossier.
              </p>
            </div>
          </div>
        )}

        {/* Liste des documents */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <FileText size={18} className="text-[#FF6B00]" />
              Documents ({session.documents.length})
            </h2>
          </div>
          
          <div className="divide-y divide-slate-100">
            {DOCUMENT_TYPES.map((docType) => {
              const docs = session.documents.filter(d => d.type === docType.id);
              const Icon = docType.icon;
              
              return (
                <div key={docType.id} className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      docs.length > 0 ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'
                    }`}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{docType.label}</p>
                      {docType.required && (
                        <p className="text-xs text-red-500">Requis</p>
                      )}
                    </div>
                    {docs.length > 0 && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        {docs.length}
                      </span>
                    )}
                  </div>
                  
                  {/* Documents uploadés de ce type */}
                  {docs.map((doc, idx) => (
                    <div key={idx} className="ml-11 mt-2 flex items-center gap-2 bg-slate-50 rounded-lg p-2">
                      <ImageIcon size={14} className="text-slate-400" />
                      <span className="flex-1 text-xs text-slate-700 truncate">{doc.filename}</span>
                      {!isCompleted && (
                        <button
                          onClick={() => {
                            const globalIndex = session.documents.findIndex(d => d === doc);
                            handleDelete(globalIndex);
                          }}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  
                  {/* Bouton d'upload */}
                  {!isCompleted && (
                    <button
                      onClick={() => {
                        setSelectedType(docType.id);
                        setTimeout(() => cameraInputRef.current?.click(), 100);
                      }}
                      disabled={uploading}
                      className="ml-11 mt-2 flex items-center gap-2 px-3 py-2 bg-[#FF6B00]/10 hover:bg-[#FF6B00]/20 text-[#FF6B00] rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      <Camera size={14} />
                      {docs.length > 0 ? 'Ajouter un autre' : 'Scanner'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Input file cachés */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Bouton de finalisation */}
        {!isCompleted && session.documents.length > 0 && (
          <button
            onClick={handleComplete}
            disabled={completing}
            className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-2xl font-bold text-lg shadow-lg disabled:opacity-50"
          >
            {completing ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Check size={20} />
                Terminer et envoyer ({session.documents.length})
              </>
            )}
          </button>
        )}
      </div>

      {/* Modal upload en cours */}
      {uploading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 text-center">
            <Loader2 size={48} className="animate-spin text-[#FF6B00] mx-auto mb-4" />
            <p className="font-semibold text-slate-900">Upload en cours...</p>
            <p className="text-sm text-slate-500 mt-1">Analyse OCR automatique</p>
          </div>
        </div>
      )}
    </div>
  );
}