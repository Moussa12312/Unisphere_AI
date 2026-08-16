'use client';

import { useState, useEffect } from 'react';
import {
  Users, Search, Mail, Phone, BookOpen,
  Award, TrendingUp, Loader2, Filter
} from 'lucide-react';
import Link from 'next/link';
import api, { API_BASE_URL } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  matricule: string;
  email: string;
  phone?: string;
  level: string;
  filiere: string;
  photo?: string;
  courses: Array<{
    id: number;
    title: string;
    code: string;
  }>;
  average_grade: number;
  attendance_rate: number;
}

export default function TeacherStudentsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [filterFiliere, setFilterFiliere] = useState('');

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/v1/teacher/students');
      setStudents(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
    const matricule = student.matricule.toLowerCase();
    const email = student.email.toLowerCase();
    
    const matchSearch = !search || 
      fullName.includes(search.toLowerCase()) ||
      matricule.includes(search.toLowerCase()) ||
      email.includes(search.toLowerCase());
    
    const matchLevel = !filterLevel || student.level === filterLevel;
    const matchFiliere = !filterFiliere || student.filiere === filterFiliere;
    
    return matchSearch && matchLevel && matchFiliere;
  });

  const levels = [...new Set(students.map(s => s.level).filter(Boolean))];
  const filieres = [...new Set(students.map(s => s.filiere).filter(Boolean))];

  const stats = {
    total: students.length,
    levels: levels.length,
    filieres: filieres.length,
    avgGrade: students.length > 0 
      ? students.reduce((sum, s) => sum + s.average_grade, 0) / students.length 
      : 0
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 15) return 'text-green-600 bg-green-50';
    if (grade >= 10) return 'text-blue-600 bg-blue-50';
    if (grade >= 5) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getAttendanceColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 75) return 'text-blue-600';
    if (rate >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

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
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
            <Users size={24} className="text-white" />
          </div>
          Mes étudiants
        </h1>
        <p className="text-slate-500 mt-1">
          {students.length} étudiants dans vos cours
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Users size={20} className="text-green-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-1">Total étudiants</p>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <BookOpen size={20} className="text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-1">Niveaux</p>
          <p className="text-2xl font-bold text-slate-900">{stats.levels}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Filter size={20} className="text-purple-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-1">Filières</p>
          <p className="text-2xl font-bold text-slate-900">{stats.filieres}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Award size={20} className="text-orange-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-1">Moyenne générale</p>
          <p className="text-2xl font-bold text-orange-600">{stats.avgGrade.toFixed(2)}/20</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 relative">
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
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          >
            <option value="">Tous les niveaux</option>
            {levels.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <select
            value={filterFiliere}
            onChange={(e) => setFilterFiliere(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          >
            <option value="">Toutes les filières</option>
            {filieres.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        {filteredStudents.length !== students.length && (
          <p className="text-xs text-slate-500 mt-3">
            {filteredStudents.length} résultat{filteredStudents.length > 1 ? 's' : ''} sur {students.length}
          </p>
        )}
      </div>

      {/* Liste des étudiants */}
      {filteredStudents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <Users size={48} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Aucun étudiant trouvé</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.map((student) => (
            <div
              key={student.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg hover:border-[#FF6B00]/30 transition-all"
            >
              {/* En-tête */}
              <div className="flex items-start gap-3 mb-4">
                {student.photo ? (
                  <img
                    src={`${API_BASE_URL}/uploads/${student.photo}`}
                    alt={`${student.first_name} ${student.last_name}`}
                    className="w-14 h-14 rounded-xl object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 bg-gradient-to-br from-[#FF6B00] to-orange-500 rounded-xl flex items-center justify-center text-white text-lg font-bold">
                    {student.first_name.charAt(0)}{student.last_name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 truncate">
                    {student.first_name} {student.last_name}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">{student.matricule}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                      {student.level}
                    </span>
                    <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-xs font-medium rounded-full truncate max-w-[100px]">
                      {student.filiere}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-1 mb-1">
                    <Award size={12} className="text-orange-600" />
                    <p className="text-xs text-slate-500">Moyenne</p>
                  </div>
                  <p className={`text-sm font-bold ${getGradeColor(student.average_grade)}`}>
                    {student.average_grade.toFixed(2)}/20
                  </p>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-1 mb-1">
                    <TrendingUp size={12} className="text-green-600" />
                    <p className="text-xs text-slate-500">Présence</p>
                  </div>
                  <p className={`text-sm font-bold ${getAttendanceColor(student.attendance_rate)}`}>
                    {student.attendance_rate}%
                  </p>
                </div>
              </div>

              {/* Cours */}
              <div className="mb-4">
                <p className="text-xs font-medium text-slate-500 mb-2">
                  {student.courses.length} cours
                </p>
                <div className="space-y-1">
                  {student.courses.slice(0, 2).map((course) => (
                    <div key={course.id} className="flex items-center gap-2 text-xs text-slate-600">
                      <BookOpen size={12} className="text-slate-400" />
                      <span className="truncate">{course.title}</span>
                    </div>
                  ))}
                  {student.courses.length > 2 && (
                    <p className="text-xs text-slate-400">
                      +{student.courses.length - 2} autre{student.courses.length - 2 > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>

              {/* Contact */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <Link
                  href={`mailto:${student.email}`}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium transition-colors"
                >
                  <Mail size={12} />
                  Email
                </Link>
                {student.phone && (
                  <Link
                    href={`tel:${student.phone}`}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-medium transition-colors"
                  >
                    <Phone size={12} />
                    Appeler
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}