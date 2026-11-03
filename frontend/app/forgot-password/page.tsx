'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  KeyRound, Mail, Lock, Eye, EyeOff, ArrowLeft, ArrowRight,
  ShieldCheck, Loader2, CheckCircle2, RotateCcw, GraduationCap, Building2, Send
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const router = useRouter();

  // Mode : 'matricule' (Étudiants, direct via secrétariat) vs 'otp' (Personnel par email/OTP)
  const [resetMode, setResetMode] = useState<'matricule' | 'otp'>('matricule');

  // Mode Matricule Étudiant
  const [matricule, setMatricule] = useState('');
  const [matriculeSuccess, setMatriculeSuccess] = useState<{
    student_name: string;
    matricule: string;
    university_name: string;
  } | null>(null);

  // Mode OTP
  const [step, setStep] = useState<1 | 2>(1);
  const [identifier, setIdentifier] = useState('');
  const [targetMasked, setTargetMasked] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // États d'UI
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Soumission par Matricule (Étudiant)
  const handleMatriculeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMatricule = matricule.trim();
    if (!cleanMatricule) {
      toast.error('Veuillez renseigner votre numéro matricule.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/api/v1/auth/forgot-password/by-matricule', {
        matricule: cleanMatricule
      });
      setMatriculeSuccess({
        student_name: res.data.student_name,
        matricule: res.data.matricule,
        university_name: res.data.university_name
      });
      toast.success('Demande transmise avec succès à votre établissement !');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Matricule introuvable. Veuillez vérifier votre saisie.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Étape 1 OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = identifier.trim();
    if (!cleanId) {
      toast.error('Veuillez saisir votre adresse email institutionnelle.');
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

      if (res.data?.dev_otp) {
        setDevOtp(res.data.dev_otp);
        setOtpCode(res.data.dev_otp);
        toast(`Code de sécurité : ${res.data.dev_otp}`, { icon: '🔑', duration: 12000 });
      } else {
        setDevOtp(null);
        toast.success(res.data?.message || `Code envoyé à ${masked}`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur lors de l’envoi du code.');
    } finally {
      setLoading(false);
    }
  };

  // Étape 2 OTP
  const handleVerifyOtpAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      toast.error('Veuillez saisir le code reçu.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/api/v1/auth/forgot-password/verify-otp', {
        identifier: identifier.trim(),
        otp_code: otpCode.trim(),
        new_password: newPassword
      });

      if (res.data?.access_token) {
        localStorage.setItem('token', res.data.access_token);
        if (res.data.user) {
          localStorage.setItem('user', JSON.stringify(res.data.user));
          localStorage.setItem('role', res.data.user.role);
        }
      }

      toast.success('Mot de passe réinitialisé ! Connexion en cours...');
      setTimeout(() => {
        router.push('/login');
      }, 1500);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Code erroné ou expiré.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1d36] to-[#132742] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        
        {/* Logo / Marque */}
        <div className="text-center mb-6">
          <Link href="/login" className="inline-flex items-center gap-2 text-white font-bold text-xl hover:opacity-90 transition-opacity">
            <div className="w-9 h-9 bg-gradient-to-br from-[#FF6B00] to-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/25">
              <KeyRound size={20} />
            </div>
            <span>UniSphere <span className="text-[#FF6B00]">AI</span></span>
          </Link>
          <p className="text-xs text-slate-400 mt-2">Récupération d'accès sécurisée</p>
        </div>

        {/* Carte */}
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 sm:p-8 space-y-6">
          
          {/* Onglets : Étudiant (Matricule) vs Personnel (Email) */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setResetMode('matricule');
                setMatriculeSuccess(null);
              }}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                resetMode === 'matricule'
                  ? 'bg-[#FF6B00] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap size={15} />
              <span>Étudiant (Matricule)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setResetMode('otp');
                setMatriculeSuccess(null);
              }}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                resetMode === 'otp'
                  ? 'bg-[#0a1628] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 size={14} className={resetMode === 'otp' ? 'text-[#FF6B00]' : 'text-slate-400'} />
              <span>Personnel (Email)</span>
            </button>
          </div>

          {/* ================================================== */}
          {/* MODE ÉTUDIANT : PAR MATRICULE                      */}
          {/* ================================================== */}
          {resetMode === 'matricule' && (
            <div>
              {matriculeSuccess ? (
                <div className="space-y-4 text-center py-2">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 size={32} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">Demande transmise !</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Une demande a été envoyée au secrétariat de <strong className="text-slate-800">{matriculeSuccess.university_name}</strong> pour l'étudiant :
                    </p>
                    <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs space-y-1">
                      <p><span className="text-slate-500">Nom :</span> <strong className="text-slate-800">{matriculeSuccess.student_name}</strong></p>
                      <p><span className="text-slate-500">Matricule :</span> <strong className="font-mono text-[#FF6B00]">{matriculeSuccess.matricule}</strong></p>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-3">
                      Votre secrétariat ou administration générera votre mot de passe temporaire sur présentation de votre carte ou pièce d'identité.
                    </p>
                  </div>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center gap-2 w-full py-2.5 bg-[#FF6B00] hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-md transition-all"
                  >
                    <ArrowLeft size={14} />
                    Retour à la connexion
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleMatriculeSubmit} className="space-y-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Mot de passe oublié Étudiant</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Entrez votre numéro matricule officiel. Votre secrétariat recevra immédiatement une demande pour réinitialiser vos accès.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Numéro Matricule
                    </label>
                    <input
                      type="text"
                      value={matricule}
                      onChange={(e) => setMatricule(e.target.value)}
                      placeholder="Ex: UN-2026-0001 ou AD-2026-0002"
                      disabled={loading}
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:bg-white transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-[#FF6B00] hover:bg-orange-600 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-md shadow-orange-500/25 transition-all cursor-pointer disabled:opacity-60"
                  >
                    {loading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        <Send size={15} />
                        <span>Transmettre au secrétariat</span>
                      </>
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <Link
                      href="/login"
                      className="text-xs text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 font-medium transition-colors"
                    >
                      <ArrowLeft size={13} />
                      Retour à la page de connexion
                    </Link>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ================================================== */}
          {/* MODE PERSONNEL : PAR EMAIL & CODE OTP              */}
          {/* ================================================== */}
          {resetMode === 'otp' && (
            <div>
              {step === 1 ? (
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Récupération par Email</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Réservé aux enseignants et au personnel administratif disposant d'une adresse email active.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Adresse Email
                    </label>
                    <input
                      type="email"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="nom@universite.edu"
                      disabled={loading}
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:bg-white transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-[#0a1628] hover:bg-[#132742] text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-60"
                  >
                    {loading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        <span>Envoyer le code de sécurité</span>
                        <ArrowRight size={15} />
                      </>
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <Link
                      href="/login"
                      className="text-xs text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 font-medium transition-colors"
                    >
                      <ArrowLeft size={13} />
                      Retour à la page de connexion
                    </Link>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtpAndReset} className="space-y-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Nouveau mot de passe</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Code envoyé à <strong className="text-slate-800">{targetMasked}</strong>
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Code à 6 chiffres
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      disabled={loading}
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Nouveau mot de passe
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Au moins 6 caractères"
                      disabled={loading}
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Confirmer le mot de passe
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Retapez le mot de passe"
                      disabled={loading}
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:bg-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-[#FF6B00] hover:bg-orange-600 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-60"
                  >
                    {loading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck size={15} />
                        <span>Enregistrer le nouveau mot de passe</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
