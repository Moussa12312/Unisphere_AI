'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, GraduationCap, ArrowRight, Loader2, LogOut, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface Affiliation {
  teacher_id: number;
  university_id: number;
  university_name: string;
  department?: string;
  speciality?: string;
}

export default function SelectUniversityPage() {
  const router = useRouter();
  const [affiliations, setAffiliations] = useState<Affiliation[]>([]);
  const [userName, setUserName] = useState<string>('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [switching, setSwitching] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      const storedAffiliations = localStorage.getItem('affiliations');

      if (!storedUser || !storedAffiliations) {
        toast.error('Session expirée ou profil introuvable.');
        router.push('/login');
        return;
      }

      const user = JSON.parse(storedUser);
      const affList: Affiliation[] = JSON.parse(storedAffiliations);

      if (!Array.isArray(affList) || affList.length === 0) {
        toast.error('Aucune affiliation disponible.');
        router.push('/login');
        return;
      }

      setUserName(user.full_name || 'Enseignant');
      setAffiliations(affList);
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handleSelect = async (aff: Affiliation) => {
    setSelectedId(aff.university_id);
    setSwitching(true);

    try {
      const res = await api.post('/api/v1/auth/switch-university', {
        university_id: aff.university_id
      });

      if (res.data?.access_token) {
        const token = res.data.access_token;
        localStorage.setItem('token', token);
        
        // Mettre à jour l'objet user en local avec le nouvel university_id
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const u = JSON.parse(userStr);
          u.university_id = aff.university_id;
          localStorage.setItem('user', JSON.stringify(u));
        }

        if (typeof document !== 'undefined') {
          document.cookie = `unisphere_token=${token}; path=/; max-age=604800; SameSite=Lax`;
          document.cookie = `unisphere_role=teacher; path=/; max-age=604800; SameSite=Lax`;
        }

        toast.success(`Espace activé : ${aff.university_name}`);
        router.push('/teacher/dashboard');
      } else {
        throw new Error('Réponse de bascule invalide.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Erreur lors du choix de l’établissement.';
      toast.error(msg);
      setSwitching(false);
      setSelectedId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    localStorage.removeItem('affiliations');
    if (typeof document !== 'undefined') {
      document.cookie = 'unisphere_token=; path=/; max-age=0';
      document.cookie = 'unisphere_role=; path=/; max-age=0';
    }
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#031B63] flex items-center justify-center text-white">
        <Loader2 size={36} className="animate-spin text-[#FF7900]" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-10 font-sans bg-[#031B63] overflow-hidden">
      {/* Halos ambiants */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#0754C7]/30 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#FF7900]/20 blur-[140px] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-tr from-[#031B63] via-[#0A1628] to-[#031B63] opacity-95 pointer-events-none" />

      <div className="relative z-10 w-full max-w-3xl space-y-8">
        
        {/* En-tête */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-orange-400 text-xs font-semibold shadow-sm">
            <GraduationCap size={15} className="text-[#FF7900]" />
            <span>Compte Enseignant Multi-Établissements</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Bonjour, <span className="text-[#FF7900]">{userName}</span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto">
            Vous intervenez dans plusieurs universités partenaires. Veuillez sélectionner l&apos;établissement dans lequel vous souhaitez travailler pour cette session :
          </p>
        </div>

        {/* Grille des Universités Affiliées */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {affiliations.map((aff) => {
            const isCurrent = selectedId === aff.university_id;
            return (
              <div
                key={aff.university_id}
                onClick={() => !switching && handleSelect(aff)}
                className={`group relative rounded-3xl p-6 sm:p-7 border transition-all cursor-pointer bg-white/[0.07] backdrop-blur-md hover:bg-white/[0.12] ${
                  isCurrent
                    ? 'border-[#FF7900] ring-2 ring-[#FF7900]/50 shadow-2xl shadow-orange-500/20'
                    : 'border-white/15 hover:border-white/30'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0754C7] to-[#1768E8] text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                    <Building2 size={24} />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/10 border border-white/10">
                    ID #{aff.university_id}
                  </span>
                </div>

                <div className="space-y-1.5 mb-6">
                  <h3 className="text-xl font-bold text-white group-hover:text-orange-400 transition-colors">
                    {aff.university_name}
                  </h3>
                  <p className="text-xs text-slate-300">
                    {aff.department || 'Enseignement Supérieur'}
                    {aff.speciality ? ` • ${aff.speciality}` : ''}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={switching}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                    isCurrent && switching
                      ? 'bg-[#FF7900] text-white shadow-lg'
                      : 'bg-white/15 hover:bg-[#FF7900] text-white group-hover:bg-[#FF7900]'
                  }`}
                >
                  {isCurrent && switching ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Ouverture de la session...</span>
                    </>
                  ) : (
                    <>
                      <span>Accéder à cet espace</span>
                      <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Bouton Déconnexion */}
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={handleLogout}
            disabled={switching}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors py-2 px-4 rounded-xl hover:bg-white/10"
          >
            <LogOut size={14} />
            <span>Se déconnecter ou changer de compte</span>
          </button>
        </div>

        {/* Note de Sécurité */}
        <div className="text-center text-slate-500 text-xs flex items-center justify-center gap-1.5">
          <CheckCircle2 size={13} className="text-emerald-400" />
          <span>Session chiffrée de bout en bout • Vos notes et cours restent cloisonnés par établissement.</span>
        </div>

      </div>
    </div>
  );
}

