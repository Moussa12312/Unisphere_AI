'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import ReceiptTemplate from '@/components/ReceiptTemplate';

export default function StudentReceiptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [receiptData, setReceiptData] = useState<any>(null);

  useEffect(() => {
    const rawId = Array.isArray(params?.receiptId) ? params.receiptId[0] : params?.receiptId;
    if (rawId && rawId !== 'undefined' && rawId !== 'NaN' && !isNaN(Number(rawId))) {
      loadReceipt(rawId);
    } else {
      setLoading(false);
    }
  }, [params?.receiptId]);

  const loadReceipt = async (receiptId: string) => {
    try {
      setLoading(true);
      const res = await api.get(`/api/v1/financials/receipt/${receiptId}`);
      setReceiptData(res.data.receipt);
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error('Reçu introuvable');
      router.push('/student/receipts');
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

  if (!receiptData) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 mb-4">Impossible de charger ce reçu.</p>
        <button
          onClick={() => router.push('/student/receipts')}
          className="flex items-center gap-2 mx-auto px-4 py-2 bg-[#FF6B00] text-white rounded-lg text-sm"
        >
          <ArrowLeft size={16} /> Retour
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <ReceiptTemplate 
        receipt={receiptData} 
        showBackButton={true} 
        backUrl="/student/receipts" 
      />
    </div>
  );
}