'use client';

import React, { useState, useEffect } from 'react';
import {
  Database, Shield, Cloud, Download, RefreshCw, CheckCircle2,
  Clock, HardDrive, FileArchive, Play, Lock, AlertTriangle, Copy, Check
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface BackupArchive {
  filename: string;
  size_mb: number;
  size_kb: number;
  date: string;
  tables_count: number;
  total_records: number | string;
  sha256: string;
  cloud_synced: boolean;
  cloud_provider: string;
  source: string;
}

interface BackupResponse {
  status: string;
  schedule: string;
  retention_policy: string;
  cloud_sync: string;
  backup_directory: string;
  backups: BackupArchive[];
}

export default function SuperAdminDatabasePage() {
  const [data, setData] = useState<BackupResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTriggering, setIsTriggering] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/v1/superadmin/database/backups');
      setData(res.data);
    } catch (err: any) {
      toast.error('Impossible de charger les données de sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerBackup = async () => {
    try {
      setIsTriggering(true);
      const res = await api.post('/api/v1/superadmin/database/trigger-backup');
      toast.success(res.data?.message || 'Sauvegarde terminée avec succès');
      await loadBackups();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message;
      toast.error(`Échec sauvegarde : ${msg}`);
    } finally {
      setIsTriggering(false);
    }
  };

  const handleDownload = (filename: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const url = `/api/v1/superadmin/database/download-backup/${filename}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    window.open(url, '_blank');
    toast.success(`Téléchargement de ${filename} initié`);
  };

  const copySha256 = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    toast.success('Empreinte SHA-256 copiée !');
    setTimeout(() => setCopiedHash(null), 2500);
  };

  const backups = data?.backups || [];
  const totalDiskMb = backups.reduce((acc, b) => acc + (b.size_mb || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* En-tête Institutionnel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#FF6B00] to-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/25">
              <Database size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Centre de Sauvegarde Cloud &amp; Base de Données
                </h1>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-black px-2 py-0.5 rounded-full uppercase">
                  Nocturne Automatique
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                Archivage automatique quotidien à 02:00 UTC • Compression GZIP (Niv. 9) • Rotation 7 jours • Hash SHA-256
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={loadBackups}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Rafraîchir"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-[#FF6B00]' : ''} />
          </button>

          <button
            onClick={handleTriggerBackup}
            disabled={isTriggering}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-[#FF6B00] to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-md shadow-orange-500/25 transition-all cursor-pointer disabled:opacity-50"
          >
            {isTriggering ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Sauvegarde de la Base en cours...</span>
              </>
            ) : (
              <>
                <Play size={14} />
                <span>Déclencher une Sauvegarde Maintenant</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Cartes KPI et Statut du Service */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Statut Robot Nocturne */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Robot Nocturne</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
              <Clock size={17} />
            </div>
          </div>
          <div className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            02:00 UTC (Chaque Nuit)
          </div>
          <div className="text-xs text-slate-500 mt-1 font-medium">
            Tâche autonome en arrière-plan intégrée au serveur
          </div>
        </div>

        {/* Politique de Rétention */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Rétention &amp; Rotation</span>
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
              <HardDrive size={17} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            7 Jours Glissants
          </div>
          <div className="text-xs text-slate-500 mt-1 font-medium">
            Nettoyage automatique des archives &gt; 7 jours
          </div>
        </div>

        {/* Archives Stockées */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Archives Disponibles</span>
            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center">
              <FileArchive size={17} />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
            {backups.length} archive{backups.length > 1 ? 's' : ''}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-medium">
            Espace disque total : {totalDiskMb.toFixed(2)} MB
          </div>
        </div>

        {/* Sécurité & Intégrité */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Intégrité &amp; Notifs</span>
            <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center">
              <Shield size={17} />
            </div>
          </div>
          <div className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5 pt-1">
            <Lock size={15} className="text-emerald-500" />
            SHA-256 + Email SuperAdmin
          </div>
          <div className="text-xs text-slate-500 mt-1 font-medium">
            Rapport immédiat expédié par email
          </div>
        </div>

      </div>

      {/* Liste des Archives de Sauvegarde */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Historique des Archives Déposées (.json.gz)
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Chaque archive contient l'intégralité des 59 tables de la base de données PostgreSQL
            </p>
          </div>
          <div className="text-xs text-slate-400 font-mono">
            {data?.backup_directory || '/opt/unisphere_ai/backups'}
          </div>
        </div>

        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400 gap-3">
            <RefreshCw size={32} className="animate-spin text-[#FF6B00]" />
            <p className="text-sm font-semibold">Inspection des archives de sauvegarde en cours...</p>
          </div>
        ) : backups.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            <FileArchive size={44} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Aucune archive sur le disque</h3>
            <p className="text-xs text-slate-400 mt-1">
              Cliquez sur « Déclencher une Sauvegarde Maintenant » pour créer votre première archive instantanée.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="px-5 py-4">Nom de l'Archive</th>
                  <th className="px-5 py-4">Date de Création</th>
                  <th className="px-5 py-4">Périmètre</th>
                  <th className="px-5 py-4 text-right">Taille</th>
                  <th className="px-5 py-4">Empreinte SHA-256</th>
                  <th className="px-5 py-4 text-center">Origine</th>
                  <th className="px-5 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {backups.map((b) => (
                  <tr key={b.filename} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    
                    {/* Nom du fichier */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <FileArchive size={17} className="text-[#FF6B00] shrink-0" />
                        <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                          {b.filename}
                        </span>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-5 py-4 text-slate-700 dark:text-slate-300 font-medium">
                      {b.date}
                    </td>

                    {/* Périmètre */}
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                        {b.tables_count} Tables ({b.total_records} enreg.)
                      </span>
                    </td>

                    {/* Taille */}
                    <td className="px-5 py-4 text-right">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {b.size_mb > 0 ? `${b.size_mb} MB` : `${b.size_kb} KB`}
                      </span>
                    </td>

                    {/* Hash SHA-256 */}
                    <td className="px-5 py-4">
                      {b.sha256 ? (
                        <div className="flex items-center gap-1.5">
                          <code className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">
                            {b.sha256.slice(0, 14)}...{b.sha256.slice(-6)}
                          </code>
                          <button
                            onClick={() => copySha256(b.sha256)}
                            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                            title="Copier le SHA-256"
                          >
                            {copiedHash === b.sha256 ? (
                              <Check size={13} className="text-emerald-500" />
                            ) : (
                              <Copy size={13} />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">--</span>
                      )}
                    </td>

                    {/* Source */}
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        b.source === 'nightly_cron'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}>
                        {b.source === 'nightly_cron' ? '🌙 Nocturne Auto' : '⚡ Déclencheur Manuel'}
                      </span>
                    </td>

                    {/* Téléchargement */}
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => handleDownload(b.filename)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-[#FF6B00] dark:bg-slate-800 dark:hover:bg-[#FF6B00] shadow-2xs transition-colors cursor-pointer"
                        title="Télécharger l'archive de sauvegarde gzip sur votre ordinateur"
                      >
                        <Download size={13} />
                        <span>Télécharger</span>
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
}
