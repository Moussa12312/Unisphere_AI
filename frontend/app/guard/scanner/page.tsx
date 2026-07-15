'use client';

import { useState, useEffect, useRef } from 'react';
import {
  QrCode, Camera, CheckCircle, XCircle, Clock,
  AlertTriangle, Loader2, X, Volume2, VolumeX,
  ScanLine, User, MapPin
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ScanResult {
  student_id: number;
  student_name: string;
  matricule: string;
  class_name: string;
  level: string;
  status: 'present' | 'late' | 'absent';
  scan_time: string;
}

export default function GuardScannerPage({ isOpen, onClose }: ScannerModalProps) {
  const toast = useToast();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [manualMatricule, setManualMatricule] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [stats, setStats] = useState({ total: 0, present: 0, late: 0 });

  // ✅ Cleanup sécurisé à la fermeture
  useEffect(() => {
    return () => {
      stopScannerSafely();
    };
  }, []);

  // ✅ Arrêter le scanner quand la modale se ferme
  useEffect(() => {
    if (!isOpen && isScanning) {
      stopScannerSafely();
    }
  }, [isOpen]);

  const stopScannerSafely = async () => {
    if (scannerRef.current) {
      try {
        // ✅ Vérifier si le scanner est vraiment actif
        const state = scannerRef.current.getState();
        if (state === 2) { // SCANNING state
          await scannerRef.current.stop();
        }
      } catch (err) {
        console.log('Scanner déjà arrêté');
      } finally {
        // ✅ NE PAS faire clear() - ça cause l'erreur removeChild
        scannerRef.current = null;
        setIsScanning(false);
      }
    }
  };

  const playBeep = (success: boolean) => {
    if (!soundEnabled) return;
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = success ? 800 : 300;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {
      console.log('Audio non disponible');
    }
  };

  const startScanner = async () => {
    setError(null);
    
    // ✅ Attendre que le DOM soit prêt
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const qrReaderElement = document.getElementById('qr-reader');
    if (!qrReaderElement) {
      setError('Élément QR non trouvé dans le DOM');
      return;
    }

    try {
      // ✅ Nettoyer l'élément avant de démarrer
      qrReaderElement.innerHTML = '';
      
      const html5QrCode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5QrCode;
      
      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 200, height: 200 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          handleScan(decodedText);
        },
        () => {} // Ignorer les erreurs de scan
      );
      
      setIsScanning(true);
    } catch (err: any) {
      console.error('Erreur caméra:', err);
      setError('Impossible d\'accéder à la caméra. Vérifiez les permissions.');
      scannerRef.current = null;
    }
  };

  const stopScanner = async () => {
    await stopScannerSafely();
  };

  const handleScan = async (qrData: string) => {
    if (loading) return;
    
    setLoading(true);
    playBeep(true);
    
    try {
      const matricule = qrData.trim();
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
        scan_time: response.data.scan_time
      };
      
      setLastScan(result);
      setScanHistory(prev => [result, ...prev.slice(0, 9)]);
      
      setStats(prev => ({
        total: prev.total + 1,
        present: prev.present + (result.status === 'present' ? 1 : 0),
        late: prev.late + (result.status === 'late' ? 1 : 0)
      }));
      
      if (result.status === 'present') {
        toast.success(`✅ ${result.student_name} - Présent`);
      } else if (result.status === 'late') {
        toast.error(`⏰ ${result.student_name} - En retard`);
      }
      
      if ('vibrate' in navigator) {
        navigator.vibrate(result.status === 'present' ? 100 : [100, 50, 100]);
      }
      
    } catch (error: any) {
      playBeep(false);
      const errorMsg = error.response?.data?.detail || 'QR code invalide';
      toast.error(`❌ ${errorMsg}`);
      
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleManualScan = async () => {
    if (!manualMatricule.trim()) {
      toast.error('Veuillez saisir un matricule');
      return;
    }
    await handleScan(manualMatricule);
    setManualMatricule('');
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'present':
        return { label: 'Présent', color: 'text-green-600', bg: 'bg-green-100 border-green-200' };
      case 'late':
        return { label: 'En retard', color: 'text-orange-600', bg: 'bg-orange-100 border-orange-200' };
      default:
        return { label: 'Absent', color: 'text-red-600', bg: 'bg-red-100 border-red-200' };
    }
  };

  // ✅ Si la modale n'est pas ouverte, ne rien rendre
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#FF6B00] to-orange-500 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <ScanLine size={24} />
            <div>
              <h2 className="text-lg font-bold">Scanner QR Code</h2>
              <p className="text-xs text-white/80">Enregistrez les présences rapidement</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              title={soundEnabled ? 'Son activé' : 'Son désactivé'}
            >
              {soundEnabled ? <Volume2 size={16} className="text-white" /> : <VolumeX size={16} className="text-white" />}
            </button>
            <button
              onClick={() => { stopScannerSafely(); onClose(); }}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              <X size={16} className="text-white" />
            </button>
          </div>
        </div>

        {/* Stats rapides */}
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

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Scanner */}
          <div>
            <div
              id="qr-reader"
              ref={containerRef}
              className={`w-full aspect-square max-h-[280px] mx-auto rounded-xl overflow-hidden ${
                isScanning ? 'bg-black' : 'bg-slate-100'
              } flex items-center justify-center`}
            >
              {!isScanning && (
                <div className="text-center p-6">
                  <Camera size={48} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">Cliquez sur "Démarrer" pour activer la caméra</p>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <div className="flex gap-2 mt-3">
              {!isScanning ? (
                <button
                  onClick={startScanner}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#FF6B00] to-orange-500 hover:from-[#e55f00] hover:to-orange-600 text-white rounded-lg text-sm font-medium"
                >
                  <Camera size={16} />
                  Démarrer
                </button>
              ) : (
                <button
                  onClick={stopScanner}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium"
                >
                  <XCircle size={16} />
                  Arrêter
                </button>
              )}
              <button
                onClick={() => setShowManualInput(!showManualInput)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"
                title="Saisie manuelle"
              >
                ⌨️
              </button>
            </div>

            {/* Saisie manuelle */}
            {showManualInput && (
              <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
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
          </div>

          {/* Dernier scan */}
          {lastScan && (
            <div className={`p-3 rounded-xl border-2 ${getStatusConfig(lastScan.status).bg}`}>
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
                  <p className={`font-bold ${getStatusConfig(lastScan.status).color}`}>
                    {getStatusConfig(lastScan.status).label}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(lastScan.scan_time).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Historique récent */}
          {scanHistory.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center justify-between">
                <span>Historique récent</span>
                <button
                  onClick={() => setScanHistory([])}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Effacer
                </button>
              </h3>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {scanHistory.map((scan, idx) => (
                  <div key={idx} className="p-2 bg-slate-50 rounded-lg flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                      scan.status === 'present' ? 'bg-green-100' :
                      scan.status === 'late' ? 'bg-orange-100' :
                      'bg-red-100'
                    }`}>
                      {scan.status === 'present' ? (
                        <CheckCircle size={14} className="text-green-600" />
                      ) : scan.status === 'late' ? (
                        <Clock size={14} className="text-orange-600" />
                      ) : (
                        <XCircle size={14} className="text-red-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-900 truncate">
                        {scan.student_name}
                      </p>
                      <p className="text-xs text-slate-500 font-mono">{scan.matricule}</p>
                    </div>
                    <span className="text-xs text-slate-400">
                      {new Date(scan.scan_time).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit'
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