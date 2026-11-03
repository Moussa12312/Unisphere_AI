'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Save, ArrowLeft, BookOpen, Layers, Sparkles, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { courseService } from '@/services/courseService';
import { teacherService } from '@/services/teacherService';
import { filiereService } from '@/services/filiereService';
import { teachingUnitService, TeachingUnit } from '@/services/teachingUnitService';
import { getApiErrorMessage } from '@/lib/errorHandler';
import { toast } from 'react-hot-toast';

function CreateCourseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialFiliereId = searchParams.get('filiere_id') || '';
  const initialSemester = searchParams.get('semester') || '';

  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [filieres, setFilieres] = useState<any[]>([]);
  const [teachingUnits, setTeachingUnits] = useState<TeachingUnit[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    domain: '',
    filiere_id: initialFiliereId,
    level: '',
    semester: initialSemester,
    teaching_unit_id: '',
    teacher_id: '',
    credits: 3,
    hours: 20
  });

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

  // Charger les filières, enseignants et UEs
  useEffect(() => {
    const loadData = async () => {
      try {
        const [filieresData, teachersData, unitsData] = await Promise.all([
          filiereService.getAll(),
          teacherService.getAll(),
          teachingUnitService.getAll().catch(() => [])
        ]);
        setFilieres(filieresData);
        setTeachers(teachersData);
        setTeachingUnits(unitsData);

        // Si initialFiliereId est fourni, initialiser le domaine
        if (initialFiliereId) {
          const matchFiliere = filieresData.find((f: any) => String(f.id) === String(initialFiliereId));
          if (matchFiliere) {
            setFormData(prev => ({
              ...prev,
              filiere_id: String(matchFiliere.id),
              domain: matchFiliere.domain
            }));
          }
        }
      } catch (e) {
        console.error("Erreur chargement données création module", e);
      }
    };
    loadData();
  }, [initialFiliereId]);

  // Extraire les domaines uniques
  const domains = useMemo(() => {
    return [...new Set(filieres.map(f => f.domain))].filter(Boolean).sort();
  }, [filieres]);

  // Filtrer les filières par domaine
  const filieresOfDomain = useMemo(() => {
    return formData.domain ? filieres.filter(f => f.domain === formData.domain) : filieres;
  }, [filieres, formData.domain]);

  // Extraire les niveaux de la filière sélectionnée
  const selectedFiliere = useMemo(() => {
    return filieres.find(f => f.id === parseInt(formData.filiere_id));
  }, [filieres, formData.filiere_id]);

  const levelsOfFiliere = useMemo(() => {
    return selectedFiliere?.levels?.split(',').map((l: string) => l.trim()) || ['L1', 'L2', 'L3', 'M1', 'M2'];
  }, [selectedFiliere]);

  // Filtrer les enseignants par filière
  const teachersOfFiliere = useMemo(() => {
    return formData.filiere_id
      ? teachers.filter(t => !t.filiere_id || t.filiere_id === parseInt(formData.filiere_id))
      : teachers;
  }, [teachers, formData.filiere_id]);

  // UEs correspondant à la filière
  const filteredTeachingUnits = useMemo(() => {
    if (!formData.filiere_id) return teachingUnits;
    return teachingUnits.filter(u => !u.filiere_id || u.filiere_id === parseInt(formData.filiere_id));
  }, [teachingUnits, formData.filiere_id]);

  // Suggestion de semestres selon le niveau choisi
  const recommendedSemesters = useMemo(() => {
    if (!formData.level) return allSemesters;
    return allSemesters.filter(s => s.level.toLowerCase() === formData.level.toLowerCase());
  }, [formData.level]);

  // Auto-ajuster le semestre quand le niveau change
  const handleLevelChange = (lvl: string) => {
    const matching = allSemesters.filter(s => s.level.toLowerCase() === lvl.toLowerCase());
    setFormData(prev => ({
      ...prev,
      level: lvl,
      semester: matching.length > 0 && (!prev.semester || !matching.some(m => m.id === prev.semester))
        ? matching[0].id
        : prev.semester
    }));
  };

  // Synchronisation si une UE est choisie
  const handleTeachingUnitChange = (ueId: string) => {
    const selectedUE = teachingUnits.find(u => String(u.id) === String(ueId));
    setFormData(prev => ({
      ...prev,
      teaching_unit_id: ueId,
      semester: selectedUE?.semester || prev.semester,
      level: selectedUE?.level || prev.level
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Veuillez renseigner le titre du module');
      return;
    }

    if (!formData.semester) {
      toast.error('Veuillez sélectionner le semestre concerné (ex: S1, S2...)');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        title: formData.title.trim(),
        filiere_id: formData.filiere_id ? parseInt(formData.filiere_id) : null,
        level: formData.level || 'L1',
        semester: formData.semester,
        teaching_unit_id: formData.teaching_unit_id ? parseInt(formData.teaching_unit_id) : null,
        teacher_id: formData.teacher_id ? parseInt(formData.teacher_id) : null,
        credits: formData.credits,
        hours: formData.hours
      };

      await courseService.create(payload);
      toast.success('Module créé et intégré au catalogue avec succès !');
      router.push(`/admin/courses?filiere_id=${formData.filiere_id || ''}`);
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, 'Erreur lors de la création du module'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/courses"
            className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <BookOpen className="text-[#FF6B00]" size={24} />
              Nouveau Module Académique
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Définissez les caractéristiques du module, sa filière de rattachement et son semestre d'enseignement
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-6">
        {/* 1. Intitulé du module */}
        <div>
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
            Intitulé du Module *
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Ex : Algorithmique Avancée & Structures de Données, Droit des Sociétés..."
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          />
        </div>

        {/* 2. Filière & Domaine */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Domaine d'Études *
            </label>
            <select
              value={formData.domain}
              onChange={(e) => {
                const newDomain = e.target.value;
                setFormData({
                  ...formData,
                  domain: newDomain,
                  filiere_id: '',
                  level: '',
                  teacher_id: ''
                });
              }}
              required
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-white"
            >
              <option value="">Sélectionner un domaine académique...</option>
              {domains.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Filière de Rattachement *
            </label>
            <select
              value={formData.filiere_id}
              onChange={(e) => {
                const fid = e.target.value;
                const fObj = filieres.find(f => String(f.id) === String(fid));
                setFormData({
                  ...formData,
                  filiere_id: fid,
                  domain: fObj ? fObj.domain : formData.domain,
                  level: '',
                  teacher_id: ''
                });
              }}
              required
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-white"
            >
              <option value="">Sélectionner la filière...</option>
              {filieresOfDomain.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 3. Niveau & SEMESTRE (Exigence Clé) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Niveau Académique *
            </label>
            <select
              value={formData.level}
              onChange={(e) => handleLevelChange(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-white"
            >
              <option value="">Sélectionner le niveau...</option>
              {levelsOfFiliere.map((lvl) => (
                <option key={lvl} value={lvl}>{lvl}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Semestre Concerné *</span>
              <span className="text-[10px] font-semibold text-[#FF6B00] lowercase">exigence LMD</span>
            </label>
            <select
              value={formData.semester}
              onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
              required
              className="w-full px-3.5 py-2.5 border-2 border-orange-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-white"
            >
              <option value="">Sélectionner le semestre...</option>
              {allSemesters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.level})
                </option>
              ))}
            </select>
          </div>

          {/* Badges de sélection rapide du semestre */}
          <div className="md:col-span-2 pt-2 border-t border-slate-200/60">
            <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
              Sélection rapide du semestre :
            </span>
            <div className="flex flex-wrap gap-1.5">
              {allSemesters.map((s) => {
                const isSelected = formData.semester === s.id;
                const isRecommended = recommendedSemesters.some(r => r.id === s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, semester: s.id })}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-[#FF6B00] text-white border-[#FF6B00] shadow-2xs'
                        : isRecommended
                        ? 'bg-orange-50 text-orange-900 border-orange-200 hover:bg-orange-100'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{s.id}</span>
                    <span className="text-[9px] font-normal opacity-75 ml-1">({s.level})</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 4. Rattachement Optionnel à une Unité d'Enseignement (UE) */}
        <div>
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Layers size={14} className="text-[#FF6B00]" />
              Unité d'Enseignement (UE) de Rattachement (Optionnel)
            </span>
            <span className="text-[11px] text-slate-400 font-normal">
              Permet de regrouper les modules dans une même UE
            </span>
          </label>
          <select
            value={formData.teaching_unit_id}
            onChange={(e) => handleTeachingUnitChange(e.target.value)}
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

        {/* 5. Enseignant, Crédits & Heures */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Enseignant Responsable
            </label>
            <select
              value={formData.teacher_id}
              onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-white"
            >
              <option value="">Non assigné pour le moment</option>
              {teachersOfFiliere.map((t) => (
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
              min="1"
              max="30"
              required
              value={formData.credits}
              onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) || 1 })}
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
              {hoursOptions.map((h) => (
                <option key={h.value} value={h.value}>{h.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Link
            href="/admin/courses"
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#FF6B00] hover:bg-[#e55f00] shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>{loading ? 'Création en cours...' : 'Enregistrer le module'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

export default function CreateCoursePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-[#FF6B00]" size={32} />
      </div>
    }>
      <CreateCourseContent />
    </Suspense>
  );
}
