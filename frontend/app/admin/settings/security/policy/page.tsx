'use client';

import { ArrowLeft, ShieldCheck, Lock, Eye, Database, Users, AlertTriangle, FileText } from 'lucide-react';
import Link from 'next/link';

const POLICIES = [
  {
    icon: Lock,
    category: 'Authentification & Mots de passe',
    rules: [
      'Minimum 8 caractères, 1 majuscule, 1 chiffre et 1 caractère spécial.',
      'Changement obligatoire tous les 90 jours.',
      'Blocage automatique du compte après 5 tentatives de connexion échouées.',
      'Interdiction de réutiliser les 5 derniers mots de passe.'
    ]
  },
  {
    icon: Eye,
    category: 'Confidentialité & Protection des données',
    rules: [
      'Les données personnelles (notes, paiements, infos médicales) sont strictement confidentielles.',
      'Accès limité au personnel autorisé selon le principe du moindre privilège.',
      'Interdiction de partager des identifiants ou d\'exporter des bases de données sans autorisation écrite.',
      'Conformité obligatoire avec la législation nationale sur la protection des données.'
    ]
  },
  {
    icon: Database,
    category: 'Sauvegarde & Intégrité des systèmes',
    rules: [
      'Sauvegarde automatique quotidienne à 02h00 (heure locale).',
      'Conservation des journaux d\'audit pendant 24 mois.',
      'Tests de restauration trimestriels obligatoires pour vérifier l\'intégrité des backups.',
      'Chiffrement des données sensibles au repos et en transit (TLS 1.3 / AES-256).'
    ]
  },
  {
    icon: Users,
    category: 'Gestion des accès & Rôles',
    rules: [
      'Chaque utilisateur dispose d\'un compte nominatif unique et non partageable.',
      'Les comptes inactifs pendant +6 mois sont automatiquement désactivés.',
      'Révocation immédiate des accès en cas de départ, suspension ou changement de poste.',
      'Les droits d\'administration système sont strictement réservés au DSI et au Recteur.'
    ]
  },
  {
    icon: AlertTriangle,
    category: 'Réponse aux incidents & Signalement',
    rules: [
      'Tout incident de sécurité (fuite, malware, accès non autorisé) doit être signalé sous 24h.',
      'Une cellule de crise technique est activée automatiquement en cas de compromission avérée.',
      'Audit externe annuel obligatoire sur la sécurité informatique et les processus.',
      'Formation annuelle obligatoire pour tout le personnel sur les risques cyber et le phishing.'
    ]
  }
];

export default function SecurityPolicyPage() {
  return (
    <div className="space-y-6 pb-8">
      {/* Navigation & Header */}
      <div>
        <Link href="/admin/settings/security" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#FF6B00] transition-colors mb-4">
          <ArrowLeft size={16} /> 
        </Link>
        <h1 className="text-3xl font-bold text-slate-900">Politique de Sécurité</h1>
        <p className="text-slate-500 mt-1 max-w-2xl">
          Cadre réglementaire et directives techniques pour la protection des systèmes, des données et de la vie privée au sein de l'université.
        </p>
      </div>

      {/* Statut de la politique */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
        <ShieldCheck className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
        <div>
          <p className="font-semibold text-green-800">Politique en vigueur et validée</p>
          <p className="text-sm text-green-700 mt-1">
            Dernière révision : 15 Juin 2026 • Prochaine revue : 15 Décembre 2026 • Approuvée par la Direction Générale
          </p>
        </div>
      </div>

      {/* Liste des politiques */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100">
          {POLICIES.map((policy, index) => (
            <div key={index} className="p-6 hover:bg-slate-50/50 transition-colors">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-[#FF6B00]/10 rounded-xl flex items-center justify-center mt-0.5">
                  <policy.icon className="text-[#FF6B00]" size={22} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900 mb-3">{policy.category}</h3>
                  <ul className="space-y-2.5">
                    {policy.rules.map((rule, ruleIndex) => (
                      <li key={ruleIndex} className="flex items-start gap-3 text-sm text-slate-600 leading-relaxed">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#FF6B00] flex-shrink-0"></span>
                        {rule}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Documentaire */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-4 border-t border-slate-200 gap-2">
        <p className="text-sm text-slate-500 flex items-center gap-2">
          <FileText size={14} /> Document interne • Diffusion restreinte au personnel habilité
        </p>
        <p className="text-xs font-mono text-slate-400 bg-slate-100 px-3 py-1 rounded-md">
          REF: SEC-POL-2026-01 v2.4
        </p>
      </div>
    </div>
  );
}