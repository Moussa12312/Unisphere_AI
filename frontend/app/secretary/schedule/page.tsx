'use client';
import { useState, useEffect } from 'react';
import {
  Calendar, Plus, Search, Edit3, Trash2, X, Save,
  Loader2, Clock, MapPin, Users, BookOpen, Copy,
  Printer, Sparkles, RefreshCw, LayoutGrid, List, ArrowRight, CheckCircle2
} from 'lucide-react';
import { scheduleService, Schedule } from '@/services/scheduleService';
import { courseService } from '@/services/courseService';
import { classService } from '@/services/classService';
import { teacherService } from '@/services/teacherService';
import { universityService } from '@/services/universityService';
import { useConflictCheck } from '@/hooks/useConflictCheck';
import ConflictField from '@/components/ConflictField';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/hooks/useConfirm';
import RoomSelect from '@/components/RoomSelect';

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export interface TimeSlot {
  start: string;
  end: string;
  label: string;
  isBreak?: boolean;
}

const DEFAULT_SLOTS: TimeSlot[] = [
  { start: '08:00', end: '10:00', label: '08:00 - 10:00' },
  { start: '10:00', end: '12:00', label: '10:00 - 12:00' },
  { start: '12:00', end: '14:00', label: '12:00 - 14:00 (Pause / Déjeuner)', isBreak: true },
  { start: '14:00', end: '16:00', label: '14:00 - 16:00' },
  { start: '16:00', end: '18:00', label: '16:00 - 18:00' },
];

const TIME_OPTIONS = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
  '19:00', '19:30', '20:00'
];

const COURSE_COLORS = [
  'bg-blue-50 border-blue-200 text-blue-900',
  'bg-emerald-50 border-emerald-200 text-emerald-900',
  'bg-purple-50 border-purple-200 text-purple-900',
  'bg-amber-50 border-amber-200 text-amber-900',
  'bg-rose-50 border-rose-200 text-rose-900',
  'bg-cyan-50 border-cyan-200 text-cyan-900',
  'bg-indigo-50 border-indigo-200 text-indigo-900',
  'bg-teal-50 border-teal-200 text-teal-900',
];

