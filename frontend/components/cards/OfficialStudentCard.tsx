'use client';

import React, { useState } from 'react';
import { getMediaUrl } from '@/lib/api';
import { ShieldCheck } from 'lucide-react';

export interface OfficialCardStudent {
  id: number;
  first_name: string;
  last_name: string;
  matricule?: string | null;
  filiere?: string | null;
  level?: string | null;
  photo?: string | null;
  date_of_birth?: string | null;
  status?: string | null;
}

export interface OfficialCardUniversity {
  name?: string;
  logo?: string | null;
  academic_year?: string;
  slogan?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  card_config?: any;
}

export interface CardCustomizationOptions {
  primaryColor?: string;        // Vague principale & textes titres (ex: #072146)
  accentColor?: string;         // Vague inférieure & finitions (ex: #FF7300)
  slogan?: string;              // Devise au bas de la carte (ex: "Ensemble pour l'excellence")
  subtitle?: string;            // Sous-titre en-tête (ex: "Université Intelligente")
  showWatermark?: boolean;      // Filigrane topographique de sécurité
  showQrCode?: boolean;         // QR Code officiel
}

interface OfficialStudentCardProps {
  student: OfficialCardStudent;
  university?: OfficialCardUniversity;
  customization?: CardCustomizationOptions;
  side?: 'recto' | 'verso';
  mode?: 'interactive' | 'print' | 'responsive';
  className?: string;
}

