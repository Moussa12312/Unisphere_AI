'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { User, GraduationCap, Building2, ArrowRight, AlertCircle, Smartphone } from 'lucide-react';
import UniSphereLogo from './UniSphereLogo';
import PasswordInput from './PasswordInput';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface LoginFormProps {
  onOpenContactAdmin?: () => void;
}

export default function LoginForm({ onOpenContactAdmin }: LoginFormProps) {
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
        toast('Veuillez choisir votre établissement pour cette session');
        window.location.href = '/select-university';
        return;
      }

      try {
        await api.post('/api/v1/notifications/generate');
      } catch {
        // Non bloquant
      }

      toast.success(`Bienvenue ${userData.full_name || 'sur UniSphere AI'}`);

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
          "Connexion au serveur impossible. Vérifiez votre accès réseau."
        );
      } else {
        setErrorMessage('Identifiant ou mot de passe incorrect.');
      }
    }
  };

  return (
    <div className="w-full max-w-[420px] mx-auto">
      {/* Logo visible sur mobile uniquement (sur desktop il est dans le panneau gauche) */}
      <div className="flex lg:hidden justify-center mb-5">
        <UniSphereLogo variant="dark" size="sm" showSlogan={false} />
      </div>

      {/* Carte d'authentification */}
      <div className="bg-white rounded-3xl shadow-[0_20px_50px_-12px_rgba(10,22,40,0.12)] border border-slate-200/80 p-6 sm:p-8 relative overflow-hidden">
        {/* Liseré supérieur aux couleurs UniSphere */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#0a1628] via-[#FF6B00] to-[#0a1628]" />

        {/* En-tête */}
        <div className="mb-5">
          <div className="hidden lg:flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-[#FF6B00]" />
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
              Authentification Sécurisée
            </span>
          </div>
          <h2 className="text-2xl font-black text-[#0a1628] tracking-tight">
            Connexion à votre espace
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {isStudentMode
              ? 'Saisissez votre matricule étudiant et votre mot de passe'
              : 'Administration, comptabilité, secrétariat et enseignants'}
          </p>
        </div>

        {/* Sélecteur de profil segmenté (Zéro encombrement vertical) */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl mb-5">
          <button
            type="button"
            onClick={() => {
              setIsStudentMode(false);
              setErrorMessage(null);
            }}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              !isStudentMode
                ? 'bg-[#0a1628] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 size={14} className={!isStudentMode ? 'text-[#FF6B00]' : 'text-slate-400'} />
            <span>Personnel & Admin</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsStudentMode(true);
              setErrorMessage(null);
            }}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              isStudentMode
                ? 'bg-[#FF6B00] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GraduationCap size={15} />
            <span>Portail Étudiant</span>
          </button>
        </div>

        {/* Alerte d'erreur */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-700">
            <AlertCircle size={15} className="text-rose-500 shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              {isStudentMode ? 'Matricule ou Email étudiant' : 'Identifiant'}
            </label>
            <div className="relative group">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#FF6B00] transition-colors pointer-events-none">
                <User size={17} />
              </div>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={loading}
                placeholder={
                  isStudentMode
                    ? 'Ex: EC-2026-0001 ou email'
                    : 'Email, matricule ou N° utilisateur'
                }
                autoFocus
                required
                className="w-full pl-10 pr-3.5 py-2.5 sm:py-3 bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-[#FF6B00] focus:ring-3 focus:ring-[#FF6B00]/15 rounded-xl text-slate-900 text-sm font-medium placeholder-slate-400 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700">
                Mot de passe
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-[#FF6B00] hover:text-[#e05e00] font-bold hover:underline transition-colors"
              >
                Mot de passe oublié ?
              </Link>
            </div>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              placeholder="Votre mot de passe"
              required
            />
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-600 font-medium hover:text-slate-900">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-[#FF6B00] focus:ring-[#FF6B00] accent-[#FF6B00]"
              />
              <span>Maintenir ma session active</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#ea580c] hover:from-[#e66000] hover:to-[#d94e06] active:scale-[0.99] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#FF6B00]/25 hover:shadow-[#FF6B00]/40 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Vérification en cours...</span>
              </>
            ) : (
              <>
                <span>Se connecter</span>
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>

        {/* Pied de carte */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col items-center gap-2 text-xs text-slate-500">
          <div>
            <span>Aucun compte actif ? </span>
            <button
              type="button"
              onClick={() => {
                if (onOpenContactAdmin) {
                  onOpenContactAdmin();
                } else {
                  window.location.href = 'tel:+22373343493';
                }
              }}
              className="text-[#0a1628] hover:text-[#FF6B00] font-bold hover:underline cursor-pointer transition-colors"
            >
              Contacter l’administration
            </button>
          </div>

          <Link
            href="/download"
            className="lg:hidden inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#FF6B00] hover:underline"
          >
            <Smartphone size={13} />
            <span>Télécharger l’application Android (APK)</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
