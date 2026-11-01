'use client';

import React, { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export default function PasswordInput({
  value,
  onChange,
  placeholder = 'Mot de passe',
  error,
  disabled,
  className = '',
  ...props
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="w-full">
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
          <Lock size={18} />
        </div>

        <input
          {...props}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full pl-11 pr-12 py-3.5 bg-white border ${
            error
              ? 'border-rose-400 focus:ring-rose-400'
              : 'border-slate-300 hover:border-slate-400 focus:border-[#0754C7] focus:ring-[#0754C7]/20'
          } rounded-2xl text-slate-800 text-sm font-medium placeholder-slate-400 focus:outline-none focus:ring-3 transition-all ${className}`}
        />

        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          disabled={disabled}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none cursor-pointer"
          aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      {error && (
        <p className="mt-1 text-xs text-rose-500 font-medium pl-1">
          {error}
        </p>
      )}
    </div>
  );
}

