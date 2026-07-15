'use client';
import { useState, useEffect } from 'react';
import {
  Calendar, Plus, Search, Edit3, Trash2, X, Save,
  Loader2, Clock, MapPin, Users, BookOpen
} from 'lucide-react';
import { scheduleService, Schedule } from '@/services/scheduleService';
import { courseService } from '@/services/courseService';
import { classService } from '@/services/classService';
import { teacherService } from '@/services/teacherService';
import { useConflictCheck } from '@/hooks/useConflictCheck';
import ConflictField from '@/components/ConflictField';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/hooks/useConfirm';

export default function SecretarySchedulePage() {
  const toast = useToast();
  const { confirm } = useConfirm();
  
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDay, setFilterDay] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [formData, setFormData] = useState({
    course_id: '',
    class_id: '',
    teacher_id: '',
    room: '',
    building: '',
    day_of_week: '',
    start_time: '',
    end_time: '',
  });
  const [saving, setSaving] = useState(false);

  const {
    checking,
    checkScheduleConflicts,
    hasConflict,
    getConflictMessage,
    clearConflicts
  } = useConflictCheck();

  const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const timeSlots = [
    '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
    '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
    '19:00', '19:30', '20:00'
  ];

  useEffect(() => {
    loadAll();
  }, []);

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
      const [schedulesData, coursesData, classesData, teachersData] = await Promise.all([
        scheduleService.getAll(),
        courseService.getAll(),
        classService.getAll(),
        teacherService.getAll()
      ]);
      setSchedules(schedulesData);
      setCourses(coursesData);
      setClasses(classesData);
      setTeachers(teachersData);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      course_id: '',
      class_id: '',
      teacher_id: '',
      room: '',
      building: '',
      day_of_week: '',
      start_time: '',
      end_time: '',
    });
    clearConflicts();
  };

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
      loadAll();
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
      toast.success('Emploi du temps modifié !');
      setShowEditModal(false);
      resetForm();
      loadAll();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la modification');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (schedule: Schedule) => {
    const ok = await confirm({
      title: 'Supprimer ce cours ?',
      message: `Voulez-vous vraiment supprimer le cours "${schedule.course_title}" du ${schedule.day_of_week} à ${schedule.start_time} ? Cette action est irréversible.`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
      icon: 'trash'
    });
    
    if (ok) {
      try {
        await scheduleService.delete(schedule.id);
        toast.success('Cours supprimé de l\'emploi du temps !');
        loadAll();
      } catch (error: any) {
        toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
      }
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

  const filteredSchedules = schedules.filter(schedule => {
    const matchSearch =
      schedule.course_title.toLowerCase().includes(search.toLowerCase()) ||
      schedule.class_name.toLowerCase().includes(search.toLowerCase()) ||
      schedule.teacher_name.toLowerCase().includes(search.toLowerCase());
    const matchDay = !filterDay || schedule.day_of_week === filterDay;
    return matchSearch && matchDay;
  });

  const schedulesByDay = days.map(day => ({
    day,
    schedules: filteredSchedules
      .filter(s => s.day_of_week === day)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
  }));

  const stats = {
    total: schedules.length,
    days: [...new Set(schedules.map(s => s.day_of_week))].length,
    courses: [...new Set(schedules.map(s => s.course_id))].length,
    teachers: [...new Set(schedules.map(s => s.teacher_id))].length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B00] border-t-transparent"></div>
      </div>
    );
  }

  const fieldClass = (fieldName: string, baseClass: string) => {
    if (hasConflict(fieldName)) {
      return `${baseClass} border-red-500 bg-red-50 focus:ring-red-500`;
    }
    return baseClass;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Emploi du temps</h1>
          <p className="text-slate-500 mt-1">Planifiez les cours de l'université</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-sm font-medium transition-all shadow-md"
        >
          <Plus size={16} />
          Planifier un cours
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total cours</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Clock size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Jours actifs</p>
              <p className="text-2xl font-bold text-slate-900">{stats.days}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <BookOpen size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Cours différents</p>
              <p className="text-2xl font-bold text-slate-900">{stats.courses}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Users size={20} className="text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Enseignants</p>
              <p className="text-2xl font-bold text-slate-900">{stats.teachers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="🔍 Rechercher par cours, classe, enseignant..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>
          <select
            value={filterDay}
            onChange={(e) => setFilterDay(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          >
            <option value="">Tous les jours</option>
            {days.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {/* Vue par jour */}
      <div className="space-y-4">
        {schedulesByDay.map(({ day, schedules: daySchedules }) => (
          daySchedules.length > 0 && (
            <div key={day} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-[#FF6B00] to-orange-500 px-5 py-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Calendar size={18} />
                  {day}
                  <span className="text-sm font-normal bg-white/20 px-2 py-0.5 rounded-full ml-2">
                    {daySchedules.length} cours
                  </span>
                </h3>
              </div>
              <div className="divide-y divide-slate-100">
                {daySchedules.map((schedule) => (
                  <div key={schedule.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex flex-col items-center justify-center min-w-[80px]">
                          <div className="text-xs text-slate-500">Début</div>
                          <div className="text-lg font-bold text-[#FF6B00]">{schedule.start_time}</div>
                        </div>
                        <div className="text-slate-300">→</div>
                        <div className="flex flex-col items-center justify-center min-w-[80px]">
                          <div className="text-xs text-slate-500">Fin</div>
                          <div className="text-lg font-bold text-slate-700">{schedule.end_time}</div>
                        </div>
                        <div className="h-12 w-px bg-slate-200 mx-2"></div>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900">{schedule.course_title}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Users size={12} />
                              {schedule.class_name}
                            </span>
                            <span className="flex items-center gap-1">
                              🎓 {schedule.teacher_name}
                            </span>
                            {schedule.room && (
                              <span className="flex items-center gap-1">
                                <MapPin size={12} />
                                {schedule.room} {schedule.building && `(${schedule.building})`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(schedule)}
                          className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(schedule)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        ))}
        {filteredSchedules.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
            <Calendar size={48} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Aucun cours planifié</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-block mt-4 text-sm text-[#FF6B00] hover:underline"
            >
              Planifier le premier cours →
            </button>
          </div>
        )}
      </div>

      {/* MODAL CRÉATION */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">Planifier un cours</h2>
              <button onClick={() => { setShowCreateModal(false); resetForm(); }} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Cours *</label>
                <select
                  value={formData.course_id}
                  onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  <option value="">Sélectionner un cours...</option>
                  {courses.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.level})
                    </option>
                  ))}
                </select>
              </div>
              <ConflictField hasConflict={hasConflict('class_id')} message={getConflictMessage('class_id')}>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Classe *</label>
                  <select
                    value={formData.class_id}
                    onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                    className={fieldClass('class_id', 'w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2')}
                  >
                    <option value="">Sélectionner une classe...</option>
                    {classes.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </ConflictField>
              <ConflictField hasConflict={hasConflict('teacher_id')} message={getConflictMessage('teacher_id')}>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Enseignant *</label>
                  <select
                    value={formData.teacher_id}
                    onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                    className={fieldClass('teacher_id', 'w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2')}
                  >
                    <option value="">Sélectionner un enseignant...</option>
                    {teachers.map((t: any) => (
                      <option key={t.id} value={t.id}>
                        {t.first_name} {t.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              </ConflictField>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Jour *</label>
                <select
                  value={formData.day_of_week}
                  onChange={(e) => setFormData({ ...formData, day_of_week: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  <option value="">Sélectionner un jour...</option>
                  {days.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Heure début *</label>
                  <select
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  >
                    <option value="">Début...</option>
                    {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Heure fin *</label>
                  <select
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  >
                    <option value="">Fin...</option>
                    {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <ConflictField hasConflict={hasConflict('room')} message={getConflictMessage('room')}>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Salle</label>
                    <input
                      type="text"
                      value={formData.room}
                      onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                      placeholder="Ex: Salle 101"
                      className={fieldClass('room', 'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2')}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Bâtiment</label>
                    <input
                      type="text"
                      value={formData.building}
                      onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                      placeholder="Ex: Bloc A"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                    />
                  </div>
                </div>
              </ConflictField>
              {checking && (
                <div className="flex items-center gap-2 text-xs text-blue-600">
                  <Loader2 size={12} className="animate-spin" />
                  Vérification des conflits...
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Création...' : 'Planifier'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MODIFICATION */}
      {showEditModal && selectedSchedule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">Modifier le cours</h2>
              <button onClick={() => { setShowEditModal(false); resetForm(); }} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Cours *</label>
                <select
                  value={formData.course_id}
                  onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  {courses.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.title} ({c.level})</option>
                  ))}
                </select>
              </div>
              <ConflictField hasConflict={hasConflict('class_id')} message={getConflictMessage('class_id')}>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Classe *</label>
                  <select
                    value={formData.class_id}
                    onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                    className={fieldClass('class_id', 'w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2')}
                  >
                    {classes.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </ConflictField>
              <ConflictField hasConflict={hasConflict('teacher_id')} message={getConflictMessage('teacher_id')}>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Enseignant *</label>
                  <select
                    value={formData.teacher_id}
                    onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                    className={fieldClass('teacher_id', 'w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2')}
                  >
                    {teachers.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                    ))}
                  </select>
                </div>
              </ConflictField>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Jour *</label>
                <select
                  value={formData.day_of_week}
                  onChange={(e) => setFormData({ ...formData, day_of_week: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  {days.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Heure début *</label>
                  <select
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  >
                    {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Heure fin *</label>
                  <select
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  >
                    {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <ConflictField hasConflict={hasConflict('room')} message={getConflictMessage('room')}>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Salle</label>
                    <input
                      type="text"
                      value={formData.room}
                      onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                      className={fieldClass('room', 'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2')}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Bâtiment</label>
                    <input
                      type="text"
                      value={formData.building}
                      onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                    />
                  </div>
                </div>
              </ConflictField>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => { setShowEditModal(false); resetForm(); }}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleEdit}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}