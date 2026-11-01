'use client';
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Eye, EyeOff, Lock, Smartphone, ShieldCheck,
  GraduationCap, Sparkles, User, ArrowRight, Home
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';
import RegisterModal from '@/components/landing/RegisterModal';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [universityInfo, setUniversityInfo] = useState<{
    name: string;
    slogan: string;
    academic_year: string;
  }>({
    name: "UniSphere AI",
    slogan: "Ensemble pour une université intelligente",
    academic_year: "2026-2027"
  });

  useEffect(() => {
    const message = searchParams.get('message');
    if (message) {
      toast(message, { icon: '✉️', duration: 8000 });
    }
    // Charger le contexte dynamique de l'établissement si disponible
    api.get('/api/v1/auth/context')
      .then(res => {
        if (res.data?.university?.name) {
          setUniversityInfo({
            name: res.data.university.name,
            slogan: res.data.university.slogan || "Ensemble pour une université intelligente",
            academic_year: res.data.university.academic_year || "2026-2027"
          });
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

      // Vérifier si une redirection spécifique est demandée
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
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-10 overflow-hidden font-sans bg-[#031B63]">
      
      {/* Halo lumineux ambiant aux couleurs officielles UniSphere AI (#0754C7 Bleu & #FF7900 Orange) */}
      <div className="absolute top-[-15%] left-[-10%] w-[550px] h-[550px] rounded-full bg-[#0754C7]/30 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[550px] h-[550px] rounded-full bg-[#FF7900]/20 blur-[140px] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-tr from-[#031B63] via-[#0A1628] to-[#031B63] opacity-95" />

      {/* Conteneur Responsif */}
      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">

        {/* ============================================================ */}
        {/* VOLET GAUCHE — IDENTITÉ UNISPHERE AI & ENGAGEMENTS ACADÉMIQUES */}
        {/* ============================================================ */}
        <div className="lg:col-span-6 space-y-6 text-white text-center lg:text-left">
          
          {/* Badge Année Académique */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-orange-400 text-xs font-semibold shadow-sm">
            <Sparkles size={14} className="text-[#FF7900]" />
            <span>Année Académique {universityInfo.academic_year}</span>
          </div>

          {/* Titre Principal de la Plateforme (Zero ECOB en dur) */}
          <div className="space-y-3">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
              UniSphere <span className="text-[#FF7900]">AI</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-300 font-medium">
              {universityInfo.slogan}
            </p>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto lg:mx-0">
              Plateforme Universitaire Intelligente • Pilotage académique LMD, relevés sécurisés CAMES et contrôle des accès.
            </p>
          </div>

          {/* 2 Puces de Sécurité & Accès Hybride */}
          <div className="space-y-3 pt-2 max-w-md mx-auto lg:mx-0">
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.06] backdrop-blur-md border border-white/10 text-xs sm:text-sm text-slate-200 shadow-sm">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck size={18} />
              </div>
              <span className="font-semibold text-slate-100">Normes CAMES • Empreinte Cryptographique QR Code</span>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.06] backdrop-blur-md border border-white/10 text-xs sm:text-sm text-slate-200 shadow-sm">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <Smartphone size={18} />
              </div>
              <span className="font-semibold text-slate-100">Accès Hybride : Web Sécurisé, Mobile PWA & Application APK</span>
            </div>
          </div>

          {/* Pied Gauche : Téléchargement APK Production & Statut */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>UniSphere AI • Production Sécurisée</span>
            </span>
            <Link
              href="/download"
              className="text-[#FF7900] hover:text-orange-300 transition-colors flex items-center gap-1 font-bold text-xs"
            >
              <span>Télécharger l'APK</span>
              <ArrowRight size={13} />
            </Link>
          </div>

        </div>

        {/* ============================================================ */}
        {/* VOLET DROIT — CARTE DE CONNEXION ÉLÉGANTE                     */}
        {/* ============================================================ */}
        <div className="lg:col-span-6 w-full max-w-md mx-auto bg-white rounded-3xl shadow-2xl shadow-black/40 border border-slate-100 p-6 sm:p-9 relative">
          
          {/* En-tête de la Carte */}
          <div className="flex items-center justify-between pb-6 border-b border-slate-100 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#FF7900] to-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/25">
                <GraduationCap size={24} />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Portail Académique</h2>
                <p className="text-xs text-slate-500 font-medium">Espace Sécurisé • Authentification Unique</p>
              </div>
            </div>

            <Link
              href="/"
              title="Retour à l'accueil"
              className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors border border-slate-200/60"
            >
              <Home size={18} />
            </Link>
          </div>

          {/* Formulaire de Connexion */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Champ Identifiant (Email ou Matricule) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
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
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF7900] focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Champ Mot de Passe */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Mot de passe
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] text-[#FF7900] hover:underline font-semibold"
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
                  className="w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF7900] focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  aria-label="Afficher ou masquer le mot de passe"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Case Se Souvenir de Moi */}
            <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-[#FF7900] focus:ring-[#FF7900] w-4 h-4"
                />
                <span className="font-medium text-slate-700">Garder ma session active</span>
              </label>
            </div>

            {/* Bouton de Connexion Principal */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-[#FF7900] to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed text-sm"
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

          {/* Lien Contact Administration si pas de compte */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Vous n'avez pas de compte ?{' '}
              <button
                type="button"
                onClick={() => setContactModalOpen(true)}
                className="text-[#FF7900] font-bold hover:underline cursor-pointer"
              >
                Contactez l'administration
              </button>
            </p>
          </div>

          {/* Pied de Carte Sécurisé */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-500" />
              Chiffrement TLS 256-bit
            </span>
            <span>UniSphere AI LMD</span>
          </div>

        </div>

      </div>

      {/* Modale de Contact Direct (Appel & WhatsApp Moussa Coulibaly) */}
      <RegisterModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        onSwitchToLogin={() => setContactModalOpen(false)}
      />

    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#031B63] flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-[#FF7900] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
