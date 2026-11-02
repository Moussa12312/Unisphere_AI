'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { WifiOff, RefreshCw, CheckCircle2, X } from 'lucide-react';
import offlineAttendanceService from '@/services/offlineAttendanceService';
import { toast } from 'react-hot-toast';

const ROLE_OFFLINE_ROUTES: Record<string, string[]> = {
  admin: [
    '/admin/dashboard',
    '/admin/statistics',
    '/admin/students',
    '/admin/students/create',
    '/admin/students/bulk',
    '/admin/teachers',
    '/admin/teachers/create',
    '/admin/courses',
    '/admin/courses/create',
    '/admin/teaching-units',
    '/admin/grades',
    '/admin/attendance',
    '/admin/classes',
    '/admin/rooms',
    '/admin/staff',
    '/admin/accounts',
    '/admin/accounts/create',
    '/admin/filieres',
    '/admin/filieres/create',
    '/admin/payments',
    '/admin/expenses',
    '/admin/academic-fees',
    '/admin/finances',
    '/admin/financial-reports',
    '/admin/announcements',
    '/admin/messages',
    '/admin/notifications',
    '/admin/alumni',
    '/admin/documents',
    '/admin/documents/generate',
    '/admin/student-cards',
    '/admin/report-cards',
    '/admin/reports',
    '/admin/deliberations/sessions',
    '/admin/deliberations/rules',
    '/admin/deliberations/decisions',
    '/admin/deliberations/minutes',
    '/admin/settings',
    '/admin/settings/config',
    '/admin/settings/financial',
    '/admin/settings/security',
    '/admin/settings/password-requests',
    '/admin/academic-year-transition',
    '/admin/profile',
    '/accountant/receipts',
    '/secretary/documents/generate',
    '/secretary/student-cards',
    '/secretary/documents',
    '/secretary/certificate-requests',
    '/guide',
    '/ai-assistant',
  ],
  accountant: [
    '/accountant/dashboard',
    '/accountant/statistics',
    '/accountant/payments',
    '/accountant/payments/create',
    '/accountant/payments/installments',
    '/accountant/payments/unpaid',
    '/accountant/unpaid',
    '/accountant/receipts',
    '/accountant/expenses',
    '/accountant/budget',
    '/accountant/treasury',
    '/accountant/payroll',
    '/accountant/suppliers',
    '/accountant/fixed-assets',
    '/accountant/ledger',
    '/accountant/trial-balance',
    '/accountant/financial-statements',
    '/accountant/closing',
    '/accountant/reports/daily',
    '/accountant/reports/monthly',
    '/accountant/messages',
    '/accountant/notifications',
    '/accountant/profile',
    '/accountant/settings',
    '/ai-assistant',
  ],
  secretary: [
    '/secretary/dashboard',
    '/secretary/students',
    '/secretary/students/enrollment',
    '/secretary/students/bulk',
    '/secretary/students/files',
    '/secretary/students/password-requests',
    '/secretary/student-cards',
    '/secretary/schedule',
    '/secretary/classes',
    '/secretary/courses',
    '/secretary/teachers',
    '/secretary/teaching-units',
    '/secretary/exam-sessions',
    '/secretary/grades',
    '/secretary/grades/entry',
    '/secretary/grades/pending',
    '/secretary/grades/report-cards',
    '/secretary/exams/makeup',
    '/secretary/grades/anomalies',
    '/secretary/documents',
    '/secretary/documents/generate',
    '/secretary/certificate-requests',
    '/secretary/announcements',
    '/secretary/incidents',
    '/secretary/payments',
    '/secretary/messages',
    '/secretary/notifications',
    '/secretary/profile',
    '/secretary/settings',
    '/teacher/attendance',
    '/ai-assistant',
  ],
  teacher: [
    '/teacher/dashboard',
    '/teacher/courses',
    '/teacher/students',
    '/teacher/schedule',
    '/teacher/attendance',
    '/teacher/grades',
    '/teacher/grades/entry',
    '/teacher/assignments',
    '/teacher/materials',
    '/teacher/documents',
    '/teacher/ai-assistant',
    '/teacher/messages',
    '/teacher/notifications',
    '/teacher/profile',
    '/teacher/settings',
    '/ai-assistant',
  ],
  student: [
    '/student/dashboard',
    '/student/courses',
    '/student/schedule',
    '/student/grades',
    '/student/attendance',
    '/student/payments',
    '/student/receipts',
    '/student/card',
    '/student/certificates',
    '/student/requests',
    '/student/files',
    '/student/announcements',
    '/student/alumni',
    '/student/statistics',
    '/student/messages',
    '/student/notifications',
    '/student/profile',
    '/student/settings',
    '/ai-assistant',
  ],
  censeur: [
    '/censeur/dashboard',
    '/censeur/academic/performance',
    '/censeur/academic/reports',
    '/censeur/academic/statistics',
    '/censeur/attendance',
    '/censeur/bulletins',
    '/censeur/classes',
    '/censeur/rooms',
    '/censeur/schedule',
    '/censeur/teaching-units',
    '/censeur/exams/sessions',
    '/censeur/exams/calendar',
    '/censeur/exams/makeup',
    '/censeur/grades',
    '/censeur/grades/entry',
    '/censeur/grades/pending',
    '/censeur/grades/anomalies',
    '/censeur/grades/history',
    '/censeur/documents/report-cards',
    '/censeur/documents/transcripts',
    '/censeur/incidents',
    '/censeur/reports',
    '/censeur/messages',
    '/censeur/notifications',
    '/censeur/profile',
    '/censeur/settings',
    '/ai-assistant',
  ],
  guard: [
    '/guard',
    '/guard/dashboard',
    '/guard/scanner',
    '/guard/attendance',
    '/guard/attendance/today',
    '/guard/attendance/history',
    '/guard/incidents',
    '/guard/statistics',
    '/guard/messages',
    '/guard/notifications',
    '/guard/profile',
    '/guard/settings',
  ],
  alumni: [
    '/alumni/dashboard',
    '/alumni/students',
    '/alumni/requests',
    '/alumni/messages',
    '/alumni/notifications',
    '/alumni/profile',
    '/alumni/settings',
  ],
  superadmin: [
    '/superadmin/dashboard',
    '/superadmin/universities',
    '/superadmin/universities/new',
    '/superadmin/plans',
    '/superadmin/payments',
    '/superadmin/invoices',
    '/superadmin/incidents',
    '/superadmin/audit',
    '/superadmin/database',
    '/superadmin/demo',
    '/superadmin/messages',
    '/superadmin/notifications',
    '/superadmin/profile',
    '/superadmin/settings',
  ],
};

