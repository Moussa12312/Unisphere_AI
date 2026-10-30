'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, X, Save, Loader2, CheckCircle2, Clock, Wallet } from 'lucide-react';
import { accountingService, PayrollEntry } from '@/services/accountingService';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/hooks/useConfirm';

function formatFCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}

const currentPeriod = () => new Date().toISOString().slice(0, 7);
const emptyForm = { user_id: '', period: currentPeriod(), gross_salary: '', deductions: '0' };

export default function PayrollPage() {
  const toast = useToast();
  const confirm = useConfirm();

  const [entries, setEntries] = useState<PayrollEntry[]>([]);
  const [staff, setStaff] = useState<{ id: number; full_name: string; role: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [payingId, setPayingId] = useState<number | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([accountingService.getPayroll(), accountingService.getEligibleStaff()]);
      setEntries(p);
      setStaff(s);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.user_id || !formData.period || !formData.gross_salary) {
      toast.error('Veuillez remplir les champs obligatoires');
      return;
    }
    setSaving(true);
    try {
      await accountingService.createPayrollEntry({
        ...formData,
        user_id: parseInt(formData.user_id),
        gross_salary: parseFloat(formData.gross_salary),
        deductions: parseFloat(formData.deductions) || 0
      });
      toast.success('Bulletin créé avec succès');
      setShowModal(false);
      setFormData(emptyForm);
      load();
    } catch (error) {
      toast.error('Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const handlePay = async (entry: PayrollEntry) => {
    const ok = await confirm({
      title: 'Confirmer le paiement ?',
      message: `Payer ${formatFCFA(entry.net_salary)} à ${entry.user?.full_name} ? Une dépense sera automatiquement enregistrée.`,
      confirmText: 'Payer',
      variant: 'warning'
    });
    if (!ok) return;
    setPayingId(entry.id);
    try {
      await accountingService.paySalary(entry.id);
      toast.success('Salaire payé avec succès');
      load();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors du paiement');
    } finally {
      setPayingId(null);
    }
  };

  const totalPending = entries.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.net_salary, 0);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B00] border-t-transparent"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Salaires (Paie)</h1>
          <p className="text-slate-500 mt-1">Gestion des bulletins de salaire du personnel</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-sm font-medium shadow-md">
          <Plus size={16} /> Nouveau bulletin
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3 text-sm text-blue-700">
        <Wallet size={18} className="mt-0.5 flex-shrink-0" />
        <p>
          <strong>Comment payer un salaire :</strong> 1) Clique sur "Nouveau bulletin" pour créer le
          bulletin d'un employé (montant, période) — 2) Une fois créé, il apparaît ci-dessous avec un
          bouton <strong>"Payer"</strong> orange. Cliquer dessus enregistre le paiement et génère
          automatiquement la dépense comptable correspondante.
        </p>
      </div>

      {totalPending > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
            <Clock className="text-amber-600" size={22} />
          </div>
          <div>
            <p className="text-sm text-amber-600">Salaires en attente de paiement</p>
            <p className="text-2xl font-bold text-amber-700">{formatFCFA(totalPending)}</p>
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Users className="mx-auto text-slate-300 mb-3" size={48} />
          <p className="text-slate-500 font-medium">Aucun bulletin de salaire créé</p>
          <p className="text-sm text-slate-400 mt-1 mb-4">Commence par créer un bulletin pour chaque employé à payer</p>
          <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-sm font-medium">
            <Plus size={16} /> Créer le premier bulletin
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* VUE MOBILE (Cartes soignées comme le bulletin) */}
          <div className="grid grid-cols-1 gap-3.5 md:hidden">
            {entries.map(e => (
              <div key={e.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-bold text-slate-900 text-base">{e.user?.full_name}</p>
                    <span className="inline-block mt-0.5 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[11px] font-medium capitalize">
                      {e.user?.role}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-block px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-semibold">
                      📅 {e.period}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 grid grid-cols-3 gap-2 text-center border border-slate-100">
                  <div>
                    <p className="text-[10px] text-slate-400 font-medium uppercase">Brut</p>
                    <p className="text-xs font-semibold text-slate-700 mt-0.5">{formatFCFA(e.gross_salary)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-medium uppercase">Déductions</p>
                    <p className="text-xs font-semibold text-rose-600 mt-0.5">-{formatFCFA(e.deductions)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-medium uppercase">Net</p>
                    <p className="text-xs font-bold text-emerald-700 mt-0.5">{formatFCFA(e.net_salary)}</p>
                  </div>
                </div>

                <div className="pt-1">
                  {e.status === 'paid' ? (
                    <div className="w-full py-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs flex items-center justify-center gap-1.5">
                      <CheckCircle2 size={15} /> Salaire Payé ✅
                    </div>
                  ) : (
                    <button
                      onClick={() => handlePay(e)}
                      disabled={payingId === e.id}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#FF6B00] to-orange-500 hover:from-[#e55f00] hover:to-orange-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 disabled:opacity-50 transition-all active:scale-[0.98]"
                    >
                      {payingId === e.id ? (
                        <>
                          <Loader2 size={15} className="animate-spin" /> Traitement du paiement...
                        </>
                      ) : (
                        <>
                          <Wallet size={15} /> Payer le salaire ({formatFCFA(e.net_salary)})
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* VUE TABLETTE & DESKTOP (Tableau avec overflow-x-auto) */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Employé</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600">Période</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Brut</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Déductions</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Net</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entries.map(e => (
                    <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900">{e.user?.full_name}</p>
                        <p className="text-xs text-slate-400 capitalize">{e.user?.role}</p>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-500 font-mono text-xs">{e.period}</td>
                      <td className="px-4 py-3 text-right text-slate-600 font-mono">{formatFCFA(e.gross_salary)}</td>
                      <td className="px-4 py-3 text-right text-slate-500 font-mono">-{formatFCFA(e.deductions)}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900 font-mono">{formatFCFA(e.net_salary)}</td>
                      <td className="px-4 py-3 text-center">
                        {e.status === 'paid' ? (
                          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-bold border border-green-200">
                            <CheckCircle2 size={12} /> Payé
                          </span>
                        ) : (
                          <button
                            onClick={() => handlePay(e)}
                            disabled={payingId === e.id}
                            className="inline-flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-full bg-[#FF6B00] hover:bg-[#e55f00] text-white font-bold disabled:opacity-50 shadow-sm transition-all"
                          >
                            {payingId === e.id ? <Loader2 size={12} className="animate-spin" /> : <Wallet size={12} />}
                            Payer
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">Nouveau bulletin</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Employé *</label>
                <select value={formData.user_id} onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]">
                  <option value="">Sélectionner...</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.role})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Période (AAAA-MM) *</label>
                <input type="month" value={formData.period} onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Salaire brut *</label>
                  <input type="number" value={formData.gross_salary} onChange={(e) => setFormData({ ...formData, gross_salary: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Déductions</label>
                  <input type="number" value={formData.deductions} onChange={(e) => setFormData({ ...formData, deductions: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium">Annuler</button>
              <button onClick={handleCreate} disabled={saving} className="flex-1 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Créer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
