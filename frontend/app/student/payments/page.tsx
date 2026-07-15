'use client';

import { useState, useEffect } from 'react';
import { DollarSign, CreditCard, Loader2, TrendingUp, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface Payment {
  id: number;
  amount: number;
  payment_date: string;
  payment_method: string;
  description: string;
  status: string;
}

export default function StudentPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      const res = await api.get('/api/v1/students/me/payments');
      setPayments(res.data);
    } catch (error) {
      toast.error('Erreur de chargement des paiements');
    } finally {
      setLoading(false);
    }
  };

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-[#FF6B00]" size={32} /></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mes Paiements</h1>
          <p className="text-slate-500 mt-1">Historique de vos transactions financières.</p>
        </div>
        <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
          <TrendingUp size={18} />
          <span>Total payé : {totalPaid.toLocaleString('fr-FR')} FCFA</span>
        </div>
      </div>

      {payments.length === 0 ? (
        <div className="bg-white p-10 rounded-xl border border-slate-200 text-center">
          <AlertCircle size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">Aucun paiement enregistré pour le moment.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Montant</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Méthode</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-900 font-medium">{payment.payment_date}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{payment.description}</td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-green-700">
                        {payment.amount.toLocaleString('fr-FR')} FCFA
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded text-xs font-medium text-slate-700">
                        <CreditCard size={12} />
                        {payment.payment_method}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold border border-green-200">
                        <DollarSign size={12} />
                        Payé
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}