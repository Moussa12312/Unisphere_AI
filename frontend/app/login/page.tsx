'use client';
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Eye, EyeOff, Lock, Smartphone, ShieldCheck,
  GraduationCap, Sparkles, User, ArrowRight,
  Crown, Building2, Users, FileText, Scale,
  CreditCard, Shield, Award, Zap, Play
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

const getQuickAccountIcon = (role: string) => {
  switch (role) {
    case 'super_admin':
    case 'superadmin':
      return <Crown size={16} className="text-amber-500" />;
    case 'admin':
      return <Building2 size={16} className="text-blue-600" />;
    case 'teacher':
      return <GraduationCap size={16} className="text-emerald-600" />;
    case 'student':
      return <Users size={16} className="text-cyan-600" />;
    case 'secretary':
      return <FileText size={16} className="text-indigo-600" />;
    case 'censeur':
      return <Scale size={16} className="text-purple-600" />;
    case 'accountant':
      return <CreditCard size={16} className="text-emerald-600" />;
    case 'guard':
      return <Shield size={16} className="text-slate-600" />;
    case 'alumni':
      return <Award size={16} className="text-orange-500" />;
    default:
      return <User size={16} className="text-slate-500" />;
  }
};

const DEFAULT_AUTH_CONTEXT = {
  university: {
    name: "ECOB",
    slogan: "Excellence & Innovation Académique",
    address: "Hamdallaye ACI 2000, Bamako, Mali",
    academic_year: "2026-2027"
  },
  quick_accounts: [
    { role: "super_admin", label: "Super Admin", email: "chakirunisphereai@gmail.com", name: "Moussa Coulibaly", department: "SaaS Platform" },
    { role: "admin", label: "Direction", email: "admin@unisphere.ai", name: "Direction ECOB", department: "Administration" },
    { role: "teacher", label: "Professeur", email: "enseignant@unisphere.ai", name: "Corps Professoral", department: "Pédagogie" },
    { role: "student", label: "Étudiant", email: "etudiant@unisphere.ai", name: "Espace Étudiant", matricule: "EC-2026-0001", department: "LMD" },
    { role: "secretary", label: "Secrétaire", email: "secretaire@unisphere.ai", name: "Secrétariat Général", department: "Scolarité" },
    { role: "censeur", label: "Censeur", email: "censeur@unisphere.ai", name: "Direction des Études", department: "Études" },
    { role: "accountant", label: "Comptable", email: "comptable@unisphere.ai", name: "Service Financier", department: "Finances" },
    { role: "guard", label: "Poste Garde", email: "gardien@unisphere.ai", name: "Sécurité & Portique", department: "Contrôle" },
    { role: "alumni", label: "Alumni", email: "alumni@unisphere.ai", name: "Moussa Fofana", department: "Réseau Diplômés" }
  ],
  default_password: "unisphere2026"
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'form' | 'demo'>('form');
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
    // Si ?demo=1 dans l'URL, basculer directement sur l'onglet démo
    if (searchParams.get('demo') === '1') {
      setActiveTab('demo');
    }
    // Charger le contexte
    api.get('/api/v1/auth/context')
      .then(res => {
        if (res.data) setAuthContext(res.data);
      })
      .catch(() => {});
  }, [searchParams]);

  const performLogin = async (loginEmail: string, loginPass: string) => {
    setLoading(true);
    try {
      const response = await api.post('/api/v1/auth/login', {
        email: loginEmail.trim().toLowerCase(),
        password: loginPass,
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

  const handleQuickLogin = (email: string) => {
    if (loading) return;
    setActiveQuickEmail(email);
    // Mot de passe super admin personnalisé ou mot de passe standard demo
    const isSuperAdmin = email.includes('chakirunisphereai') || email.includes('superadmin');
    const pwd = isSuperAdmin ? 'f7@x4-Dx5K6xe' : (authContext?.default_password || 'unisphere2026');
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
      {/* Photo de fond institutionnelle */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700 scale-105"
        style={{ backgroundImage: `url('/login.png')` }}
      />
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/95 via-slate-900/85 to-[#1e1b4b]/80 backdrop-blur-[4px]" />

      {/* Conteneur Hybride Responsif */}
      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

        {/* Volet de Gauche : Identité Institutionnelle ECOB (Visible Desktop) */}
        <div className="hidden lg:flex lg:col-span-5 flex-col justify-between text-white p-6 space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md text-xs font-semibold text-orange-300">
              <Sparkles size={14} className="text-[#FF6B00]" />
              <span>Année Académique {university?.academic_year || '2026-2027'}</span>
            </div>

            <h1 className="text-4xl xl:text-5xl font-black tracking-tight leading-tight">
              {university?.name || 'ECOB'}
            </h1>

            <p className="text-slate-300 text-sm font-medium leading-relaxed">
              {university?.slogan || 'Portail Universitaire Intelligent & Système Intégré de Gestion Académique.'}
            </p>

            <div className="space-y-3 pt-3">
              <div className="flex items-center gap-3 text-xs text-slate-300 bg-white/5 p-3 rounded-xl border border-white/10 backdrop-blur-sm">
                <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
                <span>Université Pilote Démo • Données Réelles ECOB</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300 bg-white/5 p-3 rounded-xl border border-white/10 backdrop-blur-sm">
                <Smartphone size={18} className="text-cyan-400 shrink-0" />
                <span>Accès Hybride : Web, Mobile PWA & Application APK</span>
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

        {/* Volet de Droite : Carte de Connexion Hybride */}
        <div className="lg:col-span-7 bg-white/95 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border border-white/40">

          {/* Header Carte de Connexion */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#FF6B00] to-orange-500 text-white font-black text-xl flex items-center justify-center shadow-lg shadow-orange-500/25">
                <GraduationCap size={22} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Portail Académique
                </h2>
                <p className="text-xs text-slate-500 font-medium">{university?.name || 'ECOB'} • Espace Sécurisé</p>
              </div>
            </div>

            <Link
              href="/"
              className="text-xs text-slate-400 hover:text-slate-700 font-medium transition-colors"
            >
              Accueil
            </Link>
          </div>

          {/* Sélecteur d'Onglets : Connexion Officielle vs Démo ECOB */}
          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl mb-5">
            <button
              type="button"
              onClick={() => setActiveTab('form')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'form'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Connexion Standard
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('demo')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'demo'
                  ? 'bg-[#FF6B00] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Zap size={14} />
              <span>Comptes Démo ECOB</span>
            </button>
          </div>

          {activeTab === 'form' ? (
            /* ================= MODE 1 : FORMULAIRE PROPRE & OFFICIEL ================= */
            <form onSubmit={handleSubmit} className="space-y-4">
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
                    placeholder="nom@ecobmali.com ou matricule..."
                    required
                    autoFocus
                    className="w-full pl-11 pr-4 py-3 bg-slate-50/70 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent transition-all"
                  />
                </div>
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
                    className="w-full pl-11 pr-11 py-3 bg-slate-50/70 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
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
                className="w-full py-3.5 px-4 bg-gradient-to-r from-[#FF6B00] to-orange-600 hover:from-orange-500 hover:to-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-500/25 transition-all transform active:scale-[0.99] disabled:opacity-50 text-sm flex items-center justify-center gap-2 cursor-pointer mt-1"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Authentification en cours...</span>
                  </>
                ) : (
                  <span>Se connecter à ECOB</span>
                )}
              </button>
            </form>
          ) : (
            /* ================= MODE 2 : DÉMONSTRATION ECOB & TESTS CLIENTS ================= */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-[#FF6B00]" />
                  <span>Présentations Clients • Démo 1-Clic</span>
                </p>
                <span className="text-[10px] bg-orange-100 text-[#FF6B00] font-bold px-2 py-0.5 rounded-full border border-orange-200">
                  Université Pilote ECOB
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[340px] overflow-y-auto pr-1">
                {quickAccounts.map((acc: any) => {
                  const isSelected = activeQuickEmail === acc.email && loading;
                  return (
                    <button
                      key={acc.email}
                      type="button"
                      disabled={loading}
                      onClick={() => handleQuickLogin(acc.email)}
                      className={`relative flex flex-col items-start p-2.5 rounded-xl border text-left transition-all cursor-pointer active:scale-95 disabled:cursor-not-allowed ${
                        isSelected
                          ? 'bg-orange-100 border-[#FF6B00] ring-2 ring-[#FF6B00]/40 shadow-sm'
                          : 'bg-slate-50 hover:bg-orange-50/80 border-slate-200 hover:border-orange-300'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="w-7 h-7 rounded-lg bg-white shadow-xs border border-slate-200 flex items-center justify-center shrink-0">
                          {getQuickAccountIcon(acc.role)}
                        </div>
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                          {acc.label}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-slate-900 truncate w-full mt-1.5">
                        {acc.name}
                      </span>
                      <span className="text-[10px] text-slate-500 truncate w-full flex items-center justify-between mt-0.5">
                        <span className="truncate">{acc.matricule || acc.department || acc.role}</span>
                        {isSelected && (
                          <div className="w-3 h-3 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin shrink-0 ml-1" />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              <p className="text-[10px] text-slate-400 text-center pt-1">
                Cliquez sur un profil pour ouvrir immédiatement son tableau de bord ECOB sans mot de passe.
              </p>
            </div>
          )}

          {/* Footer Institutionnel */}
          <div className="mt-6 pt-3 border-t border-slate-100 text-center space-y-2">
            <p className="text-xs text-slate-500">
              Système académique et financier conforme CAMES & LMD.
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
