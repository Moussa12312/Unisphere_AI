'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface GlassToastProps {
  message: string;
  type?: ToastType;
  visible: boolean;
  onDismiss: () => void;
}

const config = {
  success: {
    gradient: 'from-emerald-500/90 via-green-500/90 to-teal-500/90',
    shadow: 'shadow-emerald-500/30',
    icon: CheckCircle2,
  },
  error: {
    gradient: 'from-rose-500/90 via-red-500/90 to-pink-500/90',
    shadow: 'shadow-rose-500/30',
    icon: XCircle,
  },
  warning: {
    gradient: 'from-amber-500/90 via-orange-500/90 to-yellow-500/90',
    shadow: 'shadow-amber-500/30',
    icon: AlertTriangle,
  },
  info: {
    gradient: 'from-blue-500/90 via-indigo-500/90 to-purple-500/90',
    shadow: 'shadow-blue-500/30',
    icon: Info,
  },
};

export default function GlassToast({ 
  message, 
  type = 'success', 
  visible, 
  onDismiss 
}: GlassToastProps) {
  const [show, setShow] = useState(false);
  const cfg = config[type];
  const Icon = cfg.icon;
  
  const safeMessage = message || 'Une erreur est survenue';

  useEffect(() => {
    if (visible) {
      requestAnimationFrame(() => setShow(true));
      
      const timer = setTimeout(() => {
        setShow(false);
        setTimeout(onDismiss, 300);
      }, 3000);
      
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [visible, onDismiss]);

  if (!visible && !show) return null;

  return (
    <div
      className={`
        fixed top-6 left-1/2 -translate-x-1/2 z-[9999]
        transition-all duration-300 ease-out
        ${show ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-4 scale-95'}
      `}
    >
      <div className={`
        relative overflow-hidden
        min-w-[320px] max-w-md
        rounded-2xl
        bg-gradient-to-r ${cfg.gradient}
        backdrop-blur-xl
        shadow-2xl ${cfg.shadow}
        border border-white/20
      `}>
        {/* Effet de brillance */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full animate-shimmer" />
        
        {/* Contenu */}
        <div className="relative flex items-center gap-3 px-5 py-4">
          <div className={`
            flex-shrink-0 w-8 h-8 rounded-full
            bg-white/20 backdrop-blur-sm
            flex items-center justify-center
            ${show ? 'animate-bounce-in' : ''}
          `}>
            <Icon size={18} className="text-white" />
          </div>
          
          <p className="flex-1 text-sm font-medium text-white leading-snug break-words">
            {safeMessage}
          </p>
          
          <button
            onClick={() => {
              setShow(false);
              setTimeout(onDismiss, 300);
            }}
            className="flex-shrink-0 p-1 rounded-lg hover:bg-white/20 transition-colors"
          >
            <X size={14} className="text-white/80" />
          </button>
        </div>
        
        {/* Barre de progression */}
        <div className="h-0.5 bg-white/10">
          <div 
            className="h-full bg-white/60 animate-progress"
            style={{ animationDuration: '3s' }}
          />
        </div>
      </div>
    </div>
  );
}