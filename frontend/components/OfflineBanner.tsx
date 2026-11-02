'use client';

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import offlineAttendanceService from '@/services/offlineAttendanceService';
import { toast } from 'react-hot-toast';

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [justReconnected, setJustReconnected] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Enregistrement systématique du Service Worker global pour le mode hors-ligne SaaS
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          reg.update().catch(() => {});
        })
        .catch((err) => {
          console.warn('Enregistrement Service Worker ignoré:', err);
        });
    }

    setIsOnline(navigator.onLine);
    setPendingCount(offlineAttendanceService.getPendingCount());

    const handleOnline = async () => {
      setIsOnline(true);
      setJustReconnected(true);
      setIsDismissed(false);

      const count = offlineAttendanceService.getPendingCount();
      if (count > 0) {
        setIsSyncing(true);
        try {
          const res = await offlineAttendanceService.syncPendingScans();
          if (res.success && res.syncedCount > 0) {
            toast.success(`📶 ${res.syncedCount} scans hors ligne synchronisés avec succès !`);
          }
        } catch {}
        setIsSyncing(false);
      }

      setTimeout(() => {
        setJustReconnected(false);
      }, 5000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setJustReconnected(false);
      setIsDismissed(false);
    };

    const handleScansUpdated = (e: any) => {
      setPendingCount(e.detail?.count ?? offlineAttendanceService.getPendingCount());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('unisphere:offline_scans_updated', handleScansUpdated);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('unisphere:offline_scans_updated', handleScansUpdated);
    };
  }, []);

  const handleManualSync = async () => {
    if (!navigator.onLine) {
      toast.error('Impossible de synchroniser : vous êtes toujours hors ligne.');
      return;
    }
    setIsSyncing(true);
    const toastId = toast.loading('Synchronisation des données hors-ligne en cours...');
    try {
      const res = await offlineAttendanceService.syncPendingScans();
      if (res.success) {
        toast.success(res.message || 'Données synchronisées !', { id: toastId });
      } else {
        toast.error(res.message || 'Échec de la synchronisation', { id: toastId });
      }
    } catch (e: any) {
      toast.error(`Erreur : ${e.message}`, { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  if (isOnline && pendingCount === 0 && !justReconnected) {
    return null;
  }

  if (isDismissed && isOnline && !justReconnected) {
    return null;
  }

  return (
    <aside
      role="status"
      aria-live="polite"
      className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 max-w-md animate-in slide-in-from-bottom duration-300 pointer-events-auto"
    >
      {!isOnline ? (
        // BANNIÈRE HORS LIGNE
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white rounded-2xl p-3.5 shadow-2xl border border-white/20 backdrop-blur-md flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0 animate-pulse">
            <WifiOff size={18} className="text-white" />
          </div>

          <div className="flex-1 min-w-0 text-xs">
            <div className="flex items-center gap-1.5 font-black text-amber-100">
              <span>Mode Hors-Ligne SaaS Actif</span>
              <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping" />
            </div>
            <p className="text-white/90 text-[11px] leading-snug mt-0.5">
              {pendingCount > 0
                ? `${pendingCount} scan(s) en attente. Vos pages et données en cache restent consultables.`
                : 'Navigation et consultation des données en cache disponibles sans Internet.'}
            </p>
          </div>

          {pendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-black shrink-0">
              {pendingCount}
            </span>
          )}
        </div>
      ) : justReconnected ? (
        // BANNIÈRE RETOUR EN LIGNE
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl p-3.5 shadow-2xl border border-emerald-400/30 backdrop-blur-md flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <CheckCircle2 size={18} className="text-white" />
          </div>

          <div className="flex-1 min-w-0 text-xs">
            <p className="font-black text-emerald-100">Connexion Rétablie</p>
            <p className="text-white/90 text-[11px] leading-snug mt-0.5">
              {isSyncing ? 'Synchronisation automatique en cours...' : 'Vos données locales sont à jour.'}
            </p>
          </div>

          {isSyncing && <RefreshCw size={14} className="animate-spin text-white shrink-0" />}
        </div>
      ) : pendingCount > 0 ? (
        // BANNIÈRE SCANS EN ATTENTE
        <div className="bg-slate-900 text-white rounded-2xl p-3.5 shadow-2xl border border-slate-700 backdrop-blur-md flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FF6B00]/20 text-[#FF6B00] flex items-center justify-center shrink-0">
            <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
          </div>

          <div className="flex-1 min-w-0 text-xs">
            <p className="font-bold text-slate-100">{pendingCount} scan(s) en attente</p>
            <p className="text-slate-400 text-[11px]">Prêts à être synchronisés avec la base.</p>
          </div>

          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="px-3 py-1.5 rounded-lg bg-[#FF6B00] hover:bg-[#e55f00] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer shrink-0 disabled:opacity-50"
          >
            {isSyncing ? 'Envoi...' : 'Synchroniser'}
          </button>

          <button
            onClick={() => setIsDismissed(true)}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors"
            title="Masquer"
          >
            <X size={14} />
          </button>
        </div>
      ) : null}
    </aside>
  );
}
