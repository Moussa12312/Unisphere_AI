'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, Download, Calendar, CreditCard, Loader2, Receipt, CheckCircle, Clock } from 'lucide-react';
import financialService from '@/services/financialService';
import { useToast } from '@/components/ToastProvider';

function formatFCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(amount || 0) + ' FCFA';
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
}

export default function StudentReceiptsPage() {
  const toast = useToast();
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReceipts();
  }, []);

  const loadReceipts = async () => {
    try {
      setLoading(true);
      const data = await financialService.getReceipts();

      // ✅ Gestion robuste de tous les formats possibles
      let list: any[] = [];

      if (Array.isArray(data)) {
        list = data;
      } else if (data && Array.isArray(data.receipts)) {
        list = data.receipts;
      } else if (data && Array.isArray(data.receipt)) {
        list = data.receipt;
      } else if (data && Array.isArray(data.data)) {
        list = data.data;
      }

      setReceipts(list);
    } catch (error: any) {
      console.error('Erreur chargement reçus:', error);
      toast.error(error.response?.data?.detail || 'Erreur de chargement des reçus');
      setReceipts([]);
    } finally {
      setLoading(false);
    }
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
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Receipt size={24} className="text-[#FF6B00]" />
          Mes reçus de paiement
        </h1>
        <p className="text-slate-500 mt-1">Consultez et téléchargez tous vos reçus de paiement</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total reçus</p>
              <p className="text-2xl font-bold text-slate-900">{receipts.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total payé</p>
              <p className="text-2xl font-bold text-green-600">
                {formatFCFA(receipts.reduce((sum, r) => sum + (r.amount || 0), 0))}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock size={20} className="text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Dernier paiement</p>
              <p className="text-sm font-semibold text-slate-900">
                {receipts.length > 0
                  ? formatDate(receipts[0]?.payment_date || receipts[0]?.created_at)
                  : 'Aucun paiement'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Liste des reçus */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {receipts.length === 0 ? (
          <div className="p-16 text-center">
            <Receipt size={48} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Aucun reçu disponible</p>
            <p className="text-xs text-slate-400 mt-1">
              Vos reçus apparaîtront ici après chaque paiement
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {receipts.map((receipt: any) => {
              const payment = receipt.payment || receipt;
              const id = receipt.id || payment.id;
              const amount = payment.amount || receipt.amount || 0;
              const date = payment.payment_date || receipt.payment_date || receipt.created_at;
              const ref = payment.reference || receipt.reference || payment.receipt_number || '-';
              const method = payment.payment_method || receipt.payment_method || 'espèces';
              const status = payment.status || receipt.status || 'completed';

              return (
                <div
                  key={id}
                  className="p-5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 bg-[#FF6B00]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <CreditCard size={20} className="text-[#FF6B00]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-900 text-sm">
                          Reçu N° {ref}
                        </p>
                        {status === 'completed' && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                            <CheckCircle size={10} /> Payé
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {formatDate(date)}
                        </span>
                        <span className="capitalize">• {method.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <p className="text-lg font-bold text-slate-900">
                      {formatFCFA(amount)}
                    </p>
                    <Link
                      href={`/student/receipts/${id}`}
                      className="flex items-center gap-1.5 px-3 py-2 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-xs font-medium transition-colors"
                    >
                      <Download size={14} />
                      Voir
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}