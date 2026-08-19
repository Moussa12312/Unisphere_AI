'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Save, Upload, Building2, Phone, Mail, Globe, 
  Calendar, User, FileText, CheckCircle, X, Sparkles,
  CreditCard, Crown, ArrowRight
} from 'lucide-react';
import api, { API_BASE_URL } from '@/lib/api';
import { toast } from 'react-hot-toast';

import { useSettings } from '@/contexts/SettingsContext';
import { themes } from '@/lib/themes';
import { Palette } from 'lucide-react';

export default function UniversitySettingsPage() {
  const router = useRouter();
  const { settings, updateSetting, updateSettings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '', slogan: '', address: '', phone: '',
    email: '', website: '', description: '',
    established_year: '', rector_name: '',
    academic_year: '', logo: '',
    theme: 'light-orange',
    primary_color: '#FF6B00',
    language: 'fr'
  });

  const [subscription, setSubscription] = useState<any>(null);
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);
  const [newLogoFile, setNewLogoFile] = useState<File | null>(null);
  const [removeBackground, setRemoveBackground] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => { loadProfile(); loadSubscription(); }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/v1/settings/university/profile');
      const loadedTheme = response.data.theme || settings.theme || 'light-orange';
      const loadedColor = response.data.primary_color || settings.customPrimaryColor || '#FF6B00';
      const loadedLang = response.data.language || settings.language || 'fr';

      setFormData({
        name: response.data.name || '',
        slogan: response.data.slogan || '',
        address: response.data.address || '',
        phone: response.data.phone || '',
        email: response.data.email || '',
        website: response.data.website || '',
        description: response.data.description || '',
        established_year: response.data.established_year?.toString() || '',
        rector_name: response.data.rector_name || '',
        academic_year: response.data.academic_year || '',
        logo: response.data.logo || '',
        theme: loadedTheme,
        primary_color: loadedColor,
        language: loadedLang
      });

      updateSettings({
        theme: loadedTheme,
        customPrimaryColor: loadedColor,
        language: loadedLang
      });
    } catch (error) {
      toast.error('Erreur lors du chargement du profil');
    } finally {
      setLoading(false);
    }
  };

  const loadSubscription = async () => {
    try {
      const res = await api.get('/api/v1/subscriptions/me');
      setSubscription(res.data);
    } catch (error) {
      // Silencieux - pas d'abonnement = pas grave
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/v1/settings/university/profile', formData);

      // Mettre à jour immédiatement le contexte d'apparence
      updateSettings({
        theme: formData.theme,
        customPrimaryColor: formData.primary_color,
        language: formData.language as any
      });

      if (newLogoFile) {
        const fd = new FormData();
        fd.append('logo', newLogoFile);
        fd.append('remove_bg', removeBackground ? "true" : "false");
        const logoRes = await api.post('/api/v1/settings/university/logo', fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setFormData(prev => ({ ...prev, logo: logoRes.data.logo_url }));
      }

      toast.success('Profil et thème mis à jour avec succès !');
      window.dispatchEvent(new CustomEvent('universityUpdated'));
      setNewLogoFile(null);
      setPreviewLogo(null);
      setHasChanges(false);
    } catch (error: any) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Veuillez sélectionner une image'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5MB'); return; }
    setPreviewLogo(URL.createObjectURL(file));
    setNewLogoFile(file);
    setHasChanges(true);
  };

  const handleCancelLogo = () => {
    if (previewLogo) URL.revokeObjectURL(previewLogo);
    setPreviewLogo(null);
    setNewLogoFile(null);
    setRemoveBackground(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const displayLogoUrl = previewLogo || (formData.logo ? `${API_BASE_URL}/uploads/logos/${formData.logo}?t=${Date.now()}` : '');

  // Couleurs de statut
  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    active: { label: 'Actif', color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
    trial: { label: "Essai", color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
    expired: { label: 'Expiré', color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
    suspended: { label: 'Suspendu', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B00] border-t-transparent"></div></div>;

  const subStatus = subscription?.status ? statusConfig[subscription.status] || statusConfig.active : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Paramètres</h1>
          <p className="text-slate-500 mt-1">Gérez votre université et votre abonnement</p>
        </div>
      </div>

      {/* Section Logo */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Logo de l'université</h2>
        <div className="flex flex-col md:flex-row items-start gap-6">
          <div className="relative">
            {displayLogoUrl ? (
              <img src={displayLogoUrl} alt="Logo" className="w-32 h-32 object-contain rounded-xl border-2 border-slate-200 bg-slate-50 p-2" />
            ) : (
              <div className="w-32 h-32 bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center">
                <Building2 className="text-slate-400" size={40} />
              </div>
            )}
            {previewLogo && <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">Nouveau</div>}
          </div>
          
          <div className="flex-1 w-full">
            <h3 className="font-semibold text-slate-900 mb-2">Télécharger un nouveau logo</h3>
            <p className="text-sm text-slate-500 mb-4">Formats : PNG, JPG. Max : 5MB</p>
            
            <div className="flex gap-2 mb-4">
              <input type="file" ref={fileInputRef} onChange={handleLogoSelect} accept="image/*" className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">
                <Upload size={16} /> Choisir une image
              </button>
              {previewLogo && (
                <button onClick={handleCancelLogo} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors">
                  <X size={16} /> Annuler
                </button>
              )}
            </div>

            <label className={`flex items-center justify-between p-4 border rounded-xl transition-all cursor-pointer ${
              removeBackground ? 'border-[#FF6B00] bg-orange-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg transition-colors ${removeBackground ? 'bg-[#FF6B00] text-white' : 'bg-slate-200 text-slate-500'}`}>
                  <Sparkles size={20} />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Retirer l'arrière-plan</p>
                  <p className="text-xs text-slate-500">Rendre le fond transparent automatiquement</p>
                </div>
              </div>
              <div className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${removeBackground ? 'bg-[#FF6B00]' : 'bg-slate-300'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300 ${removeBackground ? 'translate-x-7' : 'translate-x-1'}`}></div>
              </div>
              <input type="checkbox" className="hidden" checked={removeBackground}
                onChange={(e) => { setRemoveBackground(e.target.checked); setHasChanges(true); }}
                disabled={!newLogoFile} />
            </label>
          </div>
        </div>
      </div>

      {/* Informations générales */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-6">Informations générales</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">Nom de l'université</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">Slogan</label>
            <div className="relative">
              <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" value={formData.slogan} onChange={(e) => handleChange('slogan', e.target.value)} maxLength={100}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm italic text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">Adresse</label>
            <input type="text" value={formData.address} onChange={(e) => handleChange('address', e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Téléphone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="tel" value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Site web</label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="url" value={formData.website} onChange={(e) => handleChange('website', e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Année de création</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="number" value={formData.established_year} onChange={(e) => handleChange('established_year', e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">Recteur / Directeur</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" value={formData.rector_name} onChange={(e) => handleChange('rector_name', e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Année académique</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" value={formData.academic_year} onChange={(e) => handleChange('academic_year', e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" placeholder="2025-2026" />
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Description</h2>
        <div className="relative">
          <FileText className="absolute left-3 top-3 text-slate-400" size={18} />
          <textarea value={formData.description} onChange={(e) => handleChange('description', e.target.value)} rows={4} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] resize-none" />
        </div>
      </div>

      {/* ✅ Apparence & Couleurs de l'Université */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Palette size={20} className="text-[#FF6B00]" />
          Apparence & Couleurs de l'Établissement
        </h2>

        {/* Thème */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-3">
            Thème de l'interface
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {themes.map((theme) => {
              const isActive = formData.theme === theme.id;
              return (
                <button
                  type="button"
                  key={theme.id}
                  onClick={() => {
                    handleChange('theme', theme.id);
                    updateSetting('theme', theme.id);
                  }}
                  className={`relative p-3 rounded-xl border-2 transition-all ${
                    isActive
                      ? 'border-[#FF6B00] bg-orange-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div 
                    className="h-10 rounded-lg mb-2 border border-slate-200 overflow-hidden flex"
                    style={{ backgroundColor: theme.colors.background }}
                  >
                    <div className="w-1/3 h-full" style={{ backgroundColor: theme.colors.surface }} />
                    <div className="w-1/3 h-full" style={{ backgroundColor: theme.colors.primary }} />
                    <div className="w-1/3 h-full" style={{ backgroundColor: theme.colors.text }} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>{theme.emoji}</span>
                    <span className="text-xs font-medium text-slate-700 truncate">{theme.name}</span>
                  </div>
                  {isActive && <CheckCircle size={14} className="absolute top-2 right-2 text-[#FF6B00]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Couleur Principale d'Établissement */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
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
                type="button"
                key={preset.color}
                onClick={() => {
                  handleChange('primary_color', preset.color);
                  updateSetting('customPrimaryColor', preset.color);
                }}
                className={`w-9 h-9 rounded-full border-2 transition-all flex items-center justify-center ${
                  formData.primary_color === preset.color
                    ? 'border-black scale-110 shadow-md'
                    : 'border-transparent hover:scale-105'
                }`}
                style={{ backgroundColor: preset.color }}
                title={preset.label}
              >
                {formData.primary_color === preset.color && <CheckCircle size={14} className="text-white drop-shadow" />}
              </button>
            ))}

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-slate-500">Sélecteur HEX :</span>
              <input
                type="color"
                value={formData.primary_color}
                onChange={(e) => {
                  handleChange('primary_color', e.target.value);
                  updateSetting('customPrimaryColor', e.target.value);
                }}
                className="w-9 h-9 p-0.5 rounded-lg border border-slate-300 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Langue de l'université */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Langue par défaut de l'interface
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { id: 'fr', flag: '🇫🇷', name: 'Français' },
              { id: 'en', flag: '🇬🇧', name: 'English' },
              { id: 'ar', flag: '🇸🇦', name: 'العربية' },
              { id: 'bm', flag: '🇲🇱', name: 'Bamanankan' },
            ].map((lang) => (
              <button
                type="button"
                key={lang.id}
                onClick={() => {
                  handleChange('language', lang.id);
                  updateSetting('language', lang.id as any);
                }}
                className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  formData.language === lang.id
                    ? 'border-[#FF6B00] bg-orange-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="text-2xl">{lang.flag}</span>
                <span className="text-sm font-medium">{lang.name}</span>
                {formData.language === lang.id && <CheckCircle size={14} className="text-[#FF6B00] ml-auto" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bouton sauvegarder */}
      <div className="flex justify-end sticky bottom-6 z-20">
        <button onClick={handleSave} disabled={saving || !hasChanges} className="flex items-center gap-2 px-8 py-4 bg-[#FF6B00] text-white rounded-xl text-sm font-semibold hover:bg-[#e55f00] transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
          <Save size={18} /> {saving ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
        </button>
      </div>
    </div>
  );
}