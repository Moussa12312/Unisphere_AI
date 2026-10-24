'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Search, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import attendanceService from '@/services/attendanceService';
import { toast } from 'react-hot-toast';

export default function CenseurAttendancePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAttendance();
  }, []);

  const loadAttendance = async () => {
    setLoading(true);
    try {
      const data = await attendanceService.getHistory({ limit: 100 });
      setRecords(data);
    } catch (err) {
      console.error(err);
      toast.error('Impossible de charger les présences');
    } finally {
      setLoading(false);
    }
  };

  const filtered = records.filter(r => {
    const student = (r.student_name || '').toLowerCase();
    const matricule = (r.matricule || '').toLowerCase();
    const course = (r.course_title || r.class_name || '').toLowerCase();
    const q = searchTerm.toLowerCase();
    return student.includes(q) || matricule.includes(q) || course.includes(q);
  });

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
          placeholder="Rechercher par étudiant, matricule ou cours..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent border-none focus:outline-none text-slate-900 dark:text-white text-sm"
        />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-4">Étudiant</th>
                <th className="p-4">Filière / Classe</th>
                <th className="p-4">Date</th>
                <th className="p-4">Statut</th>
                <th className="p-4">Méthode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filtered.map((r) => {
                const isPresent = (r.status || '').toLowerCase() === 'present';
                const isLate = (r.status || '').toLowerCase() === 'late';
                return (
                  <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 font-medium text-slate-900 dark:text-white">
                      <div>{r.student_name || `Étudiant #${r.student_id}`}</div>
                      <div className="text-xs font-mono text-slate-400">{r.matricule}</div>
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-300">
                      {r.class_name || r.level || '—'}
                    </td>
                    <td className="p-4 text-slate-500 text-xs">{r.date || r.scan_time || 'Aujourd\'hui'}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        isPresent
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : isLate
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                      }`}>
                        {isPresent ? <CheckCircle2 className="w-3 h-3" /> : isLate ? <Clock className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {isPresent ? 'Présent' : isLate ? 'En retard' : 'Absent'}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-slate-500 capitalize">{r.method || 'QR Code'}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    Aucun enregistrement de présence trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
