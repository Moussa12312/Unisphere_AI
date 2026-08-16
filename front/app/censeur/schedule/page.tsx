'use client';

import React from 'react';
import { Calendar, Clock, MapPin, User, BookOpen } from 'lucide-react';

export default function CenseurSchedulePage() {
  const schedule = [
    { time: '08:30 - 10:30', course: 'Algorithmique & C', teacher: 'Dr. Mamadou Diallo', room: 'Amphi A', class: 'L2 Génie Info' },
    { time: '11:00 - 13:00', course: 'Bases de Données Relationnelles', teacher: 'Pr. Aissatou Sow', room: 'Salle 104', class: 'L3 Réseaux' },
    { time: '14:00 - 16:00', course: 'Analyse Mathématique I', teacher: 'Dr. Ibrahima Bah', room: 'Amphi B', class: 'L1 Tronc commun' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Calendar className="w-7 h-7 text-blue-600" /> Emploi du Temps Général (Censure)
        </h1>
        <p className="text-slate-500 text-sm">Planning global des cours et occupation des salles d'examen.</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">Planning d'Aujourd'hui</h2>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {schedule.map((item, idx) => (
            <div key={idx} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-mono text-xs font-bold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {item.time}
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">{item.course}</h3>
                  <p className="text-xs text-slate-500">{item.teacher} • <span className="font-medium text-slate-700 dark:text-slate-300">{item.class}</span></p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 w-fit">
                <MapPin className="w-3 h-3 text-slate-400" /> {item.room}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
