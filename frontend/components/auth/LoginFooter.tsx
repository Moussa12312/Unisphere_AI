'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';

export default function LoginFooter() {
  return (
    <footer className="w-full bg-[#031B63] text-white py-3.5 px-4 sm:px-8 lg:px-12 border-t border-white/10 shrink-0 z-20">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-slate-300">
        
        {/* À gauche : Sécurité & Copyright */}
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
          <span className="font-semibold text-white">Connexion sécurisée</span>
          <span className="text-white/40 hidden sm:inline">|</span>
          <span className="text-slate-300 hidden sm:inline">UniSphere AI © 2026. Tous droits réservés.</span>
        </div>

        {/* À droite : Slogan d'avenir + petit trait orange décoratif */}
        <div className="flex items-center gap-2.5 text-right">
          <span className="italic text-slate-300 tracking-tight text-center sm:text-right">
            Une université plus connectée, un avenir plus brillant
          </span>
          <div className="w-8 h-1 bg-[#FF7900] rounded-full hidden sm:block shrink-0" />
        </div>

      </div>
    </footer>
  );
}
