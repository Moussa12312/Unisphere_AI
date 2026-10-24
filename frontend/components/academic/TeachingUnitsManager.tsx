'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Layers, Plus, Edit2, Trash2, CheckCircle2, AlertCircle,
  GraduationCap, BookOpen, X, Loader2, Search, ArrowRight,
  Filter, Sparkles, BookCheck
} from 'lucide-react';
import { teachingUnitService, TeachingUnit, LMDCurriculum } from '@/services/teachingUnitService';
import { filiereService } from '@/services/filiereService';
import { courseService, Course } from '@/services/courseService';
import { useToast } from '@/components/ToastProvider';

interface TeachingUnitsManagerProps {
  userRole: string; // 'admin' | 'censeur' | 'secretary'
}

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
  const [viewMode, setViewMode] = useState<'maquette' | 'table'>('table');

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

      // Si des UEs existent dans l'université, on sélectionne intelligemment la dernière UE créée
      if (uList.length > 0) {
        const lastUnit = uList[uList.length - 1];
        if (lastUnit.filiere_id) {
          setSelectedFiliereId(lastUnit.filiere_id);
        } else {
          setSelectedFiliereId('all');
        }
        setSelectedLevel(lastUnit.level || 'all');
        setSelectedSemester(lastUnit.semester || 'all');
        // Si une filière et un niveau sont définis, on peut directement afficher la maquette
        if (lastUnit.filiere_id && lastUnit.level) {
          setViewMode('maquette');
        } else {
          setViewMode('table');
        }
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

        // Bascule automatique des filtres sur la nouvelle UE pour qu'elle s'affiche immédiatement
        if (formData.filiere_id) {
          setSelectedFiliereId(formData.filiere_id);
        }
        if (formData.level) {
          setSelectedLevel(formData.level);
        }
        if (formData.semester) {
          setSelectedSemester(formData.semester);
        }
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
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Fondamentale</span>;
      case 'Méthodologique':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">Méthodologique</span>;
      case 'Transversale':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">Transversale</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{cat}</span>;
    }
  };

  // Filtrage local supplémentaire par recherche textuelle
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

  // Filières qui contiennent au moins une UE
  const filieresWithUnits = useMemo(() => {
    const fMap = new Map<number, { filiere: any; count: number }>();
    allUnits.forEach(u => {
      if (u.filiere_id) {
        const found = filieres.find(f => f.id === u.filiere_id);
        if (found) {
          const cur = fMap.get(u.filiere_id) || { filiere: found, count: 0 };
          cur.count += 1;
          fMap.set(u.filiere_id, cur);
        }
      }
    });
    return Array.from(fMap.values());
  }, [allUnits, filieres]);

  // Nom de la filière actuellement sélectionnée
  const selectedFiliereName = useMemo(() => {
    if (selectedFiliereId === 'all') return 'Toutes les filières';
    const found = filieres.find(f => f.id === selectedFiliereId);
    return found ? found.name : 'Filière';
  }, [selectedFiliereId, filieres]);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6B00] to-amber-500 flex items-center justify-center text-white shadow-sm">
              <Layers size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">Unités d'Enseignement (UEs) & Maquette LMD</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-[#FF6B00]">
                  {allUnits.length} UE{allUnits.length > 1 ? 's' : ''} au total
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500">Organisation curriculaire conforme au système LMD (30 ECTS / semestre)</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Gestion UEs ({filteredUnits.length})
            </button>
            <button
              onClick={() => setViewMode('maquette')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                viewMode === 'maquette' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Maquette LMD
            </button>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#FF6B00] to-orange-500 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Nouvelle UE</span>
            <span className="sm:hidden">Créer</span>
          </button>
        </div>
      </div>

      {/* Barre de filtres réactive */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Sélection Filière */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Filière académique
            </label>
            <select
              value={selectedFiliereId === 'all' ? 'all' : (selectedFiliereId || '')}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedFiliereId(val === 'all' ? 'all' : Number(val));
              }}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            >
              <option value="all">
                🌟 Toutes les filières ({allUnits.length} UE{allUnits.length > 1 ? 's' : ''})
              </option>
              {filieres.map((f) => {
                const count = allUnits.filter(u => u.filiere_id === f.id).length;
                return (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.domain || 'Général'}) {count > 0 ? `• [${count} UE]` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Sélection Niveau */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Niveau d'études
            </label>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setSelectedLevel('all')}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  selectedLevel === 'all' ? 'bg-white text-[#FF6B00] shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tous
              </button>
              {levels.map((lvl) => {
                const countForLevel = allUnits.filter(u =>
                  (selectedFiliereId === 'all' || u.filiere_id === selectedFiliereId) && u.level === lvl
                ).length;
                return (
                  <button
                    key={lvl}
                    onClick={() => setSelectedLevel(lvl)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      selectedLevel === lvl ? 'bg-white text-[#FF6B00] shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {lvl}
                    {countForLevel > 0 && (
                      <span className="ml-1 text-[10px] font-bold text-[#FF6B00]">({countForLevel})</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sélection Semestre */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Semestre
            </label>
            <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto">
              <button
                onClick={() => setSelectedSemester('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                  selectedSemester === 'all' ? 'bg-white text-[#FF6B00] shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tous
              </button>
              {semesters.map((sem) => (
                <button
                  key={sem}
                  onClick={() => setSelectedSemester(sem)}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                    selectedSemester === sem ? 'bg-white text-[#FF6B00] shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {sem}
                </button>
              ))}
            </div>
          </div>

          {/* Recherche textuelle */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Rechercher une UE
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Code, titre, module..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bilan ECTS */}
        {curriculum && (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-3">
              <span className="text-slate-600 font-medium">
                Maquette annuelle ({selectedFiliereName} - {selectedLevel}) : <b className="text-slate-900">{curriculum.total_year_credits} Crédits ECTS</b>
              </span>
              {curriculum.is_valid_60_ects ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-medium">
                  <CheckCircle2 size={13} />
                  Conforme LMD (60 ECTS)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full font-medium">
                  <AlertCircle size={13} />
                  En cours de complétion ({curriculum.total_year_credits}/60 ECTS)
                </span>
              )}
            </div>
            <div className="text-slate-500">
              Total {filteredUnits.length} UE(s) affichée(s)
            </div>
          </div>
        )}
      </div>

      {/* Contenu principal */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px] bg-white rounded-2xl border border-slate-200">
          <Loader2 className="animate-spin text-[#FF6B00]" size={32} />
        </div>
      ) : filteredUnits.length === 0 ? (
        /* État vide intelligent */
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Layers size={48} className="text-amber-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">
            {allUnits.length > 0
              ? 'Aucune UE pour ces filtres'
              : 'Aucune Unité d\'Enseignement trouvée'}
          </h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            {allUnits.length > 0 ? (
              <>
                Vous avez <strong className="text-slate-800 font-semibold">{allUnits.length} Unité(s) d'Enseignement</strong> enregistrée(s) dans l'université, mais aucune ne correspond aux critères sélectionnés ({selectedFiliereName} - {selectedLevel === 'all' ? 'Tous niveaux' : selectedLevel}).
              </>
            ) : (
              'Configurez les UEs pour structurer la maquette LMD de cette filière et y rattacher les modules.'
            )}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            {allUnits.length > 0 && (
              <button
                onClick={() => {
                  setSelectedFiliereId('all');
                  setSelectedLevel('all');
                  setSelectedSemester('all');
                  setViewMode('table');
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm"
              >
                <Layers size={16} />
                Afficher toutes les UEs ({allUnits.length})
              </button>
            )}
            {filieresWithUnits.map(({ filiere, count }) => (
              <button
                key={filiere.id}
                onClick={() => {
                  setSelectedFiliereId(filiere.id);
                  const firstUnit = allUnits.find(u => u.filiere_id === filiere.id);
                  if (firstUnit?.level) setSelectedLevel(firstUnit.level);
                  setSelectedSemester('all');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-orange-50 border border-orange-200 text-[#FF6B00] rounded-xl text-sm font-semibold hover:bg-orange-100 transition-colors"
              >
                <span>Voir {filiere.name}</span>
                <span className="text-xs bg-[#FF6B00] text-white px-1.5 py-0.2 rounded-full font-bold">{count}</span>
              </button>
            ))}
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF6B00] text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors"
            >
              <Plus size={16} />
              {allUnits.length > 0 ? 'Créer une UE dans cette filière' : 'Créer la première UE'}
            </button>
          </div>
        </div>
      ) : viewMode === 'maquette' ? (
        /* Vue Maquette LMD */
        selectedFiliereId === 'all' || selectedLevel === 'all' ? (
          /* Conseil de sélection de filière pour la maquette */
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-5 text-center">
            <div className="w-14 h-14 bg-orange-100 text-[#FF6B00] rounded-2xl flex items-center justify-center mx-auto">
              <GraduationCap size={30} />
            </div>
            <div className="max-w-lg mx-auto">
              <h2 className="text-lg font-bold text-slate-900">Maquette LMD Semestrielle (30 ECTS / semestre)</h2>
              <p className="text-sm text-slate-500 mt-1">
                La maquette LMD officielle est calculée par filière et par niveau d'études. Veuillez sélectionner une filière et un niveau précis ci-dessous pour voir le découpage semestriel.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {filieresWithUnits.map(({ filiere, count }) => (
                <button
                  key={filiere.id}
                  onClick={() => {
                    setSelectedFiliereId(filiere.id);
                    const firstUnit = allUnits.find(u => u.filiere_id === filiere.id);
                    if (firstUnit?.level) setSelectedLevel(firstUnit.level);
                  }}
                  className="px-4 py-2 bg-slate-50 border border-slate-200 hover:border-[#FF6B00] text-slate-800 rounded-xl text-sm font-medium hover:bg-orange-50 transition-all flex items-center gap-2"
                >
                  <Layers size={16} className="text-[#FF6B00]" />
                  <span>{filiere.name}</span>
                  <span className="text-xs bg-slate-200 text-slate-800 px-2 py-0.5 rounded-full font-bold">{count} UE</span>
                </button>
              ))}
              <button
                onClick={() => setViewMode('table')}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors"
              >
                Voir en vue Gestion UEs (Tableau complet)
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {(() => {
              const rawSemesters = curriculum?.semesters;
              const semesterList: [string, any][] = Array.isArray(rawSemesters)
                ? rawSemesters.map((s: any) => [s.semester || 'S1', s])
                : Object.entries(rawSemesters || {});

              if (semesterList.length === 0) {
                return (
                  <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
                    Aucune maquette disponible pour cette sélection.
                  </div>
                );
              }

              return semesterList.map(([semKey, semData]) => {
                const semUnits: any[] = semData?.units || semData?.teaching_units || [];
                const totalCredits = semData?.total_credits || 0;
                const isValid30 = semData?.is_valid_30_ects ?? (totalCredits === 30);

                return (
                  <div key={semKey} className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-3">
                        <div className="px-3 py-1 bg-[#0A1628] text-white font-bold rounded-lg text-sm">
                          {semKey}
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">
                          Semestre {semKey.replace('S', '')} — {selectedLevel}
                        </h2>
                      </div>
                      <div className="flex items-center gap-2 text-xs sm:text-sm">
                        <span className="font-semibold text-slate-700">
                          Volume : {totalCredits} / 30 ECTS
                        </span>
                        {isValid30 ? (
                          <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-semibold">
                            Complet (30 ECTS)
                          </span>
                        ) : (
                          <span className="text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-semibold">
                            {30 - totalCredits} ECTS manquants
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {semUnits.map((unit) => {
                        const coursesList: any[] = unit?.courses || [];
                        return (
                          <div
                            key={unit.id}
                            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <span className="font-mono text-xs font-bold text-[#FF6B00] bg-orange-50 px-2.5 py-1 rounded-lg">
                                  {unit.code}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  {getCategoryBadge(unit.category)}
                                  <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-slate-900 text-white">
                                    {unit.credits} ECTS
                                  </span>
                                </div>
                              </div>

                              <h3 className="font-bold text-slate-900 text-base mb-2">{unit.name}</h3>
                              {unit.description && (
                                <p className="text-xs text-slate-500 line-clamp-2 mb-3">{unit.description}</p>
                              )}

                              {/* Éléments constitutifs (ECUEs) */}
                              <div className="mt-3 pt-3 border-t border-slate-100">
                                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                  <span>Modules ({coursesList.length})</span>
                                  <span>Coeff / Heures</span>
                                </div>

                                {coursesList.length === 0 ? (
                                  <p className="text-xs text-slate-400 italic py-1">Aucun module rattaché</p>
                                ) : (
                                  <div className="space-y-1.5">
                                    {coursesList.map((course) => (
                                      <div
                                        key={course.id}
                                        className="flex items-center justify-between text-xs p-1.5 bg-slate-50 rounded-lg"
                                      >
                                        <span className="font-medium text-slate-800 truncate pr-2">
                                          {course.title}
                                        </span>
                                        <div className="flex items-center gap-2 text-slate-500 whitespace-nowrap">
                                          <span className="font-mono font-semibold text-[#FF6B00]">{course.credits} cr</span>
                                          {course.hours > 0 && <span>• {course.hours}h</span>}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenEditModal(unit)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Modifier l'UE"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(unit.id)}
                                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Supprimer l'UE"
                              >
                                <Trash2 size={16} />
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
        /* Vue Tableau & Gestion complète */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Code UE</th>
                  <th className="px-4 py-3 font-semibold">Intitulé</th>
                  <th className="px-4 py-3 font-semibold">Filière / Niveau</th>
                  <th className="px-4 py-3 font-semibold">Catégorie</th>
                  <th className="px-4 py-3 font-semibold">Semestre</th>
                  <th className="px-4 py-3 font-semibold">Crédits ECTS</th>
                  <th className="px-4 py-3 font-semibold">Modules rattachés</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUnits.map((unit) => (
                  <tr key={unit.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-[#FF6B00]">{unit.code}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{unit.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-800">{unit.filiere_name || 'Tronc commun'}</span>
                        <span className="text-xs text-slate-500 font-mono font-semibold">{unit.level}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{getCategoryBadge(unit.category)}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-bold text-xs">
                        {unit.semester}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900">{unit.credits} ECTS</td>
                    <td className="px-4 py-3 text-slate-600">
                      {(unit.courses && unit.courses.length > 0) ? (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {unit.courses.map(c => (
                            <span key={c.id} className="px-2 py-0.5 bg-orange-50 text-orange-800 rounded text-xs font-medium">
                              {c.title} ({c.credits} cr)
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">0 module</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEditModal(unit)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Modifier l'UE"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(unit.id)}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer l'UE"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Création / Édition */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Layers size={20} className="text-[#FF6B00]" />
                {editingUnit ? 'Modifier l\'Unité d\'Enseignement' : 'Nouvelle Unité d\'Enseignement (UE)'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Code UE *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: UE-INFO101"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Crédits ECTS *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={30}
                    value={formData.credits}
                    onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) || 6 })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Intitulé de l'UE *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Logistique et gestion de flux"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Catégorie LMD</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Semestre</label>
                  <select
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  >
                    {semesters.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Niveau</label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  >
                    {levels.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Filière</label>
                <select
                  value={formData.filiere_id || ''}
                  onChange={(e) => setFormData({ ...formData, filiere_id: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  <option value="">Tronc commun (toutes filières)</option>
                  {filieres.map((f) => (
                    <option key={f.id} value={f.id}>{f.name} ({f.domain || 'Général'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description (Optionnelle)</label>
                <textarea
                  rows={2}
                  placeholder="Objectifs pédagogiques, compétences visées..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>

              {/* Sélection des Modules (ECUE) rattachés */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Modules (ECUE) rattachés à cette UE
                  </label>
                  <span className="text-xs text-slate-500">
                    {formData.selected_course_ids.length} sélectionnée(s)
                  </span>
                </div>
                <div className="border border-slate-200 rounded-xl p-3 max-h-44 overflow-y-auto space-y-1.5 bg-slate-50">
                  {courses.length === 0 ? (
                    <p className="text-xs text-slate-400">Aucun module disponible dans la base</p>
                  ) : (
                    courses.map((course) => {
                      const isChecked = formData.selected_course_ids.includes(course.id);
                      const isSameFiliere = formData.filiere_id ? course.filiere_id === formData.filiere_id : true;
                      return (
                        <label
                          key={course.id}
                          className={`flex items-center gap-2 p-1.5 hover:bg-white rounded-lg cursor-pointer text-xs transition-colors ${
                            isSameFiliere ? 'bg-orange-50/50' : ''
                          }`}
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
                          <span className="text-slate-600 truncate">{course.title}</span>
                          {course.level && (
                            <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded text-[10px] font-bold">
                              {course.level}
                            </span>
                          )}
                          <span className="ml-auto text-slate-500 font-mono font-medium">{course.credits || 3} cr</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 bg-[#FF6B00] hover:bg-orange-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
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
