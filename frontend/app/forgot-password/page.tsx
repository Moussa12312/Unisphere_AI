'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, KeyRound, Mail, MessageSquare, Loader2, CheckCircle2, ShieldAlert } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [successInfo, setSuccessInfo] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      toast.error('Veuillez saisir votre adresse email');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/api/v1/password-reset/request', {
        email: cleanEmail,
        message: message.trim() || undefined
      });

      setSuccessInfo(
        res.data.message ||
        "Votre demande a bien été envoyée à l'administration. Un responsable vérifiera votre identité et réinitialisera votre accès."
      );
      setSubmitted(true);
      toast.success('Demande transmise avec succès !');
    } catch (error: any) {
      const err = error.response?.data?.detail || "Erreur lors de l'envoi de la demande";
      toast.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 sm:p-6"
      style={{
        background: 'linear-gradient(135deg, #0a1628 0%, #1e3a8a 50%, #0F172A 100%)'
      }}
    >
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 sm:p-10 border border-slate-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-[#FF6B00]">
            <KeyRound size={26} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Mot de passe oublié</h1>
            <p className="text-xs sm:text-sm text-slate-500">Procédure sécurisée avec l'administration</p>
          </div>
        </div>

        {submitted ? (
          <div className="space-y-6 text-center py-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={36} />
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-bold text-slate-900">Demande transmise !</h2>
              <p className="text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
                {successInfo}
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 text-left space-y-2">
              <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                <ShieldAlert size={15} className="text-amber-500" />
                Comment sera traité votre mot de passe ?
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><b>Étudiants & Anciens élèves (Alumni) :</b> La secrétaire ou l'administration réinitialisera votre mot de passe et vous le communiquera.</li>
                <li><b>Personnel & Enseignants :</b> La direction / administrateur principal valide directement votre compte.</li>
              </ul>
            </div>

            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 w-full py-3 bg-[#FF6B00] hover:bg-[#e55f00] text-white font-semibold rounded-xl text-sm transition-all shadow-md"
            >
              <ArrowLeft size={16} />
              Retour à la page de connexion
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
              <ShieldAlert size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Pour des raisons strictes de sécurité, la réinitialisation directe par simple email a été désactivée. Votre demande sera traitée par l'administration ou le secrétariat de votre établissement.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Votre adresse email professionnelle / étudiante *
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ex: prenom.nom@unisphere.ai"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Message à l'administration (optionnel)
              </label>
              <div className="relative">
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Bonjour, j'ai oublié mon mot de passe. Veuillez le réinitialiser s'il vous plaît (Matricule : ...)"
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] resize-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#FF6B00] hover:bg-[#e55f00] text-white font-semibold py-3 rounded-xl text-sm transition-all shadow-md disabled:opacity-50"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <MessageSquare size={18} />}
              {loading ? 'Envoi en cours...' : "Envoyer la demande à l'administration"}
            </button>

            <div className="pt-2 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-[#FF6B00] transition-colors"
              >
                <ArrowLeft size={14} />
                Retour à la connexion
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
