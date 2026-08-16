'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, Mail, Phone, Send, Calendar, CreditCard, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import financialService from '@/services/financialService';
import { useToast } from '@/components/ToastProvider';

export default function UnpaidPage() {
  const toast = useToast();
  const [unpaid, setUnpaid] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUnpaid();
  }, []);

  const loadUnpaid = async () => {
    try {
      setLoading(true);
      const data = await financialService.getUnpaid();
      setUnpaid(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Erreur de chargement');
      setUnpaid([]);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  const sendReminder = (student: any) => {
    toast.success(`Rappel envoyé à ${student.student_name}`);
  };

  const totalDue = unpaid.reduce((sum, s) => sum + (s.total_due || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header avec navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Étudiants avec impayés</h1>
          <p className="text-slate-500 mt-1">
            {unpaid.length} étudiant(s) avec des paiements en attente
          </p>
        </div>
        
        {/* ✅ NAVIGATION VERS ÉCHÉANCES */}
        <Link
          href="/accountant/payments/installments"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Calendar size={16} />
          Voir les échéances
        </Link>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-sm text-red-600">Total impayés</p>
              <p className="text-xl font-bold text-red-700">
                {formatAmount(totalDue)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <AlertCircle size={20} className="text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-yellow-600">Étudiants concernés</p>
              <p className="text-xl font-bold text-yellow-700">{unpaid.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <AlertCircle size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-blue-600">Moyenne par étudiant</p>
              <p className="text-xl font-bold text-blue-700">
                {unpaid.length > 0 
                  ? formatAmount(totalDue / unpaid.length)
                  : '0 FCFA'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Liste des impayés */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B00] border-t-transparent"></div>
          </div>
        ) : unpaid.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Aucune échéance en retard !</h3>
            <p className="text-slate-500">Tous les étudiants sont à jour dans leurs paiements</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Étudiant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Matricule</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Niveau</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Montant en retard</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Tranches en retard</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {unpaid.map((student) => (
                  <tr key={student.student_id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900 text-sm">{student.student_name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600 font-mono">{student.matricule}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                        {student.level}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-red-600 text-sm">
                        {formatAmount(student.overdue_amount || 0)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {student.overdue_tranches?.slice(0, 2).map((tranche: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 text-xs">
                            <AlertCircle size={12} className="text-red-500" />
                            <span className="text-slate-700">{tranche.tranche_name}</span>
                            <span className="text-red-600 font-medium">
                              ({formatAmount(tranche.amount)})
                            </span>
                            <span className="text-slate-400">
                              - {new Date(tranche.due_date).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                        ))}
                        {(student.overdue_tranches?.length || 0) > 2 && (
                          <p className="text-xs text-slate-500">
                            + {(student.overdue_tranches?.length || 0) - 2} autre(s) tranche(s)
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/accountant/payments/student/${student.student_id}`}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Voir la fiche"
                        >
                          <CreditCard size={16} />
                        </Link>
                        <button
                          onClick={() => sendReminder(student)}
                          className="p-1.5 text-slate-400 hover:text-[#FF6B00] hover:bg-orange-50 rounded-lg"
                          title="Envoyer un rappel"
                        >
                          <Send size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}