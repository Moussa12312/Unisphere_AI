'use client';

import React from 'react';
import Link from 'next/link';
import { Smartphone, ShieldCheck } from 'lucide-react';
import UniSphereLogo from './UniSphereLogo';
import LoginFeatures from './LoginFeatures';

export default function LoginHeader() {
  return (
    <div className="relative z-10 flex flex-col justify-between h-full p-8 lg:p-12 xl:p-14 text-white max-w-xl">
      {/* 1. Haut : Logo & Slogan */}
      <div>
        <UniSphereLogo variant="light" size="md" showSlogan={true} />
      </div>

      {/* 2. Centre : Titre accrocheur, description & 4 fonctionnalités */}
      <div className="my-auto py-8 space-y-6">
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl xl:text-[44px] font-black tracking-tight leading-[1.15] text-white">
            Votre Université <br />
            à <span className="text-[#FF7900]">portée</span> de main
          </h1>

          <p className="text-slate-200 text-sm sm:text-base font-normal leading-relaxed max-w-md">
            Une plateforme moderne pour gérer, apprendre et réussir.
          </p>
        </div>

        {/* 4 Puces de fonctionnalités */}
        <div className="pt-2">
          <LoginFeatures />
        </div>
      </div>

      {/* 3. Bas : Slogan calligraphique & trait orange + Accès Mobile APK */}
      <div className="pt-4 flex items-end justify-between gap-4">
        <div className="inline-block">
          <p className="font-serif italic text-2xl sm:text-[26px] text-white tracking-wide select-none drop-shadow-xs">
            Innover • Gérer • Réussir
          </p>
          {/* Trait orange courbe élégant comme sur la maquette */}
          <div className="mt-1">
            <svg
              viewBox="0 0 220 18"
              className="w-48 sm:w-56 h-3.5 text-[#FF7900]"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M 4 14 C 40 4 140 2 216 11 C 150 5 60 7 4 14 Z"
                fill="#FF7900"
              />
            </svg>
          </div>
        </div>

        <Link
          href="/download"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-orange-400 hover:text-orange-300 font-bold text-xs transition-colors border border-white/15 backdrop-blur-md shadow-xs shrink-0"
        >
          <Smartphone size={15} className="text-[#FF7900]" />
          <span>Application APK</span>
        </Link>
      </div>
    </div>
  );
}

