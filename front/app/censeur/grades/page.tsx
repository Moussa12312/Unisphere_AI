'use client';

import { useState, useEffect } from 'react';
import {
  CheckCircle, XCircle, Clock, AlertTriangle, Search,
  Loader2, Award, FileText, Settings
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

interface Grade {
  id: number;
  student_id: number;
  student_name: string;
  course_id: number;
  course_title: string;
  course_code: string;
  session_id: number;
  session_name: string;
  cc_score: number | null;      // ✅ AJOUTÉ
  exam_score: number | null;
  score: number;
  coefficient: number;
  comment: string | null;
  status: string;
  validated_by: number | null;
  validated_by_name: string | null;
  validated_at: string | null;
  rejected_by: number | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export default function CenseurGradesPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [filterStatus, setFilterStatus] = useState('draft');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterSession, setFilterSession] = useState('');
  const [search, setSearch] = useState('');
  
  // ✅ MODALS
  const [showValidateModal, setShowValidateModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadGrades();
  }, [filterStatus]);

  const loadGrades = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterStatus) params.status = filterStatus;
      
      const response = await api.get('/api/v1/grades/', { params });
      setGrades(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  // ✅ OUVRIR MODAL DE VALIDATION
  const openValidateModal = (grade: Grade) => {
    setSelectedGrade(grade);
    setShowValidateModal(true);
  };

  // ✅ OUVRIR MODAL DE REJET
  const openRejectModal = (grade: Grade) => {
    setSelectedGrade(grade);
    setRejectReason('');
    setShowRejectModal(true);
  };

  // ✅ VALIDER UNE NOTE
  const handleValidate = async () => {
    if (!selectedGrade) return;
    
    setProcessing(true);
    try {
      await api.put(`/api/v1/grades/${selectedGrade.id}/validate`);
      toast.success('✅ Note validée avec succès');
      setShowValidateModal(false);
      setSelectedGrade(null);
      loadGrades();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur de validation');
    } finally {
      setProcessing(false);
    }
  };

  // ✅ REJETER UNE NOTE
  const handleReject = async () => {
    if (!selectedGrade || !rejectReason.trim()) {
      toast.error('La raison du rejet est obligatoire');
      return;
    }
    
    setProcessing(true);
    try {
      await api.put(`/api/v1/grades/${selectedGrade.id}/reject`, null, {
        params: { reason: rejectReason }
      });
      toast.success('Note rejetée');
      setShowRejectModal(false);
      setSelectedGrade(null);
      setRejectReason('');
      loadGrades();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur de rejet');
    } finally {
      setProcessing(false);
    }
  };

  const filteredGrades = grades.filter(g => {
    const matchSearch = !search || 
      g.student_name.toLowerCase().includes(search.toLowerCase()) ||
      g.course_title.toLowerCase().includes(search.toLowerCase());
    const matchCourse = !filterCourse || g.course_id === parseInt(filterCourse);
    const matchSession = !filterSession || g.session_id === parseInt(filterSession);
    return matchSearch && matchCourse && matchSession;
  });

  const courses = [...new Map(grades.map(g => [g.course_id, { id: g.course_id, title: g.course_title }])).values()];
  const sessions = [...new Map(grades.map(g => [g.session_id, { id: g.session_id, name: g.session_name }])).values()];

  const stats = {
    total: grades.length,
    draft: grades.filter(g => g.status === 'draft').length,
    validated: grades.filter(g => g.status === 'validated').length,
    rejected: grades.filter(g => g.status === 'rejected').length,
    average: grades.filter(g => g.score).length > 0
      ? grades.filter(g => g.score).reduce((sum, g) => sum + g.score, 0) / grades.filter(g => g.score).length
      : 0
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
            <Clock size={12} />
            En attente
          </span>
        );
      case 'validated':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
            <CheckCircle size={12} />
            Validé
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
            <XCircle size={12} />
            Rejeté
          </span>
        );
      default:
        return null;
    }
  };

  const getGradeColor = (score: number) => {
    if (score >= 15) return 'text-green-600 bg-green-50';
    if (score >= 10) return 'text-blue-600 bg-blue-50';
    if (score >= 5) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-[#FF6B00]" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <CheckCircle size={24} className="text-white" />
            </div>
            Validation des notes
          </h1>
          <p className="text-slate-500 mt-1">Validez ou rejetez les notes soumises par les enseignants</p>
        </div>
        <Link
          href="/censeur/settings/anomalies"
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
        >
          <Settings size={16} />
          Configurer
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <FileText size={20} className="text-purple-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-1">Total</p>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>

        <div className="bg-white rounded-xl border border-orange-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock size={20} className="text-orange-600" />
            </div>
          </div>
          <p className="text-xs text-orange-600 mb-1">En attente</p>
          <p className="text-2xl font-bold text-orange-600">{stats.draft}</p>
        </div>

        <div className="bg-white rounded-xl border border-green-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle size={20} className="text-green-600" />
            </div>
          </div>
          <p className="text-xs text-green-600 mb-1">Validées</p>
          <p className="text-2xl font-bold text-green-600">{stats.validated}</p>
        </div>

        <div className="bg-white rounded-xl border border-red-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle size={20} className="text-red-600" />
            </div>
          </div>
          <p className="text-xs text-red-600 mb-1">Rejetées</p>
          <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Award size={20} className="text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-1">Moyenne</p>
          <p className="text-2xl font-bold text-blue-600">{stats.average.toFixed(2)}</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="md:col-span-2 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="🔍 Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          >
            <option value="draft">🟠 En attente</option>
            <option value="validated">✅ Validées</option>
            <option value="rejected">❌ Rejetées</option>
            <option value="">Tous les statuts</option>
          </select>
          <select
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          >
            <option value="">Tous les cours</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
          <select
            value={filterSession}
            onChange={(e) => setFilterSession(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          >
            <option value="">Toutes les sessions</option>
            {sessions.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        {filteredGrades.length !== grades.length && (
          <p className="text-xs text-slate-500 mt-3">
            {filteredGrades.length} résultat{filteredGrades.length > 1 ? 's' : ''} sur {grades.length}
          </p>
        )}
      </div>

      {/* Liste des notes */}
      {filteredGrades.length === 0 ? (
      <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
        <FileText size={48} className="text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">Aucune note trouvée</p>
      </div>
      ) : (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Étudiant</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Cours</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase">CC</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Examen</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Finale</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Statut</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Actions</th>
            </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
            {filteredGrades.map((grade) => (
                <tr key={grade.id} className="hover:bg-slate-50">
                <td className="py-3 px-4">
                    <p className="font-semibold text-slate-900 text-sm">{grade.student_name}</p>
                </td>
                <td className="py-3 px-4">
                    <p className="text-sm text-slate-700">{grade.course_title}</p>
                    <p className="text-xs text-slate-500 font-mono">{grade.course_code}</p>
                </td>
                <td className="py-3 px-4 text-center">
                    <span className="text-sm text-slate-700 font-medium">
                    {grade.cc_score?.toFixed(2) || '-'}
                    </span>
                </td>
                <td className="py-3 px-4 text-center">
                    <span className="text-sm text-slate-700 font-medium">
                    {grade.exam_score?.toFixed(2) || '-'}
                    </span>
                </td>
                <td className="py-3 px-4 text-center">
                    <span className={`inline-block px-3 py-1 rounded-lg font-bold text-sm ${getGradeColor(grade.score)}`}>
                    {grade.score?.toFixed(2)}
                    </span>
                </td>
                <td className="py-3 px-4">
                    {getStatusBadge(grade.status)}
                </td>
                <td className="py-3 px-4">
                    {grade.status === 'draft' && (
                    <div className="flex items-center justify-center gap-2">
                        <button
                        onClick={() => openValidateModal(grade)}
                        disabled={processing}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-medium disabled:opacity-50"
                        >
                        <CheckCircle size={13} />
                        Valider
                        </button>
                        <button
                        onClick={() => openRejectModal(grade)}
                        disabled={processing}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-medium disabled:opacity-50"
                        >
                        <XCircle size={13} />
                        Rejeter
                        </button>
                    </div>
                    )}
                </td>
                </tr>
            ))}
            </tbody>
        </table>
        </div>
      </div>
      )}

      {/* ✅ MODAL DE VALIDATION */}
      {showValidateModal && selectedGrade && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle size={24} className="text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Valider cette note ?</h2>
                <p className="text-sm text-slate-500">Cette action est irréversible</p>
              </div>
            </div>

            <div className="mb-4 p-4 bg-slate-50 rounded-lg space-y-2">
              <p className="text-sm text-slate-700">
                <strong>Étudiant :</strong> {selectedGrade.student_name}
              </p>
              <p className="text-sm text-slate-700">
                <strong>Cours :</strong> {selectedGrade.course_title}
              </p>
              <p className="text-sm text-slate-700">
                <strong>Session :</strong> {selectedGrade.session_name}
              </p>
              <p className="text-sm text-slate-700">
                <strong>Note :</strong> <span className="font-bold text-[#FF6B00]">{selectedGrade.score?.toFixed(2)}/20</span>
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowValidateModal(false);
                  setSelectedGrade(null);
                }}
                disabled={processing}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleValidate}
                disabled={processing}
                className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processing ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle size={16} />
                )}
                {processing ? 'Validation...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ MODAL DE REJET */}
      {showRejectModal && selectedGrade && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle size={24} className="text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Rejeter cette note</h2>
                <p className="text-sm text-slate-500">L'enseignant sera notifié</p>
              </div>
            </div>

            <div className="mb-4 p-4 bg-slate-50 rounded-lg space-y-2">
              <p className="text-sm text-slate-700">
                <strong>Étudiant :</strong> {selectedGrade.student_name}
              </p>
              <p className="text-sm text-slate-700">
                <strong>Cours :</strong> {selectedGrade.course_title}
              </p>
              <p className="text-sm text-slate-700">
                <strong>Note :</strong> <span className="font-bold text-red-600">{selectedGrade.score?.toFixed(2)}/20</span>
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-700 mb-2">
                Raison du rejet <span className="text-red-600">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                placeholder="Expliquez pourquoi vous rejetez cette note..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedGrade(null);
                  setRejectReason('');
                }}
                disabled={processing}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleReject}
                disabled={processing || !rejectReason.trim()}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processing ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <XCircle size={16} />
                )}
                {processing ? 'Rejet...' : 'Confirmer le rejet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}