'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Save, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { courseService } from '@/services/courseService';
import { teacherService } from '@/services/teacherService';
import { filiereService } from '@/services/filiereService';
import { getApiErrorMessage } from '@/lib/errorHandler';
import { toast } from 'react-hot-toast';

export default function EditCoursePage() {
  const router = useRouter();
  const params = useParams();
  const courseId = Number(params.id);
  
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [teachers, setTeachers] = useState<any[]>([]);
  const [filieres, setFilieres] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    domain: '',
    filiere_id: '',
    level: '',
    teacher_id: '',
    credits: 3,
    hours: 20
  });

  const [originalCourse, setOriginalCourse] = useState<any>(null);

  const hoursOptions = [
    { value: 10, label: '10 heures' },
    { value: 15, label: '15 heures' },
    { value: 20, label: '20 heures' },
    { value: 25, label: '25 heures' },
    { value: 30, label: '30 heures' },
    { value: 35, label: '35 heures' },
    { value: 40, label: '40 heures' },
    { value: 45, label: '45 heures' },
    { value: 50, label: '50 heures' },
    { value: 60, label: '60 heures' },
  ];

  // ✅ Charger les données initiales
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoadingData(true);
        
        // Charger en parallèle : cours, filières, enseignants
        const [courseData, filieresData, teachersData] = await Promise.all([
          courseService.getById(courseId),
          filiereService.getAll(),
          teacherService.getAll()
        ]);
        
        setFilieres(filieresData);
        setTeachers(teachersData);
        
        // Trouver la filière correspondante
        const filiere = filieresData.find((f: any) => f.id === courseData.filiere_id);
        
        setOriginalCourse(courseData);
        setFormData({
          title: courseData.title,
          domain: filiere?.domain || '',
          filiere_id: courseData.filiere_id?.toString() || '',
          level: courseData.level,
          teacher_id: courseData.teacher_id?.toString() || '',
          credits: courseData.credits || 3,
          hours: courseData.hours || 20
        });
        
      } catch (err: any) {
        console.error('Erreur chargement:', err);
        setError(err.response?.data?.detail || 'Erreur lors du chargement du cours');
      } finally {
        setLoadingData(false);
      }
    };
    
    if (courseId) {
      loadInitialData();
    }
  }, [courseId]);

  // ✅ Calculs dérivés
  const domains = [...new Set(filieres.map(f => f.domain))].sort();
  const filieresOfDomain = filieres.filter(f => f.domain === formData.domain);
  const selectedFiliere = filieres.find(f => f.id === parseInt(formData.filiere_id));
  const levelsOfFiliere = selectedFiliere?.levels?.split(',').map((l: string) => l.trim()) || [];
  const teachersOfFiliere = formData.filiere_id 
    ? teachers.filter(t => t.filiere_id === parseInt(formData.filiere_id))
    : teachers;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const payload = {
        title: formData.title,
        filiere_id: formData.filiere_id ? parseInt(formData.filiere_id) : null,
        level: formData.level,
        teacher_id: formData.teacher_id ? parseInt(formData.teacher_id) : null,
        credits: formData.credits,
        hours: formData.hours
      };
      
      await courseService.update(courseId, payload);
      toast.success('Cours modifié avec succès !');
      router.push(`/admin/courses/${courseId}`);
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, 'Erreur lors de la création'));
    } finally {
      setLoading(false);
    }
  };

  // ✅ États de chargement et d'erreur
  if (loadingData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-[#FF6B00]" />
        <p className="text-slate-500">Chargement du cours...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="text-6xl">⚠️</div>
        <h2 className="text-xl font-bold text-slate-900">Erreur</h2>
        <p className="text-slate-500">{error}</p>
        <Link href="/admin/courses" className="bg-[#FF6B00] text-white px-4 py-2 rounded-lg hover:bg-[#e55f00]">
          Retour à la liste
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-slate-500 mb-4">
        <Link href="/admin/dashboard" className="hover:text-[#FF6B00]">Dashboard</Link>
        <span className="mx-2">›</span>
        <Link href="/admin/courses" className="hover:text-[#FF6B00]">Cours</Link>
        <span className="mx-2">›</span>
        <Link href={`/admin/courses/${courseId}`} className="hover:text-[#FF6B00]">
          {originalCourse?.code || 'Cours'}
        </Link>
        <span className="mx-2">›</span>
        <span className="text-slate-900 font-medium">Modifier</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">Modifier le cours</h1>
          <p className="text-slate-500 mt-1">
            Code : <span className="font-mono font-semibold text-[#FF6B00]">{originalCourse?.code}</span>
          </p>
        </div>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          💡 <strong>Note :</strong> Le code du cours ne peut pas être modifié car il est utilisé comme identifiant officiel.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Titre */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">Intitulé du cours *</label>
            <input 
              type="text" 
              value={formData.title} 
              onChange={(e) => setFormData({...formData, title: e.target.value})} 
              required 
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" 
            />
          </div>
          
          {/* Domaine */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Domaine *</label>
            <select 
              value={formData.domain} 
              onChange={(e) => setFormData({...formData, domain: e.target.value, filiere_id: '', level: '', teacher_id: ''})} 
              required 
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-white"
            >
              <option value="">Sélectionner un domaine...</option>
              {domains.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          
          {/* Filière */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Filière *</label>
            <select 
              value={formData.filiere_id} 
              onChange={(e) => setFormData({...formData, filiere_id: e.target.value, level: '', teacher_id: ''})} 
              required 
              disabled={!formData.domain}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-white disabled:bg-slate-100"
            >
              <option value="">Sélectionner une filière...</option>
              {filieresOfDomain.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          
          {/* Niveau */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Niveau *</label>
            <select 
              value={formData.level} 
              onChange={(e) => setFormData({...formData, level: e.target.value})} 
              required 
              disabled={!formData.filiere_id}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-white disabled:bg-slate-100"
            >
              <option value="">Sélectionner un niveau...</option>
              {levelsOfFiliere.map((l: string) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          
          {/* Enseignant */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Enseignant assigné</label>
            <select 
              value={formData.teacher_id} 
              onChange={(e) => setFormData({...formData, teacher_id: e.target.value})} 
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-white"
            >
              <option value="">Non assigné</option>
              {teachersOfFiliere.map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.first_name} {t.last_name} ({t.speciality})
                </option>
              ))}
            </select>
          </div>
          
          {/* Crédits */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Crédits</label>
            <input 
              type="number" 
              value={formData.credits} 
              onChange={(e) => setFormData({...formData, credits: parseInt(e.target.value)})} 
              min="1"
              max="10"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" 
            />
          </div>
          
          {/* Volume horaire */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Volume horaire *</label>
            <select 
              value={formData.hours} 
              onChange={(e) => setFormData({...formData, hours: parseInt(e.target.value)})} 
              required
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-white"
            >
              {hoursOptions.map(h => (
                <option key={h.value} value={h.value}>{h.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-8 pt-6 border-t border-slate-100">
          <button 
            type="submit" 
            disabled={loading} 
            className="bg-[#FF6B00] hover:bg-[#e55f00] text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save size={16} />
                Enregistrer les modifications
              </>
            )}
          </button>
          <Link 
            href={`/admin/courses/${courseId}`} 
            className="px-6 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Annuler
          </Link>
        </div>
      </form>
    </div>
  );
}