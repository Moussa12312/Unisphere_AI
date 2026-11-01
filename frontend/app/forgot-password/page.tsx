'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  KeyRound, Mail, Lock, Eye, EyeOff, ArrowLeft, ArrowRight,
  ShieldCheck, Loader2, CheckCircle2, RotateCcw, Sparkles
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const router = useRouter();

  // Étape du flux : 1 = Demande du code OTP, 2 = Saisie du code et nouveau mot de passe
  const [step, setStep] = useState<1 | 2>(1);

  // Données Étape 1
  const [identifier, setIdentifier] = useState('');
  const [targetMasked, setTargetMasked] = useState('');

  // Données Étape 2
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // États d'UI
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Décompte pour le renvoi du code
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Étape 1 : Demande de code OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = identifier.trim();
    if (!cleanId) {
      toast.error('Veuillez saisir votre adresse email, matricule ou numéro.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/api/v1/auth/forgot-password/request-otp', {
        identifier: cleanId,
        channel: 'email'
      });

      const masked = res.data?.target_masked || cleanId;
      setTargetMasked(masked);
      setStep(2);
      setResendCooldown(60);
      toast.success(res.data?.message || `Code de sécurité envoyé à ${masked}`);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Erreur lors de l’envoi du code OTP.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Renvoi du code OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    setLoading(true);
    try {
      const res = await api.post('/api/v1/auth/forgot-password/request-otp', {
        identifier: identifier.trim(),
        channel: 'email'
      });
      setResendCooldown(60);
      toast.success('Un nouveau code de sécurité vous a été envoyé.');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Échec du renvoi du code.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Étape 2 : Vérification du code et mise à jour du mot de passe
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = otpCode.trim();

    if (!cleanOtp || cleanOtp.length < 6) {
      toast.error('Veuillez saisir le code de sécurité à 6 chiffres.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      toast.error('Le nouveau mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/api/v1/auth/forgot-password/verify-otp', {
        identifier: identifier.trim(),
        otp_code: cleanOtp,
        new_password: newPassword
      });

      const data = res.data;
      if (data?.access_token && data?.user) {
        // Enregistrer la session
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('role', data.user.role);

        if (typeof document !== 'undefined') {
          document.cookie = `unisphere_token=${data.access_token}; path=/; max-age=604800; SameSite=Lax`;
          document.cookie = `unisphere_role=${data.user.role}; path=/; max-age=604800; SameSite=Lax`;
        }

        toast.success('Mot de passe réinitialisé ! Connexion en cours...');

        // Redirection vers le tableau de bord approprié
        const routes: Record<string, string> = {
          admin: '/admin/dashboard',
          secretary: '/secretary/dashboard',
          censeur: '/censeur/dashboard',
          teacher: '/teacher/dashboard',
          student: '/student/dashboard',
          accountant: '/accountant/dashboard',
          guard: '/guard',
          alumni: '/alumni/dashboard',
          super_admin: '/superadmin/dashboard',
          superadmin: '/superadmin/dashboard',
        };
        const dest = routes[data.user.role] || '/login';
        setTimeout(() => {
          window.location.href = dest;
        }, 800);
      } else {
        toast.success('Mot de passe mis à jour ! Vous pouvez vous connecter.');
        router.push('/login');
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Code erroné ou expiré.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-10 font-sans bg-[#031B63] overflow-hidden">
      {/* Halos lumineux UniSphere AI */}
      <div className="absolute top-[-10%] left-[-10%] w-[520px] h-[520px] rounded-full bg-[#0754C7]/30 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[520px] h-[520px] rounded-full bg-[#FF7900]/20 blur-[140px] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-tr from-[#031B63] via-[#0A1628] to-[#031B63] opacity-95 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        
        {/* En-tête plateforme */}
        <div className="text-center mb-6 space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-orange-400 text-xs font-semibold shadow-sm">
            <Sparkles size={14} className="text-[#FF7900]" />
            <span>Sécurité & Récupération de Compte</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            UniSphere <span className="text-[#FF7900]">AI</span>
          </h1>
        </div>

        {/* Carte principale blanche */}
        <div className="bg-white rounded-3xl shadow-2xl shadow-black/40 border border-slate-100 p-6 sm:p-8">
          
          <div className="flex items-center gap-3 pb-5 border-b border-slate-100 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#FF7900] to-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/25 shrink-0">
              <KeyRound size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {step === 1 ? 'Mot de passe oublié' : 'Vérification du code'}
              </h2>
              <p className="text-xs text-slate-500">
                {step === 1
                  ? 'Recevez un code de validation sécurisé'
                  : `Code envoyé à ${targetMasked}`}
              </p>
            </div>
          </div>

          {step === 1 ? (
            /* ======================================================== */
            /* ÉTAPE 1 : DEMANDE DE CODE OTP                            */
            /* ======================================================== */
            <form onSubmit={handleRequestOtp} className="space-y-5">
              <div className="bg-blue-50 border border-blue-200/60 rounded-2xl p-3.5 text-xs text-blue-900 flex items-start gap-2.5">
                <ShieldCheck size={18} className="text-[#0754C7] shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Entrez votre adresse email, votre matricule ou votre téléphone. Vous recevrez un code de sécurité à 6 chiffres valable pendant 10 minutes.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Identifiant du compte *
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Mail size={18} />
                  </div>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="ex: prenom.nom@unisphere.ai ou matricule"
                    required
                    autoFocus
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#FF7900] focus:ring-4 focus:ring-[#FF7900]/10 transition-all outline-none font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-[#FF7900] hover:bg-orange-600 active:scale-[0.98] text-white font-bold text-sm transition-all shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Envoi du code...</span>
                  </>
                ) : (
                  <>
                    <span>Envoyer le code de sécurité</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  <ArrowLeft size={14} />
                  <span>Retour à la connexion</span>
                </Link>
              </div>
            </form>
          ) : (
            /* ======================================================== */
            /* ÉTAPE 2 : SAISIE OTP + NOUVEAU MOT DE PASSE               */
            /* ======================================================== */
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200/60 rounded-2xl p-3 text-xs text-emerald-900 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <p>Consultez votre boîte de réception pour saisir le code à 6 chiffres.</p>
              </div>

              {/* Code OTP */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Code de sécurité (6 chiffres) *
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  required
                  autoFocus
                  className="w-full py-3 px-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-2xl font-mono tracking-[8px] font-bold text-slate-900 focus:bg-white focus:border-[#FF7900] focus:ring-4 focus:ring-[#FF7900]/10 transition-all outline-none"
                />
              </div>

              {/* Nouveau mot de passe */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Nouveau mot de passe *
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 caractères"
                    required
                    minLength={6}
                    className="w-full pl-11 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#FF7900] focus:ring-4 focus:ring-[#FF7900]/10 transition-all outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirmer le mot de passe */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Confirmer le mot de passe *
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Répétez le mot de passe"
                    required
                    minLength={6}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#FF7900] focus:ring-4 focus:ring-[#FF7900]/10 transition-all outline-none"
                  />
                </div>
              </div>

              {/* Bouton de validation */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-[#FF7900] hover:bg-orange-600 active:scale-[0.98] text-white font-bold text-sm transition-all shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Vérification et réinitialisation...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={18} />
                    <span>Valider & Réinitialiser</span>
                  </>
                )}
              </button>

              {/* Actions secondaires : renvoyer code ou changer identifiant */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-slate-500 hover:text-slate-800 transition-colors"
                >
                  ← Changer d'identifiant
                </button>

                <button
                  type="button"
                  disabled={resendCooldown > 0 || loading}
                  onClick={handleResendOtp}
                  className="text-[#0754C7] hover:text-[#031B63] font-semibold flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RotateCcw size={13} />
                  <span>
                    {resendCooldown > 0
                      ? `Renvoyer (${resendCooldown}s)`
                      : 'Renvoyer le code'}
                  </span>
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Pied de page sécurisé */}
        <div className="text-center mt-6 text-slate-400 text-xs flex items-center justify-center gap-1.5">
          <ShieldCheck size={14} className="text-emerald-400" />
          <span>Protection cryptographique • UniSphere AI v2.0</span>
        </div>

      </div>
    </div>
  );
}
