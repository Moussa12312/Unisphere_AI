'use client';

import React, { useState } from 'react';
import { FileText, Search, Download, Filter, Eye } from 'lucide-react';

export default function SecretaryGradesPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const grades = [
    { id: 1, student: 'Alpha Diallo', matricule: 'ETU-2026-001', course: 'Algorithmique & C', exam: 'Examen Final', grade: '16 / 20', status: 'Validé' },
    { id: 2, student: 'Fatoumata Barry', matricule: 'ETU-2026-002', course: 'Base de données', exam: 'Contrôle Continu', grade: '14 / 20', status: 'Validé' },
    { id: 3, student: 'Ibrahima Camara', matricule: 'ETU-2026-003', course: 'Mathématiques I', exam: 'Examen Final', grade: '12 / 20', status: 'En attente' },
  ];

  const filtered = grades.filter(g =>
    g.student.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.matricule.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.course.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-7 h-7 text-blue-600" /> Registre des Notes (Secrétariat)
          </h1>
          <p className="text-slate-500 text-sm">Consultation et impression des procès-verbaux de notes.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Rechercher par étudiant, cours ou matricule..."
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
              <th className="p-4">Matière</th>
              <th className="p-4">Évaluation</th>
              <th className="p-4">Note</th>
              <th className="p-4">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {filtered.map((g) => (
              <tr key={g.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="p-4">
                  <p className="font-medium text-slate-900 dark:text-white">{g.student}</p>
                  <p className="text-xs font-mono text-slate-500">{g.matricule}</p>
                </td>
                <td className="p-4 text-slate-600 dark:text-slate-300">{g.course}</td>
                <td className="p-4 text-slate-600 dark:text-slate-300">{g.exam}</td>
                <td className="p-4 font-mono font-bold text-blue-600 dark:text-blue-400">{g.grade}</td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    g.status === 'Validé'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                  }`}>
                    {g.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
