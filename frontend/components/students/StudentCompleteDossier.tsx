'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  User, GraduationCap, FileText, CreditCard, Shield, Clock,
  ArrowLeft, Edit, Trash2, Key, Download, CheckCircle, AlertCircle,
  Calendar, Award, Phone, Mail, MapPin, Printer, Camera, Eye,
  RefreshCw, Check, Loader2, Sparkles, BookOpen, Layers
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/hooks/useConfirm';
import { getMediaUrl } from '@/lib/api';
import StudentDossierSection from '@/components/students/StudentDossierSection';

interface StudentCompleteDossierProps {
  studentId: string;
  role: 'admin' | 'secretary';
}

function formatFCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(amount || 0)) + ' FCFA';
}

export default function StudentCompleteDossier({ studentId, role }: StudentCompleteDossierProps) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();

  const [activeTab, setActiveTab] = useState<'coord' | 'grades' | 'bulletins' | 'financials' | 'documents' | 'attendance'>('coord');
  const [loading, setLoading] = useState(true);
  const [dossier, setDossier] = useState<any>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null);

  // Modales admin
  const [showResetPass, setShowResetPass] = useState(false);
  const [resettingPass, setResettingPass] = useState(false);
  const [generatedPass, setGeneratedPass] = useState<string | null>(null);

  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [savingDiscount, setSavingDiscount] = useState(false);
  const [discountForm, setDiscountForm] = useState({
    discount_amount: '',
    discount_percentage: '',
    discount_reason: '',
    discount_approved_by: ''
  });

  const [showPlanModal, setShowPlanModal] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [planForm, setPlanForm] = useState({
    payment_plan: 'tranches',
    monthly_deposit: '',
    monthly_installment: '',
    monthly_months_count: '5'
  });

  useEffect(() => {
    loadDossier();
  }, [studentId]);

  const loadDossier = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/v1/students/${studentId}/complete-dossier`);
      setDossier(res.data);
      if (res.data?.student) {
        setDiscountForm({
          discount_amount: String(res.data.student.discount_amount || ''),
          discount_percentage: String(res.data.student.discount_percentage || ''),
          discount_reason: res.data.student.discount_reason || '',
          discount_approved_by: res.data.student.discount_approved_by || ''
        });
        setPlanForm({
          payment_plan: res.data.student.payment_plan || 'tranches',
          monthly_deposit: String(res.data.student.monthly_deposit || ''),
          monthly_installment: String(res.data.student.monthly_installment || ''),
          monthly_months_count: String(res.data.student.monthly_months_count || '5')
        });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur lors du chargement de la fiche étudiant');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fd = new FormData();
    fd.append('file', file);

    setUploadingPhoto(true);
    try {
      const res = await api.post(`/api/v1/students/${studentId}/photo`, fd);
      toast.success(res.data?.message || 'Photo mise à jour avec succès');
      loadDossier();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Échec de l'envoi de la photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleResetPassword = async () => {
    setResettingPass(true);
    try {
      const res = await api.post(`/api/v1/students/${studentId}/reset-password`);
      setGeneratedPass(res.data.new_password);
      setShowResetPass(true);
      toast.success('Mot de passe réinitialisé');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur réinitialisation mot de passe');
    } finally {
      setResettingPass(false);
    }
  };

  const handleDeleteStudent = async () => {
    const ok = await confirm({
      title: 'Supprimer cet étudiant ?',
      message: 'Cette action supprimera définitivement le dossier académique et les pièces justificatives.',
      confirmText: 'Supprimer définitivement',
      variant: 'danger'
    });
    if (!ok) return;

    try {
      await api.delete(`/api/v1/students/${studentId}`);
      toast.success('Étudiant supprimé avec succès');
      router.push(`/${role}/students`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la suppression');
    }
  };

  const handleDownloadBlob = async (url: string, filename: string) => {
    setDownloadingDoc(filename);
    try {
      const res = await api.get(url, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
      toast.success('Document téléchargé');
    } catch (err: any) {
      toast.error('Erreur lors du téléchargement du document');
    } finally {
      setDownloadingDoc(null);
    }
  };

  const handleSaveDiscount = async () => {
    setSavingDiscount(true);
    try {
      await api.patch(`/api/v1/students/${studentId}/discount`, {
        discount_amount: discountForm.discount_amount ? parseFloat(discountForm.discount_amount) : 0,
        discount_percentage: discountForm.discount_percentage ? parseFloat(discountForm.discount_percentage) : 0,
        discount_reason: discountForm.discount_reason || null,
        discount_approved_by: discountForm.discount_approved_by || null
      });
      toast.success('Réduction enregistrée avec succès');
      setShowDiscountModal(false);
      loadDossier();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Erreur d'enregistrement de la réduction");
    } finally {
      setSavingDiscount(false);
    }
  };

  const handleSavePlan = async () => {
    setSavingPlan(true);
    try {
      await api.patch(`/api/v1/students/${studentId}/payment-plan`, {
        payment_plan: planForm.payment_plan,
        monthly_deposit: planForm.monthly_deposit ? parseFloat(planForm.monthly_deposit) : null,
        monthly_installment: planForm.monthly_installment ? parseFloat(planForm.monthly_installment) : null,
        monthly_months_count: planForm.monthly_months_count ? parseInt(planForm.monthly_months_count) : 5
      });
      toast.success('Plan de paiement mis à jour');
      setShowPlanModal(false);
      loadDossier();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Erreur mise à jour plan de paiement");
    } finally {
      setSavingPlan(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <Loader2 className="animate-spin text-[#FF6B00]" size={40} />
        <p className="text-slate-500 mt-3 text-sm">Chargement du dossier complet de l'étudiant...</p>
      </div>
    );
  }

  if (!dossier || !dossier.student) {
    return (
      <div className="p-8 text-center max-w-lg mx-auto">
        <AlertCircle size={48} className="text-red-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-800">Dossier introuvable</h2>
        <p className="text-slate-500 text-sm mt-1">L'étudiant demandé n'existe pas ou vous n'y avez pas accès.</p>
        <Link href={`/${role}/students`} className="inline-block mt-4 px-4 py-2 bg-[#FF6B00] text-white rounded-xl text-sm font-semibold">
          Retour à la liste des étudiants
        </Link>
      </div>
    );
  }

  const { student, financials, academics, attendance, card } = dossier;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Barre de retour et actions rapides */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/${role}/students`}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>{student.first_name} {student.last_name}</span>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {student.matricule}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              🎓 {student.filiere} • {student.level} • Promo {student.academic_year || '2025-2026'}
            </p>
          </div>
        </div>

        {/* Boutons d'action pour le rôle */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/${role}/students/${studentId}/edit`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all"
          >
            <Edit size={14} /> Modifier
          </Link>

          <button
            onClick={handleResetPassword}
            disabled={resettingPass}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold transition-all"
          >
            {resettingPass ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />} Réinitialiser mot de passe
          </button>

          <button
            onClick={handleDeleteStudent}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-semibold transition-all"
          >
            <Trash2 size={14} /> Supprimer
          </button>
        </div>
      </div>

      {/* Barre de navigation par onglets (360°) */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-2 scrollbar-none text-sm font-medium">
        <button
          onClick={() => setActiveTab('coord')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all ${
            activeTab === 'coord'
              ? 'bg-[#FF6B00] text-white shadow-md shadow-orange-500/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <User size={16} /> Coordonnées & Scolarité
        </button>

        <button
          onClick={() => setActiveTab('grades')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all ${
            activeTab === 'grades'
              ? 'bg-[#FF6B00] text-white shadow-md shadow-orange-500/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <GraduationCap size={16} /> Notes & Évaluations
        </button>

        <button
          onClick={() => setActiveTab('bulletins')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all ${
            activeTab === 'bulletins'
              ? 'bg-[#FF6B00] text-white shadow-md shadow-orange-500/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText size={16} /> Bulletins & Relevés
        </button>

        <button
          onClick={() => setActiveTab('financials')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all ${
            activeTab === 'financials'
              ? 'bg-[#FF6B00] text-white shadow-md shadow-orange-500/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CreditCard size={16} /> Paiements, Tranches & Reçus
        </button>

        <button
          onClick={() => setActiveTab('documents')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all ${
            activeTab === 'documents'
              ? 'bg-[#FF6B00] text-white shadow-md shadow-orange-500/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Shield size={16} /> Documents Officiels, Carte & Pièces
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all ${
            activeTab === 'attendance'
              ? 'bg-[#FF6B00] text-white shadow-md shadow-orange-500/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Clock size={16} /> Présences & Assiduité
        </button>
      </div>

      {/* CONTENU DES ONGLETS */}

      {/* ONGLET 1: COORDONNÉES & SCOLARITÉ */}
      {activeTab === 'coord' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Carte Profil & Photo */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col items-center text-center">
            <div className="relative group mb-4">
              <div className="w-28 h-28 rounded-2xl overflow-hidden border-2 border-slate-200 bg-slate-100 flex items-center justify-center">
                {student.photo ? (
                  <img
                    src={getMediaUrl(student.photo)}
                    alt="Photo"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(student.first_name || '')}+${encodeURIComponent(student.last_name || '')}&background=FF6B00&color=fff&size=128`;
                    }}
                  />
                ) : (
                  <User size={48} className="text-slate-400" />
                )}
              </div>
              <label className="absolute bottom-0 right-0 p-2 bg-[#FF6B00] text-white rounded-xl shadow-md cursor-pointer hover:bg-orange-600 transition-colors">
                {uploadingPhoto ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
              </label>
            </div>

            <h3 className="font-bold text-lg text-slate-900">{student.first_name} {student.last_name}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{student.email || 'Aucun email'}</p>

            <div className="w-full mt-6 pt-6 border-t border-slate-100 space-y-3 text-left text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Statut inscription :</span>
                <span className="px-2 py-0.5 rounded-full font-semibold bg-green-50 text-green-700 border border-green-200">
                  {student.status || 'Actif'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Date inscription :</span>
                <span className="font-medium text-slate-700">{student.enrollment_date || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Téléphone étudiant :</span>
                <span className="font-medium text-slate-700">{student.phone || 'Non renseigné'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Date de naissance :</span>
                <span className="font-medium text-slate-700">{student.date_of_birth || 'Non renseignée'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Lieu de naissance :</span>
                <span className="font-medium text-slate-700">{student.place_of_birth || 'Non renseigné'}</span>
              </div>
            </div>
          </div>

          {/* Informations Parents & Tuteur */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs lg:col-span-2 space-y-6">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-4">
                <Phone size={16} className="text-[#FF6B00]" /> Coordonnées Parents / Tuteur
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block mb-1">Nom du tuteur / parent</span>
                  <span className="font-semibold text-slate-800 text-sm">{student.parent_name || 'Non renseigné'}</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block mb-1">Téléphone parent</span>
                  <span className="font-semibold text-slate-800 text-sm">{student.parent_phone || 'Non renseigné'}</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block mb-1">Email parent</span>
                  <span className="font-semibold text-slate-800 text-sm">{student.parent_email || 'Non renseigné'}</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block mb-1">Adresse de résidence</span>
                  <span className="font-semibold text-slate-800 text-sm">{student.address || 'Non renseignée'}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-4">
                <GraduationCap size={16} className="text-[#FF6B00]" /> Parcours Académique
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block mb-1">Filière</span>
                  <span className="font-semibold text-slate-800 text-sm">{student.filiere}</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block mb-1">Niveau</span>
                  <span className="font-semibold text-slate-800 text-sm">{student.level}</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block mb-1">Domaine</span>
                  <span className="font-semibold text-slate-800 text-sm">{student.domain || 'Général'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ONGLET 2: NOTES & ÉVALUATIONS */}
      {activeTab === 'grades' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-400">Moyenne Générale (GPA)</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{academics?.gpa != null ? `${academics.gpa} / 20` : 'N/A'}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-400">Crédits validés</span>
              <p className="text-2xl font-bold text-green-600 mt-1">{academics?.credits_earned || 0} / {academics?.credits_total || 60}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-400">Évaluations renseignées</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{academics?.grades?.length || 0}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Tableau des Notes</h3>
              {role === 'secretary' && (
                <Link href="/secretary/grades/entry" className="text-xs font-semibold text-[#FF6B00] hover:underline">
                  Aller à la saisie des notes →
                </Link>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Cours / Module</th>
                    <th className="py-3 px-4">Session</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Note</th>
                    <th className="py-3 px-4">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {!academics?.grades || academics.grades.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">Aucune note enregistrée pour cet étudiant</td>
                    </tr>
                  ) : (
                    academics.grades.map((g: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-semibold text-slate-800">{g.course_name || g.course_code}</td>
                        <td className="py-3 px-4 text-slate-600">{g.session_name || 'Ordinaire'}</td>
                        <td className="py-3 px-4 text-slate-500">{g.grade_type || 'Examen'}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{g.grade != null ? `${g.grade} / 20` : '-'}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full font-semibold ${
                            (g.grade ?? 0) >= 10 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {(g.grade ?? 0) >= 10 ? 'Validé' : 'Non validé'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ONGLET 3: BULLETINS & RELEVÉS */}
      {activeTab === 'bulletins' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#FF6B00] flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Bulletin LMD Portrait</h4>
                  <p className="text-xs text-slate-400">Format officiel certifié</p>
                </div>
              </div>
              <button
                onClick={() => handleDownloadBlob(`/api/v1/report-cards/generate-pdf/${studentId}`, `bulletin_portrait_${student.matricule}.pdf`)}
                disabled={!!downloadingDoc}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <Download size={14} /> Télécharger Bulletin Portrait
              </button>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Bulletin LMD Paysage</h4>
                  <p className="text-xs text-slate-400">Grille semestrielle détaillée</p>
                </div>
              </div>
              <button
                onClick={() => handleDownloadBlob(`/api/v1/report-cards/generate-report-card-landscape/${studentId}`, `bulletin_paysage_${student.matricule}.pdf`)}
                disabled={!!downloadingDoc}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <Download size={14} /> Télécharger Bulletin Paysage
              </button>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Award size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Relevé de Notes Officiel</h4>
                  <p className="text-xs text-slate-400">Document avec signature & cachet</p>
                </div>
              </div>
              <button
                onClick={() => handleDownloadBlob(`/api/v1/documents/generate-transcript/${studentId}`, `releve_notes_${student.matricule}.pdf`)}
                disabled={!!downloadingDoc}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <Download size={14} /> Télécharger Relevé Officiel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ONGLET 4: PAIEMENTS, TRANCHES & REÇUS */}
      {activeTab === 'financials' && (
        <div className="space-y-6">
          {/* Alerte non configuré */}
          {financials?.is_configured === false && (
            <div className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-xl">
              <div className="flex items-center gap-2">
                <AlertCircle className="text-amber-600" size={18} />
                <p className="text-xs text-amber-800 font-medium">
                  Les frais de scolarité pour le niveau <strong>{student.level}</strong> et le domaine <strong>{student.domain || student.filiere}</strong> ne sont pas encore configurés dans les paramètres de l'établissement.
                </p>
              </div>
            </div>
          )}

          {/* KPIs Financiers */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-400">Scolarité totale</span>
              <p className="text-xl font-bold text-slate-900 mt-1">{formatFCFA(financials?.total_amount || 0)}</p>
              {financials?.discount_amount > 0 && (
                <span className="text-[10px] text-green-600">Réduction : -{formatFCFA(financials.discount_amount)}</span>
              )}
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-400">Total versé</span>
              <p className="text-xl font-bold text-green-600 mt-1">{formatFCFA(financials?.total_paid || 0)}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-400">Reste à payer</span>
              <p className={`text-xl font-bold mt-1 ${financials?.total_remaining > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {formatFCFA(financials?.total_remaining || 0)}
              </p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-400">Statut du dossier</span>
              <p className="text-base font-bold text-slate-800 mt-1">
                {financials?.status === 'paid' ? '✅ Soldé' : financials?.status === 'partial' ? '🟠 Partiel' : '🔴 Impayé'}
              </p>
            </div>
          </div>

          {/* Actions admin réductions et tranches */}
          {role === 'admin' && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowDiscountModal(true)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                Gérer Bourse & Réduction
              </button>
              <button
                onClick={() => setShowPlanModal(true)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                Gérer Plan de paiement
              </button>
            </div>
          )}

          {/* Documents financiers téléchargeables */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => handleDownloadBlob(`/api/v1/documents/generate-financial-statement/${studentId}`, `releve_financier_${student.matricule}.pdf`)}
              disabled={!!downloadingDoc}
              className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 flex items-center justify-center gap-2"
            >
              <Download size={14} /> Télécharger Relevé Financier PDF
            </button>
            <button
              onClick={() => handleDownloadBlob(`/api/v1/documents/generate-payment-certificate/${studentId}`, `attestation_paiement_${student.matricule}.pdf`)}
              disabled={!!downloadingDoc}
              className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 flex items-center justify-center gap-2"
            >
              <Download size={14} /> Attestation de Paiement PDF
            </button>
            <button
              onClick={() => handleDownloadBlob(`/api/v1/financials/students/${studentId}/quitus-pdf`, `quitus_financier_${student.matricule}.pdf`)}
              disabled={!!downloadingDoc}
              className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 flex items-center justify-center gap-2"
            >
              <Download size={14} /> Quitus Financier PDF
            </button>
          </div>

          {/* Tableau historique des paiements avec reçu direct */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Historique des Versements Reçus</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Méthode</th>
                    <th className="py-3 px-4">Montant</th>
                    <th className="py-3 px-4">Reçu Officiel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {!financials?.payments || financials.payments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">Aucun versement enregistré pour le moment</td>
                    </tr>
                  ) : (
                    financials.payments.map((p: any) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 text-slate-600">{p.payment_date || p.created_at?.split('T')?.[0] || '-'}</td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{p.payment_type}</td>
                        <td className="py-3 px-4 text-slate-500">{p.payment_method}</td>
                        <td className="py-3 px-4 font-bold text-green-600">{formatFCFA(p.amount)}</td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleDownloadBlob(`/api/v1/documents/generate-receipt/${p.id}`, `recu_paiement_${p.id}.pdf`)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold"
                          >
                            <Printer size={12} /> Reçu PDF
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ONGLET 5: DOCUMENTS OFFICIELS, CARTE & PIÈCES */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          {/* Actes officiels 1-clic */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="font-bold text-slate-900 text-sm mb-4">Générer les Actes Officiels</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => handleDownloadBlob(`/api/v1/documents/generate-enrollment-certificate/${studentId}`, `attestation_scolarite_${student.matricule}.pdf`)}
                className="p-3 text-left border border-slate-200 rounded-xl hover:border-[#FF6B00] transition-colors"
              >
                <FileText size={16} className="text-[#FF6B00] mb-1" />
                <span className="font-semibold text-slate-800 text-xs block">Attestation de Scolarité</span>
                <span className="text-[10px] text-slate-400">Format certifié PDF</span>
              </button>
              <button
                onClick={() => handleDownloadBlob(`/api/v1/documents/generate-attendance-certificate/${studentId}`, `certificat_assiduite_${student.matricule}.pdf`)}
                className="p-3 text-left border border-slate-200 rounded-xl hover:border-[#FF6B00] transition-colors"
              >
                <FileText size={16} className="text-[#FF6B00] mb-1" />
                <span className="font-semibold text-slate-800 text-xs block">Certificat d'Assiduité</span>
                <span className="text-[10px] text-slate-400">Présence & régularité</span>
              </button>
              <button
                onClick={() => handleDownloadBlob(`/api/v1/documents/generate-exam-convocation/${studentId}`, `convocation_examen_${student.matricule}.pdf`)}
                className="p-3 text-left border border-slate-200 rounded-xl hover:border-[#FF6B00] transition-colors"
              >
                <FileText size={16} className="text-[#FF6B00] mb-1" />
                <span className="font-semibold text-slate-800 text-xs block">Convocation d'Examen</span>
                <span className="text-[10px] text-slate-400">Pour les épreuves écrites</span>
              </button>
            </div>
          </div>

          {/* Pièces justificatives scannées */}
          <StudentDossierSection studentId={Number(studentId)} />
        </div>
      )}

      {/* ONGLET 6: PRÉSENCES & ASSIDUITÉ */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-400">Taux de présence</span>
              <p className="text-2xl font-bold text-green-600 mt-1">{attendance?.attendance_rate ?? 100}%</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-400">Présences</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{attendance?.summary?.present || 0}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-400">Retards</span>
              <p className="text-2xl font-bold text-orange-600 mt-1">{attendance?.summary?.late || 0}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-400">Absences injustifiées</span>
              <p className="text-2xl font-bold text-red-600 mt-1">{attendance?.summary?.absent || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Modal Réduction */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h3 className="font-bold text-slate-900 text-lg mb-1">Bourse / Réduction Scolarité</h3>
            <p className="text-xs text-slate-500 mb-4">Attribuez une remise fixe ou un pourcentage d'exonération.</p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Montant réduction (FCFA)</label>
                <input
                  type="number"
                  value={discountForm.discount_amount}
                  onChange={(e) => setDiscountForm({ ...discountForm, discount_amount: e.target.value })}
                  placeholder="ex: 150000"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Ou Pourcentage (%)</label>
                <input
                  type="number"
                  value={discountForm.discount_percentage}
                  onChange={(e) => setDiscountForm({ ...discountForm, discount_percentage: e.target.value })}
                  placeholder="ex: 20"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Motif / Justification</label>
                <input
                  type="text"
                  value={discountForm.discount_reason}
                  onChange={(e) => setDiscountForm({ ...discountForm, discount_reason: e.target.value })}
                  placeholder="ex: Bourse d'excellence, Fratrie..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Approuvé par</label>
                <input
                  type="text"
                  value={discountForm.discount_approved_by}
                  onChange={(e) => setDiscountForm({ ...discountForm, discount_approved_by: e.target.value })}
                  placeholder="ex: Direction Générale"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowDiscountModal(false)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveDiscount}
                disabled={savingDiscount}
                className="flex-1 py-2 bg-[#FF6B00] hover:bg-orange-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                {savingDiscount ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Plan Mensuel */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h3 className="font-bold text-slate-900 text-lg mb-1">Plan de Paiement Personnalisé</h3>
            <p className="text-xs text-slate-500 mb-4">Choisissez entre le paiement par tranches standards ou mensualités.</p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Mode de règlement</label>
                <select
                  value={planForm.payment_plan}
                  onChange={(e) => setPlanForm({ ...planForm, payment_plan: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                >
                  <option value="tranches">Par tranches standards (P1, P2, P3)</option>
                  <option value="monthly">Échéancier Mensuel</option>
                </select>
              </div>

              {planForm.payment_plan === 'monthly' && (
                <>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Acompte initial (FCFA)</label>
                    <input
                      type="number"
                      value={planForm.monthly_deposit}
                      onChange={(e) => setPlanForm({ ...planForm, monthly_deposit: e.target.value })}
                      placeholder="ex: 200000"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Mensualité (FCFA)</label>
                    <input
                      type="number"
                      value={planForm.monthly_installment}
                      onChange={(e) => setPlanForm({ ...planForm, monthly_installment: e.target.value })}
                      placeholder="ex: 100000"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Nombre de mensualités</label>
                    <input
                      type="number"
                      value={planForm.monthly_months_count}
                      onChange={(e) => setPlanForm({ ...planForm, monthly_months_count: e.target.value })}
                      placeholder="ex: 5"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2 mt-6 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowPlanModal(false)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={handleSavePlan}
                disabled={savingPlan}
                className="flex-1 py-2 bg-[#FF6B00] hover:bg-orange-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                {savingPlan ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Réinitialisation Mot de Passe */}
      {showResetPass && generatedPass && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-xl">
            <CheckCircle size={40} className="text-green-500 mx-auto mb-3" />
            <h3 className="font-bold text-slate-900">Nouveau mot de passe</h3>
            <p className="text-xs text-slate-500 mt-1">Transmettez ce mot de passe temporaire à l'étudiant :</p>
            <div className="p-3 bg-slate-100 rounded-xl my-4 font-mono font-bold text-lg text-slate-800">
              {generatedPass}
            </div>
            <button
              onClick={() => setShowResetPass(false)}
              className="w-full py-2 bg-[#FF6B00] text-white rounded-xl text-sm font-semibold"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
