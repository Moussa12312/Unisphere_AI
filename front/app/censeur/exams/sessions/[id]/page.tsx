'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Calendar, Loader2, ArrowLeft, Edit3, Trash2,
  CheckCircle, Clock, Users, BookOpen, AlertCircle,
  FileText, TrendingUp, Save, X
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/hooks/useConfirm';

export default function CenseurExamSessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const { confirm } = useConfirm();
  
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    session_type: 'first_session',
    start_date: '',
    end_date: '',
    status: 'upcoming'
  });

  useEffect(() => {
    loadSession();
  }, [params.id]);

  const loadSession = async () => {
    if (!params.id) return;
    setLoading(true);
    try {
      const response = await api.get(`/api/v1/exam-sessions/${params.id}`);
      const sessionData = response.data;
      setSession(sessionData);
      setFormData({
        name: sessionData.name || '',
        session_type: sessionData.session_type || 'first_session',
        start_date: sessionData.start_date ? sessionData.start_date.split('T')[0] : '',
        end_date: sessionData.end_date ? sessionData.end_date.split('T')[0] : '',
        status: sessionData.status || 'upcoming'
      });
      await loadStats();
    } catch (error: any) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const [gradesRes] = await Promise.all([
        api.get(`/api/v1/grades/?session_id=${params.id}`).catch(() => ({ data: [] }))
      ]);
      const grades = Array.isArray(gradesRes.data) ? gradesRes.data : (gradesRes.data?.data || []);
      const scores = grades.filter((g: any) => g.score !== null).map((g: any) => g.score);
      const average = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;
      const passed = scores.filter((s: number) => s >= 10).length;
      const successRate = scores.length > 0 ? (passed / scores.length) * 100 : 0;

      setStats({
        total_grades: grades.length,
        validated_grades: grades.filter((g: any) => g.status === 'validated').length,
        pending_grades: grades.filter((g: any) => g.status === 'draft' || g.status === 'pending').length,
        average,
        success_rate: successRate,
        total_students: new Set(grades.map((g: any) => g.student_id)).size
      });
    } catch (error) {
      console.error('Erreur stats:', error);
    }
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      await api.put(`/api/v1/exam-sessions/${params.id}`, formData);
      toast.success('Session mise à jour');
      setShowEditModal(false);
      loadSession();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Supprimer cette session ?',
      message: `Voulez-vous vraiment supprimer la session "${session.name}" ? ${stats?.total_grades > 0 ? `⚠️ ${stats.total_grades} notes seront également supprimées !` : 'Cette action est irréversible.'}`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
      icon: 'trash'
    });

    if (ok) {
      try {
        await api.delete(`/api/v1/exam-sessions/${params.id}`);
        toast.success('Session supprimée');
        router.push('/censeur/exams/sessions');
      } catch (error: any) {
        toast.error(error.response?.data?.detail || 'Erreur');
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-100 text-green-700 border-green-200';
      case 'closed': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'upcoming': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return 'En cours';
      case 'closed': return 'Terminée';
      case 'upcoming': return 'À venir';
      default: return status || 'Non défini';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'first_session': return '1ère session';
      case 'second_session': return '2ème session';
      case 'makeup': return 'Rattrapage';
      default: return type;
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Non définie';
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-[#FF6B00]" size={32} />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <AlertCircle size={48} className="text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">Session non trouvée</p>
        <Link href="/censeur/exams/sessions" className="text-[#FF6B00] hover:underline mt-4 inline-block">
          ← Retour aux sessions
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center text-sm text-slate-500">
        <Link href="/censeur/exams/sessions" className="hover:text-[#FF6B00] flex items-center gap-1">
          <ArrowLeft size={14} /> Sessions
        </Link>
        <span className="mx-2">›</span>
        <span className="text-slate-900 font-medium">{session.name}</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-slate-900">{session.name}</h1>
            <span className={`text-xs px-3 py-1 rounded-full border font-medium ${getStatusColor(session.status)}`}>
              {getStatusLabel(session.status)}
            </span>
            <span className="text-xs px-3 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
              {getTypeLabel(session.session_type)}
            </span>
          </div>
          <p className="text-slate-500">📅 {formatDate(session.start_date)} → {formatDate(session.end_date)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowEditModal(true)} className="flex items-center gap-2 px-4 py-2 bg-[#0a1628] hover:bg-slate-800 text-white rounded-lg text-sm font-medium">
            <Edit3 size={14} /> Modifier
          </button>
          <button onClick={handleDelete} className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium">
            <Trash2 size={14} /> Supprimer
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total notes</p>
                <p className="text-2xl font-bold text-slate-900">{stats.total_grades}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-green-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Validées</p>
                <p className="text-2xl font-bold text-green-700">{stats.validated_grades}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-orange-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock size={20} className="text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">En attente</p>
                <p className="text-2xl font-bold text-orange-700">{stats.pending_grades}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users size={20} className="text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Étudiants</p>
                <p className="text-2xl font-bold text-slate-900">{stats.total_students}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-6 text-white">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={20} />
              <h3 className="font-semibold">Moyenne générale</h3>
            </div>
            <p className="text-4xl font-bold">{stats.average.toFixed(2)}/20</p>
            <p className="text-sm opacity-80 mt-2">Sur {stats.total_students} étudiants</p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle size={20} />
              <h3 className="font-semibold">Taux de réussite</h3>
            </div>
            <p className="text-4xl font-bold">{stats.success_rate.toFixed(1)}%</p>
            <p className="text-sm opacity-80 mt-2">Étudiants avec moyenne ≥ 10</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Calendar size={20} className="text-[#FF6B00]" />
          Informations de la session
        </h2>
        <div className="grid grid-cols-2 gap-6">
          <div><p className="text-xs text-slate-500 mb-1">Nom</p><p className="text-sm font-medium text-slate-900">{session.name}</p></div>
          <div><p className="text-xs text-slate-500 mb-1">Type</p><p className="text-sm font-medium text-slate-900">{getTypeLabel(session.session_type)}</p></div>
          <div><p className="text-xs text-slate-500 mb-1">Date de début</p><p className="text-sm font-medium text-slate-900">{formatDate(session.start_date)}</p></div>
          <div><p className="text-xs text-slate-500 mb-1">Date de fin</p><p className="text-sm font-medium text-slate-900">{formatDate(session.end_date)}</p></div>
          <div><p className="text-xs text-slate-500 mb-1">Statut</p><span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(session.status)}`}>{getStatusLabel(session.status)}</span></div>
          <div><p className="text-xs text-slate-500 mb-1">Créée le</p><p className="text-sm font-medium text-slate-900">{session.created_at ? new Date(session.created_at).toLocaleDateString('fr-FR') : 'N/A'}</p></div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-[#0a1628] to-[#1e293b] rounded-2xl p-6 text-white">
        <h2 className="text-lg font-bold mb-4">Actions rapides</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link href={`/censeur/grades/entry?session=${params.id}`} className="flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl text-sm font-medium border border-white/20">
            <Edit3 size={16} /> Saisir des notes
          </Link>
          <Link href={`/censeur/grades/pending?session=${params.id}`} className="flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl text-sm font-medium border border-white/20">
            <CheckCircle size={16} /> Valider les notes
          </Link>
          <Link href={`/censeur/grades/history?session=${params.id}`} className="flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl text-sm font-medium border border-white/20">
            <FileText size={16} /> Historique
          </Link>
          <Link href="/censeur/dashboard" className="flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl text-sm font-medium border border-white/20">
            <ArrowLeft size={16} /> Dashboard
          </Link>
        </div>
      </div>

      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">Modifier la session</h2>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nom *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Type *</label>
                <select value={formData.session_type} onChange={(e) => setFormData({ ...formData, session_type: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]">
                  <option value="first_session">1ère session</option>
                  <option value="second_session">2ème session</option>
                  <option value="makeup">Rattrapage</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Statut *</label>
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]">
                  <option value="upcoming">À venir</option>
                  <option value="open">En cours</option>
                  <option value="closed">Terminée</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Date début *</label>
                <input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Date fin *</label>
                <input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium">Annuler</button>
              <button onClick={handleUpdate} disabled={saving} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#FF6B00] to-orange-500 hover:from-[#e55f00] hover:to-orange-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}