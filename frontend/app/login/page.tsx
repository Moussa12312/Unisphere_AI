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
    <div className="min-h-screen h-[100dvh] w-full flex flex-col justify-between bg-[#F8FAFC] font-sans overflow-x-hidden selection:bg-[#FF6B00]/20 selection:text-[#FF6B00]">
      
      {/* Conteneur Principal : 2 Colonnes Modernes */}
      <main className="flex-1 w-full grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-y-auto lg:overflow-hidden">
        
        {/* ============================================================ */}
        {/* PARTIE GAUCHE — VITRINE INSTITUTIONNELLE (~58% desktop)     */}
        {/* ============================================================ */}
        <section className="relative hidden lg:flex lg:col-span-7 xl:col-span-7 flex-col justify-between overflow-hidden bg-[#031B63]">
          
          {/* Photographie architecturale campus universitaire sans texte */}
          <div
            className="absolute inset-0 bg-cover bg-no-repeat bg-center transform scale-105 transition-transform duration-1000 ease-out"
            style={{
              backgroundImage: "url('/images/modern-campus.jpg')",
            }}
          />

          {/* Dégradé brand bleu nuit avec translucidité pour apprécier le campus */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#031B63] via-[#031B63]/90 to-[#031B63]/60 pointer-events-none" />
          
          {/* Accent lumineux d'ambiance */}
          <div className="absolute top-1/4 -left-20 w-80 h-80 bg-[#0754C7]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-10 right-10 w-60 h-60 bg-[#FF6B00]/15 rounded-full blur-2xl pointer-events-none" />

          {/* Contenu textuel et visuel (En-tête, Titre, 4 Cartes Glass, Slogan) */}
          <LoginHeader />
        </section>

        {/* ============================================================ */}
        {/* PARTIE DROITE — FORMULAIRE DE CONNEXION (~42% desktop)       */}
        {/* ============================================================ */}
        <section className="col-span-1 lg:col-span-5 xl:col-span-5 bg-[#F8FAFC] flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative overflow-y-auto">
          
          {/* Sélecteur de langue en haut à droite */}
          <div className="w-full flex justify-end pb-1 shrink-0">
            <LanguageSelector />
          </div>

          {/* Carte blanche de connexion parfaitement centrée */}
          <div className="my-auto py-2 flex items-center justify-center w-full">
            <LoginForm onOpenContactAdmin={() => setContactModalOpen(true)} />
          </div>

          {/* Espace tampon bas */}
          <div className="hidden lg:block h-2 shrink-0" />
        </section>

      </main>

      {/* ============================================================ */}
      {/* PIED DE PAGE INSTITUTIONNEL                                 */}
      {/* ============================================================ */}
      <LoginFooter />

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
        <div className="min-h-screen bg-[#031B63] flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
