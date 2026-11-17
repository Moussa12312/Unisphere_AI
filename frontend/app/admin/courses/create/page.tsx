'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, BookOpen, Layers, CheckSquare, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { courseService } from '@/services/courseService';
import { teacherService } from '@/services/teacherService';
import { filiereService } from '@/services/filiereService';
import { getApiErrorMessage } from '@/lib/errorHandler';
import { toast } from 'react-hot-toast';

export default function CreateCoursePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [filieres, setFilieres] = useState<any[]>([]);

  // Niveaux LMD
  const levels = ['L1', 'L2', 'L3', 'M1', 'M2', 'Doctorat'];

  // Correspondance LMD Niveau -> Semestres recommandés
  const levelSemestersMap: Record<string, string[]> = {
    'L1': ['S1', 'S2'],
    'L2': ['S3', 'S4'],
    'L3': ['S5', 'S6'],
    'M1': ['S7', 'S8'],
    'M2': ['S9', 'S10'],
    'Doctorat': ['D1', 'D2', 'D3'],
  };

  const allSemesters = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10'];

  const [formData, setFormData] = useState({
    level: 'L1',
    semester: 'S1',
    is_common_core: false,
    common_core_filieres_mode: 'ALL', // 'ALL' ou 'CUSTOM'
    selected_filieres: [] as number[],
    domain: '',
    filiere_id: '',
    title: '',
    code: '',
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

  // Charger les filières et enseignants
  useEffect(() => {
    const loadData = async () => {
      try {
        const [filieresData, teachersData] = await Promise.all([
          filiereService.getAll(),
          teacherService.getAll()
        ]);
        setFilieres(filieresData || []);
        setTeachers(teachersData || []);
      } catch (e) {
        console.error("Erreur chargement", e);
      }
    };
    loadData();
  }, []);

  // Extraire les domaines uniques
  const domains = [...new Set(filieres.map(f => f.domain))].filter(Boolean).sort();
  
  // Filtrer les filières par domaine
  const filieresOfDomain = filieres.filter(f => f.domain === formData.domain);

  // Gérer le changement de niveau
  const handleLevelChange = (lvl: string) => {
    const recommendedSemesters = levelSemestersMap[lvl] || ['S1'];
    setFormData(prev => ({
      ...prev,
      level: lvl,
      semester: recommendedSemesters[0] || prev.semester
    }));
  };

  // Basculer la sélection d'une filière pour Tronc Commun CUSTOM
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let commonCoreFilieresStr: string | null = null;
      if (formData.is_common_core) {
        if (formData.common_core_filieres_mode === 'ALL') {
          commonCoreFilieresStr = 'ALL';
        } else {
          commonCoreFilieresStr = formData.selected_filieres.join(',');
        }
      }

      const payload = {
        title: formData.title,
        code: formData.code || undefined,
        level: formData.level,
        semester: formData.semester,
        is_common_core: formData.is_common_core,
        common_core_filieres: commonCoreFilieresStr,
        department: formData.is_common_core ? 'Tronc Commun' : undefined,
        filiere_id: formData.is_common_core ? null : (formData.filiere_id ? parseInt(formData.filiere_id) : null),
        teacher_id: formData.teacher_id ? parseInt(formData.teacher_id) : null,
        credits: formData.credits,
        hours: formData.hours
      };

      await courseService.create(payload);
      toast.success('Cours créé avec succès !');
      router.push('/admin/courses');
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, 'Erreur lors de la création du cours'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="text-[#FF6B00]" size={24} />
            Création d'un Nouveau Cours / Module
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Définissez le niveau, le semestre, et indiquez s'il s'agit d'un tronc commun ou d'une filière spécifique.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-8">
        
        {/* ÉTAPE 1 : Cadrage Académique (Niveau & Semestre) */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#FF6B00] text-white flex items-center justify-center text-xs font-bold">1</span>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
              Cadrage Académique : Niveau & Semestre LMD
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Choix du Niveau */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                1. Niveau Académique *
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {levels.map(lvl => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => handleLevelChange(lvl)}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                      formData.level === lvl
                        ? 'bg-[#FF6B00] border-[#FF6B00] text-white shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Choix du Semestre */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                2. Semestre LMD associé *
              </label>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {(levelSemestersMap[formData.level] || allSemesters.slice(0, 2)).map(sem => (
                  <button
                    key={sem}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, semester: sem }))}
                    className={`py-2 px-4 rounded-lg text-xs font-bold border transition-all ${
                      formData.semester === sem
                        ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {sem} (Recommandé)
                  </button>
                ))}
                
                {/* Sélecteur manuel si autre semestre */}
                <select
                  value={formData.semester}
                  onChange={(e) => setFormData(prev => ({ ...prev, semester: e.target.value }))}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  <option value="">Autre semestre...</option>
                  {allSemesters.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ÉTAPE 2 : Modalité & Affectation (Tronc Commun vs Filière) */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#FF6B00] text-white flex items-center justify-center text-xs font-bold">2</span>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
              Modalité du cours : Tronc Commun ou Filière Spécifique
            </h2>
          </div>

          {/* Option Tronc Commun */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_common_core}
                onChange={(e) => setFormData(prev => ({ ...prev, is_common_core: e.target.checked }))}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-[#FF6B00] focus:ring-[#FF6B00]"
              />
              <div>
                <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Layers size={16} className="text-purple-600" />
                  Cours en Tronc Commun (Partagé entre plusieurs filières)
                </span>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cochez cette case si ce cours est dispensé conjointement à plusieurs filières de niveau {formData.level} (ex: Mathématiques, Anglais, Méthodologie, Droit général).
                </p>
              </div>
            </label>

            {/* Options Tronc Commun */}
            {formData.is_common_core && (
              <div className="mt-3 pl-7 pt-3 border-t border-slate-100 space-y-3">
                <div className="flex flex-col sm:flex-row gap-4">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="tc_mode"
                      value="ALL"
                      checked={formData.common_core_filieres_mode === 'ALL'}
                      onChange={() => setFormData(prev => ({ ...prev, common_core_filieres_mode: 'ALL' }))}
                      className="text-[#FF6B00] focus:ring-[#FF6B00]"
                    />
                    <span>🏛️ Toutes les filières du niveau {formData.level}</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="tc_mode"
                      value="CUSTOM"
                      checked={formData.common_core_filieres_mode === 'CUSTOM'}
                      onChange={() => setFormData(prev => ({ ...prev, common_core_filieres_mode: 'CUSTOM' }))}
                      className="text-[#FF6B00] focus:ring-[#FF6B00]"
                    />
                    <span>🎯 Filières spécifiques au choix</span>
                  </label>
                </div>

                {formData.common_core_filieres_mode === 'CUSTOM' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 p-3 bg-purple-50/50 rounded-lg border border-purple-100 mt-2">
                    {filieres.map(f => (
                      <label key={f.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.selected_filieres.includes(f.id)}
                          onChange={() => toggleFiliereSelection(f.id)}
                          className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="truncate">{f.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Si cours NON Tronc Commun : Choix classique Domaine / Filière */}
          {!formData.is_common_core && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Domaine d'études *</label>
                <select
                  value={formData.domain}
                  onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value, filiere_id: '' }))}
                  required={!formData.is_common_core}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  <option value="">Sélectionner un domaine...</option>
                  {domains.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Filière *</label>
                <select
                  value={formData.filiere_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, filiere_id: e.target.value }))}
                  required={!formData.is_common_core}
                  disabled={!formData.domain}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00] disabled:bg-slate-100"
                >
                  <option value="">Sélectionner une filière...</option>
                  {filieresOfDomain.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* ÉTAPE 3 : Détails du Cours */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#FF6B00] text-white flex items-center justify-center text-xs font-bold">3</span>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
              Informations Pédagogiques & Enseignant
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Intitulé */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Intitulé complet du cours *
              </label>
              <input
                type="text"
                placeholder="ex: Algorithmique et Structures de Données, Macroéconomie, Droit des Obligations..."
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              />
            </div>

            {/* Enseignant */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Enseignant Responsable
              </label>
              <select
                value={formData.teacher_id}
                onChange={(e) => setFormData(prev => ({ ...prev, teacher_id: e.target.value }))}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              >
                <option value="">Non assigné (à définir ultérieurement)</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.first_name} {t.last_name} ({t.speciality || 'Enseignant'})
                  </option>
                ))}
              </select>
            </div>

            {/* Code personnalisé (optionnel) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Code Cours (Optionnel)</span>
                <span className="text-[10px] text-slate-400 font-normal">Auto-généré si vide</span>
              </label>
              <input
                type="text"
                placeholder={`Auto-généré (ex: ${formData.level}-${formData.semester}-...)`}
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] font-mono"
              />
            </div>

            {/* Crédits ECTS */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Crédits ECTS
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={formData.credits}
                onChange={(e) => setFormData(prev => ({ ...prev, credits: parseInt(e.target.value) || 1 }))}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              />
            </div>

            {/* Volume Horaire */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Volume Horaire Total *
              </label>
              <select
                value={formData.hours}
                onChange={(e) => setFormData(prev => ({ ...prev, hours: parseInt(e.target.value) }))}
                required
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              >
                {hoursOptions.map(h => (
                  <option key={h.value} value={h.value}>{h.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="flex items-center gap-3 pt-6 border-t border-slate-200">
          <button
            type="submit"
            disabled={loading}
            className="bg-[#FF6B00] hover:bg-[#e55f00] text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-all shadow-sm hover:shadow flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save size={16} /> {loading ? 'Enregistrement en cours...' : 'Créer le cours'}
          </button>
          <Link
            href="/admin/courses"
            className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Annuler
          </Link>
        </div>
      </form>
    </div>
  );
}
