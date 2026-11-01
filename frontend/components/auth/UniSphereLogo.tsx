'use client';

import React from 'react';
import Image from 'next/image';

interface UniSphereLogoProps {
  variant?: 'light' | 'dark'; // 'light' pour fond sombre, 'dark' pour carte blanche
  showSlogan?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function UniSphereLogo({
  variant = 'light',
  showSlogan = true,
  className = '',
  size = 'md',
}: UniSphereLogoProps) {
  const isLight = variant === 'light';

  return (
    <div className={`flex items-center gap-3.5 select-none ${className}`}>
      {/* Emblème : Livre ouvert + Puce IA */}
      <div className="relative shrink-0">
        <svg
          viewBox="0 0 100 100"
          className={size === 'sm' ? 'w-10 h-10' : size === 'lg' ? 'w-16 h-16' : 'w-12 h-12'}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Base / Ombrage du livre */}
          <path
            d="M 50 82 C 30 75 12 78 5 82 L 5 35 C 15 28 35 25 50 32 Z"
            fill="#0754C7"
            stroke={isLight ? '#FFFFFF' : '#031B63'}
            strokeWidth="2.5"
          />
          <path
            d="M 50 78 C 32 70 18 73 10 77 L 10 38 C 20 32 38 30 50 35 Z"
            fill="#FF7900"
          />

          <path
            d="M 50 82 C 70 75 88 78 95 82 L 95 35 C 85 28 65 25 50 32 Z"
            fill="#0754C7"
            stroke={isLight ? '#FFFFFF' : '#031B63'}
            strokeWidth="2.5"
          />
          <path
            d="M 50 78 C 68 70 82 73 90 77 L 90 38 C 80 32 62 30 50 35 Z"
            fill="#FF7900"
          />

          {/* Reliure centrale */}
          <path
            d="M 50 85 L 50 32"
            stroke={isLight ? '#FFFFFF' : '#031B63'}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M 3 83 C 25 89 45 89 50 93 C 55 89 75 89 97 83"
            stroke={isLight ? '#FFFFFF' : '#031B63'}
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Puce électronique centrale */}
          <rect
            x="35"
            y="15"
            width="30"
            height="30"
            rx="6"
            fill="#031B63"
            stroke="#FFFFFF"
            strokeWidth="2.5"
          />
          <circle cx="50" cy="30" r="6" fill="#FF7900" />
          <circle cx="50" cy="30" r="2.5" fill="#FFFFFF" />

          {/* Connecteurs microchip */}
          <line x1="50" y1="8" x2="50" y2="15" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="42" y1="9" x2="42" y2="15" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="58" y1="9" x2="58" y2="15" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />

          <line x1="28" y1="30" x2="35" y2="30" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="29" y1="22" x2="35" y2="22" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="29" y1="38" x2="35" y2="38" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />

          <line x1="65" y1="30" x2="72" y2="30" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="65" y1="22" x2="71" y2="22" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="65" y1="38" x2="71" y2="38" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </div>

      {/* Titre et Slogan */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 leading-none">
          <span
            className={`font-black tracking-tight ${
              size === 'sm' ? 'text-xl' : size === 'lg' ? 'text-3xl' : 'text-2xl sm:text-[26px]'
            } ${isLight ? 'text-white' : 'text-[#031B63]'}`}
          >
            UniSphere
          </span>
          <span
            className={`font-black tracking-tight text-[#FF7900] ${
              size === 'sm' ? 'text-xl' : size === 'lg' ? 'text-3xl' : 'text-2xl sm:text-[26px]'
            }`}
          >
            AI
          </span>
        </div>

        {showSlogan && (
          <span
            className={`text-xs font-medium italic mt-1 tracking-tight ${
              isLight ? 'text-blue-100/90' : 'text-slate-500'
            }`}
          >
            Ensemble pour une université intelligente
          </span>
        )}
      </div>
    </div>
  );
}

