'use client';

import React from 'react';
import { GraduationCap, Calendar, Megaphone, TrendingUp } from 'lucide-react';

interface FeatureItem {
  icon: any;
  label: string;
}

const FEATURES: FeatureItem[] = [
  {
    icon: GraduationCap,
    label: 'Suivi académique sécurisé',
  },
  {
    icon: Calendar,
    label: 'Emplois du temps en temps réel',
  },
  {
    icon: Megaphone,
    label: 'Communication simplifiée',
  },
  {
    icon: TrendingUp,
    label: 'Gestion administrative intelligente',
  },
];

export default function LoginFeatures() {
  return (
    <ul className="space-y-4">
      {FEATURES.map((feat, index) => {
        const Icon = feat.icon;
        return (
          <li key={index} className="flex items-center gap-3.5 group">
            <div className="w-9 h-9 rounded-full bg-[#0754C7] border border-white/25 flex items-center justify-center text-white shadow-md shadow-[#031B63]/30 shrink-0 group-hover:scale-105 transition-transform">
              <Icon size={18} />
            </div>
            <span className="text-white text-sm sm:text-[15px] font-medium tracking-tight">
              {feat.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

