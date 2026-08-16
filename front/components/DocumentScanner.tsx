'use client';

import { useState, useRef, useEffect } from 'react';
import { Camera, X, RotateCcw, Check, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface DocumentScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: (data: any) => void;
  mode?: 'existing' | 'new'; // 'existing' = étudiant existant, 'new' = nouvelle inscription
}

export default function DocumentScanner({ isOpen, onClose, onScanComplete, mode = 'new' }: DocumentScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  const startCamera = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Caméra arrière sur mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError("Impossible d'accéder à la caméra. Vérifiez les permissions.");
      console.error(err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedImage(imageData);
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setExtractedData(null);
  };

  const processScan = async () => {
    if (!capturedImage) return;
    
    setScanning(true);
    try {
      // Convertir base64 en blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      
      const formData = new FormData();
      formData.append('file', blob, 'scan.jpg');
      
      const res = await api.post('/api/v1/documents/scan', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setExtractedData(res.data);
      toast.success('Document analysé avec succès');
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.detail || 'Erreur lors du scan');
    } finally {
      setScanning(false);
    }
  };

  const confirmAndClose = () => {
    if (extractedData) {
      onScanComplete(extractedData);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Camera size={24} className="text-[#FF6B00]" />
              Scanner un document
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {mode === 'existing' 
                ? "Scannez un document pour un étudiant existant" 
                : "Scannez les documents d'inscription"}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto p-6">
          {error ? (
            <div className="text-center py-12">
              <Camera size={48} className="text-red-400 mx-auto mb-3" />
              <p className="text-red-600 font-medium">{error}</p>
              <button 
                onClick={startCamera}
                className="mt-4 px-6 py-2 bg-[#FF6B00] text-white rounded-lg text-sm font-medium hover:bg-[#e55f00]"
              >
                Réessayer
              </button>
            </div>
          ) : !capturedImage ? (
            // Vue caméra
            <div className="space-y-4">
              <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {/* Guide de cadrage */}
                <div className="absolute inset-0 border-4 border-[#FF6B00]/30 rounded-xl pointer-events-none">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-1/2 border-2 border-dashed border-[#FF6B00]/60 rounded-lg"></div>
                </div>
              </div>
              
              <div className="flex justify-center">
                <button
                  onClick={capturePhoto}
                  className="w-16 h-16 bg-[#FF6B00] hover:bg-[#e55f00] rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105"
                >
                  <Camera size={28} className="text-white" />
                </button>
              </div>
              
              <p className="text-center text-sm text-slate-500">
                Placez le document dans le cadre et cliquez sur le bouton pour capturer
              </p>
            </div>
          ) : (
            // Vue photo capturée + résultats
            <div className="space-y-6">
              <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
                <img 
                  src={capturedImage} 
                  alt="Document scanné" 
                  className="w-full h-full object-contain"
                />
              </div>
              
              {scanning ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={32} className="animate-spin text-[#FF6B00]" />
                  <p className="ml-3 text-slate-600">Analyse du document en cours...</p>
                </div>
              ) : extractedData ? (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                      <Check size={18} />
                      Informations extraites
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-slate-500">Nom</p>
                        <p className="font-medium text-slate-900">{extractedData.extracted_info.nom || 'Non détecté'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Prénom</p>
                        <p className="font-medium text-slate-900">{extractedData.extracted_info.prenom || 'Non détecté'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Date de naissance</p>
                        <p className="font-medium text-slate-900">{extractedData.extracted_info.date_naissance || 'Non détecté'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Lieu de naissance</p>
                        <p className="font-medium text-slate-900">{extractedData.extracted_info.lieu_naissance || 'Non détecté'}</p>
                      </div>
                      {extractedData.extracted_info.numero_piece && (
                        <div className="col-span-2">
                          <p className="text-xs text-slate-500">Numéro de pièce</p>
                          <p className="font-medium text-slate-900 font-mono">{extractedData.extracted_info.numero_piece}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <h3 className="font-semibold text-slate-900 mb-2 text-sm">Texte brut extrait</h3>
                    <p className="text-xs text-slate-600 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                      {extractedData.raw_text}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-500">Cliquez sur "Analyser" pour extraire les informations</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer avec actions */}
        <div className="border-t border-slate-200 p-6 bg-slate-50">
          <div className="flex justify-end gap-3">
            {!capturedImage ? (
              <button 
                onClick={onClose}
                className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-medium"
              >
                Annuler
              </button>
            ) : (
              <>
                <button 
                  onClick={retakePhoto}
                  disabled={scanning}
                  className="flex items-center gap-2 px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  <RotateCcw size={16} />
                  Reprendre
                </button>
                {!extractedData && (
                  <button 
                    onClick={processScan}
                    disabled={scanning}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    {scanning ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    Analyser
                  </button>
                )}
                {extractedData && (
                  <button 
                    onClick={confirmAndClose}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-sm font-medium"
                  >
                    <Check size={16} />
                    Confirmer et utiliser
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}