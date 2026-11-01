'use client';

import React, { useState } from 'react';
import {
  Sparkles, Building2, Scale, FileText, GraduationCap,
  Users, CreditCard, Shield, Award, ArrowRight, ExternalLink,
  RefreshCw, Copy, CheckCircle2, Lock, KeyRound, Info
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface DemoRoleItem {
  id: string;
  label: string;
  role: string;
  email: string;
  name: string;
  department: string;
  matricule?: string;
  route: string;
  color: string;
  badgeColor: string;
  desc: string;
  icon: any;
}

const DEMO_ROLES: DemoRoleItem[] = [
  {
    id: 'admin',
    label: 'Direction Générale / Recteur',
    role: 'admin',
    email: 'admin@unisphere.ai',
    name: 'Direction Générale',
    department: 'Administration Centrale',
    route: '/admin/dashboard',
    color: 'from-blue-600 to-indigo-700',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    desc: 'Pilotage global, délibérations CAMES, validation des maquettes LMD et finances.',
    icon: Building2
  },
  {
    id: 'censeur',
    label: 'Direction des Études (Censeur)',
    role: 'censeur',
    email: 'censeur@unisphere.ai',
    name: 'Dr. Boubacar TOURE',
    department: 'Direction Pédagogique',
    route: '/censeur/dashboard',
    color: 'from-purple-600 to-violet-700',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    desc: 'Planification des examens, arrêt des notes CC/Exam et jurys de délibération.',
    icon: Scale
  },
  {
    id: 'secretary',
    label: 'Secrétariat Général',
    role: 'secretary',
    email: 'secretaire@unisphere.ai',
    name: 'Mme Aminata DIARRA',
    department: 'Scolarité & Registre',
    route: '/secretary/dashboard',
    color: 'from-indigo-600 to-blue-700',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    desc: 'Inscriptions, génération de cartes étudiantes avec QR Code, attestations et relevés.',
    icon: FileText
  },
  {
    id: 'teacher',
    label: 'Corps Enseignant',
    role: 'teacher',
    email: 'enseignant@unisphere.ai',
    name: 'Pr. Mamadou KANTE',
    department: 'Département Génie Logiciel',
    route: '/teacher/dashboard',
    color: 'from-emerald-600 to-teal-700',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    desc: 'Saisie des notes continues/examens, pointage des présences et supports de cours.',
    icon: GraduationCap
  },
  {
    id: 'student',
    label: 'Espace Étudiant LMD',
    role: 'student',
    email: 'etudiant@unisphere.ai',
    matricule: 'EC-2026-0001',
    name: 'Aïssata DIALLO',
    department: 'Licence 3 - GLSI',
    route: '/student/dashboard',
    color: 'from-cyan-600 to-blue-600',
    badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    desc: 'Consultation des bulletins semestriels, reçus financiers certifiés et QR badge.',
    icon: Users
  },
  {
    id: 'accountant',
    label: 'Service Comptable & Finances',
    role: 'accountant',
    email: 'comptable@unisphere.ai',
    name: 'M. Ousmane TRAORE',
    department: 'Service Financier',
    route: '/accountant/dashboard',
    color: 'from-emerald-700 to-green-800',
    badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    desc: 'Suivi des tranches de scolarité, Mobile Money (Orange/Wave/MTN) et quitus.',
    icon: CreditCard
  },
  {
    id: 'guard',
    label: 'Poste de Sécurité / Portique',
    role: 'guard',
    email: 'gardien@unisphere.ai',
    name: 'M. Bakary KONE',
    department: 'Sécurité Campus',
    route: '/guard',
    color: 'from-slate-700 to-slate-900',
    badgeColor: 'bg-slate-200 text-slate-800 border-slate-300',
    desc: 'Scanner caméra de QR Code en temps réel, filtrage des accès et alertes litiges.',
    icon: Shield
  },
  {
    id: 'alumni',
    label: 'Réseau Alumni & Diplômés',
    role: 'alumni',
    email: 'alumni@unisphere.ai',
    name: 'Moussa FOFANA',
    department: 'Réseau Diplômés 2024',
    route: '/alumni/dashboard',
    color: 'from-orange-500 to-amber-600',
    badgeColor: 'bg-orange-100 text-orange-800 border-orange-200',
    desc: 'Insertion professionnelle, annuaire des diplômés, mentorat et offres de stages.',
    icon: Award
  }
];

export default function SuperAdminDemoPage() {
  const [loadingRole, setLoadingRole] = useState<string | null>(null);
  const [openInNewTab, setOpenInNewTab] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const handleLaunchRole = async (item: DemoRoleItem) => {
    setLoadingRole(item.id);
    try {
      const response = await api.post('/api/v1/auth/login', {
        email: item.email,
        password: 'unisphere2026',
        remember_me: true
      });

      const { access_token, user } = response.data;
      if (!access_token || !user) {
        throw new Error('Identifiants invalides');
      }

      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('role', user.role);

      if (typeof document !== 'undefined') {
        document.cookie = `unisphere_token=${access_token}; path=/; max-age=604800; SameSite=Lax`;
        document.cookie = `unisphere_role=${user.role}; path=/; max-age=604800; SameSite=Lax`;
      }

      toast.success(`Session activée : ${item.name} (${item.label}) !`);

      if (openInNewTab) {
        window.open(item.route, '_blank');
      } else {
        window.location.href = item.route;
      }
    } catch (err: any) {
      setLoadingRole(null);
      const detail = err.response?.data?.detail || '';
      if (String(detail).toLowerCase().includes('incorrect') || err.response?.status === 401) {
        toast.error(
          `Le compte ${item.email} n'existe pas encore. Cliquez sur "Initialiser Comptes Démo" ci-dessus.`,
          { duration: 6000 }
        );
      } else {
        toast.error(`Erreur de connexion : ${detail || err.message}`);
      }
    }
  };

  const handleSeedDemo = async () => {
    if (isSeeding) return;
    setIsSeeding(true);
    const toastId = toast.loading('Peuplement des 8 comptes de démonstration en cours...');
    try {
      const res = await api.post('/api/v1/superadmin/seed-ecob');
      toast.success(res.data?.message || 'Comptes de démonstration initialisés avec succès !', { id: toastId });
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message;
      toast.error(`Échec du peuplement : ${msg}`, { id: toastId });
    } finally {
      setIsSeeding(false);
    }
  };

  const copyPassword = () => {
    navigator.clipboard.writeText('unisphere2026');
    toast.success('Mot de passe "unisphere2026" copié !');
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* ============================================================ */}
      {/* 1. EN-TÊTE PRINCIPAL DU CONTENU                             */}
      {/* ============================================================ */}
      <div className="bg-gradient-to-r from-slate-900 via-[#031B63] to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-white/10 relative overflow-hidden">
        {/* Halos décoratifs */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-[#FF7900]/15 blur-[90px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-[#0754C7]/20 blur-[90px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-orange-400 text-xs font-semibold shadow-xs">
              <Sparkles size={14} className="text-[#FF7900]" />
              <span>Univ_Demo • Présentations Clients & Démonstrations</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
              Espace Démonstration <span className="text-[#FF7900]">Multi-Rôles</span>
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Connectez-vous en 1 clic sous n'importe quel rôle pour effectuer vos présentations devant les recteurs, directeurs d'études et partenaires académiques.
            </p>
          </div>

          {/* Bouton d'Initialisation Démo */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={handleSeedDemo}
              disabled={isSeeding}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#FF7900] to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-sm shadow-lg shadow-orange-500/25 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={16} className={isSeeding ? 'animate-spin' : ''} />
              <span>{isSeeding ? 'Initialisation...' : 'Initialiser Comptes Démo'}</span>
            </button>
          </div>
        </div>

        {/* Barre d'info sous l'en-tête */}
        <div className="relative z-10 mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <span>Mot de passe universel :</span>
            <button
              onClick={copyPassword}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 font-mono text-orange-400 font-bold transition-colors cursor-pointer"
              title="Cliquer pour copier"
            >
              <span>unisphere2026</span>
              <Copy size={12} />
            </button>
          </div>

          <label className="flex items-center gap-2 text-slate-300 font-medium cursor-pointer select-none">
            <input
              type="checkbox"
              checked={openInNewTab}
              onChange={(e) => setOpenInNewTab(e.target.checked)}
              className="rounded border-slate-400 text-[#FF7900] focus:ring-[#FF7900] w-4 h-4 cursor-pointer"
            />
            <span>Ouvrir les sessions dans un nouvel onglet</span>
          </label>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. GRILLE RESPONSIVE DES 8 RÔLES (Contenu Principal)         */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {DEMO_ROLES.map((item) => {
          const Icon = item.icon;
          const isLoading = loadingRole === item.id;

          return (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#FF7900]/60 rounded-3xl p-5 shadow-xs hover:shadow-xl transition-all flex flex-col justify-between group"
            >
              <div className="space-y-3">
                {/* En-tête de la carte */}
                <div className="flex items-start justify-between gap-3">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${item.color} text-white flex items-center justify-center shadow-md shadow-black/10 shrink-0 group-hover:scale-105 transition-transform`}>
                    <Icon size={24} />
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${item.badgeColor}`}>
                    {item.role}
                  </span>
                </div>

                {/* Titre & Nom */}
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white group-hover:text-[#FF7900] transition-colors leading-snug">
                    {item.label}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                    {item.name} {item.matricule ? `• ${item.matricule}` : ''}
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                    {item.department}
                  </p>
                </div>

                {/* Description du rôle */}
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-2.5">
                  {item.desc}
                </p>

                {/* Identifiant Email */}
                <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5 flex items-center justify-between text-[11px] font-mono text-slate-600 dark:text-slate-300">
                  <span className="truncate">{item.email}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(item.email);
                      toast.success(`Email ${item.email} copié !`);
                    }}
                    className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1"
                    title="Copier l'email"
                  >
                    <Copy size={13} />
                  </button>
                </div>
              </div>

              {/* Bouton de Connexion 1-Clic */}
              <div className="pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => handleLaunchRole(item)}
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-[#FF7900] dark:hover:bg-[#FF7900] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Connexion...</span>
                    </>
                  ) : (
                    <>
                      <span>Ouvrir la session</span>
                      {openInNewTab ? <ExternalLink size={14} /> : <ArrowRight size={14} />}
                    </>
                  )}
                </button>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}

