'use client';

import { useState, useEffect } from 'react';
import {
  Shield, QrCode, CheckCircle, XCircle, Clock,
  AlertTriangle, Users, TrendingUp, Activity,
  Calendar, MapPin, Loader2, ScanLine
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import GuardScannerModal from '@/components/guard/GuardScannerModal';

export default function GuardDashboardPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [statsRes, scansRes] = await Promise.all([
        api.get('/api/v1/attendance/today/stats').catch(() => ({ data: null })),
        api.get('/api/v1/attendance/recent?limit=5').catch(() => ({ data: [] }))
      ]);
      setStats(statsRes.data);
      setRecentScans(Array.isArray(scansRes.data) ? scansRes.data : []);
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-[#FF6B00]" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec horloge */}
      <div className="bg-gradient-to-br from-[#0a1628] to-[#1e293b] rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Shield size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Bonjour, Gardien 👋</h1>
              <p className="text-slate-300 mt-1">Bienvenue dans votre espace de contrôle d'accès</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold font-mono">{formatTime(currentTime)}</p>
            <p className="text-sm text-slate-300 capitalize">{formatDate(currentTime)}</p>
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* ✅ BOUTON SCANNER - Ouvre la modal */}
        <button
          onClick={() => setShowScanner(true)}
          className="group bg-gradient-to-br from-[#FF6B00] to-orange-500 rounded-2xl p-6 text-white hover:shadow-xl transition-all hover:scale-[1.02] text-left"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <QrCode size={28} />
            </div>
            <ScanLine size={20} className="opacity-50" />
          </div>
          <h3 className="text-xl font-bold mb-1">Scanner QR Code</h3>
          <p className="text-sm text-white/80">Enregistrer une présence</p>
        </button>

        <Link
          href="/guard/attendance"
          className="group bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-xl transition-all hover:scale-[1.02]"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle size={28} className="text-green-600" />
            </div>
            <Users size={20} className="text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-1">Présences du jour</h3>
          <p className="text-sm text-slate-500">Voir les présences actuelles</p>
        </Link>

        <Link
          href="/guard/incidents"
          className="group bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-xl transition-all hover:scale-[1.02]"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertTriangle size={28} className="text-red-600" />
            </div>
            <Activity size={20} className="text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-1">Signaler incident</h3>
          <p className="text-sm text-slate-500">Rapporter un problème</p>
        </Link>
      </div>

      {/* Statistiques du jour */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle size={20} className="text-green-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-1">Présents aujourd'hui</p>
          <p className="text-3xl font-bold text-green-600">{stats?.present || 0}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle size={20} className="text-red-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-1">Absents</p>
          <p className="text-3xl font-bold text-red-600">{stats?.absent || 0}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock size={20} className="text-orange-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-1">Retards</p>
          <p className="text-3xl font-bold text-orange-600">{stats?.late || 0}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp size={20} className="text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-1">Taux de présence</p>
          <p className="text-3xl font-bold text-blue-600">
            {stats?.attendance_rate ? `${stats.attendance_rate.toFixed(0)}%` : '--'}
          </p>
        </div>
      </div>

      {/* Derniers scans */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Activity size={20} className="text-[#FF6B00]" />
            Derniers scans
          </h2>
          <Link
            href="/guard/attendance"
            className="text-sm text-[#FF6B00] hover:underline font-medium"
          >
            Voir tout →
          </Link>
        </div>

        {recentScans.length === 0 ? (
          <div className="p-12 text-center">
            <QrCode size={48} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Aucun scan aujourd'hui</p>
            <button
              onClick={() => setShowScanner(true)}
              className="inline-block mt-3 text-sm text-[#FF6B00] hover:underline"
            >
              Commencer à scanner →
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentScans.map((scan: any, idx: number) => (
              <div key={scan.id || idx} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    scan.status === 'present' ? 'bg-green-100' :
                    scan.status === 'late' ? 'bg-orange-100' :
                    'bg-red-100'
                  }`}>
                    {scan.status === 'present' ? (
                      <CheckCircle size={24} className="text-green-600" />
                    ) : scan.status === 'late' ? (
                      <Clock size={24} className="text-orange-600" />
                    ) : (
                      <XCircle size={24} className="text-red-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">
                      {scan.student_name || scan.full_name || 'Étudiant'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {scan.matricule} • {scan.class_name || scan.level || ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900">
                      {scan.scan_time ? new Date(scan.scan_time).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : '--:--'}
                    </p>
                    <p className={`text-xs font-medium mt-0.5 ${
                      scan.status === 'present' ? 'text-green-600' :
                      scan.status === 'late' ? 'text-orange-600' :
                      'text-red-600'
                    }`}>
                      {scan.status === 'present' ? 'Présent' :
                       scan.status === 'late' ? 'En retard' :
                       'Absent'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info sécurité */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Shield size={24} className="text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 mb-1">Rappel de sécurité</h3>
            <p className="text-sm text-slate-600">
              Vérifiez toujours l'identité de la personne avant de valider un scan.
              En cas de doute, signalez un incident immédiatement.
            </p>
          </div>
        </div>
      </div>

      {/* ✅ MODAL SCANNER */}
      <GuardScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScanComplete={() => {
          loadDashboard(); // Recharger les stats après un scan
        }}
      />
    </div>
  );
}