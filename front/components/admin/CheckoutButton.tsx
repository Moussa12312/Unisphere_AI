'use client';

import { useState } from 'react';
import { CreditCard, Smartphone, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface CheckoutButtonProps {
  months?: number;
  onSuccess?: () => void;
}

export default function CheckoutButton({ months = 1, onSuccess }: CheckoutButtonProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (provider: 'paydunya' | 'wave') => {
    setLoading(provider);
    try {
      const res = await api.post('/api/v1/subscriptions/checkout', {
        provider,
        months
      });

      if (res.data.checkout_url) {
        toast.success('Redirection vers le paiement...');
        window.location.href = res.data.checkout_url;
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur de paiement');
      setLoading(null);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600 font-medium">Payer en ligne :</p>

      <div className="grid grid-cols-2 gap-3">
        {/* PayDunya */}
        <button
          onClick={() => handleCheckout('paydunya')}
          disabled={!!loading}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
        >
          {loading === 'paydunya' ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <CreditCard size={18} />
          )}
          Orange / Moov / Carte
        </button>

        {/* Wave */}
        <button
          onClick={() => handleCheckout('wave')}
          disabled={!!loading}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
        >
          {loading === 'wave' ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Smartphone size={18} />
          )}
          Wave
        </button>
      </div>

      <p className="text-xs text-slate-400 text-center">
        Paiement sécurisé • Confirmation automatique
      </p>
    </div>
  );
}