'use client';

import React, { useState } from 'react';
import { getMediaUrl } from '@/lib/api';
import { GraduationCap, ShieldCheck } from 'lucide-react';

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
  primaryColor?: string;        // Vague supérieure & titres (ex: #072146)
  accentColor?: string;         // Vague inférieure & badges (ex: #FF7300)
  slogan?: string;              // Devise au pied de carte (ex: "Ensemble pour l'excellence")
  subtitle?: string;            // Sous-titre en-tête (ex: "Université Intelligente")
  showWatermark?: boolean;      // Afficher les courbes topographiques de sécurité
  showQrCode?: boolean;         // Afficher le QR Code officiel
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

  // Configuration dynamique avec cascade de priorité (customization > university.card_config > valeurs officielles par défaut)
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

  // Rendu du titre de l'université avec coloration dynamique de "AI" en accentColor
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
  /* RECTO : DESIGN DOUBLE VAGUE PERSONNALISABLE                                 */
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
        {/* FILIGRANE DE SÉCURITÉ : VAGUES TOPOGRAPHIQUES SOUPLES (SI ACTIVÉ) */}
        {showWatermark && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-0"
            viewBox="0 0 856 540"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M -80 370 C 140 430 350 310 600 450 C 740 520 940 410 940 410"
              stroke={accentColor}
              strokeWidth="1.6"
              strokeOpacity="0.16"
            />
            <path
              d="M -80 405 C 140 465 350 345 600 485 C 740 555 940 445 940 445"
              stroke={primaryColor}
              strokeWidth="1.6"
              strokeOpacity="0.14"
            />
            <path
              d="M -80 440 C 140 500 350 380 600 520 C 740 590 940 480 940 480"
              stroke={accentColor}
              strokeWidth="1.6"
              strokeOpacity="0.12"
            />
            <path
              d="M -80 475 C 140 535 350 415 600 555 C 740 625 940 515 940 515"
              stroke={primaryColor}
              strokeWidth="1.6"
              strokeOpacity="0.10"
            />
            <path
              d="M -80 335 C 140 395 350 275 600 415 C 740 485 940 375 940 375"
              stroke={accentColor}
              strokeWidth="1.6"
              strokeOpacity="0.12"
            />
            <path
              d="M -80 300 C 140 360 350 240 600 380 C 740 450 940 340 940 340"
              stroke={primaryColor}
              strokeWidth="1.6"
              strokeOpacity="0.09"
            />
            {/* Ondulations concentriques douces en bas à gauche */}
            <circle cx="60" cy="520" r="130" stroke={accentColor} strokeWidth="1.2" strokeOpacity="0.10" />
            <circle cx="60" cy="520" r="180" stroke={primaryColor} strokeWidth="1.2" strokeOpacity="0.08" />
            <circle cx="60" cy="520" r="230" stroke={accentColor} strokeWidth="1.2" strokeOpacity="0.06" />
          </svg>
        )}

        {/* EN-TÊTE VECTORIEL : DOUBLE VAGUE (COULEURS PERSONNALISABLES) */}
        <div className="absolute top-0 inset-x-0 w-full h-[28.5%] z-10">
          <svg
            className="w-full h-full"
            viewBox="0 0 856 154"
            preserveAspectRatio="none"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Vague d'accent inférieure */}
            <path
              d="M 0 0 L 856 0 L 856 126 C 730 114 560 148 370 152 C 210 155 80 142 0 120 Z"
              fill={accentColor}
            />
            {/* Vague principale supérieure */}
            <path
              d="M 0 0 L 856 0 L 856 76 C 730 68 560 102 370 118 C 210 132 80 124 0 104 Z"
              fill={primaryColor}
            />
          </svg>

          {/* CONTENU DE L'EN-TÊTE : LOGO + TEXTE */}
          <div className="absolute top-0 inset-x-0 h-full flex items-center justify-between px-[4.5%] pb-[12%]">
            <div className="flex items-center gap-[3%] min-w-0">
              {/* Logo circulaire avec contour de la couleur d'accent */}
              <div
                className="relative flex-shrink-0 rounded-full bg-white flex items-center justify-center shadow-xs overflow-hidden p-0.5"
                style={{
                  width: '8.2cqw',
                  height: '8.2cqw',
                  border: `2px solid ${accentColor}`
                }}
              >
                {univLogo && !logoError ? (
                  <img
                    src={univLogo}
                    alt={univName}
                    onError={() => setLogoError(true)}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                    <GraduationCap style={{ width: '5.2cqw', height: '5.2cqw', color: primaryColor }} />
                  </div>
                )}
              </div>

              {/* Titre & Sous-titre */}
              <div className="min-w-0 leading-tight">
                <div style={{ fontSize: '3.4cqw', lineHeight: 1.05 }}>
                  {renderUniversityTitle()}
                </div>
                <div
                  className="text-white/95 font-medium tracking-wide mt-0.5 truncate"
                  style={{ fontSize: '1.95cqw' }}
                >
                  {subtitle}
                </div>
              </div>
            </div>

            {/* Badge année académique */}
            <div className="flex-shrink-0 text-right">
              <span
                className="inline-block font-mono font-bold text-white/90 bg-white/15 px-2 py-0.5 rounded-full border border-white/25 backdrop-blur-xs"
                style={{ fontSize: '1.75cqw' }}
              >
                {academicYear}
              </span>
            </div>
          </div>
        </div>

        {/* CORPS DE LA CARTE : 3 COLONNES PARFAITEMENT ÉQUILIBRÉES */}
        <div className="absolute top-[28.5%] bottom-[12.5%] inset-x-0 px-[5%] flex items-center justify-between gap-[3.8%] z-10">
          {/* 1. PHOTO DE L'ÉTUDIANT (GAUCHE) */}
          <div
            className="flex-shrink-0 rounded-xl overflow-hidden border border-slate-200/90 shadow-sm bg-slate-100 flex items-center justify-center"
            style={{ width: '22.5cqw', height: '29.5cqw' }}
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
                  style={{ fontSize: '3.2cqw', color: primaryColor }}
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

          {/* 2. INFORMATIONS PRINCIPALES (CENTRE) AVEC SÉPARATEURS */}
          <div className="flex-1 min-w-0 flex flex-col justify-between h-[29.5cqw] py-0.5">
            {/* Ligne Nom */}
            <div className="border-b border-slate-200/70 pb-[1.2cqw] flex items-baseline gap-1.5 truncate">
              <span
                className="font-bold tracking-tight flex-shrink-0"
                style={{ fontSize: '2.4cqw', color: primaryColor }}
              >
                Nom :
              </span>
              <span
                className="font-medium text-[#1E293B] uppercase truncate"
                style={{ fontSize: '2.4cqw' }}
              >
                {student.last_name || '—'}
              </span>
            </div>

            {/* Ligne Prénom */}
            <div className="border-b border-slate-200/70 pb-[1.2cqw] flex items-baseline gap-1.5 truncate">
              <span
                className="font-bold tracking-tight flex-shrink-0"
                style={{ fontSize: '2.4cqw', color: primaryColor }}
              >
                Prénom :
              </span>
              <span
                className="font-medium text-[#1E293B] capitalize truncate"
                style={{ fontSize: '2.4cqw' }}
              >
                {student.first_name || '—'}
              </span>
            </div>

            {/* Ligne Matricule */}
            <div className="border-b border-slate-200/70 pb-[1.2cqw] flex items-baseline gap-1.5 truncate">
              <span
                className="font-bold tracking-tight flex-shrink-0"
                style={{ fontSize: '2.4cqw', color: primaryColor }}
              >
                Matricule :
              </span>
              <span
                className="font-medium text-[#1E293B] font-mono tracking-wide truncate"
                style={{ fontSize: '2.4cqw' }}
              >
                {student.matricule || `UAI${academicYear.slice(0, 4)}${String(student.id).padStart(3, '0')}`}
              </span>
            </div>

            {/* Ligne Filière */}
            <div className="border-b border-slate-200/70 pb-[1.2cqw] flex items-baseline gap-1.5 truncate">
              <span
                className="font-bold tracking-tight flex-shrink-0"
                style={{ fontSize: '2.4cqw', color: primaryColor }}
              >
                Filière :
              </span>
              <span
                className="font-medium text-[#1E293B] truncate"
                style={{ fontSize: '2.4cqw' }}
              >
                {student.filiere || 'Informatique'}
              </span>
            </div>

            {/* Ligne Niveau */}
            <div className="flex items-baseline gap-1.5 truncate">
              <span
                className="font-bold tracking-tight flex-shrink-0"
                style={{ fontSize: '2.4cqw', color: primaryColor }}
              >
                Niveau :
              </span>
              <span
                className="font-bold truncate"
                style={{ fontSize: '2.4cqw', color: accentColor }}
              >
                {student.level || 'L1'}
              </span>
            </div>
          </div>

          {/* 3. QR CODE SÉCURISÉ (DROITE, SI ACTIVÉ) */}
          {showQrCode ? (
            <div
              className="flex-shrink-0 rounded-xl p-1 bg-white border border-slate-200/80 shadow-xs flex items-center justify-center"
              style={{ width: '23cqw', height: '23cqw' }}
            >
              <img
                src={qrCodeUrl}
                alt="QR Code"
                loading="lazy"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.opacity = '0';
                }}
              />
            </div>
          ) : (
            <div
              className="flex-shrink-0 rounded-xl p-1.5 bg-slate-50 border border-dashed border-slate-200 flex flex-col items-center justify-center text-center"
              style={{ width: '23cqw', height: '23cqw' }}
            >
              <ShieldCheck style={{ width: '8cqw', height: '8cqw', color: accentColor }} />
              <span className="font-bold uppercase tracking-wider text-slate-400 mt-1" style={{ fontSize: '1.4cqw' }}>
                Certifié
              </span>
            </div>
          )}
        </div>

        {/* PIED DE CARTE : DEVISE / SLOGAN CENTRÉ */}
        <div className="absolute bottom-0 inset-x-0 h-[12.5%] flex items-center justify-center px-4 z-10">
          <p
            className="font-semibold tracking-tight text-center truncate"
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
            <p>{university.address || 'Campus Universitaire Central'}</p>
            <p>{university.email || 'contact@unisphere.ai'} • {university.phone || '+225 07 00 00 00'}</p>
            <p className="font-mono font-semibold" style={{ color: accentColor }}>{university.website || 'https://unisphere.ai'}</p>
          </div>

          {/* Sceau & Signature */}
          <div className="text-center flex flex-col items-center">
            <span
              className="font-bold text-slate-400 uppercase tracking-wider"
              style={{ fontSize: '1.5cqw' }}
            >
              Le Recteur / La Direction
            </span>
            <div
              className="border border-dashed border-slate-300 rounded flex items-center justify-center bg-slate-50/50 mt-0.5"
              style={{ width: '16cqw', height: '7cqw' }}
            >
              <span
                className="font-serif italic font-semibold"
                style={{ fontSize: '1.9cqw', color: primaryColor }}
              >
                Certifié Conforme
              </span>
            </div>
          </div>
        </div>

        {/* Slogan au bas du verso */}
        <div className="text-center border-t border-slate-100 pt-1">
          <p
            className="font-semibold tracking-tight"
            style={{ fontSize: '2.3cqw', color: primaryColor }}
          >
            {slogan}
          </p>
        </div>
      </div>
    </div>
  );
}
