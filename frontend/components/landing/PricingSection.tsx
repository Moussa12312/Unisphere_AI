'use client';

import React, { useState } from 'react';
import {
  Check, ArrowRight, Sparkles, ShieldCheck, Zap,
  CreditCard, Users, CheckCircle2, ChevronRight
} from 'lucide-react';

interface PricingSectionProps {
  onSelectPlan: (planName: string) => void;
}

interface TierConfig {
  id: string;
  name: string;
  studentsRange: string;
  annualPrice: string;
  monthlyPrice: string;
  annualTotal: number | null;
  monthlyTotal: number | null;
  savings: string;
  badge?: string;
  isCustom?: boolean;
}

export default function PricingSection({ onSelectPlan }: PricingSectionProps) {
  const tiers: TierConfig[] = [
    {
      id: 'tier-1',
      name: 'Très petite structure',
      studentsRange: '1 à 100 étudiants',
      annualPrice: '450 000',
      monthlyPrice: '60 000',
      annualTotal: 450000,
      monthlyTotal: 480000,
      savings: 'Économie de 30 000 FCFA en paiement annuel'
    },
    {
      id: 'tier-2',
      name: 'Petite université',
      studentsRange: '101 à 250 étudiants',
      annualPrice: '600 000',
      monthlyPrice: '75 000',
      annualTotal: 600000,
      monthlyTotal: 600000,
      savings: '8 mensualités de 75 000 FCFA • Vacances offertes'
    },
    {
      id: 'tier-3',
      name: 'Université moyenne',
      studentsRange: '251 à 500 étudiants',
      annualPrice: '900 000',
      monthlyPrice: '112 500',
      annualTotal: 900000,
      monthlyTotal: 900000,
      savings: '8 mensualités de 112 500 FCFA • Vacances offertes',
      badge: '★ FORMULE LA PLUS CHOISIE'
    },
    {
      id: 'tier-4',
      name: 'Grande université',
      studentsRange: '501 à 1 000 étudiants',
      annualPrice: '1 500 000',
      monthlyPrice: '187 500',
      annualTotal: 1500000,
      monthlyTotal: 1500000,
      savings: '8 mensualités de 187 500 FCFA • Vacances offertes'
    },
    {
      id: 'tier-5',
      name: 'Très grande université',
      studentsRange: '1 001 à 2 500 étudiants',
      annualPrice: '2 400 000',
      monthlyPrice: '300 000',
      annualTotal: 2400000,
      monthlyTotal: 2400000,
      savings: '8 mensualités de 300 000 FCFA • Vacances offertes'
    },
    {
      id: 'tier-6',
      name: 'Université de grande capacité',
      studentsRange: 'Plus de 2 500 étudiants',
      annualPrice: 'À partir de 3 600 000',
      monthlyPrice: 'Sur devis',
      annualTotal: 3600000,
      monthlyTotal: null,
      savings: 'Tarification et infrastructure personnalisées',
      isCustom: true
    }
  ];

  const [selectedTierIndex, setSelectedTierIndex] = useState(2); // Tier 3 par défaut (251 à 500)
  const currentTier = tiers[selectedTierIndex];

  return (
    <section id="pricing" className="py-20 bg-slate-50/70 border-b border-slate-200/80 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* En-tête centré */}
        <div className="max-w-3xl mx-auto text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-100 text-[#FF6B00] border border-orange-200 text-xs font-bold uppercase tracking-wider mb-4">
            <Zap size={14} className="text-[#FF6B00]" />
            <span>Tarification Transparente & Adaptée</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
            Une grille tarifaire claire, proportionnée à l&apos;effectif de votre établissement
          </h2>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            Choisissez la catégorie correspondant à votre effectif étudiant. Le paiement annuel vous fait bénéficier d&apos;une réduction directe par rapport au total mensuel.
          </p>
        </div>

        {/* SÉLECTEUR D'EFFECTIF ÉTUDIANT (CONSERVATION DU DESIGN & ERGONOMIE) */}
        <div className="max-w-4xl mx-auto mb-12">
          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500 text-center mb-3">
            Sélectionnez la taille de votre établissement :
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {tiers.map((t, idx) => (
              <button
                key={t.id}
                onClick={() => setSelectedTierIndex(idx)}
                className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                  selectedTierIndex === idx
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-[#FF6B00]/40'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-orange-300 hover:bg-orange-50/30'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${selectedTierIndex === idx ? 'text-orange-400' : 'text-slate-400'}`}>
                    {t.name.split(' ')[0]}
                  </span>
                  <Users size={12} className={selectedTierIndex === idx ? 'text-white' : 'text-slate-400'} />
                </div>
                <p className="text-xs font-extrabold truncate">{t.studentsRange}</p>
              </button>
            ))}
          </div>
        </div>

        {/* GRILLE COMPARATIVE DES 2 FORMULES (MENSUELLE VS ANNUELLE) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 max-w-5xl mx-auto gap-8 items-stretch mb-14">

          {/* CARTE 1 : FORMULE MENSUELLE SOUPLE */}
          <div className="relative rounded-3xl flex flex-col justify-between transition-all duration-300 bg-white border border-slate-200/90 shadow-md hover:shadow-xl p-7 sm:p-8">
            <div>
              {/* En-tête formule mensuelle */}
              <div className="mb-6 pt-2">
                <span className="inline-block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Trésorerie lissée • {currentTier.studentsRange}
                </span>
                <h3 className="text-2xl font-black text-slate-900 mb-2">
                  Formule Mensuelle
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Idéale pour aligner les charges du logiciel sur le rythme des encaissements de scolarité.
                </p>
              </div>

              {/* Bloc Prix Mensuel */}
              <div className="mb-6 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                    {currentTier.monthlyPrice}
                  </span>
                  {!currentTier.isCustom && (
                    <>
                      <span className="text-base font-bold text-slate-700">FCFA</span>
                      <span className="text-xs font-semibold text-slate-500">/ mois</span>
                    </>
                  )}
                </div>
                <p className="text-[11px] font-semibold text-slate-500 mt-1.5">
                  {currentTier.isCustom 
                    ? 'Tarification mensuelle adaptée à vos campus et volumes'
                    : `Facturé sur les 8 mois de l'année académique (les 4 mois de vacances sont offerts)`}
                </p>
              </div>

              {/* Fonctionnalités incluses */}
              <div className="space-y-3 mb-8">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Services inclus :
                </p>
                <div className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={11} className="stroke-[3]" />
                  </div>
                  <span>Gestion académique et organisation selon le système LMD</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={11} className="stroke-[3]" />
                  </div>
                  <span>Inscriptions, dossiers étudiants 360° et impression de cartes QR</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={11} className="stroke-[3]" />
                  </div>
                  <span>Saisie des notes, calcul des moyennes et procès-verbaux de résultats</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={11} className="stroke-[3]" />
                  </div>
                  <span>Suivi financier des scolarités et émission de reçus officiels</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={11} className="stroke-[3]" />
                  </div>
                  <span>Assistance technique et accompagnement opérationnel</span>
                </div>
              </div>
            </div>

            {/* Bouton CTA Mensuel */}
            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={() => onSelectPlan(`mensuel-${currentTier.id}`)}
                className="w-full py-3.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all transform active:scale-98 bg-slate-900 hover:bg-slate-800 text-white shadow-md cursor-pointer"
              >
                <span>{currentTier.isCustom ? 'Obtenir un devis personnalisé' : 'Choisir la formule mensuelle'}</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* CARTE 2 : FORMULE ANNUELLE (PRIX AU-DESSOUS DU TOTAL MENSUEL) */}
          <div className="relative rounded-3xl flex flex-col justify-between transition-all duration-300 bg-white border-2 border-[#FF6B00] shadow-2xl shadow-orange-500/10 lg:-translate-y-2 p-7 sm:p-8">
            
            {/* Badge flottant Recommandé / Économie */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <span className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full text-xs font-extrabold tracking-wide uppercase shadow-md bg-gradient-to-r from-[#FF6B00] to-orange-600 text-white">
                <Sparkles size={12} />
                {currentTier.badge || '★ PAIEMENT UNIQUE AVANTAGEUX'}
              </span>
            </div>

            <div>
              {/* En-tête formule annuelle */}
              <div className="mb-6 pt-2">
                <span className="inline-block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Forfait Annuel • {currentTier.studentsRange}
                </span>
                <h3 className="text-2xl font-black text-slate-900 mb-2">
                  Formule Annuelle Sérénité
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Paiement unique au démarrage de l&apos;année : tranquillité absolue et économie directe garantie.
                </p>
              </div>

              {/* Bloc Prix Annuel */}
              <div className="mb-6 p-4 rounded-2xl bg-orange-50/60 border border-orange-200/80">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                    {currentTier.annualPrice}
                  </span>
                  <span className="text-base font-bold text-slate-700">FCFA</span>
                  <span className="text-xs font-semibold text-slate-500">/ an</span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-[#FF6B00]">
                  <CheckCircle2 size={14} className="shrink-0" />
                  <span>{currentTier.savings}</span>
                </div>
              </div>

              {/* Fonctionnalités incluses Annuel */}
              <div className="space-y-3 mb-8">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Tous les avantages inclus :
                </p>
                <div className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={11} className="stroke-[3]" />
                  </div>
                  <span><strong>Prix annuel en dessous du cumul mensuel</strong> (remise directe)</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={11} className="stroke-[3]" />
                  </div>
                  <span>Enrôlement, dossiers étudiants et cartes d&apos;étudiants QR illimités</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={11} className="stroke-[3]" />
                  </div>
                  <span>Génération illimitée des procès-verbaux de résultats et bulletins</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={11} className="stroke-[3]" />
                  </div>
                  <span>Paramétrage prioritaire des maquettes académiques et semestres</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={11} className="stroke-[3]" />
                  </div>
                  <span>Formation complète des équipes et support technique prioritaire</span>
                </div>
              </div>
            </div>

            {/* Bouton CTA Annuel */}
            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={() => onSelectPlan(`annuel-${currentTier.id}`)}
                className="w-full py-3.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all transform active:scale-98 bg-gradient-to-r from-[#FF6B00] to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/30 cursor-pointer"
              >
                <span>{currentTier.isCustom ? 'Demander un devis personnalisé' : `Choisir la formule annuelle`}</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

        </div>

        {/* TABLEAU RÉCAPITULATIF OFFICIEL PAR EFFECTIF */}
        <div className="max-w-5xl mx-auto mb-16 bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-5 sm:p-6 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-bold">Grille Officielle des Tarifs par Effectif Étudiant</h3>
              <p className="text-xs text-slate-400">Tarification institutionnelle en Francs CFA (FCFA) pour l&apos;enseignement supérieur</p>
            </div>
            <span className="text-xs font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-3 py-1 rounded-full w-fit">
              Prix Annuel Réduit
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-bold">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Catégorie</th>
                  <th className="py-3.5 px-4">Effectif étudiant</th>
                  <th className="py-3.5 px-4 font-extrabold text-slate-900">Prix Annuel</th>
                  <th className="py-3.5 px-4">Paiement Mensuel (sur 8 mois)</th>
                  <th className="py-3.5 px-4 text-right sm:pr-6">Avantage Formule</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {tiers.map((t, i) => (
                  <tr 
                    key={t.id} 
                    onClick={() => setSelectedTierIndex(i)}
                    className={`cursor-pointer transition-colors ${selectedTierIndex === i ? 'bg-orange-50/60 font-semibold' : 'hover:bg-slate-50'}`}
                  >
                    <td className="py-3 px-4 sm:px-6 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${selectedTierIndex === i ? 'bg-[#FF6B00]' : 'bg-slate-300'}`} />
                      <span className="font-bold text-slate-900">{t.name}</span>
                    </td>
                    <td className="py-3 px-4 font-medium">{t.studentsRange}</td>
                    <td className="py-3 px-4 font-black text-slate-900">
                      {t.annualPrice} {t.annualTotal ? 'FCFA' : ''}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-600">
                      {t.monthlyPrice} {!t.isCustom ? 'FCFA / mois' : ''}
                    </td>
                    <td className="py-3 px-4 text-right sm:pr-6">
                      <span className="inline-block text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                        {t.isCustom 
                          ? 'Sur mesure' 
                          : t.annualTotal && t.monthlyTotal && t.annualTotal < t.monthlyTotal 
                            ? `Économie de ${(t.monthlyTotal - t.annualTotal).toLocaleString('fr-FR')} FCFA` 
                            : '8 mensualités sans surcoût'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <span>* Les universités de plus de 2 500 étudiants bénéficient d&apos;une tarification personnalisée avec serveur dédié et accompagnement sur site.</span>
            <button
              onClick={() => setSelectedTierIndex(5)}
              className="text-[#FF6B00] font-bold hover:underline flex items-center gap-1"
            >
              Demander un devis grande capacité <ChevronRight size={13} />
            </button>
          </div>
        </div>

        {/* Moyens de paiement acceptés (Mobile Money Locaux) */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm max-w-4xl mx-auto">
          <div className="text-center mb-6">
            <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center justify-center gap-2">
              <CreditCard size={18} className="text-[#FF6B00]" />
              <span>Modalités de règlement & encaissements de scolarités</span>
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Règlements sécurisés au Mali et dans toute la zone UEMOA par virement, chèque ou Mobile Money.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 text-center">

            {/* Orange Money */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col items-center justify-center gap-1.5 hover:bg-orange-50/50 hover:border-orange-300 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-[#FF6B00] text-white flex items-center justify-center font-black text-xs shadow-2xs">
                OM
              </div>
              <span className="text-xs font-bold text-slate-800">Orange Money</span>
              <span className="text-[10px] text-slate-500">Mali & UEMOA</span>
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
              <span className="text-xs font-bold text-slate-800">Moov Africa</span>
              <span className="text-[10px] text-slate-500">Malitel (Mali)</span>
            </div>

            {/* Cartes Bancaires Visa & Mastercard */}
            <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col items-center justify-center gap-1.5 hover:bg-emerald-50/50 hover:border-emerald-300 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-xs shadow-2xs">
                CB
              </div>
              <span className="text-xs font-bold text-slate-800">Virement / Chèque</span>
              <span className="text-[10px] text-slate-500">Banque locale</span>
            </div>

          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-2 text-xs font-semibold text-slate-500 text-center">
            <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
            <span>Facturation conforme • Reçus officiels et attestations infalsifiables</span>
          </div>
        </div>

      </div>
    </section>
  );
}
