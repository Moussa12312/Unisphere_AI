'use client';

import { useState, useEffect } from 'react';
import { Landmark, Lock, Plus, X, Save, Loader2, CheckCircle2, AlertTriangle, Unlock } from 'lucide-react';
import { ledgerService, FiscalYear, BankReconciliation } from '@/services/ledgerService';
import { accountingService, BankAccount } from '@/services/accountingService';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/hooks/useConfirm';

function formatFCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}

const currentAcademicYear = () => {
  const now = new Date();
  const y = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return `${y}-${y + 1}`;
};

export default function ClosingPage() {
  const toast = useToast();
  const confirm = useConfirm();

  const [tab, setTab] = useState<'fiscal' | 'reconciliation'>('fiscal');
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [reconciliations, setReconciliations] = useState<BankReconciliation[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showFyModal, setShowFyModal] = useState(false);
  const [fyForm, setFyForm] = useState({ period: currentAcademicYear(), start_date: '', end_date: '' });

  const [showRecModal, setShowRecModal] = useState(false);
  const [recForm, setRecForm] = useState({ bank_account_id: '', statement_date: new Date().toISOString().split('T')[0], statement_balance: '', notes: '' });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [fy, rec, accs] = await Promise.all([
        ledgerService.getFiscalYears(),
        ledgerService.getReconciliations(),
        accountingService.getBankAccounts()
      ]);
      setFiscalYears(fy);
      setReconciliations(rec);
      setBankAccounts(accs);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFy = async () => {
    if (!fyForm.period || !fyForm.start_date || !fyForm.end_date) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    setSaving(true);
    try {
      await ledgerService.createFiscalYear(fyForm);
      toast.success('Exercice créé avec succès');
      setShowFyModal(false);
      load();
    } catch (error) {
      toast.error('Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const handleCloseFy = async (fy: FiscalYear) => {
    const ok = await confirm({
      title: "Clôturer cet exercice ?",
      message: `Une fois clôturé, l'exercice "${fy.period}" ne pourra plus recevoir de nouvelles écritures. Cette action est irréversible.`,
      confirmText: 'Clôturer',
      variant: 'danger'
    });
    if (!ok) return;
    try {
      await ledgerService.closeFiscalYear(fy.id);
      toast.success('Exercice clôturé avec succès');
      load();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la clôture');
    }
  };

  const handleCreateReconciliation = async () => {
    if (!recForm.bank_account_id || !recForm.statement_balance) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    setSaving(true);
    try {
      const result = await ledgerService.createReconciliation({
        ...recForm,
        bank_account_id: parseInt(recForm.bank_account_id),
        statement_balance: parseFloat(recForm.statement_balance)
      });
      if (result.status === 'reconciled') {
        toast.success('Rapprochement réussi : les soldes correspondent !');
      } else {
        toast.error(`Écart détecté : ${formatFCFA(result.difference)}`);
      }
      setShowRecModal(false);
      load();
    } catch (error) {
      toast.error('Erreur lors du rapprochement');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B00] border-t-transparent"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Clôture & Rapprochement</h1>
        <p className="text-slate-500 mt-1">Exercices comptables et vérification des soldes bancaires</p>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        <button onClick={() => setTab('fiscal')} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === 'fiscal' ? 'border-[#FF6B00] text-[#FF6B00]' : 'border-transparent text-slate-500'}`}>
          Exercices comptables
        </button>
        <button onClick={() => setTab('reconciliation')} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === 'reconciliation' ? 'border-[#FF6B00] text-[#FF6B00]' : 'border-transparent text-slate-500'}`}>
          Rapprochement bancaire
        </button>
      </div>

      {tab === 'fiscal' && (
        <>
          <div className="flex justify-end">
            <button onClick={() => setShowFyModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-sm font-medium shadow-md">
              <Plus size={16} /> Nouvel exercice
            </button>
          </div>
          {fiscalYears.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <Lock className="mx-auto text-slate-300 mb-3" size={48} />
              <p className="text-slate-500">Aucun exercice comptable créé</p>
            </div>
          ) : (
            <div className="space-y-3">
              {fiscalYears.map(fy => (
                <div key={fy.id} className="bg-white rounded-xl border border-slate-200 p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {fy.status === 'closed' ? <Lock className="text-slate-400" size={18} /> : <Unlock className="text-green-500" size={18} />}
                    <div>
                      <h3 className="font-semibold text-slate-900">{fy.period}</h3>
                      <p className="text-sm text-slate-500">
                        Du {new Date(fy.start_date).toLocaleDateString('fr-FR')} au {new Date(fy.end_date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  {fy.status === 'closed' ? (
                    <span className="text-xs px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 font-medium">Clôturé</span>
                  ) : (
                    <button onClick={() => handleCloseFy(fy)} className="flex items-center gap-1.5 px-4 py-2 bg-[#0a1628] hover:bg-slate-800 text-white rounded-lg text-sm font-medium">
                      <Lock size={14} /> Clôturer
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'reconciliation' && (
        <>
          <div className="flex justify-end">
            <button onClick={() => setShowRecModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-sm font-medium shadow-md">
              <Plus size={16} /> Nouveau rapprochement
            </button>
          </div>
          {reconciliations.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <Landmark className="mx-auto text-slate-300 mb-3" size={48} />
              <p className="text-slate-500">Aucun rapprochement effectué</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reconciliations.map(rec => {
                const account = bankAccounts.find(a => a.id === rec.bank_account_id);
                return (
                  <div key={rec.id} className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-900">{account?.name || 'Compte'}</h3>
                        <p className="text-sm text-slate-500">Relevé du {new Date(rec.statement_date).toLocaleDateString('fr-FR')}</p>
                      </div>
                      {rec.status === 'reconciled' ? (
                        <span className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-green-100 text-green-700 font-medium">
                          <CheckCircle2 size={12} /> Rapproché
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-red-100 text-red-700 font-medium">
                          <AlertTriangle size={12} /> Écart de {formatFCFA(Math.abs(rec.difference))}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-100 text-sm">
                      <div>
                        <p className="text-slate-400">Solde du relevé</p>
                        <p className="font-semibold text-slate-900">{formatFCFA(rec.statement_balance)}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Solde comptable</p>
                        <p className="font-semibold text-slate-900">{formatFCFA(rec.book_balance)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {showFyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">Nouvel exercice comptable</h2>
              <button onClick={() => setShowFyModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Période *</label>
                <input type="text" value={fyForm.period} onChange={(e) => setFyForm({ ...fyForm, period: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Date de début *</label>
                  <input type="date" value={fyForm.start_date} onChange={(e) => setFyForm({ ...fyForm, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Date de fin *</label>
                  <input type="date" value={fyForm.end_date} onChange={(e) => setFyForm({ ...fyForm, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowFyModal(false)} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium">Annuler</button>
              <button onClick={handleCreateFy} disabled={saving} className="flex-1 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Créer
              </button>
            </div>
          </div>
        </div>
      )}

      {showRecModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">Nouveau rapprochement</h2>
              <button onClick={() => setShowRecModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Compte bancaire *</label>
                <select value={recForm.bank_account_id} onChange={(e) => setRecForm({ ...recForm, bank_account_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]">
                  <option value="">Sélectionner...</option>
                  {bankAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Date du relevé</label>
                  <input type="date" value={recForm.statement_date} onChange={(e) => setRecForm({ ...recForm, statement_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Solde du relevé *</label>
                  <input type="number" value={recForm.statement_balance} onChange={(e) => setRecForm({ ...recForm, statement_balance: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
                </div>
              </div>
              <p className="text-xs text-slate-400">Le solde comptable sera automatiquement calculé et comparé à celui-ci.</p>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowRecModal(false)} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium">Annuler</button>
              <button onClick={handleCreateReconciliation} disabled={saving} className="flex-1 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Vérifier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
