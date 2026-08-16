'use client';

import { useState, useEffect, useRef } from 'react';
import {
  FileText, Upload, Download, Trash2, Search, Loader2,
  Plus, X, File, Film, Image as ImageIcon, Archive,
  BookOpen, Eye, Calendar, HardDrive
} from 'lucide-react';
import api, { API_BASE_URL } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/hooks/useConfirm';

interface Material {

  id: number;
  title: string;
  description?: string;
  file_path: string;
  file_type: string;
  file_size: number;
  original_name?: string;
  course_id?: number;
  course_title?: string;
  course_code?: string;
  visibility: string;
  download_count: number;
  created_at: string;
}

interface Course {
  id: number;
  title: string;
  code: string;
  level: string;
}

export default function TeacherMaterialsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [search, setSearch] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    course_id: '',
    visibility: 'students',
    file: null as File | null
  });

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [materialsRes, coursesRes] = await Promise.all([
        api.get('/api/v1/teacher/materials').catch(() => ({ data: [] })),
        api.get('/api/v1/teacher/courses').catch(() => ({ data: [] }))
      ]);
      setMaterials(Array.isArray(materialsRes.data) ? materialsRes.data : []);
      setCourses(Array.isArray(coursesRes.data) ? coursesRes.data : []);
    } catch (error) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!formData.title || !formData.file) {
      toast.error('Titre et fichier requis');
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append('title', formData.title);
      form.append('description', formData.description);
      form.append('visibility', formData.visibility);
      if (formData.course_id) form.append('course_id', formData.course_id);
      form.append('file', formData.file);

      await api.post('/api/v1/teacher/materials', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('✅ Ressource uploadée avec succès');
      setShowUploadModal(false);
      setFormData({
        title: '',
        description: '',
        course_id: '',
        visibility: 'students',
        file: null
      });
      loadAll();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  const confirmModal = useConfirm();

  const handleDelete = async (id: number) => {
    const ok = await confirmModal({
      title: 'Supprimer la ressource ?',
      message: 'Voulez-vous vraiment supprimer cette ressource pédagogique ?',
      confirmText: 'Supprimer',
      variant: 'danger',
      icon: 'trash'
    });
    if (!ok) return;

    try {
      await api.delete(`/api/v1/teacher/materials/${id}`);
      toast.success('Ressource supprimée avec succès');
      loadAll();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };


  const handleDownload = async (material: Material) => {
    try {
      // Incrémenter le compteur
      await api.post(`/api/v1/teacher/materials/${material.id}/download`).catch(() => {});
      
      // Télécharger le fichier
      const link = document.createElement('a');
      link.href = `${API_BASE_URL}/uploads/materials/${material.file_path}`;
      link.download = material.original_name || material.title;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      toast.error('Erreur de téléchargement');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setFormData({
        ...formData,
        file,
        title: formData.title || file.name.replace(/\.[^/.]+$/, '')
      });
    }
  };

  const filteredMaterials = materials.filter(m => {
    const matchSearch = !search || 
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      (m.description || '').toLowerCase().includes(search.toLowerCase());
    const matchCourse = !filterCourse || m.course_id === parseInt(filterCourse);
    const matchType = !filterType || m.file_type === filterType;
    return matchSearch && matchCourse && matchType;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText size={20} className="text-red-600" />;
      case 'docx': return <FileText size={20} className="text-blue-600" />;
      case 'pptx': return <FileText size={20} className="text-orange-600" />;
      case 'xlsx': return <FileText size={20} className="text-green-600" />;
      case 'video': return <Film size={20} className="text-purple-600" />;
      case 'image': return <ImageIcon size={20} className="text-pink-600" />;
      case 'zip': return <Archive size={20} className="text-yellow-600" />;
      default: return <File size={20} className="text-slate-600" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'pdf': return 'bg-red-100 text-red-700 border-red-200';
      case 'docx': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'pptx': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'xlsx': return 'bg-green-100 text-green-700 border-green-200';
      case 'video': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'image': return 'bg-pink-100 text-pink-700 border-pink-200';
      case 'zip': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const stats = {
    total: materials.length,
    totalSize: materials.reduce((sum, m) => sum + (m.file_size || 0), 0),
    totalDownloads: materials.reduce((sum, m) => sum + (m.download_count || 0), 0),
    byType: materials.reduce((acc, m) => {
      acc[m.file_type] = (acc[m.file_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <FileText size={24} className="text-white" />
            </div>
            Ressources pédagogiques
          </h1>
          <p className="text-slate-500 mt-1">Gérez vos supports de cours</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#FF6B00] to-orange-500 hover:from-[#e55f00] hover:to-orange-600 text-white rounded-xl text-sm font-medium transition-all shadow-md"
        >
          <Plus size={16} />
          Ajouter une ressource
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <FileText size={20} className="text-purple-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-1">Total ressources</p>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <HardDrive size={20} className="text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-1">Espace utilisé</p>
          <p className="text-2xl font-bold text-slate-900">{formatFileSize(stats.totalSize)}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Download size={20} className="text-green-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-1">Téléchargements</p>
          <p className="text-2xl font-bold text-slate-900">{stats.totalDownloads}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <BookOpen size={20} className="text-orange-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-1">Cours couverts</p>
          <p className="text-2xl font-bold text-slate-900">
            {new Set(materials.map(m => m.course_id).filter(Boolean)).size}
          </p>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="🔍 Rechercher une ressource..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>
          <select
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          >
            <option value="">Tous les cours</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          >
            <option value="">Tous les types</option>
            <option value="pdf">📄 PDF</option>
            <option value="docx">📝 Document</option>
            <option value="pptx">📊 Présentation</option>
            <option value="video">🎥 Vidéo</option>
            <option value="image">🖼️ Image</option>
            <option value="zip">📦 Archive</option>
          </select>
        </div>
        {filteredMaterials.length !== materials.length && (
          <p className="text-xs text-slate-500 mt-3">
            {filteredMaterials.length} résultat{filteredMaterials.length > 1 ? 's' : ''} sur {materials.length}
          </p>
        )}
      </div>

      {/* Liste des ressources */}
      {filteredMaterials.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <FileText size={48} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Aucune ressource trouvée</p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="mt-4 text-sm text-[#FF6B00] hover:underline font-medium"
          >
            Ajouter votre première ressource →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMaterials.map((material) => (
            <div
              key={material.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg hover:border-[#FF6B00]/30 transition-all"
            >
              {/* En-tête */}
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border ${getTypeColor(material.file_type)}`}>
                  {getFileIcon(material.file_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 line-clamp-2 text-sm">
                    {material.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 font-mono">
                    {material.original_name || material.file_path}
                  </p>
                </div>
              </div>

              {/* Description */}
              {material.description && (
                <p className="text-xs text-slate-600 mb-3 line-clamp-2">
                  {material.description}
                </p>
              )}

              {/* Cours */}
              {material.course_title && (
                <div className="mb-3">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                    <BookOpen size={10} />
                    {material.course_title}
                  </span>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="p-2 bg-slate-50 rounded-lg text-center">
                  <p className="text-xs text-slate-500">Taille</p>
                  <p className="text-xs font-bold text-slate-900">{formatFileSize(material.file_size)}</p>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg text-center">
                  <p className="text-xs text-slate-500">Téléch.</p>
                  <p className="text-xs font-bold text-slate-900">{material.download_count}</p>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg text-center">
                  <p className="text-xs text-slate-500">Type</p>
                  <p className="text-xs font-bold text-slate-900 uppercase">{material.file_type}</p>
                </div>
              </div>

              {/* Date */}
              <div className="flex items-center gap-1 text-xs text-slate-500 mb-3">
                <Calendar size={12} />
                {new Date(material.created_at).toLocaleDateString('fr-FR')}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => handleDownload(material)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-xs font-medium transition-colors"
                >
                  <Download size={13} />
                  Télécharger
                </button>
                <button
                  onClick={() => handleDelete(material.id)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-medium transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Upload */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Upload size={20} className="text-[#FF6B00]" />
                Ajouter une ressource
              </h2>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Zone drag & drop */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-[#FF6B00] bg-orange-50'
                    : formData.file
                    ? 'border-green-300 bg-green-50'
                    : 'border-slate-300 hover:border-[#FF6B00] hover:bg-orange-50/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setFormData({
                        ...formData,
                        file,
                        title: formData.title || file.name.replace(/\.[^/.]+$/, '')
                      });
                    }
                  }}
                />
                {formData.file ? (
                  <div>
                    <FileText size={48} className="text-green-600 mx-auto mb-2" />
                    <p className="font-semibold text-slate-900">{formData.file.name}</p>
                    <p className="text-xs text-slate-500 mt-1">{formatFileSize(formData.file.size)}</p>
                    <p className="text-xs text-green-600 mt-2">✓ Fichier sélectionné</p>
                  </div>
                ) : (
                  <div>
                    <Upload size={48} className="text-slate-400 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">
                      Glissez-déposez votre fichier ici
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      ou cliquez pour sélectionner
                    </p>
                    <p className="text-xs text-slate-400 mt-3">
                      PDF, DOCX, PPTX, XLSX, vidéos, images (max 50 Mo)
                    </p>
                  </div>
                )}
              </div>

              {/* Titre */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Titre *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Cours d'introduction à l'algorithmique"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Décrivez brièvement le contenu..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] resize-none"
                />
              </div>

              {/* Cours */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Cours associé</label>
                <select
                  value={formData.course_id}
                  onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  <option value="">Aucun (ressource générale)</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>
                    {c.title} (<span className="text-red-600 underline font-semibold">{c.level}</span>)
                  </option>
                  ))}
                </select>
              </div>

              {/* Visibilité */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Visibilité</label>
                <select
                  value={formData.visibility}
                  onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  <option value="students">👥 Visible par les étudiants</option>
                  <option value="public">🌍 Public</option>
                  <option value="teachers_only">👨‍🏫 Enseignants uniquement</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowUploadModal(false)}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || !formData.file || !formData.title}
                className="flex-1 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                {uploading ? 'Upload...' : 'Uploader'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}