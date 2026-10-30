'use client';
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Eye, EyeOff, Mail, Lock, Smartphone, ShieldCheck,
  GraduationCap, Sparkles, Building2, User, CheckCircle2, ArrowRight
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

const DEFAULT_AUTH_CONTEXT = {
  university: {
    name: "UniSphere AI",
    slogan: "Excellence & Innovation Académique",
    address: "Plateforme SaaS Multi-Universités",
    academic_year: "2026-2027"
  },
  quick_accounts: [
    { role: "super_admin", label: "Super Admin", email: "superadmin@unisphere.ai", name: "Moussa Coulibaly", department: "Plateforme SaaS", icon: "👑" },
    { role: "admin", label: "Direction", email: "admin@unisphere.ai", name: "Direction Université", department: "Administration", icon: "🏛️" },
    { role: "teacher", label: "Professeur", email: "enseignant@unisphere.ai", name: "Corps Professoral", department: "Pédagogie", icon: "👨‍🏫" },
    { role: "student", label: "Étudiant", email: "etudiant@unisphere.ai", name: "Espace Étudiant", matricule: "EC-2026-0001", department: "LMD", icon: "🎓" },
    { role: "secretary", label: "Secrétaire", email: "secretaire@unisphere.ai", name: "Secrétariat Général", department: "Scolarité", icon: "📋" },
    { role: "censeur", label: "Censeur", email: "censeur@unisphere.ai", name: "Direction des Études", department: "Études", icon: "⚖️" },
    { role: "accountant", label: "Comptable", email: "comptable@unisphere.ai", name: "Service Financier", department: "Finances", icon: "💳" },
    { role: "guard", label: "Poste Garde", email: "gardien@unisphere.ai", name: "Sécurité & Portique", department: "Contrôle", icon: "🛡️" }
  ],
  default_password: "unisphere2026"
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeQuickEmail, setActiveQuickEmail] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);
  const [authContext, setAuthContext] = useState<any>(DEFAULT_AUTH_CONTEXT);

  useEffect(() => {
    const message = searchParams.get('message');
    if (message) {
      toast(message, { icon: '✉️', duration: 8000 });
    }
    // Charger le contexte mis à jour depuis le backend Django
    api.get('/api/v1/auth/context')
      .then(res => {
        if (res.data) setAuthContext(res.data);
      })
      .catch(() => {
        // En cas d'erreur, conserve DEFAULT_AUTH_CONTEXT
      });
  }, [searchParams]);

  const performLogin = async (loginEmail: string, loginPassword: string) => {
    setLoading(true);
    setIdentifier(loginEmail);
    setPassword(loginPassword);

    try {
      const response = await api.post('/api/v1/auth/login', {
        email: loginEmail.trim(),
        password: loginPassword,
        remember_me: rememberMe
      });

      const data = response.data;
      const userData = data.user;
      const token = data.access_token;

      if (!token || !userData) {
        throw new Error('Réponse invalide du serveur');
      }

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('role', userData.role);

      try {
        await api.post('/api/v1/notifications/generate');
      } catch {
        // Non bloquant
      }

      toast.success(`Connexion réussie : Bienvenue ${userData.full_name || ''} !`);

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
      setActiveQuickEmail(null);
      setLoading(false);
      if (error.response?.status === 403 && String(error.response?.data?.detail || '').toLowerCase().includes('suspendu')) {
        window.location.href = '/suspended';
        return;
      }
      let message = 'Erreur de connexion';
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

  const handleQuickLogin = (email: string) => {
    if (loading) return;
    const pwd = authContext?.default_password || 'unisphere2026';
    setActiveQuickEmail(email);
    performLogin(email, pwd);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      toast.error('Veuillez saisir votre identifiant et votre mot de passe');
      return;
    }
    setActiveQuickEmail(null);
    performLogin(identifier, password);
  };

  const quickAccounts = authContext?.quick_accounts || DEFAULT_AUTH_CONTEXT.quick_accounts;
  const university = authContext?.university;

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-3 sm:p-6 lg:p-10 overflow-hidden font-sans">
      {/* Photo de fond conservée avec superposition sombre & dynamique */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700 scale-105"
        style={{ backgroundImage: `url('/login.png')` }}
      />
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/95 via-slate-900/80 to-[#1e1b4b]/75 backdrop-blur-[4px]" />

      {/* Conteneur Hybride Responsif */}
      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">

        {/* Volet de Gauche : Identité Institutionnelle ECOB (Visible Desktop) */}
        <div className="hidden lg:flex lg:col-span-5 flex-col justify-between text-white p-6 space-y-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md text-xs font-semibold text-orange-300">
              <Sparkles size={14} className="text-[#FF6B00]" />
              <span>Année Académique {university?.academic_year || '2026-2027'}</span>
            </div>

            <h1 className="text-4xl xl:text-5xl font-black tracking-tight leading-tight">
              UniSphere <span className="bg-gradient-to-r from-[#FF6B00] via-orange-400 to-amber-300 bg-clip-text text-transparent">AI</span>
            </h1>

            <p className="text-slate-300 text-sm font-medium leading-relaxed">
              Plateforme Universitaire Intelligente & Système Intégré de Gestion Académique (LMD).
            </p>

            <div className="space-y-3 pt-3">
              <div className="flex items-center gap-3 text-xs text-slate-300 bg-white/5 p-3 rounded-xl border border-white/10 backdrop-blur-sm">
                <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
                <span>Portail Sécurisé & Certifié • Zéro Donnée Factice</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300 bg-white/5 p-3 rounded-xl border border-white/10 backdrop-blur-sm">
                <Smartphone size={18} className="text-cyan-400 shrink-0" />
                <span>Accès Hybride : Web, Mobile PWA & Application APK</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
            <span>UniSphere AI • <strong>Version Hybride 2.0</strong></span>
            <Link href="/download" className="text-[#FF6B00] hover:underline font-semibold flex items-center gap-1">
              Télécharger l'APK <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* Volet de Droite : Carte de Connexion Verre Dépoli */}
        <div className="lg:col-span-7 bg-white/95 backdrop-blur-xl rounded-3xl p-5 sm:p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border border-white/40">

          {/* Header Mobile / Tablette */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#FF6B00] to-orange-500 text-white font-black text-xl flex items-center justify-center shadow-lg shadow-orange-500/25">
                <GraduationCap size={22} />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  UniSphere <span className="text-[#FF6B00]">AI</span>
                </h2>
                <p className="text-[11px] text-slate-500 font-medium">Espace d'Authentification Centralisé</p>
              </div>
            </div>

            <Link
              href="/download"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#FF6B00] text-xs font-bold transition-all border border-orange-200"
            >
              <Smartphone size={14} />
              <span className="hidden sm:inline">App APK</span>
            </Link>
          </div>

          {/* Formulaire de Connexion */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Identifiant de Connexion
                </label>
                <span className="text-[10px] text-slate-400 font-medium">Email ou Matricule</span>
              </div>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="ex: admin@unisphere.ai, enseignant, ou matricule..."
                  required
                  className="w-full pl-11 pr-4 py-3 bg-slate-50/70 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent transition-all"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Portail universel : Administrateur, Professeur, Secrétaire, Comptable, Censeur, Vigile & Étudiant
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Mot de passe
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-[#FF6B00] hover:underline font-semibold"
                >
                  Oublié ?
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
                  placeholder="Votre mot de passe"
                  required
                  className="w-full pl-11 pr-11 py-3 bg-slate-50/70 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-[#FF6B00] border-slate-300 rounded focus:ring-[#FF6B00]"
                />
                <span>Mémoriser ma session</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-[#FF6B00] to-orange-600 hover:from-orange-500 hover:to-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-500/25 transition-all transform active:scale-[0.99] disabled:opacity-50 text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Authentification en cours...</span>
                </>
              ) : (
                <span>Se connecter à UniSphere AI</span>
              )}
            </button>
          </form>

          {/* Connexion Rapide (Les vrais comptes de la base de données) */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <span>⚡ Accès Rapide Démo (Connexion Directe 1 Clic)</span>
              </span>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                Données Réelles
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {quickAccounts.map((acc: any) => {
                const isSelected = activeQuickEmail === acc.email && loading;
                return (
                  <button
                    key={acc.email}
                    type="button"
                    disabled={loading}
                    onClick={() => handleQuickLogin(acc.email)}
                    title={`Cliquer pour vous connecter directement en tant que ${acc.name}`}
                    className={`relative flex flex-col items-start p-2.5 rounded-xl border text-left transition-all cursor-pointer active:scale-95 select-none disabled:cursor-not-allowed ${isSelected
                        ? 'bg-orange-100/90 border-[#FF6B00] ring-2 ring-[#FF6B00]/50 shadow-md scale-[1.02]'
                        : 'bg-slate-50 hover:bg-orange-50/80 border-slate-200/90 hover:border-orange-300 shadow-xs hover:shadow-sm'
                      }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-base">{acc.icon}</span>
                      <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${isSelected
                          ? 'bg-[#FF6B00] text-white animate-pulse'
                          : 'bg-white/90 text-slate-500 border border-slate-200/60'
                        }`}>
                        {isSelected ? 'Connexion...' : acc.label}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-slate-900 truncate w-full mt-1.5">
                      {acc.name}
                    </span>
                    <span className="text-[10px] text-slate-500 truncate w-full flex items-center justify-between mt-0.5">
                      <span className="truncate">{acc.matricule || acc.filiere || acc.department || acc.role}</span>
                      {isSelected && (
                        <div className="w-3 h-3 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin shrink-0 ml-1" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-400 mt-2 text-center">
              Cliquez sur un profil pour ouvrir directement son tableau de bord sans mot de passe
            </p>
          </div>

          {/* Note Institutionnelle & Application Mobile */}
          <div className="mt-4 pt-3 border-t border-slate-100 text-center space-y-2">
            <p className="text-xs text-slate-500">
              Les accès officiels sont délivrés exclusivement par l'administration ou le secrétariat académique.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs">
              <Link
                href="/download"
                className="text-[#FF6B00] hover:underline font-semibold inline-flex items-center gap-1.5"
              >
                <span>Télécharger l'application mobile (APK Android)</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
          <span>Chargement du portail ECOB...</span>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
