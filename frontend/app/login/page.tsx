'use client';
export const dynamic = 'force-dynamic';

import React, { useState, Suspense } from 'react';
import LoginHeader from '@/components/auth/LoginHeader';
import LoginForm from '@/components/auth/LoginForm';
import LanguageSelector from '@/components/auth/LanguageSelector';
import RegisterModal from '@/components/landing/RegisterModal';

function LoginPageContent() {
  const [contactModalOpen, setContactModalOpen] = useState(false);

  return (
    <div className="min-h-screen h-[100dvh] w-full flex bg-[#F1F5F9] font-sans overflow-x-hidden selection:bg-[#FF6B00]/20 selection:text-[#FF6B00]">
      <main className="flex-1 w-full grid grid-cols-1 lg:grid-cols-12 min-h-0">
        {/* ============================================================ */}
        {/* PANNEAU GAUCHE — IDENTITÉ INSTITUTIONNELLE (#0a1628 & #FF6B00) */}
        {/* ============================================================ */}
        <section className="relative hidden lg:flex lg:col-span-7 flex-col justify-between overflow-hidden bg-[#0a1628]">
          {/* Photographie campus en filigrane subtil (sans aucun texte incrusté) */}
          <div
            className="absolute inset-0 bg-cover bg-no-repeat bg-center opacity-30 mix-blend-luminosity"
            style={{
              backgroundImage: "url('/images/modern-campus.jpg')",
            }}
          />

          {/* Voile profond Midnight Navy fidèle au thème de l'application */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628]/95 via-[#0f172a]/90 to-[#0a1628]/80 pointer-events-none" />

          {/* Halos lumineux aux couleurs de marque */}
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#FF6B00]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 right-0 w-96 h-96 bg-[#FF6B00]/10 rounded-full blur-3xl pointer-events-none" />

          {/* Bordure lumineuse séparatrice à droite */}
          <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-[#FF6B00]/40 to-transparent pointer-events-none" />

          <LoginHeader />
        </section>

        {/* ============================================================ */}
        {/* PANNEAU DROIT — CONNEXION COMPACTE & ÉPURÉE                   */}
        {/* ============================================================ */}
        <section className="col-span-1 lg:col-span-5 bg-[#F1F5F9] relative flex flex-col justify-between p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {/* Barre supérieure : Sélecteur de langue */}
          <div className="w-full flex justify-end shrink-0">
            <LanguageSelector />
          </div>

          {/* Formulaire centré sans débordement */}
          <div className="my-auto py-3 flex items-center justify-center w-full">
            <LoginForm onOpenContactAdmin={() => setContactModalOpen(true)} />
          </div>

          {/* Mention discrète bas de colonne */}
          <div className="text-center text-[11px] text-slate-400 font-medium shrink-0">
            Propulsé par <span className="text-[#0a1628] font-bold">UniSphere</span>{' '}
            <span className="text-[#FF6B00] font-bold">AI</span>
          </div>
        </section>
      </main>

      {/* Modale de contact de l'administration */}
      <RegisterModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        onSwitchToLogin={() => setContactModalOpen(false)}
      />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
          <div className="w-11 h-11 border-4 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
