'use client';
import { useState, useEffect } from 'react';
import {
  BookOpen, Plus, Search, Edit3, Trash2, Eye,
  Users, Award, Loader2, X, Save,
  History, GraduationCap
} from 'lucide-react';
import { courseService, Course, CourseHistory } from '@/services/courseService';
import { teacherService } from '@/services/teacherService';
import { filiereService } from '@/services/filiereService';
import { getApiErrorMessage } from '@/lib/errorHandler';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/hooks/useConfirm';

export default function SecretaryCoursesPage() {
  const toast = useToast();
  const { confirm } = useConfirm();
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [filieres, setFilieres] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [filterFiliere, setFilterFiliere] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [history, setHistory] = useState<CourseHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const levels = ['L1', 'L2', 'L3', 'M1', 'M2', 'Doctorat'];
  const allSemesters = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10'];
  const levelSemestersMap: Record<string, string[]> = {
    'L1': ['S1', 'S2'],
    'L2': ['S3', 'S4'],
    'L3': ['S5', 'S6'],
    'M1': ['S7', 'S8'],
    'M2': ['S9', 'S10'],
    'Doctorat': ['D1', 'D2', 'D3'],
  };

  const [formData, setFormData] = useState({
    title: '',
    code: '',
    level: 'L1',
    semester: 'S1',
    is_common_core: false,
    common_core_filieres_mode: 'ALL',
    selected_filieres: [] as number[],
    domain: '',
    filiere_id: '',
    teacher_id: '',
    credits: 3,
    hours: 20,
  });
  const [saving, setSaving] = useState(false);

  const hoursOptions = [10, 15, 20, 25, 30, 35, 40, 45, 50, 60];

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [coursesData, teachersData, filieresData] = await Promise.all([
        courseService.getAll(),
        teacherService.getAll(),
        filiereService.getAll()
      ]);
      setCourses(coursesData);
      setTeachers(teachersData);
      setFilieres(filieresData);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const domains = [...new Set(filieres.map(f => f.domain))].filter(Boolean).sort();
  const filieresOfDomain = formData.domain
    ? filieres.filter(f => f.domain === formData.domain)
    : filieres;
  const teachersOfFiliere = teachers;

  const resetForm = () => {
    setFormData({
      title: '',
      code: '',
      level: 'L1',
      semester: 'S1',
      is_common_core: false,
      common_core_filieres_mode: 'ALL',
      selected_filieres: [],
      domain: '',
      filiere_id: '',
      teacher_id: '',
      credits: 3,
      hours: 20,
    });
  };

  const handleLevelChange = (newLevel: string) => {
    const recommended = levelSemestersMap[newLevel] || ['S1'];
    setFormData(prev => ({
      ...prev,
      level: newLevel,
      semester: recommended[0] || prev.semester
    }));
  };

  const toggleFiliereSelection = (filiereId: number) => {
    setFormData(prev => {
      const exists = prev.selected_filieres.includes(filiereId);
      return {
        ...prev,
        selected_filieres: exists
          ? prev.selected_filieres.filter(id => id !== filiereId)
          : [...prev.selected_filieres, filiereId]
      };
    });
  };

  const handleCreate = async () => {
    if (!formData.title.trim()) {
      toast.error("Veuillez saisir l'intitulé du cours");
      return;
    }
    if (!formData.is_common_core && !formData.filiere_id) {
      toast.error('Veuillez sélectionner une filière ou activer le Tronc Commun');
      return;
    }
    setSaving(true);
    try {
      let commonCoreFilieresStr: string | null = null;
      if (formData.is_common_core) {
        commonCoreFilieresStr = formData.common_core_filieres_mode === 'ALL'
          ? 'ALL'
          : formData.selected_filieres.join(',');
      }

      await courseService.create({
        title: formData.title.trim(),
        code: formData.code.trim() || undefined,
        level: formData.level,
        semester: formData.semester,
        is_common_core: formData.is_common_core,
        common_core_filieres: commonCoreFilieresStr,
        department: formData.is_common_core ? 'Tronc Commun' : undefined,
        filiere_id: formData.is_common_core ? null : (formData.filiere_id ? parseInt(formData.filiere_id) : null),
        teacher_id: formData.teacher_id ? parseInt(formData.teacher_id) : null,
        credits: formData.credits,
        hours: formData.hours,
      });
      toast.success('Cours créé avec succès !');
      setShowCreateModal(false);
      resetForm();
      loadAll();
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, 'Erreur lors de la création'));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedCourse) return;
    if (!formData.title.trim()) {
      toast.error("Veuillez saisir l'intitulé du cours");
      return;
    }
    setSaving(true);
    try {
      let commonCoreFilieresStr: string | null = null;
      if (formData.is_common_core) {
        commonCoreFilieresStr = formData.common_core_filieres_mode === 'ALL'
          ? 'ALL'
          : formData.selected_filieres.join(',');
      }

      await courseService.update(selectedCourse.id, {
        title: formData.title.trim(),
        code: formData.code.trim() || undefined,
        level: formData.level,
        semester: formData.semester,
        is_common_core: formData.is_common_core,
        common_core_filieres: commonCoreFilieresStr,
        department: formData.is_common_core ? 'Tronc Commun' : undefined,
        filiere_id: formData.is_common_core ? null : (formData.filiere_id ? parseInt(formData.filiere_id) : null),
        teacher_id: formData.teacher_id ? parseInt(formData.teacher_id) : null,
        credits: formData.credits,
        hours: formData.hours,
      });
      toast.success('Cours modifié avec succès !');
      setShowEditModal(false);
      resetForm();
      loadAll();
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, 'Erreur lors de la modification'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (course: Course) => {
    const ok = await confirm({
      title: 'Supprimer ce cours ?',
      message: `Voulez-vous vraiment supprimer le cours "${course.title}" ? Cette action est irréversible.`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
      icon: 'trash'
    });
    
    if (ok) {
      try {
        await courseService.delete(course.id);
        toast.success('Cours supprimé avec succès !');
        loadAll();
      } catch (error: any) {
        toast.error(getApiErrorMessage(error, 'Erreur lors de la suppression'));
      }
    }
  };

  const openEditModal = (course: any) => {
    setSelectedCourse(course);
    const filiere = filieres.find(f => f.id === course.filiere_id);
    const domain = filiere?.domain || '';
    const selectedFils = course.common_core_filieres && course.common_core_filieres !== 'ALL'
      ? course.common_core_filieres.split(',').map((x: string) => parseInt(x.trim())).filter(Boolean)
      : [];
    setFormData({
      title: course.title || '',
      code: course.code || '',
      domain: domain,
      filiere_id: course.filiere_id?.toString() || '',
      level: course.level || 'L1',
      semester: course.semester || 'S1',
      is_common_core: Boolean(course.is_common_core),
      common_core_filieres_mode: course.common_core_filieres === 'ALL' || !course.common_core_filieres ? 'ALL' : 'CUSTOM',
      selected_filieres: selectedFils,
      teacher_id: course.teacher_id?.toString() || '',
      credits: course.credits || 3,
      hours: course.hours || 20,
    });
    setShowEditModal(true);
  };

  const openHistoryModal = async (course: Course) => {
    setSelectedCourse(course);
    setLoadingHistory(true);
    setShowHistoryModal(true);
    try {
      const historyData = await courseService.getHistory(course.id);
      setHistory(historyData);
    } catch (error) {
      toast.error('Erreur lors du chargement de l\'historique');
    } finally {
      setLoadingHistory(false);
    }
  };

  const filteredCourses = courses.filter(course => {
    const matchSearch =
      course.title.toLowerCase().includes(search.toLowerCase()) ||
      course.code.toLowerCase().includes(search.toLowerCase()) ||
      course.teacher_name.toLowerCase().includes(search.toLowerCase());
    const matchLevel = !filterLevel || course.level === filterLevel;
    const matchFiliere = !filterFiliere || course.department === filterFiliere;
    return matchSearch && matchLevel && matchFiliere;
  });

  const uniqueDepartments = [...new Set(courses.map(c => c.department).filter(Boolean))];
  const uniqueLevels = [...new Set(courses.map(c => c.level).filter(Boolean))];
  const stats = {
    total: courses.length,
    levels: uniqueLevels.length,
    departments: uniqueDepartments.length,
    unassigned: courses.filter(c => !c.teacher_id).length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B00] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Cours & Modules</h1>
          <p className="text-slate-500 mt-1">Gérez tous les cours de l'université</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-sm font-medium transition-all shadow-md"
        >
          <Plus size={16} />
          Nouveau cours
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <BookOpen size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Award size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Niveaux</p>
              <p className="text-2xl font-bold text-slate-900">{stats.levels}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <GraduationCap size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Filières</p>
              <p className="text-2xl font-bold text-slate-900">{stats.departments}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Users size={20} className="text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Non assignés</p>
              <p className="text-2xl font-bold text-slate-900">{stats.unassigned}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="🔍 Rechercher par titre, code, enseignant..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          >
            <option value="">Tous les niveaux</option>
            {uniqueLevels.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <select
            value={filterFiliere}
            onChange={(e) => setFilterFiliere(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          >
            <option value="">Toutes les filières</option>
            {uniqueDepartments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredCourses.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen size={48} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Aucun cours trouvé</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-block mt-4 text-sm text-[#FF6B00] hover:underline"
            >
              Créer le premier cours →
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Code</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Titre</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Niveau</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Filière</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Enseignant</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Volume</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCourses.map((course) => (
                  <tr key={course.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">
                        {course.code}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900 text-sm">{course.title}</p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded">
                          {course.level}
                        </span>
                        {course.semester && (
                          <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded">
                            {course.semester}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {course.is_common_core ? (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-bold rounded inline-flex items-center gap-1">
                          🏛️ Tronc Commun
                        </span>
                      ) : (
                        course.department || course.filiere_name || 'N/A'
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {course.teacher_name === 'Non assigné' ? (
                        <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                          Non assigné
                        </span>
                      ) : (
                        <span className="text-sm text-slate-600">{course.teacher_name}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {course.hours}h / {course.credits} crédits
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setSelectedCourse(course); setShowDetailModal(true); }}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Voir"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => openEditModal(course)}
                          className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => openHistoryModal(course)}
                          className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Historique"
                        >
                          <History size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(course)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer"
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
        )}
      </div>

      {/* MODAL CRÉATION / MODIFICATION */}
      {(showCreateModal || (showEditModal && selectedCourse)) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="text-[#FF6B00]" size={20} />
                <span>{showCreateModal ? 'Nouveau Cours' : `Modifier : ${selectedCourse?.title}`}</span>
              </h2>
              <button 
                onClick={() => { setShowCreateModal(false); setShowEditModal(false); resetForm(); }} 
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Titre */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Intitulé du Cours *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Algorithmique, Droit Civil, Macroéconomie..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B00] text-sm"
                />
              </div>

              {/* Niveau (Boutons) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Niveau Académique *
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {levels.map(lvl => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => handleLevelChange(lvl)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        formData.level === lvl
                          ? 'bg-[#FF6B00] text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Semestre (Boutons) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Semestre LMD *
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {allSemesters.map(sem => {
                    const isRecommended = (levelSemestersMap[formData.level] || []).includes(sem);
                    const isSelected = formData.semester === sem;
                    return (
                      <button
                        key={sem}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, semester: sem }))}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-xs'
                            : isRecommended
                            ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <span>{sem}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Affectation : Tronc Commun vs Spécifique */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Type d'Affectation *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, is_common_core: false }))}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between text-xs font-bold ${
                      !formData.is_common_core
                        ? 'border-[#FF6B00] bg-orange-50/50 text-[#FF6B00]'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span>🎯 Filière Spécifique</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, is_common_core: true }))}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between text-xs font-bold ${
                      formData.is_common_core
                        ? 'border-purple-600 bg-purple-50/50 text-purple-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span>🏛️ Tronc Commun</span>
                  </button>
                </div>
              </div>

              {/* Options Tronc Commun */}
              {formData.is_common_core ? (
                <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 space-y-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, common_core_filieres_mode: 'ALL' }))}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                        formData.common_core_filieres_mode === 'ALL'
                          ? 'bg-purple-600 text-white'
                          : 'bg-white border border-purple-200 text-purple-700'
                      }`}
                    >
                      🌐 Toutes les filières ({formData.level})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, common_core_filieres_mode: 'CUSTOM' }))}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                        formData.common_core_filieres_mode === 'CUSTOM'
                          ? 'bg-purple-600 text-white'
                          : 'bg-white border border-purple-200 text-purple-700'
                      }`}
                    >
                      🎯 Sélection ({formData.selected_filieres.length})
                    </button>
                  </div>

                  {formData.common_core_filieres_mode === 'CUSTOM' && (
                    <div className="flex flex-wrap gap-1 pt-1 max-h-28 overflow-y-auto">
                      {filieres.map(f => {
                        const isChecked = formData.selected_filieres.includes(f.id);
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => toggleFiliereSelection(f.id)}
                            className={`px-2 py-0.5 rounded text-xs font-medium cursor-pointer ${
                              isChecked
                                ? 'bg-purple-600 text-white'
                                : 'bg-white border border-slate-200 text-slate-700 hover:border-purple-300'
                            }`}
                          >
                            {isChecked ? '✓ ' : ''}{f.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Domaine *</label>
                    <select
                      value={formData.domain}
                      onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value, filiere_id: '' }))}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                    >
                      <option value="">Domaine...</option>
                      {domains.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Filière *</label>
                    <select
                      value={formData.filiere_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, filiere_id: e.target.value }))}
                      disabled={!formData.domain}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00] disabled:bg-slate-100"
                    >
                      <option value="">Filière...</option>
                      {filieresOfDomain.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* Enseignant Assigné */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Enseignant Assigné (Tous départements)
                </label>
                <select
                  value={formData.teacher_id}
                  onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-white text-xs"
                >
                  <option value="">Non assigné</option>
                  {teachers.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.first_name} {t.last_name} {t.speciality ? `(${t.speciality})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Crédits & Volume Horaire (Boutons) */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Crédits ECTS
                  </label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5, 6].map(cr => (
                      <button
                        key={cr}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, credits: cr }))}
                        className={`flex-1 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                          formData.credits === cr
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {cr}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Volume Horaire
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {[15, 20, 30, 40, 50].map(h => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, hours: h }))}
                        className={`px-2 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                          formData.hours === h
                            ? 'bg-[#FF6B00] text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {h}h
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => { setShowCreateModal(false); setShowEditModal(false); resetForm(); }}
                className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={showCreateModal ? handleCreate : handleEdit}
                disabled={saving}
                className="flex-1 px-3 py-2 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-xs"
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                <span>{saving ? 'Enregistrement...' : showCreateModal ? 'Créer le Cours' : 'Enregistrer'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL HISTORIQUE */}
      {showHistoryModal && selectedCourse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Historique - {selectedCourse.title}</h2>
              <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            {loadingHistory ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-[#FF6B00]" size={32} />
              </div>
            ) : history.length === 0 ? (
              <p className="text-center text-slate-500 py-12">Aucun historique disponible</p>
            ) : (
              <div className="space-y-3">
                {history.map((h) => (
                  <div key={h.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${
                        h.action === 'created' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {h.action === 'created' ? 'Création' : 'Modification'}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(h.created_at).toLocaleDateString('fr-FR')} à {new Date(h.created_at).toLocaleTimeString('fr-FR')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700">{h.new_value}</p>
                    {h.field_changed && (
                      <p className="text-xs text-slate-500 mt-1">
                        Champ modifié: <strong>{h.field_changed}</strong>
                        {h.old_value && ` (avant: ${h.old_value})`}
                      </p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">Par: {h.user_name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DÉTAIL */}
      {showDetailModal && selectedCourse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Détails du cours</h2>
              <button onClick={() => setShowDetailModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Code</p>
                  <p className="font-mono text-sm font-semibold text-slate-900 bg-slate-100 px-3 py-2 rounded">
                    {selectedCourse.code}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Niveau</p>
                  <p className="text-sm font-semibold text-slate-900">{selectedCourse.level}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Titre</p>
                <p className="text-sm font-semibold text-slate-900">{selectedCourse.title}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Filière</p>
                <p className="text-sm text-slate-900">{selectedCourse.department}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Enseignant</p>
                <p className="text-sm text-slate-900">{selectedCourse.teacher_name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Volume horaire</p>
                  <p className="text-sm font-semibold text-slate-900">{selectedCourse.hours}h</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Crédits</p>
                  <p className="text-sm font-semibold text-slate-900">{selectedCourse.credits}</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowDetailModal(false)}
              className="w-full mt-6 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}