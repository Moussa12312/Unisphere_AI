'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X, Save, Check } from 'lucide-react';
import Link from 'next/link';
import { teacherService } from '@/services/teacherService';
import { filiereService } from '@/services/filiereService';
import { getApiErrorMessage } from '@/lib/errorHandler';
import { toast } from 'react-hot-toast';

export default function CreateTeacherPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [filieres, setFilieres] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    domain: '',        // Domaine sélectionné
    filiere_id: '',    // ID de la filière
    speciality: '',
    phone: '',
  });

  // ✅ Charger les filières
  useEffect(() => {
    const loadFilieres = async () => {
      try {
        const data = await filiereService.getAll();
        setFilieres(data);
      } catch (error) {
        console.error('Erreur chargement filières:', error);
      }
    };
    loadFilieres();
  }, []);

  // ✅ Extraire les domaines uniques
  const domains = [...new Set(filieres.map(f => f.domain))].sort();
  
  // ✅ Filtrer les filières par domaine
  const filieresOfDomain = filieres.filter(f => f.domain === formData.domain);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('La photo ne doit pas dépasser 2MB');
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
  
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('first_name', formData.first_name);
      formDataToSend.append('last_name', formData.last_name);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('speciality', formData.speciality);
      
      // ✅ CORRECTION : N'envoyer filiere_id que s'il est valide
      if (formData.filiere_id && formData.filiere_id !== '') {
        formDataToSend.append('filiere_id', formData.filiere_id);
      }
      
      if (formData.phone && formData.phone.trim() !== '') {
        formDataToSend.append('phone', formData.phone);
      }
      
      if (photoFile) {
        formDataToSend.append('photo', photoFile);
      }
  
      const response = await teacherService.create(formDataToSend);
      
      toast.success(
        `Enseignant créé ! Mot de passe : ${response.temp_password}`,
        { duration: 8000 }
      );
      
      navigator.clipboard.writeText(response.temp_password);
      toast.success('Mot de passe copié dans le presse-papier !');
      
      router.push('/admin/teachers');
      
    } catch (error: any) {
      console.error('❌ Erreur:', error);
      console.error('📋 Détails:', error.response?.data);
      toast.error(getApiErrorMessage(error, 'Erreur lors de la création'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-slate-500 mb-4">
        <Link href="/admin/dashboard" className="hover:text-[#FF6B00]">Dashboard</Link>
        <span className="mx-2">›</span>
        <Link href="/admin/teachers" className="hover:text-[#FF6B00]">Enseignants</Link>
        <span className="mx-2">›</span>
        <span className="text-slate-900 font-medium">Nouvel enseignant</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nouvel enseignant</h1>
          <p className="text-slate-500 mt-1">Créer un nouveau profil enseignant.</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Prénom */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Prénom *</label>
            <input
              type="text"
              value={formData.first_name}
              onChange={(e) => setFormData({...formData, first_name: e.target.value})}
              required
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>

          {/* Nom */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Nom *</label>
            <input
              type="text"
              value={formData.last_name}
              onChange={(e) => setFormData({...formData, last_name: e.target.value})}
              required
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>

          {/* Téléphone */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Téléphone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>

          {/* ✅ Domaine (dynamique) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Domaine *</label>
            <select
              value={formData.domain}
              onChange={(e) => setFormData({...formData, domain: e.target.value, filiere_id: ''})}
              required
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-white"
            >
              <option value="">Sélectionnez un domaine</option>
              {domains.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            {filieres.length === 0 && (
              <p className="text-xs text-orange-600 mt-1">
                ⚠️ Aucune filière configurée. <Link href="/admin/filieres/create" className="underline">Ajouter une filière</Link>
              </p>
            )}
          </div>

          {/* ✅ Filière (filtrée par domaine) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Filière *</label>
            <select
              value={formData.filiere_id}
              onChange={(e) => setFormData({...formData, filiere_id: e.target.value})}
              required
              disabled={!formData.domain}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-white disabled:bg-slate-100"
            >
              <option value="">Sélectionnez une filière</option>
              {filieresOfDomain.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          {/* Spécialité */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">Spécialité *</label>
            <input
              type="text"
              value={formData.speciality}
              onChange={(e) => setFormData({...formData, speciality: e.target.value})}
              placeholder="Ex: Développement Web, Comptabilité..."
              required
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>
        </div>

        {/* Photo Upload */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">Photo de l'enseignant</label>
          
          {photoPreview ? (
            <div className="relative inline-block">
              <img 
                src={photoPreview} 
                alt="Preview" 
                className="w-32 h-32 rounded-lg object-cover border-2 border-slate-200"
              />
              {photoFile && (
                <div className="absolute -top-2 -left-2 bg-green-500 text-white rounded-full p-1 shadow-md">
                  <Check size={12} />
                </div>
              )}
              <button
                type="button"
                onClick={removePhoto}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-md"
              >
                <X size={16} />
              </button>
              {photoFile && (
                <p className="text-xs text-green-600 mt-2 text-center font-medium">
                  ✓ Photo sélectionnée
                </p>
              )}
              <label className="block mt-2 cursor-pointer">
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                <span className="text-xs text-[#FF6B00] hover:underline font-medium">Changer la photo</span>
              </label>
            </div>
          ) : (
            <label className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center hover:border-[#FF6B00] transition-colors cursor-pointer block max-w-xs">
              <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              <Upload className="mx-auto text-slate-400 mb-2" size={32} />
              <p className="text-sm text-slate-500">Cliquez pour ajouter une photo</p>
              <p className="text-xs text-slate-400 mt-1">JPG, PNG (max. 2MB)</p>
            </label>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-8 pt-6 border-t border-slate-100">
          <button
            type="submit"
            disabled={loading}
            className="bg-[#FF6B00] hover:bg-[#e55f00] text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Save size={16} />
            {loading ? 'Enregistrement...' : 'Enregistrer l\'enseignant'}
          </button>
          <Link
            href="/admin/teachers"
            className="px-6 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Annuler
          </Link>
        </div>
      </form>
    </div>
  );
}