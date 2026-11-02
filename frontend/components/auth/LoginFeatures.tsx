'use client';

import React from 'react';
import { GraduationCap, CreditCard, CalendarCheck, Cpu } from 'lucide-react';

const FEATURES = [
  {
    icon: GraduationCap,
    label: 'Gouvernance LMD',
    desc: 'UEs, crédits, délibérations et bulletins officiels',
  },
  {
    icon: CreditCard,
    label: 'Gestion Financière',
    desc: 'Scolarité par filière, échéanciers et reçus certifiés',
  },
  {
    icon: CalendarCheck,
    label: 'Campus & Hors-Ligne',
    desc: 'Emplois du temps, présences QR et mode sans Internet',
  },
  {
    icon: Cpu,
    label: 'Pilotage Intelligent',
    desc: 'Tableaux de bord multi-rôles et analytique temps réel',
  },
];

export default function LoginFeatures() {
  return (
    <div className="grid grid-cols-2 gap-3 max-w-xl">
      {FEATURES.map((feat, index) => {
        const Icon = feat.icon;
        return (
          <div
            key={index}
            className="group relative flex items-start gap-3 p-3.5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 hover:border-[#FF6B00]/40 backdrop-blur-md transition-all duration-300"
          >
            <div className="w-9 h-9 rounded-xl bg-[#FF6B00]/15 border border-[#FF6B00]/30 flex items-center justify-center text-[#FF6B00] shrink-0 group-hover:bg-[#FF6B00] group-hover:text-white transition-all duration-300">
              <Icon size={17} />
            </div>
            <div className="min-w-0">
              <h4 className="text-white text-xs sm:text-[13px] font-bold tracking-tight leading-snug">
                {feat.label}
              </h4>
              <p className="text-slate-300/80 text-[11px] leading-snug mt-0.5 line-clamp-2">
                {feat.desc}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
