'use client';

import React from 'react';
import { getMediaUrl } from '@/lib/api';

export type CardTemplateId =
  | 'wave_orange'      // Modèle Signature Onde Orange (User's Exact Design)
  | 'minimal_swiss'    // Modèle Épure Suisse / Studio
  | 'prestige_gold'    // Modèle Prestige & Or Académique
  | 'emerald_academic' // Modèle Émeraude Universitaire
  | 'cyber_polytech'   // Modèle Cyber & Haute Technologie
  | 'sunset_dynamic'   // Modèle Sunset & Business School
  | 'classic_heritage' // Modèle Héritage National & Solennel
  | 'split_modern'     // Modèle Split Bicolore Asymétrique
  | 'eco_campus';      // Modèle Éco Campus & Sciences

export interface StudentCardData {
  id: number | string;
  first_name: string;
  last_name: string;
  matricule?: string;
  filiere?: string;
  level?: string;
  photo?: string | null;
  date_of_birth?: string | null;
  phone?: string | null;
  status?: string;
  academic_year?: string;
  qr_code_url?: string;
}

export interface UniversityCardInfo {
  name?: string;
  logo?: string | null;
  slogan?: string;
  academic_year?: string;
  country?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface CardTemplateMetadata {
  id: CardTemplateId;
  name: string;
  subtitle: string;
  icon: string;
  tagline: string;
  primaryColor: string;
  accentColor: string;
}

export const CARD_TEMPLATES_REGISTRY: CardTemplateMetadata[] = [
  {
    id: 'wave_orange',
    name: 'Onde Orange & Nuit',
    subtitle: 'Design Signature Excellence',
    icon: '🌊',
    tagline: 'Courbe dynamique orange, bleu nuit & filigrane guillochis',
    primaryColor: '#0a1628',
    accentColor: '#FF6B00'
  },
  {
    id: 'minimal_swiss',
    name: 'Épure Suisse',
    subtitle: 'Minimalisme International',
    icon: '📐',
    tagline: 'Lignes épurées, grille micro-points & typographie moderniste',
    primaryColor: '#0f172a',
    accentColor: '#2563eb'
  },
  {
    id: 'prestige_gold',
    name: 'Prestige & Or Royal',
    subtitle: 'Grande Académie & Honneur',
    icon: '👑',
    tagline: 'Fond obsidienne impérial, liserés d\'or noble & lauriers',
    primaryColor: '#0b132b',
    accentColor: '#d4af37'
  },
  {
    id: 'emerald_academic',
    name: 'Émeraude Académique',
    subtitle: 'Grandes Écoles & Facultés',
    icon: '🏛️',
    tagline: 'Vert impérial profond, ivoire noble & motif diamant sécurité',
    primaryColor: '#064e3b',
    accentColor: '#10b981'
  },
  {
    id: 'cyber_polytech',
    name: 'Cyber Polytech',
    subtitle: 'Haute Technologie & Ingénierie',
    icon: '⚡',
    tagline: 'Circuit imprimé cybernétique, néon cyan & HUD biométrique',
    primaryColor: '#0a0f1d',
    accentColor: '#00f0ff'
  },
  {
    id: 'sunset_dynamic',
    name: 'Sunset Dynamic',
    subtitle: 'Business, Management & Arts',
    icon: '🌅',
    tagline: 'Dégradé chaud tangerine-violet, badges arrondis contemporains',
    primaryColor: '#c026d3',
    accentColor: '#ff5722'
  },
  {
    id: 'classic_heritage',
    name: 'Héritage National',
    subtitle: 'Souverain & République',
    icon: '📜',
    tagline: 'Bandeau officiel solennel, sceau universitaire & typographie romaine',
    primaryColor: '#1e293b',
    accentColor: '#b91c1c'
  },
  {
    id: 'split_modern',
    name: 'Split Bicolore',
    subtitle: 'Asymétrie Contemporaine',
    icon: '🌓',
    tagline: 'Bloc latéral contrasté pour la photo, espace épuré pour les données',
    primaryColor: '#1e3a8a',
    accentColor: '#f59e0b'
  },
  {
    id: 'eco_campus',
    name: 'Éco Campus',
    subtitle: 'Santé & Développement Durable',
    icon: '🌿',
    tagline: 'Eucalyptus doux, terracotta naturel & courbes organiques',
    primaryColor: '#2d5a46',
    accentColor: '#c86d51'
  }
];

interface StudentCardTemplateProps {
  template?: CardTemplateId | string;
  student: StudentCardData;
  university?: UniversityCardInfo;
  className?: string;
  scale?: number;
}

export default function StudentCardTemplate({
  template = 'wave_orange',
  student,
  university,
  className = '',
}: StudentCardTemplateProps) {
  const activeTemplate = (CARD_TEMPLATES_REGISTRY.some(t => t.id === template)
    ? template
    : 'wave_orange') as CardTemplateId;

  const univName = university?.name || 'UniSphere AI';
  const univSlogan = university?.slogan || "Ensemble pour l'excellence";
  const academicYear = university?.academic_year || '2025 - 2026';
  const logoUrl = university?.logo ? getMediaUrl(university.logo) : '/logo.png';
  const photoUrl = student.photo ? getMediaUrl(student.photo) : null;
  const qrCodeUrl = student.qr_code_url || `/api/v1/students/${student.id}/qrcode`;

  const initials = `${(student.first_name || '')[0] || ''}${(student.last_name || '')[0] || ''}`.toUpperCase() || 'ET';
  const matricule = student.matricule || `UAI${String(student.id).padStart(6, '0')}`;
  const filiere = student.filiere || 'Informatique';
  const level = student.level || 'L1';

  // =========================================================================
  // TEMPLATE 1: WAVE ORANGE (Exact Match to User's Uploaded Card Design)
  // =========================================================================
  if (activeTemplate === 'wave_orange') {
    return (
      <div
        className={`student-card-root relative bg-white rounded-2xl overflow-hidden border border-slate-300 shadow-md select-none print:shadow-none print:border-none w-full h-[54mm] sm:h-[55.5mm] flex flex-col justify-between ${className}`}
        style={{
          boxSizing: 'border-box',
          fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact'
        }}
      >
        {/* Subtle Security Guillochis Wave Watermark Background */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-30 z-0"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 500 315"
          preserveAspectRatio="none"
        >
          <path d="M0,130 C120,90 200,180 320,130 C420,90 460,160 500,120" fill="none" stroke="#93c5fd" strokeWidth="0.8" />
          <path d="M0,145 C130,105 210,195 330,145 C430,105 470,175 500,135" fill="none" stroke="#cbd5e1" strokeWidth="0.7" />
          <path d="M0,160 C140,120 220,210 340,160 C440,120 480,190 500,150" fill="none" stroke="#93c5fd" strokeWidth="0.8" />
          <path d="M0,175 C150,135 230,225 350,175 C450,135 490,205 500,165" fill="none" stroke="#e2e8f0" strokeWidth="0.6" />
          <path d="M0,190 C160,150 240,240 360,190 C460,150 495,220 500,180" fill="none" stroke="#93c5fd" strokeWidth="0.7" />
          <path d="M0,205 C170,165 250,255 370,205 C470,165 498,235 500,195" fill="none" stroke="#cbd5e1" strokeWidth="0.7" />
          <path d="M0,220 C180,180 260,270 380,220 C475,180 499,250 500,210" fill="none" stroke="#93c5fd" strokeWidth="0.8" />
        </svg>

        {/* Top Header: Curved Deep Navy & Vibrant Orange Wave */}
        <div className="relative w-full h-[28%] z-10 flex-shrink-0">
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 500 90"
            preserveAspectRatio="none"
          >
            {/* Vibrant Orange Ribbon Wave */}
            <path
              d="M 0,0 L 500,0 L 500,75 C 380,68 250,92 0,28 Z"
              fill="#FF6B00"
            />
            {/* Deep Navy Curved Wave Overlay */}
            <path
              d="M 0,0 L 500,0 L 500,48 C 360,40 230,76 0,22 Z"
              fill="#0A1628"
            />
          </svg>

          {/* Header Content */}
          <div className="relative z-10 h-full flex items-center px-4 sm:px-5">
            <div className="flex items-center gap-2.5">
              {/* University Logo / Badge */}
              <div className="w-8 h-8 rounded-full bg-white p-0.5 flex-shrink-0 shadow-sm flex items-center justify-center border border-orange-200">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt=""
                    className="w-full h-full object-contain"
                    onError={(e: any) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-[#FF6B00] flex items-center justify-center text-white text-[10px] font-black">
                    🎓
                  </div>
                )}
              </div>

              {/* University Name & Tagline */}
              <div className="leading-tight text-white drop-shadow-sm">
                <div className="flex items-center gap-1 font-extrabold text-[13px] sm:text-[14px] tracking-tight">
                  <span className="text-white">{univName}</span>
                </div>
                <div className="text-[8px] sm:text-[9px] font-medium text-slate-200 tracking-wide">
                  {university?.slogan || 'Université Intelligente'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card Body: Photo (Left) - Data Lines (Center) - QR Code (Right) */}
        <div className="relative z-10 px-4 sm:px-5 py-1 flex items-center justify-between gap-3 flex-1 min-h-0">
          {/* Photo */}
          <div className="relative w-[68px] sm:w-[74px] h-[86px] sm:h-[92px] rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 shadow-sm border border-slate-200">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt=""
                className="w-full h-full object-cover"
                onError={(e: any) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-b from-[#0A1628] to-[#1E293B] flex flex-col items-center justify-center text-white">
                <span className="text-[#FF6B00] font-black text-sm">{initials}</span>
                <span className="text-[7px] text-slate-300 uppercase tracking-widest mt-1">ÉTUDIANT</span>
              </div>
            )}
          </div>

          {/* Data Rows with Underlines */}
          <div className="flex-1 min-w-0 flex flex-col justify-center space-y-1 sm:space-y-1.5 pl-1">
            <div className="flex items-baseline border-b border-slate-200 pb-0.5">
              <span className="text-[10px] sm:text-[11px] font-bold text-[#0A1628] w-20 flex-shrink-0">Nom :</span>
              <span className="text-[10.5px] sm:text-[11.5px] font-extrabold text-slate-900 uppercase truncate">
                {student.last_name}
              </span>
            </div>

            <div className="flex items-baseline border-b border-slate-200 pb-0.5">
              <span className="text-[10px] sm:text-[11px] font-bold text-[#0A1628] w-20 flex-shrink-0">Prénom :</span>
              <span className="text-[10.5px] sm:text-[11.5px] font-bold text-slate-800 capitalize truncate">
                {student.first_name}
              </span>
            </div>

            <div className="flex items-baseline border-b border-slate-200 pb-0.5">
              <span className="text-[10px] sm:text-[11px] font-bold text-[#0A1628] w-20 flex-shrink-0">Matricule :</span>
              <span className="text-[10px] sm:text-[11px] font-mono font-black text-[#0A1628] tracking-wider truncate">
                {matricule}
              </span>
            </div>

            <div className="flex items-baseline border-b border-slate-200 pb-0.5">
              <span className="text-[10px] sm:text-[11px] font-bold text-[#0A1628] w-20 flex-shrink-0">Filière :</span>
              <span className="text-[9.5px] sm:text-[10.5px] font-semibold text-slate-700 truncate">
                {filiere}
              </span>
            </div>

            <div className="flex items-baseline">
              <span className="text-[10px] sm:text-[11px] font-bold text-[#0A1628] w-20 flex-shrink-0">Niveau :</span>
              <span className="text-[9.5px] sm:text-[10.5px] font-bold text-[#0A1628]">
                {level}
              </span>
            </div>
          </div>

          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center flex-shrink-0 pl-1">
            <div className="p-1 bg-white rounded-xl border border-slate-200 shadow-xs">
              <img
                src={qrCodeUrl}
                alt="QR Code"
                className="w-16 sm:w-[72px] h-16 sm:h-[72px] object-contain"
                onError={(e: any) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
          </div>
        </div>

        {/* Bottom Slogan */}
        <div className="relative z-10 w-full py-1 text-center flex-shrink-0">
          <p className="text-[10px] sm:text-[11px] font-bold text-[#0A1628] tracking-wide">
            {univSlogan}
          </p>
        </div>
      </div>
    );
  }

  // =========================================================================
  // TEMPLATE 2: MINIMAL SWISS (Modernist Swiss Studio Style)
  // =========================================================================
  if (activeTemplate === 'minimal_swiss') {
    return (
      <div
        className={`student-card-root relative bg-white rounded-xl overflow-hidden border border-slate-400/80 shadow-md select-none print:shadow-none print:border-none w-full h-[54mm] sm:h-[55.5mm] flex ${className}`}
        style={{
          boxSizing: 'border-box',
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact'
        }}
      >
        {/* Left Vertical Accent Spine */}
        <div className="w-3 sm:w-3.5 bg-slate-900 flex-shrink-0 flex flex-col justify-between py-2 items-center text-white">
          <span className="text-[6px] font-mono tracking-widest uppercase [writing-mode:vertical-lr] rotate-180 opacity-70">
            {academicYear}
          </span>
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        </div>

        {/* Micro-dot Background */}
        <div
          className="flex-1 flex flex-col justify-between p-3.5 sm:p-4 bg-white"
          style={{
            backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)',
            backgroundSize: '10px 10px'
          }}
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-slate-900/10 pb-2">
            <div>
              <h4 className="text-[11px] sm:text-[12px] font-black uppercase tracking-tight text-slate-950">
                {univName}
              </h4>
              <p className="text-[7.5px] font-mono uppercase tracking-widest text-slate-500">
                STUDENT IDENTIFICATION CREDENTIAL
              </p>
            </div>
            <div className="text-right">
              <span className="text-[8px] font-mono font-bold px-2 py-0.5 bg-slate-100 rounded text-slate-900 border border-slate-200">
                {matricule}
              </span>
            </div>
          </div>

          {/* Middle Content */}
          <div className="flex items-center gap-3 my-1">
            <div className="w-16 h-20 bg-slate-100 rounded border border-slate-300 overflow-hidden flex-shrink-0">
              {photoUrl ? (
                <img src={photoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-black text-slate-400 text-xs">
                  {initials}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <div>
                <p className="text-[7px] font-mono uppercase tracking-widest text-slate-400">SURNAME / NOM</p>
                <p className="text-[12px] font-black text-slate-950 uppercase leading-none truncate">{student.last_name}</p>
              </div>
              <div>
                <p className="text-[7px] font-mono uppercase tracking-widest text-slate-400">GIVEN NAME / PRÉNOM</p>
                <p className="text-[11px] font-bold text-slate-800 capitalize leading-none truncate">{student.first_name}</p>
              </div>
              <div className="flex items-center gap-4 pt-1">
                <div>
                  <p className="text-[6.5px] font-mono uppercase text-slate-400">MAJOR / FILIÈRE</p>
                  <p className="text-[9px] font-semibold text-slate-900 truncate max-w-[120px]">{filiere}</p>
                </div>
                <div>
                  <p className="text-[6.5px] font-mono uppercase text-slate-400">LEVEL</p>
                  <p className="text-[9px] font-bold text-blue-600">{level}</p>
                </div>
              </div>
            </div>

            <div className="w-14 h-14 bg-white p-0.5 border border-slate-300 rounded flex-shrink-0">
              <img src={qrCodeUrl} alt="" className="w-full h-full object-contain" />
            </div>
          </div>

          {/* Bottom Micro Footer */}
          <div className="flex items-center justify-between text-[7px] font-mono text-slate-500 pt-1 border-t border-slate-100">
            <span>OFFICIAL UNIVERSITY SEAL</span>
            <span>VERIFIED DIGITAL ID</span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // TEMPLATE 3: PRESTIGE GOLD (Royal Obsidian & Gold Foil)
  // =========================================================================
  if (activeTemplate === 'prestige_gold') {
    return (
      <div
        className={`student-card-root relative bg-[#0b132b] rounded-2xl overflow-hidden border-2 border-amber-500/70 shadow-lg select-none print:shadow-none print:border-amber-600 w-full h-[54mm] sm:h-[55.5mm] flex flex-col justify-between p-3 sm:p-3.5 text-white ${className}`}
        style={{
          boxSizing: 'border-box',
          fontFamily: "'Cinzel', 'Times New Roman', serif",
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact'
        }}
      >
        {/* Subtle Gold Laurel Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
          <span className="text-[160px] text-amber-300">🏛️</span>
        </div>

        {/* Top Gold Border Flourish */}
        <div className="flex items-center justify-between border-b border-amber-400/40 pb-1.5 relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 p-0.5 shadow-sm">
              <div className="w-full h-full rounded-full bg-[#0b132b] flex items-center justify-center text-amber-300 font-bold text-xs">
                ⚜️
              </div>
            </div>
            <div>
              <p className="text-[11px] sm:text-[12px] font-black uppercase tracking-wider text-amber-200">
                {univName}
              </p>
              <p className="text-[7px] uppercase tracking-widest text-amber-400/80 font-sans">
                ACADÉMIE D'EXCELLENCE & D'HONNEUR
              </p>
            </div>
          </div>
          <span className="text-[8px] font-mono font-bold px-2 py-0.5 rounded border border-amber-400/50 text-amber-300 bg-amber-950/40 font-sans">
            {academicYear}
          </span>
        </div>

        {/* Main Body */}
        <div className="flex items-center justify-between gap-3 relative z-10 my-0.5 font-sans">
          {/* Photo in Gold Medallion */}
          <div className="w-16 h-20 rounded-xl overflow-hidden border-2 border-amber-400/80 shadow-md bg-slate-900 flex-shrink-0">
            {photoUrl ? (
              <img src={photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-amber-300 font-bold text-xs">
                {initials}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 space-y-1">
            <div>
              <p className="text-[13px] font-black uppercase text-amber-100 truncate">{student.last_name}</p>
              <p className="text-[11px] font-semibold text-white/90 capitalize truncate">{student.first_name}</p>
            </div>
            <div>
              <span className="inline-block px-2 py-0.5 rounded bg-amber-400/20 border border-amber-400/40 font-mono font-bold text-[9px] text-amber-300">
                {matricule}
              </span>
            </div>
            <div className="text-[8.5px] text-amber-100/80 space-y-0.5">
              <p className="truncate"><span className="text-amber-400 font-bold">Filière:</span> {filiere}</p>
              <p><span className="text-amber-400 font-bold">Niveau:</span> {level}</p>
            </div>
          </div>

          {/* QR */}
          <div className="p-1 rounded-xl bg-white border border-amber-400/60 flex-shrink-0">
            <img src={qrCodeUrl} alt="" className="w-14 h-14 object-contain" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-[7px] text-amber-300/80 border-t border-amber-400/30 pt-1 font-sans relative z-10">
          <span>CARTE OFFICIELLE INFALSIFIABLE</span>
          <span className="italic">{univSlogan}</span>
        </div>
      </div>
    );
  }

  // =========================================================================
  // TEMPLATE 4: EMERALD ACADEMIC (Imperial Forest & Cream)
  // =========================================================================
  if (activeTemplate === 'emerald_academic') {
    return (
      <div
        className={`student-card-root relative bg-[#fcfdfa] rounded-2xl overflow-hidden border border-emerald-700/40 shadow-md select-none print:shadow-none w-full h-[54mm] sm:h-[55.5mm] flex flex-col justify-between ${className}`}
        style={{
          boxSizing: 'border-box',
          fontFamily: "'Inter', sans-serif",
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact'
        }}
      >
        {/* Deep Emerald Header with Laurel Accent */}
        <div className="bg-gradient-to-r from-[#064e3b] via-[#047857] to-[#064e3b] px-4 py-1.5 flex items-center justify-between text-white flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white p-0.5 flex-shrink-0 flex items-center justify-center">
              {logoUrl ? <img src={logoUrl} alt="" className="w-full h-full object-contain" /> : <span>🏛️</span>}
            </div>
            <div>
              <p className="text-[11px] sm:text-[12px] font-black uppercase tracking-wide text-emerald-50">{univName}</p>
              <p className="text-[7.5px] font-medium text-emerald-200">CARTE D'ÉTUDIANT CERTIFIÉE</p>
            </div>
          </div>
          <span className="text-[7.5px] font-mono font-bold px-2 py-0.5 rounded bg-white/10 text-emerald-100 border border-white/20">
            {academicYear}
          </span>
        </div>

        {/* Body */}
        <div className="px-4 py-1.5 flex items-center justify-between gap-3 flex-1 min-h-0 bg-[#fcfdfa]">
          <div className="w-16 h-20 rounded-xl overflow-hidden border-2 border-emerald-600 bg-emerald-50 flex-shrink-0 shadow-xs">
            {photoUrl ? (
              <img src={photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-emerald-800 text-xs">
                {initials}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div>
              <p className="text-[12px] font-black text-emerald-950 uppercase truncate">{student.last_name}</p>
              <p className="text-[11px] font-bold text-emerald-800 capitalize truncate">{student.first_name}</p>
            </div>
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-md bg-emerald-700 text-white font-mono font-bold text-[9.5px]">
                {matricule}
              </span>
            </div>
            <div className="text-[8.5px] text-slate-700 space-y-0.5">
              <p className="truncate"><b className="text-emerald-900">Filière:</b> {filiere}</p>
              <p><b className="text-emerald-900">Niveau:</b> <span className="font-bold text-emerald-700">{level}</span></p>
            </div>
          </div>

          <div className="p-1 rounded-xl bg-white border border-emerald-300 shadow-xs flex-shrink-0">
            <img src={qrCodeUrl} alt="" className="w-14 h-14 object-contain" />
          </div>
        </div>

        {/* Footer */}
        <div className="bg-emerald-50 border-t border-emerald-200 px-4 py-1 flex items-center justify-between text-[7.5px] font-bold text-emerald-800 flex-shrink-0">
          <span>{univSlogan}</span>
          <span className="font-mono text-emerald-600">CERTIFICATION CONFORME</span>
        </div>
      </div>
    );
  }

  // =========================================================================
  // TEMPLATE 5: CYBER POLYTECH (High-Tech Futuristic Dark Mode)
  // =========================================================================
  if (activeTemplate === 'cyber_polytech') {
    return (
      <div
        className={`student-card-root relative bg-[#0a0f1d] rounded-2xl overflow-hidden border border-cyan-500/60 shadow-xl select-none print:shadow-none w-full h-[54mm] sm:h-[55.5mm] flex flex-col justify-between p-3 sm:p-3.5 text-slate-100 ${className}`}
        style={{
          boxSizing: 'border-box',
          fontFamily: "'JetBrains Mono', 'Courier New', monospace",
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact'
        }}
      >
        {/* Subtle Circuit Grid Watermark */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(to right, #00f0ff 1px, transparent 1px), linear-gradient(to bottom, #00f0ff 1px, transparent 1px)',
            backgroundSize: '16px 16px'
          }}
        />

        {/* Top Cyber Header */}
        <div className="flex items-center justify-between border-b border-cyan-500/40 pb-1.5 relative z-10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <div>
              <p className="text-[11px] sm:text-[12px] font-black uppercase tracking-wider text-cyan-300">
                {univName}
              </p>
              <p className="text-[7px] text-cyan-500/80 uppercase">POLYTECHNIC DIGITAL IDENTITY</p>
            </div>
          </div>
          <span className="text-[8px] font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/50">
            {academicYear}
          </span>
        </div>

        {/* Body */}
        <div className="flex items-center justify-between gap-3 relative z-10 my-0.5">
          {/* Photo with HUD Brackets */}
          <div className="relative w-16 h-20 rounded-lg overflow-hidden border border-cyan-400 bg-slate-900 flex-shrink-0">
            {photoUrl ? (
              <img src={photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-cyan-400 text-xs font-bold">
                {initials}
              </div>
            )}
            <div className="absolute top-0.5 left-0.5 text-[6px] text-cyan-300 font-bold px-1 bg-black/60 rounded">
              BIO_OK
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div>
              <p className="text-[7px] text-cyan-500 uppercase tracking-widest">[USER_ID]</p>
              <p className="text-[12px] font-black uppercase text-white truncate">{student.last_name} {student.first_name}</p>
            </div>
            <div>
              <span className="inline-block px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-400 text-cyan-300 text-[9px] font-bold">
                {matricule}
              </span>
            </div>
            <div className="text-[8px] text-slate-300 space-y-0.5">
              <p className="truncate"><span className="text-cyan-400">FAC:</span> {filiere}</p>
              <p><span className="text-cyan-400">LVL:</span> {level}</p>
            </div>
          </div>

          <div className="p-1 rounded-lg bg-white border-2 border-cyan-400 flex-shrink-0">
            <img src={qrCodeUrl} alt="" className="w-14 h-14 object-contain" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-[7px] text-cyan-400 border-t border-cyan-500/30 pt-1 relative z-10">
          <span>● SECURE_TOKEN // VALIDATED</span>
          <span className="text-slate-400">{univSlogan}</span>
        </div>
      </div>
    );
  }

  // =========================================================================
  // TEMPLATE 6: SUNSET DYNAMIC (Gradient Contemporary)
  // =========================================================================
  if (activeTemplate === 'sunset_dynamic') {
    return (
      <div
        className={`student-card-root relative bg-white rounded-2xl overflow-hidden border border-rose-200 shadow-md select-none print:shadow-none w-full h-[54mm] sm:h-[55.5mm] flex flex-col justify-between ${className}`}
        style={{
          boxSizing: 'border-box',
          fontFamily: "'Inter', sans-serif",
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact'
        }}
      >
        {/* Sunset Gradient Header */}
        <div className="bg-gradient-to-r from-[#FF5722] via-[#E91E63] to-[#7C3AED] px-4 py-2 flex items-center justify-between text-white flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-white p-0.5 flex-shrink-0 shadow-xs flex items-center justify-center">
              {logoUrl ? <img src={logoUrl} alt="" className="w-full h-full object-contain" /> : <span>🎓</span>}
            </div>
            <div>
              <p className="text-[11.5px] sm:text-[12.5px] font-black uppercase tracking-tight">{univName}</p>
              <p className="text-[7.5px] font-semibold text-rose-100">COMMUNICATION & BUSINESS</p>
            </div>
          </div>
          <span className="text-[7.5px] font-bold px-2 py-0.5 rounded-full bg-white/20 border border-white/30 backdrop-blur-xs">
            {academicYear}
          </span>
        </div>

        {/* Body */}
        <div className="px-4 py-1.5 flex items-center justify-between gap-3 flex-1 min-h-0">
          <div className="w-16 h-20 rounded-2xl overflow-hidden p-0.5 bg-gradient-to-tr from-[#FF5722] to-[#7C3AED] flex-shrink-0 shadow-sm">
            <div className="w-full h-full rounded-[14px] overflow-hidden bg-slate-100">
              {photoUrl ? (
                <img src={photoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-rose-600 text-xs">
                  {initials}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div>
              <p className="text-[12.5px] font-black text-slate-950 uppercase truncate">{student.last_name}</p>
              <p className="text-[11px] font-bold text-slate-700 capitalize truncate">{student.first_name}</p>
            </div>
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 text-white font-mono font-bold text-[9px] shadow-xs">
                {matricule}
              </span>
            </div>
            <div className="text-[8.5px] text-slate-600 flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-semibold truncate">{filiere}</span>
              <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold">{level}</span>
            </div>
          </div>

          <div className="p-1 rounded-xl bg-white border border-rose-200 shadow-xs flex-shrink-0">
            <img src={qrCodeUrl} alt="" className="w-14 h-14 object-contain" />
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-100 px-4 py-1 flex items-center justify-between text-[8px] font-semibold text-slate-500 flex-shrink-0">
          <span>{univSlogan}</span>
          <span className="font-bold text-rose-600">UniSphere Digital</span>
        </div>
      </div>
    );
  }

  // =========================================================================
  // TEMPLATE 7: CLASSIC HERITAGE (National Sovereign Style)
  // =========================================================================
  if (activeTemplate === 'classic_heritage') {
    return (
      <div
        className={`student-card-root relative bg-[#fbf9f4] rounded-xl overflow-hidden border-2 border-slate-700 shadow-md select-none print:shadow-none w-full h-[54mm] sm:h-[55.5mm] flex flex-col justify-between ${className}`}
        style={{
          boxSizing: 'border-box',
          fontFamily: "'Times New Roman', Times, serif",
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact'
        }}
      >
        {/* Tricolor / National Top Band */}
        <div className="h-1.5 w-full flex">
          <div className="flex-1 bg-emerald-600" />
          <div className="flex-1 bg-amber-400" />
          <div className="flex-1 bg-red-600" />
        </div>

        {/* Official Header */}
        <div className="px-4 pt-1.5 pb-1 text-center border-b border-slate-300">
          <p className="text-[7.5px] uppercase tracking-widest font-bold text-slate-600 font-sans">
            RÉPUBLIQUE • MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR
          </p>
          <h4 className="text-[12px] sm:text-[13px] font-black uppercase text-slate-900 tracking-wide">
            {univName}
          </h4>
          <p className="text-[7px] uppercase tracking-wider text-slate-500 font-sans font-semibold">
            CARTE D'IDENTITÉ D'ÉTUDIANT OFFICIELLE
          </p>
        </div>

        {/* Body */}
        <div className="px-4 py-1 flex items-center justify-between gap-3 flex-1 min-h-0 font-sans">
          <div className="w-16 h-20 border-2 border-slate-800 bg-white p-0.5 flex-shrink-0 shadow-xs">
            {photoUrl ? (
              <img src={photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs">
                {initials}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div>
              <p className="text-[12px] font-black uppercase text-slate-950 truncate">{student.last_name}</p>
              <p className="text-[11px] font-bold text-slate-700 capitalize truncate">{student.first_name}</p>
            </div>
            <div>
              <span className="text-[9.5px] font-mono font-black text-slate-900 border-b border-slate-900 pb-0.5">
                N° : {matricule}
              </span>
            </div>
            <div className="text-[8.5px] text-slate-700">
              <p className="truncate"><b>Filière :</b> {filiere}</p>
              <p><b>Niveau :</b> {level}</p>
            </div>
          </div>

          <div className="p-0.5 bg-white border border-slate-400 flex-shrink-0">
            <img src={qrCodeUrl} alt="" className="w-14 h-14 object-contain" />
          </div>
        </div>

        {/* Formal Footer */}
        <div className="bg-slate-100 border-t border-slate-300 px-4 py-1 flex items-center justify-between text-[7px] font-sans font-bold text-slate-600 flex-shrink-0">
          <span>STRICTEMENT PERSONNELLE</span>
          <span>SESSION ACADÉMIQUE {academicYear}</span>
        </div>
      </div>
    );
  }

  // =========================================================================
  // TEMPLATE 8: SPLIT MODERN (Asymmetric Vertical Color Block)
  // =========================================================================
  if (activeTemplate === 'split_modern') {
    return (
      <div
        className={`student-card-root relative bg-white rounded-2xl overflow-hidden border border-slate-300 shadow-md select-none print:shadow-none w-full h-[54mm] sm:h-[55.5mm] flex ${className}`}
        style={{
          boxSizing: 'border-box',
          fontFamily: "'Inter', sans-serif",
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact'
        }}
      >
        {/* Left Dark Column (Photo + Vertical Text) */}
        <div className="w-[34%] bg-[#1e293b] p-2.5 flex flex-col justify-between items-center text-white flex-shrink-0">
          <div className="w-full flex items-center justify-center">
            <span className="text-[8px] font-mono font-bold text-amber-400 uppercase tracking-widest">
              {academicYear}
            </span>
          </div>

          <div className="w-16 h-20 rounded-xl overflow-hidden border-2 border-amber-400/80 shadow-md bg-slate-800">
            {photoUrl ? (
              <img src={photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-amber-300 text-xs">
                {initials}
              </div>
            )}
          </div>

          <span className="text-[7.5px] font-mono font-bold text-slate-300 uppercase tracking-wider truncate max-w-full">
            {matricule}
          </span>
        </div>

        {/* Right White Column (Data + QR) */}
        <div className="flex-1 p-3 sm:p-3.5 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <h4 className="text-[11.5px] sm:text-[12.5px] font-black uppercase text-slate-950 truncate">
                {univName}
              </h4>
              <span className="w-2 h-2 rounded-full bg-blue-600" />
            </div>
            <p className="text-[7px] font-bold uppercase tracking-wider text-blue-600 mt-0.5">CARTE ÉTUDIANTE OFFICIELLE</p>
          </div>

          <div className="flex items-center justify-between gap-2 my-1">
            <div className="flex-1 min-w-0 space-y-1">
              <div>
                <p className="text-[12px] font-black uppercase text-slate-900 truncate">{student.last_name}</p>
                <p className="text-[11px] font-bold text-slate-700 capitalize truncate">{student.first_name}</p>
              </div>
              <div className="text-[8.5px] text-slate-600 space-y-0.5">
                <p className="truncate"><b className="text-slate-900">Filière:</b> {filiere}</p>
                <p><b className="text-slate-900">Niveau:</b> <span className="font-bold text-blue-700">{level}</span></p>
              </div>
            </div>

            <div className="p-1 rounded-xl bg-white border border-slate-200 shadow-2xs flex-shrink-0">
              <img src={qrCodeUrl} alt="" className="w-13 h-13 object-contain" />
            </div>
          </div>

          <div className="text-[7.5px] text-slate-500 font-medium border-t border-slate-100 pt-1 truncate">
            {univSlogan}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // TEMPLATE 9: ECO CAMPUS (Botanical Sage & Terracotta Organic)
  // =========================================================================
  return (
    <div
      className={`student-card-root relative bg-[#faf8f5] rounded-2xl overflow-hidden border border-emerald-900/30 shadow-md select-none print:shadow-none w-full h-[54mm] sm:h-[55.5mm] flex flex-col justify-between ${className}`}
      style={{
        boxSizing: 'border-box',
        fontFamily: "'Inter', sans-serif",
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact'
      }}
    >
      {/* Terracotta & Sage Header */}
      <div className="bg-[#2d5a46] px-4 py-1.5 flex items-center justify-between text-white flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#faf8f5] p-0.5 flex-shrink-0 flex items-center justify-center text-emerald-800 text-xs">
            🌿
          </div>
          <div>
            <p className="text-[11px] sm:text-[12px] font-black uppercase tracking-wide text-white">{univName}</p>
            <p className="text-[7.5px] text-emerald-200">CAMPUS DURABLE & RESPONSABLE</p>
          </div>
        </div>
        <span className="text-[7.5px] font-bold px-2 py-0.5 rounded-full bg-[#c86d51] text-white">
          {academicYear}
        </span>
      </div>

      {/* Body */}
      <div className="px-4 py-1 flex items-center justify-between gap-3 flex-1 min-h-0 bg-[#faf8f5]">
        <div className="w-16 h-20 rounded-2xl overflow-hidden border-2 border-[#2d5a46] bg-emerald-50 flex-shrink-0 shadow-xs">
          {photoUrl ? (
            <img src={photoUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-bold text-[#2d5a46] text-xs">
              {initials}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div>
            <p className="text-[12px] font-black text-slate-900 uppercase truncate">{student.last_name}</p>
            <p className="text-[11px] font-bold text-slate-700 capitalize truncate">{student.first_name}</p>
          </div>
          <div>
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#c86d51] text-white font-mono font-bold text-[9px]">
              {matricule}
            </span>
          </div>
          <div className="text-[8.5px] text-slate-700 space-y-0.5">
            <p className="truncate"><b className="text-[#2d5a46]">Filière:</b> {filiere}</p>
            <p><b className="text-[#2d5a46]">Niveau:</b> <span className="font-bold text-[#2d5a46]">{level}</span></p>
          </div>
        </div>

        <div className="p-1 rounded-xl bg-white border border-emerald-200 shadow-xs flex-shrink-0">
          <img src={qrCodeUrl} alt="" className="w-14 h-14 object-contain" />
        </div>
      </div>

      {/* Footer */}
      <div className="bg-[#2d5a46]/10 border-t border-[#2d5a46]/20 px-4 py-1 flex items-center justify-between text-[7.5px] font-semibold text-[#2d5a46] flex-shrink-0">
        <span>🌱 {univSlogan}</span>
        <span className="font-mono text-[#c86d51] font-bold">CARTE ÉTUDIANT VÉGÉTALE</span>
      </div>
    </div>
  );
}
