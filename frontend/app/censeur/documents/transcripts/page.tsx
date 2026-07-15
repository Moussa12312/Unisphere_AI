'use client';

import { useState, useEffect } from 'react';
import {
  ScrollText, Loader2, Search, Download, Eye,
  Filter, Calendar, Users, Award, TrendingUp
} from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

export default function CenseurTranscriptsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [filterFiliere, setFilterFiliere] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedSession) {
      loadStudents();
    }
  }, [selectedSession]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sessionsRes, studentsRes] = await Promise.all([
        api.get('/api/v1/exam-sessions/').catch(() => ({ data: [] })),
        api.get('/api/v1/students/').catch(() => ({ data: [] }))
      ]);
      
      setSessions(Array.isArray(sessionsRes.data) ? sessionsRes.data : (sessionsRes.data?.data || []));
      setStudents(Array.isArray(studentsRes.data) ? studentsRes.data : (studentsRes.data?.data || []));
    } catch (error) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    try {
      const response = await api.get('/api/v1/students/');
      const data = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      setStudents(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleGenerateTranscript = async (studentId: number, studentName: string) => {
    try {
      const params = selectedSession ? { session_id: selectedSession } : {};
      const response = await api.get(`/api/v1/documents/generate-transcript/${studentId}`, {
        params,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `releve_${studentName.replace(/\s+/g, '_')}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Relevé généré');
    } catch (error: any) {
      toast.error('Erreur lors de la génération');
    }
  };

  const handleViewTranscript = async (studentId: number) => {
    try {
      const params = selectedSession ? { session_id: selectedSession } : {};
      const response = await api.get(`/api/v1/documents/generate-transcript/${studentId}`, {
        params,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    } catch (error) {
      toast.error('Erreur lors de l\'ouverture');
    }
  };

  const filieres = [...new Set(students.map(s => s.filiere).filter(Boolean))];

  const filteredStudents = students.filter(s => {
    const name = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase();
    const matricule = (s.matricule || '').toLowerCase();
    const matchSearch = name.includes(search.toLowerCase()) || matricule.includes(search.toLowerCase());
    const matchFiliere = !filterFiliere || s.filiere === filterFiliere;
    return matchSearch && matchFiliere;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-[#FF6B00]" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <ScrollText size={24} className="text-white" />
          </div>
          Relevés de notes
        </h1>
        <p className="text-slate-500 mt-1">Générez et consultez les relevés de notes des étudiants</p>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="🔍 Rechercher un étudiant..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>
          <select
            value={filterFiliere}
            onChange={(e) => setFilterFiliere(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          >
            <option value="">Toutes les filières</option>
            {filieres.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <select
            value={selectedSession || ''}
            onChange={(e) => setSelectedSession(e.target.value ? parseInt(e.target.value) : null)}
            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          >
            <option value="">Toutes les sessions</option>
            {sessions.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total étudiants</p>
              <p className="text-2xl font-bold text-slate-900">{students.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <ScrollText size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Affichés</p>
              <p className="text-2xl font-bold text-slate-900">{filteredStudents.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Award size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Filières</p>
              <p className="text-2xl font-bold text-slate-900">{filieres.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Calendar size={20} className="text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Sessions</p>
              <p className="text-2xl font-bold text-slate-900">{sessions.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Liste des étudiants */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredStudents.length === 0 ? (
          <div className="p-16 text-center">
            <ScrollText size={48} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Aucun étudiant trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">#</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Étudiant</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Matricule</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Filière</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Niveau</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student, idx) => (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-xs text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                          {(student.first_name?.[0] || '') + (student.last_name?.[0] || '')}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">
                            {student.first_name} {student.last_name}
                          </p>
                          <p className="text-xs text-slate-500">{student.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-xs text-slate-500 font-mono">{student.matricule}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                        {student.filiere || 'N/A'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">{student.level || 'N/A'}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleViewTranscript(student.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Voir le relevé"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleGenerateTranscript(student.id, `${student.first_name} ${student.last_name}`)}
                          className="p-2 text-[#FF6B00] hover:bg-orange-50 rounded-lg transition-colors"
                          title="Télécharger le relevé"
                        >
                          <Download size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}