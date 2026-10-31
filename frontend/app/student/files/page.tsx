'use client';

import { useState, useEffect } from 'react';
import {
  Folder, FileText, Loader2, CheckCircle, AlertCircle, Eye, Download,
  IdCard, User, FileCheck, ShieldCheck, Building2, ExternalLink
} from 'lucide-react';
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
  { id: 'photo', label: "Photo d'identité", description: "Photo d'identité officielle", icon: User, required: false },
];

const RETURNING_STUDENT_DOCS = [
  { id: 'previous_transcript', label: "Relevé de notes N-1", description: "Relevé académique de l'année précédente", icon: FileText, required: true },
  { id: 'success_certificate', label: "Attestation de passage / réussite", description: "Décision du jury autorisant l'accès à l'année supérieure", icon: FileCheck, required: true },
  { id: 'financial_clearance', label: "Quitus financier / Solde scolarité", description: "Attestation prouvant le solde de la scolarité N-1", icon: FileText, required: true },
  { id: 'id_document', label: "Ancienne carte d'étudiant / CNI", description: "Carte d'étudiant ou pièce d'identité", icon: IdCard, required: false },
  { id: 'reenrollment_form', label: "Fiche de réinscription signée", description: "Formulaire officiel de réinscription", icon: FileText, required: false },
  { id: 'photo', label: "Photo d'identité", description: "Photo d'identité officielle", icon: User, required: false },
];

