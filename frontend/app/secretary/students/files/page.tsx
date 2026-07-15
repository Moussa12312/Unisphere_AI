'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users, Search, Folder, Eye, Download, Filter,
  Mail, Phone, MapPin, Calendar, GraduationCap, BookOpen
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function SecretaryFilesPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/v1/students/');
      setStudents(response.data || []);
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter((student) => {
    const query = searchQuery.toLowerCase();
    const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
    const matricule = student.matricule?.toLowerCase() || '';
    const matchSearch = fullName.includes(query) || matricule.includes(query);
    const matchLevel = !filterLevel || student.level === filterLevel;
    return matchSearch && matchLevel;
  });

  const levels = ['L1', 'L2', 'L3', 'M1', 'M2'];

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const getLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      L1: 'bg-blue-500',
      L2: 'bg-green-500',
      L3: 'bg-yellow-500',
      M1: 'bg-orange-500',
      M2: 'bg-red-500'
    };
    return colors[level] || 'bg-slate-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B00] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dossiers étudiants</h1>
        <p className="text-slate-500 mt-1">Consultez les fiches complètes de chaque étudiant</p>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="🔍 Rechercher un dossier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          >
            <option value="">Tous les niveaux</option>
            {levels.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                viewMode === 'grid' ? 'bg-white text-[#FF6B00] shadow-sm' : 'text-slate-600'
              }`}
            >
              Grille
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                viewMode === 'list' ? 'bg-white text-[#FF6B00] shadow-sm' : 'text-slate-600'
              }`}
            >
              Liste
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          {filteredStudents.length} dossier{filteredStudents.length > 1 ? 's' : ''} trouvé{filteredStudents.length > 1 ? 's' : ''}
        </p>
      </div>

      {/* Affichage */}
      {filteredStudents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <Folder size={48} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Aucun dossier trouvé</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 min-[599px]:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.map((student) => (
            <Link
              key={student.id}
              href={`/secretary/students/${student.id}`}
              className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg hover:border-[#FF6B00]/30 transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-14 h-14 ${getLevelColor(student.level)} rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                    {getInitials(student.first_name, student.last_name)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 group-hover:text-[#FF6B00] transition-colors">
                      {student.first_name} {student.last_name}
                    </p>
                    <p className="text-xs text-slate-500 font-mono">{student.matricule}</p>
                  </div>
                </div>
                <Eye size={16} className="text-slate-400 group-hover:text-[#FF6B00] transition-colors" />
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <GraduationCap size={14} className="text-slate-400" />
                  <span>{student.level} - {student.filiere}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail size={14} className="text-slate-400" />
                  <span className="truncate">{student.email || 'Non renseigné'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone size={14} className="text-slate-400" />
                  <span>{student.phone || 'Non renseigné'}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  student.status === 'active' ? 'bg-green-100 text-green-700' :
                  student.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {student.status === 'active' ? 'Actif' : student.status === 'pending' ? 'En attente' : 'Inactif'}
                </span>
                <span className="text-xs text-slate-400">
                  Voir le dossier →
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Étudiant</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Niveau</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Contact</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${getLevelColor(student.level)} rounded-lg flex items-center justify-center text-white font-bold text-sm`}>
                        {getInitials(student.first_name, student.last_name)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{student.first_name} {student.last_name}</p>
                        <p className="text-xs text-slate-500 font-mono">{student.matricule}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">{student.level} - {student.filiere}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">{student.email}</td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/secretary/students/${student.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#FF6B00] hover:bg-[#FF6B00]/10 rounded-lg"
                    >
                      <Eye size={14} /> Voir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}