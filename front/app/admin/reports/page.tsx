'use client';

import React from 'react';
import { BarChart3, FileText, Download, TrendingUp, Users, DollarSign, Calendar } from 'lucide-react';

export default function AdminReportsPage() {
  const reports = [
    { title: 'Rapport Annuel des Effectifs', category: 'Académique', date: '2026-01-30', format: 'PDF / XLSX', icon: Users },
    { title: 'Bilan Financier Global Q1', category: 'Finance', date: '2026-01-28', format: 'PDF', icon: DollarSign },
    { title: 'Statistiques de Fréquentation & Présences', category: 'Discipline', date: '2026-01-15', format: 'XLSX', icon: Calendar },
    { title: 'Rapport d\'Audit des Relevés de Notes', category: 'Pédagogie', date: '2026-01-10', format: 'PDF', icon: FileText },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-purple-600" /> Rapports & Analytics Institutionnels
          </h1>
          <p className="text-slate-500 text-sm">Téléchargez et générez les rapports consolidés de l'établissement.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((r, i) => {
          const IconComponent = r.icon;
          return (
            <div key={i} className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-3 bg-purple-50 dark:bg-purple-950/50 text-purple-600 rounded-xl">
                  <IconComponent className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">{r.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">Catégorie: <span className="font-medium text-slate-700 dark:text-slate-300">{r.category}</span> • Mis à jour le {r.date}</p>
                  <span className="inline-block mt-2 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs rounded font-mono">
                    Format: {r.format}
                  </span>
                </div>
              </div>
              <button className="flex items-center gap-1.5 text-purple-600 hover:text-purple-700 bg-purple-50 dark:bg-purple-950/40 px-3 py-1.5 rounded-lg text-xs font-semibold">
                <Download className="w-3.5 h-3.5" /> Télécharger
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
