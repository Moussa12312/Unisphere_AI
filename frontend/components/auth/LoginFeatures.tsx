'use client';

import React from 'react';
import { GraduationCap, Calendar, Megaphone, TrendingUp } from 'lucide-react';

interface FeatureItem {
  icon: any;
  label: string;
  desc: string;
}

const FEATURES: FeatureItem[] = [
  {
    icon: GraduationCap,
    label: 'Suivi académique sécurisé',
    desc: 'Notes LMD certifiées et délibérations en temps réel',
  },
  {
    icon: Calendar,
    label: 'Emplois du temps dynamiques',
    desc: 'Planning interactif, alertes cours et disponibilités des salles',
  },
  {
    icon: Megaphone,
    label: 'Communication institutionnelle',
    desc: 'Messagerie officielle, annonces ciblées et notifications push',
  },
  {
    icon: TrendingUp,
    label: 'Gestion financière & comptable',
    desc: 'Scolarité, quittances numériques et suivi des échéanciers',
  },
];

export default function LoginFeatures() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
      {FEATURES.map((feat, index) => {
        const Icon = feat.icon;
        return (
          <div
            key={index}
            className="group flex items-start gap-3 p-3.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 backdrop-blur-md transition-all duration-200"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0754C7] to-[#031B63] border border-white/30 flex items-center justify-center text-white shadow-md shadow-[#031B63]/40 shrink-0 group-hover:scale-105 transition-transform">
              <Icon size={18} className="text-white" />
            </div>
            <div className="min-w-0">
              <h4 className="text-white text-xs sm:text-sm font-bold tracking-tight leading-tight">
                {feat.label}
              </h4>
              <p className="text-blue-100/75 text-[11px] leading-tight mt-0.5 line-clamp-2">
                {feat.desc}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
