'use client';
import { useState, useEffect } from 'react';
import {
  Award, Users, MessageSquare, GraduationCap, Briefcase,
  TrendingUp, Calendar, CheckCircle, Clock, Star, Bell, ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';

export default function AlumniDashboardPage() {
  const [profile, setProfile] = useState<any>(null);
  const [connections, setConnections] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [profileRes, connectionsRes, requestsRes] = await Promise.all([
        api.get('/api/v1/alumni/me/profile'),
        api.get('/api/v1/alumni/me/connections'),
        api.get('/api/v1/alumni/me/requests'),
      ]);
      setProfile(profileRes.data);
      setConnections(connectionsRes.data || []);
      setRequests(requestsRes.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B00] border-t-transparent" />
      </div>
    );
  }

  const acceptedConnections = connections.filter(c => c.status === 'accepted');
  const pendingRequests = requests.filter(c => !c.status || c.status === 'pending');

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header de bienvenue */}
      <div className="bg-gradient-to-r from-[#FF6B00] to-orange-600 rounded-2xl p-5 sm:p-6 text-white shadow-lg shadow-orange-500/20">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
            <Award size={32} />
          </div>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold">
              Bienvenue, {profile?.first_name} {profile?.last_name} !
            </h1>
            <p className="text-orange-100 text-sm mt-0.5">
              {profile?.current_position || 'Alumni Réseau'} {profile?.company && `chez ${profile.company}`}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs sm:text-sm mb-1 sm:mb-2">
            <Users size={16} className="text-emerald-500 shrink-0" />
            <span className="truncate">Étudiants mentorés</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900">
            {acceptedConnections.length}
          </p>
          <p className="text-xs text-slate-400 mt-1">sur 5 max</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs sm:text-sm mb-1 sm:mb-2">
            <Bell size={16} className="text-orange-500 shrink-0" />
            <span className="truncate">Demandes en attente</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-orange-600">{pendingRequests.length}</p>
          <p className="text-xs text-slate-400 mt-1">à valider</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs sm:text-sm mb-1 sm:mb-2">
            <MessageSquare size={16} className="text-blue-500 shrink-0" />
            <span className="truncate">Conversations</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-blue-600">{acceptedConnections.length}</p>
          <p className="text-xs text-slate-400 mt-1">actives</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs sm:text-sm mb-1 sm:mb-2">
            <Calendar size={16} className="text-purple-500 shrink-0" />
            <span className="truncate">Membre depuis</span>
          </div>
          <p className="text-base sm:text-lg font-bold text-slate-900 truncate">
            {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }) : '2026'}
          </p>
          <p className="text-xs text-slate-400 mt-1">Promotion {profile?.graduation_year || 2022}</p>
        </div>
      </div>

      {/* Demandes en attente */}
      {pendingRequests.length > 0 && (
        <div className="bg-white rounded-2xl border border-orange-200 overflow-hidden shadow-sm">
          <div className="p-4 bg-orange-50/80 border-b border-orange-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-orange-600" />
              <h2 className="font-semibold text-orange-900 text-sm sm:text-base">
                Demandes en attente ({pendingRequests.length})
              </h2>
            </div>
            <Link href="/alumni/requests" className="text-xs text-orange-600 font-bold hover:underline flex items-center gap-1">
              Tout voir <ArrowRight size={13} />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {pendingRequests.slice(0, 5).map(req => (
              <div key={req.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold shrink-0">
                    {req.student?.first_name?.[0]}{req.student?.last_name?.[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">
                      {req.student?.first_name} {req.student?.last_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {req.student?.level} - {req.student?.filiere}
                    </p>
                    {req.message && (
                      <p className="text-xs text-slate-500 mt-0.5 italic">"{req.message}"</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                    req.connection_type === 'mentor' ? 'bg-purple-100 text-purple-700' :
                    req.connection_type === 'directeur_memoire' ? 'bg-blue-100 text-blue-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {req.connection_type === 'mentor' ? 'Mentorat' :
                     req.connection_type === 'directeur_memoire' ? 'Direction mémoire' : 'Ami'}
                  </span>
                  <Link
                    href="/alumni/requests"
                    className="px-3 py-1.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    Gérer
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mes étudiants mentorés */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
            <GraduationCap size={18} className="text-[#FF6B00]" />
            Mes étudiants mentorés ({acceptedConnections.length})
          </h2>
          <Link href="/alumni/students" className="text-xs sm:text-sm text-[#FF6B00] font-semibold hover:underline">
            Voir tout
          </Link>
        </div>
        {acceptedConnections.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {acceptedConnections.slice(0, 5).map(conn => (
              <div key={conn.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold shrink-0">
                    {conn.student?.first_name?.[0]}{conn.student?.last_name?.[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">
                      {conn.student?.first_name} {conn.student?.last_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {conn.student?.level} - {conn.student?.filiere} ({conn.student?.matricule})
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                    {conn.connection_type === 'mentor' ? '🎓 Mentor' : 
                     conn.connection_type === 'directeur_memoire' ? '📚 Dir. mémoire' : '🤝 Ami'}
                  </span>
                  <Link
                    href={`/alumni/students/${conn.student?.id}`}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                  >
                    Voir profil
                  </Link>
                  <Link
                    href={`/alumni/messages?to=${conn.student?.user_id}`}
                    className="px-3 py-1.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    Chat
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <Users size={40} className="mx-auto text-slate-300 mb-2" />
            <p className="text-slate-500 text-sm">Aucun étudiant mentoré pour le moment</p>
          </div>
        )}
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/alumni/profile"
          className="bg-white rounded-xl border border-slate-200 p-4 hover:border-[#FF6B00] transition-colors flex items-center gap-4 shadow-sm"
        >
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
            <Star size={20} className="text-[#FF6B00]" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-sm sm:text-base">Mon Profil Professionnel</p>
            <p className="text-xs text-slate-500">Poste, entreprise, parcours, conseils aux étudiants</p>
          </div>
        </Link>

        <Link
          href="/alumni/messages"
          className="bg-white rounded-xl border border-slate-200 p-4 hover:border-[#FF6B00] transition-colors flex items-center gap-4 shadow-sm"
        >
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
            <MessageSquare size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-sm sm:text-base">Messagerie & Réseau</p>
            <p className="text-xs text-slate-500">Échanger en direct avec vos étudiants mentorés</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
