'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, User, Upload, X, Loader2, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { filiereService } from '@/services/filiereService';
import { useToast } from '@/components/ToastProvider';

export default function AdminCreateStudentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const [loadingData, setLoadingData] = useState(true);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [filieres, setFilieres] = useState<any[]>([]);
  const [domaines, setDomaines] = useState<string[]>([]);
  const [filieresByDomaine, setFilieresByDomaine] = useState<any[]>([]);
  const [levelsOfFiliere, setLevelsOfFiliere] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    place_of_birth: '',
    gender: '',
    nationality: 'Malienne',
    email: '',
    phone: '',
    address: '',
    level: '',
    filiere: '',
    domain: '',
    parent_name: '',
    parent_phone: '',
    parent_email: ''
  });

  useEffect(() => { loadFilieres(); }, []);

  const loadFilieres = async () => {
    setLoadingData(true);
    try {
      const data: any[] = await filiereService.getAll() || [];
      setFilieres(data);
      const domainesUniques: string[] = Array.from(new Set(data.map((f: any) => f.domain).filter(Boolean)));
      setDomaines(domainesUniques);
    } catch (error) {
      toast.error('Erreur lors du chargement des filières');
    } finally {
      setLoadingData(false);
    }
  };

  // ✅ Quand niveau = L1, forcer filière = Tronc commun
  const handleLevelChange = (newLevel: string) => {
    if (newLevel === 'L1') {
      setFormData({ 
        ...formData, 
        level: newLevel,
        filiere: "Tronc commun",
        domain: formData.domain || ''
      });
    } else {
      setFormData({ ...formData, level: newLevel, filiere: '' });
    }
  };

  // ✅ Quand domaine change : si L1, garder Tronc commun
  const handleDomainChange = (newDomain: string) => {
    if (formData.level === 'L1') {
      setFormData({ 
        ...formData, 
        domain: newDomain,
        filiere: "Tronc commun"
      });
    } else {
      setFormData({ ...formData, domain: newDomain, filiere: '', level: '' });
    }
  };

  useEffect(() => {
    if (formData.level === 'L1') {
      const tronc = filieres.filter((f: any) => f.name === "Tronc commun");
      setFilieresByDomaine(tronc);
    } else if (formData.domain) {
      setFilieresByDomaine(filieres.filter((f: any) => f.domain === formData.domain));
    } else {
      setFilieresByDomaine([]);
    }
  }, [formData.domain, formData.level, filieres]);

  useEffect(() => {
    if (formData.filiere && formData.domain) {
      const filiere = filieres.find((f: any) => f.domain === formData.domain && f.name === formData.filiere);
      if (filiere?.levels) {
        setLevelsOfFiliere(filiere.levels.split(',').map((l: string) => l.trim()).filter(Boolean));
      } else {
        setLevelsOfFiliere([]);
      }
    } else {
      setLevelsOfFiliere([]);
    }
  }, [formData.filiere, formData.domain, filieres]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { toast.error('La photo ne doit pas dépasser 5MB'); return; }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhotoPreview(null);
    setPhotoFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.first_name || !formData.last_name || !formData.email || !formData.level || !formData.filiere || !formData.domain) {
      toast.error('Veuillez remplir tous les champs obligatoires (*)');
      return;
    }

    setLoading(true);
    try {
      const submitData = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value && value.toString().trim() !== '') submitData.append(key, value);
      });
      if (photoFile) submitData.append('photo', photoFile);

      await api.post('/api/v1/students/', submitData);
      toast.success('Étudiant créé avec succès !');
      router.push('/admin/students');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B00] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      <div className="flex items-center text-sm text-slate-500">
        <Link href="/admin/dashboard" className="hover:text-[#FF6B00]">Dashboard</Link>
        <span className="mx-2">›</span>
        <Link href="/admin/students" className="hover:text-[#FF6B00]">Étudiants</Link>
        <span className="mx-2">›</span>
        <span className="text-slate-900 font-medium">Nouveau</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Inscription d'un étudiant</h1>
          <p className="text-slate-500 mt-1">Remplissez les informations pour créer un nouveau dossier</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photo */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><User size={20} className="text-[#FF6B00]" /> Photo de profil</h2>
          <div className="flex items-center gap-6">
            <div className="relative">
              {photoPreview ? (
                <div className="relative">
                  <img src={photoPreview} alt="Aperçu" className="w-32 h-32 rounded-full object-cover border-4 border-[#FF6B00]/20" />
                  <button type="button" onClick={removePhoto} className="absolute top-0 right-0 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="w-32 h-32 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center">
                  <User size={48} className="text-slate-400" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-sm font-medium cursor-pointer">
                Choisir une photo
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              </label>
              <p className="text-xs text-slate-500 mt-2">JPG, PNG ou GIF (max 5MB) - Optionnel</p>
            </div>
          </div>
        </div>

        {/* Infos personnelles */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><User size={20} className="text-[#FF6B00]" /> Informations personnelles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Prénom <span className="text-red-500">*</span></label>
              <input type="text" name="first_name" value={formData.first_name} onChange={handleChange} required className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" placeholder="Amadou" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Nom <span className="text-red-500">*</span></label>
              <input type="text" name="last_name" value={formData.last_name} onChange={handleChange} required className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" placeholder="Traoré" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Date de naissance</label>
              <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Lieu de naissance</label>
              <input type="text" name="place_of_birth" value={formData.place_of_birth} onChange={handleChange} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" placeholder="Bamako" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Genre</label>
              <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-white">
                <option value="">Sélectionner...</option>
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Nationalité</label>
              <input type="text" name="nationality" value={formData.nationality} onChange={handleChange} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" placeholder="Malienne" />
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><GraduationCap size={20} className="text-[#FF6B00]" /> Informations de contact</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email <span className="text-red-500">*</span></label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" placeholder="amadou.traore@email.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Téléphone</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" placeholder="+223 73 34 34 93" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Adresse</label>
              <textarea name="address" value={formData.address} onChange={handleChange} rows={2} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00] resize-none" placeholder="Quartier, Ville" />
            </div>
          </div>
        </div>

        {/* ✅ Académique - ORDRE : Niveau → Domaine → Filière */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><GraduationCap size={20} className="text-[#FF6B00]" /> Informations académiques</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ✅ NIVEAU EN PREMIER */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Niveau <span className="text-red-500">*</span></label>
              <select 
                name="level" 
                value={formData.level} 
                onChange={(e) => handleLevelChange(e.target.value)}
                required 
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-white"
              >
                <option value="">Sélectionner un niveau...</option>
                <option value="L1">L1</option>
                <option value="L2">L2</option>
                <option value="L3">L3</option>
                <option value="M1">M1</option>
                <option value="M2">M2</option>
              </select>
              {formData.level === 'L1' && (
                <p className="text-xs text-blue-600 mt-1"></p>
              )}
            </div>

            {/* ✅ Domaine LIBRE */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Domaine <span className="text-red-500">*</span></label>
              <select 
                name="domain" 
                value={formData.domain} 
                onChange={(e) => handleDomainChange(e.target.value)}
                required 
                disabled={!formData.level}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-white disabled:bg-slate-100"
              >
                <option value="">Sélectionner un domaine...</option>
                {domaines.map((d: string) => (<option key={d} value={d}>{d}</option>))}
              </select>
            </div>

            {/* ✅ Filière : Tronc commun si L1 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Filière <span className="text-red-500">*</span>
                {formData.level === 'L1'}
              </label>
              <select 
                name="filiere" 
                value={formData.filiere} 
                onChange={handleChange}
                required 
                disabled={formData.level === 'L1' || !formData.domain || filieresByDomaine.length === 0}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-white disabled:bg-slate-100"
              >
                {formData.level === 'L1' ? (
                  <option value="Tronc commun">Tronc commun (automatique)</option>
                ) : (
                  <>
                    <option value="">
                      {!formData.domain 
                        ? 'Choisissez d\'abord un domaine...' 
                        : 'Sélectionner une filière...'}
                    </option>
                    {filieresByDomaine.map((f: any) => (<option key={f.id} value={f.name}>{f.name}</option>))}
                  </>
                )}
              </select>
            </div>
          </div>
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs text-green-700">ℹ️ Le <strong>matricule</strong> sera généré automatiquement après l'enregistrement</p>
          </div>
        </div>

        {/* Parent/Tuteur */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><User size={20} className="text-[#FF6B00]" /> Contact parent/tuteur (optionnel)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Nom complet</label>
              <input type="text" name="parent_name" value={formData.parent_name} onChange={handleChange} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" placeholder="Nom du parent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Téléphone</label>
              <input type="tel" name="parent_phone" value={formData.parent_phone} onChange={handleChange} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" placeholder="+223 7XX XX XX XX" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
              <input type="email" name="parent_email" value={formData.parent_email} onChange={handleChange} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" placeholder="parent@email.com" />
            </div>
          </div>
        </div>

        {/* Boutons */}
        <div className="flex flex-col-reverse md:flex-row items-center justify-end gap-3 sticky bottom-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <Link href="/admin/students" className="w-full md:w-auto text-center px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium">Annuler</Link>
          <button type="submit" disabled={loading} className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-sm font-medium disabled:opacity-50 shadow-md">
            {loading ? (<><Loader2 size={16} className="animate-spin" /> Création en cours...</>) : (<><Save size={16} /> Enregistrer l'étudiant</>)}
          </button>
        </div>
      </form>
    </div>
  );
}