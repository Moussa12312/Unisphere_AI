'use client';

import { useState, useEffect } from 'react';
import { ScrollText, X, CheckCircle2, XCircle, RotateCcw, Ban, Users } from 'lucide-react';
import { deliberationService } from '@/services/deliberationService';
import { useToast } from '@/components/ToastProvider';

interface MinuteSummary {
  id: number;
  title: string;
  filiere: string;
  level: string;
  academic_year: string;
  jury_members?: string;
  completed_at: string;
  decisions_count: number;
  admis_count: number;
}

interface MinuteDetail {
  id: number;
  title: string;
  filiere: string;
  level: string;
  academic_year: string;
  jury_members?: string;
  completed_at: string;
  decisions: {
    student_name: string;
    matricule: string;
    average: number;
    decision: string;
    comment?: string;
  }[];
}

const DECISION_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  admis: { label: 'Admis(e)', color: 'text-green-600', icon: CheckCircle2 },
  rattrapage: { label: 'Rattrapage', color: 'text-amber-600', icon: RotateCcw },
  redouble: { label: 'Redouble', color: 'text-red-600', icon: XCircle },
  exclu: { label: 'Exclu(e)', color: 'text-slate-600', icon: Ban },
};

export default function DeliberationMinutesPage() {
  const toast = useToast();
  const [minutes, setMinutes] = useState<MinuteSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MinuteDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    loadMinutes();
  }, []);

  const loadMinutes = async () => {
    setLoading(true);
    try {
      const data = await deliberationService.getMinutes();
      setMinutes(data);
    } catch (error) {
      toast.error('Erreur lors du chargement des procès-verbaux');
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (id: number) => {
    setLoadingDetail(true);
    try {
      const data = await deliberationService.getMinuteDetail(id);
      setSelected(data);
    } catch (error) {
      toast.error('Erreur lors du chargement du procès-verbal');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B00] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Procès-verbaux</h1>
        <p className="text-slate-500 mt-1">Historique des sessions de délibération clôturées</p>
      </div>

      {minutes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <ScrollText className="mx-auto text-slate-300 mb-3" size={48} />
          <p className="text-slate-500">Aucun procès-verbal disponible</p>
          <p className="text-sm text-slate-400 mt-1">
            Les procès-verbaux apparaissent ici une fois une session de délibération clôturée
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {minutes.map((m) => (
            <button
              key={m.id}
              onClick={() => openDetail(m.id)}
              className="w-full bg-white rounded-xl border border-slate-200 p-5 flex items-center justify-between hover:border-[#FF6B00] transition-colors text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <ScrollText className="text-purple-600" size={18} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{m.title}</h3>
                  <p className="text-sm text-slate-500">{m.filiere} • {m.level} • {m.academic_year}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Clôturé le {new Date(m.completed_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-medium text-slate-700 flex items-center gap-1 justify-end">
                  <Users size={14} /> {m.decisions_count} étudiant(s)
                </p>
                <p className="text-xs text-green-600 mt-1">{m.admis_count} admis</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {(selected || loadingDetail) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6">
            {loadingDetail ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#FF6B00] border-t-transparent"></div>
              </div>
            ) : selected && (
              <>
                <div className="flex items-center justify-between mb-1 print:hidden">
                  <h2 className="text-xl font-bold text-slate-900">Procès-verbal de délibération</h2>
                  <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600">
                    <X size={20} />
                  </button>
                </div>

                <div className="border-b border-slate-200 pb-4 mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">{selected.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {selected.filiere} • {selected.level} • Année académique {selected.academic_year}
                  </p>
                  <p className="text-sm text-slate-500">
                    Clôturé le {new Date(selected.completed_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  {selected.jury_members && (
                    <p className="text-sm text-slate-500 mt-2">
                      <strong>Membres du jury :</strong> {selected.jury_members}
                    </p>
                  )}
                </div>

                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 font-medium text-slate-600">Étudiant</th>
                      <th className="text-center py-2 font-medium text-slate-600">Moyenne</th>
                      <th className="text-center py-2 font-medium text-slate-600">Décision</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selected.decisions.map((d, i) => {
                      const config = DECISION_CONFIG[d.decision] || DECISION_CONFIG.admis;
                      const Icon = config.icon;
                      return (
                        <tr key={i}>
                          <td className="py-2">
                            <p className="font-medium text-slate-900">{d.student_name}</p>
                            <p className="text-xs text-slate-400">{d.matricule}</p>
                          </td>
                          <td className="py-2 text-center font-semibold">{d.average?.toFixed(2)}</td>
                          <td className="py-2 text-center">
                            <span className={`flex items-center justify-center gap-1 font-medium ${config.color}`}>
                              <Icon size={14} /> {config.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="flex gap-3 mt-6 print:hidden">
                  <button onClick={() => setSelected(null)} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium">
                    Fermer
                  </button>
                  <button onClick={handlePrint} className="flex-1 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-sm font-medium">
                    Imprimer / Exporter PDF
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
