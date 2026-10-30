'use client';

import { useState, useEffect } from 'react';
import {
  DollarSign, CreditCard, Loader2, TrendingUp, AlertCircle,
  FileCheck, Download, Calendar, ShieldCheck, CheckCircle2, Clock
} from 'lucide-react';
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
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingQuitus, setDownloadingQuitus] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [paymentsRes, summaryRes] = await Promise.allSettled([
        api.get('/api/v1/students/me/payments'),
        api.get('/api/v1/payments/me/summary')
      ]);
      if (paymentsRes.status === 'fulfilled') {
        setPayments(paymentsRes.value.data || []);
      }
      if (summaryRes.status === 'fulfilled') {
        setSummary(summaryRes.value.data);
      }
    } catch (error) {
      toast.error('Erreur de chargement des données financières');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadQuitus = async () => {
    setDownloadingQuitus(true);
    try {
      const response = await api.get('/api/v1/financials/me/quitus-pdf', {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `quitus_financier.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('📄 Quitus Financier officiel téléchargé avec succès !');
    } catch (error: any) {
      toast.error('Erreur lors du téléchargement du Quitus Financier');
    } finally {
      setDownloadingQuitus(false);
    }
  };

  const totalPaid = summary?.total_paid != null ? summary.total_paid : payments.reduce((sum, p) => sum + p.amount, 0);
  const totalAmount = summary?.total_amount || 0;
  const totalRemaining = summary?.total_remaining != null ? summary.total_remaining : Math.max(0, totalAmount - totalPaid);
  const paidPercentage = summary?.paid_percentage != null ? summary.paid_percentage : (totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0);
  const isMonthly = summary?.is_monthly || summary?.payment_plan === 'mensuel';

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="animate-spin text-[#FF6B00]" size={36} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Mes Paiements & Scolarité</h1>
          <p className="text-slate-500 text-sm mt-1">Historique de vos règlements, échéancier et attestations comptables officielles.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-semibold">
            <TrendingUp size={18} className="text-emerald-600" />
            <span>Total réglé : {totalPaid.toLocaleString('fr-FR')} FCFA</span>
          </div>

          <button
            onClick={handleDownloadQuitus}
            disabled={downloadingQuitus}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#FF6B00] to-orange-500 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
          >
            {downloadingQuitus ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <FileCheck size={16} />
            )}
            <span>Quitus Financier Officiel</span>
          </button>
        </div>
      </div>

      {/* Cartes Synthèse Scolarité & Modalité de Paiement */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Scolarité exigible</p>
            <p className="text-2xl font-bold text-slate-900 mt-2 font-mono">
              {Number(totalAmount).toLocaleString('fr-FR')} FCFA
            </p>
            {summary.discount_amount > 0 && (
              <p className="text-xs text-emerald-600 mt-1">
                Remise accordée déduite : -{Number(summary.discount_amount).toLocaleString('fr-FR')} F
              </p>
            )}
            <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, paidPercentage)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1 text-right">{paidPercentage}% soldé</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Reste à solder</p>
            <p className={`text-2xl font-bold mt-2 font-mono ${totalRemaining > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {Number(totalRemaining).toLocaleString('fr-FR')} FCFA
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {totalRemaining === 0 ? '✅ Votre scolarité est intégralement soldée' : 'Montant restant sur l’année'}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Formule de règlement</p>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                isMonthly ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {isMonthly ? '📅 Modalité Mensuelle' : '🏛️ Par Tranches'}
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-900 mt-2">
              {isMonthly
                ? (summary.monthly_plan?.formatted_summary || 'Acompte + Mensualités étalées')
                : '3 Tranches académiques (P1, P2, P3)'
              }
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {isMonthly
                ? `Mensualités de ${Number(summary.monthly_plan?.installment || 100000).toLocaleString('fr-FR')} FCFA`
                : 'Échéances semestrielles'
              }
            </p>
          </div>
        </div>
      )}

      {/* Échéancier détaillé (Tranches ou Mensualités) */}
      {summary?.tranches && summary.tranches.length > 0 && (() => {
        const uniqueTranches: any[] = [];
        const seen = new Set();
        for (const t of (summary.tranches || [])) {
          const k = t.number ?? t.name;
          if (!seen.has(k)) {
            seen.add(k);
            uniqueTranches.push(t);
          }
        }
        return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Calendar size={20} className="text-[#FF6B00]" />
                {isMonthly ? 'Échéancier de vos mensualités' : 'Échéancier par tranches'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Suivi détaillé de vos échéances et dates limites de versement
              </p>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="min-w-[640px] w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Échéance</th>
                  <th className="px-5 py-3.5 text-right">Montant dû</th>
                  <th className="px-5 py-3.5 text-right">Réglé</th>
                  <th className="px-5 py-3.5 text-right">Reste</th>
                  <th className="px-5 py-3.5 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {uniqueTranches.map((tranche: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      <div>
                        <span className="font-semibold">{tranche.name}</span>
                        {tranche.due_date && (
                          <span className="block text-xs text-slate-400 mt-0.5">
                            Date limite : {new Date(tranche.due_date).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-semibold text-slate-900">
                      {Number(tranche.amount).toLocaleString('fr-FR')} F
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-semibold text-emerald-700">
                      {Number(tranche.paid_amount || 0).toLocaleString('fr-FR')} F
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-slate-700">
                      {Number(tranche.remaining || 0).toLocaleString('fr-FR')} F
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                        tranche.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : tranche.status === 'partial' || tranche.status === 'available'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-slate-100 text-slate-600'
                      }`}>
                        {tranche.status === 'paid' ? (
                          <>
                            <CheckCircle2 size={12} /> Réglé
                          </>
                        ) : tranche.status === 'available' ? (
                          <>
                            <Clock size={12} /> Exigible
                          </>
                        ) : tranche.status === 'partial' ? (
                          <>
                            <Clock size={12} /> Partiel
                          </>
                        ) : (
                          'À venir'
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        );
      })()}

      {/* Historique des paiements validés */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <CreditCard size={20} className="text-[#FF6B00]" />
          Historique des reçus validés
        </h2>

        {payments.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center shadow-sm">
            <AlertCircle size={48} className="mx-auto text-slate-300 mb-3" />
            <h3 className="text-lg font-bold text-slate-800">Aucun paiement enregistré</h3>
            <p className="text-slate-500 text-sm mt-1">Vos reçus et règlements apparaîtront ici dès validation comptable.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Vue Mobile (Cartes adaptatives) */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {payments.map((payment) => (
                <div key={payment.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Calendar size={13} />
                      {payment.payment_date}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-semibold">
                      <DollarSign size={12} />
                      Réglé
                    </span>
                  </div>

                  <div className="font-semibold text-slate-900 text-sm">{payment.description}</div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="inline-flex items-center gap-1 text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                      <CreditCard size={12} />
                      {payment.payment_method}
                    </span>
                    <span className="text-base font-bold text-emerald-700">
                      {payment.amount.toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Vue Tablette & Desktop (Tableau élégant) */}
            <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-[640px] w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-4 sm:px-6 py-4">Date</th>
                      <th className="px-4 sm:px-6 py-4">Désignation</th>
                      <th className="px-4 sm:px-6 py-4">Montant</th>
                      <th className="px-4 sm:px-6 py-4">Mode de règlement</th>
                      <th className="px-4 sm:px-6 py-4">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 sm:px-6 py-4 text-slate-900 font-medium whitespace-nowrap">{payment.payment_date}</td>
                        <td className="px-4 sm:px-6 py-4 text-slate-800">{payment.description}</td>
                        <td className="px-4 sm:px-6 py-4 font-bold text-emerald-700 whitespace-nowrap">
                          {payment.amount.toLocaleString('fr-FR')} FCFA
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium">
                            <CreditCard size={13} />
                            {payment.payment_method}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-semibold border border-emerald-200">
                            <DollarSign size={12} />
                            Validé
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}