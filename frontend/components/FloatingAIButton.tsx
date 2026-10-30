'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { BrainCircuit } from 'lucide-react';

export default function FloatingAIButton() {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const initialPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      // Position initiale par défaut : en bas à droite bien au-dessus de la barre d'onglets
      const isSmall = typeof window !== 'undefined' && window.innerWidth < 768;
      const defaultX = typeof window !== 'undefined' ? window.innerWidth - (isSmall ? 64 : 76) : 300;
      const defaultY = typeof window !== 'undefined' ? window.innerHeight - (isSmall ? 130 : 100) : 600;
      setPosition({ x: defaultX, y: defaultY });
      setIsVisible(true);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!e.touches[0]) return;
    const touch = e.touches[0];
    isDragging.current = true;
    hasMoved.current = false;
    dragStart.current = { x: touch.clientX, y: touch.clientY };
    if (position) {
      initialPos.current = { x: position.x, y: position.y };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || !e.touches[0]) return;
    const touch = e.touches[0];
    const dx = touch.clientX - dragStart.current.x;
    const dy = touch.clientY - dragStart.current.y;

    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      hasMoved.current = true;
    }

    const isSmall = window.innerWidth < 768;
    const maxX = window.innerWidth - 60;
    const maxY = window.innerHeight - (isSmall ? 95 : 60);

    const newX = Math.max(10, Math.min(maxX, initialPos.current.x + dx));
    const newY = Math.max(10, Math.min(maxY, initialPos.current.y + dy));

    setPosition({ x: newX, y: newY });
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    hasMoved.current = false;
    dragStart.current = { x: e.clientX, y: e.clientY };
    if (position) {
      initialPos.current = { x: position.x, y: position.y };
    }

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = moveEvent.clientX - dragStart.current.x;
      const dy = moveEvent.clientY - dragStart.current.y;

      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        hasMoved.current = true;
      }

      const isSmall = window.innerWidth < 768;
      const maxX = window.innerWidth - 60;
      const maxY = window.innerHeight - (isSmall ? 95 : 60);

      const newX = Math.max(10, Math.min(maxX, initialPos.current.x + dx));
      const newY = Math.max(10, Math.min(maxY, initialPos.current.y + dy));

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleClick = (e: React.MouseEvent) => {
    // Si l'utilisateur a glissé le bouton, on ne navigue pas
    if (hasMoved.current) {
      e.preventDefault();
      return;
    }
    router.push('/ai-assistant');
  };

  if (!isVisible || !position) return null;

  return (
    <div
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        touchAction: 'none'
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      className="fixed z-50 select-none print:hidden cursor-grab active:cursor-grabbing transition-transform duration-75 active:scale-105"
    >
      <button
        onClick={handleClick}
        type="button"
        className="group relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-tr from-[#FF6B00] to-orange-500 hover:from-orange-600 hover:to-orange-700 text-white rounded-full shadow-xl shadow-orange-500/40 hover:scale-105 transition-all"
        title="Assistant IA UniSphere (Glissez pour déplacer)"
      >
        <div className="relative pointer-events-none">
          <BrainCircuit size={22} className="sm:hidden animate-pulse" />
          <BrainCircuit size={26} className="hidden sm:block animate-pulse" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-400 rounded-full border-2 border-white animate-ping" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-400 rounded-full border-2 border-white" />
        </div>
      </button>
    </div>
  );
}