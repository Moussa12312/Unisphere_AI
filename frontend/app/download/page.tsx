'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Download, Smartphone, ShieldCheck, Zap, QrCode, 
  CheckCircle2, ArrowRight, Laptop, Award, Clock
} from 'lucide-react';

export default function DownloadPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 text-white flex flex-col justify-between">
      {/* En-tête */}
      <header className="px-6 py-5 max-w-6xl mx-auto w-full flex items-center justify-between border-b border-white/10">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FF6B00] to-orange-400 flex items-center justify-center font-black text-white text-xl shadow-lg shadow-orange-500/20">
            U
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight">UniSphere <span className="text-[#FF6B00]">AI</span></span>
            <span className="block text-[10px] text-slate-400 font-semibold tracking-wider uppercase">Application Mobile Hybride</span>
          </div>
        </Link>
        <Link 
          href="/login" 
          className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
        >
          Ouvrir la version Web
        </Link>
      </header>

      {/* Contenu Principal */}
      <main className="px-4 py-12 max-w-4xl mx-auto w-full text-center space-y-10">
        {/* Badge Version */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-[#FF6B00] text-xs font-bold tracking-wide">
          <Zap size={14} className="text-orange-400" />
          <span>VERSION OFFICIELLE 2.0.0 STABLE • ANDROID & PWA</span>
        </div>

        {/* Titre & Sous-titre */}
        <div className="space-y-4">
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            UniSphere AI sur votre <span className="bg-gradient-to-r from-[#FF6B00] via-orange-400 to-amber-300 bg-clip-text text-transparent">Smartphone</span>
          </h1>
          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto font-medium">
            Accédez à vos notes certifiées, votre emploi du temps en direct, votre carte d'étudiant avec QR code sécurisé et vos reçus officiels directement dans votre poche.
          </p>
        </div>

        {/* Carte de Téléchargement Principale */}
        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 max-w-2xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b border-white/10 text-left">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF6B00] to-orange-600 flex items-center justify-center text-white shadow-xl shadow-orange-500/30">
                <Smartphone size={32} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">unisphereai.apk (v2.0.0)</h2>
                <p className="text-xs text-slate-400">Taille : 725 Ko • Binaire Android Officiel Signé</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] text-emerald-300 font-semibold">Certifié Sécurisé & Sans Publicité</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <a
                href="/download/unisphereai.apk"
                download="unisphereai.apk"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-[#FF6B00] to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white font-bold rounded-2xl shadow-lg shadow-orange-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <Download size={18} />
                <span>Télécharger l'APK</span>
              </a>
              <a
                href="/api/v1/download/unisphereai.apk"
                download="unisphereai.apk"
                className="w-full sm:w-auto inline-flex items-center justify-center px-3.5 py-3.5 bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white text-xs font-semibold rounded-2xl border border-white/10 transition-all text-center"
              >
                Lien Direct (Django)
              </a>
            </div>
          </div>

          {/* Fonctionnalités Clés */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
            <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
              <QrCode size={20} className="text-[#FF6B00] mb-2" />
              <p className="text-xs font-bold text-white">Carte QR Sécurisée</p>
              <p className="text-[10px] text-slate-400">Accès campus immédiat</p>
            </div>
            <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
              <Award size={20} className="text-emerald-400 mb-2" />
              <p className="text-xs font-bold text-white">Notes en Direct</p>
              <p className="text-[10px] text-slate-400">Moyenne LMD calculée</p>
            </div>
            <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
              <Clock size={20} className="text-cyan-400 mb-2" />
              <p className="text-xs font-bold text-white">Planning Dynamique</p>
              <p className="text-[10px] text-slate-400">Salles et cours du jour</p>
            </div>
            <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
              <ShieldCheck size={20} className="text-purple-400 mb-2" />
              <p className="text-xs font-bold text-white">Appel & Présences</p>
              <p className="text-[10px] text-slate-400">Scan caméra intégré</p>
            </div>
          </div>

          {/* Option Recommandée : Installation Immédiate PWA Android */}
          <div className="text-left bg-gradient-to-br from-emerald-950/60 to-slate-900 p-5 rounded-2xl border-2 border-emerald-500/30 space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black text-xs">✓</span>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">Option 1 Recommandée • Installation Immédiate sans bug d'APK :</p>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Pour éviter les erreurs d'analyse de package sur Android (liées aux versions récentes d'Android 11+), installez l'application en <strong>1 clic via Google Chrome</strong> :
            </p>
            <ol className="text-xs text-slate-300 space-y-1.5 list-decimal list-inside pl-1">
              <li>Ouvrez cette page dans le navigateur <strong>Google Chrome</strong> de votre smartphone Android.</li>
              <li>Appuyez sur les <strong>3 petits points verticaux (⋮)</strong> en haut à droite du navigateur.</li>
              <li>Appuyez sur <strong>« Installer l'application »</strong> (ou « Ajouter à l'écran d'accueil »).</li>
              <li>L'icône officielle s'ajoute à votre écran d'accueil et s'ouvre en <strong>plein écran autonome avec caméra et notifications</strong> !</li>
            </ol>
          </div>

          {/* Guide d'installation fichier APK Android */}
          <div className="text-left bg-black/20 p-5 rounded-2xl border border-white/5 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-orange-400">Option 2 • Installation Fichier APK :</p>
            <ul className="text-xs text-slate-300 space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-orange-400 shrink-0 mt-0.5" />
                <span>1. Cliquez sur le bouton <strong>Télécharger l'APK</strong> ci-dessus.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-orange-400 shrink-0 mt-0.5" />
                <span>2. Ouvrez le gestionnaire de fichiers, autorisez l'installation d'applications inconnues si demandé.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-orange-400 shrink-0 mt-0.5" />
                <span>3. Si Android affiche « Problème d'analyse du package », utilisez l'Option 1 PWA ci-dessus qui est universelle sur tous les téléphones.</span>
              </li>
            </ul>
          </div>

          {/* Guide spécifique iPhone & iPad (iOS) */}
          <div className="text-left bg-gradient-to-r from-slate-900 to-slate-950 p-5 rounded-2xl border border-white/10 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-base">🍎</span>
              <p className="text-xs font-bold uppercase tracking-wider text-cyan-300">Utilisateurs iPhone & iPad (iOS) :</p>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Apple ne prend pas en charge les fichiers .APK. UniSphere AI s'installe directement sur votre iPhone comme une <strong>Progressive Web App (PWA) native</strong> :
            </p>
            <ul className="text-xs text-slate-300 space-y-2 pt-1">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                <span>Ouvrez UniSphere AI dans <strong>Safari</strong> sur votre iPhone.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                <span>Appuyez sur le bouton de <strong>Partage</strong> en bas de Safari (l'icône carrée avec une flèche vers le haut <span className="font-mono">⎋</span>).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                <span>Faites défiler et choisissez <strong>« Sur l'écran d'accueil »</strong> (Add to Home Screen).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">4</span>
                <span>L'icône UniSphere s'ajoute à votre écran d'accueil et s'ouvre en <strong>plein écran sans Safari</strong> comme une véritable app native !</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Accès Web direct */}
        <div className="text-slate-400 text-xs flex flex-col sm:flex-row items-center justify-center gap-2">
          <span>Vous préférez accéder directement au portail depuis votre navigateur ?</span>
          <Link href="/login" className="text-[#FF6B00] font-bold hover:underline inline-flex items-center gap-1">
            Ouvrir la page de connexion <ArrowRight size={14} />
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-6 border-t border-white/10 text-center text-xs text-slate-500">
        © 2026 UniSphere AI • Tous droits réservés • Plateforme Universitaire Intelligente
      </footer>
    </div>
  );
}
