'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  ShieldCheck, ArrowRight, LogIn, CheckCircle2, Sparkles,
  TrendingUp, Users, CreditCard, QrCode, GraduationCap,
  Award, PlayCircle, Check, Laptop
} from 'lucide-react';

interface HeroSectionProps {
  onOpenLogin: () => void;
  onOpenRegister: (plan?: string) => void;
}

export default function HeroSection({ onOpenLogin, onOpenRegister }: HeroSectionProps) {
  const [activeTab, setActiveTab] = useState<'direction' | 'pedagogie' | 'finances'>('direction');

  return (
    <section id="hero" className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50/50 pt-10 pb-16 lg:pt-16 lg:pb-24 border-b border-slate-200/80">

      {/* Motifs de fond géométriques subtils */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[1000px] h-[450px] bg-gradient-to-tr from-orange-200/30 via-amber-100/20 to-blue-200/30 rounded-full blur-3xl opacity-70"></div>
        <div className="absolute -top-24 right-10 w-96 h-96 bg-orange-400/10 rounded-full blur-2xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">

          {/* ================= COLONNE GAUCHE : PROPOSITION DE VALEUR ================= */}
          <div className="lg:col-span-7 flex flex-col justify-center text-left">

            {/* 1. Badge supérieur de conformité officielle */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-200/80 text-xs sm:text-sm font-semibold text-orange-950 mb-6 shadow-2xs w-fit">
              <span className="flex h-2 w-2 rounded-full bg-[#FF6B00] animate-pulse"></span>
              <ShieldCheck size={16} className="text-[#FF6B00]" />
              <span>Conforme CAMES & Enseignement Supérieur • Mali & UEMOA</span>
            </div>

            {/* 2. Titre principal percutant */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15] mb-6">
              <span className="text-[#FF6B00]">UniSphere AI</span> : La plateforme tout-en-un pour moderniser, sécuriser et piloter votre université.
            </h1>

            {/* 3. Paragraphe explicatif court (3 lignes max) */}
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mb-8">
              Finis les dossiers papier égarés, les retards de scolarité et les calculs de PV manuels. UniSphere unifie scolarité LMD, paiements Mobile Money (Orange Money, Wave, MTN), contrôle d&apos;accès par QR Code et réseau Alumni dans un environnement fluide et ultra-sécurisé.
            </p>

            {/* 4. Double bouton d'appel à l'action (CTA) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 mb-8">
              <button
                onClick={() => onOpenRegister('recommande')}
                className="inline-flex items-center justify-center gap-3 px-7 py-4 rounded-xl text-base font-bold text-white bg-gradient-to-r from-[#FF6B00] to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transition-all transform active:scale-98"
              >
                <span>Commencer gratuitement</span>
                <ArrowRight size={18} />
              </button>

              <button
                onClick={onOpenLogin}
                className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-base font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 shadow-2xs transition-all active:scale-98"
              >
                <LogIn size={18} className="text-slate-500" />
                <span>Se connecter</span>
              </button>
            </div>

            {/* 5. Ligne de réassurance sous les boutons (3 arguments clés cochés) */}
            <div className="pt-4 border-t border-slate-200/80">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs sm:text-sm font-semibold text-slate-700">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={17} className="text-emerald-600 shrink-0" />
                  <span>Essai 7 jours sans engagement</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={17} className="text-emerald-600 shrink-0" />
                  <span>Paiements Wave, Orange & MTN</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={17} className="text-emerald-600 shrink-0" />
                  <span>Conforme maquettes LMD</span>
                </div>
              </div>
            </div>

          </div>

          {/* ================= COLONNE DROITE : PREUVE VISUELLE / DÉMO ================= */}
          <div className="lg:col-span-5 relative" id="demo-preview">

            {/* Effet d'ombrage et de halo */}
            <div className="absolute -inset-1.5 bg-gradient-to-r from-[#FF6B00]/20 to-blue-600/20 rounded-3xl blur-xl opacity-75"></div>

            {/* Cadre du Mockup Produit */}
            <div className="relative bg-white rounded-2xl border border-slate-200/90 shadow-2xl overflow-hidden">

              {/* Barre supérieure type Mac / Fenêtre OS */}
              <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span className="ml-2 text-xs font-mono text-slate-400 font-medium">unisphere-cockpit-v2.6</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    En ligne
                  </span>
                </div>
              </div>

              {/* Onglets de simulation du produit */}
              <div className="bg-slate-100 p-1.5 flex gap-1 border-b border-slate-200 text-xs font-bold text-slate-600">
                <button
                  onClick={() => setActiveTab('direction')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all ${activeTab === 'direction'
                    ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                    : 'hover:text-slate-900'
                    }`}
                >
                  Vue Direction
                </button>
                <button
                  onClick={() => setActiveTab('pedagogie')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all ${activeTab === 'pedagogie'
                    ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                    : 'hover:text-slate-900'
                    }`}
                >
                  Scolarité LMD
                </button>
                <button
                  onClick={() => setActiveTab('finances')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all ${activeTab === 'finances'
                    ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                    : 'hover:text-slate-900'
                    }`}
                >
                  Mobile Money
                </button>
              </div>

              {/* Contenu dynamique du mockup */}
              <div className="p-5 space-y-4 bg-slate-50/60">

                {/* En-tête du tableau de bord */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FF6B00] to-amber-500 flex items-center justify-center text-white font-black shadow-xs">
                      UA
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900">Chakir'School</h4>
                      <p className="text-xs text-slate-500 font-medium">Annee Académique 2026-2027 • Bamako</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                    Système LMD
                  </span>
                </div>

                {/* Grille de métriques réelles */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-500 mb-1">
                      <span className="text-xs font-semibold">Effectif Inscrit</span>
                      <Users size={15} className="text-[#FF6B00]" />
                    </div>
                    <p className="text-xl font-black text-slate-900">4 850</p>
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                      <TrendingUp size={11} /> +14% cette session
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-500 mb-1">
                      <span className="text-xs font-semibold">Taux Recouvrement</span>
                      <CreditCard size={15} className="text-emerald-600" />
                    </div>
                    <p className="text-xl font-black text-slate-900">96.2%</p>
                    <span className="text-[11px] font-bold text-slate-500 mt-0.5 block">
                      Wave & Orange Money
                    </span>
                  </div>
                </div>

                {/* Aperçu interactif selon l'onglet */}
                {activeTab === 'direction' && (
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs space-y-2.5">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span>Dernières Délibérations LMD</span>
                      <span className="text-emerald-600 font-extrabold">100% Validées</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <span className="font-semibold text-slate-700">Licence 3 - Informatique & IA</span>
                        <span className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded text-[10px]">PV Généré</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <span className="font-semibold text-slate-700">Master 2 - Sciences de Gestion</span>
                        <span className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded text-[10px]">PV Généré</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'pedagogie' && (
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs space-y-2.5">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span>Calcul Automatisé des Crédits</span>
                      <span className="text-blue-600 font-extrabold">Norme CAMES</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-orange-50/70 border border-orange-200/80 text-slate-700 space-y-1">
                      <div className="flex justify-between font-bold">
                        <span>Unités d&apos;Enseignement (UE)</span>
                        <span>30 Crédits ECTS</span>
                      </div>
                      <p className="text-[11px] text-slate-600">Calcul des moyennes semestrielles pondérées sans risque d&apos;erreur de formule.</p>
                    </div>
                  </div>
                )}

                {activeTab === 'finances' && (
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs space-y-2.5">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span>Flux Directs de Scolarité</span>
                      <span className="text-emerald-600 font-extrabold">Instant Money</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/60 border border-emerald-100 text-[11px]">
                        <span className="font-semibold text-slate-800">Orange Money Mali</span>
                        <span className="font-mono font-bold text-emerald-700">+ 150 000 FCFA</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50/60 border border-blue-100 text-[11px]">
                        <span className="font-semibold text-slate-800">Wave Mobile Money</span>
                        <span className="font-mono font-bold text-blue-700">+ 200 000 FCFA</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pied du Mockup avec Action Démo */}
                <div className="pt-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                    <QrCode size={14} className="text-slate-600" />
                    <span>Pointage QR Code opérationnel</span>
                  </div>
                  <button
                    onClick={onOpenLogin}
                    className="font-bold text-[#FF6B00] hover:text-orange-700 flex items-center gap-1 hover:underline"
                  >
                    Tester la démo <ArrowRight size={13} />
                  </button>
                </div>

              </div>

            </div>

            {/* Badge Flottant Supérieur Gauche (Conformité & Réussite) */}
            <div className="hidden sm:flex absolute -top-4 -left-6 bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-xl items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Check size={18} className="stroke-[3]" />
              </div>
              <div className="text-left">
                <p className="text-[11px] font-extrabold text-slate-900">Homologation 100% CAMES</p>
                <p className="text-[10px] text-slate-500">Gestion conforme LMD Afrique</p>
              </div>
            </div>

            {/* Badge Flottant Inférieur Droit (Rapidité & Notification) */}
            <div className="hidden sm:flex absolute -bottom-4 -right-4 bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-xl items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-[#FF6B00] flex items-center justify-center">
                <Sparkles size={18} />
              </div>
              <div className="text-left">
                <p className="text-[11px] font-extrabold text-slate-900">PV de notes en 1 clic</p>
                <p className="text-[10px] text-slate-500">Zéro calcul manuel en commission</p>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}

