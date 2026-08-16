'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Pencil, Trash2, MoreHorizontal, Mail, FileText, AlertTriangle, Loader2,
  User, GraduationCap, TrendingUp, CheckCircle, Award,
  Phone, MapPin, Calendar, Clock, XCircle, Check, Key, Copy
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { API_BASE_URL } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/hooks/useConfirm';

export default function AdminStudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const { confirm } = useConfirm();
  
  const [student, setStudent] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    loadStudent();
    loadStats();
  }, [params.id]);

  const loadStudent = async () => {
    if (!params.id || isNaN(Number(params.id))) {
      setError('ID étudiant invalide');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/api/v1/students/${params.id}`);
      setStudent(response.data);
    } catch (err: any) {
      console.error('Erreur chargement:', err);
      if (err.response?.status === 404) {
        setError('Étudiant non trouvé');
      } else {
        setError(err.response?.data?.detail || 'Erreur lors du chargement');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!params.id || isNaN(Number(params.id))) {
      setLoadingStats(false);
      return;
    }
    setLoadingStats(true);
    try {
      const response = await api.get(`/api/v1/students/${params.id}/stats`);
      setStats(response.data);
    } catch (err) {
      console.error('Erreur stats:', err);
      setStats({
        average_grade: null,
        attendance_rate: null,
        payment_status: 'Non renseigné',
        total_payments: 0,
        attendance_details: { total: 0, present: 0, absent: 0, late: 0, excused: 0 }
      });
    } finally {
      setLoadingStats(false);
    }
  };

  const handleDelete = async () => {
    if (!params.id || !student) return;
    
    const ok = await confirm({
      title: 'Supprimer cet étudiant ?',
      message: `Voulez-vous vraiment supprimer ${student.first_name} ${student.last_name} (${student.matricule}) ? Cette action est irréversible. Toutes les données, notes et présences associées seront définitivement supprimées.`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
      icon: 'trash'
    });
    
    if (ok) {
      try {
        await api.delete(`/api/v1/students/${params.id}`);
        toast.success('Étudiant supprimé avec succès');
        router.push('/admin/students');
      } catch (err: any) {
        toast.error(err.response?.data?.detail || 'Erreur lors de la suppression');
      }
    }
  };

  const handleResetPassword = async () => {
    if (!params.id) return;
    setIsResetting(true);
    try {
      const response = await api.post(`/api/v1/students/${params.id}/reset-password`);
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

  const getPhotoUrl = () => {
    if (!student?.photo) return null;
    if (student.photo.startsWith('http')) return student.photo;
    return `${API_BASE_URL}/uploads/${student.photo}`;
  };

  const getQrCodeUrl = () => {
    if (!student?.qr_code) return null;
    if (student.qr_code.startsWith('http')) return student.qr_code;
    return `${API_BASE_URL}/qr_codes/${student.qr_code}`;
  };

  const formatDate = (date?: string) => {
    if (!date) return 'Non renseigné';
    return new Date(date).toLocaleDateString('fr-FR');
  };

  const formatFCFA = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  const getAverageColor = (avg: number | null) => {
    if (avg === null) return 'text-slate-400';
    if (avg >= 16) return 'text-green-600';
    if (avg >= 14) return 'text-blue-600';
    if (avg >= 12) return 'text-indigo-600';
    if (avg >= 10) return 'text-orange-600';
    return 'text-red-600';
  };

  const getAttendanceColor = (rate: number | null) => {
    if (rate === null) return 'text-slate-400';
    if (rate >= 90) return 'text-green-600';
    if (rate >= 75) return 'text-blue-600';
    if (rate >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getPaymentColor = (status: string) => {
    if (status.includes('Payé')) return 'text-green-600 bg-green-50 border-green-200';
    if (status.includes('Partiel')) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (status.includes('Impayé') || status.includes('Non') || status.includes('retard'))
      return 'text-red-600 bg-red-50 border-red-200';
    return 'text-slate-600 bg-slate-50 border-slate-200';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B00]"></div>
        <p className="text-slate-500">Chargement en cours...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="text-6xl">⚠️</div>
        <h2 className="text-xl font-bold text-slate-900">Une erreur est survenue</h2>
        <p className="text-slate-500">{error}</p>
        <div className="flex gap-3 mt-4">
          <button onClick={loadStudent} className="bg-[#FF6B00] text-white px-4 py-2 rounded-lg hover:bg-[#e55f00]">Réessayer</button>
          <Link href="/admin/students" className="border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50">Retour à la liste</Link>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Étudiant non trouvé</p>
      </div>
    );
  }

  const photoUrl = getPhotoUrl();
  const qrCodeUrl = getQrCodeUrl();
  const avatarFallback = `https://ui-avatars.com/api/?name=${student.first_name}+${student.last_name}&background=FF6B00&color=fff&size=256`;

  return (
    <div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{student.first_name} {student.last_name}</h1>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              student.status === 'active' ? 'bg-green-100 text-green-700' :
              student.status === 'pending' ? 'bg-orange-100 text-orange-700' :
              'bg-slate-100 text-slate-700'
            }`}>
              {student.status === 'active' ? 'Actif' : student.status === 'pending' ? 'En attente' : 'Inactif'}
            </span>
          </div>
          <p className="text-slate-500 mt-1 font-mono text-sm">{student.matricule} • {student.filiere} ({student.level})</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleResetPassword}
            disabled={isResetting}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 shadow-sm transition-colors"
          >
            {isResetting ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
            Réinitialiser mot de passe
          </button>
          <Link href={`/admin/students/${params.id}/edit`} className="bg-[#0a1628] hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
            <Pencil size={14} /> Modifier
          </Link>
          <button onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
            <Trash2 size={14} /> Supprimer
          </button>
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2 rounded-lg transition-colors">
              <MoreHorizontal size={16} />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20">
                  <button onClick={() => { navigator.clipboard.writeText(student.email); toast.success('Email copié'); setShowMenu(false); }} className="w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 text-left flex items-center gap-2">
                    <Mail size={14} /> Copier l'email
                  </button>
                  <button onClick={() => { navigator.clipboard.writeText(student.matricule); toast.success('Matricule copié'); setShowMenu(false); }} className="w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 text-left flex items-center gap-2">
                    <FileText size={14} /> Copier le matricule
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Colonne gauche */}
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <img
              src={photoUrl || avatarFallback}
              alt={`${student.first_name} ${student.last_name}`}
              className="w-32 h-32 rounded-full mx-auto object-cover mb-4 border-4 border-slate-100"
              onError={(e) => { e.currentTarget.src = avatarFallback; }}
            />
            <div className="text-center">
              <p className="font-semibold text-slate-900">{student.first_name} {student.last_name}</p>
              <p className="text-sm text-slate-500 mt-1">{student.level}</p>
              <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">{student.filiere}</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">QR Code & Matricule</h3>
            <div className="bg-slate-50 p-4 rounded-lg flex justify-center">
              {qrCodeUrl ? (
                <img src={qrCodeUrl} alt="QR Code" className="w-32 h-32" />
              ) : (
                <div className="w-32 h-32 bg-slate-200 rounded-lg flex items-center justify-center">
                  <p className="text-xs text-slate-400 text-center">QR code<br/>non disponible</p>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 text-center mt-3 font-mono">{student.matricule}</p>
          </div>
        </div>

        {/* Colonne droite */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-base font-semibold text-slate-900 mb-5 flex items-center gap-2">
              <User size={18} className="text-[#FF6B00]" /> Informations personnelles
            </h3>
            <div className="grid grid-cols-2 gap-5">
              <div><p className="text-xs text-slate-500 mb-1">Prénom</p><p className="text-sm font-medium text-slate-900">{student.first_name}</p></div>
              <div><p className="text-xs text-slate-500 mb-1">Nom</p><p className="text-sm font-medium text-slate-900">{student.last_name}</p></div>
              <div><p className="text-xs text-slate-500 mb-1">Date de naissance</p><p className="text-sm font-medium text-slate-900">{formatDate(student.date_of_birth)}</p></div>
              <div><p className="text-xs text-slate-500 mb-1">Lieu de naissance</p><p className="text-sm font-medium text-slate-900">{student.place_of_birth || 'Non renseigné'}</p></div>
              <div><p className="text-xs text-slate-500 mb-1">Genre</p><p className="text-sm font-medium text-slate-900">{student.gender === 'M' ? 'Masculin' : student.gender === 'F' ? 'Féminin' : 'Non renseigné'}</p></div>
              <div><p className="text-xs text-slate-500 mb-1">Nationalité</p><p className="text-sm font-medium text-slate-900">{student.nationality || 'Non renseigné'}</p></div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-base font-semibold text-slate-900 mb-5 flex items-center gap-2">
              <Mail size={18} className="text-[#FF6B00]" /> Contact
            </h3>
            <div className="grid grid-cols-2 gap-5">
              <div><p className="text-xs text-slate-500 mb-1">Email</p><p className="text-sm font-medium text-slate-900">{student.email}</p></div>
              <div><p className="text-xs text-slate-500 mb-1">Téléphone</p><p className="text-sm font-medium text-slate-900">{student.phone || 'Non renseigné'}</p></div>
              <div className="col-span-2"><p className="text-xs text-slate-500 mb-1">Adresse</p><p className="text-sm font-medium text-slate-900">{student.address || 'Non renseigné'}</p></div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-base font-semibold text-slate-900 mb-5 flex items-center gap-2">
              <GraduationCap size={18} className="text-[#FF6B00]" /> Informations académiques
            </h3>
            <div className="grid grid-cols-2 gap-5">
              <div><p className="text-xs text-slate-500 mb-1">Matricule</p><p className="text-sm font-medium text-slate-900 font-mono">{student.matricule}</p></div>
              <div><p className="text-xs text-slate-500 mb-1">Niveau</p><p className="text-sm font-medium text-slate-900">{student.level}</p></div>
              <div><p className="text-xs text-slate-500 mb-1">Domaine</p><p className="text-sm font-medium text-slate-900">{student.domaine || student.domain || 'Non renseigné'}</p></div>
              <div><p className="text-xs text-slate-500 mb-1">Filière</p><p className="text-sm font-medium text-slate-900">{student.filiere}</p></div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Award size={20} className="text-blue-600" />
                </div>
                {stats?.total_grades > 0 && (
                  <span className="text-xs text-slate-400">{stats.total_grades} notes</span>
                )}
              </div>
              <p className="text-xs text-slate-500 mb-1">Moyenne générale</p>
              {loadingStats ? (
                <div className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-blue-600" />
                  <span className="text-sm text-slate-400">...</span>
                </div>
              ) : (
                <>
                  <p className={`text-2xl font-bold ${getAverageColor(stats?.average_grade)}`}>
                    {stats?.average_grade != null ? stats.average_grade.toFixed(2) : '--'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">/20</p>
                </>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle size={20} className="text-green-600" />
                </div>
                {stats?.attendance_details && (
                  <span className="text-xs text-slate-400">{stats.attendance_details.total} cours</span>
                )}
              </div>
              <p className="text-xs text-slate-500 mb-1">Taux de présence</p>
              {loadingStats ? (
                <div className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-green-600" />
                  <span className="text-sm text-slate-400">...</span>
                </div>
              ) : (
                <>
                  <p className={`text-2xl font-bold ${getAttendanceColor(stats?.attendance_rate)}`}>
                    {stats?.attendance_rate != null ? `${stats.attendance_rate.toFixed(0)}%` : '--'}
                  </p>
                  <div className="mt-2 space-y-0.5">
                    {stats?.attendance_details && stats.attendance_details.total > 0 && (
                      <>
                        <div className="flex items-center gap-1 text-xs">
                          <Check size={10} className="text-green-600" />
                          <span className="text-slate-600">{stats.attendance_details.present} présents</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <Clock size={10} className="text-orange-600" />
                          <span className="text-slate-600">{stats.attendance_details.late} retards</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <XCircle size={10} className="text-red-600" />
                          <span className="text-slate-600">{stats.attendance_details.absent} absents</span>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <TrendingUp size={20} className="text-orange-600" />
                </div>
              </div>
              <p className="text-xs text-slate-500 mb-1">Paiements</p>
              {loadingStats ? (
                <div className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-orange-600" />
                  <span className="text-sm text-slate-400">...</span>
                </div>
              ) : (
                <>
                  <p className={`text-lg font-bold px-2 py-1 rounded inline-block ${getPaymentColor(stats?.payment_status || '')}`}>
                    {stats?.payment_status || '--'}
                  </p>
                  <p className="text-xs text-slate-400 mt-2">
                    {stats?.total_payments ? formatFCFA(stats.total_payments) : 'Aucun paiement'}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {showPasswordModal && newPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Key className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Nouveau mot de passe généré</h3>
                <p className="text-sm text-slate-500 mt-1">Communiquez ce mot de passe à l'étudiant.</p>
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