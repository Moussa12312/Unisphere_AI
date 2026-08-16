'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Users, Search, Download, Loader2, ArrowLeft,
  Mail, Phone, GraduationCap, Eye, Edit3
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

export default function CourseStudentsPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  
  const [course, setCourse] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadStudents();
  }, [params.id]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/v1/teacher/courses/${params.id}/students`);
      const data = response.data;
      
      // Les données peuvent contenir les infos du cours
      if (data.course) {
        setCourse(data.course);
        setStudents(Array.isArray(data.students) ? data.students : []);
      } else if (Array.isArray(data)) {
        setStudents(data);
      } else {
        setStudents([]);
      }
    } catch (error) {
      toast.error('Erreur de chargement');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = students.filter(student => {
    const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
    const matricule = (student.matricule || '').toLowerCase();
    const email = (student.email || '').toLowerCase();
    const searchTerm = search.toLowerCase();
    return fullName.includes(searchTerm) ||
           matricule.includes(searchTerm) ||
           email.includes(searchTerm);
  });

  const exportToCSV = () => {
    const headers = ['Matricule', 'Nom', 'Prénom', 'Email', 'Téléphone', 'Niveau', 'Filière'];
    const rows = filtered.map(s => {
      const escapeField = (field: any) => {
        if (!field) return '';
        const str = String(field).replace(/[\r\n]/g, ' ');
        if (str.includes(';') || str.includes('"')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };
      return [
        escapeField(s.matricule),
        escapeField(s.last_name),
        escapeField(s.first_name),
        escapeField(s.email),
        escapeField(s.phone),
        escapeField(s.level),
        escapeField(s.filiere)
      ];
    });

    const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `etudiants_${course?.code || 'cours'}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Export CSV réussi');
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
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-slate-500">
        <Link href="/teacher/courses" className="hover:text-[#FF6B00] flex items-center gap-1">
          <ArrowLeft size={14} />
          Mes cours
        </Link>
        <span className="mx-2">›</span>
        <span className="text-slate-900 font-medium">
          {course?.title || `Cours #${params.id}`}
        </span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30">
              <Users size={24} className="text-white" />
            </div>
            Étudiants du cours
          </h1>
          {course && (
            <p className="text-slate-500 mt-1">
              {course.title} • {course.code} • {course.level}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
          >
            <Download size={16} />
            Export CSV
          </button>
          <Link
            href={`/teacher/grades?course=${params.id}`}
            className="flex items-center gap-2 px-4 py-2 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Edit3 size={16} />
            Saisir notes
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users size={20} className="text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-1">Total étudiants</p>
          <p className="text-2xl font-bold text-slate-900">{students.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Mail size={20} className="text-green-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-1">Avec email</p>
          <p className="text-2xl font-bold text-slate-900">
            {students.filter(s => s.email).length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <GraduationCap size={20} className="text-purple-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-1">Filtrés</p>
          <p className="text-2xl font-bold text-slate-900">{filtered.length}</p>
        </div>
      </div>

      {/* Recherche */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="🔍 Rechercher par nom, matricule ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          />
        </div>
        {filtered.length !== students.length && (
          <p className="text-xs text-slate-500 mt-3">
            {filtered.length} résultat{filtered.length > 1 ? 's' : ''} sur {students.length}
          </p>
        )}
      </div>

      {/* Liste des étudiants */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-16 text-center">
            <Users size={48} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Aucun étudiant trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Étudiant</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Matricule</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Email</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Niveau</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Filière</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((student, idx) => (
                  <tr key={student.id || idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#FF6B00]/10 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-[#FF6B00] font-bold text-sm">
                            {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">
                            {student.first_name} {student.last_name}
                          </p>
                          {student.phone && (
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                              <Phone size={10} />
                              {student.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs text-slate-600">{student.matricule}</span>
                    </td>
                    <td className="py-3 px-4">
                      <a
                        href={`mailto:${student.email}`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {student.email || '-'}
                      </a>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded">
                        {student.level}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {student.filiere}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={`mailto:${student.email}`}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Envoyer email"
                        >
                          <Mail size={16} />
                        </a>
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