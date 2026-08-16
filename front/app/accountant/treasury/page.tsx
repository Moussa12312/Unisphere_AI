'use client';

import { useState, useEffect } from 'react';
import { Wallet, Plus, X, Save, Loader2, Landmark, Banknote, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { accountingService, BankAccount } from '@/services/accountingService';
import { useToast } from '@/components/ToastProvider';

function formatFCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}

const emptyAccountForm = { name: '', account_type: 'bank', bank_name: '', account_number: '', initial_balance: '' };
const emptyTxForm = { bank_account_id: '', transaction_type: 'in', amount: '', description: '', transaction_date: new Date().toISOString().split('T')[0] };

export default function TreasuryPage() {
  const toast = useToast();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showTxModal, setShowTxModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [accountForm, setAccountForm] = useState(emptyAccountForm);
  const [txForm, setTxForm] = useState(emptyTxForm);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [accs, txs] = await Promise.all([accountingService.getBankAccounts(), accountingService.getCashTransactions()]);
      setAccounts(accs);
      setTransactions(txs);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!accountForm.name) {
      toast.error('Le nom du compte est requis');
      return;
    }
    setSaving(true);
    try {
      await accountingService.createBankAccount({
        ...accountForm,
        initial_balance: parseFloat(accountForm.initial_balance) || 0
      });
      toast.success('Compte créé avec succès');
      setShowAccountModal(false);
      setAccountForm(emptyAccountForm);
      load();
    } catch (error) {
      toast.error('Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTx = async () => {
    if (!txForm.bank_account_id || !txForm.amount) {
      toast.error('Veuillez remplir les champs obligatoires');
      return;
    }
    setSaving(true);
    try {
      await accountingService.createCashTransaction({
        ...txForm,
        bank_account_id: parseInt(txForm.bank_account_id),
        amount: parseFloat(txForm.amount)
      });
      toast.success('Mouvement enregistré');
      setShowTxModal(false);
      setTxForm(emptyTxForm);
      load();
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B00] border-t-transparent"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Trésorerie</h1>
          <p className="text-slate-500 mt-1">Comptes bancaires, caisse et mouvements</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowTxModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-medium">
            <Plus size={16} /> Mouvement
          </button>
          <button onClick={() => setShowAccountModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-sm font-medium shadow-md">
            <Plus size={16} /> Nouveau compte
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-r from-[#0a1628] to-blue-900 rounded-2xl p-6 text-white">
        <p className="text-sm text-white/70">Solde total consolidé</p>
        <p className="text-3xl font-bold mt-1">{formatFCFA(totalBalance)}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map(acc => (
          <div key={acc.id} className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${acc.account_type === 'cash' ? 'bg-green-50' : 'bg-blue-50'}`}>
                {acc.account_type === 'cash' ? <Banknote className="text-green-600" size={18} /> : <Landmark className="text-blue-600" size={18} />}
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">{acc.name}</h3>
                {acc.bank_name && <p className="text-xs text-slate-400">{acc.bank_name}</p>}
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatFCFA(acc.balance)}</p>
          </div>
        ))}
        {accounts.length === 0 && (
          <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Wallet className="mx-auto text-slate-300 mb-3" size={48} />
            <p className="text-slate-500">Aucun compte de trésorerie configuré</p>
          </div>
        )}
      </div>

      {transactions.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">Derniers mouvements</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {transactions.slice(0, 10).map((t: any) => (
              <div key={t.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {t.transaction_type === 'in' ? <ArrowUpCircle className="text-green-500" size={18} /> : <ArrowDownCircle className="text-red-500" size={18} />}
                  <div>
                    <p className="text-sm font-medium text-slate-900">{t.description || 'Mouvement'}</p>
                    <p className="text-xs text-slate-400">{new Date(t.transaction_date).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
                <p className={`font-semibold ${t.transaction_type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                  {t.transaction_type === 'in' ? '+' : '-'}{formatFCFA(t.amount)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAccountModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">Nouveau compte</h2>
              <button onClick={() => setShowAccountModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nom du compte *</label>
                <input type="text" value={accountForm.name} onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                  placeholder="Ex: Compte principal BOA"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
                <select value={accountForm.account_type} onChange={(e) => setAccountForm({ ...accountForm, account_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]">
                  <option value="bank">Compte bancaire</option>
                  <option value="cash">Caisse</option>
                </select>
              </div>
              {accountForm.account_type === 'bank' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Banque</label>
                    <input type="text" value={accountForm.bank_name} onChange={(e) => setAccountForm({ ...accountForm, bank_name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">N° de compte</label>
                    <input type="text" value={accountForm.account_number} onChange={(e) => setAccountForm({ ...accountForm, account_number: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Solde initial (FCFA)</label>
                <input type="number" value={accountForm.initial_balance} onChange={(e) => setAccountForm({ ...accountForm, initial_balance: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAccountModal(false)} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium">Annuler</button>
              <button onClick={handleCreateAccount} disabled={saving} className="flex-1 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Créer
              </button>
            </div>
          </div>
        </div>
      )}

      {showTxModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">Nouveau mouvement</h2>
              <button onClick={() => setShowTxModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Compte *</label>
                <select value={txForm.bank_account_id} onChange={(e) => setTxForm({ ...txForm, bank_account_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]">
                  <option value="">Sélectionner...</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
                <select value={txForm.transaction_type} onChange={(e) => setTxForm({ ...txForm, transaction_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]">
                  <option value="in">Entrée</option>
                  <option value="out">Sortie</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Montant *</label>
                  <input type="number" value={txForm.amount} onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Date</label>
                  <input type="date" value={txForm.transaction_date} onChange={(e) => setTxForm({ ...txForm, transaction_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                <input type="text" value={txForm.description} onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowTxModal(false)} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium">Annuler</button>
              <button onClick={handleCreateTx} disabled={saving} className="flex-1 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
