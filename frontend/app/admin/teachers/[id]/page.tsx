'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Pencil, Trash2, Mail, Copy, BookOpen, Users, Clock, Award, Loader2, Key } from 'lucide-react';
import Link from 'next/link';
import { teacherService } from '@/services/teacherService';
import api, { API_BASE_URL } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/hooks/useConfirm';

interface Teacher {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  department: string;
  speciality: string;
  phone: string;
  photo: string;
  qr_code: string;
  university_name: string;
  courses_count?: number;
  students_count?: number;
  total_hours?: number;
  evaluations_count?: number;
  courses?: Array<{
    id: number;
    title: string;
    code: string;
    level: string;
    credits: number;
    hours: number;
    filiere_name: string;
    students_count: number;
  }>;
}

export default function TeacherDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const { confirm } = useConfirm();
  
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => { loadTeacher(); }, [params.id]);

  const loadTeacher = async () => {
    if (!params.id || isNaN(Number(params.id))) { setError('ID invalide'); setLoading(false); return; }
    try {
      setLoading(true); setError(null);
      const data = await teacherService.getById(Number(params.id));
      setTeacher(data);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Erreur de chargement');
    } finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!params.id || !teacher) return;
    
    const ok = await confirm({
      title: 'Supprimer cet enseignant ?',
      message: `Voulez-vous vraiment supprimer ${teacher.first_name} ${teacher.last_name} ? Cette action est irréversible.`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
      icon: 'trash'
    });
    
    if (ok) {
      try {
        await teacherService.delete(Number(params.id));
        toast.success('Enseignant supprimé avec succès');
        router.push('/admin/teachers');
      } catch (error: any) {
        toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
      }
    }
  };

  const handleResetPassword = async () => {
    if (!params.id) return;
    setIsResetting(true);
    try {
      const response = await api.post(`/api/v1/teachers/${params.id}/reset-password`);
      setNewPassword(response.data.temp_password);
      setShowPasswordModal(true);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la réinitialisation');
    } finally {
      setIsResetting(false);
    }
  };

  const copyPassword = () => {
    if (newPassword) {
      navigator.clipboard.writeText(newPassword);
      toast.success('Mot de passe copié !');
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B00]"></div></div>;
  if (error || !teacher) return <div className="text-center py-20 text-slate-500">{error || 'Non trouvé'} <br/><Link href="/admin/teachers" className="text-[#FF6B00] underline mt-4 inline-block">Retour à la liste</Link></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{teacher.first_name} {teacher.last_name}</h1>
            <span className="bg-green-100 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full">Actif</span>
          </div>
          <p className="text-slate-500 mt-1">{teacher.department} • {teacher.speciality}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleResetPassword}
            disabled={isResetting}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 shadow-sm"
          >
            {isResetting ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
            Réinitialiser mot de passe
          </button>
          <Link href={`/admin/teachers/${params.id}/edit`} className="bg-[#0a1628] hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
            <Pencil size={14} /> Modifier
          </Link>
          <button onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
            <Trash2 size={14} /> Supprimer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center">
            <img src={teacher.photo ? `${API_BASE_URL}/uploads/${teacher.photo}?t=${Date.now()}` : `https://ui-avatars.com/api/?name=${teacher.first_name}+${teacher.last_name}&background=4F46E5&color=fff&size=256`} alt="" className="w-32 h-32 rounded-full mx-auto object-cover mb-4 border-4 border-slate-100" />
            <p className="font-semibold text-slate-900">{teacher.first_name} {teacher.last_name}</p>
            <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">{teacher.department}</span>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">QR Code Enseignant</h3>
            <div className="flex justify-center mb-3">
              <img 
                src={teacher.qr_code ? `/qr_codes/${teacher.qr_code.replace(/^.*[\\\/]/, '')}` : `/api/v1/teachers/${teacher.id}/qrcode`} 
                alt="QR Code" 
                className="w-32 h-32 mx-auto rounded-lg border border-slate-200 p-1 bg-white"
                onError={(e: any) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = `/api/v1/teachers/${teacher.id}/qrcode`;
                }}
              />
            </div>
            <a
              href={`/api/v1/teachers/${teacher.id}/qrcode`}
              download={`QR_TEACHER_${teacher.first_name}_${teacher.last_name}.png`}
              className="inline-flex items-center gap-1.5 text-xs text-[#FF6B00] hover:text-[#e55f00] font-medium"
            >
              Télécharger le QR
            </a>
          </div>
        </div>
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-base font-semibold text-slate-900 mb-5">Informations générales</h3>
            <div className="grid grid-cols-2 gap-5">
              <div><p className="text-xs text-slate-500 mb-1">Prénom</p><p className="text-sm font-medium text-slate-900">{teacher.first_name}</p></div>
              <div><p className="text-xs text-slate-500 mb-1">Nom</p><p className="text-sm font-medium text-slate-900">{teacher.last_name}</p></div>
              <div><p className="text-xs text-slate-500 mb-1">Email</p><p className="text-sm font-medium text-slate-900">{teacher.email}</p></div>
              <div><p className="text-xs text-slate-500 mb-1">Téléphone</p><p className="text-sm font-medium text-slate-900">{teacher.phone || 'Non fourni'}</p></div>
              <div><p className="text-xs text-slate-500 mb-1">Spécialité</p><p className="text-sm font-medium text-slate-900">{teacher.speciality}</p></div>
              <div><p className="text-xs text-slate-500 mb-1">Université</p><p className="text-sm font-medium text-slate-900">{teacher.university_name || 'UniSphere AI'}</p></div>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                <BookOpen size={20} className="text-blue-600" />
              </div>
              <p className="text-xs text-slate-500 mb-1">Cours assignés</p>
              <p className="text-2xl font-bold text-slate-900">{teacher.courses_count ?? (teacher.courses?.length ?? 0)}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mb-3">
                <Users size={20} className="text-orange-600" />
              </div>
              <p className="text-xs text-slate-500 mb-1">Étudiants</p>
              <p className="text-2xl font-bold text-slate-900">{teacher.students_count ?? 0}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                <Clock size={20} className="text-green-600" />
              </div>
              <p className="text-xs text-slate-500 mb-1">Volume horaire</p>
              <p className="text-2xl font-bold text-slate-900">{teacher.total_hours ?? (teacher.courses?.length ?? 0) * 20}h</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
                <Award size={20} className="text-purple-600" />
              </div>
              <p className="text-xs text-slate-500 mb-1">Évaluations / Notes</p>
              <p className="text-2xl font-bold text-slate-900">{teacher.evaluations_count ?? 0}</p>
            </div>
          </div>

          {/* LISTE DES COURS ASSIGNÉS */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <BookOpen size={18} className="text-[#FF6B00]" />
                Cours sous la responsabilité de l'enseignant
              </h3>
              <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full">
                {(teacher.courses || []).length} cours
              </span>
            </div>
            {(!teacher.courses || teacher.courses.length === 0) ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                Aucun cours n'est actuellement assigné à cet enseignant.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-4">Code</th>
                      <th className="py-3 px-4">Intitulé du cours</th>
                      <th className="py-3 px-4">Filière</th>
                      <th className="py-3 px-4">Niveau</th>
                      <th className="py-3 px-4 text-center">Crédits</th>
                      <th className="py-3 px-4 text-center">Volume</th>
                      <th className="py-3 px-4 text-center">Étudiants</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {teacher.courses.map((c: any) => (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-xs text-blue-600">{c.code}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{c.title}</td>
                        <td className="py-3 px-4 text-slate-600">{c.filiere_name}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 font-bold text-xs rounded border border-amber-200">
                            {c.level}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-700">{c.credits}</td>
                        <td className="py-3 px-4 text-center text-slate-600">{c.hours}h</td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold text-xs rounded-full">
                            {c.students_count}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODALE DU MOT DE PASSE */}
      {showPasswordModal && newPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Key className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Nouveau mot de passe généré</h3>
                <p className="text-sm text-slate-500 mt-1">Communiquez ce mot de passe à l'enseignant.</p>
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
              <p className="text-xs text-slate-500 mb-2">Mot de passe temporaire :</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-lg font-mono font-bold text-slate-900 bg-white px-3 py-2 rounded border border-slate-200">
                  {newPassword}
                </code>
                <button onClick={copyPassword} className="p-2 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg" title="Copier">
                  <Copy size={16} />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => { setShowPasswordModal(false); setNewPassword(null); }} className="px-4 py-2 text-sm font-medium text-white bg-[#FF6B00] hover:bg-[#e55f00] rounded-lg">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}