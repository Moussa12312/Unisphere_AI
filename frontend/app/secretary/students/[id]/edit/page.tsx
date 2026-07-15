'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, User, Mail, GraduationCap, Upload, X, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { filiereService } from '@/services/filiereService';
import { toast } from 'react-hot-toast';

export default function SecretaryEditStudentPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [filieres, setFilieres] = useState<any[]>([]);
  const [domaines, setDomaines] = useState<string[]>([]);
  const [filieresByDomaine, setFilieresByDomaine] = useState<any[]>([]);
  const [levelsOfFiliere, setLevelsOfFiliere] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    first_name: '', last_name: '', date_of_birth: '', place_of_birth: '',
    gender: '', nationality: '', email: '', phone: '', address: '',
    matricule: '', level: '', filiere: '', domain: '',
    parent_name: '', parent_phone: '', parent_email: ''
  });

  useEffect(() => {
    if (studentId) {
      loadFilieres();
      loadStudent();
    }
  }, [studentId]);

  const loadFilieres = async () => {
    try {
      const data: any[] = await filiereService.getAll() || [];
      setFilieres(data);
      setDomaines(Array.from(new Set(data.map((f: any) => f.domain).filter(Boolean))));
    } catch (error) {
      toast.error('Erreur chargement filières');
    }
  };

  useEffect(() => {
    if (formData.domain && filieres.length > 0) {
      setFilieresByDomaine(filieres.filter((f: any) => f.domain === formData.domain));
    }
  }, [formData.domain, filieres]);

  useEffect(() => {
    if (formData.filiere && formData.domain && filieres.length > 0) {
      const filiere = filieres.find((f: any) => f.domain === formData.domain && f.name === formData.filiere);
      if (filiere?.levels) {
        setLevelsOfFiliere(filiere.levels.split(',').map((l: string) => l.trim()).filter(Boolean));
      }
    }
  }, [formData.filiere, formData.domain, filieres]);

  const loadStudent = async () => {
    setLoadingData(true);
    try {
      const response = await api.get(`/api/v1/students/${studentId}`);
      const data = response.data;
      
      setFormData({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        date_of_birth: data.date_of_birth ? data.date_of_birth.split('T')[0] : '',
        place_of_birth: data.place_of_birth || '',
        gender: data.gender || '',
        nationality: data.nationality || 'Malienne',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        matricule: data.matricule || '',
        level: data.level || '',
        filiere: data.filiere || '',
        domain: data.domain || '',
        parent_name: data.parent_name || '',
        parent_phone: data.parent_phone || '',
        parent_email: data.parent_email || ''
      });

      if (data.photo) {
        const photoUrl = data.photo.startsWith('http') ? data.photo : `http://localhost:8000/uploads/${data.photo}`;
        setPhotoPreview(photoUrl);
      }
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors du chargement');
    } finally {
      setLoadingData(false);
    }
  };

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

      await api.put(`/api/v1/students/${studentId}`, submitData);
      toast.success('Étudiant mis à jour avec succès !');
      router.push(`/secretary/students/${studentId}`);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la mise à jour');
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
        <Link href="/secretary/dashboard" className="hover:text-[#FF6B00]">Dashboard</Link>
        <span className="mx-2">›</span>
        <Link href="/secretary/students" className="hover:text-[#FF6B00]">Étudiants</Link>
        <span className="mx-2">›</span>
        <Link href={`/secretary/students/${studentId}`} className="hover:text-[#FF6B00]">{formData.first_name} {formData.last_name}</Link>
        <span className="mx-2">›</span>
        <span className="text-slate-900 font-medium">Modifier</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Modifier l'étudiant</h1>
          <p className="text-slate-500 mt-1">Modifiez les informations de {formData.first_name} {formData.last_name}</p>
        </div>
        <Link href={`/secretary/students/${studentId}`} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium self-start">
          <ArrowLeft size={16} /> Annuler
        </Link>
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
                  <button type="button" onClick={() => { setPhotoPreview(null); setPhotoFile(null); }} className="absolute top-0 right-0 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg">
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
                <Upload size={16} /> Changer la photo
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
              <input type="text" name="first_name" value={formData.first_name} onChange={handleChange} required className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Nom <span className="text-red-500">*</span></label>
              <input type="text" name="last_name" value={formData.last_name} onChange={handleChange} required className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
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
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><Mail size={20} className="text-[#FF6B00]" /> Informations de contact</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email <span className="text-red-500">*</span></label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Téléphone</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" placeholder="+223 7XX XX XX XX" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Adresse</label>
              <textarea name="address" value={formData.address} onChange={handleChange} rows={2} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00] resize-none" />
            </div>
          </div>
        </div>

        {/* Académique */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><GraduationCap size={20} className="text-[#FF6B00]" /> Informations académiques</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Matricule</label>
              <input type="text" value={formData.matricule} readOnly className="w-full px-4 py-2.5 border border-slate-200 rounded-lg bg-slate-100 text-slate-600 font-mono cursor-not-allowed" />
              <p className="text-xs text-slate-500 mt-1">Le matricule ne peut pas être modifié</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Domaine <span className="text-red-500">*</span></label>
              <select name="domain" value={formData.domain} onChange={handleChange} required disabled={domaines.length === 0} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-white disabled:bg-slate-100">
                <option value="">Sélectionner un domaine...</option>
                {domaines.map((d: string) => (<option key={d} value={d}>{d}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Filière <span className="text-red-500">*</span></label>
              <select name="filiere" value={formData.filiere} onChange={handleChange} required disabled={!formData.domain || filieresByDomaine.length === 0} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-white disabled:bg-slate-100">
                <option value="">{!formData.domain ? 'Choisissez d\'abord un domaine...' : 'Sélectionner une filière...'}</option>
                {filieresByDomaine.map((f: any) => (<option key={f.id} value={f.name}>{f.name}</option>))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Niveau <span className="text-red-500">*</span></label>
              <select name="level" value={formData.level} onChange={handleChange} required disabled={levelsOfFiliere.length === 0} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-white disabled:bg-slate-100">
                <option value="">{!formData.filiere ? 'Choisissez d\'abord une filière...' : 'Sélectionner un niveau...'}</option>
                {levelsOfFiliere.map((l: string) => (<option key={l} value={l}>{l}</option>))}
              </select>
            </div>
          </div>
        </div>

        {/* Parent/Tuteur */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><User size={20} className="text-[#FF6B00]" /> Contact parent/tuteur (optionnel)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Nom complet</label>
              <input type="text" name="parent_name" value={formData.parent_name} onChange={handleChange} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Téléphone</label>
              <input type="tel" name="parent_phone" value={formData.parent_phone} onChange={handleChange} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" placeholder="+223 7XX XX XX XX" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
              <input type="email" name="parent_email" value={formData.parent_email} onChange={handleChange} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
            </div>
          </div>
        </div>

        {/* Boutons */}
        <div className="flex flex-col-reverse md:flex-row items-center justify-end gap-3 sticky bottom-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <Link href={`/secretary/students/${studentId}`} className="w-full md:w-auto text-center px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium">Annuler</Link>
          <button type="submit" disabled={loading} className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-sm font-medium disabled:opacity-50 shadow-md">
            {loading ? (<><Loader2 size={16} className="animate-spin" /> Mise à jour...</>) : (<><Save size={16} /> Enregistrer les modifications</>)}
          </button>
        </div>
      </form>
    </div>
  );
}