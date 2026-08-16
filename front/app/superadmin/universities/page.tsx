'use client';

import { useState, useEffect } from 'react';
import { Building2, Edit3, X, Save, Loader2, Receipt } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

const STATUS_OPTIONS = ['trial', 'active', 'expired', 'suspended', 'cancelled'];

export default function SuperAdminUniversitiesPage() {
  const toast = useToast();
  const [universities, setUniversities] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSub, setEditingSub] = useState<any>(null);
  const [payingSub, setPayingSub] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [editForm, setEditForm] = useState({ plan_id: '', end_date: '', status: '' });
  const [payForm, setPayForm] = useState({ amount: '', payment_date: new Date().toISOString().split('T')[0], period_covered: '', payment_method: 'virement', reference: '', extend_months: '1' });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [unisRes, plansRes] = await Promise.all([
        api.get('/api/v1/subscriptions/universities'),
        api.get('/api/v1/subscriptions/plans/all')
      ]);
      setUniversities(unisRes.data);
      setPlans(plansRes.data);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (item: any) => {
    setEditingSub(item);
    setEditForm({
      plan_id: '', end_date: item.subscription?.end_date || '', status: item.subscription?.status || 'active'
    });
  };

  const handleSaveEdit = async () => {
    if (!editingSub?.subscription?.id) return;
    setSaving(true);
    try {
      await api.put(`/api/v1/subscriptions/universities/${editingSub.subscription.id}`, {
        plan_id: editForm.plan_id ? parseInt(editForm.plan_id) : undefined,
        end_date: editForm.end_date || undefined,
        status: editForm.status || undefined
      });
      toast.success('Abonnement mis à jour');
      setEditingSub(null);
      load();
    } catch (error) {
      toast.error('Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!payingSub?.subscription?.id || !payForm.amount) {
      toast.error('Montant requis');
      return;
    }
    setSaving(true);
    try {
      await api.post('/api/v1/subscriptions/payments', {
        subscription_id: payingSub.subscription.id,
        amount: parseFloat(payForm.amount),
        payment_date: payForm.payment_date,
        period_covered: payForm.period_covered || undefined,
        payment_method: payForm.payment_method,
        reference: payForm.reference || undefined,
        extend_months: payForm.extend_months ? parseInt(payForm.extend_months) : undefined
      });
      toast.success('Paiement enregistré, abonnement prolongé');
      setPayingSub(null);
      setPayForm({ amount: '', payment_date: new Date().toISOString().split('T')[0], period_covered: '', payment_method: 'virement', reference: '', extend_months: '1' });
      load();
    } catch (error) {
      toast.error('Erreur');
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
        <h1 className="text-3xl font-bold text-slate-900">Universités</h1>
        <p className="text-slate-500 mt-1">Gère l'abonnement de chaque université</p>
      </div>

      <div className="space-y-3">
        {universities.map((item, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center">
                <Building2 className="text-blue-600" size={18} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">{item.university.name}</h3>
                <p className="text-sm text-slate-500">{item.university.email} • {item.student_count} étudiants</p>
                {item.subscription && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    Plan {item.subscription.plan_name} — expire le {new Date(item.subscription.end_date).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {item.subscription && (
                <button onClick={() => setPayingSub(item)} className="flex items-center gap-1.5 px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                  <Receipt size={14} /> Paiement
                </button>
              )}
              <button onClick={() => openEdit(item)} className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium">
                <Edit3 size={14} /> Gérer
              </button>
            </div>
          </div>
        ))}
      </div>

      {editingSub && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">{editingSub.university.name}</h2>
              <button onClick={() => setEditingSub(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nouveau plan (optionnel)</label>
                <select value={editForm.plan_id} onChange={(e) => setEditForm({ ...editForm, plan_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                  <option value="">Ne pas changer</option>
                  {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Date d'expiration</label>
                <input type="date" value={editForm.end_date} onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Statut</label>
                <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setEditingSub(null)} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium">Annuler</button>
              <button onClick={handleSaveEdit} disabled={saving} className="flex-1 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {payingSub && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">Enregistrer un paiement</h2>
              <button onClick={() => setPayingSub(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <p className="text-sm text-slate-500 mb-3">{payingSub.university.name}</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input type="number" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} placeholder="Montant (FCFA)"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                <input type="date" value={payForm.payment_date} onChange={(e) => setPayForm({ ...payForm, payment_date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              </div>
              <input type="text" value={payForm.period_covered} onChange={(e) => setPayForm({ ...payForm, period_covered: e.target.value })} placeholder="Période couverte (ex: Janvier 2026)"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <select value={payForm.payment_method} onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                  <option value="virement">Virement</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="cheque">Chèque</option>
                  <option value="especes">Espèces</option>
                </select>
                <input type="number" value={payForm.extend_months} onChange={(e) => setPayForm({ ...payForm, extend_months: e.target.value })} placeholder="Prolonger de (mois)"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              </div>
              <input type="text" value={payForm.reference} onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })} placeholder="Référence (optionnel)"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setPayingSub(null)} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium">Annuler</button>
              <button onClick={handleRecordPayment} disabled={saving} className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
