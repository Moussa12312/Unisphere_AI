'use client';

import { useState, useEffect, useMemo, use } from 'react';
import Link from 'next/link';
import {
  Calendar, Clock, MapPin, Users, BookOpen, Plus, Edit3, Trash2,
  Printer, ChevronLeft, Building2, UserCheck, Sparkles, Filter,
  Save, X, Loader2, CheckCircle2, AlertCircle
} from 'lucide-react';
import { examScheduleService, ExamScheduleItem, ExamMatrixData } from '@/services/examScheduleService';
import { examSessionService, ExamSession } from '@/services/examSessionService';
import { classService, ClassRoom } from '@/services/classService';
import { courseService, Course } from '@/services/courseService';
import { teacherService } from '@/services/teacherService';
import { universityService } from '@/services/universityService';
import RoomSelect from '@/components/RoomSelect';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/hooks/useConfirm';

interface PageProps {
  params: Promise<{ id: string }>;
}

const DEFAULT_EXAM_SLOTS = [
  { start: '08:30', end: '10:30', label: '8h30 - 10h30' },
  { start: '11:00', end: '13:00', label: '11h00 - 13h00' },
  { start: '13:15', end: '15:15', label: '13h15 - 15h15' },
  { start: '15:30', end: '17:30', label: '15h30 - 17h30' },
];

