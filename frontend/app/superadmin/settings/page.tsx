'use client';

import { useState, useEffect } from 'react';
import { 
  Settings, Shield, Bell, HardDrive, DollarSign, 
  Palette, Save, CheckCircle, RefreshCw, Mail, Globe, 
  Sliders, AlertTriangle, Layers, Lock
} from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { themes } from '@/lib/themes';
import { useToast } from '@/components/ToastProvider';

export default function SuperAdminSettingsPage() {
  const toast = useToast();
  const { settings, updateSetting, updateSettings, isDarkMode } = useSettings();
  const [activeTab, setActiveTab] = useState<'platform' | 'billing' | 'system' | 'theme'>('platform');
  const [saving, setSaving] = useState(false);

  // Platform defaults stored in localStorage / settings
  const [platformConfig, setPlatformConfig] = useState({
    platformName: 'UniSphere AI Platform',
    supportEmail: 'support@unisphere.ai',
    supportPhone: '+223 70 00 00 00',
    defaultCurrency: 'FCFA',
    maintenanceIntervalMonths: 6,
    invoiceGracePeriodDays: 15,
    autoSuspendOverdueDays: 45,
    diskWarningThreshold: 85,
    autoReportCrashes: true,
    auditRetentionDays: 90
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('unisphere_saas_config');
      if (saved) {
        setPlatformConfig(JSON.parse(saved));
      }
    } catch {}
  }, []);

  const handleSave = () => {
    setSaving(true);
    try {
      localStorage.setItem('unisphere_saas_config', JSON.stringify(platformConfig));
      toast.success('Paramètres SaaS enregistrés avec succès');
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setTimeout(() => setSaving(false), 300);
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Settings className="text-[#FF6B00]" size={28} />
            Paramètres Généraux du SaaS
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configurations de la plateforme multi-établissements, politique de facturation et supervision système.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#FF6B00] hover:bg-[#e05e00] rounded-xl shadow-md transition-all self-start sm:self-auto"
        >
          <Save size={16} /> {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
        </button>
      </div>

      {/* Onglets */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        <button
          onClick={() => setActiveTab('platform')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'platform'
              ? 'border-[#FF6B00] text-[#FF6B00]'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Globe size={18} />
          Identité & Support
        </button>
        <button
          onClick={() => setActiveTab('billing')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'billing'
              ? 'border-[#FF6B00] text-[#FF6B00]'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <DollarSign size={18} />
          Règles Facturation & Relances
        </button>
        <button
          onClick={() => setActiveTab('system')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'system'
              ? 'border-[#FF6B00] text-[#FF6B00]'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Sliders size={18} />
          Supervision & Alertes Pannes
        </button>
        <button
          onClick={() => setActiveTab('theme')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'theme'
              ? 'border-[#FF6B00] text-[#FF6B00]'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Palette size={18} />
          Thème & Apparence
        </button>
      </div>

      {/* CONTENU ONGLET 1: IDENTITÉ & SUPPORT */}
      {activeTab === 'platform' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700/60 pb-3">
            Coordonnées du Service Client & Éditeur SaaS
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nom de la Plateforme SaaS
              </label>
              <input
                type="text"
                value={platformConfig.platformName}
                onChange={(e) => setPlatformConfig({ ...platformConfig, platformName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Devise Principale du Système
              </label>
              <input
                type="text"
                value={platformConfig.defaultCurrency}
                onChange={(e) => setPlatformConfig({ ...platformConfig, defaultCurrency: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email du Support Super-Admin
              </label>
              <input
                type="email"
                value={platformConfig.supportEmail}
                onChange={(e) => setPlatformConfig({ ...platformConfig, supportEmail: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Ligne Téléphonique d'Urgence / WhatsApp
              </label>
              <input
                type="text"
                value={platformConfig.supportPhone}
                onChange={(e) => setPlatformConfig({ ...platformConfig, supportPhone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* CONTENU ONGLET 2: RÈGLES FACTURATION */}
      {activeTab === 'billing' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700/60 pb-3">
            Politique de Facturation & Relance des Universités
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl space-y-2 border border-slate-100 dark:border-slate-700/60">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Fréquence de maintenance par défaut
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={platformConfig.maintenanceIntervalMonths}
                  onChange={(e) => setPlatformConfig({ ...platformConfig, maintenanceIntervalMonths: parseInt(e.target.value) || 6 })}
                  className="w-20 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
                <span className="text-xs text-slate-500">mois (Suivi semestriel)</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl space-y-2 border border-slate-100 dark:border-slate-700/60">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Préavis avant échéance de facture
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={platformConfig.invoiceGracePeriodDays}
                  onChange={(e) => setPlatformConfig({ ...platformConfig, invoiceGracePeriodDays: parseInt(e.target.value) || 15 })}
                  className="w-20 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
                <span className="text-xs text-slate-500">jours</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl space-y-2 border border-slate-100 dark:border-slate-700/60">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Délai avant suspension pour impayé
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={platformConfig.autoSuspendOverdueDays}
                  onChange={(e) => setPlatformConfig({ ...platformConfig, autoSuspendOverdueDays: parseInt(e.target.value) || 45 })}
                  className="w-20 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
                <span className="text-xs text-slate-500">jours de retard</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTENU ONGLET 3: SUPERVISION & PANNES */}
      {activeTab === 'system' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700/60 pb-3">
            Supervision & Alertes Automatiques de Pannes
          </h2>

          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700/60">
              <div>
                <span className="font-semibold text-slate-900 dark:text-white block">
                  Signalement automatique des crashs au Super-Admin
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Envoie un rapport technique immédiat au compte Super-Admin dès qu'un utilisateur rencontre une erreur sur l'application.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={platformConfig.autoReportCrashes}
                  onChange={(e) => setPlatformConfig({ ...platformConfig, autoReportCrashes: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF6B00]"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700/60">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Rétention des logs d'audit (jours)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={platformConfig.auditRetentionDays}
                    onChange={(e) => setPlatformConfig({ ...platformConfig, auditRetentionDays: parseInt(e.target.value) || 90 })}
                    className="w-24 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                  <span className="text-xs text-slate-500">jours de conservation</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTENU ONGLET 4: THÈME & APPARENCE */}
      {activeTab === 'theme' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700/60 pb-3">
            Personnalisation Visuelle de l'Interface
          </h2>

          <div className="space-y-4">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Sélectionnez votre palette de couleurs :
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {themes.map((th) => {
                const isSelected = (settings?.theme || 'dark-orange') === th.id;
                return (
                  <button
                    key={th.id}
                    onClick={() => updateSetting('theme', th.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-[#FF6B00] bg-[#FF6B00]/5 ring-2 ring-[#FF6B00]/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: th.colors.primary }} />
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">{th.emoji} {th.name}</span>
                    </div>
                    <span className="text-xs text-slate-400 capitalize">{th.mode === 'dark' ? 'Mode Sombre' : 'Mode Clair'}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
