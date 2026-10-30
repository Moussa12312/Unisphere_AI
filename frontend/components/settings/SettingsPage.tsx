'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Settings, Bell, Moon, Sun, Globe, Shield, Palette,
  Save, Loader2, CheckCircle, Smartphone, Mail, Lock, Eye, EyeOff,
  AlertTriangle, Download, RotateCcw, Volume2, VolumeX,
  User, Camera, ShieldCheck, KeyRound, Monitor, History,
  Check, Sparkles, RefreshCw, SmartphoneNfc
} from 'lucide-react';
import api, { getMediaUrl } from '@/lib/api';
import { useSettings } from '@/contexts/SettingsContext';
import { useToast } from '@/components/ToastProvider';
import { themes } from '@/lib/themes';

interface SettingsPageProps {
  role: string;
  roleLabel: string;
  roleIcon?: any;
}

interface UserProfile {
  full_name: string;
  email: string;
  phone: string;
  role: string;
  photo?: string;
}

interface SessionEntry {
  id: number;
  action: string;
  ip_address: string;
  user_agent: string;
  status: string;
  date: string;
}

export default function SettingsPage({ role, roleLabel, roleIcon: RoleIcon = Settings }: SettingsPageProps) {
  const toast = useToast();
  const { settings, updateSetting, updateSettings, resetSettings, saveSettingsToServer, isDarkMode } = useSettings();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'appearance' | 'sound' | 'security' | 'data'>('profile');

  // Profile State
  const [profile, setProfile] = useState<UserProfile>({
    full_name: '',
    email: '',
    phone: '',
    role: role,
    photo: '',
  });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Security & Password State
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Sessions State
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // General Settings Save State
  const [savingSettings, setSavingSettings] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [pushStatus, setPushStatus] = useState<'default' | 'granted' | 'denied' | 'unsupported'>('default');

  // Load Initial Data
  useEffect(() => {
    loadUserProfile();
    loadUserSessions();
    checkPushPermission();
  }, []);

  const checkPushPermission = () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushStatus(Notification.permission as any);
    } else {
      setPushStatus('unsupported');
    }
  };

  const loadUserProfile = async () => {
    setLoadingProfile(true);
    try {
      const res = await api.get('/api/v1/users/profile');
      if (res.data) {
        setProfile({
          full_name: res.data.full_name || '',
          email: res.data.email || '',
          phone: res.data.phone || '',
          role: res.data.role || role,
          photo: res.data.photo || '',
        });
      }
    } catch (error) {
      // Fallback au localStorage
      if (typeof window !== 'undefined') {
        const localUser = localStorage.getItem('user');
        if (localUser) {
          try {
            const parsed = JSON.parse(localUser);
            setProfile({
              full_name: parsed.full_name || '',
              email: parsed.email || '',
              phone: parsed.phone || '',
              role: parsed.role || role,
              photo: parsed.photo || '',
            });
          } catch {}
        }
      }
    } finally {
      setLoadingProfile(false);
    }
  };

  const loadUserSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await api.get('/api/v1/users/sessions');
      if (Array.isArray(res.data)) {
        setSessions(res.data);
      }
    } catch {
      // Silencieux
    } finally {
      setLoadingSessions(false);
    }
  };

  // 1. Sauvegarde du Profil Personnel
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.full_name.trim()) {
      toast.error('Le nom complet est obligatoire');
      return;
    }
    setSavingProfile(true);
    try {
      const res = await api.put('/api/v1/users/profile', {
        full_name: profile.full_name.trim(),
        email: profile.email.trim(),
        phone: profile.phone.trim(),
      });

      // Mettre à jour l'utilisateur local
      if (typeof window !== 'undefined') {
        const localUser = localStorage.getItem('user');
        if (localUser) {
          try {
            const parsed = JSON.parse(localUser);
            parsed.full_name = profile.full_name.trim();
            parsed.email = profile.email.trim();
            parsed.phone = profile.phone.trim();
            localStorage.setItem('user', JSON.stringify(parsed));
          } catch {}
        }
        window.dispatchEvent(new CustomEvent('unisphere:user_updated'));
      }

      toast.success(res.data?.message || 'Profil mis à jour avec succès');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la mise à jour du profil');
    } finally {
      setSavingProfile(false);
    }
  };

  // 2. Upload de l'Avatar Photo
  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner un fichier image valide (JPG, PNG, WebP)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 5 Mo');
      return;
    }

    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append('photo', file);

    try {
      const res = await api.post('/api/v1/users/profile/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const newPhoto = res.data?.photo_url || '';
      setProfile(prev => ({ ...prev, photo: newPhoto }));

      if (typeof window !== 'undefined') {
        const localUser = localStorage.getItem('user');
        if (localUser) {
          try {
            const parsed = JSON.parse(localUser);
            parsed.photo = newPhoto;
            localStorage.setItem('user', JSON.stringify(parsed));
          } catch {}
        }
        window.dispatchEvent(new CustomEvent('unisphere:user_updated'));
      }

      toast.success('Photo de profil mise à jour avec succès');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors du téléversement de la photo');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 3. Changement de Mot de Passe
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordData.current_password) {
      toast.error('Veuillez renseigner votre mot de passe actuel');
      return;
    }
    if (passwordData.new_password.length < 6) {
      toast.error('Le nouveau mot de passe doit comporter au moins 6 caractères');
      return;
    }
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('La confirmation ne correspond pas au nouveau mot de passe');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await api.put('/api/v1/users/password', {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });

      toast.success(res.data?.message || 'Mot de passe modifié avec succès !');
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors du changement de mot de passe');
    } finally {
      setSavingPassword(false);
    }
  };

  // 4. Sauvegarde Globale des Préférences sur le Serveur
  const handleSaveAllSettings = async () => {
    setSavingSettings(true);
    try {
      await saveSettingsToServer();
      toast.success('Tous les paramètres ont été appliqués et enregistrés sur le serveur');
    } catch (error) {
      toast.error('Erreur lors de la synchronisation avec le serveur');
    } finally {
      setSavingSettings(false);
    }
  };

  // 5. Demande de Permission Notification Push Navigateur
  const handleRequestPush = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast.error('Les notifications push ne sont pas supportées par ce navigateur');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setPushStatus(permission as any);
      if (permission === 'granted') {
        updateSetting('push_notifications', true);
        new Notification('UniSphere AI', {
          body: 'Notifications push activées avec succès !',
          icon: '/favicon.ico',
        });
        toast.success('Permission accordée ! Notifications push actives');
      } else if (permission === 'denied') {
        updateSetting('push_notifications', false);
        toast.error('Permission refusée dans votre navigateur');
      }
    } catch (e) {
      toast.error('Impossible d\'activer les notifications');
    }
  };

  // 6. Test du Son
  const handleTestSound = () => {
    playHarmonicChime(settings.sound_volume);
    toast.success(`Carillon testé à ${settings.sound_volume}% du volume`);
  };

  // 7. Réinitialisation
  const handleReset = async () => {
    await resetSettings();
    setShowResetConfirm(false);
    toast.success('Paramètres réinitialisés aux valeurs par défaut');
  };

  // 8. Export Données
  const handleExportData = () => {
    const exportPayload = {
      user: {
        full_name: profile.full_name,
        email: profile.email,
        phone: profile.phone,
        role: profile.role,
      },
      settings,
      exported_at: new Date().toISOString(),
      platform: 'UniSphere AI SaaS',
    };
    const dataStr = JSON.stringify(exportPayload, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `parametres_${role}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Fichier de configuration exporté !');
  };

  const userPhotoUrl = profile.photo ? getMediaUrl(profile.photo) : null;
  const initial = (profile.full_name || roleLabel || 'U').charAt(0).toUpperCase();

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      {/* Header Premium */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-orange-950 text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="relative group">
              {userPhotoUrl ? (
                <img
                  src={userPhotoUrl}
                  alt={profile.full_name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-orange-500/60 shadow-lg bg-slate-800"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg border-2 border-orange-400/40">
                  {initial}
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-2 -right-2 p-1.5 bg-white text-slate-900 rounded-lg shadow-md hover:bg-orange-50 transition-colors border border-slate-200"
                title="Changer ma photo"
              >
                {uploadingAvatar ? <Loader2 size={14} className="animate-spin text-[#FF6B00]" /> : <Camera size={14} className="text-[#FF6B00]" />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleAvatarSelect}
              />
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                {profile.full_name || 'Paramètres du compte'}
              </h1>
              <p className="text-slate-300 text-sm mt-1 flex items-center gap-2">
                <span>{profile.email || 'Configuration synchronisée'}</span>
                {isDarkMode && (
                  <span className="px-2 py-0.5 bg-slate-800 text-amber-300 text-xs rounded-full flex items-center gap-1 border border-slate-700">
                    <Moon size={10} /> Mode sombre
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-medium transition-colors backdrop-blur-sm border border-white/10"
              title="Réinitialiser les paramètres par défaut"
            >
              <RotateCcw size={16} />
              <span className="hidden sm:inline">Réinitialiser</span>
            </button>
            <button
              onClick={handleSaveAllSettings}
              disabled={savingSettings}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-orange-500/30 disabled:opacity-50"
            >
              {savingSettings ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span>Sauvegarder tout</span>
            </button>
          </div>
        </div>

        {/* Onglets Modernes */}
        <div className="flex items-center gap-1 sm:gap-2 mt-8 overflow-x-auto pb-1 scrollbar-none border-b border-white/10">
          {[
            { id: 'profile' as const, label: 'Mon Profil', icon: User },
            { id: 'notifications' as const, label: 'Notifications', icon: Bell },
            { id: 'appearance' as const, label: 'Apparence', icon: Palette },
            { id: 'sound' as const, label: 'Sons & Audio', icon: Volume2 },
            { id: 'security' as const, label: 'Sécurité & Accès', icon: ShieldCheck },
            { id: 'data' as const, label: 'Données & Reset', icon: Settings },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-semibold transition-all whitespace-nowrap border-b-2 ${
                  isActive
                    ? 'border-[#FF6B00] text-[#FF6B00] bg-white/10'
                    : 'border-transparent text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* ONGLET 1 : PROFIL PERSONNEL                              */}
      {/* ======================================================== */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <User size={20} className="text-[#FF6B00]" />
              Informations Personnelles
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Mettez à jour vos coordonnées réelles utilisées pour la messagerie et les alertes.
            </p>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Nom et prénom
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    value={profile.full_name}
                    onChange={e => setProfile({ ...profile, full_name: e.target.value })}
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                    placeholder="Votre nom complet"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Adresse email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="email"
                      value={profile.email}
                      onChange={e => setProfile({ ...profile, email: e.target.value })}
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                      placeholder="nom@exemple.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Téléphone (SMS & Alertes)
                  </label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={e => setProfile({ ...profile, phone: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                      placeholder="+223 70 00 00 00"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="flex items-center gap-2 px-4 sm:px-6 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl font-semibold text-sm transition-all shadow-md shadow-orange-500/20 disabled:opacity-50"
                >
                  {savingProfile ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Enregistrer mon profil
                </button>
              </div>
            </form>
          </div>

          {/* Carte Rôle & Badge */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                <RoleIcon size={18} className="text-[#FF6B00]" />
                Rôle & Statut du compte
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Votre profil d'accès au système universitaire
              </p>

              <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-400">Rôle attribué</span>
                  <span className="text-xs font-bold text-[#FF6B00] uppercase tracking-wide">{roleLabel}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-400">Identifiant interne</span>
                  <span className="text-xs font-mono font-medium text-slate-800 dark:text-slate-200">{role}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-400">Statut du compte</span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Actif & Vérifié
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
              <p className="text-xs text-slate-400">
                La photo et vos coordonnées sont synchronisées en direct dans toute l'université (messagerie, trombinoscope, assiduité).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ONGLET 2 : NOTIFICATIONS & CANAUX                       */}
      {/* ======================================================== */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          {/* Canaux de notification */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <Bell size={20} className="text-[#FF6B00]" />
              Canaux de transmission
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Choisissez comment vous souhaitez être alerté des événements importants.
            </p>

            <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
              <ToggleRow
                icon={Mail}
                label="Notifications par Email"
                description="Recevez un récapitulatif des alertes critiques et des documents validés"
                checked={settings.email_notifications}
                onChange={v => updateSetting('email_notifications', v)}
              />

              <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-950/40 text-[#FF6B00] flex items-center justify-center flex-shrink-0">
                    <Bell size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Notifications Push Navigateur</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Alertes instantanées sur votre écran même lorsque l'onglet est en arrière-plan
                    </p>
                    {pushStatus === 'granted' && (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-1">
                        <Check size={12} /> Autorisé dans ce navigateur
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {pushStatus !== 'granted' && (
                    <button
                      onClick={handleRequestPush}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors"
                    >
                      Autoriser le navigateur
                    </button>
                  )}
                  <button
                    onClick={() => updateSetting('push_notifications', !settings.push_notifications)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      settings.push_notifications ? 'bg-[#FF6B00]' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${
                        settings.push_notifications ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <ToggleRow
                icon={Smartphone}
                label="Alertes SMS urgentes"
                description="Recevez un SMS pour les urgences institutionnelles et fermetures exceptionnelles"
                checked={settings.sms_notifications}
                onChange={v => updateSetting('sms_notifications', v)}
              />
            </div>
          </div>

          {/* Types de notifications réelles */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 dark:text-white mb-2">Filtrage par Catégorie</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Désactivez les catégories que vous ne souhaitez plus recevoir dans votre flux.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ToggleCard
                title="📢 Annonces & Circulaires"
                desc="Notes de service officielles de l'université"
                checked={settings.announcements_notifications}
                onChange={v => updateSetting('announcements_notifications', v)}
              />
              <ToggleCard
                title="💬 Messagerie & Tchat"
                desc="Nouveaux messages privés et questions"
                checked={settings.messages_notifications}
                onChange={v => updateSetting('messages_notifications', v)}
              />
              <ToggleCard
                title="📝 Pédagogie & Notes"
                desc="Saisie de notes, devoirs et délibérations"
                checked={settings.grades_notifications}
                onChange={v => updateSetting('grades_notifications', v)}
              />
              <ToggleCard
                title="💰 Frais & Finances"
                desc="Rappels de paiement, reçus et comptabilité"
                checked={settings.payments_notifications}
                onChange={v => updateSetting('payments_notifications', v)}
              />
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ONGLET 3 : APPARENCE & THÈMES                            */}
      {/* ======================================================== */}
      {activeTab === 'appearance' && (
        <div className="space-y-6">
          {/* GESTION DES 3 COULEURS PRINCIPALES */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                <Palette size={20} className="text-[#FF6B00]" />
                Gestion des 3 Couleurs Principales
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Personnalisez facilement les 3 couleurs de l'interface : la barre latérale, les boutons et le mode d'arrière-plan.
              </p>
            </div>

            {/* 1. COULEUR DE LA BARRE LATÉRALE (SIDEBAR) */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200/80 dark:border-slate-700">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-md shadow-sm border border-slate-300"
                    style={{ backgroundColor: settings.sidebarColor || '#0a1628' }}
                  />
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    1. Couleur de la barre latérale (Sidebar)
                  </span>
                </div>
                <div className="flex items-center gap-2 p-1.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">HEX :</span>
                  <input
                    type="color"
                    value={settings.sidebarColor || '#0a1628'}
                    onChange={e => updateSetting('sidebarColor', e.target.value)}
                    className="w-7 h-7 p-0.5 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <span className="text-xs font-mono font-bold text-slate-900 dark:text-white uppercase">
                    {settings.sidebarColor || '#0a1628'}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {[
                  { label: 'Bleu Nuit (Défaut)', color: '#0a1628' },
                  { label: 'Ardoise Sombre', color: '#1e293b' },
                  { label: 'Noir Minimaliste', color: '#09090b' },
                  { label: 'Indigo Royal', color: '#1e1b4b' },
                  { label: 'Vert Émeraude Profond', color: '#064e3b' },
                  { label: 'Bordeaux Sombre', color: '#450a0a' },
                ].map(preset => {
                  const isSelected = (settings.sidebarColor || '#0a1628').toLowerCase() === preset.color.toLowerCase();
                  return (
                    <button
                      key={preset.color}
                      onClick={() => {
                        updateSetting('sidebarColor', preset.color);
                        toast.success(`Couleur sidebar : ${preset.label}`);
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                        isSelected
                          ? 'border-[#FF6B00] bg-white dark:bg-slate-800 shadow-sm scale-105 ring-2 ring-[#FF6B00]/30'
                          : 'border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 hover:border-slate-300'
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: preset.color }} />
                      <span className="text-slate-800 dark:text-slate-200">{preset.label}</span>
                      {isSelected && <CheckCircle size={14} className="text-[#FF6B00]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. COULEUR DES BOUTONS & ACTIONS */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200/80 dark:border-slate-700">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-md shadow-sm border border-slate-300"
                    style={{ backgroundColor: settings.buttonColor || settings.customPrimaryColor || '#FF6B00' }}
                  />
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    2. Couleur des boutons & actions
                  </span>
                </div>
                <div className="flex items-center gap-2 p-1.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">HEX :</span>
                  <input
                    type="color"
                    value={settings.buttonColor || settings.customPrimaryColor || '#FF6B00'}
                    onChange={e => {
                      updateSetting('buttonColor', e.target.value);
                      updateSetting('customPrimaryColor', e.target.value);
                    }}
                    className="w-7 h-7 p-0.5 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <span className="text-xs font-mono font-bold text-slate-900 dark:text-white uppercase">
                    {settings.buttonColor || settings.customPrimaryColor || '#FF6B00'}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {[
                  { label: 'Orange UniSphere (Défaut)', color: '#FF6B00' },
                  { label: 'Bleu Royal', color: '#2563EB' },
                  { label: 'Vert Émeraude', color: '#059669' },
                  { label: 'Violet Majestueux', color: '#7C3AED' },
                  { label: 'Rouge Crimson', color: '#DC2626' },
                  { label: 'Rose Élégant', color: '#DB2777' },
                ].map(preset => {
                  const currentBtn = (settings.buttonColor || settings.customPrimaryColor || '#FF6B00').toLowerCase();
                  const isSelected = currentBtn === preset.color.toLowerCase();
                  return (
                    <button
                      key={preset.color}
                      onClick={() => {
                        updateSetting('buttonColor', preset.color);
                        updateSetting('customPrimaryColor', preset.color);
                        toast.success(`Couleur boutons : ${preset.label}`);
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                        isSelected
                          ? 'border-[#FF6B00] bg-white dark:bg-slate-800 shadow-sm scale-105 ring-2 ring-[#FF6B00]/30'
                          : 'border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 hover:border-slate-300'
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: preset.color }} />
                      <span className="text-slate-800 dark:text-slate-200">{preset.label}</span>
                      {isSelected && <CheckCircle size={14} className="text-[#FF6B00]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. MODE D'ARRIÈRE-PLAN (FOND) */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200/80 dark:border-slate-700">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100 block mb-3">
                3. Arrière-plan & Confort visuel
              </span>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    updateSetting('theme', 'light-orange');
                    toast.success('Mode Clair activé');
                  }}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    !settings.theme.includes('dark')
                      ? 'border-[#FF6B00] bg-white dark:bg-slate-800 shadow-md ring-2 ring-[#FF6B00]/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      ☀️ Mode Clair
                    </span>
                    {!settings.theme.includes('dark') && <CheckCircle size={16} className="text-[#FF6B00]" />}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Fond clair, idéal en journée et pour la lecture</p>
                </button>

                <button
                  onClick={() => {
                    updateSetting('theme', 'dark-orange');
                    toast.success('Mode Sombre activé');
                  }}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    settings.theme.includes('dark')
                      ? 'border-[#FF6B00] bg-white dark:bg-slate-800 shadow-md ring-2 ring-[#FF6B00]/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      🌙 Mode Sombre
                    </span>
                    {settings.theme.includes('dark') && <CheckCircle size={16} className="text-[#FF6B00]" />}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Fond sombre, réduit la fatigue oculaire</p>
                </button>
              </div>
            </div>
          </div>

          {/* Langue & Densité */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Langue */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <Globe size={18} className="text-[#FF6B00]" />
                Langue de l'interface
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'fr' as const, flag: '🇫🇷', name: 'Français' },
                  { id: 'en' as const, flag: '🇬🇧', name: 'English' },
                  { id: 'ar' as const, flag: '🇸🇦', name: 'العربية' },
                  { id: 'bm' as const, flag: '🇲🇱', name: 'Bamanankan' },
                ].map(lang => (
                  <button
                    key={lang.id}
                    onClick={() => {
                      updateSetting('language', lang.id);
                      toast.success(`Langue changée : ${lang.name}`);
                    }}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all ${
                      settings.language === lang.id
                        ? 'border-[#FF6B00] bg-orange-50/60 dark:bg-orange-950/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-2xl">{lang.flag}</span>
                    <span className="text-xs font-semibold text-slate-800 dark:text-white">{lang.name}</span>
                    {settings.language === lang.id && (
                      <CheckCircle size={14} className="text-[#FF6B00] ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Densité */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <Monitor size={18} className="text-[#FF6B00]" />
                Densité d'Affichage
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'compact' as const, label: 'Compact', desc: 'Tableaux denses' },
                  { id: 'comfortable' as const, label: 'Confort', desc: 'Recommandé' },
                  { id: 'spacious' as const, label: 'Spacieux', desc: 'Grand confort' },
                ].map(density => (
                  <button
                    key={density.id}
                    onClick={() => {
                      updateSetting('density', density.id);
                      toast.success(`Densité ${density.label} appliquée`);
                    }}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      settings.density === density.id
                        ? 'border-[#FF6B00] bg-orange-50/60 dark:bg-orange-950/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <p className={`text-xs font-bold ${
                      settings.density === density.id ? 'text-[#FF6B00]' : 'text-slate-800 dark:text-slate-200'
                    }`}>
                      {density.label}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{density.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ONGLET 4 : SONS & AUDIO                                  */}
      {/* ======================================================== */}
      {activeTab === 'sound' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <Volume2 size={20} className="text-[#FF6B00]" />
              Effets Sonores & Notifications
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Contrôlez les signaux audio émis lors des réceptions d'alertes, validations et messages.
            </p>
          </div>

          <ToggleRow
            icon={settings.sound_enabled ? Volume2 : VolumeX}
            label="Sons de l'application"
            description="Émettre un carillon harmonieux lors des événements et alertes"
            checked={settings.sound_enabled}
            onChange={v => {
              updateSetting('sound_enabled', v);
              toast.success(v ? 'Sons activés' : 'Sons désactivés');
            }}
          />

          {settings.sound_enabled && (
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Volume des alertes sonore : <span className="text-[#FF6B00]">{settings.sound_volume}%</span>
                </label>
                <button
                  type="button"
                  onClick={handleTestSound}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-xs font-semibold shadow transition-colors"
                >
                  <Volume2 size={14} />
                  Tester le son
                </button>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                value={settings.sound_volume}
                onChange={e => updateSetting('sound_volume', parseInt(e.target.value))}
                className="w-full h-2.5 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-[#FF6B00]"
              />

              <div className="flex justify-between text-[11px] text-slate-400">
                <span>0% Silencieux</span>
                <span>50% Recommandé</span>
                <span>100% Maximum</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* ONGLET 5 : SÉCURITÉ & CONFIDENTIALITÉ                    */}
      {/* ======================================================== */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Confidentialité */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <Shield size={20} className="text-[#FF6B00]" />
              Confidentialité & Visibilité
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Gérez votre visibilité auprès des autres membres de l'université.
            </p>

            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              <ToggleRow
                icon={Eye}
                label="Afficher mon statut en ligne"
                description="Permettre aux étudiants et enseignants de voir si vous êtes actuellement connecté"
                checked={settings.show_online_status}
                onChange={v => {
                  updateSetting('show_online_status', v);
                  toast.success(v ? 'Statut en ligne visible' : 'Statut en ligne masqué');
                }}
              />
              <ToggleRow
                icon={Eye}
                label="Profil visible dans l'annuaire"
                description="Permettre l'affichage de votre profil dans les recherches d'utilisateurs internes"
                checked={settings.show_profile_public}
                onChange={v => {
                  updateSetting('show_profile_public', v);
                  toast.success(v ? 'Profil public actif' : 'Profil privé actif');
                }}
              />
            </div>
          </div>

          {/* Formulaire Mot de Passe */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <KeyRound size={20} className="text-[#FF6B00]" />
              Modifier mon mot de passe
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Assurez-vous d'utiliser un mot de passe fort comportant au minimum 6 caractères.
            </p>

            <form onSubmit={handleChangePassword} className="space-y-4 max-w-xl">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Mot de passe actuel
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    value={passwordData.current_password}
                    onChange={e => setPasswordData({ ...passwordData, current_password: e.target.value })}
                    required
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Nouveau mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      value={passwordData.new_password}
                      onChange={e => setPasswordData({ ...passwordData, new_password: e.target.value })}
                      required
                      minLength={6}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                      placeholder="Min. 6 caractères"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Confirmer le mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="password"
                      value={passwordData.confirm_password}
                      onChange={e => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                      placeholder="Confirmez"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-semibold text-sm hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors disabled:opacity-50"
                >
                  {savingPassword ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                  Mettre à jour le mot de passe
                </button>
              </div>
            </form>
          </div>

          {/* Historique des Connexions Réelles */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <History size={20} className="text-[#FF6B00]" />
              Activité Récente du Compte
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Dernières connexions et actions de sécurité enregistrées.
            </p>

            {loadingSessions ? (
              <div className="py-8 flex justify-center">
                <Loader2 size={24} className="animate-spin text-[#FF6B00]" />
              </div>
            ) : sessions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-[640px] w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-300 font-semibold uppercase">
                    <tr>
                      <th className="p-3">Action</th>
                      <th className="p-3">Date & Heure</th>
                      <th className="p-3">Adresse IP</th>
                      <th className="p-3">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {sessions.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50">
                        <td className="p-3 font-medium text-slate-900 dark:text-white">{s.action}</td>
                        <td className="p-3 text-slate-500">{s.date}</td>
                        <td className="p-3 font-mono text-slate-600 dark:text-slate-300">{s.ip_address}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full font-bold ${
                            s.status === 'success'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                          }`}>
                            {s.status === 'success' ? 'Succès' : 'Échec'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-400 py-4 text-center">Aucune session enregistrée pour le moment.</p>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ONGLET 6 : DONNÉES & MAINTENANCE                         */}
      {/* ======================================================== */}
      {activeTab === 'data' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <Download size={20} className="text-[#FF6B00]" />
              Exportation & Sauvegarde
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Téléchargez une archive complète de vos préférences et métadonnées en format JSON structuré.
            </p>

            <button
              onClick={handleExportData}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-xl text-sm font-semibold transition-colors"
            >
              <Download size={16} />
              Télécharger ma configuration JSON
            </button>
          </div>

          {/* Zone Danger */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-red-200 dark:border-red-900/60 p-4 sm:p-6 shadow-sm">
            <h2 className="text-lg font-bold text-red-600 dark:text-red-400 mb-1 flex items-center gap-2">
              <AlertTriangle size={20} />
              Zone de réinitialisation
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Revenir aux réglages par défaut de la plateforme. Vos données académiques et notes ne seront pas impactées.
            </p>

            <div className="flex items-center justify-between p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900">
              <div>
                <p className="font-semibold text-red-900 dark:text-red-200 text-sm">Réinitialiser les préférences</p>
                <p className="text-xs text-red-600 dark:text-red-400">Restaure les thèmes, langues et canaux par défaut</p>
              </div>
              <button
                onClick={() => setShowResetConfirm(true)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors shadow"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMATION RESET */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-4 sm:p-6 border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-950/40 rounded-2xl flex items-center justify-center flex-shrink-0 text-[#FF6B00]">
                <RotateCcw size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Réinitialiser les réglages ?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Vos paramètres d'apparence, alertes et sons seront restaurés aux valeurs initiales.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleReset}
                className="px-5 py-2 text-xs font-bold text-white bg-[#FF6B00] hover:bg-[#e55f00] rounded-xl shadow-lg transition-colors"
              >
                Confirmer la réinitialisation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper pour jouer un carillon Web Audio harmonique
function playHarmonicChime(volume: number) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 (accord majeur lumineux)
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

      const maxGain = (volume / 100) * 0.15;
      gain.gain.setValueAtTime(maxGain, ctx.currentTime + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.08 + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.08);
      osc.stop(ctx.currentTime + idx * 0.08 + 0.45);
    });
  } catch (e) {
    console.warn('Audio non supporté:', e);
  }
}

// Toggle Row Reusable
interface ToggleRowProps {
  icon?: any;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function ToggleRow({ icon: Icon, label, description, checked, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between py-3.5 px-2 hover:bg-slate-50/60 dark:hover:bg-slate-700/40 rounded-xl transition-colors">
      <div className="flex items-start gap-3 flex-1 pr-4">
        {Icon && (
          <div className="w-9 h-9 rounded-xl bg-orange-100/70 dark:bg-orange-950/40 text-[#FF6B00] flex items-center justify-center flex-shrink-0">
            <Icon size={18} />
          </div>
        )}
        <div>
          <p className="font-semibold text-slate-900 dark:text-white text-sm">{label}</p>
          {description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
          checked ? 'bg-[#FF6B00]' : 'bg-slate-300 dark:bg-slate-600'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

// Toggle Card Reusable
interface ToggleCardProps {
  title: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function ToggleCard({ title, desc, checked, onChange }: ToggleCardProps) {
  return (
    <div
      onClick={() => onChange(!checked)}
      className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
        checked
          ? 'border-[#FF6B00] bg-orange-50/50 dark:bg-orange-950/20'
          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
      }`}
    >
      <div>
        <p className="font-semibold text-slate-900 dark:text-white text-sm">{title}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{desc}</p>
      </div>
      <div
        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors flex-shrink-0 ${
          checked ? 'bg-[#FF6B00] border-[#FF6B00] text-white' : 'border-slate-300 dark:border-slate-600'
        }`}
      >
        {checked && <Check size={14} className="stroke-[3]" />}
      </div>
    </div>
  );
}