'use client';

import { useState, useEffect } from 'react';
import {
  Calendar, ArrowRight, ShieldAlert, Award, GraduationCap, CheckCircle2,
  AlertTriangle, Users, BookOpen, RefreshCw, Loader2, Sparkles, History, Check
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '@/lib/api';

interface PreviewData {
  current_academic_year: string;
  suggested_next_year: string;
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
    projected_level: string;
    projected_status: string;
  }>;
}

export default function AcademicYearTransitionPage() {
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [data, setData] = useState<PreviewData | null>(null);
  const [targetYear, setTargetYear] = useState('');
  const [autoPromoteByAvg, setAutoPromoteByAvg] = useState(true);
  const [autoPromoteL3ToM1, setAutoPromoteL3ToM1] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);

  useEffect(() => {
    loadPreview();
  }, []);

  const loadPreview = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/v1/academic-year-transition/preview');
      setData(res.data);
      setTargetYear(res.data.suggested_next_year || '');
    } catch (err: any) {
      console.error(err);
      toast.error('Erreur lors du chargement de la simulation');
    } finally {
      setLoading(false);
    }
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
        auto_promote_by_average: autoPromoteByAvg,
        min_passing_average: 10.0,
        auto_promote_l3_to_m1: autoPromoteL3ToM1
      };

      const res = await api.post('/api/v1/academic-year-transition/execute', payload);
      setExecutionResult(res.data);
      setShowConfirmModal(false);
      toast.success(res.data.message || 'Bascule effectuée avec succès !');
      await loadPreview();
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
      {/* Header */}
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
                Assistant de fin d'année : Clôture officielle des délibérations, promotion automatique des étudiants admis et ouverture de la nouvelle session.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadPreview}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold rounded-xl transition-all border border-white/10 flex items-center gap-2"
            >
              <RefreshCw size={14} />
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

      {/* Cartes de Synthèse de la Promotion */}
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
            <span className="text-xs font-bold uppercase tracking-wider">Admis / Promus</span>
            <Award size={18} className="text-emerald-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-700">{data?.promotions_summary.admis || 0}</p>
          <span className="text-[11px] text-emerald-600 block">Passent au niveau supérieur</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm space-y-1 bg-gradient-to-b from-white to-amber-50/30">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-bold uppercase tracking-wider">Redoublants</span>
            <AlertTriangle size={18} className="text-amber-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-amber-700">{data?.promotions_summary.redoublants || 0}</p>
          <span className="text-[11px] text-amber-600 block">Réinscrits au même niveau</span>
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

      {/* Panneau de Configuration de la Bascule */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Sparkles size={20} className="text-[#FF6B00]" />
            Paramètres de la Nouvelle Rentrée Universitaire
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Définissez l'année scolaire de destination et les règles de promotion automatique.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Année scolaire cible */}
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
            <p className="text-[11px] text-slate-500">
              Format attendu : <code>YYYY-YYYY</code> (ex : 2027-2028).
            </p>
          </div>

          {/* Options de promotion */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoPromoteByAvg}
                onChange={(e) => setAutoPromoteByAvg(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-[#FF6B00] focus:ring-[#FF6B00]"
              />
              <div>
                <span className="text-xs font-semibold text-slate-900 block">Promotion par moyenne générale (≥ 10/20)</span>
                <span className="text-[11px] text-slate-500">Promeut automatiquement les étudiants dont le PV de jury n'a pas encore été saisi s'ils ont la moyenne requise.</span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoPromoteL3ToM1}
                onChange={(e) => setAutoPromoteL3ToM1(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-[#FF6B00] focus:ring-[#FF6B00]"
              />
              <div>
                <span className="text-xs font-semibold text-slate-900 block">Basculer les diplômés de Licence 3 en Master 1</span>
                <span className="text-[11px] text-slate-500">Par défaut désactivé (les L3 admis sont archivés comme Diplômés). Cochez pour les inscrire directement en M1.</span>
              </div>
            </label>
          </div>
        </div>

        {/* Bouton de Déclenchement */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <History size={16} className="text-slate-400" />
            <span>Toutes les notes et moyennes de l'année passée sont <strong>conservées à vie</strong> dans l'historique de l'étudiant.</span>
          </div>

          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={executing || !targetYear || targetYear === data?.current_academic_year}
            className="px-6 py-3 bg-gradient-to-r from-[#FF6B00] to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-orange-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {executing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Bascule en cours...
              </>
            ) : (
              <>
                <Calendar size={16} />
                Lancer la Bascule vers {targetYear || 'la nouvelle année'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Table de Simulation Prévisionnelle */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">Aperçu Prévisionnel des Promotions</h3>
            <p className="text-xs text-slate-500">Échantillon des étudiants et de leur projection pour la nouvelle année</p>
          </div>
          <span className="text-xs bg-slate-200 text-slate-700 px-3 py-1 rounded-full font-semibold">
            {data?.students.length || 0} affichés
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
                        À délibérer
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {st.projected_status === 'graduated' ? (
                      <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full font-bold text-[11px] border border-purple-200">
                        🎓 {st.projected_level}
                      </span>
                    ) : st.projected_level !== st.current_level ? (
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
                Vous êtes sur le point de clôturer l'année <strong>{data?.current_academic_year}</strong> et d'ouvrir l'année <strong>{targetYear}</strong>.
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Tous les étudiants admis passeront au niveau supérieur.</li>
                <li>Les étudiants de fin de cycle (L3/M2) seront certifiés comme Diplômés.</li>
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
                    Traitement...
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
