'use client';

import React, { useState, useId } from 'react';
import { getMediaUrl } from '@/lib/api';

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
  const uid = useId().replace(/:/g, '');
  const [photoError, setPhotoError] = useState(false);
  const [qrError, setQrError] = useState(false);

  // Configuration dynamique : customization > university.card_config > valeurs officielles par défaut
  const savedCfg = university.card_config || {};
  const primaryColor = customization?.primaryColor || savedCfg.primary_color || savedCfg.header_background_color || '#072146';
  const accentColor = customization?.accentColor || savedCfg.accent_color || savedCfg.matricule_background_color || '#FF7300';
  const slogan = customization?.slogan || university.slogan || savedCfg.slogan || "Ensemble pour l'excellence";
  const subtitle = customization?.subtitle || savedCfg.subtitle || "Université Intelligente";
  const showWatermark = customization?.showWatermark ?? (savedCfg.show_watermark !== false);
  const showQrCode = customization?.showQrCode ?? (savedCfg.show_qr_code !== false);

  const univName = university.name || 'UniSphere AI';
  const academicYear = university.academic_year || '2026-2027';

  // Photo de l'étudiant avec fallback sur le portrait officiel haute définition
  const studentPhotoUrl = (!photoError && student.photo)
    ? getMediaUrl(student.photo)
    : '/images/default-student-avatar.jpg';

  // QR Code officiel avec fallback sur le QR haute définition
  const qrCodeUrl = !qrError
    ? `/api/v1/students/${student.id || 1}/qrcode`
    : '/images/default-card-qrcode.png';

  const clipPhotoId = `photo-clip-${uid}`;
  const clipCardId = `card-clip-${uid}`;
  const shadowId = `shadow-${uid}`;

  /* -------------------------------------------------------------------------- */
  /* RECTO : REPRODUCTION EXACTE VECTORIELLE ISO CR80 (856 × 540)               */
  /* -------------------------------------------------------------------------- */
  if (side === 'recto') {
    return (
      <div
        className={`official-student-card relative select-none w-full ${
          mode === 'print'
            ? 'w-[85.6mm] h-[54mm] shadow-none rounded-[4mm] overflow-hidden'
            : 'max-w-[560px] aspect-[856/540] rounded-2xl shadow-xl'
        } ${className}`}
        style={{
          boxSizing: 'border-box'
        }}
      >
        <svg
          viewBox="0 0 856 540"
          className="w-full h-full block rounded-2xl overflow-hidden"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
          }}
        >
          <defs>
            {/* Découpe aux coins arrondis de la carte */}
            <clipPath id={clipCardId}>
              <rect x="0" y="0" width="856" height="540" rx="28" ry="28" />
            </clipPath>

            {/* Découpe arrondie de la photo */}
            <clipPath id={clipPhotoId}>
              <rect x="52" y="156" width="200" height="260" rx="18" ry="18" />
            </clipPath>

            {/* Ombre légère pour le QR Code */}
            <filter id={shadowId} x="-5%" y="-5%" width="115%" height="115%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.08" />
            </filter>
          </defs>

          {/* FOND DE LA CARTE (BLANC PUR) */}
          <g clipPath={`url(#${clipCardId})`}>
            <rect x="0" y="0" width="856" height="540" fill="#FFFFFF" />

            {/* ============================================================== */}
            {/* 1. FILIGRANE DE SÉCURITÉ TOPOGRAPHIQUE (VAGUES SOUPLES)        */}
            {/* ============================================================== */}
            {showWatermark && (
              <g stroke="#38BDF8" strokeWidth="1.3" strokeOpacity="0.14" fill="none">
                <path d="M 210 540 C 430 480, 590 370, 856 390" />
                <path d="M 240 540 C 460 470, 620 350, 856 360" />
                <path d="M 270 540 C 490 460, 650 330, 856 330" />
                <path d="M 300 540 C 520 450, 680 310, 856 300" />
                <path d="M 330 540 C 550 440, 710 290, 856 270" />
                <path d="M 360 540 C 580 430, 740 270, 856 240" />
                <path d="M 390 540 C 610 420, 770 250, 856 210" />
                <path d="M 420 540 C 640 410, 800 230, 856 170" />
                <path d="M -20 440 C 90 470, 170 510, 230 540" />
                <path d="M -20 470 C 80 495, 150 520, 200 540" />
              </g>
            )}

            {/* ============================================================== */}
            {/* 2. EN-TÊTE VECTORIEL EXACT : DOUBLE VAGUE BLEU NUIT & ORANGE    */}
            {/* ============================================================== */}
            {/* 2.1 Vague inférieure d'accent (Orange) */}
            <path
              d="M 0 0 L 856 0 L 856 122 C 700 105, 520 152, 330 168 C 180 178, 80 162, 0 138 Z"
              fill={accentColor}
            />

            {/* 2.2 Vague supérieure principale (Bleu Nuit) */}
            <path
              d="M 0 0 L 856 0 L 856 70 C 700 75, 520 125, 330 148 C 180 160, 80 148, 0 124 Z"
              fill={primaryColor}
            />

            {/* ============================================================== */}
            {/* 3. LOGO & TEXTES DE L'UNIVERSITÉ DANS L'EN-TÊTE                */}
            {/* ============================================================== */}
            {/* Badge circulaire blanc */}
            <circle cx="95" cy="80" r="44" fill="#FFFFFF" stroke={accentColor} strokeWidth="3" />

            {/* Logo académique officiel : Toque bleu nuit + pompon orange */}
            <g transform="translate(63, 48)">
              {/* Mortier supérieur */}
              <path d="M32 15L7 28L32 40L57 28L32 15Z" fill={primaryColor} />
              {/* Calotte */}
              <path d="M17 33V43C17 48 24 51 32 51C40 51 47 48 47 43V33L32 40L17 33Z" fill={primaryColor} />
              {/* Bouton central & fil */}
              <circle cx="32" cy="28" r="3" fill={accentColor} />
              <path d="M32 28C25 30 14 36 13 42" stroke={accentColor} strokeWidth="2.8" strokeLinecap="round" fill="none" />
              {/* Pompon */}
              <path d="M10 42L16 42L15 52L11 52Z" fill={accentColor} />
            </g>

            {/* Titre & Sous-titre de l'établissement */}
            {univName.toLowerCase().includes('unisphere') ? (
              <text x="156" y="77" fill="#FFFFFF" fontSize="33" fontWeight="800" letterSpacing="-0.5">
                UniSphere <tspan fill={accentColor} fontWeight="900">AI</tspan>
              </text>
            ) : (
              <text x="156" y="77" fill="#FFFFFF" fontSize="30" fontWeight="800" letterSpacing="-0.5">
                {univName}
              </text>
            )}
            <text x="158" y="107" fill="#FFFFFF" fontSize="19" fontWeight="400" letterSpacing="0.4" opacity="0.95">
              {subtitle}
            </text>

            {/* ============================================================== */}
            {/* 4. PHOTO OFFICIELLE DE L'ÉTUDIANT (COLONNE GAUCHE)             */}
            {/* ============================================================== */}
            <g>
              {/* Photo recadrée nette */}
              <image
                href={studentPhotoUrl}
                x="52"
                y="156"
                width="200"
                height="260"
                preserveAspectRatio="xMidYMid slice"
                clipPath={`url(#${clipPhotoId})`}
                onError={() => setPhotoError(true)}
              />
              {/* Cadre fin */}
              <rect
                x="52"
                y="156"
                width="200"
                height="260"
                rx="18"
                ry="18"
                fill="none"
                stroke="#E2E8F0"
                strokeWidth="1.5"
              />
            </g>

            {/* ============================================================== */}
            {/* 5. INFORMATIONS DE L'ÉTUDIANT (COLONNE CENTRALE ALIGNÉE)        */}
            {/* ============================================================== */}
            <g fontSize="23" fontFamily="Inter, system-ui, -apple-system, sans-serif">
              {/* 5.1 Nom */}
              <text x="280" y="210" fill={primaryColor} fontWeight="700">Nom :</text>
              <text x="365" y="210" fill="#1E293B" fontWeight="500">{student.last_name || 'Diallo'}</text>
              <line x1="280" y1="226" x2="575" y2="226" stroke="#E2E8F0" strokeWidth="1.4" />

              {/* 5.2 Prénom */}
              <text x="280" y="260" fill={primaryColor} fontWeight="700">Prénom :</text>
              <text x="395" y="260" fill="#1E293B" fontWeight="500">{student.first_name || 'Moussa'}</text>
              <line x1="280" y1="276" x2="575" y2="276" stroke="#E2E8F0" strokeWidth="1.4" />

              {/* 5.3 Matricule */}
              <text x="280" y="310" fill={primaryColor} fontWeight="700">Matricule :</text>
              <text x="410" y="310" fill="#1E293B" fontWeight="500" letterSpacing="0.3">
                {student.matricule || `UAI${academicYear.slice(0, 4)}${String(student.id || 1).padStart(3, '0')}`}
              </text>
              <line x1="280" y1="326" x2="575" y2="326" stroke="#E2E8F0" strokeWidth="1.4" />

              {/* 5.4 Filière */}
              <text x="280" y="360" fill={primaryColor} fontWeight="700">Filière :</text>
              <text x="375" y="360" fill="#1E293B" fontWeight="500">{student.filiere || 'Informatique'}</text>
              <line x1="280" y1="376" x2="575" y2="376" stroke="#E2E8F0" strokeWidth="1.4" />

              {/* 5.5 Niveau */}
              <text x="280" y="410" fill={primaryColor} fontWeight="700">Niveau :</text>
              <text x="385" y="410" fill="#1E293B" fontWeight="600">{student.level || 'L1'}</text>
              <line x1="280" y1="426" x2="575" y2="426" stroke="#E2E8F0" strokeWidth="1.4" />
            </g>

            {/* ============================================================== */}
            {/* 6. QR CODE SÉCURISÉ PROPORTIONNÉ (COLONNE DROITE)             */}
            {/* ============================================================== */}
            {showQrCode && (
              <g filter={`url(#${shadowId})`}>
                <rect
                  x="598"
                  y="180"
                  width="206"
                  height="206"
                  rx="18"
                  ry="18"
                  fill="#FFFFFF"
                  stroke="#E2E8F0"
                  strokeWidth="1.5"
                />
                <image
                  href={qrCodeUrl}
                  x="609"
                  y="191"
                  width="184"
                  height="184"
                  preserveAspectRatio="xMidYMid meet"
                  onError={() => setQrError(true)}
                />
              </g>
            )}

            {/* ============================================================== */}
            {/* 7. PIED DE CARTE : DEVISE OFFICIELLE CENTRÉE                   */}
            {/* ============================================================== */}
            <text
              x="428"
              y="490"
              textAnchor="middle"
              fill={primaryColor}
              fontSize="23"
              fontWeight="600"
              letterSpacing="-0.2"
            >
              {slogan}
            </text>

            {/* Contour général fin de la carte */}
            <rect
              x="0.75"
              y="0.75"
              width="854.5"
              height="538.5"
              rx="28"
              ry="28"
              fill="none"
              stroke="#CBD5E1"
              strokeWidth="1.5"
            />
          </g>
        </svg>
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* VERSO : CONFORME ET PARFAITEMENT ÉQUILIBRÉ                                  */
  /* -------------------------------------------------------------------------- */
  return (
    <div
      className={`official-student-card relative select-none w-full ${
        mode === 'print'
          ? 'w-[85.6mm] h-[54mm] shadow-none rounded-[4mm] overflow-hidden'
          : 'max-w-[560px] aspect-[856/540] rounded-2xl shadow-xl'
      } ${className}`}
      style={{
        boxSizing: 'border-box'
      }}
    >
      <svg
        viewBox="0 0 856 540"
        className="w-full h-full block rounded-2xl overflow-hidden"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
        }}
      >
        <defs>
          <clipPath id={`verso-${clipCardId}`}>
            <rect x="0" y="0" width="856" height="540" rx="28" ry="28" />
          </clipPath>
        </defs>

        <g clipPath={`url(#verso-${clipCardId})`}>
          {/* Fond blanc */}
          <rect x="0" y="0" width="856" height="540" fill="#FFFFFF" />

          {/* Bande supérieure magnétique */}
          <rect x="0" y="0" width="856" height="80" fill="#0F172A" />
          <line x1="0" y1="80" x2="856" y2="80" stroke={accentColor} strokeWidth="3" />

          {/* Conditions officielles d'usage */}
          <g transform="translate(50, 115)">
            <text x="0" y="24" fill={primaryColor} fontSize="20" fontWeight="700" letterSpacing="0.5">
              CONDITIONS OFFICIELLES D'USAGE
            </text>
            <text x="756" y="24" textAnchor="end" fill="#64748B" fontSize="17" fontWeight="600">
              Année : {academicYear}
            </text>
            <line x1="0" y1="36" x2="756" y2="36" stroke="#E2E8F0" strokeWidth="1.5" />

            <text x="0" y="70" fill="#475569" fontSize="16" fontWeight="400">
              Cette carte est strictement personnelle et incessible. Tout porteur doit la présenter
            </text>
            <text x="0" y="98" fill="#475569" fontSize="16" fontWeight="400">
              aux agents habilités lors des cours, contrôles continus et examens universitaires.
            </text>
            <text x="0" y="138" fill="#475569" fontSize="16" fontWeight="400">
              En cas de perte, vol ou détérioration, avertir sans délai le secrétariat académique.
            </text>
          </g>

          {/* Contact campus & Signature */}
          <g transform="translate(50, 390)">
            <line x1="0" y1="0" x2="756" y2="0" stroke="#E2E8F0" strokeWidth="1.5" />
            
            <text x="0" y="35" fill={primaryColor} fontSize="20" fontWeight="800">
              {univName}
            </text>
            {university.address && (
              <text x="0" y="62" fill="#64748B" fontSize="16">
                {university.address}
              </text>
            )}
            {university.phone && (
              <text x="0" y="88" fill="#64748B" fontSize="16">
                Tél : {university.phone}
              </text>
            )}

            {/* Bloc Signature */}
            <g transform="translate(580, 20)">
              <text x="80" y="18" textAnchor="middle" fill="#475569" fontSize="16" fontWeight="600">
                Le Secrétariat Général
              </text>
              <rect
                x="0"
                y="30"
                width="160"
                height="55"
                rx="8"
                ry="8"
                fill="none"
                stroke={accentColor}
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
              <text x="80" y="63" textAnchor="middle" fill="#94A3B8" fontSize="14" fontStyle="italic">
                Cachet & Signature
              </text>
            </g>
          </g>

          {/* Contour général */}
          <rect
            x="0.75"
            y="0.75"
            width="854.5"
            height="538.5"
            rx="28"
            ry="28"
            fill="none"
            stroke="#CBD5E1"
            strokeWidth="1.5"
          />
        </g>
      </svg>
    </div>
  );
}