export default function StudentFilesPage() {
  const [files, setFiles] = useState<StudentFile[]>([]);
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Charger le profil de l'étudiant
      const profileRes = await api.get('/api/v1/students/me');
      setStudentInfo(profileRes.data);

      // Charger les fichiers archivés du dossier
      const filesRes = await api.get('/api/v1/students/me/files');
      setFiles(filesRes.data || []);
    } catch (error) {
      console.error('Erreur de chargement du dossier étudiant:', error);
    } finally {
      setLoading(false);
    }
  };

  const isReturning = studentInfo?.student_type === 'returning';
  const documentTypes = isReturning ? RETURNING_STUDENT_DOCS : NEW_STUDENT_DOCS;

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Enregistré (en vérification)' },
      complete: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Dossier complet' },
      validated: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Validé & Certifié conforme' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejeté par la scolarité' }
    };
    const config = configs[status] || configs.pending;
    return (
      <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' Ko';
    return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
  };

  const requiredCount = documentTypes.filter(t => t.required).length;
  const providedRequiredCount = documentTypes.filter(t => t.required && files.some(f => f.name === t.id || (t.id === 'id_document' && f.name === 'cni'))).length;
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
      {/* Header Institutionnel */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-5 sm:p-8 text-white shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center shrink-0 border border-white/15">
              <Folder size={24} className="text-amber-400" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Dossier Administratif Officiel</h1>
                <span className="text-[11px] sm:text-xs bg-white/15 px-2.5 py-0.5 rounded-full font-medium">
                  {isReturning ? '🔄 Réinscription (Ancien)' : '🎓 Première Inscription'}
                </span>
              </div>
              <p className="text-slate-300 text-xs sm:text-sm mt-1">
                Consultation et suivi de conformité des pièces académiques certifiées par la Scolarité
              </p>
            </div>
          </div>
          {studentInfo?.matricule && (
            <div className="text-left md:text-right pl-14 md:pl-0">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Matricule Étudiant</span>
              <p className="font-mono font-bold text-amber-400 text-base sm:text-xl">{studentInfo.matricule}</p>
            </div>
          )}
        </div>

        {/* Barre de complétion officielle */}
        <div className="bg-white/5 rounded-xl p-3.5 sm:p-4 backdrop-blur mt-4 border border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className="text-xs sm:text-sm font-medium text-slate-200">
              État de conformité : <strong>{providedRequiredCount} sur {requiredCount}</strong> pièces obligatoires enregistrées
            </span>
            <span className="text-base sm:text-lg font-bold text-amber-400">{completionRate}%</span>
          </div>
          <div className="w-full bg-slate-700/60 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${
                completionRate === 100 ? 'bg-emerald-400' : 'bg-amber-500'
              }`}
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Avertissement de sécurité et procédure de dépôt */}
      <div className="bg-amber-50/90 border border-amber-200/80 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-sm">
        <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
          <ShieldCheck size={20} className="text-amber-700" />
        </div>
        <div className="space-y-1">
          <p className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
            <span>Dépôt officiel des pièces au Secrétariat</span>
            <span className="text-xs font-normal text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">Procédure Sécurisée</span>
          </p>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Pour garantir l'authenticité et la valeur légale de vos attestations, <strong>seuls les agents habilités de la Scolarité et du Secrétariat sont autorisés à numériser et enregistrer vos documents originaux</strong>. Veuillez présenter vos originaux (ou copies certifiées) directement au guichet administratif.
          </p>
        </div>
      </div>

      {/* État général du dossier */}
      {studentInfo?.file_status === 'validated' ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle size={22} className="text-emerald-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-emerald-950 text-sm">Dossier Validé & Conforme 🎉</p>
            <p className="text-xs text-emerald-700 mt-0.5">
              L'ensemble de vos pièces a été vérifié, certifié conforme et validé par la Direction des Études.
            </p>
          </div>
        </div>
      ) : completionRate < 100 ? (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-3">
          <AlertCircle size={22} className="text-blue-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-blue-950 text-sm">Pièces justificatives requises</p>
            <p className="text-xs text-blue-700 mt-0.5">
              Il vous reste des pièces obligatoires à présenter au secrétariat académique pour finaliser votre dossier.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle size={22} className="text-indigo-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-indigo-950 text-sm">Toutes les pièces sont déposées</p>
            <p className="text-xs text-indigo-700 mt-0.5">
              Vos documents sont actuellement en cours de revue finale par les agents de la scolarité.
            </p>
          </div>
        </div>
      )}

      {/* Tableau des Pièces du Dossier (Consultation uniquement) */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <h2 className="font-bold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
            <FileText size={18} className="text-[#FF6B00]" />
            Inventaire des Pièces Académiques ({documentTypes.length})
          </h2>
          <span className="text-xs text-slate-500 font-medium">Mode Consultation</span>
        </div>
        
        <div className="divide-y divide-slate-100">
          {documentTypes.map((docType) => {
            const existingFile = files.find(f => f.name === docType.id || (docType.id === 'id_document' && f.name === 'cni'));
            const Icon = docType.icon;
            
            return (
              <div key={docType.id} className="p-4 sm:p-5 hover:bg-slate-50/60 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      existingFile ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                    }`}>
                      <Icon size={20} />
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-900 text-sm sm:text-base">{docType.label}</h3>
                        {docType.required ? (
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-full">
                            Obligatoire
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-medium rounded-full">
                            Facultatif
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{docType.description}</p>
                      
                      {existingFile ? (
                        <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                          <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {existingFile.filename} {existingFile.size ? `(${formatFileSize(existingFile.size)})` : ''}
                          </span>
                          {getStatusBadge(existingFile.status)}
                        </div>
                      ) : (
                        <p className="text-xs text-amber-700 font-medium pt-0.5 flex items-center gap-1">
                          <AlertCircle size={13} />
                          À présenter au guichet du secrétariat
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Action : Visualisation uniquement */}
                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                    {existingFile ? (
                      <a
                        href={`${API_BASE_URL}/${existingFile.path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors border border-slate-200"
                        title="Ouvrir le document certifié"
                      >
                        <Eye size={14} className="text-blue-600" />
                        <span>Consulter</span>
                        <ExternalLink size={12} className="text-slate-400 ml-0.5" />
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400 italic bg-slate-50 px-2.5 py-1 rounded border border-slate-200/60">
                        Non numérisé
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Information supplémentaire */}
      <div className="text-center py-4 text-xs text-slate-500">
        UniSphere AI • Système d'Information Académique Sécurisé • Contact Secrétariat : scolarite@unisphere.edu
      </div>
    </div>
  );
}
