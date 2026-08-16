'use client';

import React, { useState } from 'react';
import { Users, Search, Plus, Phone, Mail, UserCheck, ShieldAlert } from 'lucide-react';

export default function AdminGuardiansPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const guardians = [
    { id: 1, name: 'Mamadou Diallo', phone: '+224 620 12 34 56', email: 'mamadou.d@gmail.com', studentName: 'Alpha Diallo', studentMatricule: 'ETU-2026-001', relation: 'Père' },
    { id: 2, name: 'Aissatou Barry', phone: '+224 621 98 76 54', email: 'aissatou.b@yahoo.fr', studentName: 'Fatoumata Barry', studentMatricule: 'ETU-2026-002', relation: 'Mère' },
    { id: 3, name: 'Ousmane Camara', phone: '+224 622 45 67 89', email: 'o.camara@gmail.com', studentName: 'Ibrahima Camara', studentMatricule: 'ETU-2026-003', relation: 'Tuteur Légal' },
  ];

  const filteredGuardians = guardians.filter(g => 
    g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.studentMatricule.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-600" /> Gestion des Tuteurs & Parents
          </h1>
          <p className="text-slate-500 text-sm">Registre des responsables légaux des étudiants inscrits.</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow">
          <Plus className="w-4 h-4" /> Ajouter un tuteur
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Rechercher par nom, étudiant ou matricule..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent border-none focus:outline-none text-slate-900 dark:text-white text-sm"
        />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-4">Tuteur / Parent</th>
                <th className="p-4">Relation</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Étudiant Associé</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredGuardians.map((g) => (
                <tr key={g.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="p-4 font-medium text-slate-900 dark:text-white">{g.name}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-300">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      {g.relation}
                    </span>
                  </td>
                  <td className="p-4 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                      <Phone className="w-3.5 h-3.5 text-slate-400" /> {g.phone}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Mail className="w-3.5 h-3.5 text-slate-400" /> {g.email}
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="font-medium text-slate-900 dark:text-white">{g.studentName}</p>
                    <p className="text-xs font-mono text-slate-500">{g.studentMatricule}</p>
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-blue-600 hover:text-blue-800 text-xs font-semibold">Modifier</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
