'use client';

import React, { useState } from 'react';
import { CreditCard, Search, Plus, CheckCircle, Clock } from 'lucide-react';

export default function SecretaryPaymentsPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const payments = [
    { id: 'PAY-2026-101', student: 'Alpha Diallo', matricule: 'ETU-2026-001', amount: 150000, type: 'Frais de Scolarité T1', status: 'Payé', date: '2026-01-20' },
    { id: 'PAY-2026-102', student: 'Fatoumata Barry', matricule: 'ETU-2026-002', amount: 150000, type: 'Frais de Scolarité T1', status: 'Payé', date: '2026-01-22' },
  ];

  const filtered = payments.filter(p =>
    p.student.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.matricule.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-emerald-600" /> Encaissement & Suivi des Frais (Secrétariat)
          </h1>
          <p className="text-slate-500 text-sm">Vérification de l’état de paiement pour la délivrance des documents.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Rechercher par reçu, étudiant ou matricule..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent border-none focus:outline-none text-slate-900 dark:text-white text-sm"
        />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-4">N° Reçu</th>
              <th className="p-4">Étudiant</th>
              <th className="p-4">Type de Paiement</th>
              <th className="p-4">Montant</th>
              <th className="p-4">Date</th>
              <th className="p-4">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="p-4 font-mono font-medium text-slate-900 dark:text-white">{p.id}</td>
                <td className="p-4">
                  <p className="font-medium text-slate-900 dark:text-white">{p.student}</p>
                  <p className="text-xs font-mono text-slate-500">{p.matricule}</p>
                </td>
                <td className="p-4 text-slate-600 dark:text-slate-300">{p.type}</td>
                <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">{p.amount.toLocaleString('fr-FR')} FCFA</td>
                <td className="p-4 text-slate-500 text-xs">{p.date}</td>
                <td className="p-4">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    <CheckCircle className="w-3 h-3" /> {p.status}
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
