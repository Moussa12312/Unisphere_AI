'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Printer,
  Search,
  CheckSquare,
  Square,
  Filter,
  RotateCcw,
  Users,
  CreditCard,
  Building2,
  Sparkles,
  ShieldCheck,
  ChevronLeft,
  LayoutGrid,
  FileText,
  SlidersHorizontal,
  GraduationCap,
  Eye,
  X
} from 'lucide-react';
import api from '@/lib/api';
import { universityService } from '@/services/universityService';
import { toast } from 'react-hot-toast';

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  matricule: string;
  level: string;
  filiere: string;
  status: string;
  photo?: string | null;
  date_of_birth?: string | null;
}

// ==========================================
// 🎨 4 DESIGNS OFFICIELS DE CARTES ÉTUDIANTS
// ==========================================
export type CardDesignType = 'radar' | 'vagues' | 'medaillon' | 'rubans';

interface CardDesignInfo {
  id: CardDesignType;
  name: string;
  tagline: string;
  badge: string;
  icon: string;
  description: string;
}

const CARD_DESIGNS: CardDesignInfo[] = [
  {
    id: 'radar',
    name: 'Tech Radar & Ondes',
    tagline: 'Ondes numériques & Courbe asymétrique',
    badge: 'Design 1',
    icon: '📡',
    description: 'Cercles concentriques haute précision avec en-tête asymétrique et capsule matricule'
  },
  {
    id: 'vagues',
    name: 'Vagues & Ondulations',
    tagline: 'Courbe fluide moderne & Trame guillochée',
    badge: 'Design 2',
    icon: '🌊',
    description: 'Ruban d\'en-tête galbé et fond sécurisé ondoyant anti-falsification'
  },
  {
    id: 'medaillon',
    name: 'Prestige & Médaillon Doré',
    tagline: 'Photo circulaire & Cerclage or royal',
    badge: 'Design 3',
    icon: '🏅',
    description: 'Cadre photo rond avec double bague dorée, rosace centrale et sceau prestige'
  },
  {
    id: 'rubans',
    name: 'Rubans & Facettes',
    tagline: 'Facettes biseautées & Angles vifs',
    badge: 'Design 4',
    icon: '💎',
    description: 'Liserés géométriques superposés, icônes filière/niveau et typographie ultra-nette'
  }
];

// ==========================================
// 🎨 PALETTES DE COULEURS INSTITUTIONNELLES
// ==========================================
interface ColorPreset {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  dotBg: string;
}

const COLOR_PRESETS: ColorPreset[] = [
  {
    id: 'bordeaux',
    name: 'Bordeaux ECOB',
    primary: '#6B1426',
    secondary: '#430814',
    accent: '#F59E0B',
    dotBg: 'bg-[#6B1426]'
  },
  {
    id: 'bleu',
    name: 'Bleu Nuit Institutionnel',
    primary: '#0B192C',
    secondary: '#1E293B',
    accent: '#38BDF8',
    dotBg: 'bg-[#0B192C]'
  },
  {
    id: 'emeraude',
    name: 'Émeraude Prestige',
    primary: '#064E3B',
    secondary: '#022C22',
    accent: '#34D399',
    dotBg: 'bg-[#064E3B]'
  },
  {
    id: 'royal',
    name: 'Noir & Or Royal',
    primary: '#18181B',
    secondary: '#09090B',
    accent: '#EAB308',
    dotBg: 'bg-[#18181B]'
  },
  {
    id: 'violet',
    name: 'Violet Académique',
    primary: '#4A0E4E',
    secondary: '#250428',
    accent: '#C084FC',
    dotBg: 'bg-[#4A0E4E]'
  }
];

export default function SecretaryStudentCardsPrintPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // 4 Designs et Choix de Couleurs par la Secrétaire
  const [selectedDesign, setSelectedDesign] = useState<CardDesignType>('radar');
  const [selectedColorPreset, setSelectedColorPreset] = useState<string>('bordeaux');
  const [customColor, setCustomColor] = useState<string>('#6B1426');

  // Sélection de badge (Étudiants vs Secrétaire)
  const [cardScope, setCardScope] = useState<'students' | 'secretary'>('students');
  const [secretaryUser, setSecretaryUser] = useState<any>(null);

  // Paramètres de filtrage
  const [search, setSearch] = useState('');
  const [filterFiliere, setFilterFiliere] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');

  // Paramètres d'impression (défaut 10 cartes par page : 2 colonnes x 5 rangées)
  const [cardsPerPage, setCardsPerPage] = useState<6 | 8 | 10>(10);
  const [viewMode, setViewMode] = useState<'grid' | 'preview'>('preview');
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Informations de l'université (Logo officiel garanti)
  const [universityInfo, setUniversityInfo] = useState<{
    name: string;
    logo: string;
    academic_year: string;
  }>({
    name: 'ECOB',
    logo: '/uploads/logos/university_1_1791668644.png',
    academic_year: '2026-2027'
  });

  // Calcul des couleurs actives en direct
  const activePreset = COLOR_PRESETS.find((c) => c.id === selectedColorPreset);
  const activePrimaryColor = selectedColorPreset === 'custom' ? customColor : (activePreset?.primary || '#6B1426');
  const activeSecondaryColor = selectedColorPreset === 'custom' ? customColor : (activePreset?.secondary || '#430814');
  const activeAccentColor = selectedColorPreset === 'custom' ? '#F59E0B' : (activePreset?.accent || '#F59E0B');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [resStudents, resUniv, resMe] = await Promise.all([
        api.get('/api/v1/students/'),
        universityService.getInfo().catch(() => null),
        api.get('/api/v1/auth/me').catch(() => null)
      ]);

      const studentList = Array.isArray(resStudents.data) ? resStudents.data : [];
      setStudents(studentList);
      if (resMe?.data) setSecretaryUser(resMe.data);

      // Pré-sélectionner tous les étudiants actifs par défaut
      const activeIds = new Set<number>(
        studentList.filter((s: Student) => s.status === 'active' || !s.status).map((s: Student) => s.id)
      );
      setSelectedIds(activeIds);

      if (resUniv) {
        setUniversityInfo({
          name: resUniv.name || 'ECOB',
          logo: resUniv.logo
            ? (resUniv.logo.startsWith('/') || resUniv.logo.startsWith('http') ? resUniv.logo : `/uploads/logos/${resUniv.logo}`)
            : '/uploads/logos/university_1_1791668644.png',
          academic_year: resUniv.academic_year || '2026-2027'
        });
      }
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  // Liste des filières uniques
  const filieres = useMemo(() => {
    return Array.from(new Set(students.map((s) => s.filiere).filter(Boolean))).sort();
  }, [students]);

  // Liste des niveaux uniques
  const levels = useMemo(() => {
    return ['L1', 'L2', 'L3', 'M1', 'M2'];
  }, []);

  // Étudiants filtrés
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        (s.first_name && s.first_name.toLowerCase().includes(q)) ||
        (s.last_name && s.last_name.toLowerCase().includes(q)) ||
        (s.matricule && s.matricule.toLowerCase().includes(q));

      const matchFiliere = !filterFiliere || s.filiere === filterFiliere;
      const matchLevel = !filterLevel || s.level === filterLevel;
      const matchStatus = !filterStatus || s.status === filterStatus;

      return matchSearch && matchFiliere && matchLevel && matchStatus;
    });
  }, [students, search, filterFiliere, filterLevel, filterStatus]);

  // Étudiants sélectionnés prêts pour l'impression
  const selectedStudents = useMemo(() => {
    return filteredStudents.filter((s) => selectedIds.has(s.id));
  }, [filteredStudents, selectedIds]);

  // Découpage en planches A4 de 6 ou 8 cartes
  const pages = useMemo(() => {
    const chunks: Student[][] = [];
    for (let i = 0; i < selectedStudents.length; i += cardsPerPage) {
      chunks.push(selectedStudents.slice(i, i + cardsPerPage));
    }
    return chunks;
  }, [selectedStudents, cardsPerPage]);

  const toggleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length && filteredStudents.length > 0) {
      // Tout désélectionner parmi les filtrés
      const next = new Set(selectedIds);
      filteredStudents.forEach((s) => next.delete(s.id));
      setSelectedIds(next);
    } else {
      // Tout sélectionner parmi les filtrés
      const next = new Set(selectedIds);
      filteredStudents.forEach((s) => next.add(s.id));
      setSelectedIds(next);
    }
  };

  const toggleStudent = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handlePrint = () => {
    if (selectedStudents.length === 0) {
      toast.error('Veuillez sélectionner au moins une carte à imprimer');
      return;
    }
    // Premier clic : afficher l'aperçu solennel avant impression
    setShowPrintModal(true);
  };

  const handleConfirmPrint = () => {
    setShowPrintModal(false);
    setViewMode('preview');
    setTimeout(() => {
      window.print();
    }, 250);
  };

  const resetFilters = () => {
    setSearch('');
    setFilterFiliere('');
    setFilterLevel('');
    setFilterStatus('');
  };

  // Helper pour photo ou initiales (adaptatif au design médaillon ou rectangulaire)
  const renderStudentPhoto = (
    student: Student,
    isSmall: boolean,
    isMedaillon: boolean = false,
    borderColor: string = '#6B1426'
  ) => {
    const initials = `${(student.first_name || '')[0] || ''}${(student.last_name || '')[0] || ''}`.toUpperCase() || 'ET';
    const photoUrl = student.photo
      ? student.photo.startsWith('/') || student.photo.startsWith('http')
        ? student.photo
        : `/uploads/${student.photo}`
      : null;

    // Design 3 : Médaillon circulaire cerclé d'or (Photo 3 bas-gauche)
    if (isMedaillon) {
      const circClass = isSmall ? 'w-14 h-14' : 'w-16 h-16';
      if (photoUrl) {
        return (
          <div className={`relative ${circClass} rounded-full overflow-hidden border-[3px] border-amber-400 ring-2 ring-amber-500/50 bg-slate-100 flex-shrink-0 shadow-md`}>
            <img
              src={photoUrl}
              alt={`${student.first_name} ${student.last_name}`}
              className="w-full h-full object-cover rounded-full"
              onError={(e: any) => {
                e.currentTarget.style.display = 'none';
                if (e.currentTarget.nextSibling) {
                  e.currentTarget.nextSibling.style.display = 'flex';
                }
              }}
            />
            <div className="w-full h-full hidden flex-col items-center justify-center bg-gradient-to-br from-[#0F172A] to-[#1E3A8A] text-white font-black text-sm">
              {initials}
            </div>
          </div>
        );
      }
      return (
        <div className={`${circClass} rounded-full bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#1E3A8A] border-[3px] border-amber-400 ring-2 ring-amber-500/50 flex flex-col items-center justify-center text-white flex-shrink-0 shadow-md`}>
          <span className="font-black text-sm tracking-wider text-amber-300">{initials}</span>
        </div>
      );
    }

    // Designs 1, 2, 4 : Rectangulaire avec bordure arrondie officielle
    const sizeClass = isSmall ? 'w-14 h-[68px]' : 'w-16 h-20';

    if (photoUrl) {
      return (
        <div
          className={`relative ${sizeClass} rounded-xl overflow-hidden border-2 bg-slate-100 flex-shrink-0 shadow-xs`}
          style={{ borderColor }}
        >
          <img
            src={photoUrl}
            alt={`${student.first_name} ${student.last_name}`}
            className="w-full h-full object-cover"
            onError={(e: any) => {
              e.currentTarget.style.display = 'none';
              if (e.currentTarget.nextSibling) {
                e.currentTarget.nextSibling.style.display = 'flex';
              }
            }}
          />
          <div className="w-full h-full hidden flex-col items-center justify-center bg-gradient-to-br from-[#0F172A] to-[#1E3A8A] text-white font-black text-base">
            {initials}
          </div>
        </div>
      );
    }

    return (
      <div
        className={`${sizeClass} rounded-xl bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#1E3A8A] border-2 flex flex-col items-center justify-center text-white flex-shrink-0 shadow-xs`}
        style={{ borderColor }}
      >
        <span className="font-black text-base tracking-wider text-amber-300">{initials}</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-white/70 mt-0.5">Élève</span>
      </div>
    );
  };

  // ========================================================
  // 🌟 RENDU UNIVERSEL DE LA CARTE SELON LE DESIGN ET LA COULEUR
  // ========================================================
  const renderCardItem = (student: Student, isSmallCard: boolean) => {
    const isMed = selectedDesign === 'medaillon';
    const qrCodeUrl = `/api/v1/students/${student.id}/qrcode`;
    const logoUrl = universityInfo.logo || '/uploads/logos/university_1_1791668644.png';

    // Filigrane de sécurité selon le design
    let backgroundStyle: React.CSSProperties = {};
    if (selectedDesign === 'radar') {
      backgroundStyle = {
        backgroundImage: `radial-gradient(circle at 62% 48%, transparent 0, transparent 14px, ${activePrimaryColor}15 15px, ${activePrimaryColor}15 16px, transparent 17px),
                          radial-gradient(circle at 62% 48%, transparent 0, transparent 32px, ${activePrimaryColor}10 33px, ${activePrimaryColor}10 34px, transparent 35px),
                          radial-gradient(circle at 62% 48%, transparent 0, transparent 52px, ${activePrimaryColor}0D 53px, ${activePrimaryColor}0D 54px, transparent 55px),
                          radial-gradient(circle at 62% 48%, transparent 0, transparent 74px, ${activePrimaryColor}09 75px, ${activePrimaryColor}09 76px, transparent 77px)`
      };
    } else if (selectedDesign === 'vagues') {
      backgroundStyle = {
        backgroundImage: `repeating-radial-gradient(ellipse at 100% 0%, ${activePrimaryColor}10 0, ${activePrimaryColor}10 5px, transparent 5px, transparent 11px)`
      };
    } else if (selectedDesign === 'medaillon') {
      backgroundStyle = {
        backgroundImage: `repeating-radial-gradient(circle at 20% 50%, ${activePrimaryColor}12 0, ${activePrimaryColor}12 4px, transparent 4px, transparent 9px)`
      };
    } else {
      backgroundStyle = {
        backgroundImage: `linear-gradient(135deg, ${activePrimaryColor}0C 25%, transparent 25%), linear-gradient(-135deg, ${activePrimaryColor}0C 25%, transparent 25%)`
      };
    }

    return (
      <div
        key={student.id}
        className={`student-card-printable relative bg-white border border-dashed border-slate-400/80 rounded-xl overflow-hidden flex flex-col justify-between transition-all ${
          isTen ? 'h-[55.5mm] min-h-[55.5mm] max-h-[56.5mm]' : isCompact ? 'h-[68mm]' : 'h-[88mm]'
        }`}
        style={{
          pageBreakInside: 'avoid',
          breakInside: 'avoid',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
        }}
      >
        {/* ======================================================== */}
        {/* EN-TÊTE DE CARTE                                         */}
        {/* ======================================================== */}
        {selectedDesign === 'radar' && (
          <div
            className={`px-3 flex items-center justify-between text-white flex-shrink-0 relative overflow-hidden ${
              isTen ? 'py-1 h-8' : isCompact ? 'py-1.5 h-9' : 'py-2 h-11'
            }`}
            style={{
              background: `linear-gradient(135deg, ${activePrimaryColor} 0%, ${activeSecondaryColor} 100%)`
            }}
          >
            <div className="flex items-center gap-1.5 min-w-0 z-10">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 p-[1.5px] shadow-xs flex-shrink-0">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden p-0.5">
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                </div>
              </div>
              <div className="min-w-0 leading-none">
                <div className="font-black text-[10.5px] tracking-wide uppercase truncate text-white">
                  {universityInfo.name}
                </div>
                <div className="text-[7.5px] font-bold tracking-wider uppercase text-amber-300 mt-0.5">
                  CARTE D'ÉTUDIANT
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 z-10">
              <span className="text-[8px] font-mono font-black text-amber-200 bg-white/10 px-2 py-0.5 rounded border border-white/20">
                {universityInfo.academic_year}
              </span>
            </div>

            <div
              className="absolute top-0 right-0 h-full w-28 bg-black/20 pointer-events-none"
              style={{ clipPath: 'polygon(20% 0%, 100% 0%, 100% 100%, 0% 100%)' }}
            />
          </div>
        )}

        {selectedDesign === 'vagues' && (
          <div
            className={`px-3 flex items-center justify-between text-white flex-shrink-0 relative overflow-hidden ${
              isTen ? 'py-1 h-8' : isCompact ? 'py-1.5 h-9' : 'py-2 h-11'
            }`}
            style={{
              background: `linear-gradient(90deg, ${activePrimaryColor} 0%, ${activeSecondaryColor} 70%, ${activePrimaryColor} 100%)`
            }}
          >
            <div className="flex items-center gap-1.5 min-w-0 z-10">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 p-[1.5px] shadow-xs flex-shrink-0">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden p-0.5">
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                </div>
              </div>
              <div className="min-w-0 leading-none">
                <div className="font-black text-[10.5px] tracking-wide uppercase truncate text-white">
                  {universityInfo.name}
                </div>
                <div className="text-[7.5px] font-bold tracking-wider uppercase text-sky-200 mt-0.5">
                  CARTE D'ÉTUDIANT
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 z-10">
              <span className="text-[8px] font-mono font-black text-white bg-white/20 px-2 py-0.5 rounded-full border border-white/30">
                {universityInfo.academic_year}
              </span>
            </div>

            <svg className="absolute bottom-0 right-0 w-36 h-full opacity-20 pointer-events-none" viewBox="0 0 100 30" preserveAspectRatio="none">
              <path d="M0,15 C30,30 70,0 100,20 L100,30 L0,30 Z" fill="#ffffff" />
            </svg>
          </div>
        )}

        {selectedDesign === 'medaillon' && (
          <div
            className={`px-3 flex items-center justify-between text-white flex-shrink-0 relative ${
              isTen ? 'py-1 h-8' : isCompact ? 'py-1.5 h-9' : 'py-2 h-11'
            }`}
            style={{
              background: `linear-gradient(135deg, ${activeSecondaryColor} 0%, ${activePrimaryColor} 100%)`
            }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 p-[1.5px] shadow-xs flex-shrink-0">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden p-0.5">
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                </div>
              </div>
              <div className="min-w-0 leading-none">
                <div className="font-black text-[10.5px] tracking-wide uppercase truncate text-white">
                  {universityInfo.name}
                </div>
                <div className="text-[7.5px] font-bold tracking-wider uppercase text-amber-300 mt-0.5">
                  CARTE D'ÉTUDIANT • PRESTIGE
                </div>
              </div>
            </div>

            <span className="text-[8px] font-mono font-black text-amber-300 border border-amber-400/50 bg-black/20 px-2 py-0.5 rounded">
              {universityInfo.academic_year}
            </span>
          </div>
        )}

        {selectedDesign === 'rubans' && (
          <div
            className={`px-3 flex items-center justify-between text-white flex-shrink-0 relative overflow-hidden ${
              isTen ? 'py-1 h-8' : isCompact ? 'py-1.5 h-9' : 'py-2 h-11'
            }`}
            style={{
              background: `linear-gradient(110deg, ${activePrimaryColor} 0%, ${activeSecondaryColor} 65%, ${activePrimaryColor} 100%)`
            }}
          >
            <div className="flex items-center gap-1.5 min-w-0 z-10">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 p-[1.5px] shadow-xs flex-shrink-0">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden p-0.5">
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                </div>
              </div>
              <div className="min-w-0 leading-none">
                <div className="font-black text-[10.5px] tracking-wide uppercase truncate text-white">
                  {universityInfo.name}
                </div>
                <div className="text-[7.5px] font-bold tracking-wider uppercase text-rose-200 mt-0.5">
                  CARTE OFFICIELLE D'ÉTUDIANT
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 z-10">
              <span className="text-[8px] font-mono font-black text-amber-200 bg-white/10 px-2 py-0.5 rounded border border-white/20">
                {universityInfo.academic_year}
              </span>
            </div>

            <div className="absolute top-0 right-14 h-full w-12 bg-white/10 pointer-events-none transform -skew-x-12" />
            <div className="absolute top-0 right-6 h-full w-8 bg-amber-400/20 pointer-events-none transform -skew-x-12" />
          </div>
        )}

        {/* Liseré de sécurité tricolore/or selon le design */}
        <div
          className="h-[2px] w-full flex-shrink-0"
          style={{
            background:
              selectedDesign === 'medaillon'
                ? 'linear-gradient(90deg, #F59E0B 0%, #FDE047 50%, #D97706 100%)'
                : selectedDesign === 'vagues'
                ? 'linear-gradient(90deg, #38BDF8 0%, #818CF8 50%, #C084FC 100%)'
                : selectedDesign === 'rubans'
                ? `linear-gradient(90deg, ${activePrimaryColor} 0%, #F59E0B 50%, #38BDF8 100%)`
                : 'linear-gradient(90deg, #06B6D4 0%, #F59E0B 50%, #EC4899 100%)'
          }}
        />

        {/* ======================================================== */}
        {/* CORPS DE LA CARTE AVEC FILIGRANE ET DONNÉES RÉELLES      */}
        {/* ======================================================== */}
        <div
          className="px-2.5 py-1 flex items-center justify-between gap-2.5 flex-1 min-h-0 bg-white relative"
          style={backgroundStyle}
        >
          {/* Photo de l'étudiant */}
          <div className="flex flex-col items-center flex-shrink-0 z-10">
            {renderStudentPhoto(student, isSmallCard, isMed, activePrimaryColor)}

            {/* Puce microchip miniature */}
            <div
              className="w-6 h-2 rounded-[2px] border border-amber-600/80 relative overflow-hidden mt-0.5 shadow-2xs"
              style={{
                background: 'linear-gradient(135deg, #fef08a 0%, #eab308 50%, #ca8a04 100%)'
              }}
            >
              <div className="w-full h-[1px] bg-amber-800/40 absolute top-1/2 -translate-y-1/2" />
              <div className="h-full w-[1px] bg-amber-800/40 absolute left-1/2 -translate-x-1/2" />
            </div>
          </div>

          {/* Informations : Nom, Prénom, Matricule, Filière, Niveau */}
          <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-0.5 z-10">
            <div>
              <span className="text-[7.5px] uppercase font-bold text-slate-400 block tracking-wider leading-none mb-0.5">
                Nom :
              </span>
              <div className="text-[13.5px] font-black text-slate-950 leading-tight uppercase truncate tracking-tight">
                {student.last_name}
              </div>
              <div className="text-[11.5px] font-bold text-slate-700 leading-tight capitalize truncate">
                {student.first_name}
              </div>
            </div>

            {/* Capsule Matricule Orange */}
            <div className="my-0.5">
              <span
                className="inline-block px-2.5 py-0.5 rounded-md text-[10.5px] font-mono font-black text-white shadow-2xs tracking-wider"
                style={{ backgroundColor: '#EA580C' }}
              >
                {student.matricule || `EC - 2026 - ${String(student.id).padStart(4, '0')}`}
              </span>
            </div>

            {/* Filière & Niveau */}
            <div className="text-[8.5px] text-slate-700 leading-tight space-y-0.5">
              <div className="truncate">
                <span className="font-bold text-slate-900">{selectedDesign === 'rubans' ? '🌐 ' : ''}Filière : </span>
                <span className="font-semibold">{student.filiere || 'Logistique et Transport'}</span>
              </div>
              <div className="truncate flex items-center gap-1.5">
                <span className="font-bold text-slate-900">{selectedDesign === 'rubans' ? '🎓 ' : ''}Niveau : </span>
                <span className="font-extrabold text-blue-900 bg-blue-50 border border-blue-200/80 px-1.5 py-0.2 rounded text-[9px]">
                  {student.level || 'L3'}
                </span>
              </div>
            </div>
          </div>

          {/* QR Code haute définition avec mention SCAN MOI ID CARD */}
          <div className="flex flex-col items-center justify-center flex-shrink-0 z-10">
            <div className="p-1 bg-white rounded-lg border border-slate-300 shadow-2xs">
              <div className="w-16 h-16 flex items-center justify-center">
                <img
                  src={qrCodeUrl}
                  alt="QR Code"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            <span className="text-[6.8px] font-mono font-black text-slate-800 mt-0.5 tracking-wider uppercase text-center leading-tight">
              SCAN MOI<br/><span className="text-[6.2px] text-slate-500">ID CARD</span>
            </span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* PIED DE CARTE SÉCURISÉ                                   */}
        {/* ======================================================== */}
        <div
          className="px-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[7.5px] text-slate-600 font-bold flex-shrink-0 h-4 relative"
        >
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full overflow-hidden flex-shrink-0 border border-slate-300">
              <img src={logoUrl} alt="Mini Seal" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-slate-700 tracking-wider">EASOBE SÉCURISÉE & CERTIFIÉE</span>
          </div>
          <span className="font-mono text-slate-500 text-[6.8px]">
            LIGNE ACADÉIF • {universityInfo.academic_year} • *Mentions administratives
          </span>
          <div
            className="absolute bottom-0 left-0 right-0 h-[2px]"
            style={{ backgroundColor: activePrimaryColor }}
          />
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-orange-200 border-t-[#FF6B00] rounded-full animate-spin" />
        <p className="text-slate-500 font-medium text-sm">Chargement du module d'impression des cartes...</p>
      </div>
    );
  }

  const isTen = cardsPerPage === 10;
  const isCompact = cardsPerPage === 8;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* ======================================================== */}
      {/* EN-TÊTE DE LA PAGE (Masqué à l'impression) */}
      {/* ======================================================== */}
      <div className="print:hidden space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3">
            <Link
              href="/secretary/students"
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              title="Retour aux étudiants"
            >
              <ChevronLeft size={20} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-[#FF6B00] border border-orange-200">
                  <CreditCard size={12} />
                  Planche d'impression
                </span>
                <span className="text-xs text-slate-400 font-mono">Année {universityInfo.academic_year}</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
                Tirage des Cartes Étudiantes
              </h1>
              <p className="text-xs text-slate-500">
                Imprimez les badges officiels au format standard 10 cartes par feuille A4 (2×5) avec typographie nette et repères de découpe
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Format par feuille (10, 8 ou 6) */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setCardsPerPage(10)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  cardsPerPage === 10 ? 'bg-[#FF6B00] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                10 cartes / feuille (2×5) ★
              </button>
              <button
                type="button"
                onClick={() => setCardsPerPage(8)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  cardsPerPage === 8 ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                8 cartes (2×4)
              </button>
              <button
                type="button"
                onClick={() => setCardsPerPage(6)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  cardsPerPage === 6 ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                6 cartes (2×3)
              </button>
            </div>

            {/* Vue Grille vs Planche */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setViewMode('preview')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'preview' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <FileText size={13} />
                Planche A4
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <LayoutGrid size={13} />
                Grille
              </button>
            </div>

            {/* Bouton d'impression principal */}
            <button
              onClick={handlePrint}
              disabled={selectedStudents.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
            >
              <Printer size={15} />
              Imprimer ({selectedStudents.length} cartes / {pages.length} page{pages.length > 1 ? 's' : ''})
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SÉLECTEUR DE TYPE DE BADGE ET PERSONNALISATION           */}
        {/* ======================================================== */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCardScope('students')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  cardScope === 'students'
                    ? 'bg-[#FF6B00] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <GraduationCap size={16} />
                <span>Cartes Étudiantes ({students.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setCardScope('secretary')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  cardScope === 'secretary'
                    ? 'bg-[#FF6B00] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <ShieldCheck size={16} />
                <span>Ma Carte Secrétariat (Badge Personnel)</span>
              </button>
            </div>

            {/* Logo officiel de l'université actif */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 p-[1.5px] shadow-xs">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden p-0.5">
                  <img
                    src={universityInfo.logo}
                    alt="Logo Université"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
              <div className="text-xs">
                <span className="font-black text-slate-900">{universityInfo.name}</span>
                <span className="text-[10px] text-slate-500 block">Logo certifié sur tous les documents</span>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* LES 4 MODÈLES OFFICIELS DE CARTES (Photos fournies)       */}
          {/* ======================================================== */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Sparkles size={14} className="text-[#FF6B00]" />
                1. Choisir le modèle de carte (4 designs officiels) :
              </label>
              <span className="text-[11px] font-bold text-orange-600">
                Actif : {CARD_DESIGNS.find((d) => d.id === selectedDesign)?.name}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {CARD_DESIGNS.map((d) => {
                const isSelected = selectedDesign === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelectedDesign(d.id)}
                    className={`text-left p-3.5 rounded-2xl border-2 transition-all relative flex flex-col justify-between group ${
                      isSelected
                        ? 'border-[#FF6B00] bg-orange-50/30 shadow-md ring-2 ring-orange-400/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xl">{d.icon}</span>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          isSelected
                            ? 'bg-[#FF6B00] text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {d.badge}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-black text-xs text-slate-900 group-hover:text-[#FF6B00] transition-colors">
                        {d.name}
                      </h4>
                      <p className="text-[10.5px] font-semibold text-slate-600 mt-0.5">
                        {d.tagline}
                      </p>
                      <p className="text-[9.5px] text-slate-400 mt-1 line-clamp-2 leading-tight">
                        {d.description}
                      </p>
                    </div>

                    {/* Aperçu miniature de la bordure et de l'accent */}
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[9px] font-bold">
                      <span className={isSelected ? 'text-orange-600' : 'text-slate-400'}>
                        {isSelected ? '✓ Sélectionné' : 'Cliquer pour appliquer'}
                      </span>
                      <div
                        className="w-4 h-4 rounded-full border border-slate-300"
                        style={{ backgroundColor: activePrimaryColor }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ======================================================== */}
          {/* PALETTE ET SÉLECTEUR DE COULEUR PERSONNALISÉE            */}
          {/* ======================================================== */}
          <div className="pt-3 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mr-1">
                <SlidersHorizontal size={14} className="text-[#FF6B00]" />
                2. Couleur institutionnelle :
              </label>

              {COLOR_PRESETS.map((p) => {
                const isSelected = selectedColorPreset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedColorPreset(p.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      isSelected
                        ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full border border-white/50 shadow-2xs flex-shrink-0"
                      style={{ backgroundColor: p.primary }}
                    />
                    <span>{p.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Sélecteur de couleur personnalisée */}
            <div className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold">
              <span className="text-slate-600 pl-1 text-[11px]">Couleur libre :</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => {
                    setCustomColor(e.target.value);
                    setSelectedColorPreset('custom');
                  }}
                  className="w-7 h-7 rounded-lg border-0 cursor-pointer p-0 bg-transparent"
                  title="Choisir une couleur personnalisée"
                />
                <input
                  type="text"
                  value={selectedColorPreset === 'custom' ? customColor : activePrimaryColor}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomColor(val);
                    setSelectedColorPreset('custom');
                  }}
                  className="w-20 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono uppercase text-slate-800"
                  placeholder="#6B1426"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* BARRE DE FILTRES ET SÉLECTION RAPIDE */}
        {/* ======================================================== */}
        {cardScope === 'students' && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Recherche */}
            <div className="relative lg:col-span-2">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher par nom, prénom, matricule..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              />
            </div>

            {/* Filière */}
            <div>
              <select
                value={filterFiliere}
                onChange={(e) => setFilterFiliere(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              >
                <option value="">Toutes les filières ({filieres.length})</option>
                {filieres.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            {/* Niveau */}
            <div>
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              >
                <option value="">Tous les niveaux</option>
                {levels.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>

            {/* Statut */}
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              >
                <option value="">Tous les statuts</option>
                <option value="active">Actif uniquement</option>
                <option value="pending">En attente</option>
                <option value="inactive">Inactif</option>
              </select>
            </div>
          </div>

          {/* Barre d'action sur la sélection */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="flex items-center gap-1.5 font-semibold text-slate-700 hover:text-orange-600 transition-colors"
              >
                {selectedStudents.length === filteredStudents.length && filteredStudents.length > 0 ? (
                  <CheckSquare size={16} className="text-[#FF6B00]" />
                ) : (
                  <Square size={16} className="text-slate-400" />
                )}
                <span>
                  Tout cocher ({filteredStudents.length} étudiant{filteredStudents.length > 1 ? 's' : ''})
                </span>
              </button>

              <span className="text-slate-300">|</span>

              <span className="text-slate-500 font-medium">
                <strong className="text-slate-900 font-bold">{selectedStudents.length}</strong> carte(s) sélectionnée(s)
                sur {filteredStudents.length} affichée(s)
              </span>
            </div>

            <div className="flex items-center gap-2">
              {(search || filterFiliere || filterLevel || filterStatus) && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="flex items-center gap-1 text-slate-500 hover:text-slate-800 transition-colors px-2 py-1 rounded-lg hover:bg-slate-100"
                >
                  <RotateCcw size={12} />
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          </div>
        </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* VUE MA CARTE SECRÉTARIAT (BADGE PERSONNEL DU PERSONNEL) */}
      {/* ======================================================== */}
      {cardScope === 'secretary' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="text-[#FF6B00]" size={22} />
                Carte Professionnelle du Personnel - Secrétariat
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Badge d'accès officiel sécurisé avec identification de fonction, filigrane et QR code de contrôle
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 self-start sm:self-auto"
            >
              <Printer size={15} />
              Imprimer Mon Badge Professionnel
            </button>
          </div>

          {/* Visualisation Recto & Verso du Badge Secrétariat */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 py-4">
            {/* RECTO */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Face Avant (Recto)</span>
              <div
                className="w-[86mm] h-[54mm] bg-white rounded-2xl border-2 border-slate-300 shadow-xl overflow-hidden flex flex-col justify-between relative"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                {/* Header du badge */}
                <div
                  className="px-3 py-2 flex items-center justify-between text-white"
                  style={{ background: `linear-gradient(135deg, ${activePrimaryColor} 0%, ${activeSecondaryColor} 100%)` }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {universityInfo.logo ? (
                      <img
                        src={universityInfo.logo}
                        alt="Logo"
                        className="h-7 w-7 object-contain bg-white rounded-full p-0.5 border border-white/40"
                      />
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center text-amber-300 font-bold text-xs">
                        U
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-black text-[10px] tracking-wide uppercase truncate leading-tight">
                        {universityInfo.name}
                      </p>
                      <p className="text-[7px] font-bold uppercase tracking-wider text-amber-300">
                        CARTE DU PERSONNEL • SECRÉTARIAT
                      </p>
                    </div>
                  </div>
                  <span className="text-[7.5px] font-mono bg-white/10 px-1.5 py-0.5 rounded border border-white/20 font-bold">
                    {universityInfo.academic_year}
                  </span>
                </div>

                <div className="h-[2px] w-full bg-gradient-to-r from-[#FF6B00] via-amber-400 to-blue-500" />

                {/* Corps Recto */}
                <div className="flex-1 p-2.5 flex items-center gap-3">
                  <div className="w-16 h-20 rounded-xl overflow-hidden border border-slate-300 bg-slate-100 flex-shrink-0 relative shadow-sm">
                    {secretaryUser?.photo ? (
                      <img
                        src={secretaryUser.photo.startsWith('/') ? secretaryUser.photo : `/uploads/${secretaryUser.photo}`}
                        alt={secretaryUser.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 text-white flex flex-col items-center justify-center font-bold text-lg">
                        <span>{secretaryUser?.full_name?.charAt(0) || 'S'}</span>
                        <span className="text-[6.5px] uppercase font-bold text-amber-300 mt-0.5">Staff</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-0.5 text-slate-800">
                    <p className="font-extrabold text-xs uppercase truncate text-slate-900">
                      {secretaryUser?.full_name || 'Secrétaire Général(e)'}
                    </p>
                    <p className="text-[10px] font-bold text-[#FF6B00]">
                      Secrétariat Académique & Caisse
                    </p>
                    <p className="font-mono text-[9px] text-slate-600 font-semibold">
                      ID : SEC-00{secretaryUser?.id || 1}
                    </p>
                    <p className="text-[8.5px] text-slate-500 truncate">
                      {secretaryUser?.email || 'secretariat@unisphere.edu'}
                    </p>
                    <div className="pt-1 flex items-center gap-2 text-[7.5px] text-slate-400">
                      <span className="bg-green-100 text-green-700 px-1.5 py-0.2 rounded font-bold">Personnel Actif</span>
                      <span>Accès Campus & Archives</span>
                    </div>
                  </div>
                </div>

                {/* Footer Recto */}
                <div className="px-3 py-1 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[7px] text-slate-500">
                  <span>Signature Autorité : ✍️ Direction</span>
                  <span className="font-mono font-bold text-slate-700">VALABLE {universityInfo.academic_year}</span>
                </div>
              </div>
            </div>

            {/* VERSO */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Face Arrière (Verso)</span>
              <div
                className="w-[86mm] h-[54mm] bg-white rounded-2xl border-2 border-slate-300 shadow-xl overflow-hidden flex flex-col justify-between p-3"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                <div>
                  <p className="font-black text-[9px] text-slate-900 uppercase text-center border-b border-slate-200 pb-1">
                    Conditions d'utilisation & Sécurité
                  </p>
                  <p className="text-[7.5px] text-slate-600 mt-1.5 leading-relaxed">
                    Cette carte est strictement personnelle et atteste de la fonction de membre du personnel au sein de l'établissement. Elle doit être présentée à toute réquisition des services de surveillance.
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
                  <div className="space-y-0.5 text-[7px] text-slate-500">
                    <p className="font-bold text-slate-700">En cas de perte, contacter :</p>
                    <p>Tél : {universityInfo.name} Administration</p>
                    <p>Email : support@unisphere.edu</p>
                  </div>
                  <div className="w-12 h-12 bg-slate-100 rounded-lg border border-slate-300 flex items-center justify-center p-1">
                    <div className="w-full h-full bg-slate-900 rounded flex items-center justify-center text-white text-[8px] font-bold">
                      QR
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VUE 1 : GRILLE DE GESTION INTERACTIVE */}
      {/* ======================================================== */}
      {cardScope === 'students' && viewMode === 'grid' && (
        <div className="print:hidden grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredStudents.map((student) => {
            const isSelected = selectedIds.has(student.id);
            return (
              <div
                key={student.id}
                onClick={() => toggleStudent(student.id)}
                className={`cursor-pointer rounded-2xl border p-4 transition-all relative select-none ${
                  isSelected
                    ? 'border-[#FF6B00] bg-orange-50/20 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300 opacity-60'
                }`}
              >
                <div className="absolute top-3 right-3">
                  {isSelected ? (
                    <CheckSquare size={18} className="text-[#FF6B00]" />
                  ) : (
                    <Square size={18} className="text-slate-300" />
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {renderStudentPhoto(student, true)}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 text-sm truncate uppercase">
                      {student.last_name} {student.first_name}
                    </p>
                    <p className="font-mono text-xs text-[#FF6B00] font-semibold mt-0.5">
                      {student.matricule}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate mt-1">
                      {student.filiere || 'Filière N/A'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded">
                        {student.level || 'L1'}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase">
                        {student.status || 'actif'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* VUE 2 & IMPRESSION : PLANCHES A4 (6 OU 8 CARTES / PAGE) */}
      {/* ======================================================== */}
      <div className={`${cardScope !== 'students' ? 'hidden' : viewMode === 'grid' ? 'hidden print:block' : 'block'} space-y-8`}>
        {pages.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center print:hidden">
            <Users size={40} className="mx-auto text-slate-300 mb-3" />
            <h3 className="font-bold text-slate-800 text-base mb-1">Aucune carte sélectionnée</h3>
            <p className="text-slate-500 text-xs">
              Modifiez vos critères de filtrage ou cochez des étudiants pour générer les planches de cartes.
            </p>
          </div>
        ) : (
          pages.map((pageStudents, pageIdx) => (
            <div key={pageIdx} className="print-page-wrapper">
              {/* En-tête de planche (visible à l'écran, masqué à l'impression) */}
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-2 py-1 print:hidden mb-2">
                <span>
                  Planche A4 n°{pageIdx + 1} sur {pages.length} ({pageStudents.length} carte{pageStudents.length > 1 ? 's' : ''})
                </span>
                <span className="font-mono font-bold text-slate-700">
                  {cardsPerPage} cartes par feuille • Format {isTen ? 'Standard Universitaire (2×5)' : isCompact ? 'Compact (2×4)' : 'Grand Format (2×3)'}
                </span>
              </div>

              {/* LA PLANCHE A4 PHYSIQUE (Rendue responsive avec défilement horizontal sur mobile) */}
              <div className="w-full overflow-x-auto pb-4">
                <div
                  className={`print-sheet a4-sheet bg-white border border-slate-300 shadow-xl rounded-xl p-2 mx-auto grid grid-cols-2 min-w-[620px] sm:min-w-0 ${
                    isTen
                      ? 'grid-rows-5 gap-2 max-w-[210mm]'
                      : isCompact
                      ? 'grid-rows-4 gap-2.5 max-w-[210mm]'
                      : 'grid-rows-3 gap-3.5 max-w-[210mm]'
                  }`}
                  style={{
                    height: isTen ? '288mm' : isCompact ? '285mm' : '285mm',
                    minHeight: isTen ? '288mm' : isCompact ? '285mm' : '285mm',
                    maxHeight: isTen ? '288mm' : undefined,
                    boxSizing: 'border-box'
                  }}
                >
                {pageStudents.map((student) => renderCardItem(student, isTen || isCompact))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL APERÇU AVANT IMPRESSION (Exigence utilisateur)    */}
      {/* ======================================================== */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 print:hidden">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Entête Modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#FF6B00] flex items-center justify-center">
                  <Eye size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Aperçu officiel avant tirage</h3>
                  <p className="text-xs text-slate-500">
                    {selectedStudents.length} carte(s) prête(s) à être imprimée(s) sur {pages.length} planche(s) A4
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPrintModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Corps Modal */}
            <div className="p-6 overflow-y-auto space-y-4 bg-slate-100 flex-1">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-center gap-2">
                <Sparkles size={16} className="text-amber-600 flex-shrink-0" />
                <span>
                  Vérifiez la disposition des cartes ci-dessous. En cliquant sur <b>« Lancer l'impression »</b>, la boîte de dialogue d'impression officielle s'ouvrira directement.
                </span>
              </div>

              {/* Aperçu fidèle grand format des premières cartes avec le design choisi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedStudents.slice(0, 4).map((student) => renderCardItem(student, true))}
              </div>

              {selectedStudents.length > 4 && (
                <p className="text-center text-xs text-slate-500 italic">
                  + {selectedStudents.length - 4} autre(s) carte(s) prête(s) pour le tirage
                </p>
              )}
            </div>

            {/* Pied Modal */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-white">
              <button
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-all"
              >
                Fermer & Modifier
              </button>
              <button
                onClick={handleConfirmPrint}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
              >
                <Printer size={15} />
                Lancer l'impression ({selectedStudents.length} cartes)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* RÈGLES CSS POUR IMPRESSION A4 PARFAITE                  */}
      {/* ======================================================== */}
      <style jsx global>{`
        @page {
          size: 210mm 297mm !important;
          margin: 4mm 5mm !important;
        }
        @media print {
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
          .print-page-wrapper {
            page-break-after: always !important;
            break-after: page !important;
            height: 288mm !important;
            max-height: 288mm !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
          }
          .print-sheet {
            display: grid !important;
            min-width: 0 !important;
            width: 100% !important;
            max-width: 200mm !important;
            height: 288mm !important;
            max-height: 288mm !important;
            grid-template-columns: repeat(2, 1fr) !important;
            grid-template-rows: ${isTen ? 'repeat(5, 1fr)' : isCompact ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)'} !important;
            gap: 2mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            page-break-after: always !important;
            break-after: page !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box !important;
          }
          .student-card-printable {
            width: 100% !important;
            height: 100% !important;
            min-height: 55.5mm !important;
            max-height: 56.5mm !important;
            border: 1px dashed #94a3b8 !important;
            box-shadow: none !important;
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
          }
        }
      `}</style>
    </div>
  );
}
