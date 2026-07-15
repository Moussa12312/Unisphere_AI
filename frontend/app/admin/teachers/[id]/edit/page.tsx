'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  User, Mail, Phone, Save, ArrowLeft, Upload, X,
  Loader2, GraduationCap, BookOpen
} from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

export default function EditTeacherPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const teacherId = params.id;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [filieres, setFilieres] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    department: '',
    speciality: '',
    filiere_id: null as number | null,
  });

  useEffect(() => {
    loadTeacher();
    loadFilieres();
  }, [teacherId]);

  const loadTeacher = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/v1/teachers/${teacherId}`);
      const teacher = response.data;
      
      setFormData({
        first_name: teacher.first_name || '',
        last_name: teacher.last_name || '',
        email: teacher.email || '',
        phone: teacher.phone || '',
        department: teacher.department || '',
        speciality: teacher.speciality || '',
        filiere_id: teacher.filiere_id || null,
      });
      
      if (teacher.photo) {
        setPhotoPreview(`http://localhost:8000/uploads/${teacher.photo}`);
      }
    } catch (error: any) {
      toast.error('Erreur de chargement');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadFilieres = async () => {
    try {
      const response = await api.get('/api/v1/filieres/');
      setFilieres(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error(error);
    }
  };

  // ✅ GESTION DU FICHIER PHOTO
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Vérifier que c'est une image
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }
    
    // Vérifier la taille (max 5 Mo)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 5 Mo');
      return;
    }
    
    setPhotoFile(file);
    
    // Créer un aperçu
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ✅ UPLOAD PHOTO
  const handlePhotoUpload = async (file: File) => {
    const formDataUpload = new FormData();
    formDataUpload.append('photo', file);  // ✅ Nom 'photo' doit correspondre
    
    try {
      const response = await api.post(
        `/api/v1/teachers/upload-photo/${teacherId}`,
        formDataUpload,
        {
          headers: {
            'Content-Type': 'multipart/form-data',  // ✅ OBLIGATOIRE
          },
        }
      );
      
      return response.data.photo_url;
    } catch (error: any) {
      console.error('Upload photo échoué:', error.response?.data || error);
      throw error;
    }
  };

  // ✅ SAUVEGARDE
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      // ✅ ÉTAPE 1 : Upload de la photo SI un fichier est sélectionné
      if (photoFile) {
        try {
          await handlePhotoUpload(photoFile);
          toast.success('Photo uploadée !');
        } catch (error) {
          toast.error('Erreur lors de l\'upload de la photo');
          setSaving(false);
          return;
        }
      }
      
      // ✅ ÉTAPE 2 : Mettre à jour les infos (JSON)
      await api.put(`/api/v1/teachers/${teacherId}`, {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        department: formData.department,
        speciality: formData.speciality,
        filiere_id: formData.filiere_id,
      });
      
      toast.success('Enseignant modifié avec succès !');
      router.push('/admin/teachers');
    } catch (error: any) {
      console.error('Erreur:', error.response?.data || error);
      toast.error(error.response?.data?.detail || 'Erreur de modification');
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
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-slate-500">
        <button
          onClick={() => router.push('/admin/teachers')}
          className="hover:text-[#FF6B00] flex items-center gap-1"
        >
          <ArrowLeft size={14} />
          Enseignants
        </button>
        <span className="mx-2">›</span>
        <span className="text-slate-900 font-medium">
          Modifier {formData.first_name} {formData.last_name}
        </span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <User size={24} className="text-white" />
          </div>
          Modifier l'enseignant
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photo de profil */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Photo de profil</h2>
          
          <div className="flex items-center gap-6">
            {/* Aperçu */}
            <div className="relative">
              {photoPreview ? (
                <div className="relative">
                  <img
                    src={photoPreview}
                    alt="Aperçu"
                    className="w-32 h-32 rounded-2xl object-cover border-2 border-slate-200"
                  />
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="w-32 h-32 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center">
                  <User size={48} className="text-slate-400" />
                </div>
              )}
            </div>

            {/* Bouton upload */}
            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
                id="photo-input"
              />
              <label
                htmlFor="photo-input"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium cursor-pointer transition-colors"
              >
                <Upload size={16} />
                Choisir une photo
              </label>
              <p className="text-xs text-slate-500 mt-2">
                JPG, PNG ou GIF • Max 5 Mo
              </p>
              {photoFile && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ {photoFile.name} ({(photoFile.size / 1024).toFixed(1)} Ko)
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Informations personnelles */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Informations personnelles</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Prénom *
              </label>
              <input
                type="text"
                required
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nom *
              </label>
              <input
                type="text"
                required
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Téléphone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Spécialité *
              </label>
              <input
                type="text"
                required
                value={formData.speciality}
                onChange={(e) => setFormData({ ...formData, speciality: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Filière
              </label>
              <select
                value={formData.filiere_id || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  filiere_id: e.target.value ? parseInt(e.target.value) : null 
                })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              >
                <option value="">Sélectionner une filière</option>
                {filieres.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Boutons */}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => router.push('/admin/teachers')}
            className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Save size={16} />
                Sauvegarder
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}