'use client';

import React, { useState } from 'react';
import { Calendar, Search, CheckCircle2, XCircle, AlertTriangle, Filter } from 'lucide-react';

export default function CenseurAttendancePage() {
  const [searchTerm, setSearchTerm] = useState('');

  const records = [
    { id: 1, student: 'Alpha Diallo', filiere: 'L2 Génie Info', course: 'Algorithmique & C', date: '2026-01-30', status: 'Présent', justification: '-' },
    { id: 2, student: 'Fatoumata Barry', filiere: 'L3 Réseaux & Télécoms', course: 'Base de données', date: '2026-01-30', status: 'Absent Unjustifié', justification: 'Aucune' },
    { id: 3, student: 'Ibrahima Camara', filiere: 'L1 Tronc commun', course: 'Mathématiques I', date: '2026-01-29', status: 'Retard (20 min)', justification: 'Problème de transport' },
  ];

  const filtered = records.filter(r =>
    r.student.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.filiere.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-7 h-7 text-blue-600" /> Suivi de la Présence (Censure)
          </h1>
          <p className="text-slate-500 text-sm">Contrôle des relevés d'absences et justifications des étudiants.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Rechercher par étudiant ou classe..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent border-none focus:outline-none text-slate-900 dark:text-white text-sm"
        />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-4">Étudiant</th>
              <th className="p-4">Filière / Classe</th>
              <th className="p-4">Cours</th>
              <th className="p-4">Date</th>
              <th className="p-4">Statut</th>
              <th className="p-4">Justification</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="p-4 font-medium text-slate-900 dark:text-white">{r.student}</td>
                <td className="p-4 text-slate-600 dark:text-slate-300">{r.filiere}</td>
                <td className="p-4 text-slate-600 dark:text-slate-300">{r.course}</td>
                <td className="p-4 text-slate-500 text-xs">{r.date}</td>
                <td className="p-4">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                    r.status.includes('Présent')
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : r.status.includes('Absent')
                      ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                  }`}>
                    {r.status.includes('Présent') ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {r.status}
                  </span>
                </td>
                <td className="p-4 text-xs text-slate-500">{r.justification}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
