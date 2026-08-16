'use client';

import { useState, useEffect } from 'react';
import { Package, Plus, X, Save, Loader2, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/hooks/useConfirm';

function formatFCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}

const emptyForm = { name: '', description: '', price: '', billing_cycle: 'monthly', max_students: '', features: '' };

export default function SuperAdminPlansPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/v1/subscriptions/plans/all');
      setPlans(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => { setEditingId(null); setFormData(emptyForm); setShowModal(true); };
  const openEdit = (plan: any) => {
    setEditingId(plan.id);
    setFormData({
      name: plan.name, description: plan.description || '', price: String(plan.price),
      billing_cycle: plan.billing_cycle, max_students: plan.max_students ? String(plan.max_students) : '',
      features: plan.features || ''
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.price) {
      toast.error('Nom et prix requis');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...formData,
        price: parseFloat(formData.price),
        max_students: formData.max_students ? parseInt(formData.max_students) : null
      };
      if (editingId) {
        await api.put(`/api/v1/subscriptions/plans/${editingId}`, payload);
        toast.success('Plan mis à jour');
      } else {
        await api.post('/api/v1/subscriptions/plans', payload);
        toast.success('Plan créé');
      }
      setShowModal(false);
      load();
    } catch (error) {
      toast.error('Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (plan: any) => {
    const ok = await confirm({ title: 'Désactiver ce plan ?', message: `"${plan.name}" ne sera plus proposé aux nouvelles universités.`, confirmText: 'Désactiver', variant: 'danger' });
    if (!ok) return;
    try {
      await api.delete(`/api/v1/subscriptions/plans/${plan.id}`);
      toast.success('Plan désactivé');
      load();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B00] border-t-transparent"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Plans tarifaires</h1>
          <p className="text-slate-500 mt-1">Les offres proposées aux universités</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-5 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-sm font-medium">
          <Plus size={16} /> Nouveau plan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map(plan => (
          <div key={plan.id} className={`bg-white rounded-2xl border p-5 ${!plan.is_active ? 'opacity-50 border-slate-200' : 'border-slate-200'}`}>
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-bold text-slate-900 text-lg">{plan.name}</h3>
              <button onClick={() => handleDeactivate(plan)} className="text-slate-300 hover:text-red-500"><Trash2 size={15} /></button>
            </div>
            {!plan.is_active && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 mb-2 inline-block">Désactivé</span>}
            <p className="text-2xl font-bold text-[#FF6B00] mt-2">
              {formatFCFA(plan.price)} <span className="text-sm text-slate-400 font-normal">/{plan.billing_cycle === 'monthly' ? 'mois' : 'an'}</span>
            </p>
            <p className="text-sm text-slate-500 mt-2">{plan.description}</p>
            <p className="text-xs text-slate-400 mt-2">Max étudiants : {plan.max_students || 'Illimité'}</p>
            <button onClick={() => openEdit(plan)} className="w-full mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium">
              Modifier
            </button>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">{editingId ? 'Modifier le plan' : 'Nouveau plan'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Nom du plan"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Description" rows={2}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none" />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} placeholder="Prix (FCFA)"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                <select value={formData.billing_cycle} onChange={(e) => setFormData({ ...formData, billing_cycle: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                  <option value="monthly">Mensuel</option>
                  <option value="yearly">Annuel</option>
                </select>
              </div>
              <input type="number" value={formData.max_students} onChange={(e) => setFormData({ ...formData, max_students: e.target.value })} placeholder="Max étudiants (vide = illimité)"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              <textarea value={formData.features} onChange={(e) => setFormData({ ...formData, features: e.target.value })} placeholder="Fonctionnalités incluses" rows={2}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none" />
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium">Annuler</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
