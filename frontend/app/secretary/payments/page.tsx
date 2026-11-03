'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, Search, CheckCircle, Clock, Loader2, Download, Printer, FileSpreadsheet } from 'lucide-react';
import paymentService from '@/services/paymentService';
import { toast } from 'react-hot-toast';
import api from '@/lib/api';

export default function SecretaryPaymentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

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
      ].join(';');
    });
    const BOM = '\uFEFF';
    const csvContent = [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Paiements_Secretariat_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Paiements exportés en CSV avec succès');
  };

  const filtered = payments.filter(p => {
    const student = (p.student_name || `${p.student?.first_name || ''} ${p.student?.last_name || ''}`).toLowerCase();
    const matricule = (p.matricule || p.student?.matricule || '').toLowerCase();
    const ref = (p.reference || p.receipt_number || p.id?.toString() || '').toLowerCase();
    const q = searchTerm.toLowerCase();
    return student.includes(q) || matricule.includes(q) || ref.includes(q);
  });

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-600" /> Encaissement & Suivi des Frais
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm">Vérification de l’état de paiement et délivrance instantanée des reçus officiels.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition shadow-xs"
            title="Exporter la liste en CSV"
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Rechercher par reçu, étudiant ou matricule..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent border-none focus:outline-none text-slate-900 dark:text-white text-xs sm:text-sm"
        />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3 sm:p-4">N° Reçu</th>
                <th className="p-3 sm:p-4">Étudiant</th>
                <th className="p-3 sm:p-4">Type</th>
                <th className="p-3 sm:p-4">Montant</th>
                <th className="p-3 sm:p-4">Date</th>
                <th className="p-3 sm:p-4">Statut</th>
                <th className="p-3 sm:p-4 text-right">Action</th>
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
                      <button
                        onClick={() => handleDownloadReceipt(p.id, refNum)}
                        disabled={downloadingId === p.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-xs font-medium transition disabled:opacity-50 shadow-xs"
                        title="Télécharger le reçu PDF officiel"
                      >
                        {downloadingId === p.id ? <Loader2 size={12} className="animate-spin" /> : <Printer size={12} />}
                        <span>Reçu PDF</span>
                      </button>
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
    </div>
  );
}
