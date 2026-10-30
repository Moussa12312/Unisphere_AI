'use client';

import React, { useState } from 'react';
import LandingHeader from '@/components/landing/LandingHeader';
import HeroSection from '@/components/landing/HeroSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import PricingSection from '@/components/landing/PricingSection';
import FooterSection from '@/components/landing/FooterSection';
import LoginModal from '@/components/landing/LoginModal';
import RegisterModal from '@/components/landing/RegisterModal';
import { 
  Building2, Users, GraduationCap, ShieldCheck, 
  Sparkles, CheckCircle2, ArrowRight 
} from 'lucide-react';

export default function HomePage() {
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('etablissement');

  const handleOpenLogin = () => {
    setRegisterModalOpen(false);
    setLoginModalOpen(true);
  };

  const handleOpenRegister = (plan: string = 'etablissement') => {
    setSelectedPlan(plan);
    setLoginModalOpen(false);
    setRegisterModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col selection:bg-[#FF6B00]/20 selection:text-[#FF6B00]">
      
      {/* 1. EN-TÊTE DE NAVIGATION (STICKY HEADER) */}
      <LandingHeader 
        onOpenLogin={handleOpenLogin}
        onOpenRegister={handleOpenRegister}
      />

      <main className="flex-1">
        {/* 2. SECTION HÉROS (AU-DESSUS DE LA LIGNE DE FLOTTAISON) */}
        <HeroSection 
          onOpenLogin={handleOpenLogin}
          onOpenRegister={handleOpenRegister}
        />

        {/* BANDEAU DE STATISTIQUES & IMPACT ACADÉMIQUE */}
        <section className="bg-slate-900 text-white py-8 border-y border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div className="space-y-1">
                <p className="text-2xl sm:text-3xl font-black text-white tracking-tight">45 000+</p>
                <p className="text-xs font-semibold text-slate-400">Étudiants & parcours gérés</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl sm:text-3xl font-black text-[#FF6B00] tracking-tight">100%</p>
                <p className="text-xs font-semibold text-slate-400">PV conformes normes CAMES</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl sm:text-3xl font-black text-white tracking-tight">&lt; 30 sec</p>
                <p className="text-xs font-semibold text-slate-400">Génération de relevé & bulletin</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">0 Faux</p>
                <p className="text-xs font-semibold text-slate-400">Badges & reçus certifiés QR</p>
              </div>
            </div>
          </div>
        </section>

        {/* 3. SECTION "FONCTIONNALITÉS CLÉS" (GRILLE DE BÉNÉFICES) */}
        <FeaturesSection 
          onOpenRegister={handleOpenRegister}
        />

        {/* 4. SECTION "GRILLE TARIFAIRE ACCESSIBLE" (PRICING) */}
        <PricingSection 
          onSelectPlan={(plan) => handleOpenRegister(plan)}
        />

        {/* SECTION D'APPEL FINAL AVANT FOOTER */}
        <section className="py-16 bg-gradient-to-b from-white to-slate-50 border-b border-slate-200/80">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-100 text-[#FF6B00] text-xs font-bold uppercase tracking-wider">
              <Sparkles size={14} />
              <span>Modernisation Garantie</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-snug">
              Prêt à transformer la gestion de votre établissement universitaire ?
            </h2>

            <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Rejoignez les universités et grandes écoles qui font le choix de la rigueur, de la transparence et de la sérénité administrative.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={() => handleOpenRegister('etablissement')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#FF6B00] to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-md shadow-orange-500/25 transition-all"
              >
                <span>Activer mon essai gratuit</span>
                <ArrowRight size={16} />
              </button>

              <button
                onClick={handleOpenLogin}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-all shadow-2xs"
              >
                <span>Accès Démo 1-Clic</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* 5. PIED DE PAGE (FOOTER) */}
      <FooterSection 
        onOpenLogin={handleOpenLogin}
        onOpenRegister={handleOpenRegister}
      />

      {/* MODALE DE CONNEXION */}
      <LoginModal 
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onSwitchToRegister={() => handleOpenRegister()}
      />

      {/* MODALE D'INSCRIPTION / ESSAI GRATUIT */}
      <RegisterModal 
        isOpen={registerModalOpen}
        initialPlan={selectedPlan}
        onClose={() => setRegisterModalOpen(false)}
        onSwitchToLogin={handleOpenLogin}
      />

    </div>
  );
}
