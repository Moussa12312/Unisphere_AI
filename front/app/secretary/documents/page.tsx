'use client';

import { useState, useEffect } from 'react';
import {
  FileText, Download, Loader2, Search, Eye, FolderOpen,
  BookOpen, Award, Camera, User, Filter
} from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import DocumentScanner from '@/components/DocumentScanner';


interface Document {
  id: number;
  document_type: string;
  title: string;
  description: string | null;
  file_path: string | null;
  student_id: number | null;
  student_name?: string; // On ajoutera ça si le backend le renvoie, sinon on affiche l'ID
  generated_by: number | null;
  created_at: string;
  download_count: number;
}

type TabType = 'students' | 'courses' | 'certificates';

export default function SecretaryDocumentsPage() {
  const toast = useToast();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('students');
  const [isScannerOpen,setIsScannerOpen] = useState(false)
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/v1/documents/my-documents');
      setDocuments(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Erreur chargement documents:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  // ✅ LOGIQUE DE CLASSIFICATION PAR CATÉGORIE
  const certificateTypes = [
    'enrollment_certificate', 'transcript', 'achievement_certificate',
    'attendance_certificate', 'report_card_landscape'
  ];

  const studentFileTypes = [
    'birth_certificate', 'previous_diploma', 'id_document', 'photo_id',
    'cni_scan', 'acte_naissance_scan', 'student_file'
  ];

  const getFilteredDocuments = () => {
    return documents.filter(doc => {
      const matchSearch = doc.title.toLowerCase().includes(search.toLowerCase());

      if (activeTab === 'certificates') {
        return matchSearch && certificateTypes.includes(doc.document_type);
      }
      if (activeTab === 'courses') {
        return matchSearch && doc.document_type === 'course_material';
      }
      if (activeTab === 'students') {
        // Tout ce qui est lié à un étudiant et qui n'est pas un certificat généré
        return matchSearch && doc.student_id !== null && !certificateTypes.includes(doc.document_type);
      }
      return matchSearch;
    });
  };

  const getTabIcon = (type: TabType) => {
    if (type === 'students') return <FolderOpen size={18} />;
    if (type === 'courses') return <BookOpen size={18} />;
    return <Award size={18} />;
  };

  const getTabLabel = (type: TabType) => {
    if (type === 'students') return 'Dossiers Étudiants';
    if (type === 'courses') return 'Supports de Cours';
    return 'Certificats & Attestations';
  };

  const getDocIcon = (type: string) => {
    if (certificateTypes.includes(type)) return <Award size={20} className="text-purple-600" />;
    if (type === 'course_material') return <BookOpen size={20} className="text-blue-600" />;
    return <FileText size={20} className="text-[#FF6B00]" />;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const handleView = async (doc: Document) => {
    try {
      const response = await api.get(`/api/v1/documents/${doc.id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    } catch (error) {
      toast.error('Erreur lors de l\'ouverture');
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const response = await api.get(`/api/v1/documents/${doc.id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
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

  const handleScanClick = () => {
    setIsScannerOpen(true);
  };

  const handleScanComplete = (scanData: any) => {
    toast.success(`Document Scanné : ${scanData.extracted_info.nom} ${scanData.extracted_info.prenom}`);

    console.log('Données extraites:', scanData);
  }

  const filteredDocs = getFilteredDocuments();

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
          <div className="w-12 h-12 bg-gradient-to-br from-[#FF6B00] to-orange-500 rounded-xl flex items-center justify-center">
            <FileText size={24} className="text-white" />
          </div>
          Gestion des Documents
        </h1>
        <p className="text-slate-500 mt-1">Gérez les dossiers étudiants, supports de cours et certificats</p>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <FolderOpen size={20} className="text-[#FF6B00]" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Dossiers Étudiants</p>
            <p className="text-2xl font-bold text-slate-900">
              {documents.filter(d => d.student_id && !certificateTypes.includes(d.document_type)).length}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <BookOpen size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Supports de Cours</p>
            <p className="text-2xl font-bold text-slate-900">
              {documents.filter(d => d.document_type === 'course_material').length}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Award size={20} className="text-purple-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Certificats Générés</p>
            <p className="text-2xl font-bold text-slate-900">
              {documents.filter(d => certificateTypes.includes(d.document_type)).length}
            </p>
          </div>
        </div>
      </div>

      {/* Onglets de navigation */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
        <div className="flex gap-2 overflow-x-auto">
          {(['students', 'courses', 'certificates'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab
                ? 'bg-[#FF6B00] text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              {getTabIcon(tab)}
              {getTabLabel(tab)}
              <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === tab ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                {tab === 'students' ? documents.filter(d => d.student_id && !certificateTypes.includes(d.document_type)).length :
                  tab === 'courses' ? documents.filter(d => d.document_type === 'course_material').length :
                    documents.filter(d => certificateTypes.includes(d.document_type)).length}
              </span>
            </button>
          ))}
        </div>

        {/* Barre de recherche */}
        <div className="relative mt-2 md:mt-0 md:w-40">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un document..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          />
        </div>
      </div>

      {/* Contenu de l'onglet actif */}
      <div className="space-y-4">
        {/* Bouton Scanner (Uniquement pour les dossiers étudiants) */}
        {activeTab === 'students' && (
          <button
            onClick={handleScanClick}
            className="w-full flex items-center justify-center gap-3 p-4 border-2 border-dashed border-[#FF6B00] bg-orange-50/50 hover:bg-orange-50 rounded-xl transition-colors group"
          >
            <div className="w-10 h-10 bg-[#FF6B00] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <Camera size={20} className="text-white" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-[#FF6B00]">Scanner un document pour un étudiant</p>
              <p className="text-xs text-slate-500">Utilisez la caméra pour numériser une CNI ou un acte de naissance</p>
            </div>
          </button>
        )}

        {/* Liste des documents */}
        {filteredDocs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
            {activeTab === 'students' ? <FolderOpen size={48} className="text-slate-300 mx-auto mb-3" /> :
              activeTab === 'courses' ? <BookOpen size={48} className="text-slate-300 mx-auto mb-3" /> :
                <Award size={48} className="text-slate-300 mx-auto mb-3" />}
            <p className="text-slate-500 font-medium">Aucun document dans cette catégorie</p>
            <p className="text-xs text-slate-400 mt-2">
              {activeTab === 'students' ? "Scannez ou uploadez un dossier étudiant pour commencer." :
                activeTab === 'courses' ? "Les supports de cours uploadés apparaîtront ici." :
                  "Les certificats générés apparaîtront ici."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocs.map((doc) => (
              <div key={doc.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg transition-shadow flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center">
                    {getDocIcon(doc.document_type)}
                  </div>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                    {doc.document_type.replace(/_/g, ' ')}
                  </span>
                </div>

                <h3 className="font-semibold text-slate-900 mb-1 line-clamp-1">{doc.title}</h3>
                {doc.description && (
                  <p className="text-sm text-slate-500 mb-3 line-clamp-2">{doc.description}</p>
                )}

                <div className="flex items-center gap-2 text-xs text-slate-400 mb-4 mt-auto">
                  <FileText size={12} />
                  <span>{formatDate(doc.created_at)}</span>
                  {doc.download_count > 0 && (
                    <>
                      <span>•</span>
                      <span>{doc.download_count} téléchargement(s)</span>
                    </>
                  )}
                </div>

                <div className="flex gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => handleView(doc)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Eye size={14} /> Voir
                  </button>
                  <button
                    onClick={() => handleDownload(doc)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#FF6B00]/10 hover:bg-[#FF6B00]/20 text-[#FF6B00] rounded-lg text-sm font-medium transition-colors"
                  >
                    <Download size={14} /> Télécharger
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Modal Scanner */}
      <DocumentScanner 
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanComplete={handleScanComplete}
        mode="existing"
      />
    </div>
  );
}