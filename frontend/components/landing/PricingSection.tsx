'use client';

import React from 'react';
import { 
  Check, ArrowRight, Sparkles, ShieldCheck, Zap, 
  HelpCircle, CreditCard, Smartphone, CheckCircle2 
} from 'lucide-react';

interface PricingSectionProps {
  onSelectPlan: (planName: string) => void;
}

export default function PricingSection({ onSelectPlan }: PricingSectionProps) {
  const plans = [
    {
      id: 'decouverte',
      name: 'Formule Découverte',
      periodBadge: 'Mensuel sans engagement',
      subtitle: 'Idéal pour piloter une filière test ou évaluer l’outil en conditions réelles.',
      price: '49 000',
      currency: 'FCFA',
      period: '/ mois',
      equivalent: 'Sans engagement • Annulable à tout moment en 1 clic',
      popular: false,
      badgeText: null,
      ctaText: 'Choisir la Formule Découverte',
      ctaStyle: 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-300',
      features: [
        'Jusqu’à 350 étudiants enregistrés',
        'Gestion complète des notes & PV LMD',
        'Reçus de scolarité électroniques certifiés',
        'Espace Enseignant & Saisie en ligne',
        'Support technique par WhatsApp & Email',
      ],
      notIncluded: [
        'Paiements Mobile Money automatisés',
        'Cartes avec QR Code de sécurité',
        'Portail Alumni & Insertion pro',
      ]
    },
    {
      id: 'etablissement',
      name: 'Formule Établissement',
      periodBadge: 'Semestriel recommandé',
      subtitle: 'La formule plébiscitée par les grandes écoles et instituts universitaires.',
      price: '149 000',
      currency: 'FCFA',
      period: '/ mois',
      equivalent: 'Facturé par semestre (894 000 FCFA) • Soit ~298 FCFA / étudiant / mois',
      popular: true,
      badgeText: '★ LE PLUS POPULAIRE',
      ctaText: 'Démarrer l’Essai Gratuit 7 Jours',
      ctaStyle: 'bg-gradient-to-r from-[#FF6B00] to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/30',
      features: [
        'Jusqu’à 2 500 étudiants & enseignants illimités',
        'Paiements Mobile Money intégrés (Wave, Orange, MTN)',
        'Cartes étudiantes numériques avec QR Code',
        'Délibérations LMD & PV automatisés 1-clic',
        'Portails Secrétariat, Censeur & Comptabilité',
        'Réseau Alumni & suivi de l’insertion des diplômés',
        'Support prioritaire 6j/7 et formation des équipes',
      ],
      notIncluded: []
    },
    {
      id: 'campus',
      name: 'Formule Campus Intégral',
      periodBadge: 'Annuel sérénité',
      subtitle: 'Tranquillité totale et personnalisation pour universités multi-campus.',
      price: '249 000',
      currency: 'FCFA',
      period: '/ mois',
      equivalent: 'Facturé annuellement (2 mois offerts) • Économie de 498 000 FCFA',
      popular: false,
      badgeText: 'MEILLEURE OFFRE (2 MOIS OFFERTS)',
      ctaText: 'Opter pour Campus Intégral',
      ctaStyle: 'bg-slate-900 hover:bg-slate-800 text-white shadow-md',
      features: [
        'Étudiants, campus et filières illimités',
        'Tous les modules débloqués sans restriction',
        'Module de contrôle d’accès portique hors-ligne',
        'Assistant IA d’aide à la décision académique',
        'Sauvegarde quotidienne cloud & SLA 99.9%',
        'Formation certifiante sur site pour vos agents',
        'Gestionnaire de compte dédié disponible 24/7',
      ],
      notIncluded: []
    }
  ];

  return (
    <section id="pricing" className="py-20 bg-slate-50/70 border-b border-slate-200/80 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* En-tête centré */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-100 text-[#FF6B00] border border-orange-200 text-xs font-bold uppercase tracking-wider mb-4">
            <Zap size={14} className="text-[#FF6B00]" />
            <span>Transparence & Flexibilité</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
            Une grille tarifaire accessible, adaptée à l&apos;échelle de votre université
          </h2>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            Aucun frais d&apos;installation caché. Choisissez votre formule selon vos effectifs et activez votre environnement en quelques clics.
          </p>
        </div>

        {/* Grille comparative des 3 formules */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch mb-16">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-3xl flex flex-col justify-between transition-all duration-300 ${
                plan.popular
                  ? 'bg-white border-2 border-[#FF6B00] shadow-2xl shadow-orange-500/10 lg:-translate-y-2'
                  : 'bg-white border border-slate-200/90 shadow-md hover:shadow-xl'
              } p-7 sm:p-8`}
            >
              {/* Badge flottant pour la formule populaire ou meilleure offre */}
              {plan.badgeText && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className={`inline-flex items-center gap-1.5 px-4 py-1 rounded-full text-xs font-extrabold tracking-wide uppercase shadow-md ${
                    plan.popular
                      ? 'bg-gradient-to-r from-[#FF6B00] to-orange-600 text-white'
                      : 'bg-slate-900 text-white'
                  }`}>
                    {plan.popular && <Sparkles size={12} />}
                    {plan.badgeText}
                  </span>
                </div>
              )}

              <div>
                {/* En-tête de formule */}
                <div className="mb-6 pt-2">
                  <span className="inline-block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    {plan.periodBadge}
                  </span>
                  <h3 className="text-2xl font-black text-slate-900 mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {plan.subtitle}
                  </p>
                </div>

                {/* Bloc Prix */}
                <div className="mb-6 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                      {plan.price}
                    </span>
                    <span className="text-base font-bold text-slate-700">{plan.currency}</span>
                    <span className="text-xs font-semibold text-slate-500">{plan.period}</span>
                  </div>
                  <p className="text-[11px] font-semibold text-[#FF6B00] mt-1.5">
                    {plan.equivalent}
                  </p>
                </div>

                {/* Liste des fonctionnalités incluses */}
                <div className="space-y-3 mb-8">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Inclus dans cette formule :
                  </p>
                  {plan.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                      <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Check size={11} className="stroke-[3]" />
                      </div>
                      <span>{feat}</span>
                    </div>
                  ))}

                  {/* Éléments non inclus (uniquement formule découverte pour clarté) */}
                  {plan.notIncluded.map((feat, idx) => (
                    <div key={`not-${idx}`} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-400 font-normal">
                      <span className="w-4 h-4 text-center shrink-0 text-slate-300 font-bold">—</span>
                      <span className="line-through">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bouton d'action direct */}
              <div className="pt-4 border-t border-slate-100">
                <button
                  onClick={() => onSelectPlan(plan.id)}
                  className={`w-full py-3.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all transform active:scale-98 ${plan.ctaStyle}`}
                >
                  <span>{plan.ctaText}</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Moyens de paiement acceptés (Mobile Money Locaux) */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm max-w-4xl mx-auto">
          <div className="text-center mb-6">
            <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center justify-center gap-2">
              <CreditCard size={18} className="text-[#FF6B00]" />
              <span>Moyens de paiement acceptés pour vos règlements & scolarités</span>
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Paiement direct sécurisé et réconciliation automatique en Côte d&apos;Ivoire et dans toute la zone UEMOA.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 text-center">
            
            {/* Orange Money */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col items-center justify-center gap-1.5 hover:bg-orange-50/50 hover:border-orange-300 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-[#FF6B00] text-white flex items-center justify-center font-black text-xs shadow-2xs">
                OM
              </div>
              <span className="text-xs font-bold text-slate-800">Orange Money</span>
              <span className="text-[10px] text-slate-500">CI & UEMOA</span>
            </div>

            {/* Wave */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col items-center justify-center gap-1.5 hover:bg-blue-50/50 hover:border-blue-300 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-[#1DA1F2] text-white flex items-center justify-center font-black text-xs shadow-2xs">
                W
              </div>
              <span className="text-xs font-bold text-slate-800">Wave Mobile</span>
              <span className="text-[10px] text-slate-500">Zéro frais caché</span>
            </div>

            {/* MTN MoMo */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col items-center justify-center gap-1.5 hover:bg-amber-50/50 hover:border-amber-300 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-[#FFCC00] text-slate-900 flex items-center justify-center font-black text-xs shadow-2xs">
                MTN
              </div>
              <span className="text-xs font-bold text-slate-800">MTN MoMo</span>
              <span className="text-[10px] text-slate-500">Instantané</span>
            </div>

            {/* Moov Money */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col items-center justify-center gap-1.5 hover:bg-blue-50/50 hover:border-blue-300 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-[#005CA9] text-white flex items-center justify-center font-black text-xs shadow-2xs">
                M
              </div>
              <span className="text-xs font-bold text-slate-800">Moov Money</span>
              <span className="text-[10px] text-slate-500">Côte d&apos;Ivoire</span>
            </div>

            {/* Cartes Bancaires Visa & Mastercard */}
            <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col items-center justify-center gap-1.5 hover:bg-emerald-50/50 hover:border-emerald-300 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-xs shadow-2xs">
                CB
              </div>
              <span className="text-xs font-bold text-slate-800">Visa / Mastercard</span>
              <span className="text-[10px] text-slate-500">International</span>
            </div>

          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-2 text-xs font-semibold text-slate-500 text-center">
            <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
            <span>Sécurité certifiée SSL 256 bits • Reçus fiscaux & attestations de paiement infalsifiables</span>
          </div>
        </div>

      </div>
    </section>
  );
}
