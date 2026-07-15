'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, Sparkles } from 'lucide-react';

interface ComboBoxProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  helperText?: string;
}

export default function ComboBox({
  label,
  placeholder,
  value,
  onChange,
  options,
  helperText
}: ComboBoxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isNewValue = value.trim() !== '' && !options.includes(value.trim());

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(value.toLowerCase())
  );

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
    setIsTyping(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setIsTyping(true);
    setIsOpen(true);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-sm font-medium text-slate-700 mb-2">
        {label}
      </label>
      
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className="w-full px-4 py-2.5 pr-10 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          {options.length === 0 && !isTyping && (
            <div className="px-4 py-3 text-sm text-slate-500 text-center">
              <Sparkles size={16} className="inline mr-2 text-orange-500" />
              Aucun domaine existant. Tapez pour créer un nouveau domaine.
            </div>
          )}

          {filteredOptions.length > 0 && (
            <>
              <div className="px-3 py-2 text-xs font-semibold text-slate-500 border-b border-slate-100">
                Domaines existants
              </div>
              {filteredOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={`w-full px-4 py-2.5 text-left hover:bg-slate-50 flex items-center justify-between ${
                    value === option ? 'bg-[#FF6B00]/10 text-[#FF6B00]' : 'text-slate-700'
                  }`}
                >
                  <span className="font-medium">{option}</span>
                  {value === option && <Check size={16} className="text-[#FF6B00]" />}
                </button>
              ))}
            </>
          )}

          {value.trim() && isNewValue && (
            <div className="border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-full px-4 py-2.5 text-left hover:bg-orange-50 flex items-center gap-2 text-orange-700"
              >
                <Sparkles size={16} />
                <span className="font-medium">Créer le domaine "{value}"</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ✅ SEUL le badge "Nouveau domaine" est affiché */}
      {value && isNewValue && (
        <div className="mt-2">
          <span className="inline-flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
            <Sparkles size={12} />
            Nouveau domaine
          </span>
        </div>
      )}

      {helperText && (
        <p className="text-xs text-slate-500 mt-2">{helperText}</p>
      )}
    </div>
  );
}