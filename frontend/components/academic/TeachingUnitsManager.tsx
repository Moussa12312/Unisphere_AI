'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Layers, Plus, Edit2, Trash2, CheckCircle2, AlertCircle,
  GraduationCap, BookOpen, X, Loader2, Search, ArrowRight,
  Filter, Sparkles, ChevronLeft, ChevronRight, RotateCcw
} from 'lucide-react';
import { teachingUnitService, TeachingUnit, LMDCurriculum } from '@/services/teachingUnitService';
import { filiereService } from '@/services/filiereService';
import { courseService, Course } from '@/services/courseService';
import { useToast } from '@/components/ToastProvider';

interface TeachingUnitsManagerProps {
  userRole: string; // 'admin' | 'censeur' | 'secretary'
}

const ITEMS_PER_PAGE = 10;

export default function TeachingUnitsManager({ userRole }: TeachingUnitsManagerProps) {
  const toast = useToast();

  const [units, setUnits] = useState<TeachingUnit[]>([]);
  const [allUnits, setAllUnits] = useState<TeachingUnit[]>([]);
  const [filieres, setFilieres] = useState<any[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [curriculum, setCurriculum] = useState<LMDCurriculum | null>(null);
  const [loading, setLoading] = useState(true);

  // Filtres
  const [selectedFiliereId, setSelectedFiliereId] = useState<number | 'all'>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedSemester, setSelectedSemester] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'maquette'>('table');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<TeachingUnit | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    credits: 6,
    category: 'Fondamentale',
    semester: 'S1',
    level: 'L1',
    description: '',
    filiere_id: 0,
    selected_course_ids: [] as number[]
  });

  const levels = ['L1', 'L2', 'L3', 'M1', 'M2'];
  const semesters = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'];
  const categories = ['Fondamentale', 'Méthodologique', 'Transversale', 'Découverte'];

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadUnitsAndCurriculum();
    setCurrentPage(1);
  }, [selectedFiliereId, selectedLevel, selectedSemester]);

  const loadInitialData = async () => {
    try {
      const [fData, cData, initialUnits] = await Promise.all([
        filiereService.getAll(),
        courseService.getAll(),
        teachingUnitService.getAll()
      ]);
      setFilieres(fData || []);
      setCourses(cData || []);
      const uList = initialUnits || [];
      setAllUnits(uList);

      if (uList.length > 0) {
        const lastUnit = uList[uList.length - 1];
        if (lastUnit.filiere_id) {
          setSelectedFiliereId(lastUnit.filiere_id);
        } else {
          setSelectedFiliereId('all');
        }
        setSelectedLevel(lastUnit.level || 'all');
        setSelectedSemester(lastUnit.semester || 'all');
        setViewMode(lastUnit.filiere_id && lastUnit.level ? 'maquette' : 'table');
      } else if (fData && fData.length > 0) {
        setSelectedFiliereId(fData[0].id);
        setSelectedLevel('L1');
        setViewMode('maquette');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors du chargement des données académiques');
    }
  };

  const loadUnitsAndCurriculum = async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (selectedFiliereId !== 'all' && selectedFiliereId !== null) {
        filters.filiere_id = selectedFiliereId;
      }
      if (selectedLevel !== 'all') {
        filters.level = selectedLevel;
      }
      if (selectedSemester !== 'all') {
        filters.semester = selectedSemester;
      }

      const isSpecificFiliereAndLevel = selectedFiliereId !== 'all' && selectedFiliereId !== null && selectedLevel !== 'all';

      const [unitsData, curData, totalUnits] = await Promise.all([
        teachingUnitService.getAll(filters),
        isSpecificFiliereAndLevel ? teachingUnitService.getCurriculum(Number(selectedFiliereId), selectedLevel) : null,
        teachingUnitService.getAll()
      ]);

      setUnits(unitsData || []);
      setCurriculum(curData);
      setAllUnits(totalUnits || []);
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors du chargement des UEs');
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSelectedFiliereId('all');
    setSelectedLevel('all');
    setSelectedSemester('all');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const handleOpenCreateModal = () => {
    setEditingUnit(null);
    const defaultFiliereId = selectedFiliereId !== 'all' && selectedFiliereId !== null
      ? Number(selectedFiliereId)
      : (filieres[0]?.id || 0);

    const defaultLevel = selectedLevel !== 'all' ? selectedLevel : 'L1';
    const defaultSemester = selectedSemester !== 'all' ? selectedSemester : 'S1';

    setFormData({
      code: '',
      name: '',
      credits: 6,
      category: 'Fondamentale',
      semester: defaultSemester,
      level: defaultLevel,
      description: '',
      filiere_id: defaultFiliereId,
      selected_course_ids: []
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (unit: TeachingUnit) => {
    setEditingUnit(unit);
    setFormData({
      code: unit.code,
      name: unit.name,
      credits: unit.credits,
      category: unit.category,
      semester: unit.semester,
      level: unit.level,
      description: unit.description || '',
      filiere_id: unit.filiere_id || 0,
      selected_course_ids: unit.courses ? unit.courses.map(c => c.id) : []
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.name) {
      toast.error('Le code et le nom sont requis');
      return;
    }

    setSaving(true);
    try {
      if (editingUnit) {
        await teachingUnitService.update(editingUnit.id, {
          code: formData.code,
          name: formData.name,
          credits: formData.credits,
          category: formData.category as any,
          semester: formData.semester,
          level: formData.level,
          description: formData.description,
          filiere_id: formData.filiere_id || undefined,
          course_ids: formData.selected_course_ids
        });
        toast.success('Unité d\'Enseignement mise à jour avec succès');
      } else {
        await teachingUnitService.create({
          code: formData.code,
          name: formData.name,
          credits: formData.credits,
          category: formData.category,
          semester: formData.semester,
          level: formData.level,
          description: formData.description,
          filiere_id: formData.filiere_id || undefined,
          course_ids: formData.selected_course_ids
        });
        toast.success('Unité d\'Enseignement créée avec succès');

        if (formData.filiere_id) setSelectedFiliereId(formData.filiere_id);
        if (formData.level) setSelectedLevel(formData.level);
        if (formData.semester) setSelectedSemester(formData.semester);
      }
      setIsModalOpen(false);
      loadUnitsAndCurriculum();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette Unité d\'Enseignement ?')) return;
    try {
      await teachingUnitService.delete(id);
      toast.success('UE supprimée');
      loadUnitsAndCurriculum();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la suppression');
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'Fondamentale':
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">Fondamentale</span>;
      case 'Méthodologique':
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/60">Méthodologique</span>;
      case 'Transversale':
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">Transversale</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700">{cat}</span>;
    }
  };

  // Filtrage local par recherche
  const filteredUnits = useMemo(() => {
    if (!searchQuery.trim()) return units;
    const q = searchQuery.toLowerCase();
    return units.filter(u =>
      u.code.toLowerCase().includes(q) ||
      u.name.toLowerCase().includes(q) ||
      (u.filiere_name && u.filiere_name.toLowerCase().includes(q)) ||
      (u.courses && u.courses.some(c => c.title.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)))
    );
  }, [units, searchQuery]);

  // Pagination pour le tableau
  const totalPages = Math.max(1, Math.ceil(filteredUnits.length / ITEMS_PER_PAGE));
  const paginatedUnits = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredUnits.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredUnits, currentPage]);

  const selectedFiliereName = useMemo(() => {
    if (selectedFiliereId === 'all') return 'Toutes les filières';
    const found = filieres.find(f => f.id === selectedFiliereId);
    return found ? found.name : 'Filière';
  }, [selectedFiliereId, filieres]);

  const hasActiveFilters = selectedFiliereId !== 'all' || selectedLevel !== 'all' || selectedSemester !== 'all' || searchQuery.trim() !== '';

  return (
    <div className="space-y-5">
      {/* En-tête simplifié et aéré */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FF6B00] to-amber-500 flex items-center justify-center text-white shadow-sm flex-shrink-0">
            <Layers size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900">Unités d'Enseignement (UEs)</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-[#FF6B00]">
                {allUnits.length} UE{allUnits.length > 1 ? 's' : ''} au catalogue
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Gestion curriculaire et maquettes semestrielles ECTS (Système LMD)</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Vue Liste ({filteredUnits.length})
            </button>
            <button
              onClick={() => setViewMode('maquette')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                viewMode === 'maquette' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Maquette LMD
            </button>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#FF6B00] hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
          >
            <Plus size={16} />
            <span>Nouvelle UE</span>
          </button>
        </div>
      </div>

      {/* Barre de filtres épurée et compacte */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Filière */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Filière
            </label>
            <select
              value={selectedFiliereId === 'all' ? 'all' : (selectedFiliereId || '')}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedFiliereId(val === 'all' ? 'all' : Number(val));
              }}
              className="w-full px-3 py-2 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#FF6B00] transition-colors"
            >
              <option value="all">Toutes les filières ({allUnits.length} UEs)</option>
              {filieres.map((f) => {
                const count = allUnits.filter(u => u.filiere_id === f.id).length;
                return (
                  <option key={f.id} value={f.id}>
                    {f.name} {count > 0 ? `(${count} UE)` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Niveau */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Niveau
            </label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#FF6B00] transition-colors"
            >
              <option value="all">Tous les niveaux (L1 à M2)</option>
              {levels.map((lvl) => {
                const count = allUnits.filter(u =>
                  (selectedFiliereId === 'all' || u.filiere_id === selectedFiliereId) && u.level === lvl
                ).length;
                return (
                  <option key={lvl} value={lvl}>
                    {lvl} {count > 0 ? `(${count} UEs)` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Semestre */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Semestre
            </label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#FF6B00] transition-colors"
            >
              <option value="all">Tous semestres (S1 à S6)</option>
              {semesters.map((sem) => (
                <option key={sem} value={sem}>{sem}</option>
              ))}
            </select>
          </div>

          {/* Recherche */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Recherche
              </label>
              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="text-[11px] text-[#FF6B00] hover:underline flex items-center gap-1 font-semibold"
                >
                  <RotateCcw size={10} /> Réinitialiser
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="Code, intitulé, module..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-2 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#FF6B00] transition-colors"
              />
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bilan ECTS compact */}
        {curriculum && (
          <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-600">
                Maquette ({selectedFiliereName} - {selectedLevel}) : <strong className="text-slate-900 font-bold">{curriculum.total_year_credits} Crédits ECTS</strong>
              </span>
              {curriculum.is_valid_60_ects ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                  <CheckCircle2 size={11} /> 60 ECTS Conforme LMD
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                  <AlertCircle size={11} /> {curriculum.total_year_credits}/60 ECTS
                </span>
              )}
            </div>
            <div className="text-slate-500 text-[11px]">
              {filteredUnits.length} UE(s) filtrée(s)
            </div>
          </div>
        )}
      </div>

      {/* Contenu principal */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[260px] bg-white rounded-2xl border border-slate-200/80">
          <Loader2 className="animate-spin text-[#FF6B00]" size={28} />
        </div>
      ) : filteredUnits.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-10 text-center">
          <Layers size={40} className="text-amber-500 mx-auto mb-2.5 opacity-80" />
          <h3 className="text-base font-bold text-slate-800">
            {allUnits.length > 0 ? 'Aucune UE pour ces critères' : 'Aucune Unité d\'Enseignement configurée'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {allUnits.length > 0
              ? 'Modifiez les filtres ou réinitialisez la sélection pour afficher les autres UEs.'
              : 'Commencez par créer une UE pour structurer la maquette LMD de votre établissement.'}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
              >
                <RotateCcw size={12} /> Voir toutes les UEs ({allUnits.length})
              </button>
            )}
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#FF6B00] text-white rounded-xl text-xs font-bold hover:bg-orange-600 transition-colors"
            >
              <Plus size={13} /> Créer une UE
            </button>
          </div>
        </div>
      ) : viewMode === 'maquette' ? (
        /* Vue Maquette LMD épurée */
        selectedFiliereId === 'all' || selectedLevel === 'all' ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs text-center space-y-4">
            <div className="w-12 h-12 bg-orange-50 text-[#FF6B00] rounded-2xl flex items-center justify-center mx-auto">
              <GraduationCap size={24} />
            </div>
            <div className="max-w-md mx-auto">
              <h2 className="text-base font-bold text-slate-900">Maquette LMD Semestrielle</h2>
              <p className="text-xs text-slate-500 mt-1">
                Sélectionnez une filière et un niveau spécifique dans la barre de filtres ci-dessus pour inspecter le découpage semestriel officiel (30 ECTS par semestre).
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-1">
              <button
                onClick={() => setViewMode('table')}
                className="px-3.5 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
              >
                Passer en Vue Liste complète
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {(() => {
              const rawSemesters = curriculum?.semesters;
              const semesterList: [string, any][] = Array.isArray(rawSemesters)
                ? rawSemesters.map((s: any) => [s.semester || 'S1', s])
                : Object.entries(rawSemesters || {});

              if (semesterList.length === 0) {
                return (
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-slate-500 text-xs">
                    Aucune maquette disponible pour cette sélection.
                  </div>
                );
              }

              return semesterList.map(([semKey, semData]) => {
                const semUnits: any[] = semData?.units || semData?.teaching_units || [];
                const totalCredits = semData?.total_credits || 0;
                const isValid30 = semData?.is_valid_30_ects ?? (totalCredits === 30);

                return (
                  <div key={semKey} className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2.5 py-1 bg-[#0A1628] text-white font-bold rounded-lg text-xs">
                          {semKey}
                        </span>
                        <h2 className="text-base font-bold text-slate-900">
                          Semestre {semKey.replace('S', '')} — {selectedLevel}
                        </h2>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-medium text-slate-600">
                          Volume : <b className="text-slate-900">{totalCredits} / 30 ECTS</b>
                        </span>
                        {isValid30 ? (
                          <span className="text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                            ✓ 30 ECTS Complet
                          </span>
                        ) : (
                          <span className="text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                            {30 - totalCredits} ECTS manquants
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {semUnits.map((unit) => {
                        const coursesList: any[] = unit?.courses || [];
                        return (
                          <div
                            key={unit.id}
                            className="bg-slate-50/70 hover:bg-slate-50 rounded-xl border border-slate-200/80 p-3.5 transition-all flex flex-col justify-between hover:shadow-xs"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2 mb-1.5">
                                <span className="font-mono text-xs font-bold text-[#FF6B00] bg-white border border-orange-200/60 px-2 py-0.5 rounded-md">
                                  {unit.code}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  {getCategoryBadge(unit.category)}
                                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-900 text-white">
                                    {unit.credits} ECTS
                                  </span>
                                </div>
                              </div>

                              <h3 className="font-bold text-slate-900 text-sm line-clamp-1 mb-1" title={unit.name}>
                                {unit.name}
                              </h3>
                              {unit.description && (
                                <p className="text-xs text-slate-500 line-clamp-1 mb-2">{unit.description}</p>
                              )}

                              {/* Modules rattachés (compact) */}
                              <div className="mt-2 pt-2 border-t border-slate-200/60">
                                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                                  <span className="font-semibold">Modules ({coursesList.length})</span>
                                </div>

                                {coursesList.length === 0 ? (
                                  <p className="text-[11px] text-slate-400 italic">0 module rattaché</p>
                                ) : (
                                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                                    {coursesList.map((course) => (
                                      <span
                                        key={course.id}
                                        className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-700"
                                      >
                                        <span className="font-medium truncate max-w-[130px]">{course.title}</span>
                                        <b className="text-[#FF6B00] font-mono text-[10px]">{course.credits}cr</b>
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditModal(unit)}
                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-white rounded-md transition-colors"
                                title="Modifier"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDelete(unit.id)}
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-white rounded-md transition-colors"
                                title="Supprimer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )
      ) : (
        /* Vue Liste / Tableau allégé avec pagination */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200/80 uppercase font-semibold text-[11px] tracking-wider">
                <tr>
                  <th className="px-3.5 py-3">Code UE</th>
                  <th className="px-3.5 py-3">Intitulé</th>
                  <th className="px-3.5 py-3">Filière / Niveau</th>
                  <th className="px-3.5 py-3">Catégorie</th>
                  <th className="px-3.5 py-3">Semestre</th>
                  <th className="px-3.5 py-3">ECTS</th>
                  <th className="px-3.5 py-3">Modules ({filteredUnits.reduce((acc, u) => acc + (u.courses?.length || 0), 0)})</th>
                  <th className="px-3.5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedUnits.map((unit) => (
                  <tr key={unit.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-3.5 py-2.5 font-mono font-bold text-[#FF6B00]">{unit.code}</td>
                    <td className="px-3.5 py-2.5 font-semibold text-slate-900 max-w-xs truncate">{unit.name}</td>
                    <td className="px-3.5 py-2.5">
                      <span className="font-medium text-slate-800">{unit.filiere_name || 'Tronc commun'}</span>
                      <span className="ml-1.5 px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded font-mono font-bold text-[10px]">
                        {unit.level}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5">{getCategoryBadge(unit.category)}</td>
                    <td className="px-3.5 py-2.5">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-bold text-[11px]">
                        {unit.semester}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 font-bold text-slate-900">{unit.credits} ECTS</td>
                    <td className="px-3.5 py-2.5 text-slate-600">
                      {(unit.courses && unit.courses.length > 0) ? (
                        <div className="flex items-center gap-1">
                          <span className="px-2 py-0.5 bg-orange-50 border border-orange-200/60 text-[#FF6B00] rounded font-semibold text-[11px]">
                            {unit.courses.length} module{unit.courses.length > 1 ? 's' : ''}
                          </span>
                          <span className="text-slate-400 text-[11px] truncate max-w-[140px]" title={unit.courses.map(c => c.title).join(', ')}>
                            ({unit.courses[0]?.title}{unit.courses.length > 1 ? '...' : ''})
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">0 module</span>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEditModal(unit)}
                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Modifier"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(unit.id)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination intégrée */}
          <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-slate-600">
            <div>
              Affichage de <b className="text-slate-900">{Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredUnits.length)}</b> à <b className="text-slate-900">{Math.min(currentPage * ITEMS_PER_PAGE, filteredUnits.length)}</b> sur <b className="text-slate-900">{filteredUnits.length}</b> UE(s)
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Page précédente"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="px-2.5 py-1 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg">
                  Page {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Page suivante"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Création / Édition */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers size={18} className="text-[#FF6B00]" />
                {editingUnit ? 'Modifier l\'Unité d\'Enseignement' : 'Nouvelle Unité d\'Enseignement (UE)'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Code UE *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: UE-INFO101"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Crédits ECTS *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={30}
                    value={formData.credits}
                    onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) || 6 })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Intitulé de l'UE *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Algorithmique et Structures de Données"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Catégorie LMD</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-2.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Semestre</label>
                  <select
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                    className="w-full px-2.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  >
                    {semesters.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Niveau</label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    className="w-full px-2.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  >
                    {levels.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Filière</label>
                <select
                  value={formData.filiere_id || ''}
                  onChange={(e) => setFormData({ ...formData, filiere_id: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  <option value="">Tronc commun (toutes filières)</option>
                  {filieres.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description (Optionnelle)</label>
                <textarea
                  rows={2}
                  placeholder="Objectifs d'apprentissage et compétences..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>

              {/* Sélection des Modules (ECUE) rattachés */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">
                    Modules (ECUE) rattachés à cette UE
                  </label>
                  <span className="text-slate-500 font-medium">
                    {formData.selected_course_ids.length} sélectionné(s)
                  </span>
                </div>
                <div className="border border-slate-200 rounded-xl p-2.5 max-h-40 overflow-y-auto space-y-1 bg-slate-50">
                  {courses.length === 0 ? (
                    <p className="text-slate-400 italic">Aucun module disponible dans la base</p>
                  ) : (
                    courses.map((course) => {
                      const isChecked = formData.selected_course_ids.includes(course.id);
                      return (
                        <label
                          key={course.id}
                          className="flex items-center gap-2 p-1.5 hover:bg-white rounded-lg cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  selected_course_ids: [...formData.selected_course_ids, course.id]
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  selected_course_ids: formData.selected_course_ids.filter(id => id !== course.id)
                                });
                              }
                            }}
                            className="rounded border-slate-300 text-[#FF6B00] focus:ring-[#FF6B00]"
                          />
                          <span className="font-semibold text-slate-800 font-mono">{course.code}</span>
                          <span className="text-slate-600 truncate flex-1">{course.title}</span>
                          <span className="text-slate-400 font-mono">{course.credits || 3} cr</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-[#FF6B00] hover:bg-orange-600 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                >
                  {saving && <Loader2 size={13} className="animate-spin" />}
                  {editingUnit ? 'Mettre à jour' : 'Créer l\'UE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
