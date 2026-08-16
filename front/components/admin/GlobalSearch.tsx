'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, X, Loader2, Users, BookOpen, CreditCard, 
  GraduationCap, Briefcase, Receipt, FileText, Clock,
  ChevronRight, ArrowLeft
} from 'lucide-react';
import api from '@/lib/api';

interface SearchResult {
  id: number;
  type: 'student' | 'teacher' | 'course' | 'payment' | 'alumni' | 'announcement';
  title: string;
  subtitle: string;
  href: string;
  icon: any;
  badge?: string;
  badgeColor?: string;
}

interface GlobalSearchProps {
  compact?: boolean;  // Mode compact (mobile) : icône qui s'étend
}

export default function GlobalSearch({ compact = false }: GlobalSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);  // Mode compact : étendu ?
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ==========================================
  // Fermer au clic extérieur
  // ==========================================
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        // En mode compact, se replier si vide
        if (compact && !query) {
          setIsExpanded(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [compact, query]);

  // ==========================================
  // Raccourci clavier : Ctrl+K pour ouvrir la recherche
  // ==========================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (compact) setIsExpanded(true);
        setTimeout(() => inputRef.current?.focus(), 50);
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        if (compact) setIsExpanded(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [compact]);

  // ==========================================
  // Recherche avec debounce (300ms)
  // ==========================================
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        // Lancer toutes les recherches en parallèle
        const [studentsRes, teachersRes, coursesRes] = await Promise.all([
          api.get(`/api/v1/students/?search=${encodeURIComponent(query)}`).catch(() => ({ data: [] })),
          api.get(`/api/v1/teachers/?search=${encodeURIComponent(query)}`).catch(() => ({ data: [] })),
          api.get(`/api/v1/courses/?search=${encodeURIComponent(query)}`).catch(() => ({ data: [] })),
        ]);

        const allResults: SearchResult[] = [];

        // 🔹 Étudiants
        const students = Array.isArray(studentsRes.data) ? studentsRes.data : [];
        students.slice(0, 4).forEach((s: any) => {
          allResults.push({
            id: s.id,
            type: 'student',
            title: `${s.first_name} ${s.last_name}`,
            subtitle: `${s.matricule || ''} • ${s.filiere || ''} ${s.level || ''}`.trim(),
            href: `/admin/students/${s.id}`,
            icon: GraduationCap,
            badge: 'Étudiant',
            badgeColor: 'bg-blue-100 text-blue-700',
          });
        });

        // 🔹 Enseignants
        const teachers = Array.isArray(teachersRes.data) ? teachersRes.data : [];
        teachers.slice(0, 4).forEach((t: any) => {
          allResults.push({
            id: t.id,
            type: 'teacher',
            title: `${t.first_name} ${t.last_name}`,
            subtitle: t.email || t.speciality || 'Enseignant',
            href: `/admin/teachers/${t.id}`,
            icon: Briefcase,
            badge: 'Enseignant',
            badgeColor: 'bg-purple-100 text-purple-700',
          });
        });

        // 🔹 Cours
        const courses = Array.isArray(coursesRes.data) ? coursesRes.data : [];
        courses.slice(0, 4).forEach((c: any) => {
          allResults.push({
            id: c.id,
            type: 'course',
            title: c.title || c.name || 'Cours sans titre',
            subtitle: c.level || c.filiere || 'Cours',
            href: `/admin/courses/${c.id}`,
            icon: BookOpen,
            badge: 'Cours',
            badgeColor: 'bg-green-100 text-green-700',
          });
        });

        setResults(allResults);
      } catch (error) {
        console.error('Erreur recherche:', error);
      } finally {
        setLoading(false);
      }
    }, 300); // Debounce 300ms

    return () => clearTimeout(timer);
  }, [query]);

  // ==========================================
  // Sélection d'un résultat
  // ==========================================
  const handleSelect = (result: SearchResult) => {
    router.push(result.href);
    setQuery('');
    setResults([]);
    setIsOpen(false);
    if (compact) setIsExpanded(false);
    inputRef.current?.blur();
  };

  // ==========================================
  // Vider la recherche
  // ==========================================
  const handleClear = () => {
    setQuery('');
    setResults([]);
    inputRef.current?.focus();
  };

  // ==========================================
  // Mode compact replié : juste une icône
  // ==========================================
  if (compact && !isExpanded) {
    return (
      <button
        onClick={() => {
          setIsExpanded(true);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 flex-shrink-0 transition-colors"
        title="Rechercher"
      >
        <Search size={20} />
      </button>
    );
  }

  // ==========================================
  // Grouper les résultats par type
  // ==========================================
  const groupedResults = {
    student: results.filter(r => r.type === 'student'),
    teacher: results.filter(r => r.type === 'teacher'),
    course: results.filter(r => r.type === 'course'),
  };

  return (
    <div 
      className={`relative ${compact ? 'flex-1' : 'flex-1 max-w-md'}`} 
      ref={searchRef}
    >
      {/* Bouton retour en mode compact */}
      {compact && (
        <button
          onClick={() => {
            setIsExpanded(false);
            setQuery('');
            setResults([]);
            setIsOpen(false);
          }}
          className="absolute left-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded text-slate-600 z-10"
          title="Fermer"
        >
          <ArrowLeft size={16} />
        </button>
      )}
      
      {/* Icône de recherche */}
      <Search 
        className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${
          compact ? 'left-9' : 'left-3'
        }`} 
        size={18} 
      />
      
      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        placeholder={compact ? 'Rechercher...' : 'Rechercher étudiants, cours, enseignants...'}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => query.length >= 2 && setIsOpen(true)}
        className={`w-full py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] transition-all ${
          compact ? 'pl-16 pr-8' : 'pl-10 pr-20'
        }`}
      />
      
      {/* Raccourci clavier (uniquement mode normal) */}
      {!query && !compact && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
          <kbd className="hidden sm:inline-flex px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-medium text-slate-500">
            Ctrl+K
          </kbd>
        </div>
      )}
      
      {/* Bouton clear */}
      {query && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X size={16} />
        </button>
      )}

      {/* Dropdown résultats */}
      {isOpen && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden z-50">
          {loading ? (
            <div className="p-6 flex items-center justify-center gap-2 text-slate-500">
              <Loader2 size={18} className="animate-spin text-[#FF6B00]" />
              <span className="text-sm">Recherche en cours...</span>
            </div>
          ) : results.length > 0 ? (
            <div className="max-h-[500px] overflow-y-auto">
              {/* Étudiants */}
              {groupedResults.student.length > 0 && (
                <div className="border-b border-slate-100 last:border-0">
                  <div className="px-4 py-2 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
                    <GraduationCap size={12} />
                    Étudiants ({groupedResults.student.length})
                  </div>
                  {groupedResults.student.map((result) => (
                    <ResultItem key={`student-${result.id}`} result={result} onSelect={handleSelect} />
                  ))}
                </div>
              )}

              {/* Enseignants */}
              {groupedResults.teacher.length > 0 && (
                <div className="border-b border-slate-100 last:border-0">
                  <div className="px-4 py-2 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
                    <Briefcase size={12} />
                    Enseignants ({groupedResults.teacher.length})
                  </div>
                  {groupedResults.teacher.map((result) => (
                    <ResultItem key={`teacher-${result.id}`} result={result} onSelect={handleSelect} />
                  ))}
                </div>
              )}

              {/* Cours */}
              {groupedResults.course.length > 0 && (
                <div className="border-b border-slate-100 last:border-0">
                  <div className="px-4 py-2 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
                    <BookOpen size={12} />
                    Cours ({groupedResults.course.length})
                  </div>
                  {groupedResults.course.map((result) => (
                    <ResultItem key={`course-${result.id}`} result={result} onSelect={handleSelect} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Search size={28} className="text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-700">Aucun résultat</p>
              <p className="text-xs text-slate-500 mt-1">
                Aucun élément trouvé pour "<span className="font-medium">{query}</span>"
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==========================================
// Composant d'un résultat
// ==========================================
function ResultItem({ result, onSelect }: { result: SearchResult; onSelect: (r: SearchResult) => void }) {
  const Icon = result.icon;
  
  return (
    <button
      onClick={() => onSelect(result)}
      className="w-full px-4 py-3 hover:bg-slate-50 flex items-center gap-3 transition-colors text-left group"
    >
      {/* Icône */}
      <div className="w-10 h-10 bg-gradient-to-br from-[#FF6B00]/10 to-orange-500/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:from-[#FF6B00]/20 group-hover:to-orange-500/20 transition-all">
        <Icon size={18} className="text-[#FF6B00]" />
      </div>
      
      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-900 truncate text-sm">{result.title}</p>
        <p className="text-xs text-slate-500 truncate mt-0.5">{result.subtitle}</p>
      </div>
      
      {/* Badge + flèche */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {result.badge && (
          <span className={`hidden sm:inline-flex text-[10px] px-2 py-0.5 rounded-full font-medium ${result.badgeColor || 'bg-slate-100 text-slate-600'}`}>
            {result.badge}
          </span>
        )}
        <ChevronRight size={14} className="text-slate-300 group-hover:text-[#FF6B00] group-hover:translate-x-0.5 transition-all" />
      </div>
    </button>
  );
}