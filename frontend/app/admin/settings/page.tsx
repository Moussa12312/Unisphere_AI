'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Save, Upload, Building2, Phone, Mail, Globe, 
  Calendar, User, FileText, CheckCircle, X, Sparkles
} from 'lucide-react';
import api from '@/lib/api';
import { useUniversityLogo } from '@/hooks/useUniversityLogo';
import { toast } from 'react-hot-toast';

export default function UniversitySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    slogan: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    description: '',
    established_year: '',
    rector_name: '',
    academic_year: '',
    logo: ''
  });

  const [previewLogo, setPreviewLogo] = useState<string | null>(null);
  const [newLogoFile, setNewLogoFile] = useState<File | null>(null);
  const [removeBackground, setRemoveBackground] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => { loadProfile(); }, []);

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

  const handleSave = async () => {
    setSaving(true);
    try {
      console.log("💾 DONNÉES ENVOYÉES AU BACKEND:", formData); // ✅ LOG
      
      // 1. Sauvegarder les infos texte
      const response = await api.put('/api/v1/settings/university/profile', formData);
      console.log("✅ RÉPONSE DU BACKEND (Profile):", response.data); // ✅ LOG

      // 2. Uploader le logo s'il y en a un nouveau
      if (newLogoFile) {
        const formDataLogo = new FormData();
        formDataLogo.append('logo', newLogoFile);
        formDataLogo.append('remove_bg', removeBackground ? "true" : "false");
        
        const logoResponse = await api.post('/api/v1/settings/university/logo', formDataLogo, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        console.log("✅ RÉPONSE DU BACKEND (Logo):", logoResponse.data); // ✅ LOG
        setFormData(prev => ({ ...prev, logo: logoResponse.data.logo_url }));
      }

      toast.success('Profil mis à jour avec succès !');
      
      // Déclencher la mise à jour de la sidebar
      window.dispatchEvent(new CustomEvent('universityUpdated'));
      
      setNewLogoFile(null);
      setPreviewLogo(null);
      setHasChanges(false);
      
      // Forcer un rechargement complet de la page après 1.5 secondes
      setTimeout(() => {
        console.log("🔄 Rechargement complet de la page...");
        window.location.reload();
      }, 1500);
      
    } catch (error: any) {
      console.error("❌ ERREUR LORS DE LA SAUVEGARDE:", error.response?.data || error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Veuillez sélectionner une image'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('L\'image ne doit pas dépasser 5MB'); return; }

    setPreviewLogo(URL.createObjectURL(file));
    setNewLogoFile(file);
    setHasChanges(true);
    toast.success('Image sélectionnée !');
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

  const displayLogoUrl = previewLogo || (formData.logo ? `http://localhost:8000/uploads/logos/${formData.logo}?t=${Date.now()}` : '');

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B00] border-t-transparent"></div></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Profil Université</h1>
          <p className="text-slate-500 mt-1">Gérez les informations de votre établissement</p>
        </div>
        <button onClick={handleSave} disabled={saving || !hasChanges} className="flex items-center gap-2 px-6 py-3 bg-[#FF6B00] text-white rounded-xl text-sm font-medium hover:bg-[#e55f00] transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
          <Save size={16} /> {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
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
                  <p className="text-xs text-slate-500">Rendre le fond du logo transparent automatiquement</p>
                </div>
              </div>
              
              <div className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${removeBackground ? 'bg-[#FF6B00]' : 'bg-slate-300'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300 ${removeBackground ? 'translate-x-7' : 'translate-x-1'}`}></div>
              </div>
              
              <input 
                type="checkbox" 
                className="hidden" 
                checked={removeBackground} 
                onChange={(e) => { setRemoveBackground(e.target.checked); setHasChanges(true); }} 
                disabled={!newLogoFile}
              />
            </label>

            {previewLogo && removeBackground && (
              <p className="text-xs text-[#FF6B00] font-medium mt-3 flex items-center gap-1">
                <Sparkles size={14} /> Le fond sera rendu transparent à la sauvegarde
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Informations générales */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-6">Informations générales</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Nom */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">Nom de l'université</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" placeholder="Ex: Université de Yaoundé I" />
            </div>
          </div>

          {/* ✅ NOUVEAU : Slogan */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Slogan / Devise de l'université
            </label>
            <div className="relative">
              <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={formData.slogan}
                onChange={(e) => handleChange('slogan', e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] italic text-slate-600"
                placeholder="Ex: Excellence, Innovation et Intégrité"
                maxLength={100}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1 text-right">
              {formData.slogan.length}/100 caractères
            </p>
          </div>

          {/* Adresse */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">Adresse</label>
            <input type="text" value={formData.address} onChange={(e) => handleChange('address', e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" placeholder="Adresse complète" />
          </div>

          {/* Téléphone */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Téléphone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="tel" value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" placeholder="+237 6XX XXX XXX" />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" placeholder="contact@universite.cm" />
            </div>
          </div>

          {/* Site web */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Site web</label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="url" value={formData.website} onChange={(e) => handleChange('website', e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" placeholder="https://www.universite.cm" />
            </div>
          </div>

          {/* Année de création */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Année de création</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="number" value={formData.established_year} onChange={(e) => handleChange('established_year', e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" placeholder="1993" />
            </div>
          </div>

          {/* Recteur */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">Nom du recteur / directeur</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" value={formData.rector_name} onChange={(e) => handleChange('rector_name', e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" placeholder="Prof. Dr. Jean Dupont" />
            </div>
          </div>

          {/* Année académique */}
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
          <textarea value={formData.description} onChange={(e) => handleChange('description', e.target.value)} rows={6} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] resize-none" placeholder="Description de l'université, sa mission, sa vision..." />
        </div>
      </div>

      {/* Bouton sauvegarder */}
      <div className="flex justify-end sticky bottom-6">
        <button onClick={handleSave} disabled={saving || !hasChanges} className="flex items-center gap-2 px-8 py-4 bg-[#FF6B00] text-white rounded-xl text-sm font-semibold hover:bg-[#e55f00] transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
          <Save size={18} /> {saving ? 'Sauvegarde en cours...' : 'Sauvegarder les modifications'}
        </button>
      </div>
    </div>
  );
}