export default function OfficialStudentCard({
  student,
  university = {},
  customization,
  side = 'recto',
  mode = 'responsive',
  className = ''
}: OfficialStudentCardProps) {
  const [photoError, setPhotoError] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [qrError, setQrError] = useState(false);

  // Configuration dynamique : customization > university.card_config > valeurs de référence par défaut
  const savedCfg = university.card_config || {};
  const primaryColor = customization?.primaryColor || savedCfg.primary_color || savedCfg.header_background_color || '#072146';
  const accentColor = customization?.accentColor || savedCfg.accent_color || savedCfg.matricule_background_color || '#FF7300';
  const slogan = customization?.slogan || university.slogan || savedCfg.slogan || "Ensemble pour l'excellence";
  const subtitle = customization?.subtitle || savedCfg.subtitle || "Université Intelligente";
  const showWatermark = customization?.showWatermark ?? (savedCfg.show_watermark !== false);
  const showQrCode = customization?.showQrCode ?? (savedCfg.show_qr_code !== false);

  const univName = university.name || 'UniSphere AI';
  const univLogo = university.logo ? getMediaUrl(university.logo) : null;
  const academicYear = university.academic_year || '2026-2027';

  const studentPhotoUrl = student.photo ? getMediaUrl(student.photo) : null;
  const qrCodeUrl = `/api/v1/students/${student.id}/qrcode`;

  const initials = `${(student.first_name || '')[0] || ''}${(student.last_name || '')[0] || ''}`.toUpperCase() || 'ET';

  // Rendu du titre avec coloration dynamique de "AI" en accentColor
  const renderUniversityTitle = () => {
    if (univName.toLowerCase().includes('unisphere')) {
      return (
        <span className="font-extrabold tracking-tight text-white flex items-center">
          UniSphere&nbsp;<span className="font-black" style={{ color: accentColor }}>AI</span>
        </span>
      );
    }
    return <span className="font-extrabold tracking-tight text-white truncate">{univName}</span>;
  };

  /* -------------------------------------------------------------------------- */
  /* RECTO : DESIGN OFFICIEL EXACT DE RÉFÉRENCE (DOUBLE VAGUE + FILIGRANE)      */
  /* -------------------------------------------------------------------------- */
  if (side === 'recto') {
    return (
      <div
        className={`official-student-card relative overflow-hidden bg-white select-none transition-shadow ${
          mode === 'print'
            ? 'w-[85.6mm] h-[54mm] rounded-[4.5mm] border border-slate-300 shadow-none'
            : 'w-full aspect-[85.6/54] max-w-[560px] rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200/90'
        } ${className}`}
        style={{
          boxSizing: 'border-box',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          containerType: 'inline-size'
        }}
      >
        {/* ============================================================== */}
        {/* 1. EN-TÊTE VECTORIEL : DOUBLE VAGUE (BLEU NUIT + ORANGE SOLEIL) */}
        {/* ============================================================== */}
        <div className="absolute top-0 inset-x-0 w-full h-[28%] z-10 pointer-events-none">
          <svg
            className="w-full h-full"
            viewBox="0 0 856 152"
            preserveAspectRatio="none"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Vague d'accent inférieure (Orange) qui descend plus bas vers la droite */}
            <path
              d="M 0 0 L 856 0 L 856 122 C 650 128, 420 162, 200 156 C 120 152, 50 136, 0 124 Z"
              fill={accentColor}
            />
            {/* Vague principale supérieure (Bleu Nuit) qui remonte élégamment vers la droite */}
            <path
              d="M 0 0 L 856 0 L 856 78 C 650 86, 420 144, 200 140 C 120 136, 50 126, 0 118 Z"
              fill={primaryColor}
            />
          </svg>

          {/* CONTENU DE L'EN-TÊTE : LOGO CIRCULAIRE + TITRE & SOUS-TITRE */}
          <div className="absolute top-0 inset-x-0 h-full flex items-center justify-between px-[4.5%] pb-[11%]">
            <div className="flex items-center gap-[3%] min-w-0">
              {/* Badge circulaire blanc avec fin contour orange */}
              <div
                className="relative flex-shrink-0 rounded-full bg-white flex items-center justify-center shadow-xs overflow-hidden"
                style={{
                  width: '8.4cqw',
                  height: '8.4cqw',
                  border: `2px solid ${accentColor}`
                }}
              >
                {univLogo && !logoError ? (
                  <img
                    src={univLogo}
                    alt={univName}
                    onError={() => setLogoError(true)}
                    className="w-full h-full object-contain p-0.5"
                  />
                ) : (
                  /* Logo officiel vectoriel : Toque bleu nuit + pompon orange */
                  <svg viewBox="0 0 64 64" className="w-full h-full p-1" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Losange supérieur (Toque) */}
                    <path d="M32 13L8 24.5L32 36L56 24.5L32 13Z" fill={primaryColor} />
                    {/* Calotte inférieure */}
                    <path d="M18 29.5V40C18 43.8 24.3 47 32 47C39.7 47 46 43.8 46 40V29.5L32 36L18 29.5Z" fill={primaryColor} />
                    {/* Bouton central & Cordon du pompon */}
                    <circle cx="32" cy="24.5" r="2.8" fill={accentColor} />
                    <path d="M32 24.5C26 26.5 15 32 14 36" stroke={accentColor} strokeWidth="2.4" strokeLinecap="round" />
                    {/* Pompon suspendu */}
                    <path d="M12 36L16 36L15.2 46L12.8 46Z" fill={accentColor} />
                  </svg>
                )}
              </div>

              {/* Titre & Sous-titre de l'établissement */}
              <div className="min-w-0 leading-tight">
                <div style={{ fontSize: '3.35cqw', lineHeight: 1.05 }}>
                  {renderUniversityTitle()}
                </div>
                <div
                  className="text-white/95 font-normal tracking-wide mt-0.5 truncate"
                  style={{ fontSize: '1.9cqw' }}
                >
                  {subtitle}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. FILIGRANE DE SÉCURITÉ : VAGUES TOPOGRAPHIQUES SOUPLES       */}
        {/* ============================================================== */}
        {showWatermark && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-0"
            viewBox="0 0 856 540"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Lignes fluides douces ondulantes de droite à gauche */}
            <path
              d="M 160 540 C 360 480 500 380 856 420"
              stroke="#0066CC"
              strokeWidth="1.3"
              strokeOpacity="0.09"
            />
            <path
              d="M 190 540 C 390 470 530 360 856 390"
              stroke="#0066CC"
              strokeWidth="1.3"
              strokeOpacity="0.08"
            />
            <path
              d="M 220 540 C 420 460 560 340 856 360"
              stroke="#0066CC"
              strokeWidth="1.3"
              strokeOpacity="0.08"
            />
            <path
              d="M 250 540 C 450 450 590 320 856 330"
              stroke="#0066CC"
              strokeWidth="1.3"
              strokeOpacity="0.07"
            />
            <path
              d="M 280 540 C 480 440 620 300 856 300"
              stroke="#0066CC"
              strokeWidth="1.3"
              strokeOpacity="0.07"
            />
            <path
              d="M 310 540 C 510 430 650 280 856 270"
              stroke="#0066CC"
              strokeWidth="1.3"
              strokeOpacity="0.06"
            />
            <path
              d="M 340 540 C 540 420 680 260 856 240"
              stroke="#0066CC"
              strokeWidth="1.3"
              strokeOpacity="0.06"
            />
            <path
              d="M 370 540 C 570 410 710 240 856 210"
              stroke="#0066CC"
              strokeWidth="1.3"
              strokeOpacity="0.05"
            />
            <path
              d="M 400 540 C 600 400 740 220 856 180"
              stroke="#0066CC"
              strokeWidth="1.3"
              strokeOpacity="0.05"
            />
            {/* Courbe douce sous la photo */}
            <path
              d="M -30 460 C 90 480 180 520 230 540"
              stroke="#0066CC"
              strokeWidth="1.2"
              strokeOpacity="0.08"
            />
          </svg>
        )}

        {/* ============================================================== */}
        {/* 3. CORPS DE LA CARTE : 3 COLONNES PARFAITEMENT PROPORTIONNÉES */}
        {/* ============================================================== */}
        <div className="absolute top-[28%] bottom-[12.5%] inset-x-0 px-[4.5%] flex items-center justify-between gap-[3.5%] z-10">
          
          {/* 3.1 PHOTO DE L'ÉTUDIANT (GAUCHE) */}
          <div
            className="flex-shrink-0 rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm bg-slate-100 flex items-center justify-center"
            style={{ width: '23cqw', height: '30.5cqw' }}
          >
            {studentPhotoUrl && !photoError ? (
              <img
                src={studentPhotoUrl}
                alt={`${student.first_name} ${student.last_name}`}
                onError={() => setPhotoError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500">
                <span
                  className="font-black tracking-wider"
                  style={{ fontSize: '3.4cqw', color: primaryColor }}
                >
                  {initials}
                </span>
                <span
                  className="font-bold text-slate-400 uppercase mt-0.5"
                  style={{ fontSize: '1.4cqw' }}
                >
                  Photo
                </span>
              </div>
            )}
          </div>

          {/* 3.2 INFORMATIONS PRINCIPALES (CENTRE) AVEC SÉPARATEURS */}
          <div className="flex-1 min-w-0 flex flex-col justify-between h-[30.5cqw] py-1">
            
            {/* Ligne Nom */}
            <div className="border-b border-slate-200/80 pb-[1.1cqw] flex items-baseline gap-2 truncate">
              <span
                className="font-bold tracking-tight flex-shrink-0"
                style={{ fontSize: '2.5cqw', color: primaryColor }}
              >
                Nom :
              </span>
              <span
                className="font-normal text-[#1E293B] truncate"
                style={{ fontSize: '2.5cqw' }}
              >
                {student.last_name || 'Diallo'}
              </span>
            </div>

            {/* Ligne Prénom */}
            <div className="border-b border-slate-200/80 pb-[1.1cqw] flex items-baseline gap-2 truncate">
              <span
                className="font-bold tracking-tight flex-shrink-0"
                style={{ fontSize: '2.5cqw', color: primaryColor }}
              >
                Prénom :
              </span>
              <span
                className="font-normal text-[#1E293B] truncate"
                style={{ fontSize: '2.5cqw' }}
              >
                {student.first_name || 'Moussa'}
              </span>
            </div>

            {/* Ligne Matricule */}
            <div className="border-b border-slate-200/80 pb-[1.1cqw] flex items-baseline gap-2 truncate">
              <span
                className="font-bold tracking-tight flex-shrink-0"
                style={{ fontSize: '2.5cqw', color: primaryColor }}
              >
                Matricule :
              </span>
              <span
                className="font-normal text-[#1E293B] tracking-wide truncate"
                style={{ fontSize: '2.5cqw' }}
              >
                {student.matricule || `UAI${academicYear.slice(0, 4)}${String(student.id || 1).padStart(3, '0')}`}
              </span>
            </div>

            {/* Ligne Filière */}
            <div className="border-b border-slate-200/80 pb-[1.1cqw] flex items-baseline gap-2 truncate">
              <span
                className="font-bold tracking-tight flex-shrink-0"
                style={{ fontSize: '2.5cqw', color: primaryColor }}
              >
                Filière :
              </span>
              <span
                className="font-normal text-[#1E293B] truncate"
                style={{ fontSize: '2.5cqw' }}
              >
                {student.filiere || 'Informatique'}
              </span>
            </div>

            {/* Ligne Niveau */}
            <div className="flex items-baseline gap-2 truncate pt-0.5">
              <span
                className="font-bold tracking-tight flex-shrink-0"
                style={{ fontSize: '2.5cqw', color: primaryColor }}
              >
                Niveau :
              </span>
              <span
                className="font-normal text-[#1E293B] truncate"
                style={{ fontSize: '2.5cqw' }}
              >
                {student.level || 'L1'}
              </span>
            </div>
          </div>

          {/* 3.3 QR CODE SÉCURISÉ (DROITE, SI ACTIVÉ) */}
          {showQrCode ? (
            <div
              className="flex-shrink-0 rounded-2xl p-1 bg-white border border-slate-200/90 shadow-xs flex items-center justify-center"
              style={{ width: '23.5cqw', height: '23.5cqw' }}
            >
              {!qrError ? (
                <img
                  src={qrCodeUrl}
                  alt="QR Code Officiel"
                  loading="lazy"
                  className="w-full h-full object-contain"
                  onError={() => setQrError(true)}
                />
              ) : (
                /* Fallback SVG QR haute fidélité si l'image dynamique n'est pas encore générée */
                <svg viewBox="0 0 100 100" className="w-full h-full p-1" fill="#000">
                  <path d="M0,0 h30 v30 h-30 z M6,6 v18 h18 v-18 z M10,10 h10 v10 h-10 z" />
                  <path d="M70,0 h30 v30 h-30 z M76,6 v18 h18 v-18 z M80,10 h10 v10 h-10 z" />
                  <path d="M0,70 h30 v30 h-30 z M6,76 v18 h18 v-18 z M10,80 h10 v10 h-10 z" />
                  <rect x="36" y="8" width="8" height="8" />
                  <rect x="52" y="8" width="8" height="8" />
                  <rect x="36" y="24" width="8" height="8" />
                  <rect x="52" y="24" width="8" height="8" />
                  <rect x="8" y="36" width="8" height="8" />
                  <rect x="24" y="36" width="8" height="8" />
                  <rect x="40" y="40" width="20" height="20" />
                  <rect x="68" y="40" width="8" height="8" />
                  <rect x="84" y="40" width="8" height="8" />
                  <rect x="36" y="68" width="8" height="8" />
                  <rect x="52" y="68" width="8" height="8" />
                  <rect x="68" y="68" width="24" height="8" />
                  <rect x="68" y="84" width="8" height="8" />
                  <rect x="84" y="84" width="8" height="8" />
                </svg>
              )}
            </div>
          ) : (
            <div
              className="flex-shrink-0 rounded-2xl p-1.5 bg-slate-50 border border-dashed border-slate-200 flex flex-col items-center justify-center text-center"
              style={{ width: '23.5cqw', height: '23.5cqw' }}
            >
              <ShieldCheck style={{ width: '8cqw', height: '8cqw', color: accentColor }} />
              <span className="font-bold uppercase tracking-wider text-slate-400 mt-1" style={{ fontSize: '1.4cqw' }}>
                Certifié
              </span>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* 4. PIED DE CARTE : DEVISE / SLOGAN CENTRÉ (BLEU NUIT)          */}
        {/* ============================================================== */}
        <div className="absolute bottom-0 inset-x-0 h-[12.5%] flex items-center justify-center px-4 z-10">
          <p
            className="font-medium tracking-tight text-center truncate"
            style={{ fontSize: '2.5cqw', color: primaryColor }}
          >
            {slogan}
          </p>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* VERSO : COHÉRENT ET RESPECTANT LES COULEURS CHOISIES                        */
  /* -------------------------------------------------------------------------- */
  return (
    <div
      className={`official-student-card relative overflow-hidden bg-white select-none transition-shadow ${
        mode === 'print'
          ? 'w-[85.6mm] h-[54mm] rounded-[4.5mm] border border-slate-300 shadow-none'
          : 'w-full aspect-[85.6/54] max-w-[560px] rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200/90'
      } ${className}`}
      style={{
        boxSizing: 'border-box',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        containerType: 'inline-size'
      }}
    >
      {/* BANDE SUPÉRIEURE MAGNÉTIQUE AVEC LISERÉ D'ACCENT */}
      <div
        className="w-full h-[14%] bg-slate-900"
        style={{ borderBottom: `2px solid ${accentColor}` }}
      />

      {/* CORPS DU VERSO */}
      <div className="p-[4%] flex flex-col justify-between h-[86%]">
        {/* Conditions officielles */}
        <div className="space-y-1">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1">
            <span
              className="font-bold uppercase tracking-wider flex items-center gap-1"
              style={{ fontSize: '2cqw', color: primaryColor }}
            >
              <ShieldCheck style={{ width: '2.4cqw', height: '2.4cqw', color: accentColor }} />
              Conditions officielles d'usage
            </span>
            <span
              className="font-mono text-slate-500 font-semibold"
              style={{ fontSize: '1.8cqw' }}
            >
              Année : {academicYear}
            </span>
          </div>
          <p
            className="text-slate-600 leading-tight"
            style={{ fontSize: '1.75cqw' }}
          >
            Cette carte est strictement personnelle et incessible. Tout porteur doit être en mesure de la présenter
            aux agents habilités, lors des cours, contrôles continus et examens universitaires.
          </p>
          <p
            className="text-slate-600 leading-tight"
            style={{ fontSize: '1.75cqw' }}
          >
            En cas de perte, de vol ou de détérioration, avertir sans délai le secrétariat académique de l'établissement.
          </p>
        </div>

        {/* Contact Campus & Signature */}
        <div className="flex items-end justify-between pt-1 border-t border-slate-100">
          <div
            className="text-slate-500 space-y-0.5 leading-snug"
            style={{ fontSize: '1.7cqw' }}
          >
            <p className="font-bold" style={{ color: primaryColor }}>{univName}</p>
            {university.address && <p className="truncate max-w-[40cqw]">{university.address}</p>}
            {university.phone && <p>Tél : {university.phone}</p>}
            {university.website && <p className="text-slate-400">{university.website}</p>}
          </div>

          <div className="text-right">
            <p className="font-semibold text-slate-600 mb-1" style={{ fontSize: '1.65cqw' }}>
              Le Secrétariat Général
            </p>
            <div
              className="inline-block px-2 py-0.5 border border-dashed rounded text-slate-400 italic font-serif"
              style={{ fontSize: '1.5cqw', borderColor: accentColor }}
            >
              Cachet & Signature
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
