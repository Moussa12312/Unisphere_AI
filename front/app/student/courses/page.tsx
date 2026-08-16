'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Download, User, Loader2, FileText, Calendar, HardDrive } from 'lucide-react';
import api, { API_BASE_URL } from '@/lib/api';
import { toast } from 'react-hot-toast';

interface Material {
  id: number;
  title: string;
  description: string;
  file_path: string;
  file_type: string;
  original_name: string;
  file_size: number;
  download_count: number;
  created_at: string;
}

interface Course {
  id: number;
  title: string;
  description: string;
  teacher: string;
  coefficient: number;
  materials: Material[];
}

export default function StudentCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const res = await api.get('/api/v1/students/me/courses');
      setCourses(res.data);
    } catch (error) {
      toast.error('Erreur de chargement des cours');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return 'Taille inconnue';
    const k = 1024;
    const sizes = ['Octets', 'Ko', 'Mo', 'Go'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('video')) return '';
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('zip')) return '';
    return '📎';
  };

  const handleDownload = (material: Material) => {
    try {
      let fileUrl = "";

      // 1. Si c'est déjà une URL absolue (commence par http), on l'utilise telle quelle
      if (material.file_path.startsWith('http')) {
        fileUrl = material.file_path;
      } 
      // 2. Sinon, on construit l'URL correcte
      else {
        // Si le chemin en BDD est "materials/fichier.docx", on veut "/uploads/materials/fichier.docx"
        // Si le chemin en BDD est juste "fichier.docx", on ajoute "materials/"
        const cleanPath = material.file_path.startsWith('materials/') 
          ? material.file_path 
          : `materials/${material.file_path}`;
          
        fileUrl = `${API_BASE_URL}/uploads/${cleanPath}`;
      }

      console.log("Téléchargement depuis :", fileUrl);
      
      // Ouvre le fichier dans un nouvel onglet
      window.open(fileUrl, '_blank');
      
      toast.success(`Téléchargement de "${material.title}" lancé`);
    } catch (error) {
      console.error("Erreur download:", error);
      toast.error('Erreur lors du téléchargement');
    }
  };

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-[#FF6B00]" size={32} /></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mes Cours & Supports</h1>
        <p className="text-slate-500 mt-1">Retrouvez tous les supports de cours et PDF de votre filière.</p>
      </div>

      {courses.length === 0 ? (
        <div className="bg-white p-10 rounded-xl border border-slate-200 text-center">
          <BookOpen size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">Aucun cours n'est encore disponible pour votre filière.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {courses.map((course) => (
            <div key={course.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {/* En-tête du cours */}
              <div className="bg-gradient-to-r from-[#FF6B00] to-orange-500 p-5 text-white">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen size={24} />
                      <span className="bg-white/20 px-2 py-1 rounded text-xs font-bold">Coef. {course.coefficient}</span>
                    </div>
                    <h3 className="text-xl font-bold">{course.title}</h3>
                    <div className="flex items-center gap-2 mt-2 text-sm text-white/90">
                      <User size={14} />
                      <span>{course.teacher}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Corps du cours */}
              <div className="p-5">
                {course.description && (
                  <p className="text-sm text-slate-600 mb-4 pb-4 border-b border-slate-100">
                    {course.description}
                  </p>
                )}
                
                {/* Liste des materials */}
                {course.materials.length === 0 ? (
                  <div className="text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    <FileText size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm text-slate-500">Aucun support déposé pour ce cours</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
                      <HardDrive size={16} />
                      Supports de cours ({course.materials.length})
                    </h4>
                    {course.materials.map((material) => (
                      <div 
                        key={material.id} 
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors border border-slate-100"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="text-2xl">{getFileIcon(material.file_type)}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 text-sm truncate">{material.title}</p>
                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                              <span className="flex items-center gap-1">
                                <HardDrive size={10} />
                                {formatFileSize(material.file_size)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar size={10} />
                                {material.created_at ? new Date(material.created_at).toLocaleDateString('fr-FR') : 'N/A'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Download size={10} />
                                {material.download_count} téléchargements
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDownload(material)}
                          className="ml-3 flex items-center gap-2 px-4 py-2 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-sm font-medium transition-colors flex-shrink-0"
                        >
                          <Download size={14} />
                          Télécharger
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}