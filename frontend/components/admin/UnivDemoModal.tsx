'use client';

import React, { useState } from 'react';
import {
  X, Sparkles, Building2, Scale, FileText, GraduationCap,
  Users, CreditCard, Shield, Award, ArrowRight, ExternalLink,
  CheckCircle2, RefreshCw, AlertCircle
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface UnivDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

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
    name: 'Direction ECOB',
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

export default function UnivDemoModal({ isOpen, onClose }: UnivDemoModalProps) {
  const [loadingRole, setLoadingRole] = useState<string | null>(null);
  const [openInNewTab, setOpenInNewTab] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  if (!isOpen) return null;

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
        throw new Error('Identifiants démo introuvables');
      }

      // Stocker les credentials pour la session
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('role', user.role);
      if (typeof document !== 'undefined') {
        document.cookie = `unisphere_token=${access_token}; path=/; max-age=604800; SameSite=Lax`;
        document.cookie = `unisphere_role=${user.role}; path=/; max-age=604800; SameSite=Lax`;
      }

      toast.success(`Session activée : ${item.label} (${user.full_name})`);

      if (openInNewTab) {
        window.open(item.route, '_blank');
        setLoadingRole(null);
      } else {
        window.location.href = item.route;
      }
    } catch (err: any) {
      setLoadingRole(null);
      const detail = err.response?.data?.detail || '';
      if (String(detail).toLowerCase().includes('incorrect') || err.response?.status === 401) {
        toast.error(
          `Le compte ${item.email} n'existe pas encore. Cliquez sur "Initialiser Démo ECOB" ci-dessous.`,
          { duration: 6000 }
        );
      } else {
        toast.error(`Erreur de connexion : ${detail || err.message}`);
      }
    }
  };

  const handleSeedEcob = async () => {
    if (isSeeding) return;
    setIsSeeding(true);
    const toastId = toast.loading('Peuplement des données de démonstration ECOB en cours...');
    try {
      const res = await api.post('/api/v1/superadmin/seed-ecob');
      toast.success(res.data?.message || 'Données Démo ECOB initialisées avec succès !', { id: toastId });
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message;
      toast.error(`Échec du peuplement : ${msg}`, { id: toastId });
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">

      {/* Boîte Modale */}
      <div
        className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête Institutionnel ECOB */}
        <div className="bg-gradient-to-r from-slate-900 via-[#1e1b4b] to-slate-900 text-white px-6 py-5 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#FF6B00] to-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/25">
              <Sparkles size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight text-white">
                  Univ_Demo • Présentation Client ECOB
                </h3>
                <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase">
                  8 Rôles Prêts
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Université Pilote ECOB (Hamdallaye ACI 2000, Bamako) • Connexion instantanée en 1 clic
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Barre d'options & Contrôles */}
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-700">
            <span className="font-bold text-slate-900">Mot de passe commun :</span>
            <code className="bg-white px-2 py-1 rounded border border-slate-200 font-mono text-[#FF6B00] font-bold">
              unisphere2026
            </code>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={openInNewTab}
                onChange={(e) => setOpenInNewTab(e.target.checked)}
                className="rounded border-slate-300 text-[#FF6B00] focus:ring-[#FF6B00] w-4 h-4 cursor-pointer"
              />
              <span>Ouvrir dans un nouvel onglet</span>
            </label>

            <button
              onClick={handleSeedEcob}
              disabled={isSeeding}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
              title="Générer ou régénérer les données complètes de démonstration pour ECOB"
            >
              <RefreshCw size={13} className={isSeeding ? 'animate-spin text-[#FF6B00]' : 'text-slate-500'} />
              <span>{isSeeding ? 'Initialisation...' : 'Initialiser Démo ECOB'}</span>
            </button>
          </div>
        </div>

        {/* Grille des 8 Rôles Démo */}
        <div className="p-6 overflow-y-auto space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {DEMO_ROLES.map((item) => {
              const Icon = item.icon;
              const isLoading = loadingRole === item.id;

              return (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200 hover:border-[#FF6B00]/60 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${item.color} text-white flex items-center justify-center shadow-xs shrink-0`}>
                          <Icon size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-900 group-hover:text-[#FF6B00] transition-colors">
                            {item.label}
                          </h4>
                          <p className="text-xs text-slate-500 font-medium">
                            {item.name} {item.matricule ? `• ${item.matricule}` : ''}
                          </p>
                        </div>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${item.badgeColor} shrink-0`}>
                        {item.role.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-snug font-medium pt-1">
                      {item.desc}
                    </p>

                    <div className="text-[11px] text-slate-400 font-mono">
                      {item.email}
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium">
                      Espace : <strong className="text-slate-600">{item.route}</strong>
                    </span>

                    <button
                      type="button"
                      onClick={() => handleLaunchRole(item)}
                      disabled={isLoading || !!loadingRole}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-[#FF6B00] transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Connexion...</span>
                        </>
                      ) : (
                        <>
                          <span>Lancer la Démo</span>
                          {openInNewTab ? <ExternalLink size={13} /> : <ArrowRight size={13} />}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pied de Modale */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span className="flex items-center gap-1.5 text-slate-600 font-medium">
            <CheckCircle2 size={15} className="text-emerald-500" />
            Environnement de démonstration prêt pour vos présentations devant les clients
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>

      </div>

    </div>
  );
}

