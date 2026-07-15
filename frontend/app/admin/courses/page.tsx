'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Pencil, Trash2, Eye, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { courseService } from '@/services/courseService';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/hooks/useConfirm';

export default function CoursesPage() {
  const router = useRouter();
  const toast = useToast();
  const { confirm } = useConfirm();
  
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const data = await courseService.getAll();
      setCourses(data);
    } catch (error) {
      toast.error('Erreur lors du chargement des cours');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Algorithme dynamique pour générer des abréviations
const getDepartmentAbbreviation = (department: string): string => {
  if (!department) return '';
  
  // Mots à ignorer (petits mots)
  const stopWords = ['de', 'du', 'des', 'et', 'la', 'le', 'les', 'un', 'une', 'en', 'à', 'au', 'aux'];
  
  // Séparer en mots, filtrer les stop words, prendre les premières lettres
  const words = department
    .split(/\s+/)
    .filter(word => word.length > 0)
    .filter(word => !stopWords.includes(word.toLowerCase()));
  
  // Si un seul mot, prendre les 3-4 premières lettres
  if (words.length === 1) {
    return words[0].substring(0, 4).toUpperCase();
  }
  
  // Sinon, prendre la première lettre de chaque mot (max 4 lettres)
  const abbreviation = words
    .slice(0, 4)
    .map(word => word.charAt(0).toUpperCase())
    .join('');
  
  return abbreviation;
};

  const handleDelete = async (id: number, title: string) => {
    const ok = await confirm({
      title: 'Supprimer ce cours ?',
      message: `Voulez-vous vraiment supprimer "${title}" ? Cette action est irréversible. Toutes les données associées à ce cours seront supprimées.`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
      icon: 'trash'
    });
    
    if (ok) {
      try {
        await courseService.delete(id);
        toast.success('Cours supprimé avec succès');
        loadCourses();
      } catch (error) {
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  const filtered = courses.filter((c: any) =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B00]"></div></div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cours & Matières</h1>
          <p className="text-slate-500 mt-1">{courses.length} cours enregistrés</p>
        </div>
        <Link href="/admin/courses/create" className="bg-[#FF6B00] hover:bg-[#e55f00] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
          <Plus size={16} /> Nouveau cours
        </Link>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Rechercher par titre ou code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="pl-12 py-3 text-left text-xs font-medium text-slate-500 uppercase">Code</th>
                <th className="pl-2 py-3 text-left text-xs font-medium text-slate-500 uppercase">Filière / Niveau</th>
                <th className="pl-3 py-3 text-left text-xs font-medium text-slate-500 uppercase">Enseignant</th>
                <th className="pl-1 py-3 text-left text-xs font-medium text-slate-500 uppercase">Crédits</th>
                <th className="pl-7 py-3 text-left text-xs font-medium text-slate-500 uppercase">Heures</th>
                <th className="pl-12 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filtered.map((course: any) => (
                <tr key={course.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4  whitespace-nowrap font-mono text-sm font-medium text-slate-900">
                    <div>
                      <p>
                        {course.code}
                      </p>
                      <p className=" text-xs text-orange-500 w-35">
                        {course.title}
                      </p>
                                          
                    </div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="py-3 px-4 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                      {getDepartmentAbbreviation(course.department)} - {course.level}
                    </span>
                  </td>
                  <td className="py-3 pl-1 text-sm text-slate-600">{course.teacher_name}</td>
                  <td className="px-6 py-4 text-sm text-center font-medium text-slate-900">{course.credits}</td>
                  <td className="pl-6 py-5 text-sm text-center text-slate-600 font-medium">{course.hours}h</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/courses/${course.id}`} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Eye size={16} /></Link>
                      <Link href={`/admin/courses/${course.id}/edit`} className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg"><Pencil size={16} /></Link>
                      <button onClick={() => handleDelete(course.id, course.title)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="text-center py-12 text-slate-500">Aucun cours trouvé</div>}
      </div>
    </div>
  );
}