'use client';

import { useState, useEffect } from 'react';
import { Scale, CheckCircle2, AlertTriangle, Plus, X, Save, Loader2, Trash2, Settings } from 'lucide-react';
import { ledgerService, Account } from '@/services/ledgerService';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/hooks/useConfirm';

function formatFCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}

const CLASS_LABELS: Record<string, string> = {
  capitaux: 'Capitaux',
  immobilisation: 'Immobilisations',
  tiers: 'Tiers',
  tresorerie: 'Trésorerie',
  charge: 'Charges',
  produit: 'Produits',
};

const emptyAccountForm = { code: '', name: '', account_class: 'charge' };

export default function TrialBalancePage() {
  const toast = useToast();
  const confirm = useConfirm();

  const [tab, setTab] = useState<'balance' | 'accounts'>('balance');
  const [balance, setBalance] = useState<any>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(emptyAccountForm);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [b, a] = await Promise.all([ledgerService.getTrialBalance(), ledgerService.getAccounts()]);
      setBalance(b);
      setAccounts(a);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!formData.code || !formData.name) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    setSaving(true);
    try {
      await ledgerService.createAccount(formData);
      toast.success('Compte créé avec succès');
      setShowModal(false);
      setFormData(emptyAccountForm);
      load();
    } catch (error) {
      toast.error('Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async (acc: Account) => {
    const ok = await confirm({ title: 'Supprimer ce compte ?', message: `Supprimer "${acc.code} — ${acc.name}" ?`, confirmText: 'Supprimer', variant: 'danger' });
    if (!ok) return;
    try {
      await ledgerService.deleteAccount(acc.id);
      toast.success('Compte supprimé');
      load();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B00] border-t-transparent"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Balance & Plan comptable</h1>
          <p className="text-slate-500 mt-1">Vue d'ensemble comptable de l'université</p>
        </div>
        {tab === 'accounts' && (
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-sm font-medium shadow-md">
            <Plus size={16} /> Nouveau compte
          </button>
        )}
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        <button onClick={() => setTab('balance')} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === 'balance' ? 'border-[#FF6B00] text-[#FF6B00]' : 'border-transparent text-slate-500'}`}>
          Balance comptable
        </button>
        <button onClick={() => setTab('accounts')} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === 'accounts' ? 'border-[#FF6B00] text-[#FF6B00]' : 'border-transparent text-slate-500'}`}>
          Plan comptable
        </button>
      </div>

      {tab === 'balance' && balance && (
        <>
          <div className={`rounded-2xl p-5 flex items-center gap-4 ${balance.is_balanced ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
            {balance.is_balanced ? <CheckCircle2 className="text-green-600" size={24} /> : <AlertTriangle className="text-red-600" size={24} />}
            <div>
              <p className={`font-semibold ${balance.is_balanced ? 'text-green-700' : 'text-red-700'}`}>
                {balance.is_balanced ? 'Balance équilibrée' : 'Balance déséquilibrée'}
              </p>
              <p className="text-sm text-slate-500">
                Total débit : {formatFCFA(balance.total_debit)} — Total crédit : {formatFCFA(balance.total_credit)}
              </p>
            </div>
          </div>

          {balance.accounts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <Scale className="mx-auto text-slate-300 mb-3" size={48} />
              <p className="text-slate-500">Aucun mouvement comptable enregistré</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Compte</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Classe</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600">Débit</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600">Crédit</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600">Solde</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {balance.accounts.map((row: any) => (
                    <tr key={row.account.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{row.account.code}</p>
                        <p className="text-xs text-slate-400">{row.account.name}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{CLASS_LABELS[row.account.class] || row.account.class}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatFCFA(row.total_debit)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatFCFA(row.total_credit)}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${row.balance >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
                        {formatFCFA(row.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'accounts' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Code</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Nom du compte</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Classe</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {accounts.map(acc => (
                <tr key={acc.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-slate-700">{acc.code}</td>
                  <td className="px-4 py-3 text-slate-900">{acc.name}</td>
                  <td className="px-4 py-3 text-slate-500">{CLASS_LABELS[acc.account_class] || acc.account_class}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => handleDeleteAccount(acc)} className="text-slate-300 hover:text-red-500"><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">Nouveau compte</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Code *</label>
                <input type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Ex: 622100"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nom *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Classe</label>
                <select value={formData.account_class} onChange={(e) => setFormData({ ...formData, account_class: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]">
                  {Object.entries(CLASS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium">Annuler</button>
              <button onClick={handleCreateAccount} disabled={saving} className="flex-1 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Créer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
