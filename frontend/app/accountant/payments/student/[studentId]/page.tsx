'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, DollarSign, CheckCircle, AlertCircle,
  Lock, Unlock, Printer, Calendar, TrendingUp,
  Users, CreditCard, Download, FileText, Clock
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

export default function StudentPaymentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  
  const studentId = parseInt(params.studentId as string);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (studentId) {
      loadData();
    }
  }, [studentId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [summaryRes, studentRes] = await Promise.all([
        api.get(`/api/v1/payments/student/${studentId}/summary`).catch(() => ({ data: null })),
        api.get(`/api/v1/students/${studentId}`).catch(() => ({ data: null }))
      ]);
      
      setData({
        student: studentRes.data,
        summary: summaryRes.data
      });
    } catch (error) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const formatFCFA = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    if (percentage >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getTrancheStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-green-100 text-green-700 rounded-full border border-green-200">
            <CheckCircle size={10} />
            PAYÉE
          </span>
        );
      case 'available':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full border border-blue-200">
            <Clock size={10} />
            À PAYER
          </span>
        );
      case 'locked':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-slate-100 text-slate-600 rounded-full border border-slate-200">
            <Lock size={10} />
            VERROUILLÉE
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B00] border-t-transparent"></div>
      </div>
    );
  }

  if (!data || !data.student) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Étudiant non trouvé</p>
      </div>
    );
  }

  const { student, summary } = data;
  const paidTranches = summary?.tranches?.filter((t: any) => t.status === 'paid') || [];
  const availableTranches = summary?.tranches?.filter((t: any) => t.status === 'available') || [];
  const lockedTranches = summary?.tranches?.filter((t: any) => t.status === 'locked') || [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-slate-500">
        <Link href="/accountant/payments" className="hover:text-[#FF6B00] flex items-center gap-1">
          <ArrowLeft size={14} />
          Paiements
        </Link>
        <span className="mx-2">›</span>
        <span className="text-slate-900 font-medium">{student.first_name} {student.last_name}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-[#FF6B00] to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
            {student.first_name.charAt(0)}{student.last_name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {student.first_name} {student.last_name}
            </h1>
            <p className="text-slate-500 mt-1">
              🎓 {student.matricule} • {student.filiere} {student.level}
            </p>
          </div>
        </div>
        <Link
          href={`/accountant/payments/create?student=${student.id}`}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#FF6B00] to-orange-500 hover:from-[#e55f00] hover:to-orange-600 text-white rounded-xl text-sm font-medium transition-all shadow-md"
        >
          <DollarSign size={16} />
          Enregistrer un paiement
        </Link>
      </div>

      {/* Tableau de bord financier */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <TrendingUp size={20} className="text-[#FF6B00]" />
          Tableau de bord financier
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-5 text-white shadow-lg">
            <DollarSign size={20} className="opacity-80 mb-2" />
            <p className="text-xs opacity-80">Montant dû</p>
            <p className="text-xl font-bold">{formatFCFA(summary?.total_amount || 0)}</p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-5 text-white shadow-lg">
            <CheckCircle size={20} className="opacity-80 mb-2" />
            <p className="text-xs opacity-80">Montant payé</p>
            <p className="text-xl font-bold">{formatFCFA(summary?.total_paid || 0)}</p>
            <p className="text-xs opacity-80 mt-1">
              ████████░░░ {summary?.paid_percentage || 0}%
            </p>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl p-5 text-white shadow-lg">
            <AlertCircle size={20} className="opacity-80 mb-2" />
            <p className="text-xs opacity-80">Reste à payer</p>
            <p className="text-xl font-bold">{formatFCFA(summary?.total_remaining || 0)}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl p-5 text-white shadow-lg">
            <Users size={20} className="opacity-80 mb-2" />
            <p className="text-xs opacity-80">Statut</p>
            <p className="text-lg font-bold">
              {summary?.status === 'paid' ? 'SOLDÉ ✅' :
               summary?.status === 'partial' ? 'RELIQUAT' :
               '1ère TRANCHE'}
            </p>
          </div>
        </div>

        {/* Barre de progression */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Progression globale</span>
            <span className="font-semibold">{summary?.paid_percentage || 0}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${getProgressBarColor(summary?.paid_percentage || 0)}`}
              style={{ width: `${Math.min(100, summary?.paid_percentage || 0)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Historique des tranches */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Calendar size={20} className="text-[#FF6B00]" />
            Historique des tranches
          </h2>
        </div>

        <div className="p-6 space-y-4">
          {/* Tranches payées */}
          {paidTranches.map((tranche: any, idx: number) => (
            <div key={idx} className="bg-green-50 border-2 border-green-200 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center text-white">
                    <CheckCircle size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-slate-900">{tranche.name}</h3>
                      {getTrancheStatusBadge(tranche.status)}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-slate-500">Montant</p>
                        <p className="font-semibold text-slate-900">{formatFCFA(tranche.amount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Statut</p>
                        <p className="font-semibold text-green-700">PAYÉE ✅</p>
                      </div>
                      {tranche.payment_date && (
                        <div>
                          <p className="text-xs text-slate-500">Date paiement</p>
                          <p className="font-semibold text-slate-900">{new Date(tranche.payment_date).toLocaleDateString('fr-FR')}</p>
                        </div>
                      )}
                      {tranche.payment_method && (
                        <div>
                          <p className="text-xs text-slate-500">Mode</p>
                          <p className="font-semibold text-slate-900">{tranche.payment_method}</p>
                        </div>
                      )}
                    </div>
                    {tranche.receipt_number && (
                      <p className="text-xs text-slate-500 mt-2">
                        📄 Reçu N° : <span className="font-mono font-semibold">{tranche.receipt_number}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Tranches disponibles */}
          {availableTranches.map((tranche: any, idx: number) => (
            <div key={idx} className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white">
                    <Clock size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-slate-900">{tranche.name}</h3>
                      {getTrancheStatusBadge(tranche.status)}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-slate-500">Montant</p>
                        <p className="font-semibold text-slate-900">{formatFCFA(tranche.amount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Statut</p>
                        <p className="font-semibold text-blue-700">EN ATTENTE 🔵</p>
                      </div>
                      {tranche.due_date && (
                        <div>
                          <p className="text-xs text-slate-500">Échéance</p>
                          <p className="font-semibold text-slate-900">{new Date(tranche.due_date).toLocaleDateString('fr-FR')}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <Link
                  href={`/accountant/payments/create?student=${student.id}&tranche=${tranche.id}`}
                  className="px-4 py-2 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-sm font-medium flex items-center gap-1 transition-colors"
                >
                  <DollarSign size={14} />
                  Payer cette tranche
                </Link>
              </div>
            </div>
          ))}

          {/* Tranches verrouillées */}
          {lockedTranches.map((tranche: any, idx: number) => (
            <div key={idx} className="bg-slate-50 border-2 border-slate-200 rounded-xl p-5 opacity-70">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-12 h-12 bg-slate-400 rounded-xl flex items-center justify-center text-white">
                    <Lock size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-slate-700">{tranche.name}</h3>
                      {getTrancheStatusBadge(tranche.status)}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-slate-500">Montant</p>
                        <p className="font-semibold text-slate-600">{formatFCFA(tranche.amount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Statut</p>
                        <p className="font-semibold text-slate-600">VERROUILLÉE 🔒</p>
                      </div>
                      {tranche.due_date && (
                        <div>
                          <p className="text-xs text-slate-500">Échéance</p>
                          <p className="font-semibold text-slate-600">{new Date(tranche.due_date).toLocaleDateString('fr-FR')}</p>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-2 italic">
                      💡 Disponible après paiement de la tranche précédente
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {paidTranches.length === 0 && availableTranches.length === 0 && lockedTranches.length === 0 && (
            <div className="text-center py-12">
              <Calendar size={48} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Aucune tranche configurée</p>
            </div>
          )}
        </div>
      </div>

      {/* Documents */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <FileText size={20} className="text-[#FF6B00]" />
          Documents
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button className="flex items-center gap-2 px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-sm font-medium transition-colors border border-blue-200">
            <Download size={16} />
            Télécharger reçu tranche 1
          </button>
          <button className="flex items-center gap-2 px-4 py-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-sm font-medium transition-colors border border-purple-200">
            <Download size={16} />
            Télécharger relevé financier
          </button>
          <button className="flex items-center gap-2 px-4 py-3 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl text-sm font-medium transition-colors border border-green-200">
            <Download size={16} />
            Télécharger attestation de paiement
          </button>
        </div>
      </div>
    </div>
  );
}