'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Plus, Search, Pencil, Trash2, Eye, Loader2, GraduationCap,
  BookOpen, Layers, ArrowLeft, ArrowRight, Sparkles, Filter,
  Clock, Award, Users, CheckCircle2, ChevronRight, LayoutGrid, List
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { courseService, Course } from '@/services/courseService';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/hooks/useConfirm';

function AdminCoursesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryFiliereId = searchParams.get('filiere_id');

  const toast = useToast();
  const { confirm } = useConfirm();

  const [courses, setCourses] = useState<Course[]>([]);
  const [filieres, setFilieres] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // État de sélection : null = vue par cartes des filières, number = vue détaillée d'une filière
  const [selectedFiliereId, setSelectedFiliereId] = useState<number | 'all' | null>(
    queryFiliereId ? (queryFiliereId === 'all' ? 'all' : parseInt(queryFiliereId)) : null
  );

  // Filtres dans la filière
  const [selectedSemester, setSelectedSemester] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [viewStyle, setViewStyle] = useState<'grid' | 'table'>('table');

  useEffect(() => {
    loadCoursesAndFilieres();
  }, []);

  const loadCoursesAndFilieres = async () => {
    try {
      setLoading(true);
      const [coursesData, filieresRes] = await Promise.all([
        courseService.getAll(),
        api.get('/api/v1/filieres/').catch(() => ({ data: [] }))
      ]);
      setCourses(coursesData);
      setFilieres(Array.isArray(filieresRes.data) ? filieresRes.data : []);
    } catch (error) {
      toast.error('Erreur lors du chargement des modules');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, title: string) => {
    const ok = await confirm({
      title: 'Supprimer ce module ?',
      message: `Voulez-vous vraiment supprimer le module "${title}" ? Cette action est irréversible.`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
      icon: 'trash'
    });

    if (ok) {
      try {
        await courseService.delete(id);
        toast.success('Module supprimé avec succès');
        loadCoursesAndFilieres();
      } catch (error) {
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  // Liste ordonnée standard des semestres LMD
  const standardSemesters = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10'];

  // Données de la filière actuellement ouverte
  const currentFiliere = useMemo(() => {
    if (!selectedFiliereId || selectedFiliereId === 'all') return null;
    return filieres.find(f => f.id === selectedFiliereId) || null;
  }, [filieres, selectedFiliereId]);

  // Modules filtrés pour la vue courante
  const visibleCourses = useMemo(() => {
    return courses.filter((c: any) => {
      // 1. Filtrage par filière
      if (selectedFiliereId !== null && selectedFiliereId !== 'all') {
        const matchesFiliere =
          (c.filiere_id && c.filiere_id === selectedFiliereId) ||
          (currentFiliere && c.department && c.department.toLowerCase() === currentFiliere.name.toLowerCase()) ||
          (currentFiliere && c.filiere_name && c.filiere_name.toLowerCase() === currentFiliere.name.toLowerCase());
        if (!matchesFiliere) return false;
      }

      // 2. Filtrage par semestre
      if (selectedSemester !== 'all') {
        const cSem = (c.semester || '').toUpperCase().trim();
        if (cSem !== selectedSemester.toUpperCase().trim()) return false;
      }

      // 3. Filtrage par niveau
      if (selectedLevel !== 'all') {
        if (c.level?.toLowerCase() !== selectedLevel.toLowerCase()) return false;
      }

      // 4. Recherche texte
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesSearch =
          c.title?.toLowerCase().includes(q) ||
          c.code?.toLowerCase().includes(q) ||
          c.teacher_name?.toLowerCase().includes(q) ||
          c.teaching_unit_code?.toLowerCase().includes(q) ||
          c.teaching_unit_name?.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [courses, selectedFiliereId, currentFiliere, selectedSemester, selectedLevel, search]);

  // Liste des semestres présents dans la sélection actuelle
  const availableSemesters = useMemo(() => {
    const list = selectedFiliereId && selectedFiliereId !== 'all'
      ? courses.filter(c =>
          (c.filiere_id && c.filiere_id === selectedFiliereId) ||
          (currentFiliere && (c.department === currentFiliere.name || c.filiere_name === currentFiliere.name))
        )
      : courses;

    const sems = new Set<string>();
    list.forEach(c => {
      if (c.semester) sems.add(c.semester.toUpperCase().trim());
    });

    // Retourner trié selon l'ordre standard LMD
    return standardSemesters.filter(s => sems.has(s)).concat(
      Array.from(sems).filter(s => !standardSemesters.includes(s))
    );
  }, [courses, selectedFiliereId, currentFiliere]);

  // Groupement des modules par semestre pour un affichage structuré
  const coursesGroupedBySemester = useMemo(() => {
    const groups: { [semester: string]: Course[] } = {};

    visibleCourses.forEach(c => {
      const semKey = c.semester ? c.semester.toUpperCase().trim() : 'Sans Semestre';
      if (!groups[semKey]) groups[semKey] = [];
      groups[semKey].push(c);
    });

    // Ordonner les clés de semestre
    const orderedKeys = Object.keys(groups).sort((a, b) => {
      const idxA = standardSemesters.indexOf(a);
      const idxB = standardSemesters.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    return orderedKeys.map(k => ({
      semester: k,
      courses: groups[k]
    }));
  }, [visibleCourses]);

  // Statistiques globales
  const totalCredits = useMemo(() => courses.reduce((acc, c) => acc + (c.credits || 0), 0), [courses]);
  const totalHours = useMemo(() => courses.reduce((acc, c) => acc + (c.hours || 0), 0), [courses]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="w-10 h-10 text-[#FF6B00] animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Chargement des modules académiques...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-2 sm:p-4">
      {/* 1. En-tête Principal avec Titre & Statistiques */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-[#FF6B00]">
              Architecture LMD
            </span>
            <span className="text-xs text-slate-400">• Catalogue Officiel des Modules</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2.5">
            <BookOpen className="text-[#FF6B00]" size={28} />
            Gestion des Modules par Filière
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Organisation des enseignements par filière académique et semestres d'études
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href={
              selectedFiliereId && selectedFiliereId !== 'all'
                ? `/admin/courses/create?filiere_id=${selectedFiliereId}${selectedSemester !== 'all' ? `&semester=${selectedSemester}` : ''}`
                : '/admin/courses/create'
            }
            className="flex items-center gap-2 px-5 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer"
          >
            <Plus size={16} />
            <span>Nouveau Module</span>
          </Link>
        </div>
      </div>

      {/* 2. Cartes de Métriques Clés */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Filières</span>
            <GraduationCap size={16} className="text-[#FF6B00]" />
          </div>
          <p className="text-2xl font-black text-slate-900">{filieres.length}</p>
          <span className="text-[11px] text-slate-400">Parcours universitaires</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Modules</span>
            <BookOpen size={16} className="text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{courses.length}</p>
          <span className="text-[11px] text-slate-400">Éléments constitutifs</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Crédits</span>
            <Award size={16} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{totalCredits}</p>
          <span className="text-[11px] text-slate-400">Crédits ECTS délivrés</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Volume Horaire</span>
            <Clock size={16} className="text-purple-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{totalHours}h</p>
          <span className="text-[11px] text-slate-400">Heures d'enseignement</span>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* VUE 1 : GRILLE DES CARTES DE FILIÈRES (Quand aucune filière n'est sélectionnée) */}
      {/* ==================================================================== */}
      {selectedFiliereId === null && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <GraduationCap className="text-[#FF6B00]" size={20} />
                Sélectionnez une Filière pour afficher ses Modules
              </h2>
              <p className="text-xs text-slate-500">
                Cliquez sur une carte de filière pour explorer ses modules organisés par semestre
              </p>
            </div>

            <button
              onClick={() => setSelectedFiliereId('all')}
              className="self-start sm:self-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Layers size={14} />
              <span>Voir tous les modules transversaux</span>
            </button>
          </div>

          {/* Grille des Cartes des Filières */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filieres.map((filiere: any) => {
              const filiereCourses = courses.filter((c: any) =>
                (c.filiere_id && c.filiere_id === filiere.id) ||
                (c.department && c.department.toLowerCase() === filiere.name.toLowerCase()) ||
                (c.filiere_name && c.filiere_name.toLowerCase() === filiere.name.toLowerCase())
              );

              const filiereCredits = filiereCourses.reduce((acc, c) => acc + (c.credits || 0), 0);
              const filiereHours = filiereCourses.reduce((acc, c) => acc + (c.hours || 0), 0);

              // Semestres présents dans cette filière
              const filiereSemesters = Array.from(
                new Set(filiereCourses.map(c => c.semester?.toUpperCase().trim()).filter(Boolean))
              ).sort();

              const levels = filiere.levels ? filiere.levels.split(',').map((l: string) => l.trim()) : ['L1', 'L2', 'L3'];

              return (
                <div
                  key={filiere.id}
                  onClick={() => {
                    setSelectedFiliereId(filiere.id);
                    setSelectedSemester('all');
                  }}
                  className="group bg-white rounded-2xl border-2 border-slate-200/90 hover:border-[#FF6B00] shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-orange-100/60 to-transparent rounded-bl-full pointer-events-none transition-all group-hover:scale-110" />

                  <div className="space-y-3 relative z-10">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        {filiere.domain || 'Département Académique'}
                      </span>
                      <span className="text-xs font-mono font-black text-[#FF6B00] bg-orange-50 px-2 py-0.5 rounded-md">
                        {filiereCourses.length} module{filiereCourses.length > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-black text-slate-900 group-hover:text-[#FF6B00] transition-colors leading-tight">
                        {filiere.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        {filiere.description || 'Formation universitaire habilitée LMD'}
                      </p>
                    </div>

                    {/* Semestres couverts */}
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Semestres actifs :
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {filiereSemesters.length > 0 ? (
                          filiereSemesters.map((sem) => (
                            <span
                              key={sem}
                              className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-orange-50 text-orange-800 border border-orange-200"
                            >
                              {sem}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Aucun semestre assigné</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Pied de Carte Filière */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 relative z-10">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-slate-800">{filiereCredits} crédits</span>
                      <span>•</span>
                      <span>{filiereHours}h</span>
                    </div>

                    <span className="text-xs font-bold text-[#FF6B00] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Voir les modules <ChevronRight size={14} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* VUE 2 : DÉTAIL DES MODULES DE LA FILIÈRE SÉLECTIONNÉE (OU VUE GLOBALE) */}
      {/* ==================================================================== */}
      {selectedFiliereId !== null && (
        <div className="space-y-5">
          {/* Barre de retour aux filières */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setSelectedFiliereId(null);
                  setSelectedSemester('all');
                  setSearch('');
                }}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft size={15} />
                <span>Toutes les filières</span>
              </button>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  {currentFiliere?.domain || 'Vue Globale'}
                </span>
                <h2 className="text-lg font-black text-slate-900 leading-tight">
                  {currentFiliere ? currentFiliere.name : 'Tous les Modules de l\'Université'}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">
                {visibleCourses.length} module{visibleCourses.length > 1 ? 's' : ''} trouvé{visibleCourses.length > 1 ? 's' : ''}
              </span>

              {/* Basculer entre Vue Cartes et Vue Tableau */}
              <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50 p-0.5">
                <button
                  onClick={() => setViewStyle('table')}
                  title="Vue Tableau par Semestre"
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewStyle === 'table' ? 'bg-white shadow-2xs text-[#FF6B00]' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <List size={16} />
                </button>
                <button
                  onClick={() => setViewStyle('grid')}
                  title="Vue Cartes de Modules"
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewStyle === 'grid' ? 'bg-white shadow-2xs text-[#FF6B00]' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <LayoutGrid size={16} />
                </button>
              </div>

              <Link
                href={
                  currentFiliere
                    ? `/admin/courses/create?filiere_id=${currentFiliere.id}${selectedSemester !== 'all' ? `&semester=${selectedSemester}` : ''}`
                    : '/admin/courses/create'
                }
                className="px-3.5 py-2 bg-[#FF6B00] hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <Plus size={14} />
                <span>Ajouter un module</span>
              </Link>
            </div>
          </div>

          {/* SÉLECTEUR DE SEMESTRE (Exigence Clé de l'Utilisateur) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={15} className="text-[#FF6B00]" />
                Filtrer et Identifier les Modules par Semestre :
              </span>
              <span className="text-[11px] text-slate-400">
                Sélectionnez un semestre pour cibler les enseignements semestriels
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setSelectedSemester('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  selectedSemester === 'all'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Tous les semestres ({visibleCourses.length})
              </button>

              {availableSemesters.map((sem) => {
                const count = courses.filter((c: any) => {
                  if (selectedFiliereId !== 'all') {
                    const matchF =
                      (c.filiere_id && c.filiere_id === selectedFiliereId) ||
                      (currentFiliere && (c.department === currentFiliere.name || c.filiere_name === currentFiliere.name));
                    if (!matchF) return false;
                  }
                  return c.semester && c.semester.toUpperCase().trim() === sem.toUpperCase().trim();
                }).length;

                return (
                  <button
                    key={sem}
                    onClick={() => setSelectedSemester(sem)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                      selectedSemester === sem
                        ? 'bg-[#FF6B00] text-white border-[#FF6B00] shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>{sem}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        selectedSemester === sem ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Recherche & Filtre de niveau */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-slate-100">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Rechercher un module par titre, code, enseignant ou UE..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>

              {currentFiliere?.levels && (
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Niveau :</span>
                  <select
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
                  >
                    <option value="all">Tous niveaux</option>
                    {currentFiliere.levels.split(',').map((lvl: string) => (
                      <option key={lvl.trim()} value={lvl.trim()}>{lvl.trim()}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* AFFICHAGE DES MODULES GROUPÉS PAR SEMESTRE */}
          {coursesGroupedBySemester.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <BookOpen size={40} className="text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">Aucun module trouvé</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Aucun module ne correspond aux filtres de semestre ou de recherche sélectionnés pour cette filière.
              </p>
              <Link
                href={`/admin/courses/create?filiere_id=${selectedFiliereId !== 'all' ? selectedFiliereId : ''}${selectedSemester !== 'all' ? `&semester=${selectedSemester}` : ''}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#FF6B00] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-orange-600 transition-colors"
              >
                <Plus size={14} /> Créer le premier module de ce semestre
              </Link>
            </div>
          ) : (
            coursesGroupedBySemester.map((group) => {
              const semCredits = group.courses.reduce((acc, c) => acc + (c.credits || 0), 0);
              const semHours = group.courses.reduce((acc, c) => acc + (c.hours || 0), 0);

              return (
                <div
                  key={group.semester}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden space-y-0"
                >
                  {/* En-tête de section du Semestre */}
                  <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-xl bg-orange-500/20 text-[#FF6B00] border border-[#FF6B00]/30 flex items-center justify-center font-mono font-black text-xs">
                        {group.semester}
                      </span>
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-wide">
                          {group.semester === 'Sans Semestre' ? 'Modules Non Assignés à un Semestre' : `Semestre ${group.semester}`}
                        </h3>
                        <p className="text-[11px] text-slate-300">
                          {group.courses.length} module{group.courses.length > 1 ? 's' : ''} d'enseignement
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="px-2.5 py-1 rounded-lg bg-white/10 font-mono font-bold text-emerald-300 border border-white/10">
                        {semCredits} Crédits
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-white/10 font-mono font-bold text-purple-300 border border-white/10">
                        {semHours}h
                      </span>
                    </div>
                  </div>

                  {/* Mode Tableau par Semestre */}
                  {viewStyle === 'table' ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200/80">
                          <tr>
                            <th className="px-4 py-3">Code & Titre du Module</th>
                            <th className="px-4 py-3">Niveau & Semestre</th>
                            <th className="px-4 py-3">Unité d'Enseignement (UE)</th>
                            <th className="px-4 py-3">Enseignant Responsable</th>
                            <th className="px-4 py-3 text-center">Crédits</th>
                            <th className="px-4 py-3 text-center">Volume</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {group.courses.map((course: any) => (
                            <tr key={course.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-4 py-3">
                                <div>
                                  <span className="font-mono font-black text-[11px] text-[#FF6B00] bg-orange-50 px-2 py-0.5 rounded border border-orange-200/60 inline-block">
                                    {course.code}
                                  </span>
                                  <p className="font-bold text-slate-900 text-xs mt-1">
                                    {course.title}
                                  </p>
                                </div>
                              </td>

                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5">
                                  <span className="px-2 py-0.5 bg-blue-50 text-blue-800 font-bold rounded text-[10px] border border-blue-200">
                                    {course.level}
                                  </span>
                                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 font-mono font-bold rounded text-[10px] border border-emerald-200">
                                    {course.semester || group.semester}
                                  </span>
                                </div>
                              </td>

                              <td className="px-4 py-3">
                                {course.teaching_unit_code ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-800 rounded-lg text-[11px] font-semibold border border-purple-200">
                                    <span className="font-mono font-bold">[{course.teaching_unit_code}]</span>
                                    <span className="truncate max-w-[150px]">{course.teaching_unit_name || ''}</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic text-[11px]">Module autonome</span>
                                )}
                              </td>

                              <td className="px-4 py-3">
                                <span className="font-medium text-slate-800">
                                  {course.teacher_name && course.teacher_name !== 'Non assigné' ? (
                                    course.teacher_name
                                  ) : (
                                    <span className="text-slate-400 italic">Non assigné</span>
                                  )}
                                </span>
                              </td>

                              <td className="px-4 py-3 text-center">
                                <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                  {course.credits}
                                </span>
                              </td>

                              <td className="px-4 py-3 text-center font-mono text-slate-600 font-semibold">
                                {course.hours}h
                              </td>

                              <td className="px-4 py-3 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  <Link
                                    href={`/admin/courses/${course.id}`}
                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Détails du module"
                                  >
                                    <Eye size={15} />
                                  </Link>
                                  <Link
                                    href={`/admin/courses/${course.id}/edit`}
                                    className="p-1.5 text-slate-400 hover:text-[#FF6B00] hover:bg-orange-50 rounded-lg transition-colors"
                                    title="Modifier le module"
                                  >
                                    <Pencil size={15} />
                                  </Link>
                                  <button
                                    onClick={() => handleDelete(course.id, course.title)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                    title="Supprimer le module"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    /* Mode Grille de Cartes de Modules */
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {group.courses.map((course: any) => (
                        <div
                          key={course.id}
                          className="bg-slate-50/70 rounded-xl p-4 border border-slate-200/80 hover:border-[#FF6B00] transition-colors space-y-2.5 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono font-black text-[11px] text-[#FF6B00] bg-white px-2 py-0.5 rounded border border-orange-200">
                                {course.code}
                              </span>
                              <div className="flex items-center gap-1">
                                <span className="px-2 py-0.2 bg-blue-100 text-blue-800 text-[10px] font-bold rounded">
                                  {course.level}
                                </span>
                                <span className="px-2 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold rounded">
                                  {course.semester || group.semester}
                                </span>
                              </div>
                            </div>

                            <h4 className="font-bold text-slate-900 text-xs mt-2 leading-snug">
                              {course.title}
                            </h4>

                            {course.teaching_unit_code && (
                              <p className="text-[10px] text-purple-700 font-medium mt-1">
                                UE : [{course.teaching_unit_code}] {course.teaching_unit_name || ''}
                              </p>
                            )}

                            <p className="text-[11px] text-slate-500 mt-1">
                              Enseignant : <b className="text-slate-700">{course.teacher_name || 'Non assigné'}</b>
                            </p>
                          </div>

                          <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-xs">
                            <span className="font-mono font-bold text-slate-700">
                              {course.credits} crédits • {course.hours}h
                            </span>

                            <div className="flex items-center gap-1">
                              <Link
                                href={`/admin/courses/${course.id}`}
                                className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-white"
                              >
                                <Eye size={14} />
                              </Link>
                              <Link
                                href={`/admin/courses/${course.id}/edit`}
                                className="p-1 rounded text-slate-400 hover:text-[#FF6B00] hover:bg-white"
                              >
                                <Pencil size={14} />
                              </Link>
                              <button
                                onClick={() => handleDelete(course.id, course.title)}
                                className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-white cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminCoursesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-[#FF6B00]" size={32} />
      </div>
    }>
      <AdminCoursesContent />
    </Suspense>
  );
}
