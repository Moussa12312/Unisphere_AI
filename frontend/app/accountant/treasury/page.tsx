'use client';

import { useState, useEffect } from 'react';
import { Wallet, Plus, X, Save, Loader2, Landmark, Banknote, ArrowUpCircle, ArrowDownCircle, Edit2, Trash2 } from 'lucide-react';
import { accountingService, BankAccount } from '@/services/accountingService';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/hooks/useConfirm';

function formatFCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(amount || 0)) + ' FCFA';
}

const emptyAccountForm = { name: '', account_type: 'bank', bank_name: '', account_number: '', initial_balance: '' };
const getTodayLocal = () => new Date().toLocaleDateString('en-CA');
const emptyTxForm = { bank_account_id: '', transaction_type: 'in', amount: '', description: '', transaction_date: getTodayLocal() };

export default function TreasuryPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [showTxModal, setShowTxModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [accountForm, setAccountForm] = useState(emptyAccountForm);
  const [txForm, setTxForm] = useState(emptyTxForm);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [accs, txs, dash] = await Promise.all([
        accountingService.getBankAccounts(),
        accountingService.getCashTransactions(),
        accountingService.getDashboard().catch(() => null),
      ]);
      setAccounts(accs);
      setTransactions(txs);
      setDashboard(dash);
    } catch (error) {
      toast.error('Erreur lors du chargement de la trésorerie');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingAccount(null);
    setAccountForm(emptyAccountForm);
    setShowAccountModal(true);
  };

  const openEditModal = (acc: BankAccount) => {
    setEditingAccount(acc);
    setAccountForm({
      name: acc.name || '',
      account_type: acc.account_type || 'bank',
      bank_name: acc.bank_name || '',
      account_number: acc.account_number || '',
      initial_balance: String(acc.initial_balance ?? 0),
    });
    setShowAccountModal(true);
  };

  const handleSaveAccount = async () => {
    if (!accountForm.name.trim()) {
      toast.error('Le nom du compte est requis');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...accountForm,
        name: accountForm.name.trim(),
        initial_balance: parseFloat(accountForm.initial_balance) || 0,
      };
      if (editingAccount) {
        await accountingService.updateBankAccount(editingAccount.id, payload);
        toast.success('Compte mis à jour avec succès');
      } else {
        await accountingService.createBankAccount(payload);
        toast.success('Compte créé avec succès');
      }
      setShowAccountModal(false);
      setEditingAccount(null);
      setAccountForm(emptyAccountForm);
      load();
    } catch (error) {
      toast.error(editingAccount ? 'Erreur lors de la modification du compte' : 'Erreur lors de la création du compte');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async (acc: BankAccount) => {
    const ok = await confirm({
      title: 'Supprimer ce compte de trésorerie ?',
      message: `Voulez-vous vraiment supprimer le compte "${acc.name}" ? Ses mouvements manuels associés seront également retirés.`,
      confirmText: 'Supprimer',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await accountingService.deleteBankAccount(acc.id);
      toast.success('Compte supprimé avec succès');
      load();
    } catch (error) {
      toast.error('Erreur lors de la suppression du compte');
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
        amount: parseFloat(txForm.amount),
      });
      toast.success('Mouvement enregistré');
      setShowTxModal(false);
      setTxForm({ ...emptyTxForm, transaction_date: getTodayLocal() });
      load();
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const accountsSum = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);
  const consolidatedBalance = dashboard?.treasury_balance ?? accountsSum;
  const initialTotal = dashboard?.initial_treasury ?? accounts.reduce((sum, a) => sum + (a.initial_balance || 0), 0);
  const totalIncome = dashboard?.total_income ?? 0;
  const totalExpenses = dashboard?.total_expenses ?? 0;
  const manualNet = (dashboard?.cash_in_total ?? 0) - (dashboard?.cash_out_total ?? 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B00] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Trésorerie</h1>
          <p className="text-slate-500 mt-1 text-sm">Comptes bancaires, caisse et mouvements consolidés</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowTxModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-medium"
          >
            <Plus size={16} /> Mouvement
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-sm font-medium shadow-md"
          >
            <Plus size={16} /> Nouveau compte
          </button>
        </div>
      </div>

      {/* Bannière Trésorerie Consolidée (synchronisée avec le Dashboard Comptable) */}
      <div className="bg-gradient-to-r from-[#0a1628] to-blue-900 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-white/70 font-semibold">Trésorerie nette disponible (consolidée)</p>
            <p className="text-3xl font-bold mt-1">{formatFCFA(consolidatedBalance)}</p>
            <p className="text-xs text-white/60 mt-1">
              Cumul comptable : Soldes d&apos;ouverture + Recettes encaissées − Dépenses payées ± Mouvements manuels
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="bg-white/10 rounded-xl px-3 py-2 border border-white/10">
              <p className="text-white/65">Soldes initiaux</p>
              <p className="font-bold text-white mt-0.5">{formatFCFA(initialTotal)}</p>
            </div>
            <div className="bg-emerald-500/15 rounded-xl px-3 py-2 border border-emerald-400/20">
              <p className="text-emerald-200">+ Recettes scolarité</p>
              <p className="font-bold text-emerald-300 mt-0.5">{formatFCFA(totalIncome)}</p>
            </div>
            <div className="bg-rose-500/15 rounded-xl px-3 py-2 border border-rose-400/20">
              <p className="text-rose-200">− Dépenses payées</p>
              <p className="font-bold text-rose-300 mt-0.5">{formatFCFA(totalExpenses)}</p>
            </div>
            <div className="bg-white/10 rounded-xl px-3 py-2 border border-white/10">
              <p className="text-white/65">± Flux manuels</p>
              <p className="font-bold text-white mt-0.5">{manualNet >= 0 ? '+' : ''}{formatFCFA(manualNet)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cartes des Comptes avec Modifier & Supprimer */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map(acc => (
          <div key={acc.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${acc.account_type === 'cash' ? 'bg-green-50' : 'bg-blue-50'}`}>
                  {acc.account_type === 'cash' ? <Banknote className="text-green-600" size={18} /> : <Landmark className="text-blue-600" size={18} />}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900 truncate">{acc.name}</h3>
                  <p className="text-xs text-slate-400 truncate">
                    {acc.account_type === 'cash'
                      ? 'Caisse espèces'
                      : [acc.bank_name, acc.account_number].filter(Boolean).join(' • ') || 'Compte bancaire'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => openEditModal(acc)}
                  title="Modifier ce compte"
                  className="p-2 text-slate-400 hover:text-[#FF6B00] hover:bg-orange-50 rounded-lg transition-colors"
                >
                  <Edit2 size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteAccount(acc)}
                  title="Supprimer ce compte"
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatFCFA(acc.balance)}</p>
            <p className="text-xs text-slate-400 mt-1">Solde initial : {formatFCFA(acc.initial_balance)}</p>
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
            <h3 className="font-semibold text-slate-900">Derniers mouvements manuels</h3>
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
              <h2 className="text-xl font-bold text-slate-900">
                {editingAccount ? 'Modifier le compte' : 'Nouveau compte'}
              </h2>
              <button
                onClick={() => { setShowAccountModal(false); setEditingAccount(null); }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nom du compte *</label>
                <input
                  type="text"
                  value={accountForm.name}
                  onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                  placeholder="Ex: Compte principal BOA"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
                <select
                  value={accountForm.account_type}
                  onChange={(e) => setAccountForm({ ...accountForm, account_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  <option value="bank">Compte bancaire</option>
                  <option value="cash">Caisse</option>
                </select>
              </div>
              {accountForm.account_type === 'bank' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Banque</label>
                    <input
                      type="text"
                      value={accountForm.bank_name}
                      onChange={(e) => setAccountForm({ ...accountForm, bank_name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">N° de compte</label>
                    <input
                      type="text"
                      value={accountForm.account_number}
                      onChange={(e) => setAccountForm({ ...accountForm, account_number: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Solde initial (FCFA)</label>
                <input
                  type="number"
                  value={accountForm.initial_balance}
                  onChange={(e) => setAccountForm({ ...accountForm, initial_balance: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => { setShowAccountModal(false); setEditingAccount(null); }}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveAccount}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {editingAccount ? 'Enregistrer' : 'Créer'}
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
                <select
                  value={txForm.bank_account_id}
                  onChange={(e) => setTxForm({ ...txForm, bank_account_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  <option value="">Sélectionner...</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
                <select
                  value={txForm.transaction_type}
                  onChange={(e) => setTxForm({ ...txForm, transaction_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  <option value="in">Entrée</option>
                  <option value="out">Sortie</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Montant *</label>
                  <input
                    type="number"
                    value={txForm.amount}
                    onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={txForm.transaction_date}
                    onChange={(e) => setTxForm({ ...txForm, transaction_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  value={txForm.description}
                  onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
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
