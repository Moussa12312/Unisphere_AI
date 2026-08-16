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

export default function UniversitySettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '', slogan: '', address: '', phone: '',
    email: '', website: '', description: '',
    established_year: '', rector_name: '',
    academic_year: '', logo: ''
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
        logo: response.data.logo || ''
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

      if (newLogoFile) {
        const fd = new FormData();
        fd.append('logo', newLogoFile);
        fd.append('remove_bg', removeBackground ? "true" : "false");
        const logoRes = await api.post('/api/v1/settings/university/logo', fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setFormData(prev => ({ ...prev, logo: logoRes.data.logo_url }));
      }

      toast.success('Profil mis à jour avec succès !');
      window.dispatchEvent(new CustomEvent('universityUpdated'));
      setNewLogoFile(null);
      setPreviewLogo(null);
      setHasChanges(false);
      setTimeout(() => window.location.reload(), 1500);
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
          <textarea value={formData.description} onChange={(e) => handleChange('description', e.target.value)} rows={6} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] resize-none" />
        </div>
      </div>

      {/* Bouton sauvegarder */}
      <div className="flex justify-end sticky bottom-6">
        <button onClick={handleSave} disabled={saving || !hasChanges} className="flex items-center gap-2 px-8 py-4 bg-[#FF6B00] text-white rounded-xl text-sm font-semibold hover:bg-[#e55f00] transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
          <Save size={18} /> {saving ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
        </button>
      </div>
    </div>
  );
}