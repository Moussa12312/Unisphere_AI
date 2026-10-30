'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { LogOut, X } from 'lucide-react';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName?: string;
  userRole?: string;
}

export default function LogoutConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  userName = 'Utilisateur',
  userRole,
}: LogoutConfirmModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fermeture via la touche Échap
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Bloquer le scroll d'arrière-plan quand la modale est ouverte
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'super_admin':
      case 'superadmin':
        return 'Super Admin';
      case 'admin':
        return 'Direction';
      case 'secretary':
        return 'Secrétaire';
      case 'censeur':
        return 'Censeur';
      case 'accountant':
        return 'Comptable';
      case 'guard':
        return 'Gardien';
      case 'teacher':
        return 'Enseignant';
      case 'student':
        return 'Étudiant';
      case 'alumni':
        return 'Alumni';
      default:
        return 'Utilisateur';
    }
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-dialog-title"
    >
      <div 
        className="relative w-full max-w-sm sm:max-w-md bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 my-auto overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Bouton de fermeture d'angle */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Fermer la boîte de dialogue"
        >
          <X size={18} />
        </button>

        {/* En-tête avec Icône */}
        <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 mb-4 pr-8">
          <div className="w-12 h-12 bg-rose-100 dark:bg-rose-950/50 rounded-2xl flex items-center justify-center shrink-0 text-rose-600 dark:text-rose-400 shadow-xs">
            <LogOut className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div className="min-w-0">
            <h3 id="logout-dialog-title" className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug">
              Confirmation de déconnexion
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
              Souhaitez-vous fermer votre session sécurisée ?
            </p>
          </div>
        </div>

        {/* Encadré d'information de session */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 mb-5 space-y-1">
          <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200 gap-2">
            <span className="truncate">Compte : {userName}</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 shrink-0">
              {getRoleBadge(userRole)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Vous devrez renseigner de nouveau vos identifiants pour accéder à cet espace.
          </p>
        </div>

        {/* Actions Responsive : Empilées sur petit écran mobile, côte à côte sur tablette/desktop */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-98 rounded-xl transition-all text-center"
          >
            Rester connecté
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="w-full sm:w-auto px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 active:scale-98 rounded-xl transition-all shadow-md shadow-red-600/25 flex items-center justify-center gap-2 text-center"
          >
            <LogOut size={16} />
            <span>Oui, me déconnecter</span>
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
