'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, BookOpen, Layers, Check, ArrowLeft } from 'lucide-react';
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
    level: 'L1',
    semester: 'S1',
    is_common_core: false,
    common_core_filieres_mode: 'ALL', // 'ALL' | 'CUSTOM'
    selected_filieres: [] as number[],
    domain: '',
    filiere_id: '',
    title: '',
    code: '',
    teacher_id: '',
    credits: 3,
    hours: 20
  });

  const hoursOptions = [10, 15, 20, 25, 30, 35, 40, 45, 50, 60];

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

  const domains = [...new Set(filieres.map(f => f.domain))].filter(Boolean).sort();
  const filieresOfDomain = filieres.filter(f => f.domain === formData.domain);

  const handleLevelChange = (lvl: string) => {
    const recommended = levelSemestersMap[lvl] || ['S1'];
    setFormData(prev => ({
      ...prev,
      level: lvl,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("Veuillez saisir l'intitulé du cours");
      return;
    }
    if (!formData.is_common_core && !formData.filiere_id) {
      toast.error("Veuillez sélectionner une filière ou activer le Tronc Commun");
      return;
    }

    setLoading(true);
    try {
      let commonCoreFilieresStr: string | null = null;
      if (formData.is_common_core) {
        commonCoreFilieresStr = formData.common_core_filieres_mode === 'ALL'
          ? 'ALL'
          : formData.selected_filieres.join(',');
      }

      const payload = {
        title: formData.title.trim(),
        code: formData.code.trim() || undefined,
        level: formData.level,
        semester: formData.semester,
        is_common_core: formData.is_common_core,
        common_core_filieres: commonCoreFilieresStr,
        department: formData.is_common_core ? 'Tronc Commun' : undefined,
        filiere_id: formData.is_common_core ? null : (formData.filiere_id ? parseInt(formData.filiere_id) : null),
        teacher_id: formData.teacher_id ? parseInt(formData.teacher_id) : null,
        credits: Number(formData.credits) || 3,
        hours: Number(formData.hours) || 20
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
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header compact */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/courses"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="text-[#FF6B00]" size={22} />
              Nouveau Cours
            </h1>
            <p className="text-xs text-slate-500">Ajout rapide au catalogue académique</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        
        {/* 1. NIVEAU (Boutons directs) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Niveau Académique *
          </label>
          <div className="flex flex-wrap gap-2">
            {levels.map(lvl => (
              <button
                key={lvl}
                type="button"
                onClick={() => handleLevelChange(lvl)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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

        {/* 2. SEMESTRE (Boutons directs) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Semestre LMD *
          </label>
          <div className="flex flex-wrap gap-2">
            {allSemesters.map(sem => {
              const isRecommended = (levelSemestersMap[formData.level] || []).includes(sem);
              const isSelected = formData.semester === sem;
              return (
                <button
                  key={sem}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, semester: sem }))}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isRecommended
                      ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{sem}</span>
                  {isRecommended && !isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. TYPE D'AFFECTATION : TRONC COMMUN vs FILIÈRE SPÉCIFIQUE (Boutons directs) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Type d'Affectation *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, is_common_core: false }))}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                !formData.is_common_core
                  ? 'border-[#FF6B00] bg-orange-50/50 text-[#FF6B00]'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="font-bold text-xs">🎯 Filière Spécifique</div>
              {!formData.is_common_core && <Check size={16} />}
            </button>

            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, is_common_core: true }))}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                formData.is_common_core
                  ? 'border-purple-600 bg-purple-50/50 text-purple-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="font-bold text-xs flex items-center gap-1.5">
                <Layers size={14} />
                <span>🏛️ Tronc Commun Multi-Filières</span>
              </div>
              {formData.is_common_core && <Check size={16} />}
            </button>
          </div>
        </div>

        {/* Configuration selon le type choisi */}
        {formData.is_common_core ? (
          <div className="p-4 bg-purple-50/40 rounded-xl border border-purple-100 space-y-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, common_core_filieres_mode: 'ALL' }))}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  formData.common_core_filieres_mode === 'ALL'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-white border border-purple-200 text-purple-700 hover:bg-purple-100'
                }`}
              >
                🌐 Toutes les filières du niveau {formData.level}
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, common_core_filieres_mode: 'CUSTOM' }))}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  formData.common_core_filieres_mode === 'CUSTOM'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-white border border-purple-200 text-purple-700 hover:bg-purple-100'
                }`}
              >
                🎯 Sélection personnalisée ({formData.selected_filieres.length})
              </button>
            </div>

            {formData.common_core_filieres_mode === 'CUSTOM' && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {filieres.map(f => {
                  const isChecked = formData.selected_filieres.includes(f.id);
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => toggleFiliereSelection(f.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
                        isChecked
                          ? 'bg-purple-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-700 hover:border-purple-300'
                      }`}
                    >
                      {isChecked && <Check size={12} />}
                      <span>{f.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Domaine *</label>
              <select
                value={formData.domain}
                onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value, filiere_id: '' }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              >
                <option value="">Sélectionner un domaine...</option>
                {domains.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Filière *</label>
              <select
                value={formData.filiere_id}
                onChange={(e) => setFormData(prev => ({ ...prev, filiere_id: e.target.value }))}
                disabled={!formData.domain}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00] disabled:bg-slate-100"
              >
                <option value="">Sélectionner une filière...</option>
                {filieresOfDomain.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* 4. INTITULÉ, ENSEIGNANT, CRÉDITS & HEURES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Intitulé du Cours *
            </label>
            <input
              type="text"
              placeholder="ex: Algorithmique, Droit Civil, Macroéconomie..."
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Enseignant Assigné (Tous départements)
            </label>
            <select
              value={formData.teacher_id}
              onChange={(e) => setFormData(prev => ({ ...prev, teacher_id: e.target.value }))}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            >
              <option value="">Non assigné (à définir plus tard)</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>
                  {t.first_name} {t.last_name} {t.speciality ? `(${t.speciality})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Code Cours (Optionnel)
            </label>
            <input
              type="text"
              placeholder={`Auto-généré (${formData.level}-${formData.semester})`}
              value={formData.code}
              onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Crédits ECTS
            </label>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5, 6].map(cr => (
                <button
                  key={cr}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, credits: cr }))}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Volume Horaire
            </label>
            <div className="flex flex-wrap gap-1.5">
              {hoursOptions.map(h => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, hours: h }))}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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

        {/* Boutons d'action */}
        <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={loading}
            className="bg-[#FF6B00] hover:bg-[#e55f00] text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save size={16} /> {loading ? 'Création en cours...' : 'Enregistrer le Cours'}
          </button>
          <Link
            href="/admin/courses"
            className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Annuler
          </Link>
        </div>
      </form>
    </div>
  );
}
