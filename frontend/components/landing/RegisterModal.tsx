'use client';

import React, { useState, useEffect } from 'react';
import {
  X, Phone, Mail, ArrowRight,
  Sparkles, CheckCircle2, MessageCircle,
  Building2, User, Clock, ShieldCheck, Send
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface RegisterModalProps {
  isOpen: boolean;
  initialPlan?: string;
  onClose: () => void;
  onSwitchToLogin: () => void;
}

export default function RegisterModal({
  isOpen,
  initialPlan = 'etablissement',
  onClose,
  onSwitchToLogin
}: RegisterModalProps) {
  const [universityName, setUniversityName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('+223 ');
  const [isSent, setIsSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsSent(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const whatsappMessage = encodeURIComponent(
    "Bonjour Moussa Coulibaly, je souhaite créer un compte et déployer UniSphere AI pour mon établissement universitaire."
  );
  const whatsappUrl = `https://wa.me/22373343493?text=${whatsappMessage}`;
  const phoneCallUrl = "tel:+22373343493";
  const emailUrl = "mailto:chakirunisphereai@gmail.com?subject=Demande%20de%20d%C3%A9ploiement%20UniSphere%20AI";

  const handleCallbackRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!universityName.trim() || !contactName.trim() || !phoneNumber.trim()) {
      toast.error('Veuillez renseigner votre établissement, nom et numéro de téléphone.');
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setIsSent(true);
      toast.success('Demande enregistrée ! Moussa Coulibaly vous contactera dans les plus brefs délais.');
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">

      {/* Conteneur Modale */}
      <div
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête Modale */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-[#1e1b4b] text-white px-6 py-5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FF6B00] to-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/30">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                Créer un Compte • Déploiement UniSphere AI
              </h3>
              <p className="text-xs text-orange-300 font-semibold">
                Accompagnement & Déploiement Personnalisé
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Fermer la modale"
          >
            <X size={20} />
          </button>
        </div>

        {/* Corps Modale Déroulant */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-6">

          {/* Message explicatif clé */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
              <Building2 size={20} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-amber-950">
                Mise en service dédiée pour votre établissement
              </h4>
              <p className="text-xs text-amber-900 leading-relaxed font-medium">
                La création d'un compte université et la configuration de votre maquette académique (filières LMD, semestres, coefficients, portails professeurs et scolarité) sont prises en charge directement avec notre direction technique.
              </p>
            </div>
          </div>

          {/* Boutons d'Action Directs : WhatsApp & Téléphone */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Contactez directement Moussa Coulibaly (Directeur Technique) :
            </p>

            {/* Bouton WhatsApp */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full group flex items-center justify-between p-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-md hover:shadow-lg transition-all transform active:scale-98"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <MessageCircle size={22} className="text-white" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-sm sm:text-base font-black">Discuter sur WhatsApp</span>
                    <span className="text-[10px] bg-white/20 text-emerald-100 font-bold px-2 py-0.5 rounded-full">
                      Réponse &lt; 5 min
                    </span>
                  </div>
                  <span className="text-xs text-emerald-100 font-medium">+223 73 34 34 93</span>
                </div>
              </div>
              <ArrowRight size={18} className="text-emerald-200 group-hover:translate-x-1 transition-transform" />
            </a>

            {/* Bouton Appel Téléphonique */}
            <a
              href={phoneCallUrl}
              className="w-full group flex items-center justify-between p-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl shadow-md hover:shadow-lg transition-all transform active:scale-98"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#FF6B00]/20 text-[#FF6B00] flex items-center justify-center shrink-0">
                  <Phone size={20} />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-sm sm:text-base font-black">Appeler directement</span>
                    <span className="text-[10px] bg-[#FF6B00]/20 text-[#FF6B00] font-bold px-2 py-0.5 rounded-full">
                      Disponible 7j/7
                    </span>
                  </div>
                  <span className="text-xs text-slate-300 font-medium">+223 73 34 34 93</span>
                </div>
              </div>
              <ArrowRight size={18} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
            </a>

            {/* Bouton Email */}
            <a
              href={emailUrl}
              className="w-full flex items-center justify-between p-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl border border-slate-200 transition-colors text-xs font-semibold"
            >
              <div className="flex items-center gap-2.5">
                <Mail size={16} className="text-[#FF6B00]" />
                <span>Par Email : <strong>chakirunisphereai@gmail.com</strong></span>
              </div>
              <span className="text-slate-500 text-[11px]">Écrire</span>
            </a>
          </div>

          {/* Formulaire optionnel de rappel */}
          <div className="pt-2 border-t border-slate-100">
            {isSent ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center space-y-2">
                <CheckCircle2 size={28} className="text-emerald-600 mx-auto" />
                <h5 className="text-sm font-bold text-emerald-950">Demande de rappel envoyée avec succès !</h5>
                <p className="text-xs text-emerald-800 font-medium">
                  Moussa Coulibaly vous appellera très rapidement au <strong>{phoneNumber}</strong>.
                </p>
              </div>
            ) : (
              <form onSubmit={handleCallbackRequest} className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Ou laissez vos coordonnées pour être rappelé :
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nom de l'Université / École
                    </label>
                    <input
                      type="text"
                      value={universityName}
                      onChange={(e) => setUniversityName(e.target.value)}
                      placeholder="ex: ECOB Mali"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nom & Fonction
                    </label>
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="ex: Dr. Diallo, Recteur"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Numéro de Téléphone (WhatsApp de préférence)
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+223 ..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-60"
                >
                  {submitting ? (
                    <span>Envoi en cours...</span>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Être rappelé par la Direction UniSphere AI</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Garanties */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px] font-semibold text-slate-700">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                <span>Déploiement en 24h-48h</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                <span>Données hébergées & protégées</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock size={14} className="text-emerald-600 shrink-0" />
                <span>Formation des équipes incluse</span>
              </div>
            </div>
          </div>

        </div>

        {/* Pied de Modale */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Déjà un compte ?</span>
          <button
            onClick={() => {
              onClose();
              onSwitchToLogin();
            }}
            className="text-[#FF6B00] hover:underline font-bold"
          >
            Se connecter au portail
          </button>
        </div>

      </div>

    </div>
  );
}
