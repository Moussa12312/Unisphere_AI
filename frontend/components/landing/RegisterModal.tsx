'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, Building2, User, Mail, Phone, ArrowRight, 
  CheckCircle2, Sparkles, ShieldCheck, Check, GraduationCap 
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
  const [selectedPlan, setSelectedPlan] = useState(initialPlan);
  const [universityName, setUniversityName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+225 ');
  const [roleTitle, setRoleTitle] = useState('Direction / Recteur');
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (initialPlan) {
      setSelectedPlan(initialPlan);
    }
  }, [initialPlan]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!universityName.trim() || !fullName.trim() || !email.trim()) {
      toast.error('Veuillez remplir l’ensemble des informations obligatoires.');
      return;
    }

    setSubmitting(true);

    // Simulation de traitement d'inscription SaaS
    setTimeout(() => {
      setSubmitting(false);
      setIsSuccess(true);
      toast.success('Demande d’essai validée ! Votre espace est prêt pour test.');
    }, 800);
  };

  const resetAndClose = () => {
    setIsSuccess(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      
      {/* Conteneur de la Modale */}
      <div 
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête Modale */}
        <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FF6B00] to-orange-500 text-white flex items-center justify-center shadow-xs">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight">Essai Gratuit 7 Jours UniSphere</h3>
              <p className="text-xs text-slate-400">Sans carte bancaire • Immédiat • Conforme CAMES</p>
            </div>
          </div>

          <button
            onClick={resetAndClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Fermer la modale"
          >
            <X size={20} />
          </button>
        </div>

        {/* Corps Modale Déroulant */}
        <div className="p-6 overflow-y-auto">
          {isSuccess ? (
            /* Vue de confirmation réussie */
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-md">
                <CheckCircle2 size={36} />
              </div>
              <div className="space-y-1">
                <h4 className="text-xl font-black text-slate-900">Demande d&apos;accès validée avec succès !</h4>
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  Votre établissement <strong className="text-slate-900">{universityName}</strong> est désormais pré-enregistré sur la formule <strong className="text-[#FF6B00]">{selectedPlan.toUpperCase()}</strong>.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-orange-50 border border-orange-200 text-xs text-left text-orange-950 space-y-2 max-w-md mx-auto">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-[#FF6B00]" />
                  Accès démo immédiat disponible :
                </p>
                <p className="text-slate-600">
                  Un email avec vos accès complets a été transmis à <strong className="text-slate-900">{email}</strong>. En attendant, vous pouvez tester instantanément la plateforme via l&apos;espace de connexion.
                </p>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    resetAndClose();
                    onSwitchToLogin();
                  }}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-[#FF6B00] to-orange-600 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2"
                >
                  <span>Accéder à la démo</span>
                  <ArrowRight size={16} />
                </button>
                <button
                  type="button"
                  onClick={resetAndClose}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm"
                >
                  Fermer
                </button>
              </div>
            </div>
          ) : (
            /* Formulaire standard d'inscription */
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Sélecteur de Formule */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Formule Sélectionnée :
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'decouverte', label: 'Découverte', price: '49k/m' },
                    { id: 'etablissement', label: 'Établissement', price: '149k/m', highlight: true },
                    { id: 'campus', label: 'Campus Intégral', price: '249k/m' },
                  ].map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlan(plan.id)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        selectedPlan === plan.id
                          ? 'border-[#FF6B00] bg-orange-50/70 text-slate-900 shadow-2xs font-extrabold ring-2 ring-orange-500/20'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white'
                      }`}
                    >
                      <p className="text-xs font-bold">{plan.label}</p>
                      <p className="text-[11px] text-[#FF6B00] font-mono">{plan.price}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Champ Établissement */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nom de l&apos;Établissement / Université *
                </label>
                <div className="relative">
                  <Building2 size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={universityName}
                    onChange={(e) => setUniversityName(e.target.value)}
                    placeholder="Ex: Institut Universitaire Polytechnique d'Abidjan"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Grille Nom & Fonction */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nom & Prénom du Responsable *
                  </label>
                  <div className="relative">
                    <User size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Dr. Moussa Coulibaly"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Fonction dans l&apos;Établissement
                  </label>
                  <select
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                  >
                    <option value="Direction / Recteur">Direction Générale / Recteur</option>
                    <option value="Secrétaire Général">Secrétariat Général / Scolarité</option>
                    <option value="Doyen / Directeur des Études">Doyen / Censeur</option>
                    <option value="Directeur Administratif & Financier">Comptabilité & Finances</option>
                    <option value="Responsable Informatique">Responsable SI / IT</option>
                    <option value="Enseignant Chercheur">Enseignant / Coordinateur</option>
                  </select>
                </div>
              </div>

              {/* Grille Email & Téléphone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Email Professionnel *
                  </label>
                  <div className="relative">
                    <Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="direction@universite.ci"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Téléphone WhatsApp *
                  </label>
                  <div className="relative">
                    <Phone size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+225 07 00 00 00 00"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-500/20 outline-none transition-all font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Arguments rassurants */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5 text-xs text-slate-600">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Engagement zéro :</strong> Votre période d&apos;essai gratuite dure 7 jours. Aucune carte bancaire requise, aucun engagement contractuel automatique.
                </span>
              </div>

              {/* Bouton de Soumission */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#FF6B00] to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Création de votre environnement test...</span>
                  </>
                ) : (
                  <>
                    <span>Activer mon essai gratuit 7 jours</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

            </form>
          )}
        </div>

        {/* Pied Modale : Bascule vers Connexion */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 text-center text-xs text-slate-600">
          <span>Vous disposez déjà d&apos;un compte sur la plateforme ? </span>
          <button
            type="button"
            onClick={() => {
              resetAndClose();
              onSwitchToLogin();
            }}
            className="font-bold text-[#FF6B00] hover:underline ml-1"
          >
            Se connecter directement
          </button>
        </div>

      </div>
    </div>
  );
}

