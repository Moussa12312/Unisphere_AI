'use client';

import { useState, useEffect } from 'react';
import { FileText, Download, Loader2, AlertCircle, Printer } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface Receipt {
  id: number;
  receipt_number: string;
  amount: number;
  payment_date: string;
  description: string;
  payment_method: string;
}

export default function StudentReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReceipts();
  }, []);

  const loadReceipts = async () => {
    try {
      const res = await api.get('/api/v1/students/me/receipts');
      setReceipts(res.data);
    } catch (error) {
      toast.error('Erreur de chargement des reçus');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = (receipt: Receipt) => {
    // Créer une fenêtre d'impression simple
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Reçu ${receipt.receipt_number}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; }
              .header { text-align: center; margin-bottom: 40px; }
              .receipt-number { font-size: 24px; font-weight: bold; color: #FF6B00; }
              .amount { font-size: 32px; font-weight: bold; margin: 20px 0; }
              .details { margin-top: 30px; }
              .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
              .label { font-weight: bold; color: #666; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>REÇU DE PAIEMENT</h1>
              <div class="receipt-number">${receipt.receipt_number}</div>
            </div>
            <div class="amount">${receipt.amount.toLocaleString('fr-FR')} FCFA</div>
            <div class="details">
              <div class="detail-row">
                <span class="label">Date :</span>
                <span>${receipt.payment_date}</span>
              </div>
              <div class="detail-row">
                <span class="label">Description :</span>
                <span>${receipt.description}</span>
              </div>
              <div class="detail-row">
                <span class="label">Méthode de paiement :</span>
                <span>${receipt.payment_method}</span>
              </div>
            </div>
            <script>window.onload = function() { window.print(); }</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-[#FF6B00]" size={32} /></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mes Reçus</h1>
        <p className="text-slate-500 mt-1">Téléchargez ou imprimez vos justificatifs de paiement.</p>
      </div>

      {receipts.length === 0 ? (
        <div className="bg-white p-10 rounded-xl border border-slate-200 text-center">
          <AlertCircle size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">Aucun reçu disponible pour le moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {receipts.map((receipt) => (
            <div key={receipt.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-[#FF6B00]/10 rounded-lg">
                  <FileText className="text-[#FF6B00]" size={24} />
                </div>
                <span className="text-xs font-mono text-slate-400">#{receipt.receipt_number}</span>
              </div>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-slate-500">Montant</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {receipt.amount.toLocaleString('fr-FR')} FCFA
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-slate-500">Description</p>
                  <p className="text-sm font-medium text-slate-700">{receipt.description}</p>
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div>
                    <p className="text-xs text-slate-400">Date</p>
                    <p className="text-sm font-medium text-slate-700">{receipt.payment_date}</p>
                  </div>
                  <button
                    onClick={() => handlePrint(receipt)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium"
                  >
                    <Printer size={14} />
                    Imprimer
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}