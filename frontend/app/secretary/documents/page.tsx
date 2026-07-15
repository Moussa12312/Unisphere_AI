'use client';

import { useState, useEffect } from 'react';
import {
  FileText, Download, Loader2, Search, Calendar,
  GraduationCap, Award, Eye, Trash2
} from 'lucide-react';
import { documentService, Document } from '@/services/documentService';
import { useToast } from '@/components/ToastProvider';

export default function SecretaryDocumentsPage() {
  const toast = useToast();
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const data = await documentService.getMyDocuments();
      setDocuments(data);
    } catch (error) {
      console.error('Erreur chargement documents:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const documentTypes = [
    { value: 'enrollment_certificate', label: '🎓 Attestation de scolarité', color: 'bg-blue-100 text-blue-700' },
    { value: 'transcript', label: '📋 Relevé de notes', color: 'bg-purple-100 text-purple-700' },
    { value: 'grade_certificate', label: '📊 Certificat de notes', color: 'bg-green-100 text-green-700' },
    { value: 'course_material', label: '📚 Support de cours', color: 'bg-orange-100 text-orange-700' },
  ];

  const getTypeLabel = (type: string) => {
    const typeConfig = documentTypes.find(t => t.value === type);
    return typeConfig?.label || type;
  };

  const getTypeColor = (type: string) => {
    const typeConfig = documentTypes.find(t => t.value === type);
    return typeConfig?.color || 'bg-slate-100 text-slate-700';
  };

  const filteredDocuments = documents.filter(doc => {
    const matchSearch = doc.title.toLowerCase().includes(search.toLowerCase());
    const matchType = !filterType || doc.document_type === filterType;
    return matchSearch && matchType;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleView = async (doc: Document) => {
    try {
      const pdfBlob = await documentService.downloadDocument(doc.id);
      const url = window.URL.createObjectURL(pdfBlob);
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    } catch (error) {
      toast.error('Erreur lors de l\'ouverture du document');
    }
  };
  
  const handleDownload = async (doc: Document) => {
    try {
      const pdfBlob = await documentService.downloadDocument(doc.id);
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${doc.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('Document téléchargé');
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
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
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
            <FileText size={24} className="text-white" />
          </div>
          Mes documents
        </h1>
        <p className="text-slate-500 mt-1">Historique des documents générés</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total</p>
              <p className="text-2xl font-bold text-slate-900">{documents.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <GraduationCap size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Attestations</p>
              <p className="text-2xl font-bold text-slate-900">
                {documents.filter(d => d.document_type === 'enrollment_certificate').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Award size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Relevés</p>
              <p className="text-2xl font-bold text-slate-900">
                {documents.filter(d => d.document_type === 'transcript').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <FileText size={20} className="text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Supports cours</p>
              <p className="text-2xl font-bold text-slate-900">
                {documents.filter(d => d.document_type === 'course_material').length}
              </p>
            </div>
          </div>
        </div>
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
            {documentTypes.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Liste des documents */}
      <div className="space-y-3">
        {filteredDocuments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
            <FileText size={48} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Aucun document généré</p>
            <p className="text-xs text-slate-400 mt-2">
              Les documents générés apparaîtront ici
            </p>
          </div>
        ) : (
          filteredDocuments.map((doc) => (
            <div key={doc.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-xs px-2 py-1 rounded ${getTypeColor(doc.document_type)}`}>
                      {getTypeLabel(doc.document_type)}
                    </span>
                    {doc.download_count > 0 && (
                      <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 flex items-center gap-1">
                        <Download size={10} />
                        {doc.download_count} téléchargement{doc.download_count > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">{doc.title}</h3>
                  {doc.description && (
                    <p className="text-sm text-slate-600">{doc.description}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                    <Calendar size={10} />
                    Généré le {formatDate(doc.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => handleView(doc)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Voir"
                    >
                        <Eye size={16} />
                    </button>
                    <button
                        onClick={() => handleDownload(doc)}
                        className="p-2 text-[#FF6B00] hover:bg-orange-50 rounded-lg transition-colors"
                        title="Télécharger"
                    >
                        <Download size={16} />
                    </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}