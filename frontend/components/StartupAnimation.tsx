'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';

interface StartupAnimationProps {
  onComplete?: () => void;
  forceShow?: boolean;
}

export default function StartupAnimation({ onComplete, forceShow = false }: StartupAnimationProps) {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const steps = [
    "Initialisation du noyau UniSphere AI...",
    "Vérification des protocoles de sécurité...",
    "Chargement des modules académiques...",
    "Synchronisation des identités & QR Codes...",
    "Système opérationnel. Bienvenue !"
  ];

  useEffect(() => {
    // Vérifier si l'animation a déjà été jouée pendant cette session
    if (typeof window !== 'undefined') {
      const hasPlayed = sessionStorage.getItem('unisphere_startup_played');
      if (hasPlayed && !forceShow) {
        if (onComplete) onComplete();
        return;
      }
      // Marquer comme jouée
      sessionStorage.setItem('unisphere_startup_played', 'true');
      setVisible(true);
    }
  }, [forceShow, onComplete]);

  useEffect(() => {
    if (!visible) return;

    // Progression du chargement
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        const increment = Math.floor(Math.random() * 8) + 4; // Incrément dynamique
        const nextVal = Math.min(100, prev + increment);
        
        // Mettre à jour l'étape
        const stepIdx = Math.min(
          steps.length - 1,
          Math.floor((nextVal / 100) * steps.length)
        );
        setCurrentStepIndex(stepIdx);
        return nextVal;
      });
    }, 60);

    return () => clearInterval(interval);
  }, [visible, steps.length]);

  useEffect(() => {
    if (progress === 100 && visible) {
      const timer = setTimeout(() => {
        setFading(true);
        const exitTimer = setTimeout(() => {
          setVisible(false);
          if (onComplete) onComplete();
        }, 600); // Durée de fondu de sortie
        return () => clearTimeout(exitTimer);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [progress, visible, onComplete]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center select-none overflow-hidden transition-all duration-700 ease-out ${
        fading ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{
        background: 'radial-gradient(ellipse at 50% 40%, #0d1b2a 0%, #060b13 60%, #020408 100%)',
      }}
    >
      {/* Grille d'arrière-plan avec particules lumineuses */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 107, 0, 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 107, 0, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Halo lumineux d'ambiance */}
      <div className="absolute w-[450px] h-[450px] rounded-full bg-gradient-to-tr from-[#FF6B00]/25 via-blue-600/20 to-cyan-400/15 blur-[120px] pointer-events-none animate-pulse" />

      {/* Contenu central */}
      <div className="relative z-10 flex flex-col items-center max-w-md px-6 text-center">
        
        {/* Anneaux holographiques orbitaux */}
        <div className="relative flex items-center justify-center w-36 h-36 mb-8">
          {/* Anneau extérieur en rotation rapide */}
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#FF6B00]/40 animate-[spin_10s_linear_infinite]" />
          
          {/* Anneau intermédiaire inversé */}
          <div className="absolute inset-2 rounded-full border border-cyan-500/30 animate-[spin_7s_linear_infinite_reverse]" />
          
          {/* Anneau avec gradient accentué */}
          <div 
            className="absolute inset-4 rounded-full border-2 border-transparent border-t-[#FF6B00] border-r-orange-400 animate-spin"
            style={{ animationDuration: '2.5s' }}
          />

          {/* Logo UniSphere AI au centre */}
          <div className="relative w-20 h-20 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-white/10 shadow-[0_0_35px_rgba(255,107,0,0.4)] flex items-center justify-center p-3">
            <Image
              src="/logo.png"
              alt="UniSphere AI Logo"
              width={64}
              height={64}
              className="object-contain drop-shadow-[0_0_12px_rgba(255,107,0,0.6)]"
              priority
            />
          </div>
        </div>

        {/* Titre & Slogan */}
        <div className="space-y-2 mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white via-orange-100 to-[#FF6B00] drop-shadow-sm">
            UNISPHERE AI
          </h1>
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-400/90 font-medium">
            Plateforme Universitaire Intelligente
          </p>
        </div>

        {/* Barre de progression futuriste */}
        <div className="w-full max-w-xs space-y-3">
          <div className="relative h-1.5 w-full bg-slate-800/80 rounded-full overflow-hidden border border-white/5 backdrop-blur-sm shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-[#FF6B00] to-orange-400 rounded-full transition-all duration-150 ease-out shadow-[0_0_12px_#FF6B00]"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Statut et pourcentage */}
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="truncate pr-2 font-mono text-slate-300 transition-all duration-200">
              {steps[currentStepIndex]}
            </span>
            <span className="font-mono font-bold text-[#FF6B00]">
              {progress}%
            </span>
          </div>
        </div>

        {/* Bouton pour passer discrètement */}
        <button
          onClick={() => {
            setFading(true);
            setTimeout(() => {
              setVisible(false);
              if (onComplete) onComplete();
            }, 300);
          }}
          className="mt-8 text-[11px] text-slate-500 hover:text-slate-300 uppercase tracking-wider transition-colors px-3 py-1 rounded hover:bg-white/5"
        >
          Passer l'introduction →
        </button>
      </div>

      {/* Footer minimaliste */}
      <div className="absolute bottom-6 text-center text-[10px] text-slate-600 font-mono tracking-widest">
        SYSTEM BOOT // V2.0 // SMART ECOSYSTEM
      </div>
    </div>
  );
}
