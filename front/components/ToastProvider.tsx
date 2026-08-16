'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import GlassToast from './GlassToast';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  success: (message: string) => void;
  error: (message: any) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

let toastId = 0;

// ✅ Fonction utilitaire pour extraire le message d'une erreur
const extractErrorMessage = (error: any): string => {
  // Si c'est une chaîne
  if (typeof error === 'string') return error;
  
  // Si c'est une erreur Axios avec response.data
  if (error?.response?.data) {
    const data = error.response.data;
    
    // Si c'est un objet FastAPI avec detail
    if (typeof data === 'object' && data !== null) {
      // Erreur de validation FastAPI (array)
      if (Array.isArray(data.detail)) {
        return data.detail.map((d: any) => d.msg || d.message || '').join(', ');
      }
      
      // Erreur simple FastAPI avec detail string
      if (data.detail) {
        if (typeof data.detail === 'string') return data.detail;
        if (typeof data.detail === 'object') {
          return data.detail.msg || data.detail.message || JSON.stringify(data.detail);
        }
      }
      
      // Si c'est un objet avec msg
      if (data.msg) return data.msg;
      if (data.message) return data.message;
      
      // Si c'est l'objet {type, loc, msg, input} directement
      if (data.type && data.msg) return data.msg;
    }
    
    // Si data est une string
    if (typeof data === 'string') return data;
  }
  
  // Si c'est un objet Error
  if (error?.message) return error.message;
  
  // Si c'est un objet avec msg/message
  if (error?.msg) return error.msg;
  if (error?.message) return error.message;
  
  // Fallback
  try {
    return JSON.stringify(error);
  } catch {
    return 'Une erreur est survenue';
  }
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: any, type: ToastType) => {
    const id = ++toastId;
    // ✅ Extraire le message proprement
    const cleanMessage = extractErrorMessage(message);
    setToasts(prev => [...prev, { id, message: cleanMessage, type }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const success = useCallback((message: string) => addToast(message, 'success'), [addToast]);
  const error = useCallback((message: any) => addToast(message, 'error'), [addToast]);
  const warning = useCallback((message: string) => addToast(message, 'warning'), [addToast]);
  const info = useCallback((message: string) => addToast(message, 'info'), [addToast]);

  return (
    <ToastContext.Provider value={{ success, error, warning, info }}>
      {children}
      
      {/* Container des toasts */}
      <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none flex flex-col items-center">
        {toasts.map((toast) => (
          <div 
            key={toast.id} 
            className="pointer-events-auto"
          >
            <GlassToast
              message={toast.message}
              type={toast.type}
              visible={true}
              onDismiss={() => removeToast(toast.id)}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast doit être utilisé dans ToastProvider');
  }
  return context;
}