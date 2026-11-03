'use client';

import { useState, useEffect } from 'react';
import {
  Loader2,
  Printer,
  User,
  GraduationCap,
  Hash,
  Calendar,
  Mail,
  Phone,
  ShieldCheck,
  RotateCw,
  Download,
  Eye,
  X,
  Sparkles
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';
import OfficialStudentCard from '@/components/cards/OfficialStudentCard';

export default function StudentCardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeSide, setActiveSide] = useState<'recto' | 'verso' | 'both'>('recto');
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  useEffect(() => {
    loadCard();
  }, []);

  const loadCard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/v1/students/me/card');
      setData(res.data);
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors du chargement de la carte');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    setShowPreviewModal(true);
  };

  const handleConfirmPrint = () => {
    setShowPreviewModal(false);
    setActiveSide('both');
    setTimeout(() => {
      window.print();
    }, 250);
  };

  const handleDownloadQr = () => {
    if (!data?.student?.id) return;
    const qrUrl = `/api/v1/students/${data.student.id}/qrcode`;
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `QR_${data.student.matricule || data.student.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR Code téléchargé');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] space-y-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-orange-200 border-t-[#FF7300] rounded-full animate-spin"></div>
          <GraduationCap className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[#FF7300]" size={22} />
        </div>
        <p className="text-slate-500 font-medium text-sm animate-pulse">Chargement de votre carte officielle...</p>
      </div>
    );
  }

  if (!data || !data.student) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-xl mx-auto my-8 p-5 sm:p-8">
        <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <GraduationCap size={32} />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">Carte d'étudiant indisponible</h3>
        <p className="text-slate-500 text-sm mb-6">
          Impossible de récupérer les informations de votre carte officielle. Veuillez vérifier que votre profil étudiant est actif.
        </p>
        <button
          onClick={loadCard}
          className="px-5 py-2.5 bg-[#FF7300] text-white rounded-xl text-sm font-semibold hover:bg-[#e56700] transition-colors shadow-sm"
        >
          Réessayer
        </button>
      </div>
    );
  }

  const { student, university } = data;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      {/* Barre d'action supérieure */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldCheck size={13} className="text-emerald-600" />
              Statut Vérifié & Homologué
            </span>
            <span className="text-xs text-slate-400 font-mono">Année {university?.academic_year || '2026-2027'}</span>
          </div>
          <h1 className="text-2xl font-black text-[#072146] tracking-tight mt-1">Carte Étudiante Officielle</h1>
          <p className="text-slate-500 text-sm">
            Badge d'identification biométrique et contrôle d'accès sécurisé UniSphere AI
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Sélecteur de face */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setActiveSide('recto')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeSide === 'recto'
                  ? 'bg-white text-[#072146] shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Recto
            </button>
            <button
              onClick={() => setActiveSide('verso')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeSide === 'verso'
                  ? 'bg-white text-[#072146] shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Verso
            </button>
            <button
              onClick={() => setActiveSide('both')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeSide === 'both'
                  ? 'bg-white text-[#072146] shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Les deux
            </button>
          </div>

          <button
            onClick={handleDownloadQr}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
            title="Télécharger l'image du QR code"
          >
            <Download size={14} />
            QR Code
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#FF7300] hover:bg-[#e56700] text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg active:scale-95"
          >
            <Printer size={15} />
            Imprimer / Exporter PDF
          </button>
        </div>
      </div>

      {/* ZONE D'AFFICHAGE OFFICIEL DE LA CARTE ÉTUDIANTE */}
      <div className="w-full flex flex-col lg:flex-row items-center justify-center gap-8 py-4 px-2">
        {/* RECTO */}
        {(activeSide === 'recto' || activeSide === 'both') && (
          <div className="flex flex-col items-center w-full max-w-[560px]">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2.5 print:hidden">
              Face Avant (Recto)
            </div>
            <div className="student-card-badge w-full">
              <OfficialStudentCard
                student={student}
                university={university}
                side="recto"
                mode="responsive"
              />
            </div>
          </div>
        )}

        {/* VERSO */}
        {(activeSide === 'verso' || activeSide === 'both') && (
          <div className="flex flex-col items-center w-full max-w-[560px]">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2.5 print:hidden">
              Face Arrière (Verso)
            </div>
            <div className="student-card-badge w-full">
              <OfficialStudentCard
                student={student}
                university={university}
                side="verso"
                mode="responsive"
              />
            </div>
          </div>
        )}
      </div>

      {/* INFORMATIONS COMPLÉMENTAIRES ÉTUDIANT */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Dossier d'identification biométrique</h2>
            <p className="text-xs text-slate-500">Données enregistrées dans le registre académique central</p>
          </div>
          <span className="self-start sm:self-auto inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Sparkles size={13} />
            Carte active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 text-[#FF7300] flex items-center justify-center flex-shrink-0">
              <Hash size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 font-medium">Matricule Unique</p>
              <p className="font-mono font-bold text-slate-900 truncate">{student.matricule || `UAI2026${String(student.id).padStart(3, '0')}`}</p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-[#072146] flex items-center justify-center flex-shrink-0">
              <GraduationCap size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 font-medium">Filière / Spécialité</p>
              <p className="font-bold text-slate-900 truncate">{student.filiere || 'Informatique'}</p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <User size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 font-medium">Niveau d'études</p>
              <p className="font-bold text-slate-900 truncate">{student.level || 'L1'}</p>
            </div>
          </div>

          {student.date_of_birth && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                <Calendar size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 font-medium">Date de naissance</p>
                <p className="font-bold text-slate-900 truncate">{student.date_of_birth}</p>
              </div>
            </div>
          )}

          {student.email && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                <Mail size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 font-medium">Email académique</p>
                <p className="font-bold text-slate-900 truncate">{student.email}</p>
              </div>
            </div>
          )}

          {student.phone && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center flex-shrink-0">
                <Phone size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 font-medium">Téléphone d'urgence</p>
                <p className="font-bold text-slate-900 truncate">{student.phone}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL APERÇU AVANT IMPRESSION */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 print:hidden">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#FF7300] flex items-center justify-center">
                  <Eye size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Aperçu officiel de votre carte</h3>
                  <p className="text-xs text-slate-500">Prêt pour l'impression physique haute fidélité</p>
                </div>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-100 flex-1 text-center">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 text-left">
                Carte officielle de l'étudiant(e) <b>{student.first_name} {student.last_name}</b> ({student.matricule || 'Matricule généré'}). Les deux faces (recto/verso) seront imprimées selon les normes du format standard ISO ID-1.
              </div>

              <div className="p-2 sm:p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Aperçu Recto</p>
                <div className="w-full max-w-[420px]">
                  <OfficialStudentCard
                    student={student}
                    university={university}
                    side="recto"
                    mode="responsive"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-4 sm:px-6 py-4 border-t border-slate-200 bg-white">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-all"
              >
                Fermer
              </button>
              <button
                onClick={handleConfirmPrint}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#FF7300] hover:bg-[#e56700] text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
              >
                <Printer size={15} />
                Lancer l'impression
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STYLES SPÉCIFIQUES POUR L'IMPRESSION HAUTE DÉFINITION (FORMAT CR80 ISO) */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          header, nav, aside, footer, .print-hidden, [role="navigation"] {
            display: none !important;
          }
          .student-card-badge {
            display: block !important;
            box-shadow: none !important;
            border: 1px solid #cbd5e1 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 10mm auto !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}
