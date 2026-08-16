'use client';

import React from 'react';
import { BarChart3, TrendingUp, AlertTriangle, Users, Calendar, Download } from 'lucide-react';

export default function CenseurReportsPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-indigo-600" /> Rapports Disciplinaires & Académiques
          </h1>
          <p className="text-slate-500 text-sm">Analyse des taux de présence, assiduité et comportements par promotion.</p>
        </div>
        <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium shadow">
          <Download className="w-4 h-4" /> Exporter le rapport
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-400">Taux Moyen d'Assiduité</p>
          <p className="text-3xl font-black text-emerald-600 mt-2">94.2 %</p>
        </div>
        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-400">Absences Signalées (Mois)</p>
          <p className="text-3xl font-black text-rose-500 mt-2">28</p>
        </div>
        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-400">Incidents Disciplinaires</p>
          <p className="text-3xl font-black text-amber-500 mt-2">3</p>
        </div>
      </div>
    </div>
  );
}
