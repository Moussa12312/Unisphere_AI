'use client';

import { useState, useEffect } from 'react';
import { Receipt, Plus, Trash2, X, Save, Loader2, Filter, TrendingDown, ArrowLeft } from 'lucide-react';
import { accountingService, Expense, ExpenseCategory, Supplier } from '@/services/accountingService';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/hooks/useConfirm';
import Link from 'next/link';

const emptyForm = {
  category_id: '', supplier_id: '', title: '', description: '',
  amount: '', expense_date: new Date().toISOString().split('T')[0],
  payment_method: 'virement', status: 'paid'
};

const PAYMENT_METHODS = [
  { value: 'especes', label: 'Espèces' },
  { value: 'virement', label: 'Virement' },
  { value: 'cheque', label: 'Chèque' },
  { value: 'mobile_money', label: 'Mobile Money' },
];

function formatFCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}

export default function AdminExpensesPage() {
  const toast = useToast();
  const confirm = useConfirm();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [filterCategory, setFilterCategory] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadExpenses();
  }, [filterCategory]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cats, sups] = await Promise.all([
        accountingService.getCategories(),
        accountingService.getSuppliers()
      ]);
      setCategories(cats || []);
      setSuppliers(sups || []);
      await loadExpenses();
    } catch (error) {
      toast.error('Erreur lors du chargement des paramètres de dépenses');
    } finally {
      setLoading(false);
    }
  };

  const loadExpenses = async () => {
    try {
      const data = await accountingService.getExpenses(filterCategory ? { category_id: filterCategory } : undefined);
      setExpenses(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Erreur lors du chargement des dépenses');
    }
  };

  const handleCreate = async () => {
    if (!formData.category_id || !formData.title || !formData.amount || !formData.expense_date) {
      toast.error('Veuillez remplir les champs obligatoires');
      return;
    }
    setSaving(true);
    try {
      await accountingService.createExpense({
        ...formData,
        category_id: parseInt(formData.category_id),
        supplier_id: formData.supplier_id ? parseInt(formData.supplier_id) : undefined,
        amount: parseFloat(formData.amount)
      });
      toast.success('Dépense enregistrée avec succès');
      setShowModal(false);
      setFormData(emptyForm);
      loadExpenses();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (expense: Expense) => {
    const ok = await confirm({
      title: 'Supprimer cette dépense ?',
      message: `Supprimer "${expense.title}" (${formatFCFA(expense.amount)}) ?`,
      confirmText: 'Supprimer',
      variant: 'danger'
    });
    if (!ok) return;
    try {
      await accountingService.deleteExpense(expense.id);
      toast.success('Dépense supprimée');
      loadExpenses();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const total = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B00] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingDown className="w-7 h-7 text-rose-600" /> Gestion des Dépenses
          </h1>
          <p className="text-slate-500 text-sm mt-1">Supervision et engagement des dépenses de l'établissement</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/payments"
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-medium transition-all"
          >
            <ArrowLeft size={16} /> Voir les Paiements
          </Link>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-sm font-medium transition-all shadow-md"
          >
            <Plus size={16} /> Nouvelle dépense
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/50 rounded-xl flex items-center justify-center shrink-0">
            <TrendingDown className="text-red-600 dark:text-red-400" size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">Total des dépenses</p>
            <p className="text-2xl font-bold text-red-700 dark:text-red-300">{formatFCFA(total)}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center shrink-0">
            <Receipt className="text-slate-600 dark:text-slate-400" size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nombre d'opérations</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{expenses.length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3">
          <Filter size={18} className="text-slate-400 shrink-0" />
          <div className="w-full">
            <label className="block text-xs font-medium text-slate-500 mb-1">Filtrer par catégorie</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            >
              <option value="">Toutes les catégories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {expenses.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <Receipt className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={48} />
          <p className="text-slate-500">Aucune dépense enregistrée</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto w-full">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Titre & Réf</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Catégorie</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Fournisseur</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Date</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Montant</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900 dark:text-white">{e.title}</p>
                      <p className="text-xs text-slate-400">{e.reference || `DEP-${e.id}`}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{e.category?.name || '-'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{e.supplier?.name || '-'}</td>
                    <td className="px-4 py-3 text-center text-slate-500">
                      {new Date(e.expense_date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-rose-600">{formatFCFA(e.amount)}</td>
                    <td className="px-4 py-3 text-center">
                      <button 
                        onClick={() => handleDelete(e)} 
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                        title="Supprimer la dépense"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 max-h-[85vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Nouvelle dépense</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Titre de la dépense *</label>
                <input 
                  type="text" 
                  value={formData.title} 
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Achat fournitures administratives"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" 
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Catégorie *</label>
                  <select 
                    value={formData.category_id} 
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  >
                    <option value="">Sélectionner...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Fournisseur</label>
                  <select 
                    value={formData.supplier_id} 
                    onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  >
                    <option value="">Aucun</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Montant (FCFA) *</label>
                  <input 
                    type="number" 
                    value={formData.amount} 
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Date *</label>
                  <input 
                    type="date" 
                    value={formData.expense_date} 
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Mode de règlement</label>
                <select 
                  value={formData.payment_method} 
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Description / Motif</label>
                <textarea 
                  value={formData.description} 
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00] resize-none" 
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setShowModal(false)} 
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium transition-all"
              >
                Annuler
              </button>
              <button 
                onClick={handleCreate} 
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2 shadow-md transition-all"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

