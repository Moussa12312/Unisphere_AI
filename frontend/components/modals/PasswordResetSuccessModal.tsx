'use client';

import React, { useState } from 'react';
import {
  KeyRound, CheckCircle2, Copy, Check, Eye, EyeOff,
  User, ShieldCheck, X, AlertTriangle, Printer
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface PasswordResetSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetName: string;
  targetIdentifier?: string; // matricule ou email
  targetRole?: string;
  temporaryPassword: string;
}

export default function PasswordResetSuccessModal({
  isOpen,
  onClose,
  targetName,
  targetIdentifier,
  targetRole = 'Étudiant',
  temporaryPassword
}: PasswordResetSuccessModalProps) {
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(true);

  if (!isOpen || !temporaryPassword) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(temporaryPassword);
    setCopied(true);
    toast.success('Mot de passe copié dans le presse-papier !');
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Fiche d'Accès - ${targetName}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1e293b; }
            .card { border: 2px solid #e2e8f0; border-radius: 16px; padding: 30px; max-width: 500px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 20px; }
            .title { font-size: 20px; font-weight: bold; color: #0f172a; }
            .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
            .field { margin-bottom: 16px; }
            .label { font-size: 11px; font-weight: bold; text-transform: uppercase; color: #94a3b8; }
            .value { font-size: 15px; font-weight: 600; color: #0f172a; margin-top: 2px; }
            .pwd-box { background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 16px; text-align: center; margin: 24px 0; }
            .pwd-label { font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; }
            .password { font-family: monospace; font-size: 24px; font-weight: bold; color: #ea580c; letter-spacing: 2px; margin-top: 6px; }
            .warning { font-size: 11px; color: #64748b; line-height: 1.5; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 10px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <div class="title">FICHE D'ACCÈS ÉTABLISSEMENT</div>
              <div class="subtitle">UniSphere AI - Gestion Universitaire</div>
            </div>
            <div class="field">
              <div class="label">Bénéficiaire</div>
              <div class="value">${targetName}</div>
            </div>
            ${targetIdentifier ? `
            <div class="field">
              <div class="label">Identifiant / Matricule</div>
              <div class="value">${targetIdentifier}</div>
            </div>` : ''}
            <div class="field">
              <div class="label">Rôle</div>
              <div class="value">${targetRole}</div>
            </div>
            <div class="pwd-box">
              <div class="pwd-label">Nouveau Mot de Passe Temporaire</div>
              <div class="password">${temporaryPassword}</div>
            </div>
            <div class="warning">
              ⚠️ <strong>Important :</strong> Ce mot de passe est strictement personnel et temporaire. 
              L'étudiant sera invité à le modifier dès sa première connexion sur la plateforme.
            </div>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 relative overflow-hidden">
        {/* En-tête décoratif */}
        <div className="absolute top-0 left-0 right-0 h-2.5 bg-gradient-to-r from-emerald-500 via-[#FF6B00] to-blue-600" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          title="Fermer"
        >
          <X size={20} />
        </button>

        <div className="text-center pt-2 pb-4">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
            <CheckCircle2 size={36} />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Mot de passe réinitialisé !</h2>
          <p className="text-xs text-slate-500 mt-1">
            Le nouveau mot de passe a été généré et enregistré en base de données.
          </p>
        </div>

        {/* Détails du compte */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2 text-xs mb-5">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Bénéficiaire :</span>
            <span className="font-bold text-slate-900">{targetName}</span>
          </div>
          {targetIdentifier && (
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Identifiant / Matricule :</span>
              <span className="font-mono font-bold text-blue-700">{targetIdentifier}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Rôle :</span>
            <span className="font-semibold text-slate-800 capitalize">{targetRole}</span>
          </div>
        </div>

        {/* Boîte du nouveau mot de passe */}
        <div className="space-y-2 mb-5">
          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
            Nouveau mot de passe à transmettre :
          </label>
          <div className="relative flex items-center bg-slate-900 rounded-2xl p-3.5 border-2 border-emerald-500 shadow-md">
            <KeyRound size={20} className="text-emerald-400 shrink-0 mr-3" />
            <input
              type={showPassword ? 'text' : 'password'}
              readOnly
              value={temporaryPassword}
              className="bg-transparent font-mono text-xl font-bold text-emerald-300 w-full tracking-wider focus:outline-none select-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="p-1 text-slate-400 hover:text-white transition-colors mr-2 cursor-pointer"
              title={showPassword ? 'Masquer' : 'Afficher'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                copied
                  ? 'bg-emerald-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
              }`}
            >
              {copied ? (
                <>
                  <Check size={14} />
                  <span>Copié !</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Copier</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Note de sécurité */}
        <div className="flex items-start gap-2.5 p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] leading-relaxed mb-6">
          <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <span>
            <strong>Note importante :</strong> Donnez ce mot de passe à l'étudiant / utilisateur. Le mot de passe est actif immédiatement pour sa prochaine connexion.
          </span>
        </div>

        {/* Boutons d'action */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2.5 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 transition cursor-pointer"
          >
            <Printer size={15} />
            <span>Imprimer la fiche</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer text-center"
          >
            Terminer
          </button>
        </div>
      </div>
    </div>
  );
}

