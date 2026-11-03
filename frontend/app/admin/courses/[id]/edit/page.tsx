'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Save, Loader2, ArrowLeft, BookOpen, Layers } from 'lucide-react';
import Link from 'next/link';
import { courseService } from '@/services/courseService';
import { teacherService } from '@/services/teacherService';
import { filiereService } from '@/services/filiereService';
import { teachingUnitService, TeachingUnit } from '@/services/teachingUnitService';
import { getApiErrorMessage } from '@/lib/errorHandler';
import { toast } from 'react-hot-toast';

export default function EditCoursePage() {
  const router = useRouter();
  const params = useParams();
  const courseId = Number(params.id);

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [teachers, setTeachers] = useState<any[]>([]);
  const [filieres, setFilieres] = useState<any[]>([]);
  const [teachingUnits, setTeachingUnits] = useState<TeachingUnit[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    domain: '',
    filiere_id: '',
    level: '',
    semester: '',
    teaching_unit_id: '',
    teacher_id: '',
    credits: 3,
    hours: 20
  });

  const [originalCourse, setOriginalCourse] = useState<any>(null);

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

  // Charger les données initiales
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoadingData(true);
        const [courseData, filieresData, teachersData, unitsData] = await Promise.all([
          courseService.getById(courseId),
          filiereService.getAll(),
          teacherService.getAll(),
          teachingUnitService.getAll().catch(() => [])
        ]);

        setFilieres(filieresData);
        setTeachers(teachersData);
        setTeachingUnits(unitsData);

        const filiere = filieresData.find((f: any) => f.id === courseData.filiere_id);

        setOriginalCourse(courseData);
        setFormData({
          title: courseData.title || '',
          domain: filiere?.domain || '',
          filiere_id: courseData.filiere_id?.toString() || '',
          level: courseData.level || '',
          semester: courseData.semester || '',
          teaching_unit_id: courseData.teaching_unit_id?.toString() || '',
          teacher_id: courseData.teacher_id?.toString() || '',
          credits: courseData.credits || 3,
          hours: courseData.hours || 20
        });
      } catch (err: any) {
        console.error('Erreur chargement:', err);
        setError(err.response?.data?.detail || 'Erreur lors du chargement du module');
      } finally {
        setLoadingData(false);
      }
    };

    if (courseId) {
      loadInitialData();
    }
  }, [courseId]);

  // Calculs dérivés
  const domains = useMemo(() => [...new Set(filieres.map(f => f.domain))].filter(Boolean).sort(), [filieres]);
  const filieresOfDomain = useMemo(() => formData.domain ? filieres.filter(f => f.domain === formData.domain) : filieres, [filieres, formData.domain]);
  const selectedFiliere = useMemo(() => filieres.find(f => f.id === parseInt(formData.filiere_id)), [filieres, formData.filiere_id]);
  const levelsOfFiliere = useMemo(() => selectedFiliere?.levels?.split(',').map((l: string) => l.trim()) || ['L1', 'L2', 'L3', 'M1', 'M2'], [selectedFiliere]);
  const teachersOfFiliere = useMemo(() => formData.filiere_id ? teachers.filter(t => !t.filiere_id || t.filiere_id === parseInt(formData.filiere_id)) : teachers, [teachers, formData.filiere_id]);
  const filteredTeachingUnits = useMemo(() => formData.filiere_id ? teachingUnits.filter(u => !u.filiere_id || u.filiere_id === parseInt(formData.filiere_id)) : teachingUnits, [teachingUnits, formData.filiere_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Veuillez renseigner le titre du module');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        title: formData.title.trim(),
        filiere_id: formData.filiere_id ? parseInt(formData.filiere_id) : null,
        level: formData.level,
        semester: formData.semester || null,
        teaching_unit_id: formData.teaching_unit_id ? parseInt(formData.teaching_unit_id) : null,
        teacher_id: formData.teacher_id ? parseInt(formData.teacher_id) : null,
        credits: formData.credits,
        hours: formData.hours
      };

      await courseService.update(courseId, payload);
      toast.success('Module mis à jour avec succès !');
      router.push(`/admin/courses/${courseId}`);
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, 'Erreur lors de la modification'));
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-[#FF6B00]" />
        <p className="text-slate-500 font-medium">Chargement des données du module...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="text-5xl">⚠️</div>
        <h2 className="text-xl font-bold text-slate-900">Module introuvable</h2>
        <p className="text-slate-500">{error}</p>
        <Link href="/admin/courses" className="bg-[#FF6B00] text-white px-5 py-2.5 rounded-xl font-bold hover:bg-[#e55f00]">
          Retour à la liste des modules
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/admin/courses/${courseId}`}
          className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="text-[#FF6B00]" size={24} />
            Modifier le Module
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Code officiel permanent : <span className="font-mono font-bold text-[#FF6B00]">{originalCourse?.code}</span>
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-6">
        {/* Titre */}
        <div>
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
            Intitulé du Module *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          />
        </div>

        {/* Domaine & Filière */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Domaine *
            </label>
            <select
              value={formData.domain}
              onChange={(e) => setFormData({ ...formData, domain: e.target.value, filiere_id: '', level: '', teacher_id: '' })}
              required
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-white"
            >
              <option value="">Sélectionner un domaine...</option>
              {domains.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Filière *
            </label>
            <select
              value={formData.filiere_id}
              onChange={(e) => {
                const fid = e.target.value;
                const fObj = filieres.find(f => String(f.id) === String(fid));
                setFormData({ ...formData, filiere_id: fid, domain: fObj?.domain || formData.domain, level: '', teacher_id: '' });
              }}
              required
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-white"
            >
              <option value="">Sélectionner une filière...</option>
              {filieresOfDomain.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
        </div>

        {/* Niveau & SEMESTRE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Niveau *
            </label>
            <select
              value={formData.level}
              onChange={(e) => setFormData({ ...formData, level: e.target.value })}
              required
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-white"
            >
              <option value="">Sélectionner un niveau...</option>
              {levelsOfFiliere.map((l: string) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Semestre Concerné *</span>
              <span className="text-[10px] font-semibold text-[#FF6B00]">LMD</span>
            </label>
            <select
              value={formData.semester}
              onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
              className="w-full px-3.5 py-2.5 border-2 border-orange-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-white"
            >
              <option value="">Non assigné / Tous semestres</option>
              {allSemesters.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.level})</option>
              ))}
            </select>
          </div>

          {/* Boutons rapides de semestre */}
          <div className="md:col-span-2 pt-2 border-t border-slate-200/60">
            <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
              Changer rapidement de semestre :
            </span>
            <div className="flex flex-wrap gap-1.5">
              {allSemesters.map((s) => {
                const isSelected = formData.semester === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, semester: s.id })}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-[#FF6B00] text-white border-[#FF6B00] shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{s.id}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* UE de rattachement */}
        <div>
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Layers size={14} className="text-[#FF6B00]" />
            Unité d'Enseignement (UE) de Rattachement (Optionnel)
          </label>
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
            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-white"
          >
            <option value="">Aucune UE (Module autonome)</option>
            {filteredTeachingUnits.map((ue) => (
              <option key={ue.id} value={ue.id}>
                [{ue.code}] {ue.name} ({ue.semester || 'S?'} • {ue.credits} crédits)
              </option>
            ))}
          </select>
        </div>

        {/* Enseignant, Crédits & Heures */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Enseignant Assigné
            </label>
            <select
              value={formData.teacher_id}
              onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-white"
            >
              <option value="">Non assigné</option>
              {teachersOfFiliere.map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.first_name} {t.last_name} ({t.speciality || 'Enseignant'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Crédits ECTS *
            </label>
            <input
              type="number"
              value={formData.credits}
              onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) || 1 })}
              min="1"
              max="30"
              required
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Volume Horaire (Heures) *
            </label>
            <select
              value={formData.hours}
              onChange={(e) => setFormData({ ...formData, hours: parseInt(e.target.value) || 20 })}
              required
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-white"
            >
              {hoursOptions.map(h => (
                <option key={h.value} value={h.value}>{h.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Link
            href={`/admin/courses/${courseId}`}
            className="px-5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="bg-[#FF6B00] hover:bg-[#e55f00] text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />}
            <span>{loading ? 'Enregistrement...' : 'Enregistrer les modifications'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
