'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, GraduationCap, Briefcase, MapPin, Building2,
  Link2, Globe, MessageSquare, CheckCircle, Award,
  Calendar, Handshake, Star, AlertTriangle, Lightbulb,
  Loader2, ChevronRight, Sparkles
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface AlumniDetail {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  photo: string | null;
  filiere: string | null;
  domain: string | null;
  level: string | null;
  graduation_year: number | null;
  promotion: string | null;
  current_position: string | null;
  company: string | null;
  activity_domain: string | null;
  location: string | null;
  linkedin_url: string | null;
  website: string | null;
  career_path: string | null;
  difficulties: string | null;
  advice: string | null;
  skills: string[];
  is_verified: boolean;
  is_open_to_mentoring: boolean;
  is_open_to_internship: boolean;
}

export default function AlumniProfilePage() {
  const params = useParams();
  const router = useRouter();
  const alumniId = params.id;

  const [alumni, setAlumni] = useState<AlumniDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlumni();
  }, [alumniId]);

  const loadAlumni = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/v1/alumni/${alumniId}`);
      setAlumni(res.data);
    } catch (error) {
      toast.error('Erreur de chargement du profil');
      router.push('/student/alumni');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={40} className="animate-spin text-orange-500" />
      </div>
    );
  }

  if (!alumni) return null;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-slate-500">
        <Link href="/student/alumni" className="hover:text-[#FF6B00]">Communauté Alumni</Link>
        <span className="mx-2">›</span>
        <span className="text-slate-900 font-medium">
          {alumni.first_name} {alumni.last_name}
        </span>
      </div>

      {/* Carte principale */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {/* Banner */}
        <div className="h-32 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500" />

        <div className="p-6 -mt-16">
          {/* Avatar + Nom */}
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-600 flex items-center justify-center text-white font-bold text-3xl border-4 border-white shadow-lg">
              {alumni.first_name[0]}{alumni.last_name[0]}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">
                  {alumni.first_name} {alumni.last_name}
                </h1>
                {alumni.is_verified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                    <CheckCircle size={12} />
                    Vérifié
                  </span>
                )}
              </div>
              <p className="text-slate-600 mt-1">
                {alumni.current_position || 'Poste non renseigné'}
                {alumni.company && ` · ${alumni.company}`}
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-500">
                {alumni.location && (
                  <span className="flex items-center gap-1">
                    <MapPin size={14} />
                    {alumni.location}
                  </span>
                )}
                {alumni.graduation_year && (
                  <span className="flex items-center gap-1">
                    <Calendar size={14} />
                    Promotion {alumni.graduation_year}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Link
                href={`/student/messages?to=${alumni.user_id}`}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-sm font-medium transition-all"
              >
                <MessageSquare size={16} />
                Discuter
              </Link>
              {alumni.linkedin_url && (
                <a
                  href={alumni.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors"
                >
                  <Link2 size={18} />
                </a>
              )}
              {alumni.website && (
                <a
                  href={alumni.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors"
                >
                  <Globe size={18} />
                </a>
              )}
            </div>
          </div>

          {/* Badges disponibilité */}
          <div className="flex flex-wrap gap-2 mt-4">
            {alumni.is_open_to_mentoring && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                <Handshake size={14} />
                Ouvert au mentorat
              </span>
            )}
            {alumni.is_open_to_internship && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                <Briefcase size={14} />
                Propose des stages
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Parcours académique */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
            <GraduationCap size={16} className="text-orange-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Parcours académique</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs text-slate-500">Filière</p>
            <p className="font-medium text-slate-900">{alumni.filiere || 'N/A'}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs text-slate-500">Domaine</p>
            <p className="font-medium text-slate-900">{alumni.domain || 'N/A'}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs text-slate-500">Niveau</p>
            <p className="font-medium text-slate-900">{alumni.level || 'N/A'}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs text-slate-500">Promotion</p>
            <p className="font-medium text-slate-900">{alumni.promotion || alumni.graduation_year || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Compétences */}
      {alumni.skills.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <Star size={16} className="text-purple-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Compétences</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {alumni.skills.map((skill, i) => (
              <span
                key={i}
                className="px-3 py-1.5 bg-purple-50 text-purple-700 text-sm font-medium rounded-full"
              >
                {skill.trim()}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Parcours professionnel */}
      {alumni.career_path && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Briefcase size={16} className="text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Parcours professionnel</h2>
          </div>
          <p className="text-slate-600 leading-relaxed whitespace-pre-line">
            {alumni.career_path}
          </p>
        </div>
      )}

      {/* Difficultés rencontrées */}
      {alumni.difficulties && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle size={16} className="text-red-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Difficultés rencontrées</h2>
          </div>
          <p className="text-slate-600 leading-relaxed whitespace-pre-line">
            {alumni.difficulties}
          </p>
        </div>
      )}

      {/* Conseils */}
      {alumni.advice && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <Lightbulb size={16} className="text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-green-900">
              Conseils aux étudiants
            </h2>
          </div>
          <p className="text-green-800 leading-relaxed whitespace-pre-line">
            {alumni.advice}
          </p>
        </div>
      )}

      {/* CTA Chat */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-600 rounded-2xl p-6 text-center">
        <Sparkles size={24} className="mx-auto text-white mb-2" />
        <h3 className="text-lg font-semibold text-white mb-1">
          Une question pour {alumni.first_name} ?
        </h3>
        <p className="text-orange-100 text-sm mb-4">
          N'hésitez pas à lui poser vos questions sur son parcours ou ses conseils
        </p>
        <Link
          href={`/student/messages?to=${alumni.user_id}`}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-orange-600 rounded-xl text-sm font-semibold hover:bg-orange-50 transition-colors"
        >
          <MessageSquare size={16} />
          Envoyer un message
        </Link>
      </div>
    </div>
  );
}