'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users, GraduationCap, MessageSquare, Loader2, Eye,
  BookOpen, Handshake
} from 'lucide-react';
import api from '@/lib/api';

export default function AlumniStudentsPage() {
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      const res = await api.get('/api/v1/alumni/me/connections');
      setConnections(res.data?.filter((c: any) => c.status === 'accepted') || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
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
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Mes étudiants mentorés</h1>
        <p className="text-slate-500 text-sm mt-1">
          {connections.length} étudiant(s) sur 5 maximum
        </p>
      </div>

      {connections.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 sm:p-16 text-center shadow-sm">
          <Users size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-700 font-semibold text-base">Vous n'avez pas encore d'étudiants mentorés</p>
          <p className="text-xs text-slate-400 mt-1">Acceptez des demandes de mentorat pour commencer à accompagner des étudiants.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {connections.map((conn) => (
            <div key={conn.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold shrink-0 shadow-sm">
                    {conn.student?.first_name?.[0]}{conn.student?.last_name?.[0]}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                      {conn.student?.first_name} {conn.student?.last_name}
                    </h3>
                    <p className="text-xs text-slate-500">{conn.student?.level} - {conn.student?.matricule}</p>
                  </div>
                </div>

                <div className="space-y-2 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <BookOpen size={14} className="text-slate-400 shrink-0" />
                    <span className="truncate">{conn.student?.filiere}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    {conn.connection_type === 'mentor' ? (
                      <><GraduationCap size={14} className="text-purple-500 shrink-0" /> <span className="font-medium text-purple-700">Mentorat Académique</span></>
                    ) : conn.connection_type === 'directeur_memoire' ? (
                      <><BookOpen size={14} className="text-blue-500 shrink-0" /> <span className="font-medium text-blue-700">Direction mémoire</span></>
                    ) : (
                      <><Handshake size={14} className="text-emerald-500 shrink-0" /> <span className="font-medium text-emerald-700">Réseau & Conseils</span></>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <Link
                  href={`/alumni/students/${conn.student?.id}`}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                >
                  <Eye size={14} />
                  Voir profil
                </Link>
                <Link
                  href={`/alumni/messages?to=${conn.student?.user_id}`}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-xs font-semibold transition-colors shadow-sm"
                >
                  <MessageSquare size={14} />
                  Chat
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
