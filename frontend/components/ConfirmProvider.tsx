'use client';

import { useState, useCallback, ReactNode } from 'react';
import { AlertCircle, Trash2, CheckCircle, Info, X, Loader2 } from 'lucide-react';
import { ConfirmContext, ConfirmOptions } from '@/hooks/useConfirm';

type PendingConfirm = {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
};

export default function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setPending({ options, resolve });
    });
  }, []);

  const handleConfirm = async () => {
    if (!pending) return;
    setIsProcessing(true);
    
    // Petit délai pour l'animation
    await new Promise(r => setTimeout(r, 200));
    
    pending.resolve(true);
    setPending(null);
    setIsProcessing(false);
  };

  const handleCancel = () => {
    if (!pending) return;
    pending.resolve(false);
    setPending(null);
    setIsProcessing(false);
  };

  const getVariantStyles = (variant: string = 'danger') => {
    switch (variant) {
      case 'danger':
        return {
          iconBg: 'bg-red-100',
          iconColor: 'text-white-600',
          buttonBg: 'bg-red-600 hover:bg-red-700',
          headerBg: 'from-red-600 to-rose-700',
          border: 'border-red-200'
        };
      case 'warning':
        return {
          iconBg: 'bg-orange-100',
          iconColor: 'text-orange-600',
          buttonBg: 'bg-orange-600 hover:bg-orange-700',
          headerBg: 'from-orange-500 to-amber-600',
          border: 'border-orange-200'
        };
      case 'success':
        return {
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600',
          buttonBg: 'bg-green-600 hover:bg-green-700',
          headerBg: 'from-green-600 to-emerald-700',
          border: 'border-green-200'
        };
      case 'info':
      default:
        return {
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          buttonBg: 'bg-blue-600 hover:bg-blue-700',
          headerBg: 'from-blue-600 to-indigo-700',
          border: 'border-blue-200'
        };
    }
  };

  const getIcon = (icon: string = 'alert', variant: string = 'danger') => {
    const styles = getVariantStyles(variant);
    const iconSize = 28;
    
    switch (icon) {
      case 'trash':
        return <Trash2 size={iconSize} className={styles.iconColor} />;
      case 'check':
        return <CheckCircle size={iconSize} className={styles.iconColor} />;
      case 'info':
        return <Info size={iconSize} className={styles.iconColor} />;
      case 'alert':
      default:
        return <AlertCircle size={iconSize} className={styles.iconColor} />;
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      
      {/* ✅ MODALE DE CONFIRMATION GLOBALE RESPONSIVE */}
      {pending && (
        <div 
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-[99999] p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={handleCancel}
        >
          <div 
            className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-sm sm:max-w-md w-full animate-in zoom-in-95 duration-200 overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`bg-gradient-to-r ${getVariantStyles(pending.options.variant).headerBg} p-4 sm:p-5 flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shrink-0">
                  {getIcon(pending.options.icon || 'alert', pending.options.variant)}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white leading-snug">{pending.options.title}</h3>
                  <p className="text-xs text-white/80">Confirmation requise</p>
                </div>
              </div>
              <button
                onClick={handleCancel}
                disabled={isProcessing}
                className="p-1.5 hover:bg-white/10 rounded-xl transition-colors"
                aria-label="Fermer"
              >
                <X size={18} className="text-white" />
              </button>
            </div>
            
            {/* Contenu */}
            <div className="p-4 sm:p-6">
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                {pending.options.message}
              </p>
              
              {/* Note d'avertissement */}
              <div className={`mt-4 flex items-start gap-2 p-3 rounded-xl border ${getVariantStyles(pending.options.variant).border} bg-slate-50`}>
                <AlertCircle size={16} className={`${getVariantStyles(pending.options.variant).iconColor} flex-shrink-0 mt-0.5`} />
                <p className="text-xs text-slate-600">
                  Cette action est irréversible. Veuillez vérifier avant de confirmer.
                </p>
              </div>
            </div>

            {/* Actions Responsive */}
            <div className="p-4 sm:p-5 border-t border-slate-200 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3 bg-slate-50">
              <button
                onClick={handleCancel}
                disabled={isProcessing}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors disabled:opacity-50 text-center"
              >
                {pending.options.cancelText || 'Annuler'}
              </button>
              <button
                onClick={handleConfirm}
                disabled={isProcessing}
                className={`w-full sm:w-auto px-4 py-2.5 sm:py-2 ${getVariantStyles(pending.options.variant).buttonBg} text-white rounded-xl text-xs sm:text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2 shadow-md transition-all text-center`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Traitement...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    {pending.options.confirmText || 'Confirmer'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}