ROLE_OFFLINE_ROUTES.super_admin = ROLE_OFFLINE_ROUTES.superadmin;

export default function OfflineBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOnline, setIsOnline] = useState(true);
  const [justReconnected, setJustReconnected] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const warmedRoleRef = useRef<string | null>(null);

  // Notification propre si une sous-page dynamique non mise en cache a été interceptée
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stayed = sessionStorage.getItem('unisphere_offline_stay');
      if (stayed) {
        sessionStorage.removeItem('unisphere_offline_stay');
        toast('Mode hors-ligne : cette fiche détaillée nécessite une première ouverture avec Internet.', {
          duration: 3500,
        });
      }
    } catch {}
  }, [pathname]);

  // Préchauffage progressif de toutes les pages du rôle connecté (Router Cache + Service Worker HTML/Chunks)
  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.onLine) return;

    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (!token || !role) return;

    const routes = ROLE_OFFLINE_ROUTES[role];
    if (!routes || routes.length === 0) return;

    const sendPrefetchToSW = () => {
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'PREFETCH_ROUTES',
          routes,
        });
      }
    };

    sendPrefetchToSW();

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    if (warmedRoleRef.current !== role) {
      warmedRoleRef.current = role;
      let index = 0;

      const prefetchBatch = () => {
        if (cancelled || !navigator.onLine) return;
        const slice = routes.slice(index, index + 3);
        slice.forEach((r) => {
          try {
            router.prefetch(r);
          } catch {}
        });
        index += 3;
        if (index < routes.length) {
          timer = setTimeout(prefetchBatch, 250);
        }
      };

      timer = setTimeout(prefetchBatch, 600);
    }

    const onControllerChange = () => {
      if (navigator.onLine) sendPrefetchToSW();
    };
    navigator.serviceWorker?.addEventListener('controllerchange', onControllerChange);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      navigator.serviceWorker?.removeEventListener('controllerchange', onControllerChange);
    };
  }, [pathname, router, isOnline]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { updateViaCache: 'none' })
        .then((reg) => {
          reg.update().catch(() => {});
        })
        .catch(() => {});
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
            toast.success(`${res.syncedCount} enregistrement(s) synchronisé(s).`);
          }
        } catch {}
        setIsSyncing(false);
      }

      setTimeout(() => {
        setJustReconnected(false);
      }, 4500);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setJustReconnected(false);
      setIsDismissed(false);
    };

    const handleScansUpdated = (e: any) => {
      setPendingCount(e.detail?.count ?? offlineAttendanceService.getPendingCount());
    };

    // Empêcher les liens externes d'éjecter l'utilisateur vers un écran d'erreur navigateur hors-ligne
    const handleOfflineClick = (e: MouseEvent) => {
      if (navigator.onLine) return;
      const anchor = (e.target as HTMLElement | null)?.closest?.('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

      if (href.startsWith('http://') || href.startsWith('https://')) {
        try {
          const targetUrl = new URL(href, window.location.origin);
          if (targetUrl.origin !== window.location.origin) {
            e.preventDefault();
            e.stopPropagation();
            toast('Mode hors-ligne : ouverture des liens externes indisponible sans Internet.');
          }
        } catch {}
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('click', handleOfflineClick, true);
    window.addEventListener('unisphere:offline_scans_updated', handleScansUpdated);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('click', handleOfflineClick, true);
      window.removeEventListener('unisphere:offline_scans_updated', handleScansUpdated);
    };
  }, []);

  const handleManualSync = async () => {
    if (!navigator.onLine) {
      toast.error('Synchronisation impossible : aucune connexion Internet.');
      return;
    }
    setIsSyncing(true);
    const toastId = toast.loading('Synchronisation en cours...');
    try {
      const res = await offlineAttendanceService.syncPendingScans();
      if (res.success) {
        toast.success(res.message || 'Synchronisation terminée.', { id: toastId });
      } else {
        toast.error(res.message || 'Échec de la synchronisation.', { id: toastId });
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
      className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 max-w-sm pointer-events-auto"
    >
      {!isOnline ? (
        <div className="bg-[#0a1628]/95 text-white rounded-2xl p-3.5 shadow-2xl border border-[#FF6B00]/40 backdrop-blur-md flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FF6B00]/20 text-[#FF6B00] border border-[#FF6B00]/30 flex items-center justify-center shrink-0">
            <WifiOff size={18} />
          </div>

          <div className="flex-1 min-w-0 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-white">
              <span>Mode Hors-Ligne</span>
              <span className="w-2 h-2 rounded-full bg-[#FF6B00] animate-pulse" />
            </div>
            <p className="text-slate-300 text-[11px] leading-snug mt-0.5">
              {pendingCount > 0
                ? `${pendingCount} action(s) en attente. Navigation libre entre vos pages.`
                : 'Navigation active en consultation uniquement.'}
            </p>
          </div>
        </div>
      ) : justReconnected ? (
        <div className="bg-emerald-700 text-white rounded-2xl p-3.5 shadow-2xl border border-emerald-400/30 backdrop-blur-md flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <CheckCircle2 size={18} className="text-white" />
          </div>

          <div className="flex-1 min-w-0 text-xs">
            <p className="font-bold text-white">Connexion rétablie</p>
            <p className="text-emerald-100 text-[11px] leading-snug mt-0.5">
              {isSyncing ? 'Synchronisation en cours...' : 'Données synchronisées.'}
            </p>
          </div>

          {isSyncing && <RefreshCw size={14} className="animate-spin text-white shrink-0" />}
        </div>
      ) : pendingCount > 0 ? (
        <div className="bg-[#0a1628] text-white rounded-2xl p-3.5 shadow-2xl border border-slate-700 backdrop-blur-md flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FF6B00]/20 text-[#FF6B00] flex items-center justify-center shrink-0">
            <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
          </div>

          <div className="flex-1 min-w-0 text-xs">
            <p className="font-bold text-slate-100">{pendingCount} action(s) en attente</p>
            <p className="text-slate-400 text-[11px]">Prêtes à être synchronisées.</p>
          </div>

          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="px-3 py-1.5 rounded-lg bg-[#FF6B00] hover:bg-[#e55f00] text-white font-bold text-xs transition-colors cursor-pointer shrink-0 disabled:opacity-50"
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
