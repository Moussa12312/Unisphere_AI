'use client';
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Eye, EyeOff, Lock, Smartphone, ShieldCheck,
  GraduationCap, Sparkles, User, ArrowRight
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [universityInfo, setUniversityInfo] = useState<{
    name: string;
    slogan: string;
    address: string;
    academic_year: string;
  }>({
    name: "ECOB",
    slogan: "Excellence & Innovation Académique",
    address: "Hamdallaye ACI 2000, Bamako, Mali",
    academic_year: "2026-2027"
  });

  useEffect(() => {
    const message = searchParams.get('message');
    if (message) {
      toast(message, { icon: '✉️', duration: 8000 });
    }
    // Charger le contexte de l'université
    api.get('/api/v1/auth/context')
      .then(res => {
        if (res.data?.university) {
          setUniversityInfo(res.data.university);
        }
      })
      .catch(() => {});
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      toast.error('Veuillez saisir votre identifiant et votre mot de passe');
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
      const userData = data.user;
      const token = data.access_token;

      if (!token || !userData) {
        throw new Error('Réponse invalide du serveur d’authentification');
      }

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('role', userData.role);
      if (typeof document !== 'undefined') {
        document.cookie = "unisphere_token=" + token + "; path=/; max-age=604800; SameSite=Lax";
        document.cookie = "unisphere_role=" + userData.role + "; path=/; max-age=604800; SameSite=Lax";
      }

      try {
        await api.post('/api/v1/notifications/generate');
      } catch {
        // Non bloquant
      }

      toast.success(`Connexion réussie : Bienvenue ${userData.full_name || ''} !`);

      // Vérifier s'il y a une redirection demandée (ex: /superadmin/dashboard)
      const redirectUrl = searchParams.get('redirect');
      if (redirectUrl && redirectUrl.startsWith('/') && !redirectUrl.startsWith('//')) {
        window.location.href = redirectUrl;
        return;
      }

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

      const targetRoute = routes[userData.role] || '/login';
      window.location.href = targetRoute;

    } catch (error: any) {
      setLoading(false);
      if (error.response?.status === 403 && String(error.response?.data?.detail || '').toLowerCase().includes('suspendu')) {
        window.location.href = '/suspended';
        return;
      }
      let message = 'Identifiant ou mot de passe incorrect';
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (Array.isArray(detail)) {
          message = detail.map((err: any) => err.msg).join(', ');
        } else if (typeof detail === 'string') {
          message = detail;
        }
      }
      toast.error(message);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-3 sm:p-6 lg:p-10 overflow-hidden font-sans">
      {/* Photo de fond institutionnelle */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700 scale-105"
        style={{ backgroundImage: `url('/login.png')` }}
      />
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/95 via-slate-900/85 to-[#1e1b4b]/80 backdrop-blur-[4px]" />

      {/* Conteneur Responsif */}
      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

        {/* Volet de Gauche : Identité Institutionnelle (Visible Desktop) */}
        <div className="hidden lg:flex lg:col-span-5 flex-col justify-between text-white p-6 space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md text-xs font-semibold text-orange-300">
              <Sparkles size={14} className="text-[#FF6B00]" />
              <span>Année Académique {universityInfo?.academic_year || '2026-2027'}</span>
            </div>

            <h1 className="text-4xl xl:text-5xl font-black tracking-tight leading-tight">
              {universityInfo?.name || 'ECOB'}
            </h1>

            <p className="text-slate-300 text-sm font-medium leading-relaxed">
              {universityInfo?.slogan || 'Portail Universitaire Intelligent & Système Intégré de Gestion Académique.'}
            </p>

            <div className="space-y-3 pt-3">
              <div className="flex items-center gap-3 text-xs text-slate-300 bg-white/5 p-3 rounded-xl border border-white/10 backdrop-blur-sm">
                <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
                <span>Normes CAMES • Empreinte Cryptographique QR Code</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300 bg-white/5 p-3 rounded-xl border border-white/10 backdrop-blur-sm">
                <Smartphone size={18} className="text-cyan-400 shrink-0" />
                <span>Accès Hybride : Web Sécurisé, Mobile PWA & Application APK</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
            <span>UniSphere AI • <strong>Production</strong></span>
            <Link href="/download" className="text-[#FF6B00] hover:underline font-semibold flex items-center gap-1">
              Télécharger l'APK <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* Volet de Droite : Carte de Connexion Propre */}
        <div className="lg:col-span-7 bg-white/95 backdrop-blur-xl rounded-3xl p-6 sm:p-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border border-white/40">

          {/* Header Carte de Connexion */}
          <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#FF6B00] to-orange-500 text-white font-black text-xl flex items-center justify-center shadow-lg shadow-orange-500/25">
                <GraduationCap size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Portail Académique
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  {universityInfo?.name || 'ECOB'} • Espace Sécurisé
                </p>
              </div>
            </div>

            <Link
              href="/"
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg"
            >
              Accueil
            </Link>
          </div>

          {/* Formulaire Officiel Unique et Propre */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Identifiant
                </label>
                <span className="text-[11px] text-slate-400 font-medium">Email ou matricule</span>
              </div>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="ex: nom@etablissement.edu ou matricule"
                  required
                  autoFocus
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Mot de passe
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] text-[#FF6B00] hover:underline font-semibold"
                >
                  Mot de passe oublié ?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label="Afficher ou masquer le mot de passe"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-[#FF6B00] focus:ring-[#FF6B00] w-4 h-4"
                />
                <span className="font-medium text-slate-700">Garder ma session active</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-[#FF6B00] to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Vérification des accès...</span>
                </>
              ) : (
                <>
                  <span>Se connecter</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Pied de Carte Sécurisé */}
          <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-500" />
              Chiffrement TLS 256-bit
            </span>
            <span>UniSphere AI LMD</span>
          </div>

        </div>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B00] border-t-transparent"></div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
