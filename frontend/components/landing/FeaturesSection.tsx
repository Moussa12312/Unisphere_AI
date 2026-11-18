'use client';

import React from 'react';
import { 
  GraduationCap, Smartphone, QrCode, Award, 
  ArrowRight, CheckCircle2, Sparkles, BookOpen, Clock, ShieldCheck
} from 'lucide-react';

interface FeaturesSectionProps {
  onOpenRegister: (plan?: string) => void;
}

export default function FeaturesSection({ onOpenRegister }: FeaturesSectionProps) {
  const features = [
    {
      icon: GraduationCap,
      badge: "Organisation LMD",
      badgeColor: "bg-orange-100 text-orange-800 border-orange-200",
      iconColor: "text-[#FF6B00]",
      iconBg: "bg-orange-50 border-orange-200",
      title: "Gestion Académique & Cursus LMD",
      description: "Structuration des filières, semestres (S1 à S10), unités d'enseignement (UE) et cours en tronc commun avec calcul précis des crédits ECTS.",
      gain: "Accompagnement de l'organisation et du suivi des parcours universitaires"
    },
    {
      icon: QrCode,
      badge: "Dossiers 360°",
      badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
      iconColor: "text-blue-600",
      iconBg: "bg-blue-50 border-blue-200",
      title: "Inscriptions & Cartes Sécurisées",
      description: "Enrôlement complet des étudiants, gestion des dossiers scolaires et génération instantanée de cartes à QR Code crypté pour le contrôle d'accès.",
      gain: "Sécurisation des accès au campus et aux épreuves d'examens"
    },
    {
      icon: Award,
      badge: "Notes & PV",
      badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
      iconColor: "text-purple-600",
      iconBg: "bg-purple-50 border-purple-200",
      title: "Notes, Moyennes & Procès-Verbaux",
      description: "Saisie des évaluations par les enseignants, calcul automatique des moyennes pondérées par coefficients et production des procès-verbaux de résultats.",
      gain: "Édition fiable et rapide des relevés de notes et bulletins officiels"
    },
    {
      icon: Smartphone,
      badge: "Recouvrement",
      badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-50 border-emerald-200",
      title: "Gestion Financière & Scolarité",
      description: "Échéanciers par tranches ou mensualités, suivi rigoureux des impayés, tenue de caisse et édition de reçus officiels numérotés infalsifiables.",
      gain: "Maîtrise de la trésorerie et élimination des impayés non identifiés"
    }
  ];

  return (
    <section id="features" className="py-20 bg-white border-b border-slate-200/80 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* En-tête centré */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-700 mb-4">
            <Sparkles size={14} className="text-[#FF6B00]" />
            <span>Pilotage Institutionnel & Pédagogique</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
            Une plateforme intégrée, pensée pour les exigences de l&apos;enseignement supérieur
          </h2>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            UniSphere AI unifie la scolarité, la gestion académique, le suivi financier et la gouvernance institutionnelle au sein d&apos;un environnement unique.
          </p>
        </div>

        {/* Grille équilibrée de 4 cartes (2x2 sur tablette, 1x4 sur grand écran) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {features.map((feat, index) => {
            const Icon = feat.icon;
            return (
              <div
                key={index}
                className="group relative bg-slate-50/70 hover:bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 hover:border-orange-300 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Haut de carte : Icône vectorielle graphique + Badge */}
                  <div className="flex items-center justify-between mb-5">
                    <div className={`w-13 h-13 rounded-xl ${feat.iconBg} border flex items-center justify-center ${feat.iconColor} shadow-2xs group-hover:scale-110 transition-transform`}>
                      <Icon size={26} className="stroke-[2.2]" />
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${feat.badgeColor}`}>
                      {feat.badge}
                    </span>
                  </div>

                  {/* Titre court et explicite */}
                  <h3 className="text-lg font-extrabold text-slate-900 mb-2.5 group-hover:text-[#FF6B00] transition-colors">
                    {feat.title}
                  </h3>

                  {/* Description concrète de 2 lignes */}
                  <p className="text-sm text-slate-600 leading-relaxed mb-4">
                    {feat.description}
                  </p>
                </div>

                {/* Gain concret pour l'utilisateur */}
                <div className="pt-4 border-t border-slate-200/80 flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-xs font-semibold text-slate-700 leading-snug">
                    {feat.gain}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bannière de transition vers l'essai */}
        <div className="mt-14 p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-1 text-center md:text-left">
            <h4 className="text-lg sm:text-xl font-bold flex items-center justify-center md:justify-start gap-2">
              <ShieldCheck className="text-[#FF6B00]" size={22} />
              <span>Votre établissement est unique, sa gestion doit être irréprochable.</span>
            </h4>
            <p className="text-sm text-slate-300 max-w-xl">
              Découvrez dès aujourd&apos;hui comment UniSphere s&apos;adapte en moins de 48 heures aux maquettes de votre université.
            </p>
          </div>
          <button
            onClick={() => onOpenRegister('recommande')}
            className="shrink-0 inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-[#FF6B00] to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-md shadow-orange-500/30 transition-all active:scale-95"
          >
            <span>Démarrer sans engagement</span>
            <ArrowRight size={16} />
          </button>
        </div>

      </div>
    </section>
  );
}

