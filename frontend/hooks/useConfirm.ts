'use client';

import { useContext, createContext } from 'react';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  icon?: 'alert' | 'trash' | 'check' | 'info';
}

export interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

export const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function useConfirm() {
  const context = useContext(ConfirmContext);
  
  if (!context) {
    throw new Error('useConfirm doit être utilisé dans un ConfirmProvider');
  }
  
  return context;
}