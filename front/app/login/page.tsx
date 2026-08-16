'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';


export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const message = searchParams.get('message');
    if (message) {
      toast(message, { icon: '✉️', duration: 8000 });
    }
  }, [searchParams]);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/api/v1/auth/login', {
        email: email,
        password: password,
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

      // ✅ Générer les notifications une seule fois au login
      try {
        await api.post('/api/v1/notifications/generate');
      } catch (notifError) {
        // Non bloquant : on ne bloque pas la connexion si ça échoue
      }

      toast.success('Connexion réussie !');

      const routes: Record<string, string> = {
        admin: '/admin/dashboard',
        secretary: '/secretary/dashboard',
        censeur: '/censeur/dashboard',
        teacher: '/teacher/dashboard',
        student: '/student/dashboard',
        accountant: '/accountant/dashboard',
        guard: '/guard/dashboard',
        alumni: '/alumni/dashboard',
        super_admin: '/superadmin/dashboard',
        parent: '/parent/dashboard',
      };

      const targetRoute = routes[userData.role] || '/login';
      router.push(targetRoute);

    } catch (error: any) {
      let message = 'Erreur de connexion';

      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (Array.isArray(detail)) {
          message = detail.map((err: any) => err.msg).join(', ');
        } else if (typeof detail === 'string') {
          message = detail;
        } else if (detail.msg) {
          message = detail.msg;
        }
      }

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      title: 'Sécurisé',
      description: 'Vos données sont protégées'
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      title: 'Intelligent',
      description: "L'IA au service de votre réussite"
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'Accessible',
      description: 'Disponible partout, à tout moment'
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      title: 'Collaboratif',
      description: 'Échangez, collaborez, progressez'
    }
  ];

  return (
    <div className="min-h-screen flex relative overflow-hidden" style={{
      background: 'linear-gradient(135deg, #0a1628 0%, #1e3a8a 50%, #3b82f6 100%)'
    }}>
      {/* Background Image */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('/login.png')` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a1628]/90 via-[#0a1628]/70 to-transparent"></div>
      </div>

      {/* Left Side - Content */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center p-8 relative z-10 mr-30 -mt-9 ">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center">
            <img
              src="/logo.png"
              alt="UniSphere AI"
              width={100}
              height={50}
              className="rounded-lg"
            />
          </div>
          <h1 className="text-4xl font-bold text-white">
            UniSphere <span className="text-[#FF6B00]">AI</span>
          </h1>
        </div>

        {/* Main Title */}
        <h2 className="text-2xl font-bold text-white mb-4 leading-tight">
          L'intelligence du Savoir,<br />
          <span className="text-[#FF6B00]">La puissance du Numérique</span>
        </h2>

        <p className="text-x0.5 text-slate-300 mb-6 max-w-lg">
          "L'éducation est l'arme la plus puissante qu'on puisse utiliser pour changer le monde."<span className="text-[#FF6B00]"> Nelson Mandela </span>
        </p>

        {/* Features */}
        <div className="space-y-6">
          {features.map((feature, idx) => (
            <div key={idx} className="flex items-start gap-4 -mt-3">
              <div className="w-12 h-12 bg-[#FF6B00]/20 rounded-xl flex items-center justify-center text-[#FF6B00] flex-shrink-0">
                {feature.icon}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-0">{feature.title}</h3>
                <p className="text-slate-400 text-sm">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-90 lg:w-1/3 flex items-center justify-center p-5 relative z-10 mt-5 mr-8">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 lg:p-7">
          {/* Header */}
          <div className="text-center mb-4 -mt-4">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Connexion</h2>
            <p className="text-slate-500">Accédez à votre espace personnel</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email et Password sur la même ligne */}
            <div className="grid grid-cols-2 gap-4">
              {/* Email */}
              <div>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Mail size={20} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    required
                    className="w-full pl-12 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock size={20} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mot de passe"
                    required
                    className="w-full pl-12 pr-12 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-[#FF6B00] border-slate-300 rounded focus:ring-[#FF6B00]"
                />
                <span className="text-sm text-slate-600">Se souvenir de moi</span>
              </label>

              <Link
                href="/forgot-password"
                className="text-sm text-[#FF6B00] hover:underline font-medium"
              >
                Mot de passe oublié ?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#FF6B00] to-blue-600 hover:from-[#e55f00] hover:to-blue-700 text-white font-semibold py-2.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Connexion en cours...
                </span>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-slate-500">ou continuer avec</span>
            </div>
          </div>

          {/* Social Login */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => toast('La connexion Google arrive bientôt !', { icon: 'ℹ️' })}
              className="flex items-center justify-center gap-2 border border-slate-200 rounded-xl py-2.5 hover:bg-slate-50 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span className="text-sm font-medium text-slate-700">Google</span>
            </button>

            <button
              type="button"
              onClick={() => toast('La connexion Apple arrive bientôt !', { icon: 'ℹ️' })}
              className="flex items-center justify-center gap-2 border border-slate-200 rounded-xl py-2.5 hover:bg-slate-50 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              <span className="text-sm font-medium text-slate-700">Apple</span>
            </button>
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-slate-500 mt-6">
            Pas encore de compte ?{' '}
            <a href="/register" className="text-[#FF6B00] hover:underline font-medium">
              Créer un compte
            </a>
          </p>


        </div>
      </div>
    </div>
  );
}