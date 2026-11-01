'use client';
export const dynamic = 'force-dynamic';

import React, { useState, Suspense } from 'react';
import LoginHeader from '@/components/auth/LoginHeader';
import LoginForm from '@/components/auth/LoginForm';
import LanguageSelector from '@/components/auth/LanguageSelector';
import LoginFooter from '@/components/auth/LoginFooter';
import RegisterModal from '@/components/landing/RegisterModal';

function LoginPageContent() {
  const [contactModalOpen, setContactModalOpen] = useState(false);

  return (
    <div className="min-h-screen h-[100dvh] w-full flex flex-col justify-between bg-[#F3F6FC] font-sans overflow-x-hidden selection:bg-[#FF7900]/20 selection:text-[#FF7900]">
      
      {/* Conteneur Principal : 2 Colonnes */}
      <main className="flex-1 w-full grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-y-auto lg:overflow-hidden">
        
        {/* ============================================================ */}
        {/* PARTIE GAUCHE — PRÉSENTATION UNIVERSITAIRE (~60% sur desktop) */}
        {/* ============================================================ */}
        <section className="relative hidden lg:flex lg:col-span-7 xl:col-span-7 flex-col justify-between overflow-hidden bg-[#031B63]">
          
          {/* Photographie réaliste du campus universitaire avec dégradé subtil */}
          <div
            className="absolute inset-0 bg-cover bg-no-repeat bg-right"
            style={{
              backgroundImage: "url('/images/login-left-bg.jpg')",
            }}
          />

          {/* Voile dégradé bleu nuit vers transparent sur la gauche pour lisibilité parfaite */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#031B63] via-[#031B63]/85 to-transparent pointer-events-none" />

          {/* Contenu textuel et visuel (En-tête, Titre, 4 Puces, Slogan) */}
          <LoginHeader />
        </section>

        {/* ============================================================ */}
        {/* PARTIE DROITE — FORMULAIRE DE CONNEXION (~40% sur desktop)    */}
        {/* ============================================================ */}
        <section className="col-span-1 lg:col-span-5 xl:col-span-5 bg-[#F3F6FC] flex flex-col justify-between p-4 sm:p-6 lg:p-8 xl:p-10 relative overflow-y-auto">
          
          {/* Sélecteur de langue en haut à droite */}
          <div className="w-full flex justify-end pb-2 shrink-0">
            <LanguageSelector />
          </div>

          {/* Carte blanche de connexion centrée */}
          <div className="my-auto py-4 flex items-center justify-center">
            <LoginForm onOpenContactAdmin={() => setContactModalOpen(true)} />
          </div>

          {/* Espace tampon bas */}
          <div className="hidden lg:block h-2 shrink-0" />
        </section>

      </main>

      {/* ============================================================ */}
      {/* 5. PIED DE PAGE — Toute la largeur (Bleu Nuit #031B63)       */}
      {/* ============================================================ */}
      <LoginFooter />

      {/* Modale de contact de l'administration (Moussa Coulibaly • WhatsApp & Appel Direct) */}
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
        <div className="min-h-screen bg-[#031B63] flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-[#FF7900] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
