'use client';

import { useState, useEffect } from 'react';
import {
  Building2, Users, FileText, CheckCircle2, AlertTriangle,
  GraduationCap, Scale, CreditCard, Shield, Award, Zap,
  ExternalLink, Play
} from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import Link from 'next/link';

function formatFCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}

const DEMO_ROLES = [
  { role: 'admin', label: 'Direction Générale', desc: 'Pilotage complet, UEs, Filières, PVs CAMES', email: 'admin@unisphere.ai', route: '/admin/dashboard', icon: Building2, color: 'bg-blue-50 text-blue-600 border-blue-200' },
  { role: 'secretary', label: 'Secrétariat Général', desc: 'Inscriptions, Relevés, Cartes étudiantes A4', email: 'secretaire@unisphere.ai', route: '/secretary/dashboard', icon: FileText, color: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
  { role: 'censeur', label: 'Direction des Études', desc: 'Validation notes, Délibérations, Examens', email: 'censeur@unisphere.ai', route: '/censeur/dashboard', icon: Scale, color: 'bg-purple-50 text-purple-600 border-purple-200' },
  { role: 'teacher', label: 'Corps Professoral', desc: 'Saisie notes CC/Examen, Présences, Cours', email: 'enseignant@unisphere.ai', route: '/teacher/dashboard', icon: GraduationCap, color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  { role: 'student', label: 'Espace Étudiant LMD', desc: 'Bulletins, Reçus financiers, QR Badge', email: 'etudiant@unisphere.ai', route: '/student/dashboard', icon: Users, color: 'bg-cyan-50 text-cyan-600 border-cyan-200' },
  { role: 'accountant', label: 'Service Financier', desc: 'Tranches scolarité, Rapprochements, Quitus', email: 'comptable@unisphere.ai', route: '/accountant/dashboard', icon: CreditCard, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { role: 'guard', label: 'Sécurité & Portique', desc: 'Contrôle d\'accès, Scanner QR code instantané', email: 'gardien@unisphere.ai', route: '/guard', icon: Shield, color: 'bg-slate-100 text-slate-700 border-slate-300' },
  { role: 'alumni', label: 'Réseau Diplômés', desc: 'Insertion professionnelle, Mentorat, Annuaire', email: 'alumni@unisphere.ai', route: '/alumni/dashboard', icon: Award, color: 'bg-orange-50 text-orange-600 border-orange-200' },
];

export default function SuperAdminDashboard() {
  const toast = useToast();
  const [stats, setStats] = useState<any>(null);
  const [universities, setUniversities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [launchingRole, setLaunchingRole] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [statsRes, unisRes] = await Promise.all([
        api.get('/api/v1/superadmin/dashboard-stats'),
        api.get('/api/v1/superadmin/universities')
      ]);
      setStats(statsRes.data);
      setUniversities(unisRes.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string, targetRoute: string) => {
    setLaunchingRole(demoEmail);
    try {
      const res = await api.post('/api/v1/auth/login', {
        email: demoEmail,
        password: 'unisphere2026',
        remember_me: true
      });
      const { access_token, user } = res.data;
      if (!access_token || !user) throw new Error('Authentification échouée');

      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('role', user.role);
      document.cookie = `unisphere_token=${access_token}; path=/; max-age=604800; SameSite=Lax`;
      document.cookie = `unisphere_role=${user.role}; path=/; max-age=604800; SameSite=Lax`;

      toast.success(`Session activée pour ${user.full_name || demoEmail} !`);
      window.location.href = targetRoute;
    } catch (err: any) {
      toast.error("Impossible d'ouvrir la session démo. Vérifiez que le compte existe dans la base.");
    } finally {
      setLaunchingRole(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B00] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Vue d'ensemble de la plateforme</h1>
        <p className="text-slate-500 mt-1">Supervision globale, facturation des universités partenaires et démonstrations clients</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 font-medium">Universités Partenaires</span>
            <Building2 className="text-blue-600" size={20} />
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats?.total_universities || 0}</p>
          <p className="text-xs text-slate-400 mt-1">{stats?.total_students || 0} étudiants inscrits</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 font-medium">Total Facturé</span>
            <FileText className="text-[#FF6B00]" size={20} />
          </div>
          <p className="text-xl font-bold text-slate-900">{formatFCFA(stats?.total_invoiced || 0)}</p>
          <p className="text-xs text-slate-400 mt-1">Prestations SaaS & Licences</p>
        </div>

        <div className="bg-green-50 rounded-xl border border-green-100 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-green-700 font-medium">Total Encaissé</span>
            <CheckCircle2 className="text-green-600" size={20} />
          </div>
          <p className="text-xl font-bold text-green-800">{formatFCFA(stats?.total_paid || 0)}</p>
          <p className="text-xs text-green-600 mt-1">Recouvrement effectué</p>
        </div>

        <div className="bg-amber-50 rounded-xl border border-amber-100 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-amber-700 font-medium">Reste à Recouvrir</span>
            <AlertTriangle className="text-amber-600" size={20} />
          </div>
          <p className="text-xl font-bold text-amber-800">{formatFCFA(stats?.balance_due || 0)}</p>
          <p className="text-xs text-amber-600 mt-1">
            {stats?.pending_invoices_count || 0} en attente • {stats?.overdue_invoices_count || 0} en retard
          </p>
        </div>
      </div>

      {/* 🎭 ESPACE DÉMONSTRATION CLIENTS & SIMULATION DES RÔLES EN 1-CLIC */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white rounded-2xl border border-slate-800 p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-800">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-[#FF6B00] text-xs font-bold uppercase tracking-wider mb-2">
              <Zap size={13} />
              <span>Module Commercial Super Admin</span>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">
              Espace Démonstration Clients & Test des Rôles
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Connectez-vous en 1 clic sous n'importe quel rôle pour effectuer vos présentations devant les recteurs et directions universitaires.
            </p>
          </div>
          <span className="text-[11px] bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 self-start sm:self-auto font-mono">
            Univers Démo : ECOB (ID 1)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-5">
          {DEMO_ROLES.map((r) => {
            const Icon = r.icon;
            const isRunning = launchingRole === r.email;
            return (
              <div
                key={r.role}
                className="bg-slate-800/80 hover:bg-slate-850 border border-slate-700/80 hover:border-orange-500/40 rounded-xl p-4 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${r.color}`}>
                      <Icon size={18} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                      {r.role}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white group-hover:text-[#FF6B00] transition-colors">
                    {r.label}
                  </h3>
                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                    {r.desc}
                  </p>
                  <p className="text-[10px] font-mono text-slate-400 mt-2 truncate">
                    {r.email}
                  </p>
                </div>

                <div className="pt-4 mt-3 border-t border-slate-700/50">
                  <button
                    type="button"
                    disabled={isRunning}
                    onClick={() => handleDemoLogin(r.email, r.route)}
                    className="w-full py-2 px-3 rounded-lg bg-[#FF6B00] hover:bg-orange-600 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20 active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {isRunning ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Ouverture...</span>
                      </>
                    ) : (
                      <>
                        <Play size={13} fill="currentColor" />
                        <span>Tester ce rôle</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Universities list & Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Universities Status */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Situation des Universités Partenaires</h3>
            <Link href="/superadmin/universities" className="text-xs text-[#FF6B00] hover:underline font-medium">Voir tout →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Université</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">Étudiants</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Facturé</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Encaissé</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Solde Dû</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {universities.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">Aucune université enregistrée</td>
                  </tr>
                ) : (
                  universities.map((u, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        <div>{u.university.name}</div>
                        <div className="text-xs text-slate-400 font-normal">{u.university.email || u.university.country}</div>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-600">{u.student_count}</td>
                      <td className="px-4 py-3 text-right text-slate-700 font-medium">{formatFCFA(u.total_invoiced)}</td>
                      <td className="px-4 py-3 text-right text-green-600 font-medium">{formatFCFA(u.total_paid)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-amber-600">
                        {u.balance_due > 0 ? formatFCFA(u.balance_due) : <span className="text-green-600 text-xs bg-green-50 px-2 py-0.5 rounded-full">À jour</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Recent Payments */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Derniers Encaissements</h3>
            <Link href="/superadmin/payments" className="text-xs text-[#FF6B00] hover:underline font-medium">Voir tout →</Link>
          </div>
          <div className="p-4 space-y-3 flex-1 overflow-y-auto">
            {!stats?.recent_payments || stats.recent_payments.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Aucun encaissement récent</p>
            ) : (
              stats.recent_payments.map((p: any) => (
                <div key={p.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{p.university_name}</p>
                    <p className="text-xs text-slate-500">Facture {p.invoice_number} • {new Date(p.payment_date).toLocaleDateString('fr-FR')}</p>
                    <span className="text-[10px] text-slate-400 capitalize">{p.payment_method}</span>
                  </div>
                  <span className="font-bold text-green-600 text-sm">{formatFCFA(p.amount)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
