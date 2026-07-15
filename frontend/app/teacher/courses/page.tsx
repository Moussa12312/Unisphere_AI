'use client';

import { useState, useEffect } from 'react';
import {
  BookOpen, Users, Edit3, Eye, Search, Loader2,
  Clock, Award, GraduationCap
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

interface Course {
  id: number;
  code: string;
  title: string;
  department: string;
  level: string;
  students_count: number;
  grades_count: number;
  credits: number;
  hours: number;
}

export default function TeacherCoursesPage() {
  const toast = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/v1/teacher/courses');
      setCourses(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast.error('Erreur de chargement des cours');
    } finally {
      setLoading(false);
    }
  };

  const filtered = courses.filter(course => {
    const matchSearch =
      course.title.toLowerCase().includes(search.toLowerCase()) ||
      course.code.toLowerCase().includes(search.toLowerCase());
    const matchLevel = !filterLevel || course.level === filterLevel;
    const matchDepartment = !filterDepartment || course.department === filterDepartment;
    return matchSearch && matchLevel && matchDepartment;
  });

  const levels = [...new Set(courses.map(c => c.level).filter(Boolean))];
  const departments = [...new Set(courses.map(c => c.department).filter(Boolean))];

  const stats = {
    total: courses.length,
    students: courses.reduce((sum, c) => sum + (c.students_count || 0), 0),
    levels: levels.length,
    departments: departments.length
  };

  const getProgressColor = (progress: number) => {
    if (progress === 100) return 'bg-green-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress > 0) return 'bg-orange-500';
    return 'bg-slate-200';
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
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <BookOpen size={24} className="text-white" />
          </div>
          Mes cours
        </h1>
        <p className="text-slate-500 mt-1">
          {courses.length} cours assignés à votre enseignement
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <BookOpen size={20} className="text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-1">Total cours</p>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Users size={20} className="text-green-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-1">Étudiants</p>
          <p className="text-2xl font-bold text-slate-900">{stats.students}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <GraduationCap size={20} className="text-purple-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-1">Niveaux</p>
          <p className="text-2xl font-bold text-slate-900">{stats.levels}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Award size={20} className="text-orange-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-1">Filières</p>
          <p className="text-2xl font-bold text-slate-900">{stats.departments}</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="🔍 Rechercher un cours..."
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
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          >
            <option value="">Toutes les filières</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        {filtered.length !== courses.length && (
          <p className="text-xs text-slate-500 mt-3">
            {filtered.length} résultat{filtered.length > 1 ? 's' : ''} sur {courses.length}
          </p>
        )}
      </div>

      {/* Liste des cours */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <BookOpen size={48} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Aucun cours assigné</p>
          <p className="text-xs text-slate-400 mt-2">
            Contactez l'administration pour être assigné à des cours
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((course) => {
            const progress = course.students_count > 0
              ? Math.round((course.grades_count / course.students_count) * 100)
              : 0;

            return (
              <div
                key={course.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg hover:border-[#FF6B00]/30 transition-all"
              >
                {/* En-tête du cours */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500 font-mono mb-1">{course.code}</p>
                    <h3 className="text-lg font-bold text-slate-900 line-clamp-2">
                      {course.title}
                    </h3>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 ml-3">
                    <BookOpen size={20} className="text-white" />
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                    {course.level}
                  </span>
                  <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-full truncate max-w-[150px]">
                    {course.department}
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="p-2 bg-slate-50 rounded-lg text-center">
                    <p className="text-xs text-slate-500">Étudiants</p>
                    <p className="text-sm font-bold text-slate-900">{course.students_count}</p>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg text-center">
                    <p className="text-xs text-slate-500">Crédits</p>
                    <p className="text-sm font-bold text-slate-900">{course.credits}</p>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg text-center">
                    <p className="text-xs text-slate-500">Heures</p>
                    <p className="text-sm font-bold text-slate-900">{course.hours}h</p>
                  </div>
                </div>

                {/* Progression des notes */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-slate-600 font-medium">
                      Notes saisies
                    </p>
                    <p className="text-xs text-slate-500">
                      {course.grades_count}/{course.students_count}
                    </p>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getProgressColor(progress)} transition-all duration-500`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1 text-right">
                    {progress}%
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-slate-100">
                  <Link
                    href={`/teacher/courses/${course.id}/students`}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium transition-colors"
                  >
                    <Users size={13} />
                    Étudiants
                  </Link>
                  <Link
                    href={`/teacher/grades?course=${course.id}&level=${course.level}&department=${encodeURIComponent(course.department)}`}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    <Edit3 size={13} />
                    Saisir notes
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}