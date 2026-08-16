'use client';

import { useState } from 'react';
import { Save, DollarSign, CreditCard, AlertTriangle } from 'lucide-react';

export default function FinancialSettingsPage() {
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => { setSaving(false); alert('Configuration financière sauvegardée !'); }, 1000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Configuration Financière</h1>
          <p className="text-slate-500 mt-1">Définissez les règles de paiement et de facturation</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-3 bg-[#FF6B00] text-white rounded-xl text-sm font-medium hover:bg-[#e55f00] transition-all shadow-md disabled:opacity-50">
          <Save size={16} /> {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center"><DollarSign className="text-white" size={20} /></div>
          <h2 className="text-lg font-bold text-slate-900">Frais de scolarité par défaut</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Licence (par an en FCFA)</label>
            <input type="number" defaultValue={350000} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Master (par an en FCFA)</label>
            <input type="number" defaultValue={450000} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Doctorat (par an en FCFA)</label>
            <input type="number" defaultValue={500000} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center"><AlertTriangle className="text-white" size={20} /></div>
          <h2 className="text-lg font-bold text-slate-900">Pénalités de retard</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Montant de la pénalité (FCFA)</label>
            <input type="number" defaultValue={5000} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl w-full cursor-pointer">
              <input type="checkbox" defaultChecked className="w-5 h-5 text-[#FF6B00] rounded focus:ring-[#FF6B00]" />
              <span className="text-sm font-medium text-slate-700">Appliquer automatiquement après la date limite</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}