'use client';

import React, { useState } from 'react';
import { FileCheck, Search, Download, CheckCircle, Clock, Eye } from 'lucide-react';

export default function CenseurBulletinsPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const bulletins = [
    { id: 1, student: 'Alpha Diallo', matricule: 'ETU-2026-001', class: 'L2 Génie Info', semester: 'Semestre 1', gpa: '15.5 / 20', status: 'Validé', date: '2026-01-28' },
    { id: 2, student: 'Fatoumata Barry', matricule: 'ETU-2026-002', class: 'L3 Réseaux', semester: 'Semestre 1', gpa: '14.2 / 20', status: 'En attente signature', date: '2026-01-29' },
    { id: 3, student: 'Ibrahima Camara', matricule: 'ETU-2026-003', class: 'L1 Tronc commun', semester: 'Semestre 1', gpa: '12.8 / 20', status: 'Validé', date: '2026-01-25' },
  ];

  const filtered = bulletins.filter(b =>
    b.student.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.matricule.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileCheck className="w-7 h-7 text-indigo-600" /> Validation des Bulletins Scolaires
          </h1>
          <p className="text-slate-500 text-sm">Vérification et approbation des relevés de notes trimestriels et semestriels.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Rechercher un bulletin par étudiant ou matricule..."
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
              <th className="p-4">Classe</th>
              <th className="p-4">Période</th>
              <th className="p-4">Moyenne Générale</th>
              <th className="p-4">Statut Validation</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {filtered.map((b) => (
              <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="p-4">
                  <p className="font-medium text-slate-900 dark:text-white">{b.student}</p>
                  <p className="text-xs font-mono text-slate-500">{b.matricule}</p>
                </td>
                <td className="p-4 text-slate-600 dark:text-slate-300">{b.class}</td>
                <td className="p-4 text-slate-600 dark:text-slate-300">{b.semester}</td>
                <td className="p-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">{b.gpa}</td>
                <td className="p-4">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                    b.status === 'Validé'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                  }`}>
                    {b.status === 'Validé' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    {b.status}
                  </span>
                </td>
                <td className="p-4 text-right space-x-2">
                  <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-indigo-600">
                    <Download className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
