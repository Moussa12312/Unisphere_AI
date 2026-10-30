'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  GraduationCap, ShieldCheck, Mail, Phone, MapPin,
  ArrowUp, Sparkles, Smartphone, Download
} from 'lucide-react';

interface FooterSectionProps {
  onOpenLogin: () => void;
  onOpenRegister: (plan?: string) => void;
}

export default function FooterSection({ onOpenLogin, onOpenRegister }: FooterSectionProps) {
  const currentYear = new Date().getFullYear();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer className="bg-slate-950 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Grille principale du footer */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-slate-800">

          {/* Colonne 1 : Identité & Baseline (lg:col-span-4) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FF6B00] to-amber-500 p-0.5 shadow-md">
                <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                  <GraduationCap className="text-white w-6 h-6" />
                </div>
              </div>
              <div>
                <span className="font-extrabold text-2xl text-white tracking-tight">
                  UniSphere <span className="text-[#FF6B00]">AI</span>
                </span>
                <p className="text-xs text-orange-400 font-semibold">
                  Excellence & Pilotage Académique
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              La plateforme universitaire unifiée de nouvelle génération. Conçue pour simplifier la scolarité LMD, sécuriser les encaissements Mobile Money et fédérer le réseau des diplômés.
            </p>

            <div className="pt-2 flex flex-col gap-2 text-xs text-slate-400 font-medium">
              <div className="flex items-center gap-2">
                <MapPin size={15} className="text-[#FF6B00] shrink-0" />
                <span>Sotuba ACI, Bamako, Mali • Desservant la zone UEMOA</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={15} className="text-[#FF6B00] shrink-0" />
                <span>chakirunisphereai@gmail.com</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={15} className="text-[#FF6B00] shrink-0" />
                <span>+223 94 37 21 23</span>
              </div>
            </div>
          </div>

          {/* Colonne 2 : Plateforme & Navigation (lg:col-span-3) */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">
              Plateforme
            </h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <button
                  onClick={() => scrollToSection('hero')}
                  className="hover:text-white transition-colors"
                >
                  Accueil & Présentation
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection('features')}
                  className="hover:text-white transition-colors"
                >
                  Fonctionnalités LMD & Sécurité
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection('pricing')}
                  className="hover:text-white transition-colors"
                >
                  Grille Tarifaire Transparente
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection('demo-preview')}
                  className="hover:text-white transition-colors"
                >
                  Cockpit de Direction
                </button>
              </li>
            </ul>
          </div>

          {/* Colonne 3 : Modules Académiques (lg:col-span-3) */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">
              Modules Métiers
            </h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>Direction & Délibérations CAMES</li>
              <li>Scolarité, Secrétariat & Bulletins</li>
              <li>Comptabilité & Mobile Money (Wave, Orange)</li>
              <li>Corps Professoral & Saisie de notes</li>
              <li>Portique de Sécurité & Badges QR Code</li>
              <li>Réseau Alumni & Insertion Professionnelle</li>
            </ul>
          </div>

          {/* Colonne 4 : Accès Rapide & Téléchargement (lg:col-span-2) */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">
              Accès Visiteur
            </h4>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={onOpenLogin}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 text-xs font-bold text-center transition-colors"
              >
                Espace Connexion
              </button>
              <button
                onClick={() => onOpenRegister()}
                className="w-full py-2.5 px-3 rounded-xl bg-[#FF6B00] hover:bg-orange-600 text-white text-xs font-bold text-center transition-colors shadow-sm"
              >
                Essai Gratuit 7 Jours
              </button>
              <Link
                href="/download"
                className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
              >
                <Download size={14} />
                <span>Application Mobile</span>
              </Link>
            </div>
          </div>

        </div>

        {/* Ligne inférieure : Copyright & Mentions */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex flex-col sm:flex-row items-center gap-2 text-center sm:text-left">
            <span>© {currentYear} UniSphere AI. Tous droits réservés.</span>
            <span className="hidden sm:inline">•</span>
            <span>Système d&apos;Information Universitaire certifié conforme aux normes LMD & CAMES.</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-slate-400 font-medium">Zone géographique : Bamako, Mali & zone UEMOA</span>
            <button
              onClick={scrollToTop}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
              title="Remonter en haut de la page"
              aria-label="Remonter en haut de la page"
            >
              <ArrowUp size={16} />
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
}

