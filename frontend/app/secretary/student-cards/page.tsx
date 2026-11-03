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
  Check,
  Palette,
  Save,
  CheckCircle2,
  Layers,
  QrCode
} from 'lucide-react';
import api, { getMediaUrl } from '@/lib/api';
import { universityService } from '@/services/universityService';
import { toast } from 'react-hot-toast';
import OfficialStudentCard, { CardCustomizationOptions } from '@/components/cards/OfficialStudentCard';

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

interface ThemePreset {
  id: string;
  name: string;
  description: string;
  primary: string;
  accent: string;
  slogan: string;
  icon: string;
}

const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'unisphere',
    name: 'UniSphere Wave (Officiel)',
    description: 'Bleu Nuit profond & Orange Solaire dynamique',
    primary: '#072146',
    accent: '#FF7300',
    slogan: "Ensemble pour l'excellence",
    icon: '🌟'
  },
  {
    id: 'bordeaux',
    name: 'Bordeaux Prestige & Or',
    description: 'Élégance académique royale & finitions or',
    primary: '#6B1426',
    accent: '#F59E0B',
    slogan: 'Excellence & Savoir',
    icon: '🍷'
  },
  {
    id: 'emeraude',
    name: 'Émeraude Excellence',
    description: 'Vert Forêt institutionnel & Menthe claire',
    primary: '#064E3B',
    accent: '#10B981',
    slogan: 'Lumière, Sagesse, Avenir',
    icon: '🌲'
  },
  {
    id: 'royal',
    name: 'Royal Noir Onyx & Or',
    description: 'Grand standing prestige & liseré doré',
    primary: '#18181B',
    accent: '#EAB308',
    slogan: 'La Rigueur au service du Succès',
    icon: '👑'
  },
  {
    id: 'ocean',
    name: 'Bleu Roi & Cyan',
    description: 'Dynamisme technologique & clarté moderne',
    primary: '#1E3A8A',
    accent: '#06B6D4',
    slogan: 'Innover pour transformer',
    icon: '🌌'
  },
  {
    id: 'amethyste',
    name: 'Améthyste Académique',
    description: 'Violet souverain & Lavande vibrante',
    primary: '#4A0E4E',
    accent: '#C084FC',
    slogan: 'Savoir, Éthique et Progrès',
    icon: '💜'
  },
  {
    id: 'safran',
    name: 'Terre d\'Afrique & Safran',
    description: 'Chaleur cuivrée & ambre solaire',
    primary: '#451A03',
    accent: '#F97316',
    slogan: 'Racines et Horizon',
    icon: '☀️'
  },
  {
    id: 'midnight',
    name: 'Bleu Cosmique & Azur',
    description: 'Contraste pur ultra-moderne',
    primary: '#0F172A',
    accent: '#38BDF8',
    slogan: 'Vers les sommets du Savoir',
    icon: '🌊'
  }
];

const STUDENTS_PER_PAGE = 12;

export default function SecretaryStudentCardsPrintPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Onglet actif : 'print' | 'customize' | 'secretary'
  const [activeTab, setActiveTab] = useState<'print' | 'customize' | 'secretary'>('print');
  const [previewSide, setPreviewSide] = useState<'recto' | 'verso'>('recto');
  const [secretaryUser, setSecretaryUser] = useState<any>(null);

  // État de personnalisation de la carte
  const [customization, setCustomization] = useState<CardCustomizationOptions>({
    primaryColor: '#072146',
    accentColor: '#FF7300',
    slogan: "Ensemble pour l'excellence",
    subtitle: 'Université Intelligente',
    showWatermark: true,
    showQrCode: true
  });

  const [activePresetId, setActivePresetId] = useState<string>('unisphere');

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
    id?: number;
    name: string;
    logo: string;
    academic_year: string;
    slogan?: string;
    card_config?: any;
  }>({
    name: 'UniSphere AI',
    logo: '/uploads/logos/university_1_1791668644.png',
    academic_year: '2026-2027',
    slogan: "Ensemble pour l'excellence"
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [resStudents, resUniv, resMe, resConfig] = await Promise.all([
        api.get('/api/v1/students/'),
        universityService.getInfo().catch(() => null),
        api.get('/api/v1/auth/me').catch(() => null),
        universityService.getCardConfig().catch(() => null)
      ]);

      const studentList = Array.isArray(resStudents.data) ? resStudents.data : [];
      setStudents(studentList);
      if (resMe?.data) setSecretaryUser(resMe.data);

      // Pré-sélectionner les 10 premiers par défaut
      const initialSelection = new Set<number>(studentList.slice(0, 10).map((s: Student) => s.id));
      setSelectedIds(initialSelection);

      if (resUniv) {
        setUniversityInfo({
          id: resUniv.id,
          name: resUniv.name || 'UniSphere AI',
          logo: resUniv.logo
            ? (resUniv.logo.startsWith('/') || resUniv.logo.startsWith('http') ? resUniv.logo : `/uploads/logos/${resUniv.logo}`)
            : '/uploads/logos/university_1_1791668644.png',
          academic_year: resUniv.academic_year || '2026-2027',
          slogan: resUniv.slogan || "Ensemble pour l'excellence",
          card_config: resConfig || resUniv.card_config
        });
      }

      // Appliquer la configuration sauvegardée si elle existe
      const cfg = resConfig || resUniv?.card_config;
      if (cfg) {
        setCustomization({
          primaryColor: cfg.primary_color || cfg.header_background_color || '#072146',
          accentColor: cfg.accent_color || cfg.matricule_background_color || '#FF7300',
          slogan: cfg.slogan || resUniv?.slogan || "Ensemble pour l'excellence",
          subtitle: cfg.subtitle || 'Université Intelligente',
          showWatermark: cfg.show_watermark !== false,
          showQrCode: cfg.show_qr_code !== false
        });

        // Détecter si correspond à un preset
        const matched = THEME_PRESETS.find(
          p => p.primary.toLowerCase() === (cfg.primary_color || '').toLowerCase() &&
               p.accent.toLowerCase() === (cfg.accent_color || '').toLowerCase()
        );
        if (matched) setActivePresetId(matched.id);
        else setActivePresetId('custom');
      }
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors du chargement des cartes');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPreset = (preset: ThemePreset) => {
    setActivePresetId(preset.id);
    setCustomization(prev => ({
      ...prev,
      primaryColor: preset.primary,
      accentColor: preset.accent,
      slogan: prev.slogan === "Ensemble pour l'excellence" || prev.slogan === '' ? preset.slogan : prev.slogan
    }));
  };

  const handleSaveCardConfig = async () => {
    try {
      setSavingConfig(true);
      const payload = {
        primary_color: customization.primaryColor,
        accent_color: customization.accentColor,
        header_background_color: customization.primaryColor,
        matricule_background_color: customization.accentColor,
        slogan: customization.slogan,
        subtitle: customization.subtitle,
        show_watermark: customization.showWatermark,
        show_qr_code: customization.showQrCode
      };

      await universityService.updateCardConfig(payload);
      setUniversityInfo(prev => ({
        ...prev,
        slogan: customization.slogan,
        card_config: { ...prev.card_config, ...payload }
      }));
      toast.success('Configuration de la carte enregistrée pour l\'établissement !');
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de la sauvegarde de la configuration');
    } finally {
      setSavingConfig(false);
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

  // Découpage en planches A4 de 10, 8 ou 6 cartes
  const printPages = useMemo(() => {
    const pages: Student[][] = [];
    for (let i = 0; i < selectedStudents.length; i += cardsPerPage) {
      pages.push(selectedStudents.slice(i, i + cardsPerPage));
    }
    return pages;
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

  const executePrint = () => {
    setShowPrintModal(false);
    setTimeout(() => {
      window.print();
    }, 250);
  };

  // Rendu unitaire d'une carte avec personnalisation active
  const renderCardItem = (student: Student) => {
    return (
      <div
        key={student.id}
        className="student-card-printable relative w-full h-full flex items-center justify-center p-0"
      >
        <OfficialStudentCard
          student={student}
          university={universityInfo}
          customization={customization}
          side="recto"
          mode="print"
          className="w-full h-full shadow-none"
        />
      </div>
    );
  };

  const sampleStudent: Student = selectedStudents[0] || students[0] || {
    id: 1,
    first_name: 'Moussa',
    last_name: 'Diallo',
    matricule: 'UAI2026001',
    level: 'L1',
    filiere: 'Informatique',
    status: 'active'
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <Loader2 className="w-10 h-10 text-[#FF7300] animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Chargement de l'atelier des cartes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-3 sm:p-5 lg:p-6">
      {/* 1. En-tête & Barre de navigation principale */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <Link
              href="/secretary/students"
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <ChevronLeft size={20} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">Cartes Étudiantes & Identité Visuelle</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-[#FF7300]">
                  {students.length} étudiant{students.length > 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Atelier de conception sur-mesure et tirage officiel en planches A4 (norme ISO CR80)
              </p>
            </div>
          </div>

          {/* Onglets de navigation principale */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setActiveTab('print')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
                activeTab === 'print'
                  ? 'bg-white text-slate-900 shadow-xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Printer size={15} className={activeTab === 'print' ? 'text-[#FF7300]' : ''} />
              <span>Tirage & Impression ({selectedStudents.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('customize')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
                activeTab === 'customize'
                  ? 'bg-white text-slate-900 shadow-xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Palette size={15} className={activeTab === 'customize' ? 'text-[#FF7300]' : ''} />
              <span>Personnaliser la carte</span>
              <span className="w-2 h-2 rounded-full bg-[#FF7300]" />
            </button>

            <button
              onClick={() => setActiveTab('secretary')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
                activeTab === 'secretary'
                  ? 'bg-white text-slate-900 shadow-xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck size={15} className={activeTab === 'secretary' ? 'text-[#FF7300]' : ''} />
              <span>Badge Secrétariat</span>
            </button>
          </div>
        </div>

        {/* Barre de statut du thème appliqué */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200/60">
          <div className="flex items-center gap-2.5">
            <div
              className="w-4 h-4 rounded-full border border-white shadow-2xs flex-shrink-0"
              style={{ backgroundColor: customization.primaryColor }}
            />
            <div
              className="w-4 h-4 rounded-full border border-white shadow-2xs -ml-3 flex-shrink-0"
              style={{ backgroundColor: customization.accentColor }}
            />
            <span className="font-bold text-slate-800">Thème Actif :</span>
            <span className="text-slate-600 font-medium">
              Vague Principale (<code className="font-mono text-slate-800 font-bold">{customization.primaryColor}</code>) • Accent (<code className="font-mono text-slate-800 font-bold">{customization.accentColor}</code>)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-500 italic">« {customization.slogan} »</span>
            {activeTab !== 'customize' && (
              <button
                onClick={() => setActiveTab('customize')}
                className="text-[#FF7300] hover:underline font-bold text-xs"
              >
                Modifier le style →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* ONGLET 2 : ATELIER DE PERSONNALISATION DE LA CARTE                    */}
      {/* ==================================================================== */}
      {activeTab === 'customize' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:hidden">
          {/* Panneau de configuration (Gauche : 7 colonnes) */}
          <div className="lg:col-span-7 space-y-5">
            {/* 1. Galerie des thèmes prêts à l'emploi */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <Sparkles className="text-[#FF7300]" size={16} />
                    Palettes & Thèmes Harmonieux
                  </h3>
                  <p className="text-xs text-slate-500">Sélectionnez une identité visuelle équilibrée en un clic</p>
                </div>
                <span className="text-xs font-bold text-slate-400">8 Thèmes</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {THEME_PRESETS.map((preset) => {
                  const isSelected =
                    activePresetId === preset.id ||
                    (customization.primaryColor.toLowerCase() === preset.primary.toLowerCase() &&
                     customization.accentColor.toLowerCase() === preset.accent.toLowerCase());

                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className={`text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-[#FF7300] bg-orange-50/50 shadow-xs ring-1 ring-[#FF7300]'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 truncate">
                          <span>{preset.icon}</span>
                          <span className="truncate">{preset.name}</span>
                        </div>
                        <p className="text-[10.5px] text-slate-500 truncate mt-0.5">{preset.description}</p>
                      </div>

                      <div className="flex items-center -space-x-1.5 flex-shrink-0">
                        <div
                          className="w-5 h-5 rounded-full border-2 border-white shadow-xs"
                          style={{ backgroundColor: preset.primary }}
                        />
                        <div
                          className="w-5 h-5 rounded-full border-2 border-white shadow-xs"
                          style={{ backgroundColor: preset.accent }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Nuancier Sur-mesure (Couleurs libres) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Palette className="text-[#FF7300]" size={16} />
                Nuancier Sur-mesure & Couleurs Exactes
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Sélecteur Couleur Vague Principale */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Vague Principale (Supérieure)
                  </label>
                  <p className="text-[11px] text-slate-500">Colore la découpe de vague haute et les intitulés</p>
                  <div className="flex items-center gap-3 pt-1">
                    <input
                      type="color"
                      value={customization.primaryColor}
                      onChange={(e) => {
                        setActivePresetId('custom');
                        setCustomization(prev => ({ ...prev, primaryColor: e.target.value }));
                      }}
                      className="w-10 h-10 rounded-xl cursor-pointer border border-slate-300 p-0.5 bg-white"
                    />
                    <input
                      type="text"
                      value={customization.primaryColor}
                      onChange={(e) => {
                        setActivePresetId('custom');
                        setCustomization(prev => ({ ...prev, primaryColor: e.target.value }));
                      }}
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF7300]"
                    />
                  </div>
                </div>

                {/* Sélecteur Couleur Vague Accent */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Vague d'Accent (Inférieure)
                  </label>
                  <p className="text-[11px] text-slate-500">Colore la vague dynamique, les badges et liserés</p>
                  <div className="flex items-center gap-3 pt-1">
                    <input
                      type="color"
                      value={customization.accentColor}
                      onChange={(e) => {
                        setActivePresetId('custom');
                        setCustomization(prev => ({ ...prev, accentColor: e.target.value }));
                      }}
                      className="w-10 h-10 rounded-xl cursor-pointer border border-slate-300 p-0.5 bg-white"
                    />
                    <input
                      type="text"
                      value={customization.accentColor}
                      onChange={(e) => {
                        setActivePresetId('custom');
                        setCustomization(prev => ({ ...prev, accentColor: e.target.value }));
                      }}
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF7300]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Textes & Éléments institutionnels */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <SlidersHorizontal className="text-[#FF7300]" size={16} />
                Textes & Éléments de Sécurité
              </h3>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Devise Officielle au Pied de Carte
                  </label>
                  <input
                    type="text"
                    value={customization.slogan}
                    onChange={(e) => setCustomization(prev => ({ ...prev, slogan: e.target.value }))}
                    placeholder="Ex: Ensemble pour l'excellence"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF7300]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sous-titre d'En-tête
                  </label>
                  <input
                    type="text"
                    value={customization.subtitle}
                    onChange={(e) => setCustomization(prev => ({ ...prev, subtitle: e.target.value }))}
                    placeholder="Ex: Université Intelligente"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF7300]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/60 cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={customization.showWatermark}
                      onChange={(e) => setCustomization(prev => ({ ...prev, showWatermark: e.target.checked }))}
                      className="rounded border-slate-300 text-[#FF7300] focus:ring-[#FF7300] cursor-pointer"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-900 block">Filigrane topographique</span>
                      <span className="text-[11px] text-slate-500">Courbes de sécurité anti-copie</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/60 cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={customization.showQrCode}
                      onChange={(e) => setCustomization(prev => ({ ...prev, showQrCode: e.target.checked }))}
                      className="rounded border-slate-300 text-[#FF7300] focus:ring-[#FF7300] cursor-pointer"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-900 block">QR Code Sécurisé</span>
                      <span className="text-[11px] text-slate-500">Scan de vérification en direct</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Bouton Sauvegarder */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    handleApplyPreset(THEME_PRESETS[0]);
                    setCustomization(prev => ({
                      ...prev,
                      subtitle: 'Université Intelligente',
                      showWatermark: true,
                      showQrCode: true
                    }));
                  }}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1.5"
                >
                  <RotateCcw size={13} />
                  Réinitialiser aux valeurs officielles
                </button>

                <button
                  type="button"
                  onClick={handleSaveCardConfig}
                  disabled={savingConfig}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#FF7300] hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  {savingConfig ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <>
                      <Save size={15} />
                      <span>Sauvegarder pour l'université</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Prévisualisation dynamique en direct (Droite : 5 colonnes sticky) */}
          <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-4 self-start">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Eye className="text-[#FF7300]" size={16} />
                  <h3 className="text-sm font-extrabold text-slate-900">Aperçu Réactif en Direct</h3>
                </div>

                {/* Bascule Recto / Verso */}
                <div className="inline-flex p-0.5 bg-slate-100 rounded-lg text-xs font-bold border border-slate-200">
                  <button
                    onClick={() => setPreviewSide('recto')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      previewSide === 'recto' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-600'
                    }`}
                  >
                    Recto
                  </button>
                  <button
                    onClick={() => setPreviewSide('verso')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      previewSide === 'verso' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-600'
                    }`}
                  >
                    Verso
                  </button>
                </div>
              </div>

              {/* Rendu dynamique de la carte */}
              <div className="flex justify-center py-2">
                <div className="w-full max-w-[420px] transform hover:scale-[1.01] transition-transform">
                  <OfficialStudentCard
                    student={sampleStudent}
                    university={universityInfo}
                    customization={customization}
                    side={previewSide}
                    mode="responsive"
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 text-[11px] text-slate-500 space-y-1">
                <div className="flex items-center justify-between font-bold text-slate-700">
                  <span>Format : ISO ID-1 CR80</span>
                  <span>85.60 mm × 53.98 mm</span>
                </div>
                <p>
                  Ce rendu est vectoriel haute précision : chaque impression physique sera nette et sans pixelisation.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('print')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                <Printer size={15} />
                <span>Passer au tirage avec ce modèle</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* ONGLET 1 : TIRAGE & IMPRESSION DES CARTES                              */}
      {/* ==================================================================== */}
      {activeTab === 'print' && (
        <div className="space-y-4 print:hidden">
          {/* Barre d'action supérieure du tirage */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Format de feuille A4 (10, 8 ou 6) */}
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500 uppercase text-[10px]">Format A4 :</span>
              <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 font-bold">
                <button
                  type="button"
                  onClick={() => setCardsPerPage(10)}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    cardsPerPage === 10 ? 'bg-[#FF7300] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  10 / feuille (2×5 CR80) ★
                </button>
                <button
                  type="button"
                  onClick={() => setCardsPerPage(8)}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    cardsPerPage === 8 ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  8 / feuille
                </button>
                <button
                  type="button"
                  onClick={() => setCardsPerPage(6)}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    cardsPerPage === 6 ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  6 / feuille
                </button>
              </div>
            </div>

            {/* Boutons d'impression */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                disabled={selectedStudents.length === 0}
                className="flex items-center gap-1.5 px-5 py-2 bg-[#FF7300] hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                <Printer size={15} />
                <span>Lancer l'impression ({selectedStudents.length} cartes • {printPages.length} feuille{printPages.length > 1 ? 's' : ''})</span>
              </button>
            </div>
          </div>

          {/* Bandeau d'aperçu express */}
          <div
            className="rounded-2xl p-4 sm:p-5 text-white flex flex-col md:flex-row items-center justify-between gap-5 shadow-sm"
            style={{
              background: `linear-gradient(135deg, ${customization.primaryColor} 0%, #0F172A 100%)`
            }}
          >
            <div className="space-y-1.5 text-center md:text-left">
              <span className="text-[10px] uppercase font-bold tracking-wider text-orange-400 flex items-center justify-center md:justify-start gap-1">
                <Sparkles size={12} /> Prêt pour tirage A4
              </span>
              <h2 className="text-base font-bold text-white">
                Planches calibrées avec l'identité {activePresetId !== 'custom' ? THEME_PRESETS.find(p => p.id === activePresetId)?.name : 'Personnalisée'}
              </h2>
              <p className="text-xs text-slate-300 max-w-md">
                Toutes les cartes imprimées adopteront fidèlement la double vague, le filigrane de sécurité et la devise choisie.
              </p>
              <div className="pt-2 flex items-center justify-center md:justify-start gap-3 text-xs">
                <span className="bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 font-bold">
                  {selectedStudents.length} carte(s) sélectionnée(s)
                </span>
                <span className="bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 font-bold">
                  {printPages.length} planche(s) A4
                </span>
              </div>
            </div>

            {/* Carte échantillon interactive */}
            <div className="w-full max-w-[340px]">
              <OfficialStudentCard
                student={sampleStudent}
                university={universityInfo}
                customization={customization}
                side="recto"
                mode="responsive"
              />
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
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#FF7300]"
                />
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
              </div>

              <select
                value={filterFiliere}
                onChange={(e) => { setFilterFiliere(e.target.value); setCurrentPage(1); }}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#FF7300]"
              >
                <option value="">Toutes filières</option>
                {filieres.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>

              <select
                value={filterLevel}
                onChange={(e) => { setFilterLevel(e.target.value); setCurrentPage(1); }}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#FF7300]"
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
                <CheckSquare size={14} className="text-[#FF7300]" />
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

          {/* Tableau paginé des étudiants */}
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
                              className="rounded border-slate-300 text-[#FF7300] focus:ring-[#FF7300] cursor-pointer"
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
                          <td className="px-4 py-2 font-mono font-semibold" style={{ color: customization.accentColor }}>
                            {student.matricule || `UAI2026${String(student.id).padStart(3, '0')}`}
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

      {/* ==================================================================== */}
      {/* ONGLET 3 : BADGE PERSONNEL / SECRÉTARIAT                             */}
      {/* ==================================================================== */}
      {activeTab === 'secretary' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-4 shadow-xs print:hidden">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="text-[#FF7300]" size={18} />
                Badge Professionnel du Personnel - Secrétariat
              </h2>
              <p className="text-xs text-slate-500">Badge officiel avec coordonnées administratives et identité visuelle du campus</p>
            </div>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#FF7300] text-white rounded-xl text-xs font-bold hover:bg-orange-600 transition-colors"
            >
              <Printer size={14} /> Imprimer mon badge
            </button>
          </div>

          <div className="flex justify-center py-6">
            <div className="w-full max-w-[420px]">
              <OfficialStudentCard
                student={{
                  id: secretaryUser?.id || 1,
                  first_name: secretaryUser?.full_name?.split(' ')[0] || 'Secrétaire',
                  last_name: secretaryUser?.full_name?.split(' ').slice(1).join(' ') || 'Général',
                  matricule: `SEC-${String(secretaryUser?.id || 1).padStart(3, '0')}`,
                  filiere: 'Administration & Registre',
                  level: 'Personnel'
                }}
                university={universityInfo}
                customization={customization}
                side="recto"
                mode="responsive"
              />
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* PLANCHES D'IMPRESSION PHYSIQUES A4 (Uniquement actives au window.print)*/}
      {/* ==================================================================== */}
      <div className="hidden print:block">
        {printPages.map((pageStudents, pageIdx) => (
          <div key={pageIdx} className="print-page-wrapper">
            <div className="print-sheet a4-sheet">
              {pageStudents.map((student) => renderCardItem(student))}
            </div>
          </div>
        ))}
      </div>

      {/* ==================================================================== */}
      {/* MODAL D'APERÇU CONFIRMATION IMPRESSION A4                            */}
      {/* ==================================================================== */}
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
                <Sparkles size={16} className="text-[#FF7300] flex-shrink-0" />
                <span>
                  Prêt pour l'impression. La planche est calibrée pour remplir <b>100% de la feuille A4</b> au format officiel standard ISO CR80.
                </span>
              </div>

              {/* Aperçu des 2 premières cartes avec personnalisation active */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedStudents.slice(0, 2).map((s) => (
                  <div key={s.id} className="w-full">
                    <OfficialStudentCard
                      student={s}
                      university={universityInfo}
                      customization={customization}
                      side="recto"
                      mode="responsive"
                    />
                  </div>
                ))}
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
                className="flex items-center gap-1.5 px-5 py-2 bg-[#FF7300] hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
              >
                <Printer size={14} />
                Lancer l'impression ({selectedStudents.length} cartes)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RÈGLES CSS IMPRESSION A4 STRICTES */}
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
            box-shadow: none !important;
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}
