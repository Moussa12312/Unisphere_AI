'use client';

import React from 'react';
import { BarChart3, Award, Calendar, CheckCircle2, TrendingUp, BookOpen } from 'lucide-react';

export default function StudentStatisticsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="w-7 h-7 text-indigo-600" /> Mes Statistiques Académiques
        </h1>
        <p className="text-slate-500 text-sm">Visualisation de vos performances, moyenne et taux de présence.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 text-indigo-600 mb-2">
            <Award className="w-5 h-5" />
            <span className="text-xs font-bold uppercase">Moyenne Générale</span>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white font-mono">15.8 / 20</p>
          <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Mention Bien
          </p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-600 mb-2">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-xs font-bold uppercase">Taux de Présence</span>
          </div>
          <p className="text-3xl font-black text-emerald-600 font-mono">96 %</p>
          <p className="text-xs text-slate-500 mt-1">2 absences justifiées</p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <BookOpen className="w-5 h-5" />
            <span className="text-xs font-bold uppercase">Crédits Valider</span>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white font-mono">30 / 30 ECTS</p>
          <p className="text-xs text-slate-500 mt-1">Semestre 1 validé</p>
        </div>
      </div>
    </div>
  );
}
