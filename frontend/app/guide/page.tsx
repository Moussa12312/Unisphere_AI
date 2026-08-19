'use client';

import { useState, useEffect } from 'react';
import { 
  BookOpen, Search, Shield, Users, GraduationCap, 
  School, Calculator, Edit3, QrCode, Award, Crown, 
  CheckCircle2, HelpCircle, ChevronRight, FileText, 
  Sparkles, Bell, ArrowRight, Laptop, UserCheck, AlertTriangle
} from 'lucide-react';
import Link from 'next/link';

interface GuideSection {
  title: string;
  description: string;
  steps: string[];
  tip?: string;
}

interface RoleGuide {
  role: string;
  label: string;
  badge: string;
  icon: any;
  color: string;
  bgLight: string;
  summary: string;
  sections: GuideSection[];
  faqs: { question: string; answer: string }[];
}

const ROLE_GUIDES: RoleGuide[] = [
  {
    role: 'admin',
    label: 'Administrateur',
    badge: 'Gestion Établissement',
    icon: Building2Icon,
    color: 'text-[#FF6B00]',
    bgLight: 'bg-orange-50 border-orange-200',
    summary: 'L\'Administrateur pilote l\'ensemble de l\'établissement : configuration générale, personnalisation des thèmes & couleurs, organisation pédagogique, finances et délibérations.',
    sections: [
      {
        title: '1. Personnalisation du Thème & des Couleurs d\'Université',
        description: 'Définissez l\'identité visuelle officielle de votre établissement appliquée à tous les utilisateurs.',
        steps: [
          'Rendez-vous dans "Paramètres" → "Profil Université".',
          'Choisissez parmi les 8 thèmes prédéfinis (Orange, Bleu, Vert, Violet...).',
          'Définissez une "Couleur Principale (Brand Color)" sur-mesure via la palette ou le sélecteur HEX.',
          'Sélectionnez la langue par défaut (Français, English, العربية, Bamanankan) et cliquez sur "Sauvegarder les modifications".'
        ],
        tip: 'La couleur principale choisie s\'appliquera immédiatement sur tous les boutons, badges et accents pour tous les utilisateurs.'
      },
      {
        title: '2. Gestion de la Scolarité & du Personnel',
        description: 'Supervisez la liste des étudiants, enseignants, comptes du personnel et filières.',
        steps: [
          'Dans la section "Scolarité", gérez la liste complète des Étudiants et Enseignants.',
          'Dans "Organisation" → "Filières & Niveaux", créez et organisez la structure des domaines et spécialités.',
          'Créez des comptes pour les Secrétaires, Censeurs, Comptables et Gardiens depuis "Personnel".'
        ]
      },
      {
        title: '3. Sessions de Délibération & Jury',
        description: 'Configurez les règles d\'admission et générez les procès-verbaux de jury.',
        steps: [
          'Accédez au menu "Délibérations".',
          'Définissez les règles de validation (moyenne de passage, compensation, rattrapages).',
          'Générez et validez les procès-verbaux d\'examens officiels.'
        ]
      }
    ],
    faqs: [
      {
        question: 'Comment changer le logo et l\'arrière-plan de l\'université ?',
        answer: 'Allez dans "Paramètres", cliquez sur "Choisir une image" sous la section Logo et cochez l\'option "Retirer l\'arrière-plan" si vous souhaitez rendre le fond transparent automatiquement.'
      },
      {
        question: 'Comment réinitialiser le mot de passe d\'un étudiant ou enseignant ?',
        answer: 'Ouvrez la fiche de l\'étudiant ou de l\'enseignant et cliquez sur le bouton vert "Réinitialiser mot de passe". Un mot de passe temporaire sera généré instantanément.'
      }
    ]
  },

  {
    role: 'secretary',
    label: 'Secrétaire',
    badge: 'Gestion Pédagogique',
    icon: Users,
    color: 'text-blue-600',
    bgLight: 'bg-blue-50 border-blue-200',
    summary: 'La Secrétaire gère la vie scolaire au quotidien : inscriptions des étudiants, gestion des dossiers, emplois du temps, génération des bulletins et attestations.',
    sections: [
      {
        title: '1. Inscription et Gestion des Étudiants',
        description: 'Enregistrez les nouveaux étudiants et gérez leurs dossiers scolaires.',
        steps: [
          'Allez dans "Étudiants" → "Inscriptions" pour enregistrer un nouvel étudiant.',
          'Complétez les informations d\'identité, filière, niveau et téléchargez la photo d\'identité.',
          'Le système génère automatiquement le matricule officiel et la carte étudiante avec QR Code.'
        ]
      },
      {
        title: '2. Emploi du temps & Cours',
        description: 'Organisez le calendrier hebdomadaire et distribuez les cours.',
        steps: [
          'Allez dans "Pédagogie" → "Emploi du temps" pour planifier les séances par classe et salle.',
          'Dans "Upload Cours PDF", déposez les supports de cours pour qu\'ils soient accessibles aux étudiants.'
        ]
      },
      {
        title: '3. Génération de Documents Officiels',
        description: 'Délivrez des bulletins, relevés de notes et attestations de scolarité.',
        steps: [
          'Accédez au menu "Documents" → "Générer documents".',
          'Sélectionnez la classe ou l\'étudiant concerné, le type de document et téléchargez le PDF au format officiel A4.'
        ]
      }
    ],
    faqs: [
      {
        question: 'Que faire si la photo de l\'étudiant ne s\'affiche pas ?',
        answer: 'Vérifiez que l\'image est au format PNG ou JPG (max 5 Mo). Vous pouvez à tout moment éditer la fiche de l\'étudiant et retélécharger sa photo d\'identité.'
      }
    ]
  },

  {
    role: 'censeur',
    label: 'Censeur',
    badge: 'Contrôle des Notes',
    icon: Edit3,
    color: 'text-purple-600',
    bgLight: 'bg-purple-50 border-purple-200',
    summary: 'Le Censeur garantit l\'intégrité des évaluations : saisie et validation des notes, détection des anomalies (notes hors barème, doublons) et suivi de la performance académique.',
    sections: [
      {
        title: '1. Saisie et Validation des Notes',
        description: 'Validez les notes soumises par les enseignants avant publication officielle.',
        steps: [
          'Consultez la rubrique "Notes à valider" pour revoir les évaluations saisies.',
          'Vérifiez la conformité des coefficients et des moyennes de classe.',
          'Cliquez sur "Valider la session" pour rendre les notes accessibles aux étudiants et aux bulletins.'
        ]
      },
      {
        title: '2. Détection des Anomalies de Notes',
        description: 'Détectez automatiquement les incohérences ou saisies erronées.',
        steps: [
          'Accédez à "Notes" → "Anomalies".',
          'Le système signale les notes supérieures au barème, les écarts anormaux ou les absences non justifiées.',
          'Corrigez les notes directement depuis le tableau d\'anomalies.'
        ]
      }
    ],
    faqs: [
      {
        question: 'Une note validée peut-elle être modifiée ?',
        answer: 'Oui, le Censeur peut débloquer une session de note dans l\'Historique pour effectuer une correction motivée.'
      }
    ]
  },

  {
    role: 'accountant',
    label: 'Comptable',
    badge: 'Gestion Financière',
    icon: Calculator,
    color: 'text-emerald-600',
    bgLight: 'bg-emerald-50 border-emerald-200',
    summary: 'Le Comptable gère l\'ensemble de la trésorerie : encaissement des frais de scolarité, reçus avec QR code, suivi des impayés, dépenses et journal comptable.',
    sections: [
      {
        title: '1. Enregistrement d\'un Paiement & Émission du Reçu',
        description: 'Encaissez les frais d\'inscriptions et délivrez des reçus imprimables.',
        steps: [
          'Allez dans "Paiements" → "Enregistrer paiement".',
          'Recherchez l\'étudiant par son nom ou matricule.',
          'Indiquez le montant, le mode de paiement (Espèces, Chèque, Mobile Money) et validez.',
          'Imprimez immédiatement le reçu officiel au format A4 pleine largeur.'
        ]
      },
      {
        title: '2. Suivi des Échéances et Impayés',
        description: 'Relancez les étudiants en retard de paiement.',
        steps: [
          'Consultez "Paiements" → "Impayés" pour afficher la liste des relances prioritaires.',
          'Filtrez par classe, niveau ou montant restant dû.'
        ]
      }
    ],
    faqs: [
      {
        question: 'Comment imprimer un reçu au format propre sans barre de navigation ?',
        answer: 'Le bouton "Imprimer" ajuste automatiquement la page en masquant les éléments de menu pour imprimer un reçu officiel épuré.'
      }
    ]
  },

  {
    role: 'teacher',
    label: 'Enseignant',
    badge: 'Espace Pédagogique',
    icon: GraduationCap,
    color: 'text-indigo-600',
    bgLight: 'bg-indigo-50 border-indigo-200',
    summary: 'L\'Enseignant gère ses cours, l\'appel des étudiants, la saisie des devoirs/examens et dispose d\'un Assistant IA pour préparer ses supports.',
    sections: [
      {
        title: '1. Prise de Présence (Faire l\'Appel)',
        description: 'Enregistrez les absences et retards lors de chaque séance.',
        steps: [
          'Allez dans "Évaluations" → "Faire l\'appel".',
          'Sélectionnez le cours et la date.',
          'Marquez les étudiants "Présent", "En retard" ou "Absent" en un seul clic.'
        ]
      },
      {
        title: '2. Saisie des Notes d\'Évaluation',
        description: 'Saisissez les notes de contrôle continu (CC) et d\'examens.',
        steps: [
          'Allez dans "Évaluations" → "Saisie des notes".',
          'Renseignez les notes sur /20. Les moyennes de classe sont calculées en temps réel.',
          'Enregistrez en brouillon ou soumettez pour validation.'
        ]
      },
      {
        title: '3. Assistant IA Pédagogique',
        description: 'Utilisez l\'IA intégrée pour générer des exercices ou résumés de cours.',
        steps: [
          'Consultez "Outils" → "Assistant IA".',
          'Saisissez votre sujet pour obtenir des quiz, plans de cours et sujets d\'examens.'
        ]
      }
    ],
    faqs: [
      {
        question: 'Puis-je déposer mes cours au format PDF pour les étudiants ?',
        answer: 'Oui, dans "Enseignement" → "Mes supports déposés", déposez vos fichiers PDF afin que vos étudiants puissent les télécharger.'
      }
    ]
  },

  {
    role: 'student',
    label: 'Étudiant',
    badge: 'Portail Étudiant',
    icon: BookOpen,
    color: 'text-cyan-600',
    bgLight: 'bg-cyan-50 border-cyan-200',
    summary: 'L\'Étudiant peut consulter ses notes, son emploi du temps, télécharger ses cours PDF, afficher sa carte étudiante virtuelle et suivre ses paiements.',
    sections: [
      {
        title: '1. Consultation des Notes & Emploi du Temps',
        description: 'Suivez vos résultats et votre planning hebdomadaire.',
        steps: [
          'Sur le Tableau de bord, visualisez votre moyenne générale et votre assiduité.',
          'Consultez "Pédagogie" → "Mes notes" pour le détail par matière.',
          'Accédez à "Mon emploi du temps" pour vérifier vos salles et horaires de cours.'
        ]
      },
      {
        title: '2. Carte Étudiante avec QR Code',
        description: 'Présentez votre carte à l\'entrée pour le contrôle d\'accès.',
        steps: [
          'Allez dans "Mes Documents" → "Carte étudiante".',
          'Votre carte numérique officielle s\'affiche avec un QR Code unique pour le scanner du gardien.'
        ]
      },
      {
        title: '3. Téléchargement des Cours PDF & Reçus',
        description: 'Accédez à toutes vos ressources pédagogiques et financières.',
        steps: [
          'Consultez "Mes cours (PDF)" pour télécharger les cours mis en ligne par vos professeurs.',
          'Consultez "Mes reçus" pour télécharger ou imprimer vos justificatifs de paiements.'
        ]
      }
    ],
    faqs: [
      {
        question: 'Comment personnaliser le thème de mon espace ?',
        answer: 'Rendez-vous dans "Paramètres" (icône engrenage) pour choisir parmi plusieurs thèmes clairs ou sombres.'
      }
    ]
  },

  {
    role: 'guard',
    label: 'Gardien',
    badge: 'Contrôle d\'Accès',
    icon: QrCode,
    color: 'text-amber-600',
    bgLight: 'bg-amber-50 border-amber-200',
    summary: 'Le Gardien assure le contrôle d\'accès à l\'entrée de l\'établissement en scannant la carte de chaque étudiant depuis son smartphone ou tablette.',
    sections: [
      {
        title: '1. Scanner les Cartes Étudiantes avec QR Code',
        description: 'Enregistrez la présence des étudiants à la porte d\'entrée.',
        steps: [
          'Ouvrez "Scanner QR Code" sur votre téléphone.',
          'Autorisez l\'accès à la caméra.',
          'Orientez la caméra vers le QR Code de la carte de l\'étudiant.',
          'Un signal vert confirme la validation du passage et enregistre l\'heure exacte.'
        ]
      },
      {
        title: '2. Saisie Manuelle du Matricule & Signalement d\'Incident',
        description: 'Si la carte est indisponible ou en cas de problème de sécurité.',
        steps: [
          'Utilisez le bouton "Saisie manuelle" ⌨️ si l\'étudiant n\'a pas sa carte.',
          'En cas d\'anomalie, allez dans "Incidents" pour envoyer une alerte à l\'administration.'
        ]
      }
    ],
    faqs: [
      {
        question: 'Le scanner fonctionne-t-il sur smartphone ?',
        answer: 'Oui, l\'interface du Gardien est 100% optimisée pour une utilisation fluide à une main sur n\'importe quel smartphone.'
      }
    ]
  },

  {
    role: 'alumni',
    label: 'Alumni (Anciens Étudiants)',
    badge: 'Réseau & Mentorat',
    icon: Award,
    color: 'text-rose-600',
    bgLight: 'bg-rose-50 border-rose-200',
    summary: 'L\'Alumni reste connecté à la communauté : partage d\'expérience, mentorat des étudiants actuels et proposition d\'offres de stages.',
    sections: [
      {
        title: '1. Espace Mentorat & Échanges',
        description: 'Accompagnez les étudiants dans leur orientation et recherche de stage.',
        steps: [
          'Dans "Mentorat" → "Mes étudiants", acceptez ou refusez les demandes d\'accompagnement.',
          'Échangez par messagerie sécurisée avec vos filleuls.'
        ]
      }
    ],
    faqs: [
      {
        question: 'Comment rejoindre le réseau Alumni ?',
        answer: 'Inscrivez-vous via le lien d\'invitation transmis par l\'administration de votre université.'
      }
    ]
  },

  {
    role: 'superadmin',
    label: 'Super Administrateur SaaS',
    badge: 'Gestion Multi-Universités',
    icon: Crown,
    color: 'text-yellow-600',
    bgLight: 'bg-yellow-50 border-yellow-200',
    summary: 'Le Super Admin gère les universités clientes de la plateforme UniSphere AI : création d\'établissements, gestion des licences, abonnements et facturation SaaS.',
    sections: [
      {
        title: '1. Création et Gestion des Universités Clientes',
        description: 'Ajoutez et paramétrez de nouveaux établissements (Universités, Lycées Privés, Instituts).',
        steps: [
          'Allez sur "Universités" → "Créer une université".',
          'Renseignez les coordonnées de l\'établissement, choisissez le type (Université, Lycée Privé...) et créez le compte Administrateur principal.',
          'Vous pouvez à tout moment bloquer ou suspendre l\'accès d\'un établissement en cas d\'impayé.'
        ]
      },
      {
        title: '2. Plans d\'Abonnement & Facturation Client',
        description: 'Supervisez les abonnements mensuels/annuels.',
        steps: [
          'Dans "Plans & Licences", configurez les offres d\'abonnements.',
          'Consultez la liste des factures et règlements sous "Factures clients".'
        ]
      }
    ],
    faqs: [
      {
        question: 'Quelle est la différence entre un Lycée Privé et une Université ?',
        answer: 'Lors de la création, le type d\'établissement adapte automatiquement la terminologie (ex: Proviseur/Censeur au lieu de Recteur/Doyen).'
      }
    ]
  }
];

