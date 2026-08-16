'use client';

import { useState, useEffect } from 'react';
import { Receipt } from 'lucide-react';
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
    api.get('/api/v1/subscriptions/payments')
      .then(res => setPayments(res.data))
      .catch(() => toast.error('Erreur lors du chargement'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B00] border-t-transparent"></div></div>;
  }

  const total = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Paiements d'abonnement</h1>
        <p className="text-slate-500 mt-1">Historique de tous les paiements reçus des universités</p>
      </div>

      <div className="bg-green-50 border border-green-100 rounded-2xl p-5">
        <p className="text-sm text-green-600">Total encaissé</p>
        <p className="text-2xl font-bold text-green-700">{formatFCFA(total)}</p>
      </div>

      {payments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Receipt className="mx-auto text-slate-300 mb-3" size={48} />
          <p className="text-slate-500">Aucun paiement enregistré</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Université</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Période</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">Date</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">Méthode</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map(p => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{p.university_name}</td>
                  <td className="px-4 py-3 text-slate-600">{p.period_covered || '-'}</td>
                  <td className="px-4 py-3 text-center text-slate-500">{new Date(p.payment_date).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-3 text-center text-slate-500 capitalize">{p.payment_method}</td>
                  <td className="px-4 py-3 text-right font-semibold text-green-600">{formatFCFA(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
