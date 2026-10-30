'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Award, Briefcase, GraduationCap, Building2, MapPin, Share2,
  Globe, Lightbulb, CheckCircle2, Save, Loader2, Star, Sparkles,
  ArrowRight, ShieldCheck, HeartHandshake, Settings
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function AlumniProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    filiere: '',
    domain: '',
    level: '',
    graduation_year: 2022,
    promotion: '',
    current_position: '',
    company: '',
    activity_domain: '',
    location: '',
    linkedin_url: '',
    website: '',
    career_path: '',
    difficulties: '',
    advice: '',
    skills: '',
    is_open_to_mentoring: true,
    is_open_to_internship: true,
    is_visible: true
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await api.get('/api/v1/alumni/me/profile');
      if (res.data) {
        setProfile((prev: any) => ({
          ...prev,
          ...res.data
        }));
      }
    } catch (error) {
      console.error('Erreur chargement profil alumni:', error);
      toast.error('Erreur lors du chargement de votre profil alumni');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/api/v1/alumni/me/profile', {
        current_position: profile.current_position,
        company: profile.company,
        activity_domain: profile.activity_domain,
        location: profile.location,
        linkedin_url: profile.linkedin_url,
        website: profile.website,
        career_path: profile.career_path,
        difficulties: profile.difficulties,
        advice: profile.advice,
        skills: profile.skills,
        is_visible: profile.is_visible,
        is_open_to_mentoring: profile.is_open_to_mentoring,
        is_open_to_internship: profile.is_open_to_internship
      });
      toast.success('Profil professionnel mis à jour avec succès !');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={40} className="animate-spin text-[#FF6B00]" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header Profil */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Award size={180} />
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-[#FF6B00] to-orange-400 flex items-center justify-center font-black text-2xl shadow-lg shadow-orange-500/30">
              {profile.first_name?.[0]}{profile.last_name?.[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold">{profile.first_name} {profile.last_name}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Alumni Certifié
                </span>
              </div>
              <p className="text-slate-300 text-sm mt-1">
                {profile.current_position || 'Professionnel Diplômé'} {profile.company && `chez ${profile.company}`}
              </p>
              <p className="text-xs text-orange-300 mt-1 flex items-center gap-1.5 font-medium">
                <GraduationCap size={14} /> Promotion {profile.graduation_year || 2022} • {profile.filiere || 'Génie Logiciel'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/alumni/settings"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 text-slate-200 text-xs sm:text-sm font-semibold rounded-xl border border-white/10 transition-all"
            >
              <Settings size={15} /> Paramètres Compte
            </Link>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1 : Situation Professionnelle Actuelle */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2">
              <Briefcase size={20} className="text-[#FF6B00]" /> Situation Professionnelle
            </h2>
            <span className="text-xs text-slate-400">Visible par les étudiants et l'université</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Poste actuel / Titre
              </label>
              <input
                type="text"
                value={profile.current_position || ''}
                onChange={(e) => setProfile({ ...profile, current_position: e.target.value })}
                placeholder="ex: Lead Développeur, Chef de Projet, Consultant..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Entreprise / Organisation
              </label>
              <input
                type="text"
                value={profile.company || ''}
                onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                placeholder="ex: Orange Digital Center, Ecobank, Ministère..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Secteur d'activité
              </label>
              <input
                type="text"
                value={profile.activity_domain || ''}
                onChange={(e) => setProfile({ ...profile, activity_domain: e.target.value })}
                placeholder="ex: Télécommunications, Banque & Finance, Santé..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Ville & Pays de résidence
              </label>
              <input
                type="text"
                value={profile.location || ''}
                onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                placeholder="ex: Bamako, Mali ou Dakar, Sénégal..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Lien Profil LinkedIn
              </label>
              <input
                type="url"
                value={profile.linkedin_url || ''}
                onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })}
                placeholder="https://linkedin.com/in/..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Site Web / Portfolio
              </label>
              <input
                type="url"
                value={profile.website || ''}
                onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                placeholder="https://..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              />
            </div>
          </div>
        </div>

        {/* Section 2 : Parcours, Compétences & Conseils aux Étudiants */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2">
              <Lightbulb size={20} className="text-amber-500" /> Transmission & Conseils
            </h2>
            <span className="text-xs text-slate-400">Pour inspirer vos cadets</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Compétences clés & Technologies (séparées par des virgules)
              </label>
              <input
                type="text"
                value={profile.skills || ''}
                onChange={(e) => setProfile({ ...profile, skills: e.target.value })}
                placeholder="ex: Python, Gestion de projet, DevOps, Négociation commerciale..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Votre parcours depuis l'obtention du diplôme
              </label>
              <textarea
                rows={3}
                value={profile.career_path || ''}
                onChange={(e) => setProfile({ ...profile, career_path: e.target.value })}
                placeholder="Partagez vos débuts, vos premières opportunités et vos évolutions professionnelles..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00] resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Vos conseils d'or pour les étudiants actuels
              </label>
              <textarea
                rows={3}
                value={profile.advice || ''}
                onChange={(e) => setProfile({ ...profile, advice: e.target.value })}
                placeholder="Quels conseils auriez-vous aimé recevoir quand vous étiez à leur place ?"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00] resize-none"
              />
            </div>
          </div>
        </div>

        {/* Section 3 : Disponibilité & Mentorat */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-sm space-y-4">
          <h2 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2 border-b border-slate-100 pb-3">
            <HeartHandshake size={20} className="text-emerald-500" /> Engagement & Mentorat
          </h2>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
              <div>
                <p className="font-semibold text-slate-900 text-sm">Disponible pour le mentorat d'étudiants</p>
                <p className="text-xs text-slate-500">Permet aux étudiants de vous envoyer des demandes de mentorat (max 5)</p>
              </div>
              <input
                type="checkbox"
                checked={profile.is_open_to_mentoring}
                onChange={(e) => setProfile({ ...profile, is_open_to_mentoring: e.target.checked })}
                className="w-5 h-5 text-[#FF6B00] border-slate-300 rounded focus:ring-[#FF6B00]"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
              <div>
                <p className="font-semibold text-slate-900 text-sm">Ouvert aux propositions de stages & recrutements</p>
                <p className="text-xs text-slate-500">Indiquez que votre entreprise peut accueillir des stagiaires</p>
              </div>
              <input
                type="checkbox"
                checked={profile.is_open_to_internship}
                onChange={(e) => setProfile({ ...profile, is_open_to_internship: e.target.checked })}
                className="w-5 h-5 text-[#FF6B00] border-slate-300 rounded focus:ring-[#FF6B00]"
              />
            </label>
          </div>
        </div>

        {/* Bouton de Sauvegarde */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-gradient-to-r from-[#FF6B00] to-orange-600 hover:from-orange-500 hover:to-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-500/25 transition-all disabled:opacity-50 text-sm cursor-pointer"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            <span>{saving ? 'Enregistrement en cours...' : 'Enregistrer mon profil'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
