'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Loader2 } from 'lucide-react';
import scheduleService, { Schedule } from '@/services/scheduleService';
import { toast } from 'react-hot-toast';

export default function CenseurSchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    setLoading(true);
    try {
      const data = await scheduleService.getAll();
      setSchedules(data);
    } catch (err) {
      console.error(err);
      toast.error('Impossible de charger les emplois du temps');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Calendar className="w-7 h-7 text-blue-600" /> Emploi du Temps Général (Censure)
        </h1>
        <p className="text-slate-500 text-sm">Planning global des cours et occupation des salles d'examen.</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">Planning Académique</h2>
        
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {schedules.map((item) => (
              <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-mono text-xs font-bold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {item.start_time} - {item.end_time}
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">{item.course_title}</h3>
                    <p className="text-xs text-slate-500">
                      {item.teacher_name || 'Enseignant non assigné'} • <span className="font-medium text-slate-700 dark:text-slate-300">{item.class_name}</span> • <span className="italic">{item.day_of_week}</span>
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 w-fit">
                  <MapPin className="w-3 h-3 text-slate-400" /> {item.room || 'Salle N/A'} {item.building ? `(${item.building})` : ''}
                </span>
              </div>
            ))}
            {schedules.length === 0 && (
              <div className="py-8 text-center text-slate-500">
                Aucun créneau d'emploi du temps configuré.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
