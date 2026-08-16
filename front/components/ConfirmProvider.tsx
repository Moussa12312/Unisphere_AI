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
      
      {/* ✅ MODALE DE CONFIRMATION GLOBALE */}
      {pending && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className={`bg-gradient-to-r ${getVariantStyles(pending.options.variant).headerBg} p-5 rounded-t-2xl flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  {getIcon(pending.options.icon || 'alert', pending.options.variant)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{pending.options.title}</h3>
                  <p className="text-xs text-white/80">Confirmation requise</p>
                </div>
              </div>
              <button
                onClick={handleCancel}
                disabled={isProcessing}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={18} className="text-white" />
              </button>
            </div>
            
            {/* Contenu */}
            <div className="p-6">
              <p className="text-sm text-slate-700 leading-relaxed">
                {pending.options.message}
              </p>
              
              {/* Note d'avertissement */}
              <div className={`mt-4 flex items-start gap-2 p-3 rounded-lg border ${getVariantStyles(pending.options.variant).border} bg-slate-50`}>
                <AlertCircle size={16} className={`${getVariantStyles(pending.options.variant).iconColor} flex-shrink-0 mt-0.5`} />
                <p className="text-xs text-slate-600">
                  Cette action est irréversible. Veuillez vérifier avant de confirmer.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="p-5 border-t border-slate-200 flex items-center justify-end gap-3 bg-slate-50 rounded-b-2xl">
              <button
                onClick={handleCancel}
                disabled={isProcessing}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors disabled:opacity-50"
              >
                {pending.options.cancelText || 'Annuler'}
              </button>
              <button
                onClick={handleConfirm}
                disabled={isProcessing}
                className={`px-4 py-2 ${getVariantStyles(pending.options.variant).buttonBg} text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2 shadow-md transition-all`}
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