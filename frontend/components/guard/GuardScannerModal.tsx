'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera, CheckCircle, XCircle, Clock,
  AlertTriangle, X, Volume2, VolumeX,
  ScanLine, MapPin, Wifi, WifiOff, RefreshCw
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import offlineAttendanceService from '@/services/offlineAttendanceService';

interface GuardScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete?: () => void;
}

interface ScanResult {
  student_id: number;
  student_name: string;
  matricule: string;
  class_name: string;
  level: string;
  status: 'present' | 'late' | 'absent';
  scan_time: string;
  is_offline?: boolean;
}

export default function GuardScannerModal({ isOpen, onClose, onScanComplete }: GuardScannerModalProps) {
  const toast = useToast();
  
  // ✅ Refs critiques
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastScanTimeRef = useRef(0);
  const isMountedRef = useRef(true);
  const scannerIdRef = useRef('qr-reader-' + Math.random().toString(36).substr(2, 9));
  
  // ✅ States
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [manualMatricule, setManualMatricule] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [stats, setStats] = useState({ total: 0, present: 0, late: 0 });
  const [isOnline, setIsOnline] = useState(true);
  const [pendingOfflineCount, setPendingOfflineCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // 📶 Écoute de l'état réseau et préchargement du cache étudiants pour le mode hors-ligne
  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);
    setPendingOfflineCount(offlineAttendanceService.getPendingCount());

    const updateNetwork = () => setIsOnline(navigator.onLine);
    const updateCount = (e: any) => {
      setPendingOfflineCount(e.detail?.count ?? offlineAttendanceService.getPendingCount());
    };

    window.addEventListener('online', updateNetwork);
    window.addEventListener('offline', updateNetwork);
    window.addEventListener('unisphere:offline_scans_updated', updateCount);

    // Pré-mise en cache silencieuse des étudiants si en ligne
    if (navigator.onLine && isOpen) {
      api.get('/api/v1/students/?limit=300').then((res) => {
        const list = res.data?.students || res.data || [];
        if (Array.isArray(list) && list.length > 0) {
          offlineAttendanceService.cacheStudents(list);
        }
      }).catch(() => {});
    }

    return () => {
      window.removeEventListener('online', updateNetwork);
      window.removeEventListener('offline', updateNetwork);
      window.removeEventListener('unisphere:offline_scans_updated', updateCount);
    };
  }, [isOpen]);

  const handleManualSync = async () => {
    if (!navigator.onLine) {
      toast.error('Connexion impossible : vous êtes hors ligne.');
      return;
    }
    setIsSyncing(true);
    const toastId = toast.loading('Synchronisation des scans hors-ligne...');
    try {
      const res = await offlineAttendanceService.syncPendingScans();
      if (res.success) {
        toast.success(res.message || 'Scans synchronisés !', { id: toastId });
        onScanComplete?.();
      } else {
        toast.error(res.message || 'Échec de la synchronisation', { id: toastId });
      }
    } catch (e: any) {
      toast.error(`Erreur : ${e.message}`, { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  // ✅ Cleanup au démontage
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      forceStopScanner();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try { audioContextRef.current.close(); } catch (e) {}
      }
    };
  }, []);

  // ✅ Arrêter quand modal se ferme
  useEffect(() => {
    if (!isOpen && isScanning) {
      forceStopScanner();
    }
  }, [isOpen, isScanning]);

  // ✅ AudioContext global
  const playBeep = useCallback((success: boolean) => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = success ? 800 : 300;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
      osc.onended = () => {
        try { osc.disconnect(); gain.disconnect(); } catch (e) {}
      };
    } catch (e) {}
  }, [soundEnabled]);

  // ✅✅✅ ARRÊT SÉCURISÉ - NE JAMAIS APPELER clear()
  const forceStopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    
    if (scanner) {
      try {
        await scanner.stop();
      } catch (err: any) {
        // Ignorer toutes les erreurs
      }
      
      // ❌ NE JAMAIS APPELER clear() - c'est la cause du bug !
      // scanner.clear(); // JAMAIS !
      
      scannerRef.current = null;
    }
    
    // ✅ Supprimer le conteneur du body
    if (containerRef.current && containerRef.current.parentElement) {
      try {
        containerRef.current.parentElement.removeChild(containerRef.current);
      } catch (e) {}
    }
    containerRef.current = null;
    
    if (isMountedRef.current) {
      setIsScanning(false);
    }
  }, []);

  // ✅✅✅ DÉMARRAGE : Créer le conteneur EN DEHORS de React
  const startScanner = useCallback(async () => {
    setError(null);
    
    // Attendre que le DOM soit prêt
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // ✅ Créer un conteneur en dehors de React
    const container = document.createElement('div');
    container.id = scannerIdRef.current;
    container.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 300px;
      height: 300px;
      z-index: 9999;
      background: black;
      border-radius: 12px;
      display: none;
    `;
    document.body.appendChild(container);
    containerRef.current = container;
    
    try {
      const scanner = new Html5Qrcode(scannerIdRef.current, { verbose: false });
      scannerRef.current = scanner;
      
      // Afficher le conteneur
      container.style.display = 'block';
      
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          const now = Date.now();
          if (now - lastScanTimeRef.current < 2000) return;
          lastScanTimeRef.current = now;
          handleScan(decodedText);
        },
        () => {} // Ignorer erreurs
      );
      
      if (isMountedRef.current) setIsScanning(true);
    } catch (err: any) {
      console.error('Erreur caméra:', err);
      
      // Nettoyer en cas d'erreur
      if (container.parentElement) {
        try {
          container.parentElement.removeChild(container);
        } catch (e) {}
      }
      containerRef.current = null;
      scannerRef.current = null;
      
      if (isMountedRef.current) setIsScanning(false);
      
      if (err?.toString().includes('NotAllowedError')) {
        setError('❌ Accès caméra refusé. Activez les permissions dans les paramètres du navigateur.');
      } else if (err?.toString().includes('NotFoundError')) {
        setError('❌ Aucune caméra physique détectée.');
      } else if (err?.toString().includes('not supported') || (typeof window !== 'undefined' && !window.isSecureContext)) {
        setError('⚠️ Flux vidéo direct désactivé par le navigateur sur connexion réseau locale HTTP (non sécurisée). Cliquez sur le bouton bleu "Prendre photo (Mobile)" ci-dessous pour capturer le QR code, ou entrez le matricule.');
      } else {
        setError('Impossible d\'accéder au flux vidéo de la caméra.');
      }
    }
  }, []);

  // ✅ Traitement du scan (avec support Hors-Ligne automatique)
  const handleScan = useCallback(async (qrData: string) => {
    if (loading) return;
    setLoading(true);
    playBeep(true);
    
    const matricule = qrData.trim();
    const isOffline = typeof window !== 'undefined' && !navigator.onLine;

    // 1. Si appareil hors-ligne : sauvegarde directe locale
    if (isOffline) {
      const offScan = offlineAttendanceService.saveOfflineScan(matricule, 'qr_code');
      const result: ScanResult = {
        student_id: 0,
        student_name: offScan.student_name || `Étudiant (${matricule})`,
        matricule: matricule,
        class_name: offScan.class_name || 'Enregistré hors ligne',
        level: offScan.level || 'LMD',
        status: 'present',
        scan_time: offScan.scan_time,
        is_offline: true
      };

      if (isMountedRef.current) {
        setLastScan(result);
        setScanHistory(prev => [result, ...prev.slice(0, 9)]);
        setStats(prev => ({
          total: prev.total + 1,
          present: prev.present + 1,
          late: prev.late
        }));
      }

      toast.success(`📶 ${result.student_name} - Enregistré Hors Ligne`);
      if ('vibrate' in navigator) {
        try { navigator.vibrate([100, 50, 100]); } catch (e) {}
      }
      setLoading(false);
      return;
    }

    // 2. Si en ligne : tentative d'envoi API standard avec fallback hors-ligne en cas de coupure
    try {
      const response = await api.post('/api/v1/attendance/scan', {
        matricule: matricule,
        scan_type: 'qr_code'
      });
      
      const result: ScanResult = {
        student_id: response.data.student_id,
        student_name: response.data.student_name,
        matricule: response.data.matricule,
        class_name: response.data.class_name,
        level: response.data.level,
        status: response.data.status,
        scan_time: response.data.scan_time,
        is_offline: false
      };
      
      if (isMountedRef.current) {
        setLastScan(result);
        setScanHistory(prev => [result, ...prev.slice(0, 9)]);
        setStats(prev => ({
          total: prev.total + 1,
          present: prev.present + (result.status === 'present' ? 1 : 0),
          late: prev.late + (result.status === 'late' ? 1 : 0)
        }));
      }
      
      if (result.status === 'present') {
        toast.success(`✅ ${result.student_name} - Présent`);
      } else if (result.status === 'late') {
        toast.error(`⏰ ${result.student_name} - En retard`);
      }
      
      onScanComplete?.();
      
      if ('vibrate' in navigator) {
        try { navigator.vibrate(result.status === 'present' ? 100 : [100, 50, 100]); } catch (e) {}
      }
    } catch (error: any) {
      const isNetworkErr = !error.response || error.code === 'ERR_NETWORK' || [502, 503, 504].includes(error.response?.status);
      if (isNetworkErr) {
        // Fallback hors-ligne immédiat
        const offScan = offlineAttendanceService.saveOfflineScan(matricule, 'qr_code');
        const result: ScanResult = {
          student_id: 0,
          student_name: offScan.student_name || `Étudiant (${matricule})`,
          matricule: matricule,
          class_name: offScan.class_name || 'Enregistré hors ligne',
          level: offScan.level || 'LMD',
          status: 'present',
          scan_time: offScan.scan_time,
          is_offline: true
        };

        if (isMountedRef.current) {
          setLastScan(result);
          setScanHistory(prev => [result, ...prev.slice(0, 9)]);
          setStats(prev => ({
            total: prev.total + 1,
            present: prev.present + 1,
            late: prev.late
          }));
        }

        toast.success(`📶 Connexion perdue : scan conservé hors-ligne pour ${result.student_name}`);
        if ('vibrate' in navigator) {
          try { navigator.vibrate([100, 50, 100]); } catch (e) {}
        }
      } else {
        playBeep(false);
        toast.error(`❌ ${error.response?.data?.detail || 'QR invalide'}`);
        if ('vibrate' in navigator) {
          try { navigator.vibrate([200, 100, 200]); } catch (e) {}
        }
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [loading, playBeep, toast, onScanComplete]);

  // ✅ Saisie manuelle
  const handleManualScan = async () => {
    if (!manualMatricule.trim()) {
      toast.error('Veuillez saisir un matricule');
      return;
    }
    await handleScan(manualMatricule);
    setManualMatricule('');
  };

  // ✅ Fermeture
  const handleClose = async () => {
    await forceStopScanner();
    setLastScan(null);
    setScanHistory([]);
    setStats({ total: 0, present: 0, late: 0 });
    setError(null);
    setManualMatricule('');
    setShowManualInput(false);
    onClose();
  };

  const getStatusConfig = (status: string, is_offline?: boolean) => {
    if (is_offline) {
      return { label: 'Enregistré (Hors Ligne)', color: 'text-amber-700', bg: 'bg-amber-100 border-amber-300' };
    }
    switch (status) {
      case 'present': return { label: 'Présent', color: 'text-green-600', bg: 'bg-green-100 border-green-200' };
      case 'late': return { label: 'En retard', color: 'text-orange-600', bg: 'bg-orange-100 border-orange-200' };
      default: return { label: 'Absent', color: 'text-red-600', bg: 'bg-red-100 border-red-200' };
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#FF6B00] to-orange-500 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <ScanLine size={24} />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Scanner QR Code</h2>
                {isOnline ? (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold">
                    <Wifi size={11} />
                    <span>En Ligne</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-300 text-slate-950 text-[10px] font-black animate-pulse">
                    <WifiOff size={11} />
                    <span>Hors Ligne</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-white/80">Enregistrez les présences même sans connexion Internet</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg cursor-pointer"
            >
              {soundEnabled ? <Volume2 size={16} className="text-white" /> : <VolumeX size={16} className="text-white" />}
            </button>
            <button onClick={handleClose} className="p-2 bg-white/20 hover:bg-white/30 rounded-lg cursor-pointer">
              <X size={16} className="text-white" />
            </button>
          </div>
        </div>

        {/* Barre d'alerte / synchronisation hors-ligne */}
        {pendingOfflineCount > 0 && (
          <div className="bg-amber-500/15 border-b border-amber-300/40 px-4 py-2.5 flex items-center justify-between text-xs text-amber-950">
            <div className="flex items-center gap-2 font-medium">
              <WifiOff size={15} className="text-amber-600 shrink-0" />
              <span>
                <strong>{pendingOfflineCount} scan(s)</strong> conservé(s) en mémoire locale.
              </span>
            </div>
            <button
              onClick={handleManualSync}
              disabled={isSyncing || !isOnline}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#FF6B00] hover:bg-[#e55f00] text-white font-bold text-xs transition-colors shadow-2xs disabled:opacity-50 cursor-pointer shrink-0"
            >
              <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
              <span>{isSyncing ? 'Synchronisation...' : 'Synchroniser'}</span>
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 border-b border-slate-200">
          <div className="text-center">
            <p className="text-xs text-slate-500">Total</p>
            <p className="text-lg font-bold text-slate-900">{stats.total}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500">Présents</p>
            <p className="text-lg font-bold text-green-600">{stats.present}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500">Retards</p>
            <p className="text-lg font-bold text-orange-600">{stats.late}</p>
          </div>
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Indicateur de statut */}
          <div className={`p-4 rounded-xl border-2 ${isScanning ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isScanning ? 'bg-green-100' : 'bg-slate-100'}`}>
                {isScanning ? (
                  <Camera size={24} className="text-green-600 animate-pulse" />
                ) : (
                  <Camera size={24} className="text-slate-400" />
                )}
              </div>
              <div>
                <p className="font-bold text-slate-900">
                  {isScanning ? 'Caméra active' : 'Caméra inactive'}
                </p>
                <p className="text-xs text-slate-500">
                  {isScanning ? 'Scannez un QR code' : 'Cliquez sur "Démarrer" pour activer'}
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            {!isScanning ? (
              <button
                onClick={startScanner}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-[#FF6B00] to-orange-500 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
              >
                <Camera size={18} />
                Démarrer la Caméra en direct
              </button>
            ) : (
              <button
                onClick={forceStopScanner}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
              >
                <XCircle size={18} />
                Arrêter le flux vidéo
              </button>
            )}

            {/* Bouton Appareil Photo Téléphone (Compatible HTTP et tous mobiles) */}
            <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold cursor-pointer shadow-sm transition">
              <Camera size={18} />
              <span>Prendre photo (Mobile)</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setLoading(true);
                  setError(null);
                  try {
                    const tempId = 'qr-photo-reader-' + Math.random().toString(36).substring(2, 7);
                    const tempDiv = document.createElement('div');
                    tempDiv.id = tempId;
                    tempDiv.style.display = 'none';
                    document.body.appendChild(tempDiv);
                    
                    const qr = new Html5Qrcode(tempId);
                    const decoded = await qr.scanFile(file, true);
                    
                    try { document.body.removeChild(tempDiv); } catch (e) {}
                    
                    if (decoded) {
                      handleScan(decoded);
                    }
                  } catch (err: any) {
                    console.error("Erreur scan photo mobile :", err);
                    setError("Aucun QR code valide détecté sur la photo. Rapprochez bien l'objectif du badge ou saisissez le matricule.");
                    playBeep(false);
                  } finally {
                    setLoading(false);
                    if (e.target) e.target.value = '';
                  }
                }}
              />
            </label>

            <button
              onClick={() => setShowManualInput(!showManualInput)}
              title="Saisie manuelle"
              className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition"
            >
              ⌨️ Saisie
            </button>
          </div>

          {showManualInput && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <label className="block text-xs font-medium text-slate-700 mb-2">
                Saisie manuelle du matricule
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualMatricule}
                  onChange={(e) => setManualMatricule(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualScan()}
                  placeholder="Ex: EC-2026-0001"
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
                <button
                  onClick={handleManualScan}
                  disabled={loading}
                  className="px-4 py-2 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  OK
                </button>
              </div>
            </div>
          )}

          {/* Dernier scan */}
          {lastScan && (
            <div className={`p-3 rounded-xl border-2 ${getStatusConfig(lastScan.status, lastScan.is_offline).bg}`}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-[#FF6B00] to-orange-500 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0">
                  {lastScan.student_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 truncate">{lastScan.student_name}</p>
                  <p className="text-xs text-slate-600 font-mono">{lastScan.matricule}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                    <MapPin size={10} />
                    {lastScan.class_name || lastScan.level}
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${getStatusConfig(lastScan.status, lastScan.is_offline).color}`}>
                    {getStatusConfig(lastScan.status, lastScan.is_offline).label}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(lastScan.scan_time).toLocaleTimeString('fr-FR', {
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Historique */}
          {scanHistory.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center justify-between">
                <span>Historique récent</span>
                <button onClick={() => setScanHistory([])} className="text-xs text-slate-400 hover:text-slate-600">
                  Effacer
                </button>
              </h3>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {scanHistory.map((scan, idx) => (
                  <div key={idx} className="p-2 bg-slate-50 rounded-lg flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                      scan.status === 'present' ? 'bg-green-100' :
                      scan.status === 'late' ? 'bg-orange-100' : 'bg-red-100'
                    }`}>
                      {scan.status === 'present' ? <CheckCircle size={14} className="text-green-600" /> :
                       scan.status === 'late' ? <Clock size={14} className="text-orange-600" /> :
                       <XCircle size={14} className="text-red-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-900 truncate">{scan.student_name}</p>
                      <p className="text-xs text-slate-500 font-mono">{scan.matricule}</p>
                    </div>
                    <span className="text-xs text-slate-400">
                      {new Date(scan.scan_time).toLocaleTimeString('fr-FR', {
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}