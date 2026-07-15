'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users, Search, Plus, Eye, Trash2,
  Download, ChevronLeft, ChevronRight
} from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/hooks/useConfirm';

export default function SecretaryStudentsPage() {
  const toast = useToast();
  const { confirm } = useConfirm();
  
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [filterFiliere, setFilterFiliere] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  const handleDelete = async (student: any) => {
    const ok = await confirm({
      title: 'Supprimer cet étudiant ?',
      message: `Voulez-vous vraiment supprimer ${student.first_name} ${student.last_name} (${student.matricule}) ? Cette action est irréversible.`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
      icon: 'trash'
    });
    
    if (ok) {
      try {
        await api.delete(`/api/v1/students/${student.id}`);
        toast.success('Étudiant supprimé');
        loadStudents();
      } catch (error: any) {
        toast.error(error.message || 'Erreur lors de la suppression');
      }
    }
  };

  const filteredStudents = students.filter((student) => {
    const query = searchQuery.toLowerCase();
    const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
    const matricule = student.matricule?.toLowerCase() || '';
    const email = student.email?.toLowerCase() || '';
    const matchSearch = fullName.includes(query) || matricule.includes(query) || email.includes(query);
    const matchLevel = !filterLevel || student.level === filterLevel;
    const matchFiliere = !filterFiliere || student.filiere === filterFiliere;
    const matchStatus = !filterStatus || student.status === filterStatus;
    return matchSearch && matchLevel && matchFiliere && matchStatus;
  });

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const stats = {
    total: students.length,
    active: students.filter(s => s.status === 'active').length,
    pending: students.filter(s => s.status === 'pending').length,
    levels: [...new Set(students.map(s => s.level).filter(Boolean))]
  };

  const levels = ['L1', 'L2', 'L3', 'M1', 'M2'];
  const filieres = [...new Set(students.map(s => s.filiere).filter(Boolean))];

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { bg: string; text: string; label: string }> = {
      active: { bg: 'bg-green-100', text: 'text-green-700', label: 'Actif' },
      pending: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'En attente' },
      inactive: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Inactif' },
      graduated: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Diplômé' }
    };
    const config = configs[status] || configs.active;
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const exportToCSV = () => {
    const headers = ['Matricule', 'Nom', 'Prénom', 'Email', 'Téléphone', 'Niveau', 'Filière', 'Statut'];
    const rows = filteredStudents.map(s => {
      const escapeField = (field: any) => {
        if (field === null || field === undefined) return '';
        const str = String(field).replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\r/g, ' ');
        if (str.includes(';') || str.includes('"') || str.includes('\n')) {
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
        escapeField(s.filiere),
        escapeField(s.status)
      ];
    });
    const csvContent = [headers.join(';'), ...rows.map(row => row.join(';'))].join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `etudiants_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Export CSV réussi');
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Étudiants</h1>
          <p className="text-slate-500 mt-1">Gérez tous les étudiants de l'université</p>
        </div>
        <Link
          href="/secretary/students/enrollment"
          className="flex items-center gap-2 px-5 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-sm font-medium transition-all shadow-md"
        >
          <Plus size={16} />
          Nouvelle inscription
        </Link>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Total</p>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Actifs</p>
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">En attente</p>
          <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Niveaux</p>
          <p className="text-2xl font-bold text-blue-600">{stats.levels.length}</p>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="md:col-span-2 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="🔍 Rechercher par nom, matricule, email..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>
          <select
            value={filterLevel}
            onChange={(e) => { setFilterLevel(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          >
            <option value="">Tous les niveaux</option>
            {levels.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <select
            value={filterFiliere}
            onChange={(e) => { setFilterFiliere(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          >
            <option value="">Toutes les filières</option>
            {filieres.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <button
            onClick={exportToCSV}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
        {filteredStudents.length !== students.length && (
          <p className="text-xs text-slate-500 mt-3">
            {filteredStudents.length} résultat{filteredStudents.length > 1 ? 's' : ''} sur {students.length}
          </p>
        )}
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {paginatedStudents.length === 0 ? (
          <div className="text-center py-16">
            <Users size={48} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Aucun étudiant trouvé</p>
            <Link
              href="/secretary/students/enrollment"
              className="inline-block mt-4 text-sm text-[#FF6B00] hover:underline"
            >
              Inscrire un étudiant →
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Étudiant</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Matricule</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Niveau</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Filière</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Statut</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors">
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
                            <p className="text-xs text-slate-500">{student.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs text-slate-600">{student.matricule}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded">
                          {student.level}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">{student.filiere}</td>
                      <td className="py-3 px-4">{getStatusBadge(student.status)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/secretary/students/${student.id}`}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Voir"
                          >
                            <Eye size={16} />
                          </Link>
                          <button
                            onClick={() => handleDelete(student)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
                <p className="text-sm text-slate-500">
                  Page {currentPage} sur {totalPages} • {filteredStudents.length} étudiant{filteredStudents.length > 1 ? 's' : ''}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}