export default function SecretaryExamSchedulePage({ params }: PageProps) {
  const { id } = use(params);
  const sessionId = parseInt(id);

  const toast = useToast();
  const { confirm } = useConfirm();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<ExamSession | null>(null);
  const [matrixData, setMatrixData] = useState<ExamMatrixData | null>(null);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [universityInfo, setUniversityInfo] = useState({
    name: 'UNIVERSITÉ UNISPHERE',
    slogan: '',
    logo: null as string | null,
    academic_year: '2025-2026'
  });

  // Modales
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState<ExamScheduleItem | null>(null);
  const [savingSlot, setSavingSlot] = useState(false);

  // Formulaire d'épreuve
  const [formData, setFormData] = useState({
    class_id: '',
    course_id: '',
    exam_date: '',
    start_time: '08:30',
    end_time: '10:30',
    room: '',
    building: '',
    supervisor_id: '',
    supervisor_name: '',
    notes: ''
  });

  useEffect(() => {
    loadAll();
  }, [sessionId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [sessData, matrix, classesData, coursesData, teachersData, univ] = await Promise.all([
        examSessionService.getById(sessionId).catch(() => null),
        examScheduleService.getMatrix(sessionId).catch(() => null),
        classService.getAll(),
        courseService.getAll(),
        teacherService.getAll(),
        universityService.getInfo().catch(() => null)
      ]);

      if (sessData) setSession(sessData);
      if (matrix) setMatrixData(matrix);
      setClasses(classesData);
      setCourses(coursesData);
      setTeachers(teachersData);

      if (univ) {
        setUniversityInfo({
          name: univ.name || 'UNIVERSITÉ UNISPHERE',
          slogan: univ.slogan || '',
          logo: univ.logo ? (univ.logo.startsWith('/') ? univ.logo : `/uploads/logos/${univ.logo}`) : null,
          academic_year: univ.academic_year || '2025-2026'
        });
      }
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors du chargement du calendrier');
    } finally {
      setLoading(false);
    }
  };

  const reloadMatrix = async () => {
    try {
      const matrix = await examScheduleService.getMatrix(sessionId);
      setMatrixData(matrix);
    } catch (error) {
      console.error(error);
    }
  };

  const openNewSlotModal = (prefillDate?: string, prefillSlot?: string, prefillClassId?: number) => {
    setEditingSlot(null);
    let sTime = '08:30';
    let eTime = '10:30';
    if (prefillSlot) {
      const parts = prefillSlot.split('-').map(p => p.trim());
      if (parts.length === 2) {
        sTime = parts[0];
        eTime = parts[1];
      }
    }

    setFormData({
      class_id: prefillClassId ? prefillClassId.toString() : (classes[0]?.id.toString() || ''),
      course_id: '',
      exam_date: prefillDate || session?.start_date || new Date().toISOString().slice(0, 10),
      start_time: sTime,
      end_time: eTime,
      room: '',
      building: '',
      supervisor_id: '',
      supervisor_name: '',
      notes: ''
    });
    setShowSlotModal(true);
  };

  const openEditSlotModal = (item: ExamScheduleItem) => {
    setEditingSlot(item);
    setFormData({
      class_id: item.class_id.toString(),
      course_id: item.course_id.toString(),
      exam_date: item.exam_date,
      start_time: item.start_time,
      end_time: item.end_time,
      room: item.room || '',
      building: item.building || '',
      supervisor_id: item.supervisor_id ? item.supervisor_id.toString() : '',
      supervisor_name: item.supervisor_name || '',
      notes: item.notes || ''
    });
    setShowSlotModal(true);
  };

  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.class_id || !formData.course_id || !formData.exam_date) {
      toast.error('Veuillez renseigner la classe, la matière et la date');
      return;
    }

    setSavingSlot(true);
    try {
      const payload = {
        class_id: parseInt(formData.class_id),
        course_id: parseInt(formData.course_id),
        exam_date: formData.exam_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        room: formData.room || null,
        building: formData.building || null,
        supervisor_id: formData.supervisor_id ? parseInt(formData.supervisor_id) : null,
        supervisor_name: formData.supervisor_name || null,
        notes: formData.notes || null
      };

      if (editingSlot) {
        await examScheduleService.update(sessionId, editingSlot.id, payload);
        toast.success('Épreuve d\'examen mise à jour !');
      } else {
        await examScheduleService.create(sessionId, payload);
        toast.success('Épreuve d\'examen ajoutée au calendrier !');
      }

      setShowSlotModal(false);
      await reloadMatrix();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'enregistrement de l\'épreuve');
    } finally {
      setSavingSlot(false);
    }
  };

  const handleDeleteSlot = async (item: ExamScheduleItem) => {
    const ok = await confirm({
      title: 'Supprimer l\'épreuve d\'examen ?',
      message: `Voulez-vous supprimer l'épreuve "${item.course_title}" pour la classe ${item.class_name} ?`,
      confirmText: 'Supprimer',
      variant: 'danger'
    });
    if (!ok) return;

    try {
      await examScheduleService.delete(sessionId, item.id);
      toast.success('Épreuve supprimée');
      await reloadMatrix();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  // Matières filtrées pour la classe sélectionnée dans la modale
  const filteredCoursesForModal = useMemo(() => {
    if (!formData.class_id) return courses;
    const cls = classes.find(c => c.id.toString() === formData.class_id);
    if (!cls) return courses;
    return courses.filter(c => {
      if (cls.filiere_id && c.filiere_id) return c.filiere_id === cls.filiere_id;
      return c.level === cls.level;
    });
  }, [formData.class_id, classes, courses]);

  // Liste des dates
  const activeDates = matrixData?.dates && matrixData.dates.length > 0
    ? matrixData.dates
    : (session?.start_date ? [session.start_date] : []);

  // Liste des créneaux
  const activeTimeSlots = matrixData?.time_slots && matrixData.time_slots.length > 0
    ? matrixData.time_slots
    : DEFAULT_EXAM_SLOTS.map(s => `${s.start} - ${s.end}`);

  // Liste des classes participantes
  const activeClasses = matrixData?.classes && matrixData.classes.length > 0
    ? matrixData.classes
    : classes.slice(0, 8);

  const getSlotItem = (dateStr: string, slotStr: string, classId: number): ExamScheduleItem | undefined => {
    if (!matrixData?.items) return undefined;
    return matrixData.items.find(
      it => it.exam_date === dateStr && it.time_slot === slotStr && it.class_id === classId
    );
  };

  const formatDateFr = (dStr: string) => {
    try {
      const d = new Date(dStr);
      return d.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dStr;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="w-10 h-10 border-4 border-orange-200 border-t-[#FF6B00] rounded-full animate-spin" />
        <p className="text-slate-500 font-medium text-xs">Chargement du calendrier des examens...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto p-4 sm:p-6">
      {/* ======================================================== */}
      {/* BARRE D'ACTION SUPÉRIEURE (Masquée à l'impression) */}
      {/* ======================================================== */}
      <div className="print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/secretary/exam-sessions"
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            title="Retour aux sessions d'examens"
          >
            <ChevronLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-[#FF6B00] border border-orange-200">
                <Calendar size={12} />
                Session d'Examens
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {session?.name || 'Session en cours'}
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              Calendrier Officiel des Examens
            </h1>
            <p className="text-xs text-slate-500">
              Période : du {session?.start_date ? formatDateFr(session.start_date) : 'N/A'} au {session?.end_date ? formatDateFr(session.end_date) : 'N/A'} (dimanche exclu)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Bouton Impression */}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95"
            title="Imprimer le calendrier officiel au format A4 paysage"
          >
            <Printer size={15} className="text-[#FF6B00]" />
            Imprimer Calendrier A4 Paysage
          </button>

          {/* Bouton Ajouter épreuve */}
          <button
            onClick={() => openNewSlotModal()}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
          >
            <Plus size={16} />
            Planifier une épreuve
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* ZONE PRINCIPALE ET DOCUMENT OFFICIEL D'IMPRESSION */}
      {/* ======================================================== */}
      <div id="printable-exam-schedule" className="space-y-4">
        {/* EN-TÊTE INSTITUTIONNEL OFFICIEL (STYLE RÉPUBLIQUE DU MALI & MINISTÈRE) */}
        <div className="hidden print:block mb-3 p-3 bg-white border border-slate-800 rounded-lg">
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-2 mb-2">
            {/* Gauche : Université */}
            <div className="flex items-center gap-3">
              {universityInfo.logo ? (
                <img
                  src={universityInfo.logo}
                  alt="Logo Université"
                  className="h-12 w-12 object-contain rounded border border-slate-300 p-0.5"
                />
              ) : (
                <div className="h-12 w-12 rounded bg-slate-900 text-white flex items-center justify-center font-black text-sm border border-amber-400">
                  {universityInfo.name.slice(0, 4)}
                </div>
              )}
              <div>
                <h2 className="text-sm font-black uppercase text-slate-950 tracking-wide leading-tight">
                  {universityInfo.name}
                </h2>
                {universityInfo.slogan && (
                  <p className="text-[9.5px] italic font-semibold text-slate-600">
                    {universityInfo.slogan}
                  </p>
                )}
              </div>
            </div>

            {/* Droite : République du Mali */}
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-900">
                RÉPUBLIQUE DU MALI
              </p>
              <p className="text-[8px] italic font-semibold text-slate-600">
                Un Peuple — Un But — Une Foi
              </p>
              <p className="text-[8.5px] font-bold text-slate-800 uppercase mt-0.5">
                MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR ET DE LA RECHERCHE SCIENTIFIQUE
              </p>
            </div>
          </div>

          {/* Titre Centré Officiel */}
          <div className="text-center my-1.5">
            <h3 className="text-base font-black uppercase tracking-wide text-slate-950">
              Calendrier des Examens Finals {session?.name || 'Session Officielle'}
            </h3>
            <p className="text-[11px] font-bold text-slate-800 mt-0.5">
              Période : du {session?.start_date ? formatDateFr(session.start_date) : '...'} au {session?.end_date ? formatDateFr(session.end_date) : '...'} (dimanche exclu)
            </p>
          </div>
        </div>

        {/* ======================================================== */}
        {/* LE GRAND TABLEAU MATRICIEL DES ÉPREUVES (EXEMPLAIRE AU MUR) */}
        {/* ======================================================== */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-xs print:border-none print:shadow-none">
          <table className="w-full border-collapse min-w-[1000px] print:min-w-0 print:w-full print:table-fixed text-xs">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-300 print:bg-slate-200">
                <th className="py-2.5 px-3 text-left font-black text-slate-900 w-36 print:w-[13%] border-r border-slate-300 uppercase tracking-wider">
                  Date
                </th>
                <th className="py-2.5 px-3 text-center font-black text-slate-900 w-28 print:w-[11%] border-r border-slate-300 uppercase tracking-wider">
                  Horaire
                </th>
                {activeClasses.map(cls => (
                  <th
                    key={cls.id}
                    className="py-2.5 px-2 text-center font-black text-slate-900 border-r last:border-r-0 border-slate-300 uppercase tracking-wider print:text-[10px]"
                  >
                    <div className="truncate">{cls.name}</div>
                    {cls.room && (
                      <span className="block text-[9px] font-semibold text-slate-500 normal-case opacity-90 print:hidden">
                        (Salle: {cls.room})
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {activeDates.map((dateStr) => {
                return activeTimeSlots.map((slotStr, sIdx) => {
                  return (
                    <tr
                      key={`${dateStr}-${slotStr}`}
                      className="hover:bg-slate-50/40 transition-colors"
                    >
                      {/* Colonne Date (Fusionnée visuellement par jour ou affichée à la première ligne du jour) */}
                      {sIdx === 0 ? (
                        <td
                          rowSpan={activeTimeSlots.length}
                          className="py-2.5 px-3 font-extrabold text-slate-900 bg-slate-50/80 border-r border-slate-300 align-middle text-center print:bg-slate-100"
                        >
                          <div className="leading-snug capitalize text-slate-900 font-black text-xs print:text-[10.5px]">
                            {formatDateFr(dateStr)}
                          </div>
                        </td>
                      ) : null}

                      {/* Colonne Horaire */}
                      <td className="py-2 px-2 text-center font-bold text-slate-800 bg-slate-50/40 border-r border-slate-300 whitespace-nowrap text-[11px] print:text-[10px]">
                        {slotStr}
                      </td>

                      {/* Colonnes par Classe / Promotion */}
                      {activeClasses.map(cls => {
                        const item = getSlotItem(dateStr, slotStr, cls.id);

                        return (
                          <td
                            key={cls.id}
                            className={`p-1.5 border-r last:border-r-0 border-slate-300 align-top relative group transition-colors ${
                              item ? 'bg-orange-50/20' : 'hover:bg-slate-50/60'
                            }`}
                          >
                            {item ? (
                              <div className="h-full flex flex-col justify-between bg-white border border-slate-300 rounded-lg p-1.5 shadow-2xs print:border-none print:shadow-none print:p-0.5">
                                <div>
                                  <div className="flex items-start justify-between gap-1">
                                    <p className="font-extrabold text-slate-950 text-xs leading-tight print:text-[10px] print:font-black">
                                      {item.course_title}
                                    </p>
                                    <div className="flex items-center gap-0.5 print:hidden opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={() => openEditSlotModal(item)}
                                        className="p-1 text-slate-400 hover:text-slate-700 rounded"
                                        title="Modifier l'épreuve"
                                      >
                                        <Edit3 size={11} />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteSlot(item)}
                                        className="p-1 text-slate-400 hover:text-red-600 rounded"
                                        title="Supprimer l'épreuve"
                                      >
                                        <Trash2 size={11} />
                                      </button>
                                    </div>
                                  </div>

                                  {(item.room || item.building) && (
                                    <p className="text-[10px] font-semibold text-slate-700 flex items-center gap-0.5 mt-0.5 print:text-[8.5px]">
                                      📍 {item.room} {item.building && `(${item.building})`}
                                    </p>
                                  )}
                                </div>

                                {item.supervisor_name && (
                                  <p className="text-[9.5px] font-medium text-slate-500 mt-1 truncate print:text-[8px] print:text-slate-700">
                                    👤 {item.supervisor_name}
                                  </p>
                                )}
                              </div>
                            ) : (
                              /* Case vide : bouton 1-clic pour planifier directement */
                              <button
                                type="button"
                                onClick={() => openNewSlotModal(dateStr, slotStr, cls.id)}
                                className="w-full h-full min-h-[44px] rounded-lg border border-dashed border-slate-200 hover:border-[#FF6B00] hover:bg-orange-50/40 text-slate-300 hover:text-[#FF6B00] flex items-center justify-center transition-all print:hidden"
                                title={`Planifier pour ${cls.name} le ${dateStr} à ${slotStr}`}
                              >
                                <Plus size={14} />
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>

        {/* PIED DE PAGE OFFICIEL ET SIGNATURE (IDENTIQUE AU MODÈLE DE BAMAKO SUR LE MUR) */}
        <div className="hidden print:block mt-3 pt-2 text-xs text-slate-800">
          <p className="text-[10px] italic font-semibold text-slate-600 mb-3">
            NB. Ce calendrier pourrait subir des modifications en fonction des exigences pédagogiques.
          </p>

          <div className="flex items-end justify-between">
            <div className="text-[9px] font-mono text-slate-500">
              UniSphere AI • Système d'Information Universitaire Certifié
            </div>

            <div className="text-right">
              <p className="text-[11px] font-bold text-slate-800">
                Fait à Bamako, le {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
              <div className="mt-1">
                <p className="text-xs font-black uppercase text-slate-950">
                  La Direction Générale
                </p>
                <div className="h-14 flex items-center justify-end">
                  <div className="border border-dashed border-blue-400 rounded-full w-20 h-20 flex items-center justify-center text-[9px] text-blue-600 font-black rotate-[-12deg] opacity-75">
                    [ CACHET & VISA ]
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL PLANIFIER / MODIFIER UNE ÉPREUVE D'EXAMEN */}
      {/* ======================================================== */}
      {showSlotModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-orange-100 text-[#FF6B00] rounded-xl">
                  <Calendar size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {editingSlot ? 'Modifier l\'épreuve' : 'Planifier une épreuve d\'examen'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Session : {session?.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSlotModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSlot} className="space-y-4 mt-4">
              {/* Classe cible */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Classe / Promotion concernée <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.class_id}
                  onChange={(e) => setFormData({ ...formData, class_id: e.target.value, course_id: '' })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  <option value="">Sélectionner la classe...</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.level}) {c.room ? `• Salle ${c.room}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Matière / Épreuve */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Matière d'examen <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.course_id}
                  onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  <option value="">Sélectionner la matière à composer...</option>
                  {filteredCoursesForModal.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.title} {c.code ? `(${c.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Horaires */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date de composition <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.exam_date}
                    onChange={(e) => setFormData({ ...formData, exam_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Heure Début
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Heure Fin
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  />
                </div>
              </div>

              {/* Salle & Bâtiment via RoomSelect */}
              <RoomSelect
                roomValue={formData.room}
                buildingValue={formData.building}
                onRoomChange={(room, building) => setFormData({ ...formData, room, building: building || '' })}
                label="Salle d'examen enregistrée"
              />

              {/* Surveillant */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Enseignant surveillant
                  </label>
                  <select
                    value={formData.supervisor_id}
                    onChange={(e) => {
                      const sid = e.target.value;
                      const teacher = teachers.find(t => t.id.toString() === sid);
                      setFormData({
                        ...formData,
                        supervisor_id: sid,
                        supervisor_name: teacher ? `${teacher.first_name} ${teacher.last_name}` : formData.supervisor_name
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  >
                    <option value="">Sélectionner dans la liste...</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.first_name} {t.last_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Libellé surveillant
                  </label>
                  <input
                    type="text"
                    placeholder="Nom ou surveillant externe"
                    value={formData.supervisor_name}
                    onChange={(e) => setFormData({ ...formData, supervisor_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSlotModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={savingSlot}
                  className="px-5 py-2 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
                >
                  {savingSlot ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Enregistrer l'épreuve
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* RÈGLES D'IMPRESSION A4 PAYSAGE POUR LE CALENDRIER OFFICIEL */}
      {/* ======================================================== */}
      <style jsx global>{`
        @page {
          size: landscape !important;
          margin: 4mm 6mm !important;
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
          #printable-exam-schedule,
          #printable-exam-schedule * {
            visibility: visible;
          }
          #printable-exam-schedule {
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
            border: 1px solid #64748b !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          th {
            background-color: #f1f5f9 !important;
            color: #0f172a !important;
            font-weight: 900 !important;
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
