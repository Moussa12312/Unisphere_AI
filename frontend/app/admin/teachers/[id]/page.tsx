'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Pencil, Trash2, Mail, Copy, BookOpen, Users, Clock, Award, Loader2, Key } from 'lucide-react';
import Link from 'next/link';
import { teacherService } from '@/services/teacherService';
import api from '@/lib/api';
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
      <div className="flex items-center text-sm text-slate-500 mb-4">
        <Link href="/admin/dashboard" className="hover:text-[#FF6B00]">Dashboard</Link>
        <span className="mx-2">›</span>
        <Link href="/admin/teachers" className="hover:text-[#FF6B00]">Enseignants</Link>
        <span className="mx-2">›</span>
        <span className="text-slate-900 font-medium">Détail</span>
      </div>

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
            <img src={teacher.photo ? `http://localhost:8000/uploads/${teacher.photo}?t=${Date.now()}` : `https://ui-avatars.com/api/?name=${teacher.first_name}+${teacher.last_name}&background=4F46E5&color=fff&size=256`} alt="" className="w-32 h-32 rounded-full mx-auto object-cover mb-4 border-4 border-slate-100" />
            <p className="font-semibold text-slate-900">{teacher.first_name} {teacher.last_name}</p>
            <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">{teacher.department}</span>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">QR Code</h3>
            {teacher.qr_code ? <img src={`http://localhost:8000/qr_codes/${teacher.qr_code}`} alt="QR" className="w-32 h-32 mx-auto" /> : <div className="w-32 h-32 bg-slate-200 rounded-lg mx-auto flex items-center justify-center text-xs text-slate-400">Pas de QR</div>}
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
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4"><div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3"><BookOpen size={20} className="text-blue-600" /></div><p className="text-xs text-slate-500 mb-1">Cours</p><p className="text-2xl font-bold text-slate-900">--</p></div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4"><div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mb-3"><Users size={20} className="text-orange-600" /></div><p className="text-xs text-slate-500 mb-1">Étudiants</p><p className="text-2xl font-bold text-slate-900">--</p></div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4"><div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3"><Clock size={20} className="text-green-600" /></div><p className="text-xs text-slate-500 mb-1">Heures</p><p className="text-2xl font-bold text-slate-900">--</p></div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4"><div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3"><Award size={20} className="text-purple-600" /></div><p className="text-xs text-slate-500 mb-1">Évaluations</p><p className="text-2xl font-bold text-slate-900">--</p></div>
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