'use client';

import { useState, useEffect } from 'react';
import { Save, DollarSign, AlertTriangle, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function FinancialSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [config, setConfig] = useState({
    penalty_amount: 5000,
    penalty_auto_apply: true,
  });

  const [fees, setFees] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [configRes, feesRes] = await Promise.allSettled([
        api.get('/api/v1/settings/academic/config'),
        api.get('/api/v1/academic-fees')
      ]);

      if (configRes.status === 'fulfilled') {
        const data = configRes.value.data;
        setConfig({
          penalty_amount: data.penalty_amount ?? 5000,
          penalty_auto_apply: data.penalty_auto_apply ?? true,
        });
      }

      if (feesRes.status === 'fulfilled') {
        setFees(Array.isArray(feesRes.value.data) ? feesRes.value.data : []);
      }
    } catch (err) {
      console.error('Erreur chargement configuration financière:', err);
      toast.error('Erreur lors du chargement des paramètres');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/v1/settings/academic/config', {
        penalty_amount: Number(config.penalty_amount),
        penalty_auto_apply: Boolean(config.penalty_auto_apply),
      });
      toast.success('Configuration financière enregistrée avec succès');
    } catch (err: any) {
      console.error('Erreur sauvegarde configuration financière:', err);
      toast.error(err.response?.data?.detail || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="animate-spin text-[#FF6B00]" size={36} />
        <p className="text-sm text-slate-500">Chargement de la configuration financière...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Configuration Financière</h1>
          <p className="text-slate-500 mt-1">Définissez les règles de paiement, pénalités et frais académiques</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-[#FF6B00] text-white rounded-xl text-sm font-semibold hover:bg-[#e55f00] transition-all shadow-md disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>

      {/* Pénalités de retard */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
            <AlertTriangle className="text-white" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Pénalités de retard</h2>
            <p className="text-xs text-slate-500">Règles appliquées aux échéances de paiement dépassées</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Montant de la pénalité (FCFA)</label>
            <input
              type="number"
              min={0}
              step={500}
              value={config.penalty_amount}
              onChange={(e) => setConfig({ ...config, penalty_amount: Number(e.target.value) })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl w-full cursor-pointer hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={config.penalty_auto_apply}
                onChange={(e) => setConfig({ ...config, penalty_auto_apply: e.target.checked })}
                className="w-5 h-5 text-[#FF6B00] rounded focus:ring-[#FF6B00]"
              />
              <span className="text-sm font-medium text-slate-700">Appliquer automatiquement après la date limite</span>
            </label>
          </div>
        </div>
      </div>

      {/* Grille des frais académiques par filière et niveau */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
              <DollarSign className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Grille des frais de scolarité</h2>
              <p className="text-xs text-slate-500">Montants de scolarité configurés par filière et niveau d'étude</p>
            </div>
          </div>
          <Link
            href="/admin/academic-fees"
            className="flex items-center gap-1.5 text-sm text-[#FF6B00] font-semibold hover:underline"
          >
            Gérer la grille complète
            <ArrowRight size={16} />
          </Link>
        </div>

        {fees.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <p className="text-sm text-slate-600 mb-3">Aucun barème de frais spécifique n'a encore été configuré.</p>
            <Link
              href="/admin/academic-fees"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF6B00] text-white rounded-xl text-sm font-medium hover:bg-[#e55f00] transition-colors"
            >
              Configurer les frais par filière
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg">Filière</th>
                  <th className="px-4 py-3">Niveau</th>
                  <th className="px-4 py-3">Frais d'inscription</th>
                  <th className="px-4 py-3">Frais de scolarité</th>
                  <th className="px-4 py-3 rounded-r-lg text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fees.slice(0, 8).map((fee, idx) => {
                  const reg = Number(fee.registration_fee || 0);
                  const tui = Number(fee.tuition_fee || 0);
                  return (
                    <tr key={fee.id || idx} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-900">{fee.filiere || 'Général'}</td>
                      <td className="px-4 py-3 text-slate-600">{fee.level || 'Tous'}</td>
                      <td className="px-4 py-3 text-slate-600">{reg.toLocaleString()} FCFA</td>
                      <td className="px-4 py-3 text-slate-600">{tui.toLocaleString()} FCFA</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">{(reg + tui).toLocaleString()} FCFA</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}