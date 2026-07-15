'use client';
import { useState, useEffect } from 'react';
import { Eye, Pencil, Trash2, Plus, Search, Loader2, ChevronRight, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { studentService } from '@/services/studentService';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/hooks/useConfirm';

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  matricule?: string;
  email?: string;
  phone?: string;
  level?: string;
  filiere?: string;
  domain?: string;  // ✅ NOUVEAU CHAMP
  status?: string;
  photo?: string;
  [key: string]: any;
}

// ✅ Fonction pour générer des abréviations
const getAbbreviation = (text: string): string => {
  if (!text) return '??';
  const stopWords = ['de', 'du', 'des', 'et', 'la', 'le', 'les'];
  const words = text.split(/\s+/).filter(w => !stopWords.includes(w.toLowerCase()));
  if (words.length === 1) return words[0].substring(0, 3).toUpperCase();
  return words.slice(0, 3).map(w => w.charAt(0).toUpperCase()).join('');
};

export default function StudentsPage() {
  const toast = useToast();
  const { confirm } = useConfirm();
  
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const [expandedFilieres, setExpandedFilieres] = useState<Set<string>>(new Set());
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const data: Student[] = await studentService.getAll();
      console.log('📊 Premier étudiant:', data[0]);
      console.log('📊 Domaine:', data[0]?.domain);
      console.log('📊 Filière:', data[0]?.filiere);
      setStudents(data);
      
      // ✅ Ouvrir tous les domaines par défaut
      const domains = new Set<string>();
      data.forEach((s) => {
        if (s.domain) domains.add(s.domain);
      });
      setExpandedDomains(domains);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    const ok = await confirm({
      title: 'Supprimer cet étudiant ?',
      message: `Voulez-vous vraiment supprimer ${name} ?`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
      icon: 'trash'
    });
    
    if (ok) {
      try {
        await studentService.delete(id);
        toast.success('Étudiant supprimé');
        loadStudents();
      } catch (error) {
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  const toggleDomain = (domain: string) => {
    const newSet = new Set(expandedDomains);
    newSet.has(domain) ? newSet.delete(domain) : newSet.add(domain);
    setExpandedDomains(newSet);
  };

  const toggleFiliere = (key: string) => {
    const newSet = new Set(expandedFilieres);
    newSet.has(key) ? newSet.delete(key) : newSet.add(key);
    setExpandedFilieres(newSet);
  };

  const toggleLevel = (key: string) => {
    const newSet = new Set(expandedLevels);
    newSet.has(key) ? newSet.delete(key) : newSet.add(key);
    setExpandedLevels(newSet);
  };

  const filteredStudents = students.filter(student => {
    const fullName = `${student.first_name || ''} ${student.last_name || ''}`.toLowerCase();
    const matricule = (student.matricule || '').toLowerCase();
    const filiere = (student.filiere || '').toLowerCase();
    const domain = (student.domain || '').toLowerCase();
    const searchTerm = search.toLowerCase();
    
    return fullName.includes(searchTerm) || 
           matricule.includes(searchTerm) || 
           filiere.includes(searchTerm) ||
           domain.includes(searchTerm);
  });

  // ✅✅✅ Grouper par Domaine → Filière → Niveau
  const grouped = filteredStudents.reduce((acc: any, student) => {
    const domain = student.domain || 'Non défini';  // ✅ Utiliser student.domain
    const filiere = student.filiere || 'Non défini';  // ✅ Utiliser student.filiere
    const level = student.level || 'Non défini';
    
    if (!acc[domain]) acc[domain] = {};
    if (!acc[domain][filiere]) acc[domain][filiere] = {};
    if (!acc[domain][filiere][level]) acc[domain][filiere][level] = [];
    acc[domain][filiere][level].push(student);
    
    return acc;
  }, {});

  const sortedDomains = Object.keys(grouped).sort((a, b) => a.localeCompare(b, 'fr'));

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Étudiants</h1>
          <p className="text-slate-500 mt-1">{students.length} étudiants dans votre université</p>
        </div>
        <Link
          href="/admin/students/create"
          className="bg-[#FF6B00] hover:bg-[#e55f00] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
        >
          <Plus size={16} />
          Ajouter un étudiant
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          placeholder="Rechercher par nom, matricule, filière ou domaine..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
        />
      </div>

      {/* Liste hiérarchique */}
      {sortedDomains.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <p className="text-slate-500">Aucun étudiant trouvé</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedDomains.map((domain) => {
            const isDomainExpanded = expandedDomains.has(domain);
            const domainStudents = Object.values(grouped[domain]).flatMap((f: any) => 
              Object.values(f).flatMap((l: any) => l)
            );
            
            return (
              <div key={domain} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* ✅ DOMAINE (ex: "Gestion & Communication") */}
                <button 
                  onClick={() => toggleDomain(domain)}
                  className="w-full px-6 py-4 bg-gradient-to-r from-purple-50 to-white hover:from-purple-100 flex items-center justify-between border-b border-slate-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <span className="text-purple-600 font-bold text-sm">{getAbbreviation(domain)}</span>
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-slate-900">{domain}</h3>
                      <p className="text-xs text-slate-500">{domainStudents.length} étudiant{domainStudents.length > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  {isDomainExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </button>

                {/* ✅ FILIÈRES (ex: "Marketing Communication") */}
                {isDomainExpanded && (
                  <div className="divide-y divide-slate-100">
                    {Object.keys(grouped[domain]).sort().map((filiere) => {
                      const filiereKey = `${domain}||${filiere}`;
                      const isFiliereExpanded = expandedFilieres.has(filiereKey);
                      const filiereStudents = Object.values(grouped[domain][filiere]).flatMap((l: any) => l);
                      
                      return (
                        <div key={filiereKey}>
                          <button 
                            onClick={() => toggleFiliere(filiereKey)}
                            className="w-full px-6 py-3 pl-20 bg-blue-50/50 hover:bg-blue-50 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                <span className="text-blue-600 font-bold text-xs">{getAbbreviation(filiere)}</span>
                              </div>
                              <span className="font-medium text-slate-900">{filiere}</span>
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{filiereStudents.length}</span>
                            </div>
                            {isFiliereExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>

                          {/* ✅ NIVEAUX (ex: "L2") */}
                          {isFiliereExpanded && (
                            <div className="divide-y divide-slate-100">
                              {Object.keys(grouped[domain][filiere]).sort().map((level) => {
                                const levelKey = `${domain}||${filiere}||${level}`;
                                const isLevelExpanded = expandedLevels.has(levelKey);
                                const levelStudents = grouped[domain][filiere][level].sort((a: Student, b: Student) => 
                                  a.last_name.localeCompare(b.last_name, 'fr')
                                );
                                
                                return (
                                  <div key={levelKey}>
                                    <button 
                                      onClick={() => toggleLevel(levelKey)}
                                      className="w-full px-6 py-2 pl-28 bg-orange-50/30 hover:bg-orange-50 flex items-center justify-between"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-slate-700 text-sm">{level}</span>
                                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{levelStudents.length}</span>
                                      </div>
                                      {isLevelExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                    </button>

                                    {/* ✅ ÉTUDIANTS */}
                                    {isLevelExpanded && (
                                      <div className="bg-white">
                                        <table className="min-w-full">
                                          <tbody className="divide-y divide-slate-100">
                                            {levelStudents.map((student: Student) => (
                                              <tr key={student.id} className="hover:bg-slate-50">
                                                <td className="px-6 py-3 pl-36">
                                                  <div className="flex items-center gap-3">
                                                    <img
                                                      src={student.photo ? `http://localhost:8000/uploads/${student.photo}` : `https://ui-avatars.com/api/?name=${student.first_name}+${student.last_name}&background=FF6B00&color=fff&size=64`}
                                                      alt=""
                                                      className="w-8 h-8 rounded-full object-cover"
                                                    />
                                                    <div>
                                                      <p className="font-medium text-slate-900 text-sm">{student.first_name} {student.last_name}</p>
                                                      <p className="text-xs text-slate-500 font-mono">{student.matricule}</p>
                                                    </div>
                                                  </div>
                                                </td>
                                                <td className="px-6 py-3 text-right">
                                                  <div className="flex items-center justify-end gap-1">
                                                    <Link href={`/admin/students/${student.id}`} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                                                      <Eye size={14} />
                                                    </Link>
                                                    <Link href={`/admin/students/${student.id}/edit`} className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg">
                                                      <Pencil size={14} />
                                                    </Link>
                                                    <button 
                                                      onClick={() => handleDelete(student.id, `${student.first_name} ${student.last_name}`)}
                                                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                                    >
                                                      <Trash2 size={14} />
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
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}