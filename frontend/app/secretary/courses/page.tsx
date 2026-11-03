'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import {
  BookOpen, Plus, Search, Edit3, Trash2, Eye,
  Users, Award, Loader2, X, Save,
  History, GraduationCap, Layers, ArrowLeft,
  Clock, ChevronRight, LayoutGrid, List
} from 'lucide-react';
import { courseService, Course, CourseHistory } from '@/services/courseService';
import { teacherService } from '@/services/teacherService';
import { filiereService } from '@/services/filiereService';
import { teachingUnitService, TeachingUnit } from '@/services/teachingUnitService';
import { getApiErrorMessage } from '@/lib/errorHandler';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/hooks/useConfirm';

const standardSemesters = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10'];

function SecretaryCoursesContent() {
  const toast = useToast();
  const { confirm } = useConfirm();

  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [filieres, setFilieres] = useState<any[]>([]);
  const [teachingUnits, setTeachingUnits] = useState<TeachingUnit[]>([]);
  const [loading, setLoading] = useState(true);

  // Vue par filière (null = grille des cartes, number = filière sélectionnée)
  const [selectedFiliereId, setSelectedFiliereId] = useState<number | 'all' | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [viewStyle, setViewStyle] = useState<'table' | 'grid'>('table');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [history, setHistory] = useState<CourseHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    domain: '',
    filiere_id: '',
    level: '',
    semester: 'S1',
    teaching_unit_id: '',
    teacher_id: '',
    credits: 3,
    hours: 20,
  });
  const [saving, setSaving] = useState(false);

  const hoursOptions = [
    { value: 10, label: '10 heures' },
    { value: 15, label: '15 heures' },
    { value: 20, label: '20 heures' },
    { value: 25, label: '25 heures' },
    { value: 30, label: '30 heures' },
    { value: 35, label: '35 heures' },
    { value: 40, label: '40 heures' },
    { value: 45, label: '45 heures' },
    { value: 50, label: '50 heures' },
    { value: 60, label: '60 heures' },
  ];

  const allSemesters = [
    { id: 'S1', name: 'Semestre 1 (S1)', level: 'L1' },
    { id: 'S2', name: 'Semestre 2 (S2)', level: 'L1' },
    { id: 'S3', name: 'Semestre 3 (S3)', level: 'L2' },
    { id: 'S4', name: 'Semestre 4 (S4)', level: 'L2' },
    { id: 'S5', name: 'Semestre 5 (S5)', level: 'L3' },
    { id: 'S6', name: 'Semestre 6 (S6)', level: 'L3' },
    { id: 'S7', name: 'Semestre 7 (S7)', level: 'M1' },
    { id: 'S8', name: 'Semestre 8 (S8)', level: 'M1' },
    { id: 'S9', name: 'Semestre 9 (S9)', level: 'M2' },
    { id: 'S10', name: 'Semestre 10 (S10)', level: 'M2' },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [coursesData, teachersData, filieresData, unitsData] = await Promise.all([
        courseService.getAll(),
        teacherService.getAll(),
        filiereService.getAll(),
        teachingUnitService.getAll().catch(() => [])
      ]);
      setCourses(coursesData);
      setTeachers(teachersData);
      setFilieres(filieresData);
      setTeachingUnits(unitsData);
    } catch (error) {
      toast.error('Erreur lors du chargement des modules');
    } finally {
      setLoading(false);
    }
  };

  const currentFiliere = useMemo(() => {
    if (!selectedFiliereId || selectedFiliereId === 'all') return null;
    return filieres.find(f => f.id === selectedFiliereId) || null;
  }, [filieres, selectedFiliereId]);

  const domains = useMemo(() => {
    return [...new Set(filieres.map(f => f.domain))].filter(Boolean).sort();
  }, [filieres]);

  const filieresOfDomain = useMemo(() => {
    return formData.domain ? filieres.filter(f => f.domain === formData.domain) : filieres;
  }, [filieres, formData.domain]);

  const selectedFiliereObj = useMemo(() => {
    return filieres.find(f => f.id === parseInt(formData.filiere_id));
  }, [filieres, formData.filiere_id]);

  const levelsOfFiliere = useMemo(() => {
    return selectedFiliereObj?.levels?.split(',').map((l: string) => l.trim()) || ['L1', 'L2', 'L3', 'M1', 'M2'];
  }, [selectedFiliereObj]);

  const teachersOfFiliere = useMemo(() => {
    return formData.filiere_id
      ? teachers.filter(t => !t.filiere_id || t.filiere_id === parseInt(formData.filiere_id))
      : teachers;
  }, [teachers, formData.filiere_id]);

  const filteredTeachingUnits = useMemo(() => {
    if (!formData.filiere_id) return teachingUnits;
    return teachingUnits.filter(u => !u.filiere_id || u.filiere_id === parseInt(formData.filiere_id));
  }, [teachingUnits, formData.filiere_id]);

  // Modules visibles selon filière, semestre, niveau et recherche
  const visibleCourses = useMemo(() => {
    return courses.filter((c: any) => {
      if (selectedFiliereId !== null && selectedFiliereId !== 'all') {
        const matchesF =
          (c.filiere_id && c.filiere_id === selectedFiliereId) ||
          (currentFiliere && (c.department === currentFiliere.name || c.filiere_name === currentFiliere.name));
        if (!matchesF) return false;
      }

      if (selectedSemester !== 'all') {
        if ((c.semester || '').toUpperCase().trim() !== selectedSemester.toUpperCase().trim()) return false;
      }

      if (selectedLevel !== 'all') {
        if (c.level?.toLowerCase() !== selectedLevel.toLowerCase()) return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesQ =
          c.title?.toLowerCase().includes(q) ||
          c.code?.toLowerCase().includes(q) ||
          c.teacher_name?.toLowerCase().includes(q) ||
          c.teaching_unit_code?.toLowerCase().includes(q) ||
          c.teaching_unit_name?.toLowerCase().includes(q);
        if (!matchesQ) return false;
      }

      return true;
    });
  }, [courses, selectedFiliereId, currentFiliere, selectedSemester, selectedLevel, search]);

  // Semestres présents
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

    return standardSemesters.filter(s => sems.has(s)).concat(
      Array.from(sems).filter(s => !standardSemesters.includes(s))
    );
  }, [courses, selectedFiliereId, currentFiliere]);

  // Groupés par semestre
  const coursesGroupedBySemester = useMemo(() => {
    const groups: { [semester: string]: Course[] } = {};
    visibleCourses.forEach(c => {
      const semKey = c.semester ? c.semester.toUpperCase().trim() : 'Sans Semestre';
      if (!groups[semKey]) groups[semKey] = [];
      groups[semKey].push(c);
    });

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

  const resetForm = () => {
    setFormData({
      title: '',
      domain: currentFiliere?.domain || '',
      filiere_id: currentFiliere ? String(currentFiliere.id) : '',
      level: '',
      semester: selectedSemester !== 'all' ? selectedSemester : 'S1',
      teaching_unit_id: '',
      teacher_id: '',
      credits: 3,
      hours: 20,
    });
    setSelectedCourse(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openEditModal = (course: Course) => {
    const filiere = filieres.find(f => f.id === course.filiere_id);
    setSelectedCourse(course);
    setFormData({
      title: course.title,
      domain: filiere?.domain || '',
      filiere_id: course.filiere_id?.toString() || '',
      level: course.level,
      semester: course.semester || 'S1',
      teaching_unit_id: course.teaching_unit_id?.toString() || '',
      teacher_id: course.teacher_id?.toString() || '',
      credits: course.credits || 3,
      hours: course.hours || 20,
    });
    setShowEditModal(true);
  };

  const openHistoryModal = async (course: Course) => {
    setSelectedCourse(course);
    setShowHistoryModal(true);
    setLoadingHistory(true);
    try {
      const historyData = await courseService.getHistory(course.id);
      setHistory(historyData);
    } catch (error) {
      toast.error("Erreur lors du chargement de l'historique");
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.title.trim()) {
      toast.error('Veuillez renseigner le titre du module');
      return;
    }
    if (!formData.semester) {
      toast.error('Veuillez sélectionner le semestre concerné');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: formData.title.trim(),
        filiere_id: formData.filiere_id ? parseInt(formData.filiere_id) : null,
        level: formData.level || 'L1',
        semester: formData.semester,
        teaching_unit_id: formData.teaching_unit_id ? parseInt(formData.teaching_unit_id) : null,
        teacher_id: formData.teacher_id ? parseInt(formData.teacher_id) : null,
        credits: formData.credits,
        hours: formData.hours,
      };

      await courseService.create(payload);
      toast.success('Module créé et intégré au catalogue avec succès !');
      setShowCreateModal(false);
      resetForm();
      loadData();
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, 'Erreur lors de la création'));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedCourse) return;
    if (!formData.title.trim()) {
      toast.error('Veuillez renseigner le titre du module');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: formData.title.trim(),
        filiere_id: formData.filiere_id ? parseInt(formData.filiere_id) : null,
        level: formData.level,
        semester: formData.semester || null,
        teaching_unit_id: formData.teaching_unit_id ? parseInt(formData.teaching_unit_id) : null,
        teacher_id: formData.teacher_id ? parseInt(formData.teacher_id) : null,
        credits: formData.credits,
        hours: formData.hours,
      };

      await courseService.update(selectedCourse.id, payload);
      toast.success('Module modifié avec succès !');
      setShowEditModal(false);
      resetForm();
      loadData();
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, 'Erreur lors de la modification'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (course: Course) => {
    const ok = await confirm({
      title: 'Supprimer ce module ?',
      message: `Voulez-vous vraiment supprimer le module "${course.title}" (${course.code}) ? Cette action est irréversible.`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
      icon: 'trash'
    });

    if (ok) {
      try {
        await courseService.delete(course.id);
        toast.success('Module supprimé avec succès');
        loadData();
      } catch (error) {
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="w-10 h-10 text-[#FF6B00] animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Chargement des modules du secrétariat...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-2 sm:p-4">
      {/* 1. En-tête */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-[#FF6B00]">
              Secrétariat Académique
            </span>
            <span className="text-xs text-slate-400">• Gestion des Modules & Enseignements</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2.5">
            <BookOpen className="text-[#FF6B00]" size={28} />
            Modules par Filière & Semestre
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Consultez les modules de chaque filière organisés par semestre
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#FF6B00] hover:bg-orange-600 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer self-start md:self-auto"
        >
          <Plus size={16} />
          <span>Nouveau Module</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* VUE 1 : GRILLE DES CARTES DE FILIÈRES */}
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
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Layers size={14} />
              <span>Voir tous les modules transversaux</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filieres.map((filiere: any) => {
              const filiereCourses = courses.filter((c: any) =>
                (c.filiere_id && c.filiere_id === filiere.id) ||
                (c.department && c.department.toLowerCase() === filiere.name.toLowerCase()) ||
                (c.filiere_name && c.filiere_name.toLowerCase() === filiere.name.toLowerCase())
              );

              const filiereCredits = filiereCourses.reduce((acc, c) => acc + (c.credits || 0), 0);
              const filiereHours = filiereCourses.reduce((acc, c) => acc + (c.hours || 0), 0);
              const filiereSemesters = Array.from(
                new Set(filiereCourses.map(c => c.semester?.toUpperCase().trim()).filter(Boolean))
              ).sort();

              return (
                <div
                  key={filiere.id}
                  onClick={() => {
                    setSelectedFiliereId(filiere.id);
                    setSelectedSemester('all');
                  }}
                  className="group bg-white rounded-2xl border-2 border-slate-200/90 hover:border-[#FF6B00] shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between cursor-pointer relative overflow-hidden"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        {filiere.domain || 'Département'}
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
                        {filiere.description || 'Formation universitaire habilitée'}
                      </p>
                    </div>

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

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                    <span className="font-semibold text-slate-800">{filiereCredits} crédits • {filiereHours}h</span>
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
      {/* VUE 2 : DÉTAIL DES MODULES GROUPÉS PAR SEMESTRE */}
      {/* ==================================================================== */}
      {selectedFiliereId !== null && (
        <div className="space-y-5">
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
                {visibleCourses.length} module{visibleCourses.length > 1 ? 's' : ''}
              </span>

              <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50 p-0.5">
                <button
                  onClick={() => setViewStyle('table')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewStyle === 'table' ? 'bg-white shadow-2xs text-[#FF6B00]' : 'text-slate-500'
                  }`}
                >
                  <List size={16} />
                </button>
                <button
                  onClick={() => setViewStyle('grid')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewStyle === 'grid' ? 'bg-white shadow-2xs text-[#FF6B00]' : 'text-slate-500'
                  }`}
                >
                  <LayoutGrid size={16} />
                </button>
              </div>

              <button
                onClick={openCreateModal}
                className="px-3.5 py-2 bg-[#FF6B00] hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <Plus size={14} />
                <span>Ajouter un module</span>
              </button>
            </div>
          </div>

          {/* Sélecteur de Semestre */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Layers size={15} className="text-[#FF6B00]" />
              Filtrer les Modules par Semestre :
            </span>

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

              {availableSemesters.map((sem) => (
                <button
                  key={sem}
                  onClick={() => setSelectedSemester(sem)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                    selectedSemester === sem
                      ? 'bg-[#FF6B00] text-white border-[#FF6B00] shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>{sem}</span>
                </button>
              ))}
            </div>

            {/* Recherche */}
            <div className="relative pt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Rechercher par titre, code, UE ou enseignant..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              />
            </div>
          </div>

          {/* Groupes de Modules par Semestre */}
          {coursesGroupedBySemester.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <BookOpen size={40} className="text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">Aucun module trouvé</h3>
              <p className="text-xs text-slate-500">Aucun module ne correspond aux critères.</p>
            </div>
          ) : (
            coursesGroupedBySemester.map((group) => (
              <div key={group.semester} className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-orange-500/20 text-[#FF6B00] flex items-center justify-center font-mono font-black text-xs">
                      {group.semester}
                    </span>
                    <h3 className="text-sm font-black uppercase">
                      {group.semester === 'Sans Semestre' ? 'Modules Sans Semestre' : `Semestre ${group.semester}`}
                    </h3>
                  </div>
                  <span className="text-xs text-slate-300">
                    {group.courses.length} module{group.courses.length > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200/80">
                      <tr>
                        <th className="px-4 py-3">Code & Intitulé</th>
                        <th className="px-4 py-3">Niveau & Semestre</th>
                        <th className="px-4 py-3">Unité d'Enseignement (UE)</th>
                        <th className="px-4 py-3">Enseignant</th>
                        <th className="px-4 py-3 text-center">Crédits</th>
                        <th className="px-4 py-3 text-center">Volume</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {group.courses.map((course: any) => (
                        <tr key={course.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-mono font-black text-[11px] text-[#FF6B00] bg-orange-50 px-2 py-0.5 rounded border border-orange-200 inline-block">
                              {course.code}
                            </span>
                            <p className="font-bold text-slate-900 text-xs mt-1">{course.title}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-800 font-bold rounded text-[10px] mr-1">
                              {course.level}
                            </span>
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 font-mono font-bold rounded text-[10px]">
                              {course.semester || group.semester}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {course.teaching_unit_code ? (
                              <span className="px-2 py-1 bg-purple-50 text-purple-800 rounded-lg text-[11px] font-semibold">
                                [{course.teaching_unit_code}] {course.teaching_unit_name || ''}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Autonome</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-800">
                            {course.teacher_name || 'Non assigné'}
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-slate-900">
                            {course.credits}
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-slate-600">
                            {course.hours}h
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => { setSelectedCourse(course); setShowDetailModal(true); }}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="Voir détails"
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                onClick={() => openEditModal(course)}
                                className="p-1.5 text-slate-400 hover:text-[#FF6B00] hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                                title="Modifier"
                              >
                                <Edit3 size={15} />
                              </button>
                              <button
                                onClick={() => openHistoryModal(course)}
                                className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                                title="Historique"
                              >
                                <History size={15} />
                              </button>
                              <button
                                onClick={() => handleDelete(course)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Supprimer"
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
              </div>
            ))
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL CRÉATION / MODIFICATION AVEC SÉLECTION DU SEMESTRE */}
      {/* ==================================================================== */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen size={18} className="text-[#FF6B00]" />
                {showCreateModal ? 'Nouveau Module Académique' : 'Modifier le Module'}
              </h2>
              <button
                onClick={() => { setShowCreateModal(false); setShowEditModal(false); resetForm(); }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Intitulé du module *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex : Algorithmique & Programmation Web..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#FF6B00] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Domaine *</label>
                  <select
                    value={formData.domain}
                    onChange={(e) => setFormData({ ...formData, domain: e.target.value, filiere_id: '' })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="">Sélectionner un domaine...</option>
                    {domains.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Filière *</label>
                  <select
                    value={formData.filiere_id}
                    onChange={(e) => setFormData({ ...formData, filiere_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="">Sélectionner une filière...</option>
                    {filieresOfDomain.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
              </div>

              {/* NIVEAU & SEMESTRE (Exigence Clé) */}
              <div className="bg-orange-50/60 p-3 rounded-xl border border-orange-200/80 space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Niveau *</label>
                    <select
                      value={formData.level}
                      onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white font-semibold"
                    >
                      <option value="">Niveau...</option>
                      {levelsOfFiliere.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Semestre * (LMD)</label>
                    <select
                      value={formData.semester}
                      onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-orange-300 rounded-lg bg-white font-bold text-orange-950"
                    >
                      {allSemesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Boutons rapides de semestres */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {allSemesters.slice(0, 6).map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, semester: s.id })}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                        formData.semester === s.id
                          ? 'bg-[#FF6B00] text-white border-[#FF6B00]'
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      {s.id}
                    </button>
                  ))}
                </div>
              </div>

              {/* UE rattachée */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Unité d'Enseignement (UE)</label>
                <select
                  value={formData.teaching_unit_id}
                  onChange={(e) => {
                    const ueId = e.target.value;
                    const selectedUE = teachingUnits.find(u => String(u.id) === String(ueId));
                    setFormData({
                      ...formData,
                      teaching_unit_id: ueId,
                      semester: selectedUE?.semester || formData.semester
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="">Aucune (Module autonome)</option>
                  {filteredTeachingUnits.map(u => (
                    <option key={u.id} value={u.id}>[{u.code}] {u.name} ({u.semester || 'S?'})</option>
                  ))}
                </select>
              </div>

              {/* Enseignant */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Enseignant assigné</label>
                <select
                  value={formData.teacher_id}
                  onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="">Non assigné</option>
                  {teachersOfFiliere.map(t => (
                    <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                  ))}
                </select>
              </div>

              {/* Crédits & Heures */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Crédits ECTS *</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={formData.credits}
                    onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Volume horaire *</label>
                  <select
                    value={formData.hours}
                    onChange={(e) => setFormData({ ...formData, hours: parseInt(e.target.value) || 20 })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    {hoursOptions.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => { setShowCreateModal(false); setShowEditModal(false); resetForm(); }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={showCreateModal ? handleCreate : handleUpdate}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#FF6B00] hover:bg-orange-600 transition-colors shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                <span>{saving ? 'Enregistrement...' : showCreateModal ? 'Créer le module' : 'Enregistrer'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL HISTORIQUE DU MODULE */}
      {showHistoryModal && selectedCourse && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Historique des modifications</h3>
                <p className="text-xs text-slate-500 font-mono">{selectedCourse.code} • {selectedCourse.title}</p>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {loadingHistory ? (
              <div className="py-8 text-center"><Loader2 className="animate-spin mx-auto text-[#FF6B00]" size={24} /></div>
            ) : history.length === 0 ? (
              <p className="text-center py-6 text-xs text-slate-400">Aucun historique disponible.</p>
            ) : (
              <div className="space-y-2 text-xs">
                {history.map((h) => (
                  <div key={h.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                    <div className="flex items-center justify-between text-slate-500 text-[10px]">
                      <span>{h.user_name || 'Système'}</span>
                      <span>{new Date(h.created_at).toLocaleString('fr-FR')}</span>
                    </div>
                    <p className="font-semibold text-slate-800 mt-1">{h.new_value || h.action}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DÉTAILS RAPIDE */}
      {showDetailModal && selectedCourse && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Détail du module</h3>
              <button onClick={() => setShowDetailModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-2.5 text-xs">
              <div><span className="font-bold text-slate-500 block">Intitulé</span><span className="font-bold text-slate-900 text-sm">{selectedCourse.title}</span></div>
              <div className="grid grid-cols-2 gap-2">
                <div><span className="font-bold text-slate-500 block">Code</span><span className="font-mono font-bold text-[#FF6B00]">{selectedCourse.code}</span></div>
                <div><span className="font-bold text-slate-500 block">Semestre</span><span className="font-bold text-emerald-700">{selectedCourse.semester || 'Non assigné'}</span></div>
              </div>
              <div><span className="font-bold text-slate-500 block">Enseignant</span><span>{selectedCourse.teacher_name || 'Non assigné'}</span></div>
              <div><span className="font-bold text-slate-500 block">Crédits & Volume</span><span>{selectedCourse.credits} crédits ECTS • {selectedCourse.hours} heures</span></div>
            </div>
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SecretaryCoursesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-[#FF6B00]" size={32} />
      </div>
    }>
      <SecretaryCoursesContent />
    </Suspense>
  );
}