export default function SecretarySchedulePage() {
  const toast = useToast();
  const { confirm } = useConfirm();

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtres et Vues
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [filterDay, setFilterDay] = useState('');

  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showAutoModal, setShowAutoModal] = useState(false);
  const [showSlotsModal, setShowSlotsModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);

  // Créneaux horaires configurables
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(DEFAULT_SLOTS);
  const [editingSlots, setEditingSlots] = useState<TimeSlot[]>(DEFAULT_SLOTS);

  // Informations Université (dynamique)
  const [universityInfo, setUniversityInfo] = useState<{
    name: string;
    slogan?: string;
    logo?: string | null;
    academic_year?: string;
  }>({
    name: 'UNIVERSITÉ',
    academic_year: '2026-2027'
  });

  // États de sauvegarde / action
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Formulaire de saisie
  const [formData, setFormData] = useState({
    course_id: '',
    class_id: '',
    teacher_id: '',
    room: '',
    building: '',
    day_of_week: 'Lundi',
    start_time: '08:00',
    end_time: '10:00',
  });

  // Duplication rapide
  const [duplicateTargetDay, setDuplicateTargetDay] = useState('Mardi');

  const {
    checking,
    checkScheduleConflicts,
    hasConflict,
    getConflictMessage,
    clearConflicts
  } = useConflictCheck();

  useEffect(() => {
    loadAll();
    // Charger les créneaux personnalisés depuis le localStorage
    try {
      const saved = localStorage.getItem('unisphere_schedule_time_slots');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTimeSlots(parsed);
          setEditingSlots(parsed);
        }
      }
    } catch (e) {
      console.error('Erreur chargement créneaux:', e);
    }
  }, []);

  const handleSaveSlots = () => {
    if (editingSlots.length === 0) {
      toast.error('Il faut conserver au moins un créneau horaire.');
      return;
    }
    setTimeSlots(editingSlots);
    localStorage.setItem('unisphere_schedule_time_slots', JSON.stringify(editingSlots));
    setShowSlotsModal(false);
    toast.success('Créneaux horaires personnalisés enregistrés avec succès !');
  };

  const handleResetSlots = () => {
    setEditingSlots(DEFAULT_SLOTS);
    setTimeSlots(DEFAULT_SLOTS);
    localStorage.removeItem('unisphere_schedule_time_slots');
    setShowSlotsModal(false);
    toast.success('Créneaux horaires réinitialisés aux valeurs standards.');
  };

  const handleAddSlot = () => {
    const last = editingSlots[editingSlots.length - 1];
    const newStart = last ? last.end : '08:00';
    const newEnd = '10:00';
    setEditingSlots([
      ...editingSlots,
      { start: newStart, end: newEnd, label: `${newStart} - ${newEnd}`, isBreak: false }
    ]);
  };

  const handleUpdateSlot = (index: number, field: keyof TimeSlot, value: any) => {
    const updated = [...editingSlots];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'start' || field === 'end') {
      const s = field === 'start' ? value : updated[index].start;
      const e = field === 'end' ? value : updated[index].end;
      if (!updated[index].isBreak) {
        updated[index].label = `${s} - ${e}`;
      }
    }
    setEditingSlots(updated);
  };

  const handleDeleteSlot = (index: number) => {
    if (editingSlots.length <= 1) {
      toast.error('Vous devez conserver au moins un créneau.');
      return;
    }
    setEditingSlots(editingSlots.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (formData.day_of_week && formData.start_time && formData.end_time) {
      checkScheduleConflicts({
        course_id: formData.course_id ? parseInt(formData.course_id) : undefined,
        class_id: formData.class_id ? parseInt(formData.class_id) : undefined,
        teacher_id: formData.teacher_id ? parseInt(formData.teacher_id) : undefined,
        room: formData.room || undefined,
        day_of_week: formData.day_of_week,
        start_time: formData.start_time,
        end_time: formData.end_time,
        exclude_id: selectedSchedule?.id
      });
    }
  }, [formData.day_of_week, formData.start_time, formData.end_time, formData.room, formData.teacher_id, formData.class_id]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [schedulesData, coursesData, classesData, teachersData, univData] = await Promise.all([
        scheduleService.getAll(),
        courseService.getAll(),
        classService.getAll(),
        teacherService.getAll(),
        universityService.getInfo().catch(() => null)
      ]);
      setSchedules(schedulesData);
      setCourses(coursesData);
      setClasses(classesData);
      setTeachers(teachersData);

      if (univData) {
        setUniversityInfo({
          name: univData.name || 'UNIVERSITÉ',
          slogan: univData.slogan || '',
          logo: univData.logo ? (univData.logo.startsWith('/') ? univData.logo : `/uploads/logos/${univData.logo}`) : null,
          academic_year: univData.academic_year || '2026-2027'
        });
      }

      // Si aucune classe n'est sélectionnée, pré-sélectionner la première par défaut
      if (!selectedClassId && classesData.length > 0) {
        setSelectedClassId(classesData[0].id.toString());
      }
    } catch (error) {
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const getActiveClassObject = () => {
    return classes.find(c => c.id.toString() === selectedClassId) || null;
  };

  const getFilteredCourses = () => {
    const activeCls = getActiveClassObject();
    if (!activeCls) return courses;
    return courses.filter(c => {
      if (activeCls.filiere_id && c.filiere_id) {
        return c.filiere_id === activeCls.filiere_id;
      }
      return c.level === activeCls.level;
    });
  };

  const resetForm = () => {
    const activeCls = getActiveClassObject();
    setFormData({
      course_id: '',
      class_id: selectedClassId || '',
      teacher_id: '',
      room: activeCls?.room || '',
      building: activeCls?.building || '',
      day_of_week: 'Lundi',
      start_time: '08:00',
      end_time: '10:00',
    });
    clearConflicts();
  };

  // Clic direct sur une case de la grille hebdomadaire
  const openSlotFromGrid = (day: string, start: string, end: string) => {
    const activeCls = getActiveClassObject();
    setFormData({
      course_id: '',
      class_id: selectedClassId || (classes[0]?.id.toString() || ''),
      teacher_id: '',
      room: activeCls?.room || '',
      building: activeCls?.building || '',
      day_of_week: day,
      start_time: start,
      end_time: end,
    });
    setShowCreateModal(true);
  };

  const handleCourseSelect = (courseIdStr: string) => {
    const selectedCourse = courses.find((c: any) => c.id.toString() === courseIdStr);
    const autoTeacherId = selectedCourse?.teacher_id ? selectedCourse.teacher_id.toString() : '';
    setFormData(prev => ({
      ...prev,
      course_id: courseIdStr,
      teacher_id: autoTeacherId || prev.teacher_id
    }));
  };

  const handleClassSelectInForm = (classIdStr: string) => {
    const matchingClass = classes.find((c: any) => c.id.toString() === classIdStr);
    setFormData(prev => ({
      ...prev,
      class_id: classIdStr,
      room: matchingClass?.room || prev.room,
      building: matchingClass?.building || prev.building,
    }));
  };

  // Création classique (ferme la modale)
  const handleCreate = async () => {
    if (!formData.course_id || !formData.class_id || !formData.teacher_id ||
        !formData.day_of_week || !formData.start_time || !formData.end_time) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    if (formData.start_time >= formData.end_time) {
      toast.error('L\'heure de fin doit être après l\'heure de début');
      return;
    }
    setSaving(true);
    try {
      await scheduleService.create({
        course_id: parseInt(formData.course_id),
        class_id: parseInt(formData.class_id),
        teacher_id: parseInt(formData.teacher_id),
        room: formData.room || null,
        building: formData.building || null,
        day_of_week: formData.day_of_week,
        start_time: formData.start_time,
        end_time: formData.end_time,
      });
      toast.success('Cours planifié avec succès !');
      setShowCreateModal(false);
      resetForm();
      const updated = await scheduleService.getAll();
      setSchedules(updated);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  // Mode Saisie Turbo : Enregistrer et passer directement au créneau suivant
  const handleCreateAndNext = async () => {
    if (!formData.course_id || !formData.class_id || !formData.teacher_id ||
        !formData.day_of_week || !formData.start_time || !formData.end_time) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    if (formData.start_time >= formData.end_time) {
      toast.error('L\'heure de fin doit être après l\'heure de début');
      return;
    }
    setSaving(true);
    try {
      await scheduleService.create({
        course_id: parseInt(formData.course_id),
        class_id: parseInt(formData.class_id),
        teacher_id: parseInt(formData.teacher_id),
        room: formData.room || null,
        building: formData.building || null,
        day_of_week: formData.day_of_week,
        start_time: formData.start_time,
        end_time: formData.end_time,
      });
      toast.success('Créneau enregistré ! Prêt pour le suivant ⏭️');

      // Calculer le prochain créneau standard
      let nextStart = '10:00';
      let nextEnd = '12:00';
      let nextDay = formData.day_of_week;

      if (formData.start_time === '08:00') {
        nextStart = '10:00';
        nextEnd = '12:00';
      } else if (formData.start_time === '10:00') {
        nextStart = '14:00';
        nextEnd = '16:00';
      } else if (formData.start_time === '14:00') {
        nextStart = '16:00';
        nextEnd = '18:00';
      } else if (formData.start_time === '16:00') {
        // Passe au jour suivant à 08:00
        const currentDayIndex = DAYS.indexOf(formData.day_of_week);
        if (currentDayIndex < DAYS.length - 1) {
          nextDay = DAYS[currentDayIndex + 1];
        } else {
          nextDay = DAYS[0];
        }
        nextStart = '08:00';
        nextEnd = '10:00';
      }

      setFormData(prev => ({
        ...prev,
        day_of_week: nextDay,
        start_time: nextStart,
        end_time: nextEnd,
        course_id: '',
        teacher_id: ''
      }));

      // Rafraîchir les emplois du temps
      scheduleService.getAll().then(setSchedules);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedSchedule) return;
    setSaving(true);
    try {
      await scheduleService.update(selectedSchedule.id, {
        course_id: parseInt(formData.course_id),
        class_id: parseInt(formData.class_id),
        teacher_id: parseInt(formData.teacher_id),
        room: formData.room || null,
        building: formData.building || null,
        day_of_week: formData.day_of_week,
        start_time: formData.start_time,
        end_time: formData.end_time,
      });
      toast.success('Emploi du temps mis à jour !');
      setShowEditModal(false);
      resetForm();
      const updated = await scheduleService.getAll();
      setSchedules(updated);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la modification');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (schedule: Schedule) => {
    const ok = await confirm({
      title: 'Supprimer ce cours ?',
      message: `Voulez-vous supprimer "${schedule.course_title}" du ${schedule.day_of_week} (${schedule.start_time} - ${schedule.end_time}) ?`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
    });

    if (ok) {
      try {
        await scheduleService.delete(schedule.id);
        toast.success('Cours supprimé !');
        const updated = await scheduleService.getAll();
        setSchedules(updated);
      } catch (error: any) {
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  // Duplication en 1 clic
  const openDuplicate = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    const curIdx = DAYS.indexOf(schedule.day_of_week);
    const nextDay = DAYS[(curIdx + 1) % DAYS.length];
    setDuplicateTargetDay(nextDay);
    setShowDuplicateModal(true);
  };

  const handleDuplicate = async () => {
    if (!selectedSchedule) return;
    setSaving(true);
    try {
      await scheduleService.create({
        course_id: selectedSchedule.course_id,
        class_id: selectedSchedule.class_id,
        teacher_id: selectedSchedule.teacher_id,
        room: selectedSchedule.room,
        building: selectedSchedule.building,
        day_of_week: duplicateTargetDay,
        start_time: selectedSchedule.start_time,
        end_time: selectedSchedule.end_time,
      });
      toast.success(`Cours dupliqué vers le ${duplicateTargetDay} !`);
      setShowDuplicateModal(false);
      const updated = await scheduleService.getAll();
      setSchedules(updated);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Conflit ou erreur lors de la duplication');
    } finally {
      setSaving(false);
    }
  };

  // Génération automatique intelligente de la semaine
  const handleAutoGenerate = async () => {
    if (!selectedClassId) {
      toast.error('Veuillez sélectionner une classe');
      return;
    }
    setGenerating(true);
    try {
      const res = await scheduleService.autoGenerate({
        class_id: parseInt(selectedClassId),
        replace_existing: true
      });
      toast.success(res.message || 'Emploi du temps généré avec succès !');
      setShowAutoModal(false);
      const updated = await scheduleService.getAll();
      setSchedules(updated);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la génération automatique');
    } finally {
      setGenerating(false);
    }
  };

  // Vider les cours de la classe
  const handleClearClass = async () => {
    if (!selectedClassId) return;
    const activeCls = getActiveClassObject();
    const ok = await confirm({
      title: 'Effacer l\'emploi du temps ?',
      message: `Voulez-vous réinitialiser tous les créneaux pour la classe "${activeCls?.name}" ?`,
      confirmText: 'Effacer tout',
      variant: 'danger'
    });
    if (!ok) return;

    try {
      await scheduleService.clearClass(parseInt(selectedClassId));
      toast.success('Emploi du temps réinitialisé');
      const updated = await scheduleService.getAll();
      setSchedules(updated);
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const openEditModal = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setFormData({
      course_id: schedule.course_id.toString(),
      class_id: schedule.class_id.toString(),
      teacher_id: schedule.teacher_id.toString(),
      room: schedule.room || '',
      building: schedule.building || '',
      day_of_week: schedule.day_of_week,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
    });
    setShowEditModal(true);
  };

  // Filtrage
  const displayedSchedules = schedules.filter(s => {
    const matchClass = !selectedClassId || s.class_id.toString() === selectedClassId;
    const matchSearch =
      s.course_title.toLowerCase().includes(search.toLowerCase()) ||
      s.class_name.toLowerCase().includes(search.toLowerCase()) ||
      s.teacher_name.toLowerCase().includes(search.toLowerCase());
    const matchDay = !filterDay || s.day_of_week === filterDay;
    return matchClass && matchSearch && matchDay;
  });

  const getCourseColor = (courseId: number) => {
    return COURSE_COLORS[courseId % COURSE_COLORS.length];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B00] border-t-transparent"></div>
      </div>
    );
  }

  const activeClass = getActiveClassObject();

  return (
    <div className="space-y-6">
      {/* BARRE D'ACTION SUPÉRIEURE */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="text-[#FF6B00]" size={26} />
            Emploi du Temps — Secrétariat
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Planification rapide des cours par classe et gestion sans conflits
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Bouton Générateur automatique */}
          <button
            onClick={() => setShowAutoModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
            title="Générer automatiquement une proposition de semaine"
          >
            <Sparkles size={15} />
            ⚡ Auto-Planifier la semaine
          </button>

          {/* Bouton Personnaliser Créneaux */}
          <button
            onClick={() => { setEditingSlots([...timeSlots]); setShowSlotsModal(true); }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-orange-50 hover:border-orange-200 text-slate-700 hover:text-[#FF6B00] rounded-xl text-xs font-semibold shadow-sm transition-all"
            title="Modifier et configurer les créneaux horaires"
          >
            <Clock size={15} className="text-[#FF6B00]" />
            Créneaux horaires
          </button>

          {/* Bouton Impression */}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-medium shadow-sm transition-all"
            title="Imprimer l'emploi du temps"
          >
            <Printer size={15} />
            Imprimer
          </button>

          {/* Bouton Vider */}
          {activeClass && (
            <button
              onClick={handleClearClass}
              className="flex items-center gap-1 px-3 py-2 bg-white border border-slate-200 hover:border-red-200 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-xl text-xs font-medium transition-all"
              title="Vider la semaine pour cette classe"
            >
              <RefreshCw size={14} />
              Vider
            </button>
          )}

          {/* Bouton Nouveau Cours */}
          <button
            onClick={() => { resetForm(); setShowCreateModal(true); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-xs font-semibold shadow-md transition-all"
          >
            <Plus size={16} />
            Ajouter un cours
          </button>
        </div>
      </div>

      {/* SÉLECTEUR DE CLASSE + STATS + COMMUTATEUR DE VUE */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Sélecteur de Classe en vedette */}
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Classe cible :</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelectedClassId('')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  !selectedClassId
                    ? 'bg-[#FF6B00] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Toutes les classes
              </button>
              {classes.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedClassId(c.id.toString())}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    selectedClassId === c.id.toString()
                      ? 'bg-[#FF6B00] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Users size={13} />
                  {c.name}
                  {c.room && <span className="opacity-75 text-[10px]">({c.room})</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Commutateur de vue Grille / Liste */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start md:self-auto">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'grid'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid size={14} />
              Grille Hebdo
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List size={14} />
              Liste par jour
            </button>
          </div>
        </div>

        {/* Barre de recherche et filtre jour (si en vue liste) */}
        {viewMode === 'list' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
            <div className="md:col-span-2 relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher par module, professeur, salle..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              />
            </div>
            <select
              value={filterDay}
              onChange={(e) => setFilterDay(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            >
              <option value="">Tous les jours</option>
              {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* VUE 1 : GRILLE HEBDOMADAIRE INTERACTIVE & ZONE D'IMPRESSION OFFICIELLE */}
      {/* ======================================================== */}
      <div id="printable-schedule" className={viewMode === 'grid' ? 'block' : 'hidden print:block'}>
        {/* EN-TÊTE D'IMPRESSION OFFICIEL (VISIBLE UNIQUEMENT À L'IMPRESSION PAYSAGE) */}
        <div className="hidden print:block mb-2 p-2.5 bg-white border border-slate-800 rounded-lg">
          <div className="flex items-center justify-between border-b border-slate-300 pb-2 mb-2">
            <div className="flex items-center gap-3">
              {universityInfo.logo ? (
                <img
                  src={universityInfo.logo}
                  alt="Logo"
                  className="h-10 w-10 object-contain rounded-md border border-slate-300 p-0.5"
                />
              ) : (
                <div className="w-10 h-10 rounded-md bg-slate-900 text-white flex items-center justify-center font-black text-sm border border-amber-400">
                  {universityInfo.name.slice(0, 4)}
                </div>
              )}
              <div>
                <h2 className="text-base font-black uppercase tracking-wide text-slate-900 leading-tight">
                  {universityInfo.name}
                </h2>
                {universityInfo.slogan && (
                  <p className="text-[10px] font-semibold text-slate-600 italic">
                    {universityInfo.slogan}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block bg-orange-100 text-[#FF6B00] border border-orange-300 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                EMPLOI DU TEMPS OFFICIEL DE LA SEMAINE
              </span>
              <p className="text-[10px] font-mono font-bold text-slate-700 mt-0.5">
                ANNÉE ACADÉMIQUE {universityInfo.academic_year || '2026-2027'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-[11px] bg-slate-50 p-1.5 rounded border border-slate-200">
            <div>
              <span className="font-bold text-slate-500 uppercase text-[9px] block">Classe / Promotion</span>
              <span className="font-extrabold text-slate-900 text-xs">
                {activeClass ? activeClass.name : 'Toutes les filières & classes'}
              </span>
            </div>
            <div className="text-center">
              <span className="font-bold text-slate-500 uppercase text-[9px] block">Localisation dédiée</span>
              <span className="font-semibold text-slate-800 text-[11px]">
                {activeClass?.room ? `Salle ${activeClass.room} (${activeClass.building || 'Campus Principal'})` : 'Campus Principal'}
              </span>
            </div>
            <div className="text-right">
              <span className="font-bold text-slate-500 uppercase text-[9px] block">Date du tirage</span>
              <span className="font-mono text-slate-700 font-semibold text-[10px]">
                {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
          </div>
        </div>

        {/* TABLEAU DE L'EMPLOI DU TEMPS */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm print:border-none print:shadow-none">
          <table className="w-full border-collapse min-w-[900px] print:min-w-0 print:w-full print:table-fixed">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 print:bg-slate-100">
                <th className="py-2.5 px-3 text-left text-xs font-bold text-slate-700 w-32 print:w-[14%] border-r border-slate-200">
                  Créneau Horaire
                </th>
                {DAYS.map(day => (
                  <th key={day} className="py-2.5 px-3 text-center text-xs font-black text-slate-900 border-r last:border-r-0 border-slate-200 uppercase tracking-wider print:w-[14.33%]">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {timeSlots.map((slot, sIdx) => {
                if (slot.isBreak) {
                  return (
                    <tr key={sIdx} className="bg-slate-50/70 border-y border-dashed border-slate-200">
                      <td className="py-2 px-3 text-xs font-semibold text-slate-400 border-r border-slate-200 text-center">
                        {slot.start} - {slot.end}
                      </td>
                      <td colSpan={6} className="py-2 text-center text-xs font-medium text-slate-400 italic">
                        🍽️ Pause déjeuner & Repos
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={sIdx} className="hover:bg-slate-50/30 transition-colors">
                    {/* Colonne Horaires */}
                    <td className="py-3 px-3 text-xs font-bold text-slate-700 bg-slate-50/50 border-r border-slate-200 align-top">
                      <div className="flex items-center gap-1.5">
                        <Clock size={13} className="text-[#FF6B00]" />
                        <span>{slot.label}</span>
                      </div>
                    </td>

                    {/* Colonnes par Jour */}
                    {DAYS.map(day => {
                      const slotSchedules = displayedSchedules.filter(
                        s => s.day_of_week === day &&
                        ((s.start_time <= slot.start && s.end_time > slot.start) ||
                         (s.start_time < slot.end && s.end_time >= slot.end) ||
                         (s.start_time >= slot.start && s.end_time <= slot.end))
                      );

                      return (
                        <td
                          key={day}
                          className="p-2 border-r last:border-r-0 border-slate-200 align-top h-28 relative group"
                        >
                          {slotSchedules.length > 0 ? (
                            <div className="space-y-1.5 h-full">
                              {slotSchedules.map(item => (
                                <div
                                  key={item.id}
                                  className={`p-2 rounded-xl border transition-all shadow-xs ${getCourseColor(item.course_id)}`}
                                >
                                  <div className="flex items-start justify-between gap-1">
                                    <p className="font-bold text-xs leading-tight line-clamp-2">
                                      {item.course_title}
                                    </p>
                                    {/* Action toolbar sur chaque carte */}
                                    <div className="flex items-center gap-0.5 print:hidden opacity-80 group-hover:opacity-100">
                                      <button
                                        onClick={() => openDuplicate(item)}
                                        title="Dupliquer vers un autre jour"
                                        className="p-1 hover:bg-black/10 rounded transition-colors text-slate-600"
                                      >
                                        <Copy size={11} />
                                      </button>
                                      <button
                                        onClick={() => openEditModal(item)}
                                        title="Modifier"
                                        className="p-1 hover:bg-black/10 rounded transition-colors text-slate-600"
                                      >
                                        <Edit3 size={11} />
                                      </button>
                                      <button
                                        onClick={() => handleDelete(item)}
                                        title="Supprimer"
                                        className="p-1 hover:bg-red-500 hover:text-white rounded transition-colors text-red-600"
                                      >
                                        <Trash2 size={11} />
                                      </button>
                                    </div>
                                  </div>

                                  <div className="mt-1 space-y-0.5 text-[11px] opacity-90">
                                    <p className="flex items-center gap-1 font-medium truncate">
                                      🎓 {item.teacher_name}
                                    </p>
                                    <div className="flex items-center justify-between text-[10px]">
                                      <span className="flex items-center gap-0.5 truncate">
                                        <MapPin size={10} />
                                        {item.room || 'Salle non def'} {item.building && `(${item.building})`}
                                      </span>
                                      <span className="font-semibold bg-white/60 px-1 py-0.2 rounded text-[9px]">
                                        {item.class_name}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            /* Case vide : bouton 1-clic pour planifier directement */
                            <button
                              onClick={() => openSlotFromGrid(day, slot.start, slot.end)}
                              className="w-full h-full min-h-[70px] border border-dashed border-slate-200 hover:border-[#FF6B00] rounded-xl flex flex-col items-center justify-center gap-1 text-slate-300 hover:text-[#FF6B00] hover:bg-orange-50/40 transition-all print:hidden"
                              title={`Planifier un cours le ${day} de ${slot.start} à ${slot.end}`}
                            >
                              <Plus size={16} />
                              <span className="text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                Planifier
                              </span>
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* PIED DE PAGE ET SIGNATURES OFFICIELLES À L'IMPRESSION */}
        <div className="hidden print:grid grid-cols-3 gap-4 mt-2 pt-2 border-t-2 border-slate-900 text-xs text-slate-800">
          <div className="p-2 border border-slate-300 rounded-lg bg-slate-50/50">
            <p className="font-black uppercase tracking-wider text-[10px] text-slate-900">Le Responsable Pédagogique</p>
            <p className="text-slate-500 text-[9px]">Visa & Contrôle de conformité</p>
            <div className="h-8 mt-1"></div>
          </div>
          <div className="p-2 border border-slate-300 rounded-lg bg-slate-50/50 text-center">
            <p className="font-black uppercase tracking-wider text-[10px] text-slate-900">Direction Générale {universityInfo.name}</p>
            <p className="text-slate-500 text-[9px]">Cachet officiel & Approbation</p>
            <div className="h-8 mt-1 flex items-center justify-center text-[9px] text-slate-400 italic">
              [ Cachet et Signature ]
            </div>
          </div>
          <div className="p-2 border border-slate-300 rounded-lg bg-slate-50/50 text-right">
            <p className="font-black uppercase tracking-wider text-[10px] text-slate-900">Secrétariat Général</p>
            <p className="text-slate-500 text-[9px]">Délivré et certifié conforme</p>
            <div className="h-8 mt-1"></div>
          </div>
        </div>

        <div className="hidden print:flex items-center justify-between text-[9px] text-slate-500 mt-2 font-mono">
          <span>UniSphere AI • Système d'Information Universitaire Certifié</span>
          <span>Affichage officiel obligatoire dans les salles et panneaux d'information</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* VUE 2 : LISTE PAR JOUR (CLASSIQUE) */}
      {/* ======================================================== */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {DAYS.map(day => {
            const daySchedules = displayedSchedules
              .filter(s => s.day_of_week === day)
              .sort((a, b) => a.start_time.localeCompare(b.start_time));

            if (daySchedules.length === 0) return null;

            return (
              <div key={day} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-[#FF6B00] to-orange-500 px-5 py-2.5 flex items-center justify-between text-white">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Calendar size={16} />
                    {day}
                  </h3>
                  <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full">
                    {daySchedules.length} cours
                  </span>
                </div>
                <div className="divide-y divide-slate-100">
                  {daySchedules.map(item => (
                    <div key={item.id} className="p-3.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="min-w-[80px] text-center">
                          <p className="text-xs font-bold text-[#FF6B00]">{item.start_time} - {item.end_time}</p>
                          <p className="text-[10px] text-slate-400">2h</p>
                        </div>
                        <div className="h-9 w-px bg-slate-200"></div>
                        <div>
                          <p className="font-semibold text-xs text-slate-900">{item.course_title}</p>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                            <span className="flex items-center gap-1 font-medium">👥 {item.class_name}</span>
                            <span className="flex items-center gap-1">🎓 {item.teacher_name}</span>
                            {item.room && <span className="flex items-center gap-1">📍 {item.room} {item.building && `(${item.building})`}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openDuplicate(item)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
                          <Copy size={14} />
                        </button>
                        <button onClick={() => openEditModal(item)} className="p-1.5 text-slate-400 hover:text-[#FF6B00] rounded-lg">
                          <Edit3 size={14} />
                        </button>
                        <button onClick={() => handleDelete(item)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL CRÉATION DE COURS (AVEC MODE TURBO "ENREGISTRER & SUIVANT") */}
      {/* ======================================================== */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Planifier un cours</h2>
                <p className="text-xs text-slate-500">
                  {formData.day_of_week} de {formData.start_time} à {formData.end_time}
                </p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              {/* Classe */}
              <ConflictField hasConflict={hasConflict('class_id')} message={getConflictMessage('class_id')}>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Classe / Filière *</label>
                  <select
                    value={formData.class_id}
                    onChange={(e) => handleClassSelectInForm(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  >
                    <option value="">-- Sélectionner la classe --</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.room ? `(Salle: ${c.room})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </ConflictField>

              {/* Cours (Filtré pour la classe) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Module / Cours *
                  <span className="text-[10px] text-slate-400 font-normal ml-1">
                    ({getFilteredCourses().length} modules disponibles pour cette filière)
                  </span>
                </label>
                <select
                  value={formData.course_id}
                  onChange={(e) => handleCourseSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  <option value="">-- Choisir le module --</option>
                  {getFilteredCourses().map(c => (
                    <option key={c.id} value={c.id}>
                      {c.title} {c.code ? `[${c.code}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Enseignant (Auto-sélectionné avec le cours) */}
              <ConflictField hasConflict={hasConflict('teacher_id')} message={getConflictMessage('teacher_id')}>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Enseignant responsable *</label>
                  <select
                    value={formData.teacher_id}
                    onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  >
                    <option value="">-- Sélectionner l'enseignant --</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.first_name} {t.last_name} {t.speciality ? `(${t.speciality})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </ConflictField>

              {/* Jour et Heures */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Jour *</label>
                  <select
                    value={formData.day_of_week}
                    onChange={(e) => setFormData({ ...formData, day_of_week: e.target.value })}
                    className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  >
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Début *</label>
                  <select
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-2 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  >
                    {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fin *</label>
                  <select
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-2 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  >
                    {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Salle & Bâtiment avec RoomSelect */}
              <ConflictField hasConflict={hasConflict('room')} message={getConflictMessage('room')}>
                <RoomSelect
                  roomValue={formData.room}
                  buildingValue={formData.building}
                  onRoomChange={(room, building) => setFormData({ ...formData, room, building: building || '' })}
                />
              </ConflictField>

              {checking && (
                <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 p-2 rounded-lg">
                  <Loader2 size={13} className="animate-spin" />
                  Vérification des disponibilités (salle et enseignant)...
                </div>
              )}
            </div>

            {/* BOUTONS D'ACTION (AVEC BOUTON TURBO MODE) */}
            <div className="flex flex-col sm:flex-row gap-2 mt-5 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium"
              >
                Annuler
              </button>

              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Enregistrer & Fermer
              </button>

              {/* BOUTON RAPIDE TURBO : ENREGISTRER & CRÉNEAU SUIVANT */}
              <button
                onClick={handleCreateAndNext}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
                title="Enregistre ce cours et avance l'heure au créneau suivant sans fermer la fenêtre"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                ⚡ Enregistrer & Suivant ⏭️
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL DUPLICATION RAPIDE D'UN COURS */}
      {/* ======================================================== */}
      {showDuplicateModal && selectedSchedule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Copy size={16} className="text-[#FF6B00]" />
                Dupliquer le cours
              </h2>
              <button onClick={() => setShowDuplicateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl mb-4 text-xs">
              <p className="font-bold text-slate-800">{selectedSchedule.course_title}</p>
              <p className="text-slate-500 mt-0.5">
                {selectedSchedule.class_name} • {selectedSchedule.start_time} - {selectedSchedule.end_time}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Dupliquer vers quel jour ?
              </label>
              <select
                value={duplicateTargetDay}
                onChange={(e) => setDuplicateTargetDay(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              >
                {DAYS.filter(d => d !== selectedSchedule.day_of_week).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowDuplicateModal(false)}
                className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleDuplicate}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Dupliquer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL PLANIFICATEUR AUTOMATIQUE INTELLIGENT */}
      {/* ======================================================== */}
      {showAutoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles size={18} className="text-amber-500" />
                Planificateur Automatique
              </h2>
              <button onClick={() => setShowAutoModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <p>
                L'assistant va distribuer harmonieusement les modules de la classe sur la semaine (Lundi au Samedi, créneaux de 08:00 à 18:00) en évitant automatiquement les conflits de salle et d'enseignant.
              </p>

              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl">
                <span className="font-semibold text-amber-900">Classe cible : </span>
                <span className="font-bold text-amber-800">
                  {activeClass ? activeClass.name : 'Veuillez sélectionner une classe'}
                </span>
                {activeClass?.room && (
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Salle : {activeClass.room} ({activeClass.building || 'Bloc A'})
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-5 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowAutoModal(false)}
                className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleAutoGenerate}
                disabled={generating || !selectedClassId}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Générer la semaine type
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL MODIFICATION D'UN COURS */}
      {/* ======================================================== */}
      {showEditModal && selectedSchedule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">Modifier le cours</h2>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Module *</label>
                <select
                  value={formData.course_id}
                  onChange={(e) => handleCourseSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.title} ({c.level})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Classe *</label>
                <select
                  value={formData.class_id}
                  onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Enseignant *</label>
                <select
                  value={formData.teacher_id}
                  onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Jour *</label>
                  <select
                    value={formData.day_of_week}
                    onChange={(e) => setFormData({ ...formData, day_of_week: e.target.value })}
                    className="w-full px-2 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  >
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Début *</label>
                  <select
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-2 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  >
                    {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fin *</label>
                  <select
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-2 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  >
                    {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <RoomSelect
                roomValue={formData.room}
                buildingValue={formData.building}
                onRoomChange={(room, building) => setFormData({ ...formData, room, building: building || '' })}
              />
            </div>

            <div className="flex gap-2 mt-5 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleEdit}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Enregistrer les modifications
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL CONFIGURATION DES CRÉNEAUX HORAIRES */}
      {/* ======================================================== */}
      {showSlotsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-orange-100 rounded-xl text-[#FF6B00]">
                  <Clock size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Configurer les Créneaux Horaires</h2>
                  <p className="text-xs text-slate-500">
                    Modifiez les heures de début, de fin et identifiez les pauses
                  </p>
                </div>
              </div>
              <button onClick={() => setShowSlotsModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                {editingSlots.map((slot, index) => (
                  <div key={index} className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/50">
                    <span className="text-xs font-mono font-bold text-slate-400 w-5">#{index + 1}</span>
                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Début</label>
                        <select
                          value={slot.start}
                          onChange={(e) => handleUpdateSlot(index, 'start', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
                        >
                          {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Fin</label>
                        <select
                          value={slot.end}
                          onChange={(e) => handleUpdateSlot(index, 'end', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
                        >
                          {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Libellé affiché</label>
                        <input
                          type="text"
                          value={slot.label}
                          onChange={(e) => handleUpdateSlot(index, 'label', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
                          placeholder="Ex: 08:30 - 10:30"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 pt-4">
                      <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer mr-1">
                        <input
                          type="checkbox"
                          checked={!!slot.isBreak}
                          onChange={(e) => handleUpdateSlot(index, 'isBreak', e.target.checked)}
                          className="rounded text-[#FF6B00] focus:ring-[#FF6B00]"
                        />
                        <span className="hidden sm:inline">Pause</span>
                      </label>
                      <button
                        onClick={() => handleDeleteSlot(index)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                        title="Supprimer ce créneau"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddSlot}
                className="w-full py-2 border border-dashed border-slate-300 hover:border-[#FF6B00] hover:bg-orange-50/30 text-slate-600 hover:text-[#FF6B00] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                <Plus size={15} />
                Ajouter un créneau horaire
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 mt-5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleResetSlots}
                className="px-3 py-2 text-slate-500 hover:text-slate-800 text-xs font-medium"
              >
                Réinitialiser par défaut
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSlotsModal(false)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSaveSlots}
                  className="px-4 py-2 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
                >
                  <Save size={14} />
                  Enregistrer les créneaux
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* RÈGLES CSS POUR IMPRESSION PAYSAGE (LANDSCAPE) STRICTE 1 PAGE */}
      {/* ======================================================== */}
      <style jsx global>{`
        @page {
          size: landscape !important;
          margin: 3mm 5mm !important;
        }
        @media print {
          html, body {
            width: 297mm !important;
            height: 204mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            overflow: hidden !important;
            zoom: 93% !important;
          }
          body * {
            visibility: hidden;
          }
          #printable-schedule,
          #printable-schedule * {
            visibility: visible;
          }
          #printable-schedule {
            position: relative !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 288mm !important;
            max-height: 198mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
            overflow: hidden !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            box-sizing: border-box !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          .print\\:grid {
            display: grid !important;
          }
          .print\\:flex {
            display: flex !important;
          }
          table {
            width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          th, td {
            border: 1px solid #cbd5e1 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          th {
            background-color: #f1f5f9 !important;
            color: #0f172a !important;
            font-weight: 800 !important;
            padding: 3px 4px !important;
            font-size: 9.5px !important;
          }
          td {
            height: auto !important;
            padding: 1.5px 2px !important;
          }
        }
      `}</style>
    </div>
  );
}