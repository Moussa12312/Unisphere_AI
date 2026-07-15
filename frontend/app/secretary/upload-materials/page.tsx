'use client';

import { useState, useEffect } from 'react';
import {
  Upload, FileText, X, Save, Loader2, CheckCircle2,
  AlertCircle, BookOpen
} from 'lucide-react';
import { courseService, Course } from '@/services/courseService';
import { documentService } from '@/services/documentService';
import { useToast } from '@/components/ToastProvider';

export default function SecretaryUploadMaterialsPage() {
  const toast = useToast();
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    course_id: '',
    file: null as File | null,
  });

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const data = await courseService.getAll();
      setCourses(data);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, file: e.target.files[0] });
    }
  };

  const handleUpload = async () => {
    if (!formData.title || !formData.course_id || !formData.file) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    if (!formData.file.name.endsWith('.pdf')) {
      toast.error('Seuls les fichiers PDF sont acceptés');
      return;
    }

    setUploading(true);
    try {
      const submitData = new FormData();
      submitData.append('title', formData.title);
      submitData.append('course_id', formData.course_id);
      submitData.append('file', formData.file);

      await documentService.uploadCourseMaterial(submitData);
      
      toast.success('Fichier uploadé avec succès');
      setFormData({ title: '', course_id: '', file: null });
      
      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'upload');
    } finally {
      setUploading(false);
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
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
            <Upload size={24} className="text-white" />
          </div>
          Upload de cours PDF
        </h1>
        <p className="text-slate-500 mt-1">Téléchargez des supports de cours pour les étudiants</p>
      </div>

      {/* Formulaire */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <BookOpen size={16} className="inline mr-2" />
              Cours *
            </label>
            <select
              value={formData.course_id}
              onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            >
              <option value="">Sélectionner un cours...</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.title} ({c.code})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <FileText size={16} className="inline mr-2" />
              Titre du document *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Chapitre 1 - Introduction"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Upload size={16} className="inline mr-2" />
              Fichier PDF *
            </label>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-[#FF6B00] transition-colors">
              <input
                id="file-input"
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="file-input" className="cursor-pointer">
                {formData.file ? (
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <CheckCircle2 size={20} />
                    <span className="font-medium">{formData.file.name}</span>
                    <button
                      onClick={() => setFormData({ ...formData, file: null })}
                      className="ml-2 text-slate-400 hover:text-red-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div>
                    <Upload size={32} className="mx-auto text-slate-400 mb-2" />
                    <p className="text-sm text-slate-600">
                      Cliquez pour sélectionner un fichier PDF
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Format accepté : PDF uniquement
                    </p>
                  </div>
                )}
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setFormData({ title: '', course_id: '', file: null })}
              className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"
            >
              Annuler
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#FF6B00] to-orange-500 hover:from-[#e55f00] hover:to-orange-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {uploading ? 'Upload...' : 'Uploader'}
            </button>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <AlertCircle size={16} />
          Instructions
        </h3>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>Seuls les fichiers PDF sont acceptés</li>
          <li>Le fichier sera accessible aux étudiants du cours sélectionné</li>
          <li>Vous pouvez uploader des chapitres, exercices, supports de cours...</li>
        </ul>
      </div>
    </div>
  );
}