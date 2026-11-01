'use client';

import { useEffect, useState } from 'react';
import { Bell, X, CheckCircle2 } from 'lucide-react';

export default function PushNotificationManager() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) {
      return;
    }

    // Enregistrement Service Worker
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // Enregistré avec succès
      })
      .catch((err) => {
        console.warn('Service worker registration failed:', err);
      });

    setPermission(Notification.permission);

    // Si pas encore accordé et pas refusé, inviter après un petit délai
    const dismissed = localStorage.getItem('unisphere_notif_dismissed');
    if (Notification.permission === 'default' && !dismissed) {
      const timer = setTimeout(() => setShowPrompt(true), 4000);
      return () => clearTimeout(timer);
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) return;
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      setShowPrompt(false);
      if (result === 'granted') {
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.ready;
          reg.showNotification('UniSphere AI', {
            body: 'Alertes sur écran activées avec succès !',
            icon: '/logo.png',
            badge: '/logo.png'
          });
        }
      }
    } catch (e) {
      console.error('Erreur demande permission notification:', e);
    }
  };

  const dismissPrompt = () => {
    setShowPrompt(false);
    localStorage.setItem('unisphere_notif_dismissed', 'true');
  };

  if (!showPrompt || permission !== 'default') return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md z-50 animate-in slide-in-from-bottom duration-300">
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-slate-700/80 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#FF6B00] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-md">
          <Bell size={20} />
        </div>
        <div className="flex-1 space-y-1">
          <h4 className="text-sm font-bold text-white">Activer les alertes sur votre téléphone</h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            Recevez vos notifications et messages directement sur l'écran de verrouillage même quand l'application est fermée.
          </p>
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={requestPermission}
              className="px-3.5 py-1.5 bg-[#FF6B00] hover:bg-orange-600 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-sm"
            >
              Activer les alertes
            </button>
            <button
              onClick={dismissPrompt}
              className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Plus tard
            </button>
          </div>
        </div>
        <button
          onClick={dismissPrompt}
          className="text-slate-400 hover:text-white p-1"
          aria-label="Fermer"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
