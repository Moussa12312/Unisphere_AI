'use client';

import { useState, useEffect } from 'react';
import { 
  AlertTriangle, RefreshCw, CheckCircle2, Clock, 
  Building2, Eye, X, MessageSquare, ShieldAlert
} from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

export default function SuperAdminIncidentsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [universities, setUniversities] = useState<{ id: number; name: string }[]>([]);
  const [selectedUniv, setSelectedUniv] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('open');
  const [activeModal, setActiveModal] = useState<any | null>(null);
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  useEffect(() => {
    loadIncidents();
  }, [selectedUniv, selectedStatus]);

  const loadIncidents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedUniv) params.append('university_id', selectedUniv);
      if (selectedStatus) params.append('status', selectedStatus);

      const res = await api.get(`/api/v1/superadmin/incidents?${params.toString()}`);
      setIncidents(res.data.incidents || []);
      if (res.data.universities) {
        setUniversities(res.data.universities);
      }
    } catch (err) {
      toast.error('Erreur lors du chargement des incidents');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id: number) => {
    setResolvingId(id);
    try {
      await api.put(`/api/v1/superadmin/incidents/${id}/status`, { status: 'resolved' });
      toast.success('Incident marqué comme résolu !');
      setActiveModal(null);
      loadIncidents();
    } catch (err) {
      toast.error('Erreur lors de la mise à jour du statut');
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
            <AlertTriangle size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Centre d'Incidents & Alertes Techniques</h1>
            <p className="text-sm text-slate-500">Rapports d'anomalies remontés automatiquement en temps réel</p>
          </div>
        </div>

        <button
          onClick={loadIncidents}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-medium transition-colors shadow-sm self-start sm:self-auto"
        >
          <RefreshCw size={15} /> Actualiser
        </button>
      </div>

      {/* Filtres */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Sélecteur d'Université */}
        <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
          <Building2 size={18} className="text-slate-400 flex-shrink-0" />
          <select
            value={selectedUniv}
            onChange={(e) => setSelectedUniv(e.target.value)}
            className="w-full sm:w-auto sm:min-w-[220px] px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          >
            <option value="">🏫 Toutes les Universités</option>
            {universities.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        {/* Filtre de statut */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['open', 'resolved', ''].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedStatus === st
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'open' ? '🔴 Non résolus' : st === 'resolved' ? '🟢 Résolus' : 'Tous'}
            </button>
          ))}
        </div>
      </div>

      {/* Affichage des incidents */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
          <div className="flex items-center justify-center gap-2">
            <RefreshCw className="animate-spin text-[#FF6B00]" size={18} />
            Chargement des incidents...
          </div>
        </div>
      ) : incidents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
          🎉 Aucun incident technique signalé. Tous les systèmes fonctionnent parfaitement !
        </div>
      ) : (
        <>
          {/* Vue Mobile Cards (< 768px) */}
          <div className="block md:hidden space-y-3">
            {incidents.map((inc) => (
              <div key={inc.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] ${
                    inc.severity === 'high' || inc.severity === 'critical'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {inc.severity.toUpperCase()}
                  </span>
                  <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] ${
                    inc.status === 'resolved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800 animate-pulse'
                  }`}>
                    {inc.status === 'resolved' ? 'Résolu' : 'En attente'}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{inc.title}</h4>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium mt-1">
                    <Building2 size={13} className="text-slate-400" />
                    <span>{inc.university_name}</span>
                  </div>
                  {inc.location && (
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">{inc.location}</p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                  <span className="text-[11px]">{inc.created_at ? new Date(inc.created_at).toLocaleString('fr-FR') : '—'}</span>
                  <button
                    onClick={() => setActiveModal(inc)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs transition-colors shadow-xs"
                  >
                    <Eye size={13} /> Voir Détails
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Vue Table Bureau (>= 768px) */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Incident / Erreur</th>
                    <th className="py-3 px-4">Université</th>
                    <th className="py-3 px-4">Emplacement</th>
                    <th className="py-3 px-4 text-center">Sévérité</th>
                    <th className="py-3 px-4 text-center">Statut</th>
                    <th className="py-3 px-4 text-right">Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {incidents.map((inc) => (
                    <tr key={inc.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900 max-w-xs truncate">
                        {inc.title}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700">
                        {inc.university_name}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {inc.location}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          inc.severity === 'high' || inc.severity === 'critical'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {inc.severity.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          inc.status === 'resolved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800 animate-pulse'
                        }`}>
                          {inc.status === 'resolved' ? 'Résolu' : 'En attente'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-500 whitespace-nowrap">
                        {inc.created_at ? new Date(inc.created_at).toLocaleString('fr-FR') : '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setActiveModal(inc)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors"
                        >
                          <Eye size={12} /> Détails
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modal Détails Incident */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <AlertTriangle size={20} className="text-rose-500" />
                <h3 className="font-bold text-slate-900 text-base">Rapport Technique d'Incident #{activeModal.id}</h3>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 font-medium">Université :</span>
                  <p className="font-bold text-slate-900 mt-0.5">{activeModal.university_name}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Date & Heure :</span>
                  <p className="font-bold text-slate-900 mt-0.5">
                    {activeModal.created_at ? new Date(activeModal.created_at).toLocaleString('fr-FR') : '—'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Page / Route :</span>
                  <p className="font-mono font-bold text-slate-800 mt-0.5">{activeModal.location}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Sévérité :</span>
                  <p className="font-bold text-rose-600 mt-0.5">{activeModal.severity.toUpperCase()}</p>
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-700 uppercase tracking-wide">Détails complets de l'erreur :</span>
                <pre className="mt-1.5 p-3.5 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl whitespace-pre-wrap overflow-x-auto border border-slate-800">
                  {activeModal.description}
                </pre>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50"
                >
                  Fermer
                </button>
                {activeModal.status !== 'resolved' && (
                  <button
                    onClick={() => handleResolve(activeModal.id)}
                    disabled={resolvingId === activeModal.id}
                    className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all"
                  >
                    <CheckCircle2 size={16} />
                    {resolvingId === activeModal.id ? 'Mise à jour...' : 'Marquer comme résolu'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
