'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react';
import api from '@/lib/api';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Lien de vérification manquant.');
      return;
    }
    verify();
  }, [token]);

  const verify = async () => {
    try {
      const response = await api.get(`/api/v1/auth/verify-email?token=${token}`);
      setStatus('success');
      setMessage(response.data.message);
    } catch (error: any) {
      setStatus('error');
      setMessage(error.response?.data?.detail || 'Erreur lors de la vérification.');
    }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden" style={{
      background: 'linear-gradient(135deg, #0a1628 0%, #1e3a8a 50%, #3b82f6 100%)'
    }}>
      <div className="w-full flex items-center justify-center p-5 relative z-10">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="mx-auto text-[#FF6B00] animate-spin mb-4" size={48} />
              <h2 className="text-xl font-bold text-slate-900">Vérification en cours...</h2>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="text-green-600" size={32} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Email confirmé !</h2>
              <p className="text-slate-500 mb-6">{message}</p>
              <button
                onClick={() => router.push('/login')}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#FF6B00] to-blue-600 hover:from-[#e55f00] hover:to-blue-700 text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg"
              >
                Se connecter <ArrowRight size={16} />
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="text-red-600" size={32} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Lien invalide</h2>
              <p className="text-slate-500 mb-6">{message}</p>
              <button
                onClick={() => router.push('/login')}
                className="w-full px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium"
              >
                Retour à la connexion
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
