'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import financialService from '@/services/financialService';
import { useToast } from '@/components/ToastProvider';
import ReceiptTemplate from '@/components/ReceiptTemplate'; // ✅ Import du composant unique

export default function AccountantReceiptPage() {
  const params = useParams();
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

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="animate-spin text-[#FF6B00]" size={32} /></div>;
  if (!receipt) return <div className="text-center py-12 text-slate-500">Impossible de charger le reçu</div>;

  return (
    <div className="p-6">
      <ReceiptTemplate 
        receipt={receipt} 
        showBackButton={true} 
        backUrl={`/accountant/payments/student/${receipt.student?.id}`} 
      />
    </div>
  );
}