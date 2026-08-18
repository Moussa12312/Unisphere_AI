'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Gavel, CheckCircle2, XCircle, RotateCcw, Ban, Loader2, ArrowLeft, Lock } from 'lucide-react';
import { deliberationService, DeliberationSession, DecisionProposal } from '@/services/deliberationService';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/hooks/useConfirm';

const DECISION_OPTIONS = [
  { value: 'admis', label: 'Admis(e)', color: 'bg-green-100 text-green-700 border-green-300', icon: CheckCircle2 },
  { value: 'rattrapage', label: 'Rattrapage', color: 'bg-amber-100 text-amber-700 border-amber-300', icon: RotateCcw },
  { value: 'redouble', label: 'Redouble', color: 'bg-red-100 text-red-700 border-red-300', icon: XCircle },
  { value: 'exclu', label: 'Exclu(e)', color: 'bg-slate-200 text-slate-700 border-slate-400', icon: Ban },
];

export default function DeliberationDecisionsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');

  const [sessions, setSessions] = useState<DeliberationSession[]>([]);
  const [currentSession, setCurrentSession] = useState<DeliberationSession | null>(null);
  const [proposals, setProposals] = useState<DecisionProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);

  useEffect(() => {
    if (sessionId) {
      loadProposals(parseInt(sessionId));
    } else {
      loadSessionsList();
    }
  }, [sessionId]);

  const loadSessionsList = async () => {
    setLoading(true);
    try {
      const data = await deliberationService.getSessions();
      setSessions(data.filter(s => s.status !== 'completed'));
    } catch (error) {
      toast.error('Erreur lors du chargement des sessions');
    } finally {
      setLoading(false);
    }
  };

  const loadProposals = async (id: number) => {
    setLoading(true);
    try {
      const [sessions, props] = await Promise.all([
        deliberationService.getSessions(),
        deliberationService.getProposals(id)
      ]);
      const session = sessions.find(s => s.id === id) || null;
      setCurrentSession(session);
      setProposals(props);
    } catch (error) {
      toast.error('Erreur lors du chargement des décisions');
    } finally {
      setLoading(false);
    }
  };

  const handleDecide = async (proposal: DecisionProposal, decision: string) => {
    if (!sessionId) return;
    setSavingId(proposal.student_id);
    try {
      await deliberationService.saveDecision(parseInt(sessionId), {
        student_id: proposal.student_id,
        average: proposal.average,
        failed_courses_count: proposal.failed_courses_count,
        decision
      });
      setProposals(prev => prev.map(p => p.student_id === proposal.student_id ? { ...p, final_decision: decision } : p));
      toast.success(`Décision enregistrée pour ${proposal.student_name}`);
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement de la décision");
    } finally {
      setSavingId(null);
    }
  };

  const handleCompleteSession = async () => {
    if (!sessionId) return;
    const undecided = proposals.filter(p => !p.final_decision);
    if (undecided.length > 0) {
      toast.error(`${undecided.length} étudiant(s) n'ont pas encore de décision finale`);
      return;
    }
    const ok = await confirm({
      title: 'Clôturer cette session ?',
      message: 'Une fois clôturée, la session sera consultable comme procès-verbal et ne pourra plus être modifiée.',
      confirmText: 'Clôturer',
      variant: 'warning'
    });
    if (!ok) return;
    try {
      await deliberationService.completeSession(parseInt(sessionId));
      toast.success('Session clôturée avec succès');
      router.push('/admin/deliberations/sessions');
    } catch (error) {
      toast.error('Erreur lors de la clôture');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B00] border-t-transparent"></div>
      </div>
    );
  }

  // Pas de session sélectionnée : afficher le sélecteur
  if (!sessionId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Décisions de délibération</h1>
          <p className="text-slate-500 mt-1">Choisissez une session pour saisir les décisions</p>
        </div>
        {sessions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Gavel className="mx-auto text-slate-300 mb-3" size={48} />
            <p className="text-slate-500">Aucune session ouverte</p>
            <a href="/admin/deliberations/sessions" className="text-[#FF6B00] text-sm hover:underline mt-2 inline-block">
              Créer une session de délibération
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map(s => (
              <button
                key={s.id}
                onClick={() => router.push(`/admin/deliberations/decisions?session=${s.id}`)}
                className="w-full bg-white rounded-xl border border-slate-200 p-5 flex items-center justify-between hover:border-[#FF6B00] transition-colors text-left"
              >
                <div>
                  <h3 className="font-semibold text-slate-900">{s.title}</h3>
                  <p className="text-sm text-slate-500">{s.filiere} • {s.level} • {s.academic_year}</p>
                </div>
                <Gavel className="text-slate-300" size={20} />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/admin/deliberations/decisions')} className="p-2 hover:bg-slate-100 rounded-lg">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{currentSession?.title}</h1>
          <p className="text-slate-500 text-sm">{currentSession?.filiere} • {currentSession?.level} • {currentSession?.academic_year}</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
        💡 Les propositions ci-dessous sont calculées automatiquement à partir des notes validées de chaque étudiant. Le jury valide ou modifie chaque décision individuellement.
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Étudiant</th>
              <th className="text-center px-4 py-3 font-medium text-slate-600">Moyenne</th>
              <th className="text-center px-4 py-3 font-medium text-slate-600">Matières en échec</th>
              <th className="text-center px-4 py-3 font-medium text-slate-600">Proposition</th>
              <th className="text-center px-4 py-3 font-medium text-slate-600">Décision finale</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {proposals.map((p) => (
              <tr key={p.student_id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{p.student_name}</p>
                  <p className="text-xs text-slate-400">{p.matricule}</p>
                </td>
                <td className="px-4 py-3 text-center font-semibold text-slate-700">{p.average.toFixed(2)}</td>
                <td className="px-4 py-3 text-center text-slate-600">{p.failed_courses_count}</td>
                <td className="px-4 py-3 text-center">
                  <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                    {DECISION_OPTIONS.find(d => d.value === p.proposed_decision)?.label || p.proposed_decision}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-center gap-1">
                    {savingId === p.student_id ? (
                      <Loader2 size={16} className="animate-spin text-slate-400" />
                    ) : (
                      DECISION_OPTIONS.map(opt => {
                        const Icon = opt.icon;
                        const isSelected = p.final_decision === opt.value;
                        return (
                          <button
                            key={opt.value}
                            onClick={() => handleDecide(p, opt.value)}
                            title={opt.label}
                            className={`p-1.5 rounded-lg border transition-colors ${isSelected ? opt.color : 'border-transparent text-slate-300 hover:text-slate-500 hover:bg-slate-100'}`}
                          >
                            <Icon size={16} />
                          </button>
                        );
                      })
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {proposals.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleCompleteSession}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#0a1628] hover:bg-slate-800 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Lock size={16} /> Clôturer la session
          </button>
        </div>
      )}
    </div>
  );
}
