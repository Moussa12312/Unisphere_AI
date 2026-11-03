'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, Clock, MapPin, User, Loader2, FileText, ChevronRight } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface ScheduleItem {
  id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
  subject: string;
  teacher: string;
  room: string;
}

// Mapping des jours pour affichage propre
const DAYS_ORDER = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const DAY_MAP: Record<string, string> = {
  '1': 'Lundi', 'Monday': 'Lundi', 'Lundi': 'Lundi',
  '2': 'Mardi', 'Tuesday': 'Mardi', 'Mardi': 'Mardi',
  '3': 'Mercredi', 'Wednesday': 'Mercredi', 'Mercredi': 'Mercredi',
  '4': 'Jeudi', 'Thursday': 'Jeudi', 'Jeudi': 'Jeudi',
  '5': 'Vendredi', 'Friday': 'Vendredi', 'Vendredi': 'Vendredi',
  '6': 'Samedi', 'Saturday': 'Samedi', 'Samedi': 'Samedi',
  '0': 'Dimanche', 'Sunday': 'Dimanche', 'Dimanche': 'Dimanche'
};

export default function StudentSchedulePage() {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    try {
      const res = await api.get('/api/v1/students/me/schedule');
      setSchedule(res.data);
    } catch (error) {
      toast.error('Erreur de chargement de l\'emploi du temps');
    } finally {
      setLoading(false);
    }
  };

  // Grouper par jour
  const groupedSchedule = schedule.reduce((acc: any, item: ScheduleItem) => {
    const dayName = DAY_MAP[item.day_of_week] || item.day_of_week;
    if (!acc[dayName]) acc[dayName] = [];
    acc[dayName].push(item);
    return acc;
  }, {});

  // Trier les cours par heure dans chaque jour
  Object.keys(groupedSchedule).forEach(day => {
    groupedSchedule[day].sort((a: ScheduleItem, b: ScheduleItem) => a.start_time.localeCompare(b.start_time));
  });

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">

      {/* En-tête avec bascule Cours / Examens */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Mon Emploi du Temps
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Planning hebdomadaire de vos cours et travaux dirigés.
          </p>
        </div>

        {/* Onglets Cours / Examens */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs cursor-default"
          >
            📅 Cours de la semaine
          </button>
          <Link
            href="/student/exams"
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 transition-all inline-flex items-center gap-1.5"
          >
            <span>📝 Calendrier des Examens</span>
            <ChevronRight size={13} className="text-[#FF6B00]" />
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Loader2 className="animate-spin text-[#FF6B00]" size={32} />
          <p className="text-xs text-slate-500 mt-3">Chargement de votre emploi du temps...</p>
        </div>
      ) : Object.keys(groupedSchedule).length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-10 rounded-2xl border border-slate-200 dark:border-slate-800 text-center shadow-xs">
          <Calendar size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">Aucun cours n'est planifié pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {DAYS_ORDER.map(day => {
            if (!groupedSchedule[day]) return null;
            return (
              <div key={day} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                <div className="bg-slate-50 dark:bg-slate-800/60 px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                  <Calendar size={18} className="text-[#FF6B00]" />
                  <h2 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">{day}</h2>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-auto">
                    {groupedSchedule[day].length} séance(s)
                  </span>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedSchedule[day].map((item: ScheduleItem) => (
                    <div key={item.id} className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 hover:border-[#FF6B00]/40 transition-colors bg-slate-50/50 dark:bg-slate-800/30">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug">
                          {item.subject}
                        </h3>
                        <div className="flex items-center gap-1 text-[11px] font-extrabold text-[#FF6B00] bg-orange-50 dark:bg-orange-950/50 px-2 py-1 rounded-lg shrink-0 border border-orange-200/50 dark:border-orange-900/50">
                          <Clock size={12} />
                          {item.start_time} - {item.end_time}
                        </div>
                      </div>
                      <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-slate-400 shrink-0" />
                          <span className="truncate">{item.teacher}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin size={14} className="text-slate-400 shrink-0" />
                          <span className="truncate">{item.room}</span>
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
    </div>
  );
}
