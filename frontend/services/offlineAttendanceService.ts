import api from '@/lib/api';

export interface OfflineScan {
  offline_id: string;
  matricule: string;
  scan_time: string;
  method: 'qr_code' | 'manual';
  student_name?: string;
  class_name?: string;
  level?: string;
  status: 'pending' | 'synced' | 'duplicate' | 'error';
  error_message?: string;
}

export interface CachedStudent {
  matricule: string;
  full_name: string;
  filiere: string;
  level: string;
}

const STORAGE_KEY = 'unisphere_offline_scans_queue';
const CACHE_KEY = 'unisphere_offline_students_cache';

class OfflineAttendanceService {
  private syncInProgress = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        // Auto-sync dès que le réseau revient
        setTimeout(() => {
          this.syncPendingScans().catch(() => {});
        }, 1500);
      });
    }
  }

  // Vérifier si l'appareil est actuellement en ligne
  public isOnline(): boolean {
    if (typeof window === 'undefined') return true;
    return navigator.onLine;
  }

  // Récupérer la file d'attente locale
  public getPendingScans(): OfflineScan[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  // Nombre de scans en attente de synchro
  public getPendingCount(): number {
    return this.getPendingScans().length;
  }

  // Sauvegarder un scan hors-ligne dans la file locale
  public saveOfflineScan(matricule: string, method: 'qr_code' | 'manual' = 'qr_code'): OfflineScan {
    const cleanMatricule = matricule.trim();
    const offlineId = 'off_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const nowIso = new Date().toISOString();

    // Recherche d'informations étudiant dans le cache local si disponible
    const cached = this.getCachedStudent(cleanMatricule);

    const newScan: OfflineScan = {
      offline_id: offlineId,
      matricule: cleanMatricule,
      scan_time: nowIso,
      method: method,
      student_name: cached?.full_name || `Étudiant (${cleanMatricule})`,
      class_name: cached?.filiere || 'Classe enregistrée',
      level: cached?.level || 'LMD',
      status: 'pending'
    };

    if (typeof window !== 'undefined') {
      const current = this.getPendingScans();
      const updated = [newScan, ...current];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      // Événement global pour mettre à jour les compteurs dans l'interface
      window.dispatchEvent(new CustomEvent('unisphere:offline_scans_updated', {
        detail: { count: updated.length, newScan }
      }));
    }

    return newScan;
  }

  // Mettre en cache la liste des étudiants pour affichage nom/classe hors-ligne
  public cacheStudents(students: any[]) {
    if (typeof window === 'undefined' || !Array.isArray(students)) return;
    try {
      const map: Record<string, CachedStudent> = {};
      students.forEach(s => {
        if (s.matricule) {
          map[s.matricule.trim().toUpperCase()] = {
            matricule: s.matricule.trim(),
            full_name: `${s.first_name || ''} ${s.last_name || ''}`.trim() || s.name || 'Étudiant',
            filiere: s.filiere || s.class_name || '',
            level: s.level || ''
          };
        }
      });
      localStorage.setItem(CACHE_KEY, JSON.stringify(map));
    } catch {}
  }

  // Obtenir un étudiant depuis le cache local
  public getCachedStudent(matricule: string): CachedStudent | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const map = JSON.parse(raw);
      return map[matricule.trim().toUpperCase()] || null;
    } catch {
      return null;
    }
  }

  // Supprimer un scan de la file locale
  public removeScan(offlineId: string) {
    if (typeof window !== 'undefined') {
      const current = this.getPendingScans();
      const updated = current.filter(s => s.offline_id !== offlineId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('unisphere:offline_scans_updated', {
        detail: { count: updated.length }
      }));
    }
  }

  // Vider complètement la file d'attente
  public clearAllPending() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new CustomEvent('unisphere:offline_scans_updated', {
        detail: { count: 0 }
      }));
    }
  }

  // Synchroniser tous les scans en attente avec le backend
  public async syncPendingScans(): Promise<{
    success: boolean;
    syncedCount: number;
    duplicatesCount: number;
    errorsCount: number;
    message: string;
  }> {
    if (this.syncInProgress) {
      return { success: false, syncedCount: 0, duplicatesCount: 0, errorsCount: 0, message: 'Synchronisation déjà en cours' };
    }

    if (!this.isOnline()) {
      return { success: false, syncedCount: 0, duplicatesCount: 0, errorsCount: 0, message: 'Appareil hors-ligne' };
    }

    const pending = this.getPendingScans();
    if (pending.length === 0) {
      return { success: true, syncedCount: 0, duplicatesCount: 0, errorsCount: 0, message: 'Aucun scan en attente' };
    }

    this.syncInProgress = true;
    try {
      const payload = {
        scans: pending.map(s => ({
          matricule: s.matricule,
          scan_time: s.scan_time,
          method: s.method,
          offline_id: s.offline_id
        }))
      };

      const res = await api.post('/api/v1/attendance/sync-offline', payload);
      const data = res.data || {};

      const syncedList = data.synchronized || [];
      const duplicatesList = data.duplicates || [];

      // Identifiants à retirer (ceux qui ont été enregistrés ou étaient des doublons déjà existants)
      const idsToRemove = new Set([
        ...syncedList.map((x: any) => x.offline_id),
        ...duplicatesList.map((x: any) => x.offline_id)
      ]);

      // Mettre à jour la file locale
      const remaining = pending.filter(s => !idsToRemove.has(s.offline_id));
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
        window.dispatchEvent(new CustomEvent('unisphere:offline_scans_updated', {
          detail: { count: remaining.length }
        }));
        window.dispatchEvent(new CustomEvent('unisphere:data_changed', {
          detail: { type: 'attendance_sync', syncedCount: syncedList.length }
        }));
      }

      return {
        success: true,
        syncedCount: data.synchronized_count || syncedList.length,
        duplicatesCount: data.duplicates_count || duplicatesList.length,
        errorsCount: data.errors_count || (data.errors ? data.errors.length : 0),
        message: `${data.synchronized_count || 0} scans synchronisés avec succès`
      };
    } catch (error: any) {
      return {
        success: false,
        syncedCount: 0,
        duplicatesCount: 0,
        errorsCount: pending.length,
        message: error.response?.data?.detail || error.message || 'Erreur réseau lors de la synchronisation'
      };
    } finally {
      this.syncInProgress = false;
    }
  }
}

export const offlineAttendanceService = new OfflineAttendanceService();
export default offlineAttendanceService;

