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
  ChevronRight,
  Eye,
  SlidersHorizontal,
  GraduationCap,
  X,
  Loader2,
  Check
} from 'lucide-react';
import api, { getMediaUrl } from '@/lib/api';
import { universityService } from '@/services/universityService';
import StudentCardTemplate, {
  CARD_TEMPLATES_REGISTRY,
  CardTemplateId
} from '@/components/cards/StudentCardTemplate';
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

export type CardDesignType = 'radar' | 'vagues' | 'medaillon' | 'rubans';

interface CardDesignInfo {
  id: CardDesignType;
  name: string;
  shortName: string;
  icon: string;
  tagline: string;
}

const CARD_DESIGNS: CardDesignInfo[] = [
  { id: 'radar', name: 'Style 1 : Épuré & Officiel', shortName: 'Épuré', icon: '🏛️', tagline: 'En-tête descendant & logo circulaire' },
  { id: 'rubans', name: 'Style 2 : Corporate Dynamique', shortName: 'Corporate', icon: '💎', tagline: 'Lignes franches & motifs diagonaux' },
  { id: 'vagues', name: 'Style 3 : Sécurisé Courbes', shortName: 'Sécurisé', icon: '🌊', tagline: 'Guillochis ondulés anti-falsification' },
  { id: 'medaillon', name: 'Style 4 : Prestige & Or', shortName: 'Prestige', icon: '👑', tagline: 'Liseré or royal & médaillon d\'honneur' }
];

interface ColorPreset {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  colorClass: string;
}

const COLOR_PRESETS: ColorPreset[] = [
  { id: 'bordeaux', name: 'Bordeaux Prestige', primary: '#6B1426', secondary: '#430814', accent: '#F59E0B', colorClass: 'bg-[#6B1426]' },
  { id: 'bleu', name: 'Bleu Nuit', primary: '#0B192C', secondary: '#1E293B', accent: '#38BDF8', colorClass: 'bg-[#0B192C]' },
  { id: 'emeraude', name: 'Émeraude', primary: '#064E3B', secondary: '#022C22', accent: '#34D399', colorClass: 'bg-[#064E3B]' },
  { id: 'royal', name: 'Noir & Or', primary: '#18181B', secondary: '#09090B', accent: '#EAB308', colorClass: 'bg-[#18181B]' },
  { id: 'violet', name: 'Violet', primary: '#4A0E4E', secondary: '#250428', accent: '#C084FC', colorClass: 'bg-[#4A0E4E]' }
];

const STUDENTS_PER_PAGE = 12;

export default function SecretaryStudentCardsPrintPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Personnalisation des cartes (9 modèles exclusifs)
  const [selectedDesign, setSelectedDesign] = useState<CardTemplateId>('wave_orange');
  const [officialTemplate, setOfficialTemplate] = useState<CardTemplateId>('wave_orange');
  const [savingOfficialTemplate, setSavingOfficialTemplate] = useState(false);
  const [selectedColorPreset, setSelectedColorPreset] = useState<string>('bleu');
  const [cardScope, setCardScope] = useState<'students' | 'secretary'>('students');
  const [secretaryUser, setSecretaryUser] = useState<any>(null);

  // Filtres & Pagination
  const [search, setSearch] = useState('');
  const [filterFiliere, setFilterFiliere] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Format d'impression A4 : 10, 8 ou 6 cartes par feuille
  const [cardsPerPage, setCardsPerPage] = useState<6 | 8 | 10>(10);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Informations université
  const [universityInfo, setUniversityInfo] = useState<{
    name: string;
    logo: string;
    academic_year: string;
  }>({
    name: 'UniSphere AI',
    logo: '/uploads/logos/university_1_1791668644.png',
    academic_year: '2026-2027'
  });

  const activePreset = COLOR_PRESETS.find((c) => c.id === selectedColorPreset) || COLOR_PRESETS[0];
  const activePrimaryColor = activePreset.primary;
  const activeSecondaryColor = activePreset.secondary;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [resStudents, resUniv, resMe, resCardConfig] = await Promise.all([
        api.get('/api/v1/students/'),
        universityService.getInfo().catch(() => null),
        api.get('/api/v1/auth/me').catch(() => null),
        universityService.getCardConfig().catch(() => null)
      ]);

      if (resCardConfig?.data?.template_id) {
        const tid = resCardConfig.data.template_id as CardTemplateId;
        setSelectedDesign(tid);
        setOfficialTemplate(tid);
      }

      const studentList = Array.isArray(resStudents.data) ? resStudents.data : [];
      setStudents(studentList);
      if (resMe?.data) setSecretaryUser(resMe.data);

      // Pré-sélectionner les 10 premiers par défaut (1 planche A4 complète prête à imprimer)
      const initialSelection = new Set<number>(studentList.slice(0, 10).map((s: Student) => s.id));
      setSelectedIds(initialSelection);

      if (resUniv) {
        setUniversityInfo({
          name: resUniv.name || 'UniSphere AI',
          logo: resUniv.logo
            ? (resUniv.logo.startsWith('/') || resUniv.logo.startsWith('http') ? resUniv.logo : `/uploads/logos/${resUniv.logo}`)
            : '/uploads/logos/university_1_1791668644.png',
          academic_year: resUniv.academic_year || '2026-2027'
        });
      }
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors du chargement des étudiants');
    } finally {
      setLoading(false);
    }
  };

  const filieres = useMemo(() => {
    return Array.from(new Set(students.map((s) => s.filiere).filter(Boolean))).sort();
  }, [students]);

  const levels = ['L1', 'L2', 'L3', 'M1', 'M2'];

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

      return matchSearch && matchFiliere && matchLevel;
    });
  }, [students, search, filterFiliere, filterLevel]);

  // Pagination sur la liste
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / STUDENTS_PER_PAGE));
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * STUDENTS_PER_PAGE;
    return filteredStudents.slice(start, start + STUDENTS_PER_PAGE);
  }, [filteredStudents, currentPage]);

  const selectedStudents = useMemo(() => {
    return students.filter((s) => selectedIds.has(s.id));
  }, [students, selectedIds]);

  // Découpage en planches A4 pour impression
  const printPages = useMemo(() => {
    const chunks: Student[][] = [];
    for (let i = 0; i < selectedStudents.length; i += cardsPerPage) {
      chunks.push(selectedStudents.slice(i, i + cardsPerPage));
    }
    return chunks;
  }, [selectedStudents, cardsPerPage]);

  const toggleSelectAllFiltered = () => {
    const allFilteredSelected = filteredStudents.length > 0 && filteredStudents.every(s => selectedIds.has(s.id));
    const next = new Set(selectedIds);
    if (allFilteredSelected) {
      filteredStudents.forEach(s => next.delete(s.id));
    } else {
      filteredStudents.forEach(s => next.add(s.id));
    }
    setSelectedIds(next);
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
      toast.error('Veuillez sélectionner au moins un étudiant pour l\'impression');
      return;
    }
    setShowPrintModal(true);
  };

  const handleSaveOfficialTemplate = async (templateId: CardTemplateId) => {
    try {
      setSavingOfficialTemplate(true);
      await universityService.updateCardConfig({ template_id: templateId });
      setOfficialTemplate(templateId);
      const tName = CARD_TEMPLATES_REGISTRY.find(t => t.id === templateId)?.name || templateId;
      toast.success(`Design "${tName}" enregistré comme modèle officiel de l'Université !`);
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement du modèle officiel");
    } finally {
      setSavingOfficialTemplate(false);
    }
  };

  const executePrint = () => {
    setShowPrintModal(false);
    setTimeout(() => {
      window.print();
    }, 250);
  };

  // Helper de rendu de photo d'étudiant
  const renderStudentPhoto = (student: Student, isMedaillon: boolean = false) => {
    const initials = `${(student.first_name || '')[0] || ''}${(student.last_name || '')[0] || ''}`.toUpperCase() || 'ET';
    const photoUrl = student.photo ? getMediaUrl(student.photo) : null;

    if (isMedaillon) {
      return (
        <div className="relative w-14 h-14 rounded-full overflow-hidden border-[2.5px] border-amber-400 ring-2 ring-amber-500/40 bg-slate-100 flex-shrink-0 shadow-xs">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt=""
              loading="lazy"
              className="w-full h-full object-cover"
              onError={(e: any) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#0F172A] to-[#1E3A8A] flex items-center justify-center text-amber-300 font-bold text-xs">
              {initials}
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        className="relative w-14 h-[66px] rounded-lg overflow-hidden border-2 bg-slate-100 flex-shrink-0 shadow-2xs"
        style={{ borderColor: activePrimaryColor }}
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover"
            onError={(e: any) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#0F172A] to-[#1E3A8A] flex flex-col items-center justify-center text-white font-bold text-xs">
            <span className="text-amber-300">{initials}</span>
            <span className="text-[7px] text-white/70 uppercase">Élève</span>
          </div>
        )}
      </div>
    );
  };

  // Rendu unitaire d'une carte étudiante utilisant le composant universel
  const renderCardItem = (student: Student) => {
    return (
      <div
        key={student.id}
        className="student-card-printable-container w-full h-[55.5mm] print:h-full print:max-h-none print:min-h-0 flex items-center justify-center p-0.5 print:p-0"
      >
        <StudentCardTemplate
          template={selectedDesign}
          student={{
            id: student.id,
            first_name: student.first_name,
            last_name: student.last_name,
            matricule: student.matricule,
            filiere: student.filiere,
            level: student.level,
            photo: student.photo,
            date_of_birth: student.date_of_birth,
            status: student.status
          }}
          university={{
            name: universityInfo.name,
            logo: universityInfo.logo,
            academic_year: universityInfo.academic_year
          }}
        />
      </div>
    );
  };

  const sampleStudent: Student = selectedStudents[0] || students[0] || {
    id: 1,
    first_name: 'Moussa',
    last_name: 'Coulibaly',
    matricule: 'EC-2026-0001',
    level: 'L3',
    filiere: 'Informatique & Réseaux',
    status: 'active'
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <Loader2 className="w-10 h-10 text-[#FF6B00] animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Chargement optimisé des cartes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto p-3 sm:p-5 lg:p-6">
      {/* 1. En-tête compact & sélecteurs */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <Link
              href="/secretary/students"
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronLeft size={18} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-slate-900">Tirage des Cartes Étudiantes</h1>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-[#FF6B00]">
                  {students.length} étudiant{students.length > 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Planches complètes A4 (10 cartes / feuille au format CR80 standard 2×5) avec repères de coupe
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Sélecteur de format de feuille (10, 8 ou 6) */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setCardsPerPage(10)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  cardsPerPage === 10 ? 'bg-[#FF6B00] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                10 / feuille (2×5) ★
              </button>
              <button
                type="button"
                onClick={() => setCardsPerPage(8)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  cardsPerPage === 8 ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                8 / feuille
              </button>
              <button
                type="button"
                onClick={() => setCardsPerPage(6)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  cardsPerPage === 6 ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                6 / feuille
              </button>
            </div>

            <button
              onClick={() => setCardScope(cardScope === 'students' ? 'secretary' : 'students')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                cardScope === 'secretary'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {cardScope === 'secretary' ? '← Étudiants' : '🪪 Badge Secrétariat'}
            </button>

            <button
              onClick={handlePrint}
              disabled={selectedStudents.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#FF6B00] hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              <Printer size={15} />
              <span>Imprimer ({selectedStudents.length} cartes)</span>
            </button>
          </div>
        </div>

        {/* 2. Galerie des 9 Modèles Exclusifs de Cartes d'Étudiants */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-[#FF6B00]" />
                9 Modèles Exclusifs Disponibles (Chaque Université a son Propre Style)
              </span>
              <p className="text-[11px] text-slate-500">
                Sélectionnez un modèle pour le tirage ou définissez-le comme officiel pour toute votre institution.
              </p>
            </div>

            {selectedDesign !== officialTemplate && (
              <button
                onClick={() => handleSaveOfficialTemplate(selectedDesign)}
                disabled={savingOfficialTemplate}
                className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50"
              >
                {savingOfficialTemplate ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} className="text-emerald-400" />}
                <span>Définir ce modèle comme Officiel pour l'Université</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
            {CARD_TEMPLATES_REGISTRY.map((t) => {
              const isSelected = selectedDesign === t.id;
              const isOfficial = officialTemplate === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedDesign(t.id)}
                  className={`relative p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between group ${
                    isSelected
                      ? 'border-[#FF6B00] bg-orange-50/60 ring-2 ring-[#FF6B00]/40 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                  }`}
                >
                  {isOfficial && (
                    <span className="absolute -top-1.5 -right-1 px-1.5 py-0.2 rounded-full bg-emerald-600 text-[8px] font-black text-white shadow-xs">
                      OFFICIEL
                    </span>
                  )}
                  <div>
                    <span className="text-lg block mb-1">{t.icon}</span>
                    <p className="font-bold text-[11px] text-slate-900 leading-tight truncate">
                      {t.name}
                    </p>
                    <p className="text-[9px] text-slate-500 truncate mt-0.5">
                      {t.subtitle}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span
                      className="w-3 h-3 rounded-full border border-white/60 shadow-2xs"
                      style={{ backgroundColor: t.accentColor }}
                    />
                    {isSelected && (
                      <span className="text-[9px] font-black text-[#FF6B00]">✓ Choisi</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Vue Carte Secrétariat (Badge Personnel) */}
      {cardScope === 'secretary' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-4 shadow-xs print:hidden">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="text-[#FF6B00]" size={18} />
                Badge Professionnel du Personnel - Secrétariat
              </h2>
              <p className="text-xs text-slate-500">Badge officiel avec QR code d'accès et coordonnées administratives</p>
            </div>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#FF6B00] text-white rounded-xl text-xs font-bold hover:bg-orange-600 transition-colors"
            >
              <Printer size={14} /> Imprimer mon badge
            </button>
          </div>

          <div className="flex justify-center py-4">
            <div
              className="w-[86mm] h-[54mm] bg-white rounded-xl border border-slate-300 shadow-md overflow-hidden flex flex-col justify-between"
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              <div
                className="px-3 py-1.5 flex items-center justify-between text-white"
                style={{ background: `linear-gradient(135deg, ${activePrimaryColor} 0%, ${activeSecondaryColor} 100%)` }}
              >
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-white p-0.5 flex items-center justify-center">
                    <img src={universityInfo.logo} alt="" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <p className="font-bold text-[9px] uppercase leading-tight">{universityInfo.name}</p>
                    <p className="text-[6.5px] text-amber-300 font-bold uppercase">PERSONNEL ADMINISTRATIF</p>
                  </div>
                </div>
                <span className="text-[7.5px] font-mono font-bold bg-white/10 px-1.5 py-0.5 rounded border border-white/20">
                  {universityInfo.academic_year}
                </span>
              </div>

              <div className="p-3 flex items-center gap-3">
                <div className="w-14 h-16 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold text-base">
                  {secretaryUser?.full_name?.charAt(0) || 'S'}
                </div>
                <div className="flex-1 min-w-0 text-xs">
                  <p className="font-bold text-slate-900 uppercase truncate">{secretaryUser?.full_name || 'Secrétaire'}</p>
                  <p className="text-[10px] text-[#FF6B00] font-semibold">Secrétariat Général</p>
                  <p className="text-[9px] font-mono text-slate-500">ID: SEC-{secretaryUser?.id || 1}</p>
                  <p className="text-[9px] text-slate-400 truncate">{secretaryUser?.email}</p>
                </div>
              </div>

              <div className="px-3 py-1 bg-slate-50 border-t border-slate-200 text-[7px] text-slate-500 flex justify-between font-bold">
                <span>CAMPUS & ARCHIVES</span>
                <span>{universityInfo.academic_year}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Section Étudiants : Aperçu en Direct (1 carte) + Tableau Allégé avec Pagination */}
      {cardScope === 'students' && (
        <div className="space-y-4 print:hidden">
          {/* Carte Aperçu Direct + Résumé d'impression */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-4 sm:p-5 text-white flex flex-col md:flex-row items-center justify-between gap-5 shadow-sm">
            <div className="space-y-1.5 text-center md:text-left">
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-300 flex items-center justify-center md:justify-start gap-1">
                <Sparkles size={12} /> Rendu en Direct
              </span>
              <h2 className="text-base font-bold text-white">
                Aperçu instantané du modèle ({CARD_DESIGNS.find(d => d.id === selectedDesign)?.shortName})
              </h2>
              <p className="text-xs text-slate-300 max-w-md">
                Toutes les cartes imprimées adopteront cette disposition officielle conforme aux dimensions A4 avec repères de découpe nets.
              </p>
              <div className="pt-2 flex items-center justify-center md:justify-start gap-3 text-xs">
                <span className="bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">
                  <b>{selectedStudents.length}</b> carte(s) cochée(s)
                </span>
                <span className="bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">
                  <b>{printPages.length}</b> planche(s) A4 ({cardsPerPage} cartes / page)
                </span>
              </div>
            </div>

            {/* Carte échantillon interactive */}
            <div className="w-[86mm] max-w-full transform scale-95 origin-center">
              {renderCardItem(sampleStudent)}
            </div>
          </div>

          {/* Filtres & Recherche Légers */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Rechercher par nom, prénom, matricule..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
              </div>

              <select
                value={filterFiliere}
                onChange={(e) => { setFilterFiliere(e.target.value); setCurrentPage(1); }}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              >
                <option value="">Toutes filières</option>
                {filieres.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>

              <select
                value={filterLevel}
                onChange={(e) => { setFilterLevel(e.target.value); setCurrentPage(1); }}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              >
                <option value="">Tous niveaux</option>
                {levels.map((lvl) => (
                  <option key={lvl} value={lvl}>{lvl}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleSelectAllFiltered}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-semibold text-xs transition-colors flex items-center gap-1.5"
              >
                <CheckSquare size={14} className="text-[#FF6B00]" />
                <span>
                  {filteredStudents.length > 0 && filteredStudents.every(s => selectedIds.has(s.id))
                    ? 'Tout décocher'
                    : `Tout cocher (${filteredStudents.length})`}
                </span>
              </button>

              {(search || filterFiliere || filterLevel) && (
                <button
                  onClick={() => { setSearch(''); setFilterFiliere(''); setFilterLevel(''); setCurrentPage(1); }}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
                  title="Réinitialiser"
                >
                  <RotateCcw size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Tableau paginé sans surcharge serveur */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200/80">
                  <tr>
                    <th className="px-4 py-2.5 w-10 text-center">Sélection</th>
                    <th className="px-4 py-2.5">Étudiant</th>
                    <th className="px-4 py-2.5">Matricule</th>
                    <th className="px-4 py-2.5">Filière</th>
                    <th className="px-4 py-2.5">Niveau</th>
                    <th className="px-4 py-2.5 text-right">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400">
                        Aucun étudiant ne correspond aux critères
                      </td>
                    </tr>
                  ) : (
                    paginatedStudents.map((student) => {
                      const isChecked = selectedIds.has(student.id);
                      return (
                        <tr
                          key={student.id}
                          onClick={() => toggleStudent(student.id)}
                          className={`cursor-pointer transition-colors ${
                            isChecked ? 'bg-orange-50/40 hover:bg-orange-50/60' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="px-4 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleStudent(student.id)}
                              className="rounded border-slate-300 text-[#FF6B00] focus:ring-[#FF6B00] cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[11px] flex-shrink-0">
                                {student.first_name?.charAt(0) || 'E'}
                              </div>
                              <span className="font-bold text-slate-900 truncate">
                                {student.last_name} {student.first_name}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-2 font-mono font-semibold text-[#FF6B00]">
                            {student.matricule || `EC-${student.id}`}
                          </td>
                          <td className="px-4 py-2 text-slate-600 truncate max-w-xs">
                            {student.filiere || 'Tronc commun'}
                          </td>
                          <td className="px-4 py-2">
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 font-bold rounded text-[10px]">
                              {student.level || 'L1'}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <span className="text-[10px] uppercase font-bold text-emerald-600">
                              {student.status || 'actif'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-4 py-2.5 bg-slate-50/70 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
              <div>
                Affichage de <b className="text-slate-900">{Math.min((currentPage - 1) * STUDENTS_PER_PAGE + 1, filteredStudents.length)}</b> à <b className="text-slate-900">{Math.min(currentPage * STUDENTS_PER_PAGE, filteredStudents.length)}</b> sur <b className="text-slate-900">{filteredStudents.length}</b>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="px-2 py-0.5 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition-colors"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. PLANCHES D'IMPRESSION PHYSIQUES A4 (Remplissent 100% de la feuille A4) */}
      <div className="hidden print:block">
        {printPages.map((pageStudents, pageIdx) => (
          <div key={pageIdx} className="print-page-wrapper">
            <div className="print-sheet a4-sheet">
              {pageStudents.map((student) => renderCardItem(student))}
            </div>
          </div>
        ))}
      </div>

      {/* 6. Modal Solennel d'Aperçu avant Impression */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 print:hidden">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Confirmation du Tirage A4</h3>
                <p className="text-xs text-slate-500">
                  {selectedStudents.length} cartes réparties sur {printPages.length} planche(s) A4 ({cardsPerPage} cartes / page)
                </p>
              </div>
              <button
                onClick={() => setShowPrintModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 bg-slate-100 flex-1">
              <div className="bg-orange-50 border border-orange-200/80 rounded-xl p-3 text-xs text-orange-800 flex items-center gap-2">
                <Sparkles size={16} className="text-[#FF6B00] flex-shrink-0" />
                <span>
                  Prêt pour l'impression. La planche est calibrée pour remplir <b>100% de la feuille A4</b> sans rognage.
                </span>
              </div>

              {/* Aperçu des 2 premières cartes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedStudents.slice(0, 2).map((s) => renderCardItem(s))}
              </div>

              {selectedStudents.length > 2 && (
                <p className="text-center text-xs text-slate-500 italic">
                  + {selectedStudents.length - 2} autre(s) carte(s) configurée(s) pour l'impression
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 px-5 py-3 border-t border-slate-200 bg-white">
              <button
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={executePrint}
                className="flex items-center gap-1.5 px-5 py-2 bg-[#FF6B00] hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
              >
                <Printer size={14} />
                Lancer l'impression ({selectedStudents.length} cartes)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RÈGLES CSS IMPRESSION A4 STRICTES POUR REMPLIR 100% DE LA FEUILLE */}
      <style jsx global>{`
        @page {
          size: A4 portrait !important;
          margin: 6mm 5mm !important;
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            width: 100% !important;
            height: 100% !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          header, nav, aside, footer, .print-hidden, [role="navigation"] {
            display: none !important;
          }
          .print-page-wrapper {
            page-break-after: always !important;
            break-after: page !important;
            width: 200mm !important;
            height: 284mm !important;
            max-height: 284mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }
          .print-sheet {
            display: grid !important;
            width: 100% !important;
            height: 100% !important;
            grid-template-columns: repeat(2, 1fr) !important;
            grid-template-rows: ${cardsPerPage === 10 ? 'repeat(5, 1fr)' : cardsPerPage === 8 ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)'} !important;
            gap: 2.5mm 3.5mm !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
          }
          .student-card-printable {
            width: 100% !important;
            height: 100% !important;
            max-height: none !important;
            min-height: 0 !important;
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
