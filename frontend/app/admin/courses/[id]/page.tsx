'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Pencil, Trash2, BookOpen, Clock, ArrowLeft, Layers, Calendar, GraduationCap } from 'lucide-react';
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

  useEffect(() => {
    loadCourse();
  }, [params.id]);

  const loadCourse = async () => {
    if (!params.id || isNaN(Number(params.id))) {
      setError('Identifiant de module invalide');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await courseService.getById(Number(params.id));
      setCourse(data);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Erreur lors du chargement du module');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!params.id || !course) return;

    const ok = await confirm({
      title: 'Supprimer ce module ?',
      message: `Voulez-vous vraiment supprimer le module "${course.title}" (${course.code}) ? Cette action est irréversible. Toutes les données associées seront supprimées.`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
      icon: 'trash'
    });

    if (ok) {
      try {
        await courseService.delete(Number(params.id));
        toast.success('Module supprimé avec succès');
        router.push('/admin/courses');
      } catch (error: any) {
        toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B00]" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="text-center py-20 text-slate-500">
        <p className="text-lg font-bold text-slate-800 mb-2">{error || 'Module introuvable'}</p>
        <Link href="/admin/courses" className="text-[#FF6B00] font-semibold underline inline-block">
          Retour à la liste des modules
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Barre de retour et actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/courses"
            className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-xs px-2.5 py-0.5 rounded-lg bg-orange-100 text-orange-700">
                {course.code}
              </span>
              {course.semester && (
                <span className="font-bold text-xs px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-800">
                  {course.semester}
                </span>
              )}
              <span className="text-xs px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-semibold">
                {course.level}
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 mt-1">{course.title}</h1>
            <p className="text-slate-500 text-xs sm:text-sm font-medium">
              Filière : {course.filiere_name || course.department}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/courses/${params.id}/edit`}
            className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Pencil size={14} /> Modifier le module
          </Link>
          <Link
            href={`/admin/courses/${params.id}/history`}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#FF6B00] hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
          >
            <Clock size={14} /> Historique
          </Link>
          <button
            onClick={handleDelete}
            className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 size={14} /> Supprimer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Colonne gauche : Caractéristiques détaillées */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-5">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <BookOpen size={16} className="text-[#FF6B00]" />
              Fiche Pédagogique du Module
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Intitulé Officiel</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{course.title}</p>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Code Permanent</p>
                <p className="text-sm font-mono font-black text-[#FF6B00] mt-0.5">{course.code}</p>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Filière d'Études</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{course.filiere_name || course.department}</p>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Semestre LMD & Niveau</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">
                  {course.semester || 'Non spécifié'} • {course.level}
                </p>
              </div>

              <div className="sm:col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Enseignant Responsable</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{course.teacher_name || 'Non assigné'}</p>
              </div>

              {/* Unité d'Enseignement rattachée */}
              <div className="sm:col-span-2 bg-purple-50/60 p-4 rounded-xl border border-purple-200">
                <p className="text-[11px] font-bold text-purple-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Layers size={14} className="text-purple-600" />
                  Unité d'Enseignement (UE) de Rattachement
                </p>
                {course.teaching_unit_code ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 mt-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-purple-200/70 text-purple-900 rounded-lg text-xs font-mono font-black">
                        {course.teaching_unit_code}
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        {course.teaching_unit_name || ''}
                      </span>
                    </div>
                    <Link
                      href="/admin/teaching-units"
                      className="text-xs text-[#FF6B00] hover:underline font-bold"
                    >
                      Voir la maquette d'enseignement →
                    </Link>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    Ce module n'est rattaché à aucune Unité d'Enseignement collective.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Colonne droite : Compteurs */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 text-center space-y-1">
            <Clock className="w-8 h-8 text-[#FF6B00] mx-auto mb-1" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Volume Horaire</p>
            <p className="text-3xl font-black text-slate-900">{course.hours}h</p>
            <p className="text-[11px] text-slate-500">Heures présentielles planifiées</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 text-center space-y-1">
            <BookOpen className="w-8 h-8 text-blue-600 mx-auto mb-1" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Crédits ECTS</p>
            <p className="text-3xl font-black text-slate-900">{course.credits}</p>
            <p className="text-[11px] text-slate-500">Poids académique LMD</p>
          </div>
        </div>
      </div>
    </div>
  );
}
