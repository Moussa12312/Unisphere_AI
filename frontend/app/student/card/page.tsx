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
  QrCode,
  RotateCw,
  Download,
  CheckCircle2,
  MapPin,
  Sparkles,
  Building2
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function StudentCardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeSide, setActiveSide] = useState<'recto' | 'verso' | 'both'>('recto');
  const [imageError, setImageError] = useState(false);
  const [logoError, setLogoError] = useState(false);

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
    // S'assurer que les deux faces sont visibles pour l'impression
    setActiveSide('both');
    setTimeout(() => {
      window.print();
    }, 200);
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
          <div className="w-16 h-16 border-4 border-orange-200 border-t-[#FF6B00] rounded-full animate-spin"></div>
          <GraduationCap className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[#FF6B00]" size={22} />
        </div>
        <p className="text-slate-500 font-medium text-sm animate-pulse">Chargement de votre carte officielle...</p>
      </div>
    );
  }

  if (!data || !data.student) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-xl mx-auto my-8 p-8">
        <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <GraduationCap size={32} />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">Carte d'étudiant indisponible</h3>
        <p className="text-slate-500 text-sm mb-6">
          Impossible de récupérer les informations de votre carte officielle. Veuillez vérifier que votre profil étudiant est actif.
        </p>
        <button
          onClick={loadCard}
          className="px-5 py-2.5 bg-[#FF6B00] text-white rounded-xl text-sm font-semibold hover:bg-[#e55f00] transition-colors shadow-sm"
        >
          Réessayer
        </button>
      </div>
    );
  }

  const { student, university, config } = data;

  const primaryColor = config?.header_background_color || '#0F172A';
  const accentColor = config?.matricule_background_color || '#FF6B00';
  const qrCodeUrl = `/api/v1/students/${student.id}/qrcode`;

  const initials = `${(student.first_name || '')[0] || ''}${(student.last_name || '')[0] || ''}`.toUpperCase() || 'ET';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      {/* Barre d'action supérieure */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldCheck size={13} className="text-emerald-600" />
              Statut Vérifié
            </span>
            <span className="text-xs text-slate-400 font-mono">Année {university.academic_year || '2026-2027'}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">Carte Étudiante Officielle</h1>
          <p className="text-slate-500 text-sm">
            Badge d'identification biométrique et contrôle d'accès campus LMD
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Sélecteur de face */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setActiveSide('recto')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeSide === 'recto'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Recto
            </button>
            <button
              onClick={() => setActiveSide('verso')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeSide === 'verso'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Verso
            </button>
            <button
              onClick={() => setActiveSide('both')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeSide === 'both'
                  ? 'bg-white text-slate-900 shadow-sm'
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
            className="flex items-center gap-2 px-5 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg active:scale-95"
          >
            <Printer size={15} />
            Imprimer / Exporter PDF
          </button>
        </div>
      </div>

      {/* ZONE D'AFFICHAGE DES CARTES */}
      <div className="flex flex-col lg:flex-row items-center justify-center gap-8 py-4">
        {/* RECTO */}
        {(activeSide === 'recto' || activeSide === 'both') && (
          <div className="flex flex-col items-center">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 print:hidden">
              Face Avant (Recto)
            </div>
            <div
              id="student-card-recto"
              className="student-card-badge relative bg-white overflow-hidden shadow-2xl transition-all duration-300 border border-slate-200/80"
              style={{
                width: '85.6mm',
                height: '54mm',
                borderRadius: '14px',
                fontFamily: 'Inter, system-ui, sans-serif'
              }}
            >
              {/* Fond guilloché de sécurité subtil */}
              <div
                className="absolute inset-0 opacity-[0.035] pointer-events-none"
                style={{
                  backgroundImage: `radial-gradient(${primaryColor} 1px, transparent 1px), radial-gradient(${primaryColor} 1px, transparent 1px)`,
                  backgroundSize: '12px 12px',
                  backgroundPosition: '0 0, 6px 6px'
                }}
              />

              {/* HEADER AVEC LOGO ET TITRE UNIVERSITÉ */}
              <div
                className="relative px-3.5 py-2 flex items-center justify-between text-white"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor} 0%, #1e293b 100%)`,
                  height: '46px'
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {university.logo && !logoError ? (
                    <img
                      src={university.logo}
                      alt="Logo"
                      onError={() => setLogoError(true)}
                      className="h-8 w-8 object-contain bg-white/10 rounded-full p-0.5 border border-white/20 flex-shrink-0"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0 border border-white/20">
                      <Building2 size={16} className="text-white" />
                    </div>
                  )}
                  <div className="min-w-0 leading-tight">
                    <div className="font-extrabold text-[10px] tracking-wide uppercase truncate text-white">
                      {university.name || 'UNIVERSITÉ UNISPHERE'}
                    </div>
                    <div className="text-[7.5px] text-white/75 truncate font-medium">
                      RÉPUBLIQUE • ENSEIGNEMENT SUPÉRIEUR
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end flex-shrink-0">
                  <span className="text-[7px] font-bold uppercase tracking-wider text-amber-300 bg-amber-400/20 px-1.5 py-0.5 rounded border border-amber-300/30">
                    Étudiant
                  </span>
                  <span className="text-[7px] text-white/70 font-mono mt-0.5">
                    {university.academic_year || '2026-2027'}
                  </span>
                </div>
              </div>

              {/* BANDEAU MINI ACCENT */}
              <div
                className="h-[3px] w-full"
                style={{
                  background: `linear-gradient(90deg, ${accentColor} 0%, #F59E0B 50%, ${primaryColor} 100%)`
                }}
              />

              {/* CORPS DE LA CARTE */}
              <div
                className="relative p-3 flex items-center gap-3"
                style={{ height: 'calc(54mm - 46px - 3px - 22px)' }}
              >
                {/* PHOTO DE L'ÉTUDIANT + PUCE ELECTRONIQUE */}
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div
                    className="relative rounded-lg overflow-hidden border-2 bg-slate-100 shadow-sm flex items-center justify-center"
                    style={{
                      width: '68px',
                      height: '76px',
                      borderColor: primaryColor
                    }}
                  >
                    {student.photo && !imageError ? (
                      <img
                        src={student.photo}
                        alt={`${student.first_name} ${student.last_name}`}
                        onError={() => setImageError(true)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500">
                        <span className="font-bold text-sm tracking-widest text-slate-700">
                          {initials}
                        </span>
                        <span className="text-[7px] text-slate-400 uppercase mt-0.5">Photo</span>
                      </div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[6px] text-white text-center py-0.5 font-bold tracking-wider">
                      OFFICIEL
                    </div>
                  </div>

                  {/* Puce EMV métallique dorée décorative */}
                  <div
                    className="w-8 h-5 rounded-[3px] border border-amber-600/60 shadow-inner relative overflow-hidden flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, #fef08a 0%, #eab308 50%, #ca8a04 100%)'
                    }}
                    title="Puce électronique NFC"
                  >
                    <div className="absolute inset-0 border border-amber-800/20 rounded-[2px] m-[2px]" />
                    <div className="w-full h-[1px] bg-amber-800/30" />
                    <div className="h-full w-[1px] bg-amber-800/30 absolute" />
                  </div>
                </div>

                {/* INFORMATIONS PRINCIPALES */}
                <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-0.5">
                  <div>
                    <div className="text-[7.5px] uppercase font-bold tracking-wider text-slate-400">
                      Nom & Prénom
                    </div>
                    <div className="text-[12px] font-black text-slate-900 leading-tight uppercase truncate">
                      {student.last_name}
                    </div>
                    <div className="text-[11px] font-bold text-slate-700 leading-tight capitalize truncate">
                      {student.first_name}
                    </div>
                  </div>

                  {/* ID / Matricule */}
                  <div className="my-0.5">
                    <span className="text-[7px] uppercase font-bold text-slate-400 block">
                      Matricule Étudiant
                    </span>
                    <span
                      className="inline-block px-2 py-0.5 rounded text-[9.5px] font-mono font-black tracking-wider text-white shadow-xs"
                      style={{ backgroundColor: accentColor }}
                    >
                      {student.matricule || `ID-${student.id}`}
                    </span>
                  </div>

                  {/* Filière & Niveau */}
                  <div className="space-y-0.5 text-[8px] text-slate-700 leading-snug">
                    <div className="truncate">
                      <span className="font-bold text-slate-900">Filière : </span>
                      <span className="text-slate-600">{student.filiere || 'Formation Supérieure'}</span>
                    </div>
                    <div className="truncate flex items-center gap-2">
                      <span>
                        <span className="font-bold text-slate-900">Niveau : </span>
                        <span className="text-slate-600">{student.level || 'Licence'}</span>
                      </span>
                      {student.date_of_birth && (
                        <span className="text-slate-400 text-[7.5px]">
                          • Né(e) le {student.date_of_birth}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* QR CODE SÉCURISÉ */}
                <div className="flex flex-col items-center justify-center flex-shrink-0 pl-1">
                  <div className="relative p-1 bg-white rounded-md border border-slate-300 shadow-xs">
                    {/* Repères scanner aux coins */}
                    <div className="w-[62px] h-[62px] flex items-center justify-center">
                      <img
                        src={qrCodeUrl}
                        alt="QR Code"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                  <span className="text-[6.5px] font-mono font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                    SCAN SÉCURISÉ
                  </span>
                </div>
              </div>

              {/* FOOTER AVEC HOLOGRAMME ET SIGNATURE */}
              <div
                className="absolute bottom-0 inset-x-0 px-3 py-1 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-[7px] text-slate-600"
                style={{ height: '22px' }}
              >
                <div className="flex items-center gap-1.5">
                  {/* Pastille hologramme sécurité */}
                  <div
                    className="w-3.5 h-3.5 rounded-full shadow-xs flex items-center justify-center text-[5px] font-black text-slate-900"
                    style={{
                      background: 'radial-gradient(circle, #67e8f9 0%, #c084fc 50%, #fde047 100%)'
                    }}
                    title="Hologramme officiel de sécurité"
                  >
                    ★
                  </div>
                  <span className="font-semibold text-slate-700 tracking-tight">
                    CARTE OFFICIELLE D'ÉTUDIANT
                  </span>
                </div>

                <div className="flex items-center gap-2 font-mono text-[7px] text-slate-500">
                  <span>EXP : 30/09/{parseInt((university.academic_year || '2026-2027').split('-')[1] || '2027')}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VERSO */}
        {(activeSide === 'verso' || activeSide === 'both') && (
          <div className="flex flex-col items-center">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 print:hidden">
              Face Arrière (Verso)
            </div>
            <div
              id="student-card-verso"
              className="student-card-badge relative bg-white overflow-hidden shadow-2xl transition-all duration-300 border border-slate-200/80"
              style={{
                width: '85.6mm',
                height: '54mm',
                borderRadius: '14px',
                fontFamily: 'Inter, system-ui, sans-serif'
              }}
            >
              {/* BANDE MAGNÉTIQUE NOIRE */}
              <div
                className="w-full bg-slate-900 shadow-inner"
                style={{ height: '24px', marginTop: '10px' }}
              />

              {/* BANDE DE SIGNATURE BLANCHE AVEC MOTIF HACHURÉ */}
              <div className="px-4 mt-2">
                <div className="flex items-center justify-between text-[6.5px] text-slate-400 mb-0.5 uppercase tracking-wider">
                  <span>Zone de signature de l'étudiant(e)</span>
                  <span className="font-mono">N° {student.matricule}</span>
                </div>
                <div
                  className="w-full h-6 rounded bg-slate-50 border border-slate-300 flex items-center justify-end px-3 text-[9px] font-signature italic text-slate-600"
                  style={{
                    backgroundImage: 'repeating-linear-gradient(45deg, #f8fafc, #f8fafc 4px, #f1f5f9 4px, #f1f5f9 8px)'
                  }}
                >
                  <span className="font-serif italic text-slate-700">{student.first_name} {student.last_name}</span>
                </div>
              </div>

              {/* RÈGLEMENT ET CONTACT */}
              <div className="px-4 py-2 space-y-1.5 text-[7px] text-slate-600 leading-tight">
                <p className="text-[6.5px] text-slate-500 text-justify">
                  Cette carte est strictement personnelle, incessible et demeure la propriété exclusive de{' '}
                  <span className="font-bold text-slate-700">{university.name || 'l\'Université'}</span>.
                  Toute fraude ou falsification expose son auteur aux sanctions disciplinaires et pénales prévues par la loi.
                </p>

                <div className="pt-1 border-t border-slate-200 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-800 flex items-center gap-1">
                      <Building2 size={8} /> {university.name || 'Campus Principal'}
                    </div>
                    {university.address && (
                      <div className="text-slate-500 flex items-center gap-1">
                        <MapPin size={8} /> {university.address}
                      </div>
                    )}
                    {university.phone && (
                      <div className="text-slate-500 flex items-center gap-1">
                        <Phone size={8} /> {university.phone}
                      </div>
                    )}
                  </div>

                  {/* Cachet numérique officiel */}
                  <div className="flex flex-col items-center">
                    <div className="w-11 h-11 rounded-full border border-dashed border-blue-600 flex flex-col items-center justify-center p-0.5 text-center">
                      <span className="text-[4.5px] uppercase font-bold text-blue-700 leading-none">VISA OFFICIEL</span>
                      <CheckCircle2 size={12} className="text-blue-600 my-0.5" />
                      <span className="text-[4px] text-blue-800 font-mono">DIRECTION</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* CODE-BARRES VISUEL SIMULÉ EN BAS */}
              <div className="absolute bottom-1 inset-x-4 flex items-center justify-between">
                <div className="flex items-center gap-[2px] h-3">
                  {[4,2,3,1,4,2,1,3,2,4,1,2,3,4,1,3,2,1,4,2,3,1,2,4,3,1].map((w, i) => (
                    <div
                      key={i}
                      className="bg-slate-800 h-full"
                      style={{ width: `${w}px` }}
                    />
                  ))}
                </div>
                <span className="text-[6.5px] font-mono font-bold text-slate-400">
                  UNISPHERE-SECURE-ID-2026
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* INFORMATIONS COMPLÉMENTAIRES ÉTUDIANT */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm print:hidden">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Dossier d'identification biométrique</h2>
            <p className="text-xs text-slate-500">Données enregistrées dans le registre académique central</p>
          </div>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Sparkles size={13} />
            Carte active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 text-[#FF6B00] flex items-center justify-center flex-shrink-0">
              <Hash size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 font-medium">Matricule Unique</p>
              <p className="font-mono font-bold text-slate-900 truncate">{student.matricule}</p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
              <GraduationCap size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 font-medium">Filière / Spécialité</p>
              <p className="font-bold text-slate-900 truncate">{student.filiere || 'N/A'}</p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <User size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 font-medium">Niveau d'études</p>
              <p className="font-bold text-slate-900 truncate">{student.level || 'Licence'}</p>
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

      {/* STYLES SPÉCIFIQUES POUR L'IMPRESSION HAUTE DÉFINITION (FORMAT CR80 ISO) */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .student-card-badge,
          .student-card-badge * {
            visibility: visible;
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
          .print\\:hidden {
            display: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
        }
      `}</style>
    </div>
  );
}