function Building2Icon(props: any) {
  return <School {...props} />;
}

export default function UserGuidePage() {
  const [selectedRole, setSelectedRole] = useState<string>('admin');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const u = JSON.parse(userStr);
        if (u?.role && ROLE_GUIDES.some(g => g.role === u.role)) {
          setSelectedRole(u.role);
        }
      }
    } catch {}
  }, []);

  const currentGuide = ROLE_GUIDES.find(g => g.role === selectedRole) || ROLE_GUIDES[0];
  const IconComponent = currentGuide.icon;

  const filteredSections = currentGuide.sections.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.steps.some(st => st.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Banner Top */}
      <div className="bg-gradient-to-br from-[#0a1628] via-[#1e293b] to-[#0f172a] rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-[#FF6B00]/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-sm border border-white/15 rounded-full text-xs font-semibold text-orange-400 mb-3">
              <Sparkles size={14} /> Guide Officiel UniSphere AI
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Manuel d'Utilisation du SaaS</h1>
            <p className="text-slate-300 mt-1 text-sm max-w-2xl">
              Découvrez en détail le fonctionnement et les fonctionnalités de la plateforme adaptées à chaque rôle.
            </p>
          </div>

          {/* Recherche rapide dans le guide */}
          <div className="relative min-w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher une fonctionnalité..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>
        </div>
      </div>

      {/* Sélecteur de Rôle (Barre d'onglets réactive) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-sm overflow-x-auto scrollbar-hide">
        <div className="flex gap-1 min-w-max">
          {ROLE_GUIDES.map((g) => {
            const Icon = g.icon;
            const isActive = selectedRole === g.role;
            return (
              <button
                key={g.role}
                onClick={() => setSelectedRole(g.role)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#FF6B00] text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon size={16} />
                <span>{g.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Carte Résumé du Rôle */}
      <div className={`p-6 rounded-2xl border-2 transition-all ${currentGuide.bgLight}`}>
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 bg-white rounded-xl shadow-md border border-slate-100 flex items-center justify-center flex-shrink-0 ${currentGuide.color}`}>
            <IconComponent size={28} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-slate-900">Guide de l'espace {currentGuide.label}</h2>
              <span className="text-xs font-semibold px-2.5 py-1 bg-white border border-slate-200 rounded-full text-slate-700">
                {currentGuide.badge}
              </span>
            </div>
            <p className="text-slate-700 text-sm mt-2 leading-relaxed">
              {currentGuide.summary}
            </p>
          </div>
        </div>
      </div>

      {/* Sections du Guide */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <BookOpen size={20} className="text-[#FF6B00]" />
          Procédures & Fonctionnalités clés
        </h3>

        {filteredSections.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
            <HelpCircle size={40} className="mx-auto mb-2 text-slate-300" />
            <p>Aucune instruction trouvée pour "{searchQuery}".</p>
          </div>
        ) : (
          filteredSections.map((section, idx) => (
            <div key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-3 hover:border-slate-300 transition-colors">
              <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-[#FF6B00]" />
                {section.title}
              </h4>
              <p className="text-sm text-slate-600">{section.description}</p>
              
              <div className="bg-slate-50 rounded-xl p-4 space-y-2 mt-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Étapes à suivre :</p>
                {section.steps.map((step, sIdx) => (
                  <div key={sIdx} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <span className="w-5 h-5 rounded-full bg-orange-100 text-[#FF6B00] font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                      {sIdx + 1}
                    </span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>

              {section.tip && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                  <Sparkles size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <p><strong>Astuce :</strong> {section.tip}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Foire Aux Questions (FAQ) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <HelpCircle size={20} className="text-[#FF6B00]" />
          Questions Fréquentes (FAQ) - {currentGuide.label}
        </h3>

        <div className="divide-y divide-slate-100">
          {currentGuide.faqs.map((faq, idx) => (
            <div key={idx} className="py-3 first:pt-0 last:pb-0">
              <p className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                <span className="text-[#FF6B00]">Q.</span> {faq.question}
              </p>
              <p className="text-sm text-slate-600 mt-1 pl-5 leading-relaxed">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
