'use client';
export const dynamic = 'force-dynamic';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { Smartphone, ShieldCheck } from 'lucide-react';
import UniSphereLogo from '@/components/auth/UniSphereLogo';
import LoginForm from '@/components/auth/LoginForm';
import LanguageSelector from '@/components/auth/LanguageSelector';
import RegisterModal from '@/components/landing/RegisterModal';

function LoginPageContent() {
  const [contactModalOpen, setContactModalOpen] = useState(false);

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-[#0a1628] font-sans overflow-x-hidden relative selection:bg-[#FF6B00]/20 selection:text-[#FF6B00] py-6 px-4 sm:px-6">
      {/* Fond sobre avec léger halo de lumière */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-10 mix-blend-luminosity pointer-events-none"
        style={{ backgroundImage: "url('/images/modern-campus.jpg')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a1628] via-[#0a1628]/95 to-[#081220] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[#FF6B00]/10 rounded-full blur-3xl pointer-events-none" />

      {/* En-tête : Logo & Langue */}
      <header className="relative z-10 w-full max-w-md mx-auto flex items-center justify-between pt-2">
        <Link href="/" className="inline-block hover:opacity-90 transition-opacity">
          <UniSphereLogo variant="light" size="sm" showSlogan={false} />
        </Link>
        <LanguageSelector />
      </header>

      {/* Formulaire de connexion épuré et centré */}
      <main className="relative z-10 w-full max-w-md mx-auto my-auto py-6">
        <LoginForm onOpenContactAdmin={() => setContactModalOpen(true)} />
      </main>

      {/* Pied de page discret */}
      <footer className="relative z-10 w-full max-w-md mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 pb-2">
        <div className="flex items-center gap-1.5 text-slate-400">
          <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
          <span>Connexion sécurisée SSL</span>
        </div>

        <Link
          href="/download"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
        >
          <Smartphone size={14} className="text-[#FF6B00]" />
          <span>Application Android</span>
        </Link>
      </footer>

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
          <div className="w-10 h-10 border-4 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
