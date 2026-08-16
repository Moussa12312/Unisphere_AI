'use client';

import React from 'react';
import { Briefcase, FileCheck, Users, Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function AdminSecretariatPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Briefcase className="w-7 h-7 text-amber-600" /> Super-Vision du Secrétariat
        </h1>
        <p className="text-slate-500 text-sm">Gestion des demandes de documents et opérations administratives courantes.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3 text-amber-600 mb-2">
            <Clock className="w-6 h-6" />
            <span className="text-xs font-bold uppercase">Demandes En Attente</span>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">12</p>
        </div>
        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3 text-emerald-600 mb-2">
            <FileCheck className="w-6 h-6" />
            <span className="text-xs font-bold uppercase">Certificats Délivrés</span>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">148</p>
        </div>
        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3 text-blue-600 mb-2">
            <Users className="w-6 h-6" />
            <span className="text-xs font-bold uppercase">Inscriptions Validées</span>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">320</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Raccourcis Secrétariat</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/secretary/certificate-requests" className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 transition-colors flex items-center justify-between">
            <span className="font-medium text-slate-900 dark:text-white">Valider les demandes de certificats</span>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </Link>
          <Link href="/secretary/students" className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 transition-colors flex items-center justify-between">
            <span className="font-medium text-slate-900 dark:text-white">Gérer le registre des étudiants</span>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </Link>
        </div>
      </div>
    </div>
  );
}
