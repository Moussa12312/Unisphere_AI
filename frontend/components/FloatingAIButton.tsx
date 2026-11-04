'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { BrainCircuit } from 'lucide-react';

export default function FloatingAIButton() {
  const router = useRouter();
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; buttonX: number; buttonY: number } | null>(null);
  const hasMovedRef = useRef(false);

  useEffect(() => {
    const handleResize = () => {
      const margin = 20;
      const buttonSize = 56;
      setPosition({
        x: window.innerWidth - buttonSize - margin,
        y: window.innerHeight - buttonSize - 90
      });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    dragStartRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      buttonX: position.x,
      buttonY: position.y
    };
    hasMovedRef.current = false;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - dragStartRef.current.startX;
    const deltaY = touch.clientY - dragStartRef.current.startY;

    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      hasMovedRef.current = true;
    }

    const buttonSize = 56;
    const minX = 10;
    const maxX = window.innerWidth - buttonSize - 10;
    const minY = 60;
    const maxY = window.innerHeight - buttonSize - 70;

    setPosition({
      x: Math.min(Math.max(minX, dragStartRef.current.buttonX + deltaX), maxX),
      y: Math.min(Math.max(minY, dragStartRef.current.buttonY + deltaY), maxY)
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      buttonX: position.x,
      buttonY: position.y
    };
    hasMovedRef.current = false;
    setIsDragging(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragStartRef.current) return;
      const deltaX = moveEvent.clientX - dragStartRef.current.startX;
      const deltaY = moveEvent.clientY - dragStartRef.current.startY;

      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        hasMovedRef.current = true;
      }

      const buttonSize = 56;
      const minX = 10;
      const maxX = window.innerWidth - buttonSize - 10;
      const minY = 60;
      const maxY = window.innerHeight - buttonSize - 70;

      setPosition({
        x: Math.min(Math.max(minX, dragStartRef.current.buttonX + deltaX), maxX),
        y: Math.min(Math.max(minY, dragStartRef.current.buttonY + deltaY), maxY)
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (hasMovedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    router.push('/ai-assistant');
  };

  if (position.x === 0 && position.y === 0) return null;

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
        className="group relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-full shadow-md transition-all active:scale-95"
        title="Assistant IA UniSphere"
      >
        <BrainCircuit size={22} className="text-white" />
      </button>
    </div>
  );
}
