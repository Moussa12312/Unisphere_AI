'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Printer, ArrowLeft, CheckCircle, AlertCircle,
  User, Receipt, Calendar, Layers, Loader2, TrendingUp
} from 'lucide-react';
import Link from 'next/link';
import financialService from '@/services/financialService';
import { useToast } from '@/components/ToastProvider';

export default function ReceiptPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  
  const [loading, setLoading] = useState(true);
  const [receipt, setReceipt] = useState<any>(null);

  useEffect(() => {
    loadReceipt();
  }, [params.paymentId]);

  const loadReceipt = async () => {
    try {
      setLoading(true);
      const data = await financialService.getReceipt(parseInt(params.paymentId as string));
      setReceipt(data.receipt);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de chargement du reçu');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatFCFA = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  const getPaymentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      scolarite: '📚 Scolarité',
      inscription: '🎓 Inscription',
      autre: '💰 Autre'
    };
    return labels[type] || type;
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: '💵 Espèces',
      mobile_money: '📱 Mobile Money',
      bank_transfer: '🏦 Virement bancaire',
      check: '📄 Chèque'
    };
    return labels[method] || method;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-[#FF6B00]" size={32} />
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="text-center py-12">
        <Receipt size={48} className="text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">Impossible de charger le reçu</p>
        <button
          onClick={() => router.back()}
          className="mt-4 px-4 py-2 bg-[#FF6B00] text-white rounded-lg text-sm"
        >
          Retour
        </button>
      </div>
    );
  }

  const { payment, student, university, creator } = receipt;

  // ✅ VALEURS PAR DÉFAUT SÉCURISÉES
  const tranches = receipt.tranches || {
    paid: [],
    remaining: [],
    total_paid: payment?.amount || 0,
    total_remaining: payment?.balance || 0,
    paid_percentage: 0
  };

  const paidTranches = tranches.paid || [];
  const remainingTranches = tranches.remaining || [];
  const paidPercentage = tranches.paid_percentage || 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Boutons d'action */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          href={`/accountant/payments/student/${student?.id}`}
          className="flex items-center gap-2 text-slate-600 hover:text-[#FF6B00] transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="text-sm font-medium">Retour à la fiche</span>
        </Link>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#FF6B00] to-orange-500 hover:from-[#e55f00] hover:to-orange-600 text-white rounded-lg text-sm font-medium transition-all shadow-md"
          >
            <Printer size={16} />
            Imprimer le reçu
          </button>
        </div>
      </div>

      {/* REÇU */}
      <div id="receipt-content" className="bg-white border-2 border-slate-200 shadow-lg print:shadow-none print:border-0">
        
        {/* EN-TÊTE */}
        <div className="border-b-4 border-[#FF6B00] p-8 bg-gradient-to-r from-slate-900 to-slate-800 text-white print:bg-white print:text-black">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">{university?.name || 'Université'}</h1>
              <p className="text-sm opacity-80 mt-2 print:text-slate-600">📍 {university?.address || ''}</p>
              <p className="text-sm opacity-80 print:text-white">📞 {university?.phone || ''}</p>
              <p className="text-sm opacity-80 print:text-white">✉️ {university?.email || ''}</p>
            </div>
            <div className="text-right">
              <div className="inline-block bg-[#FF6B00] text-white px-6 py-3 rounded-lg shadow-lg print:shadow-none">
                <p className="text-xs font-medium tracking-wider">REÇU DE PAIEMENT</p>
                <p className="text-xl font-bold mt-1">{payment?.receipt_number || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* CONTENU */}
        <div className="p-8 space-y-6">
          
          {/* Étudiant + Détails */}
          <div className="grid grid-cols-2 gap-4">
            {/* Étudiant */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2 tracking-wider">
                <User size={12} className="text-[#FF6B00]" />
                Étudiant
              </h3>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="font-bold text-slate-900 mb-2">{student?.name || 'N/A'}</p>
                <div className="space-y-1 text-xs">
                  <p className="text-slate-600">
                    <span className="font-medium">Matricule:</span>{' '}
                    <span className="font-mono">{student?.matricule || 'N/A'}</span>
                  </p>
                  <p className="text-slate-600">
                    <span className="font-medium">Niveau:</span> {student?.level || 'N/A'}
                  </p>
                  <p className="text-slate-600">
                    <span className="font-medium">Filière:</span> {student?.filiere || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Détails paiement */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2 tracking-wider">
                <Receipt size={12} className="text-[#FF6B00]" />
                Détails du paiement
              </h3>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <div className="space-y-1 text-xs">
                  <p className="text-slate-600">
                    <span className="font-medium">Référence:</span>{' '}
                    <span className="font-mono">{payment?.reference || 'N/A'}</span>
                  </p>
                  <p className="text-slate-600">
                    <span className="font-medium">Date:</span>{' '}
                    {formatDate(payment?.created_at)}
                  </p>
                  <p className="text-slate-600">
                    <span className="font-medium">Type:</span>{' '}
                    {getPaymentTypeLabel(payment?.payment_type)}
                  </p>
                  <p className="text-slate-600">
                    <span className="font-medium">Mode:</span>{' '}
                    {getPaymentMethodLabel(payment?.payment_method)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RÉCAPITULATIF FINANCIER */}
          <div className="border-t-2 border-slate-100 pt-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase mb-4 flex items-center gap-2 tracking-wider">
              <TrendingUp size={16} className="text-[#FF6B00]" />
              Récapitulatif financier
            </h3>
            
            <div className="space-y-4">
              
              {/* Montant total dû */}
              <div className="flex items-center justify-between py-4 px-5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-700 font-medium">💰 Montant total dû</span>
                <span className="font-bold text-slate-900 text-xl">
                  {formatFCFA(payment?.total_amount || 0)}
                </span>
              </div>

              {/* ✅ MONTANT PAYÉ */}
              {paidTranches.length > 0 && (
                <div className="bg-green-50 rounded-xl border-2 border-green-300 overflow-hidden">
                  <div className="flex items-center justify-between py-4 px-5 bg-green-100 border-b-2 border-green-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={18} className="text-green-600" />
                      <span className="font-bold text-green-800">✅ MONTANT PAYÉ</span>
                    </div>
                  </div>
                  
                  <div className="p-4 space-y-2">
                    {paidTranches.map((tranche: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-green-200"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle size={14} className="text-green-600" />
                          <span className="text-sm font-medium text-green-900">
                            ✓ {tranche.tranche_name}
                          </span>
                          <span className="text-xs text-green-600">
                            ({formatDate(tranche.due_date)})
                          </span>
                        </div>
                        <span className="text-sm font-bold text-green-700">
                          {formatFCFA(tranche.amount)}
                        </span>
                      </div>
                    ))}
                    
                    <div className="flex items-center justify-between py-2 px-3 mt-2 border-t-2 border-green-300">
                      <span className="text-sm font-bold text-green-900">TOTAL PAYÉ</span>
                      <span className="text-base font-bold text-green-700">
                        {formatFCFA(tranches.total_paid || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ⚠️ RESTE À PAYER */}
              {remainingTranches.length > 0 && (
                <div className="bg-orange-50 rounded-xl border-2 border-orange-300 overflow-hidden">
                  <div className="flex items-center justify-between py-4 px-5 bg-orange-100 border-b-2 border-orange-300">
                    <div className="flex items-center gap-2">
                      <AlertCircle size={18} className="text-orange-600" />
                      <span className="font-bold text-orange-800">⚠️ RESTE À PAYER</span>
                    </div>
                  </div>
                  
                  <div className="p-4 space-y-2">
                    {remainingTranches.map((tranche: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-orange-200"
                      >
                        <div className="flex items-center gap-2">
                          <Layers size={14} className="text-orange-600" />
                          <span className="text-sm font-medium text-orange-900">
                            • {tranche.tranche_name}
                          </span>
                          <span className="text-xs text-orange-600">
                            (échéance: {formatDate(tranche.due_date)})
                          </span>
                        </div>
                        <span className="text-sm font-bold text-orange-700">
                          {formatFCFA(tranche.amount)}
                        </span>
                      </div>
                    ))}                    
                  </div>
                </div>
              )}

              {/* Statut final */}
              <div className={`flex items-center justify-between py-5 px-5 rounded-xl border-2 ${
                payment?.status === 'paid' 
                  ? 'bg-green-100 border-green-400' 
                  : payment?.status === 'partial'
                  ? 'bg-orange-100 border-orange-400'
                  : 'bg-red-100 border-red-400'
              }`}>
                <span className="font-bold text-slate-900 text-sm uppercase tracking-wider">
                  Statut
                </span>
                <span className={`font-bold flex items-center gap-2 text-lg ${
                  payment?.status === 'paid' ? 'text-green-700' :
                  payment?.status === 'partial' ? 'text-orange-700' :
                  'text-red-700'
                }`}>
                  {payment?.status === 'paid' ? (
                    <>
                      <CheckCircle size={22} />
                      PAYÉ EN TOTALITÉ
                    </>
                  ) : payment?.status === 'partial' ? (
                    <>
                      <AlertCircle size={22} />
                      PAIEMENT PARTIEL
                    </>
                  ) : (
                    <>
                      <AlertCircle size={22} />
                      AUCUN PAIEMENT
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          {payment?.description && (
            <div className="border-t-2 border-slate-100 pt-6">
              <h3 className="text-xs font-bold text-slate-500 uppercase mb-2 tracking-wider">
                Description
              </h3>
              <p className="text-slate-700 italic bg-slate-50 p-4 rounded-lg border border-slate-200">
                {payment.description}
              </p>
            </div>
          )}

          {/* Signatures */}
          <div className="border-t-2 border-slate-100 pt-6 mt-8">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-sm text-slate-500 mb-12 font-medium">
                  Signature du parent, tuteur ou étudiant
                </p>
                <div className="border-b-2 border-slate-300"></div>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-2">Enregistré par</p>
                <p className="font-bold text-slate-900 text-lg">
                  {creator?.name || 'N/A'}
                </p>
                <p className="text-sm text-slate-600 capitalize">
                  {creator?.role === 'accountant' ? 'Service Comptable' : creator?.role || 'Comptable'}
                </p>
                <p className="text-xs text-slate-400 mt-3">
                  Le {formatDate(new Date().toISOString())}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Pied de page */}
        <div className="bg-slate-50 border-t-2 border-slate-200 p-6 text-center">
          <p className="text-xs text-slate-500">
            Ce reçu est généré automatiquement par <strong>{university?.name || 'l\'université'}</strong>.
            <br />
            En cas de problème, contactez le service comptable.
          </p>
          <p className="text-xs text-slate-400 mt-2 font-mono">
            Réf: {payment?.reference || 'N/A'} • Généré le {new Date().toLocaleString('fr-FR')}
          </p>
        </div>
      </div>

      {/* Styles d'impression optimisés */}
      <style jsx global>{`
        @media print {
          /* ✅ FORCER L'IMPRESSION DES COULEURS DE FOND */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          /* Masquer tout sauf le reçu */
          body * {
            visibility: hidden;
          }
          #receipt-content, #receipt-content * {
            visibility: visible;
          }
          #receipt-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
            
            /* ✅ FOND BLEU À L'IMPRESSION */
            background-color: #dbeafe !important; /* blue-100 */
          }
          .print\\:hidden {
            display: none !important;
          }
          
          /* ✅ FORCER LE FORMAT A4 */
          @page {
            size: A4;
            margin: 10mm;
          }
          
          /* ✅ EN-TÊTE BLEU À L'IMPRESSION */
          #receipt-content .border-b-4 {
            color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* ✅ BADGE REÇU À L'IMPRESSION */
          #receipt-content .border-b-4 .inline-block {
            background-color: #FF6B00 !important;
            color:rgb(255, 255, 255) !important;
            border: 2px solid #FF6B00 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* ✅ BLOCS VERTS (tranches payées) */
          #receipt-content .bg-green-50,
          #receipt-content .bg-green-100 {
            background-color: #dcfce7 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* ✅ BLOCS ORANGES (reste à payer) */
          #receipt-content .bg-orange-50,
          #receipt-content .bg-orange-100 {
            background-color: #ffedd5 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* ✅ BLOCS BLEUS (statut) */
          #receipt-content .bg-blue-50,
          #receipt-content .bg-blue-100 {
            background-color: #dbeafe !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* ✅ BLOCS GRIS */
          #receipt-content .bg-slate-50 {
            background-color: #f1f5f9 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* ✅ PIED DE PAGE BLEU */
          #receipt-content > div:last-child {
            background-color:rgb(148, 188, 238) !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* ✅ RÉDUIRE LES ESPACEMENTS */
          #receipt-content .p-8 {
            padding: 15px !important;
          }
          #receipt-content .p-6 {
            padding: 10px !important;
          }
          #receipt-content .p-5 {
            padding: 8px !important;
          }
          #receipt-content .p-4 {
            padding: 6px !important;
          }
          #receipt-content .py-4 {
            padding-top: 8px !important;
            padding-bottom: 8px !important;
          }
          #receipt-content .py-5 {
            padding-top: 10px !important;
            padding-bottom: 10px !important;
          }
          #receipt-content .px-5 {
            padding-left: 12px !important;
            padding-right: 12px !important;
          }
          #receipt-content .mb-3 {
            margin-bottom: 8px !important;
          }
          #receipt-content .mb-4 {
            margin-bottom: 10px !important;
          }
          #receipt-content .space-y-6 > * + * {
            margin-top: 12px !important;
          }
          #receipt-content .space-y-4 > * + * {
            margin-top: 8px !important;
          }
          #receipt-content .space-y-2 > * + * {
            margin-top: 4px !important;
          }
          #receipt-content .gap-6 {
            gap: 12px !important;
          }
          #receipt-content .gap-3 {
            gap: 6px !important;
          }
          
          /* ✅ RÉDUIRE LES TAILLES DE POLICE */
          #receipt-content h1 {
            font-size: 18px !important;
          }
          #receipt-content h3 {
            font-size: 14px !important;
          }
          #receipt-content .text-2xl {
            font-size: 18px !important;
          }
          #receipt-content .text-xl {
            font-size: 16px !important;
          }
          #receipt-content .text-lg {
            font-size: 16x !important;
          }
          #receipt-content .text-base {
            font-size: 14px !important;
          }
          #receipt-content .text-sm {
            font-size: 14px !important;
          }
          #receipt-content .text-xs {
            font-size: 14px !important;
          }
          
          /* ✅ ÉVITER LES SAUTS DE PAGE */
          #receipt-content > div > div {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          /* ✅ RÉDUIRE LES BORDURES */
          #receipt-content .border-2 {
            border-width: 1px !important;
          }
          #receipt-content .border-t-2 {
            border-top-width: 1px !important;
          }
          #receipt-content .border-b-4 {
            border-bottom-width: 2px !important;
          }
          
          /* ✅ BARRE DE PROGRESSION */
          #receipt-content .h-4 {
            height: 8px !important;
          }
          
          /* ✅ SIGNATURES */
          #receipt-content .mb-12 {
            margin-bottom: 30px !important;
          }
        }
      `}</style>
    </div>
  );
}