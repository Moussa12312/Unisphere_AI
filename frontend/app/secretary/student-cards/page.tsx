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

// Thèmes de personnalisation de cartes
const CARD_THEMES: Record<string, { id: string; name: string; gradient: string; accentText: string; dotBg: string }> = {
  gold: {
    id: 'gold',
    name: 'Or Institutionnel',
    gradient: 'linear-gradient(135deg, #0B192C 0%, #1E293B 100%)',
    accentText: 'text-amber-300',
    dotBg: 'bg-amber-400'
  },
  emerald: {
    id: 'emerald',
    name: 'Émeraude Prestige',
    gradient: 'linear-gradient(135deg, #064E3B 0%, #0F766E 100%)',
    accentText: 'text-emerald-300',
    dotBg: 'bg-emerald-400'
  },
  royal: {
    id: 'royal',
    name: 'Bleu Royal Nacre',
    gradient: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)',
    accentText: 'text-sky-300',
    dotBg: 'bg-sky-400'
  },
  crimson: {
    id: 'crimson',
    name: 'Bordeaux Impérial',
    gradient: 'linear-gradient(135deg, #4C0519 0%, #881337 100%)',
    accentText: 'text-rose-200',
    dotBg: 'bg-rose-400'
  }
};

export default function SecretaryStudentCardsPrintPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Thème & Sélection de badge (Étudiants vs Secrétaire)
  const [cardTheme, setCardTheme] = useState<string>('gold');
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

  // Informations de l'université
  const [universityInfo, setUniversityInfo] = useState<{
    name: string;
    logo: string | null;
    academic_year: string;
  }>({
    name: 'UNIVERSITÉ UNISPHERE',
    logo: null,
    academic_year: '2026-2027'
  });

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
          name: resUniv.name || 'UNIVERSITÉ UNISPHERE',
          logo: resUniv.logo ? (resUniv.logo.startsWith('/') ? resUniv.logo : `/uploads/logos/${resUniv.logo}`) : null,
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

  // Helper pour photo ou initiales
  const renderStudentPhoto = (student: Student, isSmall: boolean) => {
    const initials = `${(student.first_name || '')[0] || ''}${(student.last_name || '')[0] || ''}`.toUpperCase() || 'ET';
    const photoUrl = student.photo
      ? student.photo.startsWith('/') || student.photo.startsWith('http')
        ? student.photo
        : `/uploads/${student.photo}`
      : null;

    // Agrandissement significatif de la photo pour une visibilité officielle optimale
    const sizeClass = isSmall ? 'w-14 h-[68px]' : 'w-16 h-20';

    if (photoUrl) {
      return (
        <div className={`relative ${sizeClass} rounded-lg overflow-hidden border border-slate-300 bg-slate-100 flex-shrink-0 shadow-xs`}>
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
      <div className={`${sizeClass} rounded-lg bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#1E3A8A] border border-slate-300 flex flex-col items-center justify-center text-white flex-shrink-0 shadow-xs`}>
        <span className="font-black text-base tracking-wider text-amber-300">{initials}</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-white/70 mt-0.5">Élève</span>
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
        {/* SÉLECTEUR DE TYPE DE BADGE ET PERSONNALISATION */}
        {/* ======================================================== */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
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

          {/* PALETTE DES THÈMES DE COULEURS */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
              <Sparkles size={13} className="text-[#FF6B00]" />
              Thème de carte :
            </span>
            {Object.values(CARD_THEMES).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setCardTheme(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  cardTheme === t.id
                    ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${t.dotBg}`} />
                <span>{t.name}</span>
              </button>
            ))}
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
                  style={{ background: (CARD_THEMES[cardTheme] || CARD_THEMES.gold).gradient }}
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
                      <p className={`text-[7px] font-bold uppercase tracking-wider ${(CARD_THEMES[cardTheme] || CARD_THEMES.gold).accentText}`}>
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
                {pageStudents.map((student) => {
                  const qrCodeUrl = `/api/v1/students/${student.id}/qrcode`;

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
                      {/* En-tête de la carte */}
                      <div
                        className={`px-3 flex items-center justify-between text-white flex-shrink-0 ${
                          isTen ? 'py-1 h-8' : isCompact ? 'py-1.5 h-9' : 'py-2 h-11'
                        }`}
                        style={{
                          background: (CARD_THEMES[cardTheme] || CARD_THEMES.gold).gradient
                        }}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          {universityInfo.logo ? (
                            <img
                              src={universityInfo.logo}
                              alt="Logo"
                              className="h-6 w-6 object-contain bg-white rounded-full p-0.5 border border-amber-400/50 flex-shrink-0"
                            />
                          ) : (
                            <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 border border-white/30 text-amber-300">
                              <Building2 size={13} />
                            </div>
                          )}
                          <div className="min-w-0 leading-none">
                            <div className="font-black text-[10.5px] tracking-wide uppercase truncate text-white">
                              {universityInfo.name}
                            </div>
                            <div className={`text-[7.5px] font-bold tracking-wider uppercase mt-0.5 ${(CARD_THEMES[cardTheme] || CARD_THEMES.gold).accentText}`}>
                              CARTE OFFICIELLE D'ÉTUDIANT
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end flex-shrink-0">
                          <span className="text-[8px] font-mono font-black text-amber-200 bg-white/10 px-2 py-0.5 rounded border border-white/20">
                            {universityInfo.academic_year}
                          </span>
                        </div>
                      </div>

                      {/* Liseré sécurité tricolore/or */}
                      <div className="h-[2px] w-full bg-gradient-to-r from-[#FF6B00] via-amber-400 to-blue-500 flex-shrink-0" />

                      {/* Corps de la carte */}
                      <div className="px-2.5 py-1 flex items-center justify-between gap-2.5 flex-1 min-h-0 bg-white">
                        {/* 1. Photo + Puce dorée */}
                        <div className="flex flex-col items-center flex-shrink-0">
                          {renderStudentPhoto(student, isTen || isCompact)}

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

                        {/* 2. Informations de l'étudiant (Nom, Prénom, Matricule très lisibles) */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-0.5">
                          <div>
                            <span className="text-[7.5px] uppercase font-bold text-slate-400 block tracking-wider leading-none mb-0.5">
                              TITULAIRE
                            </span>
                            <div className="text-[13.5px] font-black text-slate-950 leading-tight uppercase truncate tracking-tight">
                              {student.last_name}
                            </div>
                            <div className="text-[11.5px] font-bold text-slate-700 leading-tight capitalize truncate">
                              {student.first_name}
                            </div>
                          </div>

                          {/* Matricule en capsule bien visible */}
                          <div className="my-0.5">
                            <span
                              className="inline-block px-2.5 py-0.5 rounded-md text-[10.5px] font-mono font-black text-white shadow-2xs tracking-wider"
                              style={{ backgroundColor: '#FF6B00' }}
                            >
                              {student.matricule || `ID-${student.id}`}
                            </span>
                          </div>

                          {/* Filière & Niveau */}
                          <div className="text-[8.5px] text-slate-700 leading-tight space-y-0.5">
                            <div className="truncate">
                              <span className="font-bold text-slate-900">Filière : </span>
                              <span className="font-semibold">{student.filiere || 'Formation Supérieure'}</span>
                            </div>
                            <div className="truncate flex items-center gap-1.5">
                              <span className="font-bold text-slate-900">Niveau : </span>
                              <span className="font-extrabold text-blue-900 bg-blue-50 border border-blue-200/80 px-1.5 py-0.2 rounded text-[9px]">
                                {student.level || 'L1'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 3. QR Code haute définition agrandi */}
                        <div className="flex flex-col items-center justify-center flex-shrink-0">
                          <div className="p-1 bg-white rounded-lg border border-slate-300 shadow-2xs">
                            <div className="w-16 h-16 flex items-center justify-center">
                              <img
                                src={qrCodeUrl}
                                alt="QR Code"
                                className="w-full h-full object-contain"
                              />
                            </div>
                          </div>
                          <span className="text-[7px] font-mono font-black text-slate-600 mt-0.5 tracking-wider uppercase">
                            SCAN ACCÈS
                          </span>
                        </div>
                      </div>

                      {/* Pied de carte avec hologramme */}
                      <div
                        className="px-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[7.5px] text-slate-600 font-bold flex-shrink-0 h-4"
                      >
                        <div className="flex items-center gap-1">
                          <div
                            className="w-2.5 h-2.5 rounded-full flex items-center justify-center text-[4px] font-black text-slate-900 shadow-2xs"
                            style={{
                              background: 'radial-gradient(circle, #67e8f9 0%, #c084fc 50%, #fde047 100%)'
                            }}
                          >
                            ★
                          </div>
                          <span className="font-bold text-slate-700 tracking-wider">BADGE SÉCURISÉ & CERTIFIÉ</span>
                        </div>
                        <span className="font-mono text-slate-500 text-[7px]">UNISPHERE • {universityInfo.academic_year}</span>
                      </div>
                    </div>
                  );
                })}
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

              {/* Aperçu compact des premières cartes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedStudents.slice(0, 4).map((student) => (
                  <div key={student.id} className="bg-white rounded-xl border border-slate-300 p-3 shadow-xs flex items-center gap-3">
                    {renderStudentPhoto(student, true)}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 text-xs uppercase truncate">
                        {student.last_name} {student.first_name}
                      </p>
                      <p className="text-[11px] font-mono text-[#FF6B00] font-semibold">{student.matricule}</p>
                      <p className="text-[10px] text-slate-500 truncate">{student.filiere} • {student.level}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-bold rounded-full">
                        Badge Sécurisé
                      </span>
                    </div>
                  </div>
                ))}
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
