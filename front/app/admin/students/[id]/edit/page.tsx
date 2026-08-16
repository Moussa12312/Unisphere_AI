'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Upload, X, Save, Check } from 'lucide-react';
import Link from 'next/link';
import { studentService } from '@/services/studentService';
import api from '@/lib/api';
import { getApiErrorMessage } from '@/lib/errorHandler';
import { Student } from '@/types/student';
import { toast } from 'react-hot-toast';

export default function EditStudentPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    filiere: '',
    level: '',
  });

  const filieres = ['Informatique', 'GEA', 'Marketing', 'Réseaux', 'Génie civil'];
  const levels = ['L1', 'L2', 'L3', 'M1', 'M2'];

  useEffect(() => {
    loadStudent();
  }, [params.id]);

  const loadStudent = async () => {
    if (!params.id || isNaN(Number(params.id))) {
      setError('ID étudiant invalide');
      setLoadingData(false);
      return;
    }

    try {
      setLoadingData(true);
      setError(null);
      const data = await studentService.getById(Number(params.id));
      setFormData({
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        filiere: data.filiere,
        level: data.level,
      });
      
      if (data.photo) {
        setPhotoPreview(`http://localhost:8000/uploads/${data.photo}?t=${Date.now()}`);
      }
    } catch (error: any) {
      console.error('Erreur chargement:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        setError('Session expirée');
        setTimeout(() => router.push('/login'), 2000);
      } else if (error.response?.status === 404) {
        setError('Étudiant non trouvé');
      } else {
        setError(error.response?.data?.detail || 'Erreur lors du chargement');
      }
    } finally {
      setLoadingData(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('La photo ne doit pas dépasser 2MB');
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
  
    try {
      // ✅ Construire le FormData avec TOUS les champs obligatoires
      const formDataToSend = new FormData();
      formDataToSend.append('first_name', formData.first_name);
      formDataToSend.append('last_name', formData.last_name);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('filiere', formData.filiere);
      formDataToSend.append('level', formData.level);
      
      // ✅ Ajouter la photo si elle existe
      if (photoFile) {
        formDataToSend.append('photo', photoFile);
      }
  
      // ✅ Envoyer en PUT avec FormData
      await api.put(`/api/v1/students/${params.id}`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
  
      toast.success('Étudiant mis à jour avec succès !');
      router.push(`/admin/students/${params.id}`);
    } catch (error: any) {
      console.error('❌ Erreur:', error);
      toast.error(getApiErrorMessage(error, 'Erreur lors de la modification'));
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B00]"></div>
        <p className="text-slate-500">Chargement en cours...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="text-6xl">⚠️</div>
        <h2 className="text-xl font-bold text-slate-900">Une erreur est survenue</h2>
        <p className="text-slate-500">{error}</p>
        <div className="flex gap-3 mt-4">
          <button
            onClick={loadStudent}
            className="bg-[#FF6B00] text-white px-4 py-2 rounded-lg hover:bg-[#e55f00]"
          >
            Réessayer
          </button>
          <Link
            href="/admin/students"
            className="border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50"
          >
            Retour à la liste
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div>
          <p className="text-slate-500 mt-1">Modifier les informations de l'étudiant.</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Filière *</label>
            <select
              value={formData.filiere}
              onChange={(e) => setFormData({...formData, filiere: e.target.value})}
              required
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-white"
            >
              {filieres.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Niveau *</label>
            <select
              value={formData.level}
              onChange={(e) => setFormData({...formData, level: e.target.value})}
              required
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-white"
            >
              {levels.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Photo */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">Photo de l'étudiant</label>
          
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
                onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-md"
              >
                <X size={16} />
              </button>
              {photoFile && (
                <p className="text-xs text-green-600 mt-2 text-center font-medium">
                  ✓ Nouvelle photo sélectionnée
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
            {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
          <Link
            href={`/admin/students/${params.id}`}
            className="px-6 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Annuler
          </Link>
        </div>
      </form>
    </div>
  );
}