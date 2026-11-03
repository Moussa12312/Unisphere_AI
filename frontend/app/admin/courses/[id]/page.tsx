'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Pencil, Trash2, BookOpen, Users, Clock, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { courseService } from '@/services/courseService';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/hooks/useConfirm';

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const { confirm } = useConfirm();
  
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadCourse(); }, [params.id]);

  const loadCourse = async () => {
    if (!params.id || isNaN(Number(params.id))) { setError('ID invalide'); setLoading(false); return; }
    try {
      setLoading(true); setError(null);
      const data = await courseService.getById(Number(params.id));
      setCourse(data);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Erreur de chargement');
    } finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!params.id || !course) return;
    
    const ok = await confirm({
      title: 'Supprimer ce cours ?',
      message: `Voulez-vous vraiment supprimer le cours "${course.title}" (${course.code}) ? Cette action est irréversible. Toutes les données associées à ce cours seront supprimées.`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
      icon: 'trash'
    });
    
    if (ok) {
      try {
        await courseService.delete(Number(params.id));
        toast.success('Cours supprimé avec succès');
        router.push('/admin/courses');
      } catch (error: any) {
        toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
      }
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B00]"></div></div>;
  if (error || !course) return <div className="text-center py-20 text-slate-500">{error || 'Non trouvé'} <br/><Link href="/admin/courses" className="text-[#FF6B00] underline mt-4 inline-block">Retour à la liste</Link></div>;

  return (
    <div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{course.title}</h1>
          <p className="text-slate-500 text-sm mt-0.5 font-mono">{course.code} • {course.department} ({course.level})</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/admin/courses/${params.id}/edit`} className="bg-[#0a1628] hover:bg-slate-800 text-white px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors">
            <Pencil size={14} /> Modifier
          </Link>
          <Link href={`/admin/courses/${params?.id || course?.id}/history`} className="flex items-center gap-1.5 px-3.5 py-2 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-xs sm:text-sm font-medium transition-colors shadow-sm">
            <Clock size={15} /> Historique
          </Link>
          <button onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors">
            <Trash2 size={14} /> Supprimer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6">
            <h3 className="text-base font-semibold text-slate-900 mb-5">Détails du cours</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div><p className="text-xs text-slate-500 mb-1">Intitulé</p><p className="text-sm font-medium text-slate-900">{course.title}</p></div>
              <div><p className="text-xs text-slate-500 mb-1">Code</p><p className="text-sm font-medium text-slate-900 font-mono">{course.code}</p></div>
              <div><p className="text-xs text-slate-500 mb-1">Département</p><p className="text-sm font-medium text-slate-900">{course.department}</p></div>
              <div><p className="text-xs text-slate-500 mb-1">Niveau</p><p className="text-sm font-medium text-slate-900">{course.level}</p></div>
              <div><p className="text-xs text-slate-500 mb-1">Enseignant</p><p className="text-sm font-medium text-slate-900">{course.teacher_name || 'Non assigné'}</p></div>
              <div className="sm:col-span-2 pt-2 border-t border-slate-100">
                <p className="text-xs text-slate-500 mb-1">Unité d'Enseignement (UE LMD)</p>
                {course.teaching_unit_code ? (
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="px-2.5 py-1 bg-purple-100 text-purple-800 rounded-lg text-xs font-mono font-bold">
                      {course.teaching_unit_code}
                    </span>
                    <span className="text-sm font-semibold text-slate-900">
                      {course.teaching_unit_name || ''}
                    </span>
                    {course.semester && (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-bold">
                        {course.semester}
                      </span>
                    )}
                    <Link href="/admin/teaching-units" className="text-xs text-[#FF6B00] hover:underline font-medium sm:ml-auto">
                      Voir la maquette LMD →
                    </Link>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic">Aucune UE rattachée</span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-center">
              <Clock className="w-8 h-8 text-orange-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500 mb-1">Volume horaire</p>
              <p className="text-2xl font-bold text-slate-900">{course.hours}h</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-center">
              <BookOpen className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500 mb-1">Crédits</p>
              <p className="text-2xl font-bold text-slate-900">{course.credits}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}