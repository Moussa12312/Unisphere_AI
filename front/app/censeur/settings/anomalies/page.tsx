'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, Loader2, AlertTriangle, ToggleLeft, ToggleRight } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

export default function AnomalySettingsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    enable_anomalies: true,
    threshold_exceptional: 19,
    threshold_very_high: 18,
    threshold_very_low: 3,
    threshold_low: 5
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await api.get('/api/v1/grades/anomalies/config');
      setConfig(response.data);
    } catch (error) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/v1/grades/anomalies/config', config);
      toast.success('✅ Configuration sauvegardée');
    } catch (error) {
      toast.error('Erreur de sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-[#FF6B00]" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
            <Settings size={24} className="text-white" />
          </div>
          Configuration des anomalies
        </h1>
        <p className="text-slate-500 mt-1">Personnalisez la détection des notes suspectes</p>
      </div>

      {/* Toggle principal */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Activer la détection</h2>
            <p className="text-sm text-slate-500 mt-1">
              {config.enable_anomalies 
                ? 'Les anomalies sont détectées automatiquement' 
                : 'La détection des anomalies est désactivée'}
            </p>
          </div>
          <button
            onClick={() => setConfig({ ...config, enable_anomalies: !config.enable_anomalies })}
            className="flex items-center gap-2"
          >
            {config.enable_anomalies ? (
              <ToggleRight size={48} className="text-green-600" />
            ) : (
              <ToggleLeft size={48} className="text-slate-400" />
            )}
          </button>
        </div>
      </div>

      {/* Seuils */}
      {config.enable_anomalies && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle size={20} className="text-orange-600" />
            Seuils de détection
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                🔴 Note très faible (alerte haute)
              </label>
              <input
                type="number"
                min="0"
                max="20"
                step="0.5"
                value={config.threshold_very_low}
                onChange={(e) => setConfig({ ...config, threshold_very_low: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              />
              <p className="text-xs text-slate-500 mt-1">
                Notes &lt; {config.threshold_very_low} seront signalées
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                🟠 Note faible (alerte moyenne)
              </label>
              <input
                type="number"
                min="0"
                max="20"
                step="0.5"
                value={config.threshold_low}
                onChange={(e) => setConfig({ ...config, threshold_low: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              />
              <p className="text-xs text-slate-500 mt-1">
                Notes entre {config.threshold_very_low} et {config.threshold_low}
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                🟡 Note très élevée (alerte basse)
              </label>
              <input
                type="number"
                min="0"
                max="20"
                step="0.5"
                value={config.threshold_very_high}
                onChange={(e) => setConfig({ ...config, threshold_very_high: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              />
              <p className="text-xs text-slate-500 mt-1">
                Notes &gt; {config.threshold_very_high} seront signalées
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                🔵 Note exceptionnelle (alerte moyenne)
              </label>
              <input
                type="number"
                min="0"
                max="20"
                step="0.5"
                value={config.threshold_exceptional}
                onChange={(e) => setConfig({ ...config, threshold_exceptional: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              />
              <p className="text-xs text-slate-500 mt-1">
                Notes &gt; {config.threshold_exceptional} seront signalées
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bouton sauvegarder */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-sm font-medium disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Sauvegarde...' : 'Sauvegarder la configuration'}
        </button>
      </div>
    </div>
  );
}