'use client';

import { useState, useEffect } from 'react';
import { PieChart, Plus, Trash2, X, Save, Loader2, AlertTriangle } from 'lucide-react';
import { accountingService, Budget, ExpenseCategory } from '@/services/accountingService';
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

const emptyForm = { category_id: '', department: '', period: currentAcademicYear(), allocated_amount: '' };

export default function BudgetPage() {
  const toast = useToast();
  const confirm = useConfirm();

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [b, c] = await Promise.all([accountingService.getBudgets(), accountingService.getCategories()]);
      setBudgets(b);
      setCategories(c);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.category_id || !formData.period || !formData.allocated_amount) {
      toast.error('Veuillez remplir les champs obligatoires');
      return;
    }
    setSaving(true);
    try {
      await accountingService.createBudget({
        ...formData,
        category_id: parseInt(formData.category_id),
        allocated_amount: parseFloat(formData.allocated_amount)
      });
      toast.success('Budget créé avec succès');
      setShowModal(false);
      setFormData(emptyForm);
      load();
    } catch (error) {
      toast.error('Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (b: Budget) => {
    const ok = await confirm({ title: 'Supprimer ce budget ?', message: `Supprimer le budget "${b.category.name}" (${b.period}) ?`, confirmText: 'Supprimer', variant: 'danger' });
    if (!ok) return;
    try {
      await accountingService.deleteBudget(b.id);
      toast.success('Budget supprimé');
      load();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B00] border-t-transparent"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Budget</h1>
          <p className="text-slate-500 mt-1">Budget alloué par catégorie et suivi des dépenses réelles</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-sm font-medium shadow-md">
          <Plus size={16} /> Nouveau budget
        </button>
      </div>

      {budgets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <PieChart className="mx-auto text-slate-300 mb-3" size={48} />
          <p className="text-slate-500">Aucun budget défini</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgets.map(b => {
            const overBudget = b.usage_percent > 100;
            const nearLimit = b.usage_percent > 80 && !overBudget;
            return (
              <div key={b.id} className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">{b.category.name}</h3>
                    <p className="text-xs text-slate-400">{b.department || 'Toute l\'université'} • {b.period}</p>
                  </div>
                  <button onClick={() => handleDelete(b)} className="text-slate-300 hover:text-red-500"><Trash2 size={15} /></button>
                </div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-500">Dépensé</span>
                  <span className={`font-semibold ${overBudget ? 'text-red-600' : 'text-slate-900'}`}>
                    {formatFCFA(b.spent_amount)} / {formatFCFA(b.allocated_amount)}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${overBudget ? 'bg-red-500' : nearLimit ? 'bg-amber-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(b.usage_percent, 100)}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-slate-400">{b.usage_percent}% utilisé</p>
                  {overBudget && (
                    <p className="text-xs text-red-600 flex items-center gap-1 font-medium">
                      <AlertTriangle size={11} /> Dépassement de {formatFCFA(Math.abs(b.remaining))}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">Nouveau budget</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Catégorie *</label>
                <select value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]">
                  <option value="">Sélectionner...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Département / filière (optionnel)</label>
                <input type="text" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="Laisser vide pour toute l'université"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Période *</label>
                  <input type="text" value={formData.period} onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Montant alloué *</label>
                  <input type="number" value={formData.allocated_amount} onChange={(e) => setFormData({ ...formData, allocated_amount: e.target.value })}
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
