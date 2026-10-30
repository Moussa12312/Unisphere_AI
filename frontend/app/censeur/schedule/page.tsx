'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar, Clock, MapPin, Loader2, Users, Search,
  LayoutGrid, List, Printer, Eye, X
} from 'lucide-react';
import scheduleService, { Schedule } from '@/services/scheduleService';
import { classService, ClassRoom } from '@/services/classService';
import { universityService } from '@/services/universityService';
import { toast } from 'react-hot-toast';

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

const TIME_SLOTS = [
  { start: '08:00', end: '10:00', label: '08h00 - 10h00' },
  { start: '10:00', end: '12:00', label: '10h00 - 12h00' },
  { start: '14:00', end: '16:00', label: '14h00 - 16h00' },
  { start: '16:00', end: '18:00', label: '16h00 - 18h00' },
];

export default function CenseurSchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [filterDay, setFilterDay] = useState('');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [universityInfo, setUniversityInfo] = useState<any>({ name: 'Université' });

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [scheduleData, classesData, uniData] = await Promise.all([
        scheduleService.getAll().catch(() => []),
        classService.getAll().catch(() => []),
        universityService.getInfo().catch(() => null)
      ]);
      setSchedules(scheduleData || []);
      setClasses(classesData || []);
      if (uniData) setUniversityInfo(uniData);
    } catch (err) {
      console.error(err);
      toast.error('Impossible de charger les emplois du temps');
    } finally {
      setLoading(false);
    }
  };

  const filteredSchedules = schedules.filter(s => {
    const matchClass = !selectedClassId || s.class_id?.toString() === selectedClassId;
    const matchSearch =
      (s.course_title || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.teacher_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.class_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.room || '').toLowerCase().includes(search.toLowerCase());
    const matchDay = !filterDay || s.day_of_week === filterDay;
    return matchClass && matchSearch && matchDay;
  });

  const activeClassName = classes.find(c => c.id.toString() === selectedClassId)?.name || 'Toutes les classes';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Calendar size={22} />
            </div>
            Emploi du Temps Général (Censure)
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Supervision et contrôle académique des créneaux, salles et enseignants.
          </p>
        </div>

        <button
          onClick={() => setShowPrintModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-sm self-start sm:self-auto"
        >
          <Printer size={16} />
          Imprimer le Planning
        </button>
      </div>

      {/* Filtres et Sélecteur de classe */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Classe :</span>
            <button
              onClick={() => setSelectedClassId('')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                !selectedClassId
                  ? 'bg-[#FF6B00] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Toutes ({schedules.length})
            </button>
            {classes.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedClassId(c.id.toString())}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  selectedClassId === c.id.toString()
                    ? 'bg-[#FF6B00] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Users size={12} />
                {c.name}
              </button>
            ))}
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl shrink-0 self-start md:self-auto">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'grid'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid size={14} />
              Grille Hebdo
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List size={14} />
              Liste par jour
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
          <div className="sm:col-span-2 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="🔍 Filtrer par cours, enseignant, salle..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>
          <select
            value={filterDay}
            onChange={(e) => setFilterDay(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          >
            <option value="">Tous les jours</option>
            {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-10 h-10 animate-spin text-[#FF6B00]" />
        </div>
      ) : viewMode === 'grid' ? (
        /* VUE 1 : GRILLE HEBDOMADAIRE */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-4">
          <div className="overflow-x-auto min-w-[750px]">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-3 bg-slate-50 border border-slate-200 text-left text-xs font-bold text-slate-600 uppercase w-28">
                    Créneau
                  </th>
                  {DAYS.map(d => (
                    <th key={d} className="p-3 bg-slate-50 border border-slate-200 text-center text-xs font-bold text-slate-900">
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIME_SLOTS.map(slot => (
                  <tr key={slot.start}>
                    <td className="p-2.5 bg-slate-50/50 border border-slate-200 text-xs font-mono font-bold text-slate-700 text-center align-middle">
                      {slot.label}
                    </td>
                    {DAYS.map(day => {
                      const coursesInSlot = filteredSchedules.filter(
                        s => s.day_of_week === day && s.start_time <= slot.start && s.end_time >= slot.end
                      );
                      return (
                        <td key={day} className="p-2 border border-slate-200 align-top min-w-[130px] h-24">
                          {coursesInSlot.length > 0 ? (
                            <div className="space-y-1.5">
                              {coursesInSlot.map(c => (
                                <div
                                  key={c.id}
                                  className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs shadow-2xs"
                                >
                                  <p className="font-bold leading-tight line-clamp-2">{c.course_title}</p>
                                  <p className="text-[11px] text-slate-600 mt-1 truncate">🎓 {c.teacher_name || 'Prof. N/A'}</p>
                                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                                    <span className="font-semibold bg-white px-1.5 py-0.5 rounded border border-blue-100">
                                      {c.class_name}
                                    </span>
                                    <span>📍 {c.room || 'Salle N/A'}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="w-full h-full min-h-[50px] flex items-center justify-center text-[11px] text-slate-300">
                              -
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* VUE 2 : LISTE PAR JOUR */
        <div className="space-y-4">
          {DAYS.map(day => {
            const daySchedules = filteredSchedules
              .filter(s => s.day_of_week === day)
              .sort((a, b) => a.start_time.localeCompare(b.start_time));

            if (daySchedules.length === 0) return null;

            return (
              <div key={day} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 flex items-center justify-between text-white">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Calendar size={16} />
                    {day}
                  </h3>
                  <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-bold">
                    {daySchedules.length} cours
                  </span>
                </div>
                <div className="divide-y divide-slate-100">
                  {daySchedules.map(item => (
                    <div key={item.id} className="p-3.5 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-mono text-xs font-bold shrink-0 flex items-center gap-1">
                          <Clock size={12} /> {item.start_time} - {item.end_time}
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-xs sm:text-sm text-slate-900 truncate">{item.course_title}</p>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 flex-wrap">
                            <span className="font-semibold text-slate-700">👥 {item.class_name}</span>
                            <span>🎓 {item.teacher_name || 'Enseignant non assigné'}</span>
                            {item.room && <span>📍 {item.room} {item.building && `(${item.building})`}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL APERÇU IMPRESSION */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Printer size={18} className="text-[#FF6B00]" /> Aperçu avant impression
              </h2>
              <button onClick={() => setShowPrintModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <p className="font-bold text-slate-800 uppercase tracking-wide">{universityInfo.name}</p>
              <p className="text-slate-600">Document : Emploi du temps officiel • {activeClassName}</p>
              <p className="text-slate-500">Total cours planifiés : {filteredSchedules.length}</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Fermer
              </button>
              <button
                onClick={() => {
                  setShowPrintModal(false);
                  setTimeout(() => window.print(), 200);
                }}
                className="px-5 py-2 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"
              >
                <Printer size={15} /> Lancer l'impression
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
