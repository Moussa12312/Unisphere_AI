'use client';

import React, { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export default function PasswordInput({
  value,
  onChange,
  placeholder = '••••••••••••',
  error,
  disabled,
  className = '',
  ...props
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="w-full">
      <div className="relative group">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#FF6B00] transition-colors pointer-events-none">
          <Lock size={17} />
        </div>

        <input
          {...props}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full pl-10 pr-11 py-2.5 sm:py-3 bg-slate-50/80 hover:bg-slate-50 focus:bg-white border ${
            error
              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
              : 'border-slate-200 hover:border-slate-300 focus:border-[#FF6B00] focus:ring-[#FF6B00]/15'
          } rounded-xl text-slate-900 text-sm font-medium placeholder-slate-400 focus:outline-none focus:ring-3 transition-all ${className}`}
        />

        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          disabled={disabled}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-[#0a1628] transition-colors focus:outline-none cursor-pointer"
          aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        >
          {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
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
