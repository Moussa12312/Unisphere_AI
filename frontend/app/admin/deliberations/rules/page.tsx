'use client';

import { useState, useEffect } from 'react';
import { Scale, Plus, Trash2, X, Save, Loader2, Pencil } from 'lucide-react';
import { deliberationService, DeliberationRule } from '@/services/deliberationService';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/hooks/useConfirm';

const emptyForm = {
  name: '', filiere: '', level: '',
  min_average: 10, max_failed_courses: 2, catchup_min_average: 8
};

export default function DeliberationRulesPage() {
  const toast = useToast();
  const confirm = useConfirm();

  const [rules, setRules] = useState<DeliberationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    setLoading(true);
    try {
      const data = await deliberationService.getRules();
      setRules(data);
    } catch (error) {
      toast.error('Erreur lors du chargement des règles');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setShowModal(true);
  };

  const openEdit = (rule: DeliberationRule) => {
    setEditingId(rule.id);
    setFormData({
      name: rule.name,
      filiere: rule.filiere || '',
      level: rule.level || '',
      min_average: rule.min_average,
      max_failed_courses: rule.max_failed_courses,
      catchup_min_average: rule.catchup_min_average
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error('Le nom de la règle est requis');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await deliberationService.updateRule(editingId, formData);
        toast.success('Règle mise à jour');
      } else {
        await deliberationService.createRule(formData);
        toast.success('Règle créée avec succès');
      }
      setShowModal(false);
      loadRules();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (rule: DeliberationRule) => {
    const ok = await confirm({
      title: 'Supprimer cette règle ?',
      message: `Supprimer la règle "${rule.name}" ? Les sessions déjà liées ne seront pas affectées.`,
      confirmText: 'Supprimer',
      variant: 'danger'
    });
    if (!ok) return;
    try {
      await deliberationService.deleteRule(rule.id);
      toast.success('Règle supprimée');
      loadRules();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Règles de validation</h1>
          <p className="text-slate-500 mt-1">Critères automatiques utilisés lors des délibérations</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-sm font-medium transition-all shadow-md"
        >
          <Plus size={16} /> Nouvelle règle
        </button>
      </div>

      {rules.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Scale className="mx-auto text-slate-300 mb-3" size={48} />
          <p className="text-slate-500">Aucune règle définie pour le moment</p>
          <p className="text-sm text-slate-400 mt-1">
            Les sessions sans règle assignée utiliseront les valeurs par défaut (moyenne ≥ 10)
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rules.map((rule) => (
            <div key={rule.id} className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center">
                    <Scale className="text-purple-600" size={16} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{rule.name}</h3>
                    <p className="text-xs text-slate-400">
                      {rule.filiere || 'Toutes filières'} • {rule.level || 'Tous niveaux'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(rule)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(rule)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100 text-center">
                <div>
                  <p className="text-lg font-bold text-green-600">{rule.min_average}</p>
                  <p className="text-xs text-slate-400">Admis direct</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-amber-600">{rule.catchup_min_average}</p>
                  <p className="text-xs text-slate-400">Min. rattrapage</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-700">{rule.max_failed_courses}</p>
                  <p className="text-xs text-slate-400">Matières max.</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">{editingId ? 'Modifier la règle' : 'Nouvelle règle'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nom de la règle *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Règle standard Licence"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Filière (optionnel)</label>
                  <input type="text" value={formData.filiere} onChange={(e) => setFormData({ ...formData, filiere: e.target.value })}
                    placeholder="Toutes"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Niveau (optionnel)</label>
                  <input type="text" value={formData.level} onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    placeholder="Tous"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Moyenne minimale (admission directe)</label>
                <input type="number" step="0.5" value={formData.min_average} onChange={(e) => setFormData({ ...formData, min_average: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Moyenne minimale (rattrapage)</label>
                <input type="number" step="0.5" value={formData.catchup_min_average} onChange={(e) => setFormData({ ...formData, catchup_min_average: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nombre max. de matières en échec (rattrapage)</label>
                <input type="number" value={formData.max_failed_courses} onChange={(e) => setFormData({ ...formData, max_failed_courses: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium">
                Annuler
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
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
