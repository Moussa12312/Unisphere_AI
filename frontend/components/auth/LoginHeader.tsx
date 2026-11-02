'use client';

import React from 'react';
import Link from 'next/link';
import { Smartphone, ShieldCheck } from 'lucide-react';
import UniSphereLogo from './UniSphereLogo';
import LoginFeatures from './LoginFeatures';

export default function LoginHeader() {
  return (
    <div className="relative z-10 flex flex-col justify-between h-full p-8 lg:p-10 xl:p-14 text-white">
      {/* 1. Haut : Identité Officielle & Badge */}
      <div className="flex items-center justify-between gap-4">
        <UniSphereLogo variant="light" size="md" showSlogan={false} />
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.07] border border-white/15 text-[11px] font-bold tracking-wider uppercase text-slate-200 backdrop-blur-md">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B00]" />
          Système LMD Unifié
        </span>
      </div>

      {/* 2. Centre : Proposition de valeur & Grille Bento */}
      <div className="my-auto py-4 space-y-5 max-w-xl">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#FF6B00]/15 border border-[#FF6B00]/30 text-[#FF6B00] text-xs font-bold tracking-wide">
            Plateforme Universitaire Nouvelle Génération
          </div>

          <h1 className="text-3xl xl:text-[42px] font-black tracking-tight leading-[1.12] text-white">
            Pilotez l’excellence académique avec{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6B00] to-amber-400">
              UniSphere AI
            </span>
          </h1>

          <p className="text-slate-300 text-sm leading-relaxed max-w-lg">
            Un environnement numérique souverain reliant direction, secrétariat, comptabilité, corps enseignant et étudiants sur une base unique.
          </p>
        </div>

        <LoginFeatures />
      </div>

      {/* 3. Bas : Sécurité & Application Mobile */}
      <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldCheck size={15} className="text-emerald-400 shrink-0" />
          <span>Connexion chiffrée SSL • UniSphere AI © 2026</span>
        </div>

        <Link
          href="/download"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#FF6B00]/15 hover:bg-[#FF6B00] text-[#FF6B00] hover:text-white font-bold text-xs transition-all border border-[#FF6B00]/30 shrink-0"
        >
          <Smartphone size={14} />
          <span>Application Android (APK)</span>
        </Link>
      </div>
    </div>
  );
}
