'use client';

import React from 'react';
import { Calendar } from 'lucide-react';
import DailyAttendanceMatrixView from '@/components/academic/DailyAttendanceMatrixView';

export default function CenseurAttendancePage() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Calendar className="w-7 h-7 text-[#FF6B00]" />
            Suivi des Présences (Censure & Pédagogie)
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Contrôle universitaire en temps réel : scans portail du gardien & pointages par module des enseignants.
          </p>
        </div>
      </div>

      <DailyAttendanceMatrixView />
    </div>
  );
}
