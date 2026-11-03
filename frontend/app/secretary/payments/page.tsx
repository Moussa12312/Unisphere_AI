'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, Search, CheckCircle, Clock, Loader2, Download, Printer, FileSpreadsheet, X, Eye } from 'lucide-react';
import paymentService from '@/services/paymentService';
import { toast } from 'react-hot-toast';
import api from '@/lib/api';
import ReceiptTemplate from '@/components/ReceiptTemplate';

export default function SecretaryPaymentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<any | null>(null);
  const [loadingReceiptId, setLoadingReceiptId] = useState<number | null>(null);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const res = await paymentService.getAll({ page_size: 100 });
      const data = Array.isArray(res) ? res : (res.data || res.items || []);
      setPayments(data);
    } catch (err) {
      console.error(err);
      toast.error('Impossible de charger les paiements');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReceipt = async (paymentId: number) => {
    try {
      setLoadingReceiptId(paymentId);
      const res = await api.get(`/api/v1/financials/receipt/${paymentId}`);
      setActiveReceipt(res.data.receipt);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Impossible de charger le reçu officiel');
    } finally {
      setLoadingReceiptId(null);
    }
  };

  const handleDownloadReceipt = async (paymentId: number, ref: string) => {
    try {
      setDownloadingId(paymentId);
      const res = await api.get(`/api/v1/payments/${paymentId}/receipt/pdf`, {
        responseType: 'blob'
      });
      const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `Recu_${ref || paymentId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      toast.success('Reçu officiel téléchargé');
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors du téléchargement du reçu');
    } finally {
      setDownloadingId(null);
    }
  };

  const exportToCSV = () => {
    if (payments.length === 0) {
      toast.error('Aucun paiement à exporter');
      return;
    }
    const headers = ['N° Reçu', 'Étudiant', 'Matricule', 'Type', 'Montant', 'Devise', 'Date', 'Statut'];
    const rows = filtered.map(p => {
      const escape = (f: any) => `"${String(f || '').replace(/"/g, '""')}"`;
      const isPaid = p.status === 'completed' || p.status === 'Payé';
      return [
        escape(p.reference || p.receipt_number || `REC-${p.id}`),
        escape(p.student_name || `${p.student?.first_name || ''} ${p.student?.last_name || ''}`.trim() || `Étudiant #${p.student_id}`),
        escape(p.matricule || p.student?.matricule || ''),
        escape(p.payment_type || 'Scolarité'),
        escape(p.amount || 0),
        escape(p.currency || 'FCFA'),
        escape(p.payment_date || (p.created_at ? new Date(p.created_at).toLocaleDateString('fr-FR') : '')),
        escape(isPaid ? 'Payé' : 'En attente')
      ].join(',');
    });
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Paiements_Secretariat_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Export CSV réussi');
  };

  const filtered = payments.filter((p) => {
    const s = searchTerm.toLowerCase();
    const studentName = (p.student_name || `${p.student?.first_name || ''} ${p.student?.last_name || ''}`).toLowerCase();
    const refNum = (p.reference || p.receipt_number || `REC-${p.id}`).toLowerCase();
    const matricule = (p.matricule || p.student?.matricule || '').toLowerCase();
    return studentName.includes(s) || refNum.includes(s) || matricule.includes(s);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="text-[#FF6B00]" />
            Suivi des Paiements & Reçus
          </h1>
          <p className="text-slate-500 text-sm mt-1">Consultez, imprimez et téléchargez les quittances officielles d'inscription et de scolarité</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition"
          >
            <FileSpreadsheet size={16} />
            <span>Exporter CSV</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Rechercher par étudiant, matricule ou référence..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent border-none focus:outline-none text-slate-900 dark:text-white text-sm"
        />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-[#FF6B00]" />
          </div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3 sm:p-4">Réf / Reçu</th>
                <th className="p-3 sm:p-4">Étudiant</th>
                <th className="p-3 sm:p-4">Type</th>
                <th className="p-3 sm:p-4">Montant</th>
                <th className="p-3 sm:p-4">Date</th>
                <th className="p-3 sm:p-4">Statut</th>
                <th className="p-3 sm:p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filtered.map((p) => {
                const isPaid = p.status === 'completed' || p.status === 'Payé';
                const refNum = p.reference || p.receipt_number || `REC-${p.id}`;
                return (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 sm:p-4 font-mono font-medium text-slate-900 dark:text-white whitespace-nowrap">{refNum}</td>
                    <td className="p-3 sm:p-4">
                      <p className="font-medium text-slate-900 dark:text-white">{p.student_name || `${p.student?.first_name || ''} ${p.student?.last_name || ''}`.trim() || `Étudiant #${p.student_id}`}</p>
                      <p className="text-xs font-mono text-slate-500">{p.matricule || p.student?.matricule || `ID #${p.student_id}`}</p>
                    </td>
                    <td className="p-3 sm:p-4 text-slate-600 dark:text-slate-300 capitalize">{p.payment_type || 'Scolarité'}</td>
                    <td className="p-3 sm:p-4 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">{Number(p.amount || 0).toLocaleString('fr-FR')} {p.currency || 'FCFA'}</td>
                    <td className="p-3 sm:p-4 text-slate-500 text-xs whitespace-nowrap">{p.payment_date || (p.created_at ? new Date(p.created_at).toLocaleDateString('fr-FR') : 'N/A')}</td>
                    <td className="p-3 sm:p-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        isPaid
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        {isPaid ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {isPaid ? 'Payé' : 'En attente'}
                      </span>
                    </td>
                    <td className="p-3 sm:p-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenReceipt(p.id)}
                          disabled={loadingReceiptId === p.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-xs font-semibold transition shadow-xs active:scale-95 disabled:opacity-50"
                          title="Imprimer la quittance officielle"
                        >
                          {loadingReceiptId === p.id ? <Loader2 size={13} className="animate-spin" /> : <Printer size={13} />}
                          <span>Imprimer</span>
                        </button>
                        <button
                          onClick={() => handleDownloadReceipt(p.id, refNum)}
                          disabled={downloadingId === p.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition active:scale-95 disabled:opacity-50"
                          title="Télécharger le PDF officiel"
                        >
                          {downloadingId === p.id ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                          <span className="hidden sm:inline">PDF</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Aucun paiement trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table></div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 🖨️ MODALE D'IMPRESSION DIRECTE DU REÇU OFFICIEL (SECRETARIAT)   */}
      {/* ============================================================== */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible print:inset-auto print:z-auto print:w-full print:h-auto print:block">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto border border-slate-200 shadow-2xl p-3 sm:p-6 print:border-none print:shadow-none print:max-w-none print:w-full print:p-0 print:overflow-visible print:max-h-none print:m-0 relative voucher-sheet">
            <div className="flex items-center justify-between pb-3 sm:pb-4 mb-4 sm:mb-6 border-b border-slate-100 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="text-[#FF6B00]" size={18} />
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  Reçu Officiel de Paiement
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 bg-[#FF6B00] text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-[#e55f00] shadow-md shadow-orange-500/20 transition-all active:scale-95"
                >
                  <Printer size={15} />
                  <span>Imprimer</span>
                </button>
                <button
                  onClick={() => setActiveReceipt(null)}
                  className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <ReceiptTemplate 
              receipt={activeReceipt} 
              showBackButton={false} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
