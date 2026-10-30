'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, Download, Calendar, CreditCard, Loader2, Receipt, CheckCircle, Clock, Eye, Printer, X } from 'lucide-react';
import api from '@/lib/api';
import financialService from '@/services/financialService';
import { useToast } from '@/components/ToastProvider';

function formatFCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(amount || 0) + ' FCFA';
}

function formatDate(dateStr: any) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('fr-FR', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  } catch {
    return '—';
  }
}

export default function StudentReceiptsPage() {
  const toast = useToast();
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState<number | null>(null);
  const [activeReceiptRef, setActiveReceiptRef] = useState<string>('');

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

  const handlePreviewReceipt = async (paymentId: number, ref: string) => {
    setPreviewLoading(paymentId);
    setActiveReceiptRef(ref);
    try {
      const response = await api.get(`/api/v1/payments/${paymentId}/receipt/pdf`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      setPreviewUrl(url);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Erreur lors du chargement de l'aperçu du reçu");
    } finally {
      setPreviewLoading(null);
    }
  };

  const handleDownloadReceipt = async (paymentId: number, ref: string) => {
    try {
      const response = await api.get(`/api/v1/payments/${paymentId}/receipt/pdf`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `Recu_Paiement_${ref || paymentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => window.URL.revokeObjectURL(url), 2000);
      toast.success('Reçu officiel téléchargé avec succès');
    } catch (error: any) {
      toast.error('Erreur lors du téléchargement du reçu');
    }
  };

  const executePrintFromModal = () => {
    if (!previewUrl) return;
    try {
      const win = window.open(previewUrl, '_blank');
      if (win) {
        win.focus();
        setTimeout(() => {
          try {
            win.print();
          } catch {}
        }, 600);
      }
    } catch {
      window.location.href = previewUrl;
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
              const date = payment.payment_date || receipt.payment_date || payment.date || receipt.date || receipt.created_at || payment.created_at;
              const ref = payment.reference || receipt.reference || payment.receipt_number || '-';
              const method = payment.payment_method || receipt.payment_method || 'espèces';
              const status = payment.status || receipt.status || 'completed';

              return (
                <div
                  key={id}
                  className="p-4 sm:p-5 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4"
                >
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0 w-full">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#FF6B00]/10 rounded-xl flex items-center justify-center flex-shrink-0">
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
                      <div className="flex items-center gap-2 sm:gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {formatDate(date)}
                        </span>
                        <span className="capitalize">• {String(method).replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between sm:justify-end gap-2.5 sm:gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <p className="text-base sm:text-lg font-bold text-slate-900">
                      {formatFCFA(amount)}
                    </p>
                    <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                      <button
                        onClick={() => handlePreviewReceipt(id, ref)}
                        disabled={previewLoading === id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-all active:scale-95"
                      >
                        {previewLoading === id ? (
                          <Loader2 size={13} className="animate-spin text-[#FF6B00]" />
                        ) : (
                          <Eye size={13} className="text-[#FF6B00]" />
                        )}
                        <span>Aperçu</span>
                      </button>
                      <button
                        onClick={() => handleDownloadReceipt(id, ref)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-xs font-semibold transition-all shadow-sm active:scale-95"
                      >
                        <Download size={13} />
                        <span>Télécharger</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ✅ MODAL APERÇU OFFICIEL DU REÇU DE PAIEMENT */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="max-h-[90vh] overflow-y-auto bg-white rounded-2xl max-w-4xl w-full h-[94vh] sm:h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="bg-slate-900 text-white p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base truncate">Reçu de Paiement Officiel</h3>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate">Réf : {activeReceiptRef} • Enregistrement comptable certifié</p>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 self-end sm:self-auto flex-wrap">
                <button
                  onClick={executePrintFromModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition active:scale-95"
                >
                  <Printer size={15} />
                  <span>Imprimer</span>
                </button>
                <button
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = previewUrl;
                    a.download = `Recu_Paiement_${activeReceiptRef || 'officiel'}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition active:scale-95"
                >
                  <Download size={15} />
                  <span>Télécharger</span>
                </button>
                <button
                  onClick={() => {
                    if (previewUrl) window.URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                  }}
                  className="p-1.5 sm:p-2 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white transition"
                  aria-label="Fermer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 p-1.5 sm:p-2 relative flex flex-col">
              <div className="sm:hidden mb-1 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1 text-[11px] text-amber-900">
                <span>Visualisation mobile :</span>
                <button
                  onClick={() => window.open(previewUrl, '_blank')}
                  className="font-bold text-[#FF6B00] underline"
                >
                  Ouvrir en plein écran ↗
                </button>
              </div>
              <iframe
                src={previewUrl}
                className="w-full flex-1 rounded-xl border border-slate-300 bg-white"
                title="Aperçu Reçu de Paiement"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}