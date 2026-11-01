'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';

interface Language {
  code: string;
  label: string;
}

const LANGUAGES: Language[] = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية' },
];

export default function LanguageSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState<Language>(LANGUAGES[0]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 hover:bg-white text-slate-700 text-xs font-semibold shadow-xs border border-slate-200/80 transition-all hover:shadow-sm active:scale-95 cursor-pointer backdrop-blur-md"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Globe size={15} className="text-[#0754C7]" />
        <span>{selectedLang.label}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-36 rounded-2xl bg-white shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => {
                setSelectedLang(lang);
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-between px-3.5 py-2 text-xs text-slate-700 hover:bg-[#F3F6FC] hover:text-[#0754C7] font-medium transition-colors text-left"
            >
              <span>{lang.label}</span>
              {selectedLang.code === lang.code && <Check size={14} className="text-[#0754C7]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

