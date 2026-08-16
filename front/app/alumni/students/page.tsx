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
      setConnections(res.data.filter((c: any) => c.status === 'accepted') || []);
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
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mes étudiants mentorés</h1>
        <p className="text-slate-500 mt-1">
          {connections.length} étudiant(s) sur 5 maximum
        </p>
      </div>

      {connections.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <Users size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">Vous n'avez pas encore d'étudiants mentorés</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {connections.map((conn) => (
            <div key={conn.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold">
                  {conn.student?.first_name?.[0]}{conn.student?.last_name?.[0]}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">
                    {conn.student?.first_name} {conn.student?.last_name}
                  </h3>
                  <p className="text-sm text-slate-500">{conn.student?.level}</p>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <BookOpen size={14} />
                  <span>{conn.student?.filiere}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  {conn.connection_type === 'mentor' ? (
                    <><GraduationCap size={14} /> <span>Mentorat</span></>
                  ) : conn.connection_type === 'directeur_memoire' ? (
                    <><BookOpen size={14} /> <span>Direction mémoire</span></>
                  ) : (
                    <><Handshake size={14} /> <span>Ami</span></>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Link
                  href={`/alumni/students/${conn.student?.id}`}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"
                >
                  <Eye size={14} />
                  Voir
                </Link>
                <Link
                  href={`/alumni/messages?to=${conn.student?.user_id}`}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-sm font-medium"
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