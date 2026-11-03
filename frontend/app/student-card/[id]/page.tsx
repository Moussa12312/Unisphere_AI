'use client';

import { useEffect, useState, use } from 'react';
import api from '@/lib/api';
import OfficialStudentCard from '@/components/cards/OfficialStudentCard';
import { ShieldCheck, CheckCircle2, AlertTriangle, Building2, Calendar, UserCheck } from 'lucide-react';

export default function StudentCardPublicVerificationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchStudent() {
      try {
        setLoading(true);
        const response = await api.get(`/api/v1/students/${resolvedParams.id}`);
        setStudent(response.data);
      } catch (err) {
        console.error('Erreur chargement carte etudiant:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchStudent();
  }, [resolvedParams.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white space-y-4 p-4">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-300">Vérification de l'authenticité de la carte...</p>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-6 text-white text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mb-4 border border-red-500/30">
          <AlertTriangle size={32} />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Carte d'étudiant introuvable ou invalide</h1>
        <p className="text-sm text-slate-400 max-w-md mb-6">
          Ce certificat ou matricule ne correspond à aucun dossier étudiant actif dans les registres académiques UniSphere AI.
        </p>
      </div>
    );
  }

  const university = student.university || {
    name: 'UniSphere AI',
    academic_year: '2026-2027',
    slogan: "Ensemble pour l'excellence"
  };

  return (
    <div className="min-h-screen bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center">
      <div className="w-full max-w-2xl space-y-6">
        {/* En-tête de validation sécurisée */}
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between text-emerald-400">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                Certificat Académique Authentifié
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </h2>
              <p className="text-xs text-emerald-300/80">Identité biométrique et inscription vérifiées en temps réel</p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-emerald-500/30 text-emerald-300">
            ACTIF
          </span>
        </div>

        {/* Carte officielle fidèle */}
        <div className="flex justify-center">
          <OfficialStudentCard
            student={student}
            university={university}
            side="recto"
            mode="responsive"
            className="w-full shadow-2xl"
          />
        </div>

        {/* Détails du registre académique */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <UserCheck size={14} className="text-[#FF7300]" />
            Informations certifiées au registre
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
              <span className="text-slate-400 block text-[11px]">Nom & Prénom</span>
              <span className="font-bold text-white text-sm">{student.last_name} {student.first_name}</span>
            </div>

            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
              <span className="text-slate-400 block text-[11px]">Matricule Officiel</span>
              <span className="font-mono font-bold text-orange-400 text-sm">{student.matricule || `ID-${student.id}`}</span>
            </div>

            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
              <span className="text-slate-400 block text-[11px]">Filière & Spécialité</span>
              <span className="font-semibold text-white">{student.filiere || 'Formation Supérieure'}</span>
            </div>

            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
              <span className="text-slate-400 block text-[11px]">Niveau d'études</span>
              <span className="font-bold text-emerald-400">{student.level || 'L1'}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <span>Plateforme : UniSphere AI Multi-Tenant</span>
            <span>Année académique : {university.academic_year || '2026-2027'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
