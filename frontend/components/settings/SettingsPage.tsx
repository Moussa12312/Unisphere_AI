'use client';

import { useState } from 'react';
import {
  Settings, Bell, Moon, Sun, Monitor, Globe, Shield, Palette,
  Save, Loader2, CheckCircle, Smartphone, Mail, Lock, Eye, EyeOff,
  AlertTriangle, Download, Trash2, HelpCircle, Volume2, VolumeX,
  RotateCcw
} from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { useToast } from '@/components/ToastProvider';
import { themes } from '@/lib/themes';

interface SettingsPageProps {
  role: string;
  roleLabel: string;
  roleIcon?: any;
}

export default function SettingsPage({ role, roleLabel, roleIcon: RoleIcon = Settings }: SettingsPageProps) {
  const toast = useToast();
  const { settings, updateSetting, updateSettings, resetSettings, isDarkMode } = useSettings();
  const [saving, setSaving] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Les paramètres sont déjà sauvegardés automatiquement via le context
      // On simule juste un délai pour l'UX
      await new Promise(resolve => setTimeout(resolve, 500));
      toast.success('Paramètres sauvegardés avec succès');
    } catch (error) {
      toast.error('Erreur de sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    resetSettings();
    setShowResetConfirm(false);
    toast.success('Paramètres réinitialisés aux valeurs par défaut');
  };

  const handleExportData = async () => {
    toast.success('Export de vos données en cours...');
    setTimeout(() => {
      // Créer un fichier JSON téléchargeable
      const dataStr = JSON.stringify(settings, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `parametres_${role}_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Paramètres exportés !');
    }, 1000);
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Settings className="text-[#FF6B00]" size={28} />
            Paramètres
          </h1>
          <p className="text-slate-500 mt-1 flex items-center gap-2">
            <RoleIcon size={16} className="text-slate-400" />
            Espace {roleLabel}
            {isDarkMode && (
              <span className="ml-2 px-2 py-0.5 bg-slate-800 text-white text-xs rounded-full flex items-center gap-1">
                <Moon size={10} /> Mode sombre actif
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
            title="Réinitialiser"
          >
            <RotateCcw size={16} />
            Réinitialiser
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg font-medium disabled:opacity-50 transition-colors shadow-md shadow-orange-500/20"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Sauvegarder
          </button>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 dark:bg-slate-800 dark:border-slate-700">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Bell size={20} className="text-[#FF6B00]" />
          Notifications
        </h2>

        <div className="space-y-1">
          <ToggleRow
            icon={Mail}
            label="Notifications par email"
            description="Recevez les notifications importantes par email"
            checked={settings.email_notifications}
            onChange={(v) => updateSetting('email_notifications', v)}
          />
          <ToggleRow
            icon={Bell}
            label="Notifications push"
            description="Notifications dans le navigateur"
            checked={settings.push_notifications}
            onChange={(v) => updateSetting('push_notifications', v)}
          />
          <ToggleRow
            icon={Smartphone}
            label="Notifications SMS"
            description="Recevez les alertes urgentes par SMS"
            checked={settings.sms_notifications}
            onChange={(v) => updateSetting('sms_notifications', v)}
          />
        </div>

        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
          <h3 className="font-medium text-slate-900 dark:text-white mb-3">Types de notifications</h3>
          <div className="space-y-1">
            <ToggleRow
              label="📢 Annonces"
              description="Annonces de l'université"
              checked={settings.announcements_notifications}
              onChange={(v) => updateSetting('announcements_notifications', v)}
            />
            <ToggleRow
              label="💬 Messages"
              description="Nouveaux messages reçus"
              checked={settings.messages_notifications}
              onChange={(v) => updateSetting('messages_notifications', v)}
            />
            <ToggleRow
              label="📝 Notes"
              description="Nouvelles notes publiées"
              checked={settings.grades_notifications}
              onChange={(v) => updateSetting('grades_notifications', v)}
            />
            <ToggleRow
              label="💰 Paiements"
              description="Rappels et confirmations de paiement"
              checked={settings.payments_notifications}
              onChange={(v) => updateSetting('payments_notifications', v)}
            />
          </div>
        </div>
      </div>

            {/* Apparence */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 dark:bg-slate-800 dark:border-slate-700">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Palette size={20} className="text-[#FF6B00]" />
          Apparence
        </h2>

        {/* ✅ Thèmes prédéfinis (8 options) */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            Thème de l'application
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {themes.map((theme) => {
              const isActive = settings.theme === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => {
                    updateSetting('theme', theme.id);
                    toast.success(`Thème "${theme.name}" appliqué`);
                  }}
                  className={`relative p-3 rounded-xl border-2 transition-all ${
                    isActive
                      ? 'border-[#FF6B00] bg-orange-50 dark:bg-orange-900/20'
                      : 'border-slate-200 dark:border-slate-600 hover:border-slate-300'
                  }`}
                >
                  {/* Aperçu du thème */}
                  <div 
                    className="h-12 rounded-lg mb-2 border border-slate-200 overflow-hidden flex"
                    style={{ backgroundColor: theme.colors.background }}
                  >
                    <div 
                      className="w-1/3 h-full"
                      style={{ backgroundColor: theme.colors.surface }}
                    />
                    <div 
                      className="w-1/3 h-full"
                      style={{ backgroundColor: theme.colors.primary }}
                    />
                    <div 
                      className="w-1/3 h-full"
                      style={{ backgroundColor: theme.colors.text }}
                    />
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg">{theme.emoji}</span>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                      {theme.name}
                    </span>
                  </div>
                  
                  {isActive && (
                    <CheckCircle size={14} className="absolute top-2 right-2 text-[#FF6B00]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ✅ Couleur Primaire d'Établissement Personnalisée */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Couleur Principale d'Établissement (Brand Color)
          </label>
          <div className="flex flex-wrap items-center gap-3">
            {[
              { label: 'Orange UniSphere', color: '#FF6B00' },
              { label: 'Bleu Royal', color: '#2563EB' },
              { label: 'Vert Émeraude', color: '#059669' },
              { label: 'Violet Majestueux', color: '#7C3AED' },
              { label: 'Rouge Cramoisi', color: '#DC2626' },
              { label: 'Sombre Élégant', color: '#1E293B' },
            ].map((preset) => (
              <button
                key={preset.color}
                onClick={() => {
                  updateSetting('customPrimaryColor', preset.color);
                  toast.success(`Couleur ${preset.label} appliquée !`);
                }}
                className={`w-9 h-9 rounded-full border-2 transition-all flex items-center justify-center ${
                  settings.customPrimaryColor === preset.color
                    ? 'border-black dark:border-white scale-110 shadow-md'
                    : 'border-transparent hover:scale-105'
                }`}
                style={{ backgroundColor: preset.color }}
                title={preset.label}
              >
                {settings.customPrimaryColor === preset.color && (
                  <CheckCircle size={14} className="text-white drop-shadow" />
                )}
              </button>
            ))}

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-slate-500">Personnalisé :</span>
              <input
                type="color"
                value={settings.customPrimaryColor || '#FF6B00'}
                onChange={(e) => updateSetting('customPrimaryColor', e.target.value)}
                className="w-9 h-9 p-0.5 rounded-lg border border-slate-300 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Langue */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Langue de l'interface
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { id: 'fr' as const, flag: '🇫🇷', name: 'Français' },
              { id: 'en' as const, flag: '🇬🇧', name: 'English' },
              { id: 'ar' as const, flag: '🇸🇦', name: 'العربية' },
              { id: 'bm' as const, flag: '🇲🇱', name: 'Bamanankan' },
            ].map((lang) => (
              <button
                key={lang.id}
                onClick={() => {
                  updateSetting('language', lang.id);
                  toast.success(`Langue changée : ${lang.name}`);
                }}
                className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  settings.language === lang.id
                    ? 'border-[#FF6B00] bg-orange-50 dark:bg-orange-900/20'
                    : 'border-slate-200 dark:border-slate-600 hover:border-slate-300'
                }`}
              >
                <span className="text-2xl">{lang.flag}</span>
                <span className="text-sm font-medium">{lang.name}</span>
                {settings.language === lang.id && (
                  <CheckCircle size={14} className="text-[#FF6B00] ml-auto" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Densité */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            Densité d'affichage
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'compact' as const, label: 'Compact', desc: 'Plus de contenu visible' },
              { id: 'comfortable' as const, label: 'Confortable', desc: 'Équilibre recommandé' },
              { id: 'spacious' as const, label: 'Spacieux', desc: 'Plus d\'espace' },
            ].map((density) => (
              <button
                key={density.id}
                onClick={() => {
                  updateSetting('density', density.id);
                  toast.success(`Densité ${density.label} appliquée`);
                }}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  settings.density === density.id
                    ? 'border-[#FF6B00] bg-orange-50 dark:bg-orange-900/20'
                    : 'border-slate-200 dark:border-slate-600 hover:border-slate-300'
                }`}
              >
                <p className={`text-sm font-medium ${
                  settings.density === density.id ? 'text-[#FF6B00]' : 'text-slate-700 dark:text-slate-300'
                }`}>
                  {density.label}
                </p>
                <p className="text-xs text-slate-500 mt-1">{density.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sons */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 dark:bg-slate-800 dark:border-slate-700">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          {settings.sound_enabled ? <Volume2 size={20} className="text-[#FF6B00]" /> : <VolumeX size={20} className="text-slate-400" />}
          Sons
        </h2>

        <div className="space-y-4">
          <ToggleRow
            icon={Volume2}
            label="Sons de notification"
            description="Jouer un son lors des nouvelles notifications"
            checked={settings.sound_enabled}
            onChange={(v) => {
              updateSetting('sound_enabled', v);
              toast.success(v ? 'Sons activés' : 'Sons désactivés');
            }}
          />
          
          {settings.sound_enabled && (
            <div className="pl-12">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Volume : {settings.sound_volume}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.sound_volume}
                onChange={(e) => updateSetting('sound_volume', parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-[#FF6B00]"
              />
              <button
                onClick={() => playTestSound(settings.sound_volume)}
                className="mt-2 text-xs text-[#FF6B00] hover:underline"
              >
                🔊 Tester le son
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Confidentialité */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 dark:bg-slate-800 dark:border-slate-700">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Shield size={20} className="text-[#FF6B00]" />
          Confidentialité
        </h2>

        <div className="space-y-1">
          <ToggleRow
            icon={Eye}
            label="Statut en ligne"
            description="Afficher quand vous êtes connecté"
            checked={settings.show_online_status}
            onChange={(v) => updateSetting('show_online_status', v)}
          />
          <ToggleRow
            icon={Eye}
            label="Profil public"
            description="Autoriser les autres utilisateurs à voir votre profil"
            checked={settings.show_profile_public}
            onChange={(v) => updateSetting('show_profile_public', v)}
          />
        </div>
      </div>

      {/* Zone danger */}
      <div className="bg-white rounded-xl border border-red-200 shadow-sm p-6 dark:bg-slate-800 dark:border-red-900">
        <h2 className="text-lg font-bold text-red-600 mb-2 flex items-center gap-2">
          <AlertTriangle size={20} />
          Zone de danger
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Actions irréversibles. Soyez prudent.
        </p>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
            <div className="flex items-center gap-3">
              <Download size={20} className="text-slate-600 dark:text-slate-300" />
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Exporter mes paramètres</p>
                <p className="text-sm text-slate-500">Télécharger un fichier JSON</p>
              </div>
            </div>
            <button
              onClick={handleExportData}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-600 hover:bg-slate-200 text-slate-700 dark:text-white rounded-lg text-sm font-medium transition-colors"
            >
              Exporter
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800">
            <div className="flex items-center gap-3">
              <RotateCcw size={20} className="text-red-600" />
              <div>
                <p className="font-medium text-red-900 dark:text-red-300">Réinitialiser les paramètres</p>
                <p className="text-sm text-red-600 dark:text-red-400">Revenir aux valeurs par défaut</p>
              </div>
            </div>
            <button
              onClick={() => setShowResetConfirm(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Réinitialiser
            </button>
          </div>
        </div>
      </div>

      {/* Modal confirmation reset */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                <RotateCcw className="w-6 h-6 text-[#FF6B00]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Réinitialiser les paramètres ?</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Tous vos paramètres seront remis aux valeurs par défaut.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 text-sm font-medium text-white bg-[#FF6B00] hover:bg-[#e55f00] rounded-lg transition-colors"
              >
                Oui, réinitialiser
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Fonction pour tester le son
function playTestSound(volume: number) {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.value = volume / 100 * 0.3;
    
    oscillator.start();
    setTimeout(() => {
      oscillator.stop();
      audioContext.close();
    }, 300);
  } catch (e) {
    console.error('Erreur son:', e);
  }
}

// Composant Toggle réutilisable
interface ToggleRowProps {
  icon?: any;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function ToggleRow({ icon: Icon, label, description, checked, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between py-3 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg px-2 -mx-2 transition-colors">
      <div className="flex items-start gap-3 flex-1">
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-600 flex items-center justify-center flex-shrink-0">
            <Icon size={16} className="text-slate-600 dark:text-slate-300" />
          </div>
        )}
        <div className="flex-1">
          <p className="font-medium text-slate-900 dark:text-white">{label}</p>
          {description && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
          )}
        </div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
          checked ? 'bg-[#FF6B00]' : 'bg-slate-300 dark:bg-slate-600'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}