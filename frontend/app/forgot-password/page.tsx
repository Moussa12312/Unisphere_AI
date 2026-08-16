'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, KeyRound, Mail, Lock, Loader2, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Veuillez saisir votre adresse email');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/v1/auth/forgot-password', {
        email: email.trim(),
        new_password: newPassword ? newPassword.trim() : undefined
      });

      toast.success(response.data.message || 'Mot de passe réinitialisé avec succès');
      setSuccessMsg(response.data.message || 'Votre mot de passe a été réinitialisé.');
      setTimeout(() => {
        router.push('/login');
      }, 2500);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la réinitialisation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden" style={{
      background: 'linear-gradient(135deg, #0a1628 0%, #1e3a8a 50%, #3b82f6 100%)'
    }}>
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('/login.png')` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a1628]/90 via-[#0a1628]/70 to-transparent"></div>
      </div>

      <div className="w-full flex items-center justify-center p-5 relative z-10">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">
          <div className="w-14 h-14 bg-[#FF6B00]/10 rounded-2xl flex items-center justify-center mb-5">
            <KeyRound className="text-[#FF6B00]" size={28} />
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-2">Réinitialiser le mot de passe</h2>
          <p className="text-sm text-slate-500 mb-6">
            Entrez votre adresse email et définissez votre nouveau mot de passe pour tous les rôles.
          </p>

          {successMsg ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-800 text-sm space-y-2 mb-6 text-center">
              <CheckCircle2 size={24} className="text-emerald-600 mx-auto" />
              <p className="font-semibold">{successMsg}</p>
              <p className="text-xs text-emerald-600">Redirection vers la page de connexion...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Votre email *</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nom@unisphere.ai"
                    className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nouveau mot de passe (optionnel)</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Laissez vide pour mot de passe généré"
                    className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#FF6B00] to-blue-600 hover:from-[#e55f00] hover:to-blue-700 text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                {loading ? 'Réinitialisation...' : 'Valider la réinitialisation'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#FF6B00] transition-colors"
            >
              <ArrowLeft size={16} />
              Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
