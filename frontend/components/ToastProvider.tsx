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

// ✅ Fonction utilitaire pour extraire le message d'une erreur (inclut les tableaux Pydantic FastAPI)
const extractErrorMessage = (error: any): string => {
  if (typeof error === 'string') return error;

  if (Array.isArray(error)) {
    const msgs = error
      .map((d: any) => (typeof d === 'string' ? d : d?.msg || d?.message || ''))
      .filter(Boolean);
    return msgs.length > 0 ? msgs.join(', ') : 'Erreur de validation des données';
  }

  if (error?.response?.data) {
    const data = error.response.data;

    if (Array.isArray(data)) {
      const msgs = data.map((d: any) => d?.msg || d?.message || '').filter(Boolean);
      return msgs.length > 0 ? msgs.join(', ') : 'Erreur de validation des données';
    }

    if (typeof data === 'object' && data !== null) {
      if (Array.isArray(data.detail)) {
        const msgs = data.detail.map((d: any) => d?.msg || d?.message || '').filter(Boolean);
        return msgs.length > 0 ? msgs.join(', ') : 'Erreur de validation des données';
      }

      if (data.detail) {
        if (typeof data.detail === 'string') return data.detail;
        if (typeof data.detail === 'object') {
          return data.detail.msg || data.detail.message || JSON.stringify(data.detail);
        }
      }

      if (data.msg) return data.msg;
      if (data.message) return data.message;
      if (data.type && data.msg) return data.msg;
    }

    if (typeof data === 'string') return data;
  }

  if (error?.message) return error.message;
  if (error?.msg) return error.msg;

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
    const cleanMessage = extractErrorMessage(message);
    setToasts((prev) => [...prev, { id, message: cleanMessage, type }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((message: string) => addToast(message, 'success'), [addToast]);
  const error = useCallback((message: any) => addToast(message, 'error'), [addToast]);
  const warning = useCallback((message: string) => addToast(message, 'warning'), [addToast]);
  const info = useCallback((message: string) => addToast(message, 'info'), [addToast]);

  return (
    <ToastContext.Provider value={{ success, error, warning, info }}>
      {children}

      <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none flex flex-col items-center">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
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
