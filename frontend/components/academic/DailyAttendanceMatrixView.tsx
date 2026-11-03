'use client';

import { useState, useEffect } from 'react';
import {
  Calendar, Search, Filter, CheckCircle2, XCircle, Clock,
  DoorOpen, BookOpen, AlertTriangle, Loader2, Download, ChevronDown, ChevronRight
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';
import { exportToExcel } from '@/lib/exportExcel';

interface ModuleSchedule {
  schedule_id: number;
  course_id: number;
  course_title: string;
  code: string;
  start_time: string;
  end_time: string;
  room?: string;
  status: string; // 'present', 'late', 'absent', 'non_pointe'
}

interface StudentMatrixRow {
  student_id: number;
  student_name: string;
  matricule: string;
  filiere: string;
  level: string;
  photo?: string;
  gate_scanned: boolean;
  gate_scan_time?: string;
  total_courses: number;
  attended_count: number;
  status_code: 'no_classes' | 'full_present' | 'partial' | 'on_campus' | 'absent';
  status_label: string;
  modules: ModuleSchedule[];
}

interface DailyAttendanceMatrixViewProps {
  initialDate?: string;
}

export default function DailyAttendanceMatrixView({
  initialDate = new Date().toISOString().split('T')[0]
}: DailyAttendanceMatrixViewProps) {
  const [date, setDate] = useState(initialDate);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ summary: any; students: StudentMatrixRow[] }>({
    summary: {},
    students: []
  });

  // Filtres
  const [search, setSearch] = useState('');
  const [selectedFiliere, setSelectedFiliere] = useState('all');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [filterType, setFilterType] = useState<'all' | 'gate' | 'partial' | 'absent'>('all');
  const [filieres, setFilieres] = useState<any[]>([]);

  // Lignes dépliées pour voir le détail des cours
  const [expandedStudents, setExpandedStudents] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadFilieres();
  }, []);

  useEffect(() => {
    loadMatrix();
  }, [date, selectedFiliere, selectedLevel]);

  const loadFilieres = async () => {
    try {
      const res = await api.get('/api/v1/filieres/').catch(() => ({ data: [] }));
      setFilieres(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadMatrix = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('date', date);
      if (selectedFiliere !== 'all') params.append('filiere', selectedFiliere);
      if (selectedLevel !== 'all') params.append('level', selectedLevel);

      const res = await api.get(`/api/v1/attendance/daily-matrix?${params.toString()}`);
      setData(res.data || { summary: {}, students: [] });
    } catch (err: any) {
      toast.error('Erreur lors du chargement de la matrice de présence');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (studentId: number) => {
    setExpandedStudents(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const toggleExpandAll = () => {
    if (expandedStudents.size > 0) {
      setExpandedStudents(new Set());
    } else {
      setExpandedStudents(new Set(filteredStudents.map(s => s.student_id)));
    }
  };

  // Filtrage côté client
  const filteredStudents = (data.students || []).filter(student => {
    const matchSearch = 
      student.student_name.toLowerCase().includes(search.toLowerCase()) ||
      student.matricule.toLowerCase().includes(search.toLowerCase()) ||
      student.filiere.toLowerCase().includes(search.toLowerCase());

    let matchType = true;
    if (filterType === 'gate') matchType = student.gate_scanned;
    else if (filterType === 'partial') matchType = student.status_code === 'partial';
    else if (filterType === 'absent') matchType = student.status_code === 'absent';

    return matchSearch && matchType;
  });

  const exportMatrixExcel = () => {
    if (filteredStudents.length === 0) {
      toast.error('Aucune donnée à exporter');
      return;
    }
    const exportData = filteredStudents.map(s => ({
      'Matricule': s.matricule,
      'Étudiant': s.student_name,
      'Filière': s.filiere,
      'Niveau': s.level,
      'Scan Portail (Gardien)': s.gate_scanned ? `Oui (${s.gate_scan_time || 'Présent'})` : 'Non',
      'Modules du jour': `${s.attended_count} / ${s.total_courses}`,
      'Statut Global': s.status_label,
      'Détail des modules': s.modules.map(m => `${m.course_title} (${m.start_time}-${m.end_time}): ${m.status}`).join(' | ')
    }));
    exportToExcel(exportData, `Presences_Universite_Emploi_Du_Temps_${date}`);
    toast.success('Export Excel téléchargé avec succès');
  };

  const getStatusBadge = (code: string, label: string) => {
    switch (code) {
      case 'full_present':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold"><CheckCircle2 size={13} /> {label}</span>;
      case 'partial':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold"><Clock size={13} /> {label}</span>;
      case 'on_campus':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-bold"><DoorOpen size={13} /> {label}</span>;
      case 'no_classes':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium">{label}</span>;
      case 'absent':
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-100 text-rose-800 rounded-lg text-xs font-bold"><XCircle size={13} /> {label}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Barre de contrôles et filtres */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Sélecteur de date */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <Calendar className="w-4 h-4 text-[#FF6B00]" />
            <span className="text-xs font-bold text-slate-700">Date :</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
            />
            <span className="text-xs text-slate-400 font-medium">({data.summary?.day_name || ''})</span>
          </div>

          {/* Recherche */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher un étudiant par nom, matricule ou filière..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:bg-white transition-all"
            />
          </div>

          {/* Export & Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={exportMatrixExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Download size={14} />
              <span>Export Excel</span>
            </button>
            <button
              onClick={toggleExpandAll}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <BookOpen size={14} />
              <span>{expandedStudents.size > 0 ? 'Tout replier' : 'Tout déplier'}</span>
            </button>
          </div>
        </div>

        {/* Pilules de filtres par Filière et Type */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-400 font-semibold mr-1">Filtre rapide :</span>
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
              filterType === 'all' ? 'bg-[#FF6B00] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tous ({data.students?.length || 0})
          </button>
          <button
            onClick={() => setFilterType('gate')}
            className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
              filterType === 'gate' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            <DoorOpen size={12} />
            Scannés portail gardien ({data.summary?.gate_scanned_count || 0})
          </button>
          <button
            onClick={() => setFilterType('partial')}
            className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
              filterType === 'partial' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            <Clock size={12} />
            Présence partielle ({data.summary?.present_partial || 0})
          </button>
          <button
            onClick={() => setFilterType('absent')}
            className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
              filterType === 'absent' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            <XCircle size={12} />
            Absents complets ({data.summary?.absent || 0})
          </button>

          <div className="ml-auto flex items-center gap-2">
            <select
              value={selectedFiliere}
              onChange={(e) => setSelectedFiliere(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
            >
              <option value="all">Toutes filières</option>
              {filieres.map(f => (
                <option key={f.id} value={f.name}>{f.name}</option>
              ))}
            </select>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
            >
              <option value="all">Tous niveaux</option>
              <option value="L1">L1</option>
              <option value="L2">L2</option>
              <option value="L3">L3</option>
              <option value="M1">M1</option>
              <option value="M2">M2</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cartes de statistiques du jour */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-slate-400 mb-1 text-xs font-semibold uppercase">
            <DoorOpen size={16} className="text-blue-600" />
            <span>Portail Gardien</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{data.summary?.gate_scanned_count || 0}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Étudiants entrés sur le campus</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-emerald-600 mb-1 text-xs font-semibold uppercase">
            <CheckCircle2 size={16} />
            <span>Présents à 100%</span>
          </div>
          <div className="text-2xl font-bold text-emerald-600">{data.summary?.present_all_modules || 0}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Tous leurs modules suivis</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-amber-600 mb-1 text-xs font-semibold uppercase">
            <Clock size={16} />
            <span>Présence Partielle</span>
          </div>
          <div className="text-2xl font-bold text-amber-600">{data.summary?.present_partial || 0}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Ont manqué au moins 1 module</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-rose-600 mb-1 text-xs font-semibold uppercase">
            <XCircle size={16} />
            <span>Absents Totaux</span>
          </div>
          <div className="text-2xl font-bold text-rose-600">{data.summary?.absent || 0}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Aucun module suivi ce jour</p>
        </div>
      </div>

      {/* Tableau des présences par étudiant et par emploi du temps */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white rounded-2xl border border-slate-200 shadow-xs gap-3">
          <Loader2 className="w-8 h-8 text-[#FF6B00] animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Calcul de la présence en fonction des emplois du temps...</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
          <BookOpen size={48} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-bold text-slate-800 text-sm">Aucun étudiant trouvé</h3>
          <p className="text-xs text-slate-400 mt-1">Modifiez vos critères de recherche ou sélectionnez une autre date.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-10"></th>
                  <th className="py-3.5 px-4">Étudiant</th>
                  <th className="py-3.5 px-4">Filière & Niveau</th>
                  <th className="py-3.5 px-4 text-center">Portail Gardien</th>
                  <th className="py-3.5 px-4 text-center">Modules Prévus</th>
                  <th className="py-3.5 px-4 text-right">Statut Synthétique</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredStudents.map((student) => {
                  const isExpanded = expandedStudents.has(student.student_id);

                  return (
                    <tbody key={student.student_id} className="group">
                      <tr
                        onClick={() => toggleExpand(student.student_id)}
                        className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                          isExpanded ? 'bg-slate-50/60' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4 text-slate-400">
                          {student.modules.length > 0 ? (
                            isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />
                          ) : null}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900">{student.student_name}</p>
                          <p className="text-[11px] font-mono text-slate-400">{student.matricule}</p>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          <span className="font-semibold text-slate-800">{student.filiere}</span>
                          <span className="ml-1.5 px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                            {student.level}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {student.gate_scanned ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]" title="Scanné à l'entrée par le gardien">
                              <CheckCircle2 size={12} />
                              <span>{student.gate_scan_time || 'Présent'}</span>
                            </span>
                          ) : (
                            <span className="text-slate-300 font-mono text-[11px]">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {student.total_courses === 0 ? (
                            <span className="text-slate-400 italic">Aucun cours</span>
                          ) : (
                            <span className="font-bold font-mono text-slate-800">
                              {student.attended_count} / {student.total_courses}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {getStatusBadge(student.status_code, student.status_label)}
                        </td>
                      </tr>

                      {/* Sous-tableau déroulant des modules prévus selon l'emploi du temps */}
                      {isExpanded && student.modules.length > 0 && (
                        <tr className="bg-slate-50/90">
                          <td colSpan={6} className="p-3 pl-12">
                            <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs space-y-2">
                              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider pb-1.5 border-b border-slate-100">
                                <span>Emploi du temps de la journée ({student.student_name})</span>
                                <span>{student.modules.length} créneau(x) planifié(s)</span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {student.modules.map((m, idx) => {
                                  const isPresent = m.status === 'present' || m.status === 'late';
                                  const isLate = m.status === 'late';
                                  const isAbsent = m.status === 'absent';

                                  return (
                                    <div
                                      key={idx}
                                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                                        isPresent
                                          ? isLate
                                            ? 'bg-amber-50 border-amber-200 text-amber-900'
                                            : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                          : isAbsent
                                          ? 'bg-rose-50 border-rose-200 text-rose-900'
                                          : 'bg-slate-50 border-slate-200 text-slate-700'
                                      }`}
                                    >
                                      <div className="min-w-0">
                                        <p className="font-bold truncate text-xs">{m.course_title}</p>
                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                                          <Clock size={10} />
                                          <span className="font-mono">{m.start_time} - {m.end_time}</span>
                                          {m.room && <span>• {m.room}</span>}
                                        </div>
                                      </div>
                                      <div className="shrink-0 text-right">
                                        {isPresent ? (
                                          isLate ? (
                                            <span className="px-1.5 py-0.5 bg-amber-200 text-amber-900 rounded font-bold text-[10px]">Retard</span>
                                          ) : (
                                            <span className="px-1.5 py-0.5 bg-emerald-200 text-emerald-900 rounded font-bold text-[10px]">Présent</span>
                                          )
                                        ) : isAbsent ? (
                                          <span className="px-1.5 py-0.5 bg-rose-200 text-rose-900 rounded font-bold text-[10px]">Absent</span>
                                        ) : (
                                          <span className="px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded font-bold text-[10px]">Non pointé</span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

