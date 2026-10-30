'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, ArrowRight, LogIn, Sparkles, GraduationCap } from 'lucide-react';

interface LandingHeaderProps {
  onOpenLogin: () => void;
  onOpenRegister: (plan?: string) => void;
}

export default function LandingHeader({ onOpenLogin, onOpenRegister }: LandingHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    if (id === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">

        {/* Logo & Identité */}
        <div
          onClick={() => scrollToSection('top')}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="relative w-11 h-11 rounded-xl bg-gradient-to-tr from-[#FF6B00] to-amber-500 p-0.5 shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center overflow-hidden">
              <Image
                src="/logo.png"
                alt="UniSphere AI Logo"
                width={36}
                height={36}
                className="object-contain"
                onError={(e) => {
                  // Fallback si l'image n'est pas trouvée
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <GraduationCap className="text-white w-6 h-6 absolute hidden group-only:block" />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-slate-900">
                UniSphere <span className="text-[#FF6B00]">AI</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                <Sparkles size={10} className="text-[#FF6B00]" /> LMD 2026
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium tracking-tight">
              Excellence & Pilotage Académique
            </p>
          </div>
        </div>

        {/* Navigation Centrale (Desktop) */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2 text-sm font-semibold text-slate-600">
          <button
            onClick={() => scrollToSection('top')}
            className="px-3.5 py-2 rounded-lg hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            Accueil
          </button>
          <button
            onClick={() => scrollToSection('features')}
            className="px-3.5 py-2 rounded-lg hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            Fonctionnalités
          </button>
          <button
            onClick={() => scrollToSection('pricing')}
            className="px-3.5 py-2 rounded-lg hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            Tarifs
          </button>
          <button
            onClick={() => scrollToSection('demo-preview')}
            className="px-3.5 py-2 rounded-lg hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            Aperçu Plateforme
          </button>
        </nav>

        {/* Actions à Droite (Desktop) */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={onOpenLogin}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-all active:scale-95 shadow-2xs"
          >
            <LogIn size={16} className="text-slate-500" />
            Se connecter
          </button>

          <button
            onClick={() => onOpenRegister()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#FF6B00] to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-md shadow-orange-500/25 transition-all hover:shadow-lg active:scale-95"
          >
            <span>Créer un compte</span>
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Bouton Hamburger Mobile */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={onOpenLogin}
            className="p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-sm font-bold flex items-center gap-1 border border-slate-200"
            title="Connexion"
          >
            <LogIn size={18} className="text-[#FF6B00]" />
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2.5 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
            aria-label="Ouvrir le menu de navigation"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

      </div>

      {/* Menu Déroulant Mobile */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 shadow-xl animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex flex-col gap-1 mb-4 text-base font-semibold text-slate-700">
            <button
              onClick={() => scrollToSection('top')}
              className="text-left px-3 py-2.5 rounded-lg hover:bg-slate-100 text-slate-900"
            >
              Accueil
            </button>
            <button
              onClick={() => scrollToSection('features')}
              className="text-left px-3 py-2.5 rounded-lg hover:bg-slate-100 text-slate-900"
            >
              Fonctionnalités Clés
            </button>
            <button
              onClick={() => scrollToSection('pricing')}
              className="text-left px-3 py-2.5 rounded-lg hover:bg-slate-100 text-slate-900"
            >
              Grille Tarifaire
            </button>
            <button
              onClick={() => scrollToSection('demo-preview')}
              className="text-left px-3 py-2.5 rounded-lg hover:bg-slate-100 text-slate-900"
            >
              Aperçu & Démonstration
            </button>
          </div>

          <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenLogin();
              }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
            >
              <LogIn size={18} className="text-slate-600" />
              Se connecter
            </button>

          </div>
        </div>
      )}
    </header>
  );
}

