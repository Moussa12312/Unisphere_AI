'use client';

import { useState, useEffect } from 'react';
import {
  Calendar, ArrowRight, ShieldAlert, Award, GraduationCap, CheckCircle2,
  AlertTriangle, Users, BookOpen, RefreshCw, Loader2, Sparkles, History, Check,
  CheckCircle, UserCheck, ShieldCheck
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '@/lib/api';

interface PreviewData {
  current_academic_year: string;
  suggested_next_year: string;
  applied_policy: string;
  total_active_students: number;
  levels_distribution: Record<string, number>;
  promotions_summary: {
    admis: number;
    redoublants: number;
    diplomes: number;
    a_deliberer: number;
  };
  students: Array<{
    id: number;
    matricule: string;
    name: string;
    filiere: string;
    current_level: string;
    average: number | null;
    decision: string;
    should_promote: boolean;
    promotion_reason: string;
    projected_level: string;
    projected_status: string;
  }>;
}

export default function AcademicYearTransitionPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [data, setData] = useState<PreviewData | null>(null);
  const [targetYear, setTargetYear] = useState('');
  
  // Politique de promotion sélectionnée
  const [policy, setPolicy] = useState<'admitted_only' | 'conditional' | 'all_pass'>('admitted_only');
  const [conditionalMinAvg, setConditionalMinAvg] = useState(8.0);
  const [autoPromoteL3ToM1, setAutoPromoteL3ToM1] = useState(false);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);

  useEffect(() => {
    loadPreview(policy, conditionalMinAvg);
  }, []);

  const loadPreview = async (selectedPolicy = policy, minAvg = conditionalMinAvg) => {
    try {
      setRefreshing(true);
      const res = await api.get(`/api/v1/academic-year-transition/preview?policy=${selectedPolicy}&conditional_min_avg=${minAvg}`);
      setData(res.data);
      if (!targetYear) {
        setTargetYear(res.data.suggested_next_year || '');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Erreur lors du calcul de la simulation');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handlePolicyChange = (newPolicy: 'admitted_only' | 'conditional' | 'all_pass') => {
    setPolicy(newPolicy);
    loadPreview(newPolicy, conditionalMinAvg);
  };

  const handleExecute = async () => {
    if (!targetYear || targetYear === data?.current_academic_year) {
      toast.error("Veuillez spécifier une nouvelle année académique valide");
      return;
    }

    try {
      setExecuting(true);
      const payload = {
        target_academic_year: targetYear,
        promotion_policy: policy,
        conditional_min_average: conditionalMinAvg,
        auto_promote_by_average: true,
        min_passing_average: 10.0,
        auto_promote_l3_to_m1: autoPromoteL3ToM1
      };

      const res = await api.post('/api/v1/academic-year-transition/execute', payload);
      setExecutionResult(res.data);
      setShowConfirmModal(false);
      toast.success(res.data.message || 'Bascule effectuée avec succès !');
      await loadPreview(policy, conditionalMinAvg);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Erreur lors de la bascule d'année");
    } finally {
      setExecuting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 size={36} className="animate-spin text-[#FF6B00]" />
        <p className="text-slate-500 font-medium text-sm">Calcul de la simulation de fin d'année académique...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header Institutionnel */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-tr from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 shrink-0">
              <Calendar size={28} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Clôture & Bascule d'Année Académique</h1>
                <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold rounded-full">
                  Année Active : {data?.current_academic_year}
                </span>
              </div>
              <p className="text-slate-300 text-xs sm:text-sm mt-1">
                Assistant de fin d'année : Choix de la politique de passage (Admis seuls, Conditionnel ou Tous), promotion et réinscriptions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => loadPreview(policy, conditionalMinAvg)}
              disabled={refreshing}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold rounded-xl transition-all border border-white/10 flex items-center gap-2"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              Actualiser
            </button>
          </div>
        </div>
      </div>

      {/* Résumé de l'exécution récente */}
      {executionResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-emerald-900 font-bold text-base">
            <CheckCircle2 size={20} className="text-emerald-600" />
            <span>{executionResult.message}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs text-slate-700">
            <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
              <span className="text-slate-500 block">Étudiants Promus</span>
              <strong className="text-emerald-600 text-base">{executionResult.promoted_students}</strong>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
              <span className="text-slate-500 block">Redoublants Maintenus</span>
              <strong className="text-amber-600 text-base">{executionResult.repeated_students}</strong>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
              <span className="text-slate-500 block">Nouveaux Diplômés</span>
              <strong className="text-indigo-600 text-base">{executionResult.graduated_students}</strong>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
              <span className="text-slate-500 block">Archives Sauvegardées</span>
              <strong className="text-slate-900 text-base">{executionResult.total_archived}</strong>
            </div>
          </div>
        </div>
      )}

      {/* SÉLECTEUR DE POLITIQUE DE PASSAGE (RÈGLE DU JURY) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck size={22} className="text-[#FF6B00]" />
            Quelle est la politique de passage pour cette fin d'année ?
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Choisissez comment l'établissement traite les redoublants et les admis lors de la bascule vers la nouvelle année.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Option 1 : Seuls les Admis */}
          <div
            onClick={() => handlePolicyChange('admitted_only')}
            className={`cursor-pointer rounded-2xl p-5 border-2 transition-all relative ${
              policy === 'admitted_only'
                ? 'border-emerald-500 bg-emerald-50/40 shadow-md ring-2 ring-emerald-500/20'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                1
              </span>
              {policy === 'admitted_only' && (
                <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-full">
                  SÉLECTIONNÉ
                </span>
              )}
            </div>
            <h3 className="font-bold text-slate-900 text-sm mt-3">Seuls les Admis passent</h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              <strong>Règle stricte :</strong> Seuls les étudiants ayant validé l'année sont promus au niveau supérieur. Les redoublants restent dans leur classe actuelle pour reprendre l'année.
            </p>
          </div>

          {/* Option 2 : Passage Conditionnel LMD */}
          <div
            onClick={() => handlePolicyChange('conditional')}
            className={`cursor-pointer rounded-2xl p-5 border-2 transition-all relative ${
              policy === 'conditional'
                ? 'border-amber-500 bg-amber-50/40 shadow-md ring-2 ring-amber-500/20'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">
                2
              </span>
              {policy === 'conditional' && (
                <span className="px-2 py-0.5 bg-amber-600 text-white text-[10px] font-bold rounded-full">
                  SÉLECTIONNÉ
                </span>
              )}
            </div>
            <h3 className="font-bold text-slate-900 text-sm mt-3">Passage Conditionnel (LMD)</h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              <strong>Tolérance académique :</strong> Les admis passent, et les étudiants en rattrapage ou ayant une moyenne ≥ {conditionalMinAvg}/20 sont autorisés à enjamber avec dettes de crédits.
            </p>
          </div>

          {/* Option 3 : Passage Généralisé (Tous) */}
          <div
            onClick={() => handlePolicyChange('all_pass')}
            className={`cursor-pointer rounded-2xl p-5 border-2 transition-all relative ${
              policy === 'all_pass'
                ? 'border-blue-600 bg-blue-50/40 shadow-md ring-2 ring-blue-600/20'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                3
              </span>
              {policy === 'all_pass' && (
                <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full">
                  SÉLECTIONNÉ
                </span>
              )}
            </div>
            <h3 className="font-bold text-slate-900 text-sm mt-3">Passage Généralisé (Tous)</h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              <strong>Dérogation rectorale :</strong> Tous les étudiants sans exception passent au niveau supérieur, y compris les redoublants (passage automatique global).
            </p>
          </div>
        </div>
      </div>

      {/* Cartes de Synthèse de la Promotion selon la politique active */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">Effectif Actif</span>
            <Users size={18} className="text-blue-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">{data?.total_active_students || 0}</p>
          <span className="text-[11px] text-slate-500 block">Inscrits en {data?.current_academic_year}</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-sm space-y-1 bg-gradient-to-b from-white to-emerald-50/30">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-xs font-bold uppercase tracking-wider">Passent en N+1</span>
            <Award size={18} className="text-emerald-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-700">{data?.promotions_summary.admis || 0}</p>
          <span className="text-[11px] text-emerald-600 block">Promus au niveau supérieur</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm space-y-1 bg-gradient-to-b from-white to-amber-50/30">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-bold uppercase tracking-wider">Restent au Niveau</span>
            <AlertTriangle size={18} className="text-amber-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-amber-700">{data?.promotions_summary.redoublants || 0}</p>
          <span className="text-[11px] text-amber-600 block">Maintenus pour redoubler</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-purple-200 shadow-sm space-y-1 bg-gradient-to-b from-white to-purple-50/30">
          <div className="flex items-center justify-between text-purple-700">
            <span className="text-xs font-bold uppercase tracking-wider">Diplômés (L3/M2)</span>
            <GraduationCap size={18} className="text-purple-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-purple-700">{data?.promotions_summary.diplomes || 0}</p>
          <span className="text-[11px] text-purple-600 block">Cycle terminé avec succès</span>
        </div>
      </div>

      {/* Paramétrage Année & Déclenchement */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Année Académique Cible (Nouvelle Année) *
            </label>
            <div className="flex items-center gap-3">
              <span className="px-3.5 py-2.5 bg-slate-100 text-slate-600 font-mono text-sm font-bold rounded-xl border border-slate-200">
                {data?.current_academic_year}
              </span>
              <ArrowRight size={20} className="text-[#FF6B00] shrink-0" />
              <input
                type="text"
                value={targetYear}
                onChange={(e) => setTargetYear(e.target.value)}
                placeholder="ex: 2027-2028"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/20 rounded-xl text-sm font-mono font-bold text-slate-900"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={executing || !targetYear || targetYear === data?.current_academic_year}
              className="px-8 py-3.5 bg-gradient-to-r from-[#FF6B00] to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-orange-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {executing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Bascule en cours...
                </>
              ) : (
                <>
                  <Calendar size={16} />
                  Valider la Bascule vers {targetYear || 'la nouvelle année'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Table de Simulation Prévisionnelle */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">Aperçu Nominatif des Promotions</h3>
            <p className="text-xs text-slate-500">
              Simulation selon la règle choisie : <strong>{policy === 'admitted_only' ? 'Seuls les Admis' : policy === 'conditional' ? 'Passage Conditionnel LMD' : 'Passage Généralisé (Tous)'}</strong>
            </p>
          </div>
          <span className="text-xs bg-slate-200 text-slate-700 px-3 py-1 rounded-full font-semibold">
            {data?.students.length || 0} étudiants affichés
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Matricule</th>
                <th className="py-3 px-4">Étudiant</th>
                <th className="py-3 px-4">Filière</th>
                <th className="py-3 px-4">Niveau Actuel</th>
                <th className="py-3 px-4">Moyenne</th>
                <th className="py-3 px-4">Décision Jury</th>
                <th className="py-3 px-4">Motif de Promotion</th>
                <th className="py-3 px-4 text-center">Niveau Après Bascule</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.students.map((st) => (
                <tr key={st.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-700">{st.matricule || `ID-${st.id}`}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900">{st.name}</td>
                  <td className="py-3 px-4 text-slate-600">{st.filiere}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 bg-slate-100 font-bold text-slate-700 rounded border border-slate-200">
                      {st.current_level}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold">
                    {st.average !== null ? (
                      <span className={st.average >= 10 ? 'text-emerald-600' : 'text-amber-600'}>
                        {st.average.toFixed(2)}/20
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">En attente</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {st.decision === 'admis' ? (
                      <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                        Admis
                      </span>
                    ) : st.decision === 'redouble' ? (
                      <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-full font-bold text-[10px]">
                        Redouble
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium text-[10px]">
                        {st.decision}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-500 font-medium">
                    {st.promotion_reason}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {st.projected_status === 'graduated' ? (
                      <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full font-bold text-[11px] border border-purple-200">
                        🎓 {st.projected_level}
                      </span>
                    ) : st.should_promote ? (
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[11px] border border-emerald-200">
                        Promu ➔ {st.projected_level}
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full font-bold text-[11px] border border-amber-200">
                        Maintien ({st.projected_level})
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Confirmation Sécurisée */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3.5 text-amber-600">
              <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center shrink-0">
                <ShieldAlert size={26} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Confirmer la Bascule d'Année Académique</h3>
                <p className="text-xs text-slate-500">Opération officielle engageant l'établissement</p>
              </div>
            </div>

            <div className="space-y-3 bg-amber-50/80 p-4 rounded-2xl border border-amber-200 text-xs text-amber-950 leading-relaxed">
              <p>
                Vous êtes sur le point de clôturer <strong>{data?.current_academic_year}</strong> et d'ouvrir <strong>{targetYear}</strong> avec la politique :
              </p>
              <div className="p-2.5 bg-white rounded-xl border border-amber-200 font-bold text-amber-900">
                👉 {policy === 'admitted_only' ? 'Seuls les Admis passent (Méritocratique)' : policy === 'conditional' ? 'Passage Conditionnel LMD (Avec dettes)' : 'Passage Généralisé (Tous les étudiants passent)'}
              </div>
              <ul className="list-disc pl-5 space-y-1">
                <li>L'historique académique complet sera archivé pour les relevés et attestations.</li>
                <li>La saisie des notes sera réinitialisée pour la nouvelle rentrée.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleExecute}
                disabled={executing}
                className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white rounded-xl text-xs font-bold shadow-lg transition-all flex items-center gap-2"
              >
                {executing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Bascule en cours...
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    Confirmer la Bascule vers {targetYear}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
