'use client';

import React, { useState } from 'react';
import { 
  X, Mail, Lock, Eye, EyeOff, LogIn, ArrowRight, 
  HelpCircle, CheckCircle2 
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToRegister: () => void;
}

export default function LoginModal({ isOpen, onClose, onSwitchToRegister }: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotPasswordNotice, setForgotPasswordNotice] = useState(false);

  if (!isOpen) return null;

  const performLogin = async (loginEmail: string, loginPass: string) => {
    setLoading(true);
    try {
      const response = await api.post('/api/v1/auth/login', {
        email: loginEmail.trim().toLowerCase(),
        password: loginPass,
        remember_me: true,
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
      onClose();
      window.location.href = targetRoute;

    } catch (error: any) {
      setLoading(false);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error('Veuillez saisir votre identifiant et votre mot de passe');
      return;
    }
    performLogin(email, password);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      
      {/* Container Modale */}
      <div 
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête Modale */}
        <div className="bg-[#031B63] text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FF7900] text-white flex items-center justify-center shadow-xs">
              <LogIn size={18} />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight">UniSphere AI • Espace Connexion</h3>
              <p className="text-xs text-slate-300">Connectez-vous à votre espace personnel sécurisé</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Fermer la modale"
          >
            <X size={20} />
          </button>
        </div>

        {/* Corps Modale */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Champ Email / Identifiant */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Identifiant ou Email professionnel
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Mail size={18} />
                </div>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nom@universite.edu ou matricule"
                  required
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF7900] focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Champ Mot de Passe */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Mot de passe
                </label>
                <button
                  type="button"
                  onClick={() => setForgotPasswordNotice(!forgotPasswordNotice)}
                  className="text-xs font-semibold text-[#FF7900] hover:underline"
                >
                  Mot de passe oublié ?
                </button>
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
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF7900] focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {forgotPasswordNotice && (
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <HelpCircle size={14} className="text-amber-600" />
                    Procédure de réinitialisation sécurisée :
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    Par mesure de sécurité, la réinitialisation directe par email est traitée par le secrétariat ou l&apos;administrateur de votre établissement.
                  </p>
                  <a
                    href="/forgot-password"
                    className="inline-block text-[#FF7900] font-bold hover:underline mt-1"
                  >
                    Envoyer une demande à l&apos;administration &rarr;
                  </a>
                </div>
              )}
            </div>

            {/* Bouton de Soumission */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-[#FF7900] to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-xl shadow-md shadow-orange-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 text-sm"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Vérification des accès...</span>
                </>
              ) : (
                <>
                  <span>Se connecter</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

        </div>

        {/* Pied Modale : Bascule vers Inscription */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 text-center text-xs text-slate-600">
          <span>Vous souhaitez créer un espace pour votre université ? </span>
          <button
            type="button"
            onClick={() => {
              onClose();
              onSwitchToRegister();
            }}
            className="font-bold text-[#FF7900] hover:underline ml-1 cursor-pointer"
          >
            Démarrer l&apos;essai gratuit
          </button>
        </div>

      </div>
    </div>
  );
}
