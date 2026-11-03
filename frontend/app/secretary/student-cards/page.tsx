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
import { toast } from 'react-hot-toast';
import OfficialStudentCard from '@/components/cards/OfficialStudentCard';

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

const STUDENTS_PER_PAGE = 12;

export default function SecretaryStudentCardsPrintPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

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
    slogan?: string;
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
      const [resStudents, resUniv, resMe] = await Promise.all([
        api.get('/api/v1/students/'),
        universityService.getInfo().catch(() => null),
        api.get('/api/v1/auth/me').catch(() => null)
      ]);

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
          academic_year: resUniv.academic_year || '2026-2027',
          slogan: resUniv.slogan || "Ensemble pour l'excellence"
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

  // Rendu d'une carte unitaire pour l'impression A4
  const renderCardItem = (student: Student) => {
    return (
      <div
        key={student.id}
        className="student-card-printable relative w-full h-full flex items-center justify-center p-0"
      >
        <OfficialStudentCard
          student={student}
          university={universityInfo}
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
        <p className="text-xs text-slate-500 font-medium">Chargement des cartes officielles...</p>
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
                <h1 className="text-lg font-black text-[#072146]">Tirage des Cartes Étudiantes Officielles</h1>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-[#FF7300]">
                  {students.length} étudiant{students.length > 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Planches A4 homologuées UniSphere AI (10 cartes / feuille au format CR80 standard 2×5) avec repères de coupe
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
                  cardsPerPage === 10 ? 'bg-[#FF7300] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
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
              className="flex items-center gap-1.5 px-4 py-2 bg-[#FF7300] hover:bg-[#e56700] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              <Printer size={15} />
              <span>Imprimer ({selectedStudents.length} cartes)</span>
            </button>
          </div>
        </div>

        {/* Badge Modèle Officiel Garanti */}
        <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-bold text-[#072146]">Design Officiel Homologué :</span>
            <span className="text-slate-600">UniSphere AI Double Vague (Bleu Nuit & Orange Solaire) • Filigrane Topographique • QR Code Sécurisé</span>
          </div>
          <span className="text-[11px] font-mono text-slate-500 font-semibold">{universityInfo.academic_year}</span>
        </div>
      </div>

      {/* 2. Vue Carte Secrétariat (Badge Personnel) */}
      {cardScope === 'secretary' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-4 shadow-xs print:hidden">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="text-[#FF7300]" size={18} />
                Badge Professionnel du Personnel - Secrétariat
              </h2>
              <p className="text-xs text-slate-500">Badge officiel avec QR code d'accès et coordonnées administratives</p>
            </div>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#FF7300] text-white rounded-xl text-xs font-bold hover:bg-[#e56700] transition-colors"
            >
              <Printer size={14} /> Imprimer mon badge
            </button>
          </div>

          <div className="flex justify-center py-4">
            <div
              className="w-full max-w-[420px]"
            >
              <OfficialStudentCard
                student={{
                  id: secretaryUser?.id || 1,
                  first_name: secretaryUser?.full_name?.split(' ')[0] || 'Secrétaire',
                  last_name: secretaryUser?.full_name?.split(' ').slice(1).join(' ') || 'Général',
                  matricule: `SEC-${String(secretaryUser?.id || 1).padStart(3, '0')}`,
                  filiere: 'Administration & Archives',
                  level: 'Personnel'
                }}
                university={universityInfo}
                side="recto"
                mode="responsive"
              />
            </div>
          </div>
        </div>
      )}

      {/* 3. Section Étudiants : Aperçu en Direct (1 carte) + Tableau Allégé avec Pagination */}
      {cardScope === 'students' && (
        <div className="space-y-4 print:hidden">
          {/* Carte Aperçu Direct + Résumé d'impression */}
          <div className="bg-gradient-to-r from-[#072146] via-slate-900 to-[#072146] rounded-2xl p-4 sm:p-5 text-white flex flex-col md:flex-row items-center justify-between gap-5 shadow-sm">
            <div className="space-y-1.5 text-center md:text-left">
              <span className="text-[10px] uppercase font-bold tracking-wider text-orange-400 flex items-center justify-center md:justify-start gap-1">
                <Sparkles size={12} /> Rendu en Direct Haute Fidélité
              </span>
              <h2 className="text-base font-bold text-white">
                Aperçu instantané de la carte officielle
              </h2>
              <p className="text-xs text-slate-300 max-w-md">
                Toutes les cartes imprimées adopteront cette disposition conforme aux dimensions standard ISO ID-1 avec repères de découpe nets.
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
            <div className="w-full max-w-[360px]">
              <OfficialStudentCard
                student={sampleStudent}
                university={universityInfo}
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

          {/* Tableau paginé */}
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
                          <td className="px-4 py-2 font-mono font-semibold text-[#FF7300]">
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

      {/* 4. PLANCHES D'IMPRESSION PHYSIQUES A4 */}
      <div className="hidden print:block">
        {printPages.map((pageStudents, pageIdx) => (
          <div key={pageIdx} className="print-page-wrapper">
            <div className="print-sheet a4-sheet">
              {pageStudents.map((student) => renderCardItem(student))}
            </div>
          </div>
        ))}
      </div>

      {/* 5. Modal Solennel d'Aperçu avant Impression */}
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
                  Prêt pour l'impression. La planche est calibrée pour remplir <b>100% de la feuille A4</b> au format officiel standard.
                </span>
              </div>

              {/* Aperçu des 2 premières cartes avec le nouveau design */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedStudents.slice(0, 2).map((s) => (
                  <div key={s.id} className="w-full">
                    <OfficialStudentCard
                      student={s}
                      university={universityInfo}
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
                className="flex items-center gap-1.5 px-5 py-2 bg-[#FF7300] hover:bg-[#e56700] text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
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
