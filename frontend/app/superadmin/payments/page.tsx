'use client';

import { useState, useEffect } from 'react';
import { Receipt, CheckCircle2, Building2, FileText, Calendar } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

function formatFCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}

export default function SuperAdminPaymentsPage() {
  const toast = useToast();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/v1/superadmin/payments')
      .then(res => setPayments(res.data))
      .catch(() => toast.error('Erreur lors du chargement des encaissements'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B00] border-t-transparent"></div>
      </div>
    );
  }

  const total = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Encaissements Clients</h1>
        <p className="text-slate-500 mt-1">Historique des règlements perçus des universités partenaires</p>
      </div>

      <div className="bg-green-50 border border-green-100 rounded-2xl p-6 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-green-700">Total Général Encaissé</p>
          <p className="text-3xl font-extrabold text-green-800 mt-1">{formatFCFA(total)}</p>
        </div>
        <div className="w-12 h-12 bg-green-100 text-green-700 rounded-full flex items-center justify-center">
          <CheckCircle2 size={28} />
        </div>
      </div>

      {payments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 shadow-sm">
          <Receipt className="mx-auto text-slate-300 mb-3" size={48} />
          <p className="text-slate-500">Aucun encaissement enregistré pour le moment</p>
        </div>
      ) : (
        <>
          {/* Vue Mobile Cards (< 768px) */}
          <div className="block md:hidden space-y-3">
            {payments.map(p => (
              <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                    <FileText size={16} className="text-[#FF6B00]" />
                    <span>{p.invoice_number}</span>
                  </div>
                  <span className="font-bold text-green-700 bg-green-50 border border-green-200 px-2.5 py-0.5 rounded-full text-xs">
                    {formatFCFA(p.amount)}
                  </span>
                </div>

                <div className="text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                    <Building2 size={14} className="text-slate-400" />
                    <span>{p.university_name}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500 text-[11px] pt-1 border-t border-slate-100">
                    <span className="capitalize">{p.payment_method?.replace('_', ' ')}</span>
                    <span>{new Date(p.payment_date).toLocaleDateString('fr-FR')}</span>
                  </div>
                  {p.reference && (
                    <div className="text-[11px] font-mono text-slate-400">
                      Réf: {p.reference}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Vue Table Bureau (>= 768px) */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3.5 font-medium text-slate-600">N° Facture</th>
                    <th className="text-left px-4 py-3.5 font-medium text-slate-600">Université Client</th>
                    <th className="text-left px-4 py-3.5 font-medium text-slate-600">Mode de Règlement</th>
                    <th className="text-left px-4 py-3.5 font-medium text-slate-600">Référence</th>
                    <th className="text-center px-4 py-3.5 font-medium text-slate-600">Date</th>
                    <th className="text-right px-4 py-3.5 font-medium text-slate-600">Montant Encaissé</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <FileText size={15} className="text-[#FF6B00]" />
                          {p.invoice_number}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <Building2 size={15} className="text-slate-400" />
                          {p.university_name}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 capitalize font-medium">
                        {p.payment_method?.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 font-mono text-xs">
                        {p.reference || '—'}
                      </td>
                      <td className="px-4 py-3.5 text-center text-slate-500">
                        {new Date(p.payment_date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-green-600">
                        {formatFCFA(p.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
