'use client';

import React, { useState } from 'react';
import { 
  X, Mail, Lock, Eye, EyeOff, LogIn, ArrowRight, 
  Building2, GraduationCap, Users, FileText, 
  CreditCard, Shield, Award, HelpCircle, CheckCircle2 
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToRegister: () => void;
}

// Comptes réels liés à l'Université Démo ECOB (Sans Super Admin)
const QUICK_ACCOUNTS = [
  { role: 'admin', label: 'Direction', sub: 'ECOB Admin', email: 'admin@unisphere.ai', icon: Building2, color: 'text-blue-600' },
  { role: 'teacher', label: 'Professeur', sub: 'Corps Professoral', email: 'enseignant@unisphere.ai', icon: GraduationCap, color: 'text-emerald-600' },
  { role: 'student', label: 'Étudiant', sub: 'L3 Logistique', email: 'etudiant@unisphere.ai', icon: Users, color: 'text-cyan-600' },
  { role: 'secretary', label: 'Secrétaire', sub: 'Scolarité Générale', email: 'secretaire@unisphere.ai', icon: FileText, color: 'text-indigo-600' },
  { role: 'censeur', label: 'Censeur', sub: 'Direction Études', email: 'censeur@unisphere.ai', icon: Shield, color: 'text-purple-600' },
  { role: 'accountant', label: 'Comptable', sub: 'Finances & Recouvrement', email: 'comptable@unisphere.ai', icon: CreditCard, color: 'text-emerald-600' },
  { role: 'guard', label: 'Poste Garde', sub: 'Portique & QR Code', email: 'gardien@unisphere.ai', icon: Shield, color: 'text-slate-600' },
  { role: 'alumni', label: 'Alumni', sub: 'Réseau Diplômés', email: 'alumni@unisphere.ai', icon: Award, color: 'text-orange-500' },
];

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
      // Appel direct de l'API de connexion
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
      };

      const targetRoute = routes[userData.role] || '/admin/dashboard';
      setTimeout(() => {
        window.location.href = targetRoute;
      }, 400);

    } catch (err: any) {
      setLoading(false);
      let errorMsg = 'Identifiants incorrects ou compte inactif.';
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        errorMsg = typeof detail === 'string' ? detail : JSON.stringify(detail);
      }
      toast.error(errorMsg);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Veuillez renseigner votre email et votre mot de passe.');
      return;
    }
    performLogin(email, password);
  };

  const handleQuickLogin = (quickEmail: string) => {
    if (loading) return;
    setEmail(quickEmail);
    setPassword('unisphere2026');
    performLogin(quickEmail, 'unisphere2026');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      
      {/* Container Modale */}
      <div 
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête Modale */}
        <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FF6B00] text-white flex items-center justify-center shadow-xs">
              <LogIn size={18} />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight">Espace Connexion • Démo ECOB</h3>
              <p className="text-xs text-slate-400">Connectez-vous avec vos identifiants ou testez en 1 clic</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Fermer la modale"
          >
            <X size={20} />
          </button>
        </div>

        {/* Corps Modale Déroulant */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Formulaire de Connexion Standard */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Champ Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Adresse Email ou Matricule
              </label>
              <div className="relative">
                <Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="chakirunisphereai@gmail.com"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                />
              </div>
            </div>

            {/* Champ Mot de passe */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Mot de passe
                </label>
                <button
                  type="button"
                  onClick={() => setForgotPasswordNotice(!forgotPasswordNotice)}
                  className="text-xs font-semibold text-[#FF6B00] hover:underline"
                >
                  Mot de passe oublié ?
                </button>
              </div>
              <div className="relative">
                <Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Note pour mot de passe oublié */}
            {forgotPasswordNotice && (
              <div className="p-3.5 rounded-xl bg-orange-50 border border-orange-200 text-xs text-orange-950 space-y-1 animate-in fade-in duration-150">
                <p className="font-bold flex items-center gap-1.5">
                  <HelpCircle size={15} className="text-[#FF6B00]" />
                  Réinitialisation gérée par l&apos;Administration
                </p>
                <p className="text-slate-600">
                  Pour des raisons de sécurité académique, contactez le Secrétariat ou votre Administrateur système pour réinitialiser votre accès.
                </p>
              </div>
            )}

            {/* Bouton de Soumission */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#FF6B00] to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-md shadow-orange-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Connexion en cours...</span>
                </>
              ) : (
                <>
                  <span>Se connecter</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Section Démo Rapide 1-Clic sur données réelles ECOB */}
          <div className="pt-5 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" />
                Comptes Démo Réels (1-clic) :
              </span>
              <span className="text-[11px] font-semibold text-slate-500 font-mono">
                Données réelles ECOB
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {QUICK_ACCOUNTS.map((acc) => {
                const IconComponent = acc.icon;
                return (
                  <button
                    key={acc.role}
                    type="button"
                    disabled={loading}
                    onClick={() => handleQuickLogin(acc.email)}
                    className="p-2.5 rounded-xl bg-slate-50 hover:bg-orange-50/80 border border-slate-200/90 hover:border-orange-300 text-left transition-all flex items-center gap-2.5 group active:scale-95 disabled:opacity-50"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white shadow-2xs border border-slate-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <IconComponent size={15} className={acc.color} />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-slate-800 truncate group-hover:text-[#FF6B00]">
                        {acc.label}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {acc.sub}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

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
            className="font-bold text-[#FF6B00] hover:underline ml-1"
          >
            Démarrer l&apos;essai gratuit
          </button>
        </div>

      </div>
    </div>
  );
}
