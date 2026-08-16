'use client';

import { useState, useEffect } from 'react';
import { Building, Plus, Trash2, X, Save, Loader2 } from 'lucide-react';
import { accountingService, FixedAsset } from '@/services/accountingService';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/hooks/useConfirm';

function formatFCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}

const emptyForm = { name: '', category: '', purchase_date: new Date().toISOString().split('T')[0], purchase_value: '', depreciation_years: '5', location: '', notes: '' };

const CATEGORIES = ['Bâtiment', 'Véhicule', 'Informatique', 'Mobilier', 'Équipement pédagogique', 'Autre'];

export default function FixedAssetsPage() {
  const toast = useToast();
  const confirm = useConfirm();

  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      setAssets(await accountingService.getAssets());
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.category || !formData.purchase_value) {
      toast.error('Veuillez remplir les champs obligatoires');
      return;
    }
    setSaving(true);
    try {
      await accountingService.createAsset({
        ...formData,
        purchase_value: parseFloat(formData.purchase_value),
        depreciation_years: parseInt(formData.depreciation_years)
      });
      toast.success('Bien ajouté avec succès');
      setShowModal(false);
      setFormData(emptyForm);
      load();
    } catch (error) {
      toast.error("Erreur lors de l'ajout");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (a: FixedAsset) => {
    const ok = await confirm({ title: 'Supprimer ce bien ?', message: `Retirer "${a.name}" du registre des immobilisations ?`, confirmText: 'Supprimer', variant: 'danger' });
    if (!ok) return;
    try {
      await accountingService.deleteAsset(a.id);
      toast.success('Bien supprimé');
      load();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const totalValue = assets.reduce((sum, a) => sum + a.current_value, 0);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B00] border-t-transparent"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Immobilisations</h1>
          <p className="text-slate-500 mt-1">Registre des biens durables de l'université</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-sm font-medium shadow-md">
          <Plus size={16} /> Ajouter un bien
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
        <p className="text-sm text-blue-600">Valeur nette totale (après amortissement)</p>
        <p className="text-2xl font-bold text-blue-700">{formatFCFA(totalValue)}</p>
      </div>

      {assets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Building className="mx-auto text-slate-300 mb-3" size={48} />
          <p className="text-slate-500">Aucun bien enregistré</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Bien</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Catégorie</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">Date d'achat</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Valeur d'achat</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Valeur actuelle</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assets.map(a => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{a.name}</p>
                    {a.location && <p className="text-xs text-slate-400">{a.location}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{a.category}</td>
                  <td className="px-4 py-3 text-center text-slate-500">{new Date(a.purchase_date).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatFCFA(a.purchase_value)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatFCFA(a.current_value)}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => handleDelete(a)} className="text-slate-300 hover:text-red-500"><Trash2 size={15} /></button>
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
              <h2 className="text-xl font-bold text-slate-900">Ajouter un bien</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nom *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Catégorie *</label>
                <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]">
                  <option value="">Sélectionner...</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Valeur d'achat (FCFA) *</label>
                  <input type="number" value={formData.purchase_value} onChange={(e) => setFormData({ ...formData, purchase_value: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Date d'achat</label>
                  <input type="date" value={formData.purchase_date} onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Durée d'amortissement (années)</label>
                <input type="number" value={formData.depreciation_years} onChange={(e) => setFormData({ ...formData, depreciation_years: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Emplacement</label>
                <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium">Annuler</button>
              <button onClick={handleCreate} disabled={saving} className="flex-1 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Ajouter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
