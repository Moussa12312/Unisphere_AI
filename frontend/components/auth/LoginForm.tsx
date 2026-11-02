'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { User, GraduationCap, ArrowRight, AlertCircle, Smartphone, Lock } from 'lucide-react';
import UniSphereLogo from './UniSphereLogo';
import PasswordInput from './PasswordInput';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface LoginFormProps {
  onOpenContactAdmin?: () => void;
}

export default function LoginForm({ onOpenContactAdmin }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isStudentMode, setIsStudentMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setErrorMessage(null);

    if (!identifier.trim()) {
      setErrorMessage('Veuillez saisir votre identifiant (matricule, email ou N° utilisateur).');
      return;
    }

    if (!password) {
      setErrorMessage('Veuillez saisir votre mot de passe.');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/api/v1/auth/login', {
        email: identifier.trim().toLowerCase(),
        password: password,
        remember_me: rememberMe,
      });

      const data = response.data;
      const userData = data?.user;
      const token = data?.access_token;

      if (!token || !userData) {
        throw new Error('Identifiants invalides ou réponse inattendue du serveur.');
      }

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('role', userData.role);

      if (typeof document !== 'undefined') {
        const maxAge = rememberMe ? 2592000 : 1296000;
        document.cookie = `unisphere_token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
        document.cookie = `unisphere_role=${userData.role}; path=/; max-age=${maxAge}; SameSite=Lax`;
      }

      if (data.requires_university_selection) {
        localStorage.setItem('affiliations', JSON.stringify(data.affiliations || []));
        toast('Veuillez choisir votre établissement de travail pour cette session', { icon: '🏛️' });
        window.location.href = '/select-university';
        return;
      }

      try {
        await api.post('/api/v1/notifications/generate');
      } catch {
        // Non bloquant
      }

      toast.success(`Bienvenue ${userData.full_name || 'sur UniSphere AI'} !`);

      const redirectUrl = searchParams.get('redirect');
      if (redirectUrl && redirectUrl.startsWith('/') && !redirectUrl.startsWith('//')) {
        window.location.href = redirectUrl;
        return;
      }

      const roleRoutes: Record<string, string> = {
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

      const target = roleRoutes[userData.role] || '/';
      window.location.href = target;

    } catch (error: any) {
      setLoading(false);

      if (error.response?.status === 403 && String(error.response?.data?.detail || '').toLowerCase().includes('suspendu')) {
        window.location.href = '/suspended';
        return;
      }

      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (Array.isArray(detail)) {
          setErrorMessage(detail.map((err: any) => err.msg).join(', '));
        } else {
          setErrorMessage(String(detail));
        }
      } else if (!error.response) {
        setErrorMessage(
          "Impossible de joindre le serveur d'authentification. Vérifiez votre connexion."
        );
      } else {
        setErrorMessage('Identifiant ou mot de passe incorrect.');
      }
    }
  };

  const handleStudentAccess = () => {
    setIsStudentMode(!isStudentMode);
    setErrorMessage(null);
    if (!isStudentMode) {
      toast('Mode Étudiant activé : saisissez votre matricule.', {
        icon: '🎓',
        duration: 3500,
      });
    }
  };

  return (
    <div className="w-full max-w-[430px] mx-auto bg-white rounded-3xl shadow-[0_12px_40px_-10px_rgba(3,27,99,0.12)] border border-slate-200/80 p-6 sm:p-8 transition-all">

      {/* 1. Logo UniSphere AI centré */}
      <div className="flex flex-col items-center justify-center text-center">
        <UniSphereLogo variant="dark" size="sm" showSlogan={false} />

        {/* Ligne séparatrice avec texte "Plateforme Universitaire Intelligente" */}
        <div className="w-full flex items-center gap-2.5 my-3">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            Plateforme Universitaire Intelligente
          </span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* Titres */}
        <h2 className="text-2xl font-black text-[#031B63] tracking-tight">
          Connexion
        </h2>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          {isStudentMode ? 'Espace Étudiant LMD • Accès Direct' : 'Accédez à votre espace institutionnel'}
        </p>
      </div>

      {/* Message d'erreur visible */}
      {errorMessage && (
        <div className="mt-3.5 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-700 animate-in fade-in duration-200">
          <AlertCircle size={15} className="text-rose-500 shrink-0 mt-0.5" />
          <span className="font-medium leading-relaxed">{errorMessage}</span>
        </div>
      )}

      {/* 2. Formulaire */}
      <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">

        {/* Premier champ : Identifiant */}
        <div className="space-y-1">
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <User size={17} />
            </div>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              disabled={loading}
              placeholder={
                isStudentMode
                  ? 'Matricule Étudiant (ex: EC-2026-0001)'
                  : 'Identifiant (Matricule, Email ou N° utilisateur)'
              }
              autoFocus
              required
              className="w-full pl-10 pr-3.5 py-3 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-[#0754C7] focus:ring-2 focus:ring-[#0754C7]/20 rounded-xl text-slate-900 text-sm font-medium placeholder-slate-400 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Deuxième champ : Mot de passe */}
        <div className="space-y-1">
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            placeholder="Mot de passe"
            required
          />
        </div>

        {/* Ligne sous les champs : Se souvenir de moi & Mot de passe oublié */}
        <div className="flex items-center justify-between text-xs pt-0.5">
          <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 font-medium hover:text-slate-900">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-slate-300 text-[#FF6B00] focus:ring-[#FF6B00]"
            />
            <span>Se souvenir de moi</span>
          </label>

          <Link
            href="/forgot-password"
            className="text-[#0754C7] hover:underline font-semibold transition-colors"
          >
            Mot de passe oublié ?
          </Link>
        </div>

        {/* Bouton Principal : Se connecter */}
        <div className="pt-1.5">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-5 rounded-xl bg-[#FF6B00] hover:bg-[#e66000] active:scale-[0.99] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-orange-500/25 hover:shadow-orange-500/35 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Connexion en cours...</span>
              </>
            ) : (
              <>
                <span>Se connecter</span>
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </div>

        {/* Séparation OU */}
        <div className="flex items-center gap-3 py-0.5">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-[11px] uppercase font-semibold text-slate-400">
            ou
          </span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* Bouton Secondaire : Accès étudiant */}
        <div>
          <button
            type="button"
            onClick={handleStudentAccess}
            className={`w-full py-2.5 px-5 rounded-xl border border-[#031B63] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isStudentMode
                ? 'bg-[#031B63] text-white hover:bg-[#031B63]/90 shadow-sm'
                : 'bg-white hover:bg-slate-50 text-[#031B63]'
            }`}
          >
            <GraduationCap size={17} className={isStudentMode ? 'text-white' : 'text-[#031B63]'} />
            <span>{isStudentMode ? '✓ Mode Étudiant activé' : 'Accès Étudiant Direct'}</span>
          </button>
        </div>

        {/* En bas : Vous n'avez pas de compte ? Contactez l'administration */}
        <div className="pt-1 text-center text-xs text-slate-500">
          <span>Vous n’avez pas de compte ? </span>
          <button
            type="button"
            onClick={() => {
              if (onOpenContactAdmin) {
                onOpenContactAdmin();
              } else {
                window.location.href = 'tel:+22373343493';
              }
            }}
            className="text-[#0754C7] font-bold hover:underline cursor-pointer inline-flex items-center gap-0.5"
          >
            Contactez l’administration
          </button>
        </div>

        {/* Accès Téléchargement APK */}
        <div className="pt-2 text-center border-t border-slate-100">
          <Link
            href="/download"
            className="text-[11px] text-slate-500 hover:text-[#FF6B00] font-medium inline-flex items-center gap-1.5 transition-colors"
          >
            <Smartphone size={13} className="text-[#FF6B00]" />
            <span>Télécharger l’Application Mobile (APK Android)</span>
          </Link>
        </div>

      </form>

    </div>
  );
}
