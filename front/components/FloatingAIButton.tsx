'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BrainCircuit, X, Sparkles } from 'lucide-react';

export default function FloatingAIButton() {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    // Afficher le bouton après 1 seconde
    const timer = setTimeout(() => setIsVisible(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleClick = () => {
    router.push('/ai-assistant');
  };

  if (!isVisible) return null;

  return (
    <>
      {/* ✅ BOUTON FLOTTANT */}
      <button
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          fixed bottom-6 right-6 z-40
          group
          flex items-center gap-3
          bg-orange-600
          hover:from-orange-600 hover:to-orange-700
          text-white
          rounded-full
          shadow-2xl shadow-orange-500/50
          transition-all duration-300
          hover:scale-110
          ${isHovered ? 'p-4' : 'p-4'}
        `}
      >
        <div className="relative">
          <BrainCircuit size={24} className="animate-pulse" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-ping"></span>
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></span>
        </div>
      </button>

      
    </>
  );
}