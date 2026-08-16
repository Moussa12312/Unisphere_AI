'use client';

import { useState, useEffect } from 'react';
import {
  FileText, Upload, Download, Trash2, Search, Loader2,
  Plus, X, File, Calendar, Eye, Edit3, BookOpen, Users
} from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/hooks/useConfirm';


interface Document {
  id: number;
  document_type: string;
  title: string;
  description?: string;
  file_path?: string;
  student_id?: number;
  student_name?: string;
  is_downloaded: boolean;
  download_count: number;
  created_at: string;
}

interface Course {
  id: number;
  title: string;
  code: string;
  level: string;
}

export default function TeacherDocumentsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    document_type: 'syllabus',
    description: '',
    student_id: '',
    file: null as File | null
  });

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [docsRes, coursesRes] = await Promise.all([
        api.get('/api/v1/teacher/documents').catch(() => ({ data: [] })),
        api.get('/api/v1/teacher/courses').catch(() => ({ data: [] }))
      ]);
      setDocuments(Array.isArray(docsRes.data) ? docsRes.data : []);
      setCourses(Array.isArray(coursesRes.data) ? coursesRes.data : []);
    } catch (error) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.title) {
      toast.error('Titre requis');
      return;
    }

    setCreating(true);
    try {
      const form = new FormData();
      form.append('title', formData.title);
      form.append('document_type', formData.document_type);
      form.append('description', formData.description);
      if (formData.student_id) form.append('student_id', formData.student_id);
      if (formData.file) form.append('file', formData.file);

      await api.post('/api/v1/teacher/documents', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('✅ Document créé avec succès');
      setShowCreateModal(false);
      setFormData({
        title: '',
        document_type: 'syllabus',
        description: '',
        student_id: '',
        file: null
      });
      loadAll();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  };

  const confirmModal = useConfirm();

  const handleDelete = async (id: number) => {

    const ok = await confirmModal({
      title: 'Supprimer ce document ?',
      message: 'Êtes-vous sûr de vouloir supprimer définitivement ce document ?',
      confirmText: 'Supprimer',
      variant: 'danger',
      icon: 'trash'
    });
    if (!ok) return;

    try {
      await api.delete(`/api/v1/teacher/documents/${id}`);
      toast.success('Document supprimé avec succès');
      loadAll();
    } catch (error) {
      toast.error('Erreur de suppression');
    }
  };


  const handleDownload = (doc: Document) => {
    if (!doc.file_path) {
      toast.error('Aucun fichier associé');
      return;
    }
    const link = document.createElement('a');
    link.href = `${API_BASE_URL}/uploads/documents/${doc.file_path}`;
    link.download = doc.title;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredDocs = documents.filter(doc => {
    const matchSearch = !search || 
      doc.title.toLowerCase().includes(search.toLowerCase()) ||
      (doc.description || '').toLowerCase().includes(search.toLowerCase());
    const matchType = !filterType || doc.document_type === filterType;
    return matchSearch && matchType;
  });

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'syllabus': '📚 Syllabus',
      'exam_report': '📝 PV d\'examen',
      'attendance_report': '✅ Rapport de présence',
      'grade_report': '📊 Relevé de notes',
      'other': '📄 Autre'
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'syllabus': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'exam_report': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'attendance_report': return 'bg-green-100 text-green-700 border-green-200';
      case 'grade_report': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const stats = {
    total: documents.length,
    byType: documents.reduce((acc, doc) => {
      acc[doc.document_type] = (acc[doc.document_type] || 0) + 1;
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
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <FileText size={24} className="text-white" />
            </div>
            Documents officiels
          </h1>
          <p className="text-slate-500 mt-1">Gérez vos syllabus, PV et rapports</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#FF6B00] to-orange-500 hover:from-[#e55f00] hover:to-orange-600 text-white rounded-xl text-sm font-medium transition-all shadow-md"
        >
          <Plus size={16} />
          Créer un document
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <FileText size={20} className="text-indigo-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-1">Total</p>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>
        {Object.entries(stats.byType).slice(0, 4).map(([type, count]) => (
          <div key={type} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getTypeColor(type).split(' ')[0]}`}>
                <FileText size={20} className={getTypeColor(type).split(' ')[1]} />
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-1">{getTypeLabel(type)}</p>
            <p className="text-2xl font-bold text-slate-900">{count}</p>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="🔍 Rechercher un document..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          >
            <option value="">Tous les types</option>
            <option value="syllabus">📚 Syllabus</option>
            <option value="exam_report">📝 PV d'examen</option>
            <option value="attendance_report">✅ Rapport de présence</option>
            <option value="grade_report">📊 Relevé de notes</option>
            <option value="other">📄 Autre</option>
          </select>
        </div>
        {filteredDocs.length !== documents.length && (
          <p className="text-xs text-slate-500 mt-3">
            {filteredDocs.length} résultat{filteredDocs.length > 1 ? 's' : ''} sur {documents.length}
          </p>
        )}
      </div>

      {/* Liste des documents */}
      {filteredDocs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <FileText size={48} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Aucun document trouvé</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 text-sm text-[#FF6B00] hover:underline font-medium"
          >
            Créer votre premier document →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg hover:border-[#FF6B00]/30 transition-all"
            >
              {/* En-tête */}
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border ${getTypeColor(doc.document_type)}`}>
                  <FileText size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 line-clamp-2 text-sm">
                    {doc.title}
                  </h3>
                  <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full border ${getTypeColor(doc.document_type)}`}>
                    {getTypeLabel(doc.document_type)}
                  </span>
                </div>
              </div>

              {/* Description */}
              {doc.description && (
                <p className="text-xs text-slate-600 mb-3 line-clamp-2">
                  {doc.description}
                </p>
              )}

              {/* Étudiant associé */}
              {doc.student_name && (
                <div className="mb-3">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                    <Users size={10} />
                    {doc.student_name}
                  </span>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="p-2 bg-slate-50 rounded-lg text-center">
                  <p className="text-xs text-slate-500">Téléch.</p>
                  <p className="text-sm font-bold text-slate-900">{doc.download_count}</p>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg text-center">
                  <p className="text-xs text-slate-500">Date</p>
                  <p className="text-xs font-bold text-slate-900">
                    {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-3 border-t border-slate-100">
                {doc.file_path && (
                  <button
                    onClick={() => handleDownload(doc)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    <Download size={13} />
                    Télécharger
                  </button>
                )}
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-medium transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal création */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <FileText size={20} className="text-[#FF6B00]" />
                Créer un document
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Type */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Type de document *</label>
                <select
                  value={formData.document_type}
                  onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  <option value="syllabus">📚 Syllabus</option>
                  <option value="exam_report">📝 PV d'examen</option>
                  <option value="attendance_report">✅ Rapport de présence</option>
                  <option value="grade_report">📊 Relevé de notes</option>
                  <option value="other">📄 Autre</option>
                </select>
              </div>

              {/* Titre */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Titre *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Syllabus Algorithmique L1"
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

              {/* Étudiant associé */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Étudiant associé (optionnel)</label>
                <input
                  type="text"
                  value={formData.student_id}
                  onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                  placeholder="ID de l'étudiant (laisser vide si non applicable)"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>

              {/* Fichier */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Fichier (optionnel)</label>
                <input
                  type="file"
                  onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
                <p className="text-xs text-slate-500 mt-1">PDF, DOCX, XLSX (max 50 Mo)</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !formData.title}
                className="flex-1 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {creating ? 'Création...' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}