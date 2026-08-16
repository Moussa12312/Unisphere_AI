'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import Link from 'next/link';
import { courseService } from '@/services/courseService';
import { teacherService } from '@/services/teacherService';
import { filiereService } from '@/services/filiereService';
import { getApiErrorMessage } from '@/lib/errorHandler';
import { toast } from 'react-hot-toast';

export default function CreateCoursePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [filieres, setFilieres] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    domain: '',         // Domaine sélectionné
    filiere_id: '',     // Filière sélectionnée
    level: '',          // Niveau (filtré par filière)
    teacher_id: '',
    credits: 3,
    hours: 20
  });

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

  // ✅ Charger les filières et enseignants
  useEffect(() => {
    const loadData = async () => {
      try {
        const [filieresData, teachersData] = await Promise.all([
          filiereService.getAll(),
          teacherService.getAll()
        ]);
        setFilieres(filieresData);
        setTeachers(teachersData);
      } catch (e) {
        console.error("Erreur chargement", e);
      }
    };
    loadData();
  }, []);

  // ✅ Extraire les domaines uniques
  const domains = [...new Set(filieres.map(f => f.domain))].sort();
  
  // ✅ Filtrer les filières par domaine
  const filieresOfDomain = filieres.filter(f => f.domain === formData.domain);
  
  // ✅ Extraire les niveaux de la filière sélectionnée
  const selectedFiliere = filieres.find(f => f.id === parseInt(formData.filiere_id));
  const levelsOfFiliere = selectedFiliere?.levels?.split(',').map((l: string) => l.trim()) || [];

  // ✅ Filtrer les enseignants par filière
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
      
      await courseService.create(payload);
      toast.success('Cours créé avec succès !');
      router.push('/admin/courses');
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, 'Erreur lors de la création'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>

      <div className="flex items-center gap-4 mb-6">
        <div>
          <p className="text-slate-500 mt-1">Ajouter une matière au catalogue.</p>
        </div>
      </div>

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
          
          {/* ✅ Domaine (dynamique) */}
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
            {filieres.length === 0 && (
              <p className="text-xs text-orange-600 mt-1">
                ⚠️ Aucune filière configurée. <Link href="/admin/filieres/create" className="underline">Ajouter une filière</Link>
              </p>
            )}
          </div>
          
          {/* ✅ Filière (filtrée par domaine) */}
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
          
          {/* ✅ Niveau (filtré par filière) */}
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
          
          {/* ✅ Enseignant (filtré par filière) */}
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
            {formData.filiere_id && teachersOfFiliere.length === 0 && (
              <p className="text-xs text-orange-600 mt-1">
                ⚠️ Aucun enseignant dans cette filière. <Link href="/admin/teachers/create" className="underline">Ajouter</Link>
              </p>
            )}
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

        <div className="flex items-center gap-3 mt-8 pt-6 border-t border-slate-100">
          <button 
            type="submit" 
            disabled={loading} 
            className="bg-[#FF6B00] hover:bg-[#e55f00] text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Save size={16} /> {loading ? 'Enregistrement...' : 'Créer le cours'}
          </button>
          <Link 
            href="/admin/courses" 
            className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Annuler
          </Link>
        </div>
      </form>
    </div>
  );
}