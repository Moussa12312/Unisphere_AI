'use client';

import React, { useState } from 'react';
import { BookOpen, Plus, Calendar, Clock, CheckCircle2, FileText, Search } from 'lucide-react';

export default function TeacherAssignmentsPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const assignments = [
    { id: 1, title: 'Projet C - Gestionnaire de Fichiers', course: 'Algorithmique & C', class: 'L2 Génie Info', dueDate: '2026-02-15', submissions: '24 / 28', status: 'En cours' },
    { id: 2, title: 'Devoir Maison - Modélisation UML', course: 'Génie Logiciel', class: 'L3 Informatique', dueDate: '2026-02-05', submissions: '30 / 30', status: 'Terminé' },
    { id: 3, title: 'TP SQL - Requêtes Complexes', course: 'Bases de Données', class: 'L2 Génie Info', dueDate: '2026-02-20', submissions: '12 / 28', status: 'En cours' },
  ];

  const filtered = assignments.filter(a =>
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.course.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-blue-600" /> Gestion des Devoirs & Travaux (Enseignant)
          </h1>
          <p className="text-slate-500 text-sm">Créez et suivez les devoirs, TP et travaux pratiques donnés aux étudiants.</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow">
          <Plus className="w-4 h-4" /> Créer un devoir
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Rechercher par titre de devoir ou cours..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent border-none focus:outline-none text-slate-900 dark:text-white text-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filtered.map((a) => (
          <div key={a.id} className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div className="flex justify-between items-start">
                <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  {a.class}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  a.status === 'Terminé' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950' : 'bg-amber-50 text-amber-600 dark:bg-amber-950'
                }`}>
                  {a.status}
                </span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base mt-2">{a.title}</h3>
              <p className="text-xs text-slate-500">{a.course}</p>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
              <span className="text-slate-500 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Limite: {a.dueDate}
              </span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Rendus: {a.submissions}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
