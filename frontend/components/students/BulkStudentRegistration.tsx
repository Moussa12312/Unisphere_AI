'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Users, UploadCloud, FileSpreadsheet, Table, Plus, Trash2,
  Copy, CheckCircle2, AlertTriangle, XCircle, ArrowLeft,
  Download, Loader2, Sparkles, RefreshCw, Check, Info, FileText
} from 'lucide-react';
import { studentService } from '@/services/studentService';
import { filiereService } from '@/services/filiereService';
import { useToast } from '@/components/ToastProvider';

interface BulkStudentRegistrationProps {
  basePath: '/admin/students' | '/secretary/students';
}

interface QuickStudentRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  filiere: string;
  level: string;
  domain: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  parent_name: string;
  parent_phone: string;
  payment_plan: string;
}

export default function BulkStudentRegistration({ basePath }: BulkStudentRegistrationProps) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'file' | 'grid'>('file');
  const [filieres, setFilieres] = useState<any[]>([]);
  const [loadingFilieres, setLoadingFilieres] = useState(true);

  // --- ÉTAT ONGLET 1 : IMPORT FICHIER ---
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState<'csv' | 'excel' | null>(null);
  const [fileImportResult, setFileImportResult] = useState<{
    success: boolean;
    total: number;
    created_count: number;
    errors_count: number;
    created: any[];
    errors: any[];
  } | null>(null);

  // --- ÉTAT ONGLET 2 : GRILLE RAPIDE ---
  const [defaultFiliere, setDefaultFiliere] = useState('');
  const [defaultLevel, setDefaultLevel] = useState('L1');
  const [submittingGrid, setSubmittingGrid] = useState(false);
  const [gridImportResult, setGridImportResult] = useState<{
    success: boolean;
    total: number;
    created_count: number;
    errors_count: number;
    created: any[];
    errors: any[];
  } | null>(null);

  const createEmptyRow = (customFiliere = '', customLevel = 'L1'): QuickStudentRow => {
    const selectedFilObj = filieres.find(f => f.name === (customFiliere || defaultFiliere));
    return {
      id: Math.random().toString(36).substring(2, 9),
      first_name: '',
      last_name: '',
      email: '',
      filiere: customFiliere || defaultFiliere || (filieres[0]?.name || ''),
      level: customLevel || defaultLevel || 'L1',
      domain: selectedFilObj?.domain || '',
      phone: '',
      date_of_birth: '',
      gender: 'M',
      parent_name: '',
      parent_phone: '',
      payment_plan: 'tranches'
    };
  };

  const [rows, setRows] = useState<QuickStudentRow[]>([]);

  useEffect(() => {
    loadFilieres();
  }, []);

  const loadFilieres = async () => {
    setLoadingFilieres(true);
    try {
      const data = await filiereService.getAll();
      const list = Array.isArray(data) ? data : [];
      setFilieres(list);
      if (list.length > 0) {
        setDefaultFiliere(list[0].name);
        // Initialiser 3 lignes vides
        setRows([
          createEmptyRow(list[0].name, 'L1'),
          createEmptyRow(list[0].name, 'L1'),
          createEmptyRow(list[0].name, 'L1')
        ]);
      }
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors du chargement des filières');
    } finally {
      setLoadingFilieres(false);
    }
  };

  // Téléchargement des modèles
  const handleDownloadTemplate = async (type: 'csv' | 'excel') => {
    setDownloadingTemplate(type);
    try {
      if (type === 'csv') {
        await studentService.downloadCsvTemplate();
        toast.success('Modèle CSV téléchargé');
      } else {
        await studentService.downloadExcelTemplate();
        toast.success('Modèle Excel (.xlsx) téléchargé');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur lors du téléchargement du modèle');
    } finally {
      setDownloadingTemplate(null);
    }
  };

  // Sélection de fichier
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFileImportResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (['csv', 'xlsx', 'xls'].includes(ext || '')) {
        setSelectedFile(file);
        setFileImportResult(null);
      } else {
        toast.error('Veuillez déposer un fichier .csv ou .xlsx');
      }
    }
  };

  // Lancement import fichier
  const handleUploadFile = async () => {
    if (!selectedFile) {
      toast.error('Veuillez sélectionner un fichier');
      return;
    }

    setUploading(true);
    setFileImportResult(null);
    try {
      const res = await studentService.importFile(selectedFile);
      setFileImportResult(res);
      if (res.created_count > 0) {
        toast.success(`🎉 ${res.created_count} étudiant(s) enregistré(s) avec succès !`);
      }
      if (res.errors_count > 0) {
        toast.error(`⚠️ ${res.errors_count} ligne(s) avec erreurs`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Erreur lors de l'importation du fichier");
    } finally {
      setUploading(false);
    }
  };

  // Gestion de la grille rapide
  const handleAddRows = (count: number) => {
    const newItems: QuickStudentRow[] = [];
    for (let i = 0; i < count; i++) {
      newItems.push(createEmptyRow(defaultFiliere, defaultLevel));
    }
    setRows(prev => [...prev, ...newItems]);
  };

  const handleRemoveRow = (id: string) => {
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const handleDuplicateRow = (row: QuickStudentRow) => {
    const copy: QuickStudentRow = {
      ...row,
      id: Math.random().toString(36).substring(2, 9),
      email: '',
      phone: ''
    };
    setRows(prev => [...prev, copy]);
    toast.info('Ligne dupliquée');
  };

  const handleUpdateRow = (id: string, field: keyof QuickStudentRow, value: string) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: value };
      if (field === 'filiere') {
        const found = filieres.find(f => f.name === value);
        if (found) updated.domain = found.domain || '';
      }
      return updated;
    }));
  };

  const handleApplyDefaultsToEmpty = () => {
    setRows(prev => prev.map(r => ({
      ...r,
      filiere: r.filiere || defaultFiliere,
      level: r.level || defaultLevel,
      domain: r.domain || (filieres.find(f => f.name === (r.filiere || defaultFiliere))?.domain || '')
    })));
    toast.success('Filière et niveau par défaut appliqués aux lignes');
  };

  // Soumission de la grille
  const handleSubmitGrid = async () => {
    const validRows = rows.filter(r => r.first_name.trim() || r.last_name.trim() || r.email.trim());
    if (validRows.length === 0) {
      toast.error('Veuillez renseigner au moins un étudiant');
      return;
    }

    // Vérification des champs requis
    for (let i = 0; i < validRows.length; i++) {
      const r = validRows[i];
      if (!r.first_name.trim() || !r.last_name.trim() || !r.email.trim()) {
        toast.error(`Ligne ${i + 1} : Prénom, Nom et Email sont obligatoires`);
        return;
      }
      if (!r.email.includes('@')) {
        toast.error(`Ligne ${i + 1} : L'email "${r.email}" est invalide`);
        return;
      }
      if (!r.filiere || !r.level) {
        toast.error(`Ligne ${i + 1} : Filière et Niveau sont obligatoires`);
        return;
      }
    }

    setSubmittingGrid(true);
    setGridImportResult(null);
    try {
      const payload = validRows.map(r => ({
        first_name: r.first_name.trim(),
        last_name: r.last_name.trim(),
        email: r.email.trim().toLowerCase(),
        filiere: r.filiere,
        level: r.level,
        domain: r.domain || undefined,
        phone: r.phone.trim() || undefined,
        date_of_birth: r.date_of_birth || undefined,
        gender: r.gender || 'M',
        parent_name: r.parent_name.trim() || undefined,
        parent_phone: r.parent_phone.trim() || undefined,
        payment_plan: r.payment_plan || 'tranches'
      }));

      const res = await studentService.bulkCreate(payload);
      setGridImportResult(res);

      if (res.created_count > 0) {
        toast.success(`🎉 ${res.created_count} étudiant(s) créé(s) avec succès !`);
        // Conserver uniquement les lignes en erreur ou réinitialiser
        if (res.errors_count === 0) {
          setRows([createEmptyRow(defaultFiliere, defaultLevel)]);
        }
      }
      if (res.errors_count > 0) {
        toast.error(`⚠️ ${res.errors_count} étudiant(s) avec erreurs`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Erreur lors de l'enregistrement de la promotion");
    } finally {
      setSubmittingGrid(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <Link
            href={basePath}
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold text-slate-900">
                Inscription & Import en Masse
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-[#FF6B00]">
                Promotion Complète
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Enregistrez plusieurs dizaines d'étudiants en une seule fois via fichier Excel/CSV ou par saisie groupée.
            </p>
          </div>
        </div>

        <Link
          href={basePath}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 self-start md:self-auto"
        >
          <Users size={16} />
          Retour à la liste des étudiants
        </Link>
      </div>

      {/* Onglets de mode */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-2xl px-6 pt-3">
        <button
          onClick={() => setActiveTab('file')}
          className={`flex items-center gap-2 px-6 py-3.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'file'
              ? 'border-[#FF6B00] text-[#FF6B00] bg-orange-50/40 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet size={18} />
          Option A : Import Fichier (Excel / CSV)
        </button>
        <button
          onClick={() => setActiveTab('grid')}
          className={`flex items-center gap-2 px-6 py-3.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'grid'
              ? 'border-[#FF6B00] text-[#FF6B00] bg-orange-50/40 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Table size={18} />
          Option B : Grille de Saisie Rapide (Multi-lignes)
        </button>
      </div>

      {/* ========================================================= */}
      {/* ONGLET 1 : IMPORT FICHIER EXCEL / CSV                     */}
      {/* ========================================================= */}
      {activeTab === 'file' && (
        <div className="space-y-6">
          {/* Cartes Téléchargement Modèles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <FileSpreadsheet size={26} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Modèle Microsoft Excel (.xlsx)</h3>
                  <p className="text-xs text-slate-500 mt-0.5">En-têtes mis en forme et 2 exemples pré-remplis</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDownloadTemplate('excel')}
                disabled={downloadingTemplate === 'excel'}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-all shadow-sm flex-shrink-0"
              >
                {downloadingTemplate === 'excel' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                Télécharger .xlsx
              </button>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <FileText size={26} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Modèle Texte CSV (.csv)</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Compatible tous tableurs (séparateur point-virgule)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDownloadTemplate('csv')}
                disabled={downloadingTemplate === 'csv'}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-all shadow-sm flex-shrink-0"
              >
                {downloadingTemplate === 'csv' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                Télécharger .csv
              </button>
            </div>
          </div>

          {/* Zone de Dépôt / Upload */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UploadCloud className="text-[#FF6B00]" size={20} />
              Déposer le fichier d'inscription
            </h2>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                selectedFile
                  ? 'border-emerald-400 bg-emerald-50/30'
                  : 'border-slate-300 hover:border-[#FF6B00] bg-slate-50/50 hover:bg-orange-50/20'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={handleFileChange}
                className="hidden"
              />

              {selectedFile ? (
                <div className="space-y-2">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <CheckCircle2 size={32} />
                  </div>
                  <p className="text-sm font-bold text-slate-800">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500">
                    {(selectedFile.size / 1024).toFixed(1)} Ko • Cliquez pour remplacer le fichier
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-14 h-14 rounded-2xl bg-orange-100 text-[#FF6B00] flex items-center justify-center mx-auto">
                    <UploadCloud size={30} />
                  </div>
                  <p className="text-sm font-bold text-slate-800">
                    Glissez-déposez votre fichier ici, ou cliquez pour parcourir
                  </p>
                  <p className="text-xs text-slate-500">
                    Formats acceptés : <strong>.xlsx</strong> (Excel) ou <strong>.csv</strong> (jusqu'à 500 étudiants par lot)
                  </p>
                </div>
              )}
            </div>

            {selectedFile && (
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setFileImportResult(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleUploadFile}
                  disabled={uploading}
                  className="px-6 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all"
                >
                  {uploading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Traitement et création des comptes en cours...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      Lancer l'importation de la promotion
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Rapport de Résultat d'Import Fichier */}
          {fileImportResult && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h3 className="text-base font-bold text-slate-900">Bilan de l'importation</h3>
                <span className="text-xs font-medium text-slate-500">
                  Total traité : {fileImportResult.total} ligne(s)
                </span>
              </div>

              {/* Cartes compteurs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-xs font-bold text-slate-500 uppercase">Total analysé</div>
                  <div className="text-2xl font-black text-slate-800 mt-1">{fileImportResult.total}</div>
                </div>
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="text-xs font-bold text-emerald-700 uppercase">Créés avec succès</div>
                  <div className="text-2xl font-black text-emerald-700 mt-1">{fileImportResult.created_count}</div>
                </div>
                <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                  <div className="text-xs font-bold text-red-700 uppercase">Échecs / Erreurs</div>
                  <div className="text-2xl font-black text-red-700 mt-1">{fileImportResult.errors_count}</div>
                </div>
              </div>

              {/* Tableau des étudiants créés */}
              {fileImportResult.created.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 size={15} className="text-emerald-600" />
                    <span>Étudiants enregistrés ({fileImportResult.created.length})</span>
                  </h4>
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
                        <tr>
                          <th className="py-2.5 px-3">Matricule</th>
                          <th className="py-2.5 px-3">Nom & Prénom</th>
                          <th className="py-2.5 px-3">Email</th>
                          <th className="py-2.5 px-3">Filière</th>
                          <th className="py-2.5 px-3">Niveau</th>
                          <th className="py-2.5 px-3">Mot de passe temporaire</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {fileImportResult.created.map((s, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-bold text-[#FF6B00]">{s.matricule}</td>
                            <td className="py-2.5 px-3 text-slate-900">{s.first_name} {s.last_name}</td>
                            <td className="py-2.5 px-3 text-slate-600">{s.email}</td>
                            <td className="py-2.5 px-3 text-slate-700">{s.filiere}</td>
                            <td className="py-2.5 px-3 text-slate-800 font-semibold">{s.level}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-600 bg-slate-50 rounded">
                              {s.temp_password || '******'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tableau des erreurs */}
              {fileImportResult.errors.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-red-700 uppercase tracking-wider flex items-center gap-1.5">
                    <XCircle size={15} className="text-red-600" />
                    <span>Lignes en erreur ({fileImportResult.errors.length})</span>
                  </h4>
                  <div className="overflow-x-auto border border-red-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-red-50 text-red-700 uppercase font-semibold">
                        <tr>
                          <th className="py-2.5 px-3">Ligne</th>
                          <th className="py-2.5 px-3">Nom indiqué</th>
                          <th className="py-2.5 px-3">Email</th>
                          <th className="py-2.5 px-3">Motif du rejet</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-100 font-medium">
                        {fileImportResult.errors.map((err, idx) => (
                          <tr key={idx} className="hover:bg-red-50/50">
                            <td className="py-2.5 px-3 font-bold text-red-700">#{err.row}</td>
                            <td className="py-2.5 px-3 text-slate-900">{err.name || '-'}</td>
                            <td className="py-2.5 px-3 text-slate-600">{err.email || '-'}</td>
                            <td className="py-2.5 px-3 text-red-600 font-medium">{err.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* ONGLET 2 : GRILLE RAPIDE MULTI-LIGNES                     */}
      {/* ========================================================= */}
      {activeTab === 'grid' && (
        <div className="space-y-6">
          {/* Barre de configuration rapide / Pré-remplissage */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Pré-configuration de la promotion</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Définissez la filière et le niveau par défaut pour accélérer la saisie des étudiants.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-600">Filière par défaut :</label>
                  <select
                    value={defaultFiliere}
                    onChange={(e) => setDefaultFiliere(e.target.value)}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 bg-white"
                  >
                    {filieres.map(f => (
                      <option key={f.id} value={f.name}>{f.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-600">Niveau :</label>
                  <select
                    value={defaultLevel}
                    onChange={(e) => setDefaultLevel(e.target.value)}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 bg-white"
                  >
                    {['L1', 'L2', 'L3', 'M1', 'M2'].map(lvl => (
                      <option key={lvl} value={lvl}>{lvl}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleApplyDefaultsToEmpty}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  Appliquer à la grille
                </button>
              </div>
            </div>

            {/* Boutons d'ajout de lignes */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAddRows(1)}
                  className="px-3 py-1.5 bg-[#FF6B00]/10 hover:bg-[#FF6B00]/20 text-[#FF6B00] rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Plus size={14} /> +1 Ligne
                </button>
                <button
                  type="button"
                  onClick={() => handleAddRows(5)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  +5 Lignes
                </button>
                <button
                  type="button"
                  onClick={() => handleAddRows(10)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  +10 Lignes
                </button>
                <button
                  type="button"
                  onClick={() => setRows([createEmptyRow(defaultFiliere, defaultLevel)])}
                  className="px-3 py-1.5 text-xs text-red-600 hover:text-red-700 font-semibold"
                >
                  Réinitialiser la grille
                </button>
              </div>

              <div className="text-xs font-medium text-slate-500">
                {rows.length} étudiant(s) dans la grille
              </div>
            </div>
          </div>

          {/* Tableur Interactif */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[1100px]">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center">#</th>
                    <th className="py-3 px-3">Prénom *</th>
                    <th className="py-3 px-3">Nom *</th>
                    <th className="py-3 px-3">Email *</th>
                    <th className="py-3 px-3">Filière *</th>
                    <th className="py-3 px-3 w-20">Niveau *</th>
                    <th className="py-3 px-3">Téléphone</th>
                    <th className="py-3 px-3">Date naiss.</th>
                    <th className="py-3 px-3 w-16">Genre</th>
                    <th className="py-3 px-3">Parent / Tuteur</th>
                    <th className="py-3 px-3">Tél. Parent</th>
                    <th className="py-3 px-3 w-28">Paiement</th>
                    <th className="py-3 px-3 w-16 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-2">
                        <input
                          type="text"
                          placeholder="Ex: Moussa"
                          value={row.first_name}
                          onChange={(e) => handleUpdateRow(row.id, 'first_name', e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-[#FF6B00] focus:border-[#FF6B00]"
                        />
                      </td>
                      <td className="py-2.5 px-2">
                        <input
                          type="text"
                          placeholder="Ex: Traoré"
                          value={row.last_name}
                          onChange={(e) => handleUpdateRow(row.id, 'last_name', e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-[#FF6B00] focus:border-[#FF6B00]"
                        />
                      </td>
                      <td className="py-2.5 px-2">
                        <input
                          type="email"
                          placeholder="moussa@ecob.edu.ml"
                          value={row.email}
                          onChange={(e) => handleUpdateRow(row.id, 'email', e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-[#FF6B00] focus:border-[#FF6B00]"
                        />
                      </td>
                      <td className="py-2.5 px-2">
                        <select
                          value={row.filiere}
                          onChange={(e) => handleUpdateRow(row.id, 'filiere', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-[#FF6B00] bg-white"
                        >
                          {filieres.map(f => (
                            <option key={f.id} value={f.name}>{f.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2.5 px-2">
                        <select
                          value={row.level}
                          onChange={(e) => handleUpdateRow(row.id, 'level', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-[#FF6B00] bg-white"
                        >
                          {['L1', 'L2', 'L3', 'M1', 'M2'].map(lvl => (
                            <option key={lvl} value={lvl}>{lvl}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2.5 px-2">
                        <input
                          type="tel"
                          placeholder="+223 ..."
                          value={row.phone}
                          onChange={(e) => handleUpdateRow(row.id, 'phone', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-[#FF6B00]"
                        />
                      </td>
                      <td className="py-2.5 px-2">
                        <input
                          type="date"
                          value={row.date_of_birth}
                          onChange={(e) => handleUpdateRow(row.id, 'date_of_birth', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-[#FF6B00]"
                        />
                      </td>
                      <td className="py-2.5 px-2">
                        <select
                          value={row.gender}
                          onChange={(e) => handleUpdateRow(row.id, 'gender', e.target.value)}
                          className="w-full px-1.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-center"
                        >
                          <option value="M">M</option>
                          <option value="F">F</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-2">
                        <input
                          type="text"
                          placeholder="Nom parent"
                          value={row.parent_name}
                          onChange={(e) => handleUpdateRow(row.id, 'parent_name', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-[#FF6B00]"
                        />
                      </td>
                      <td className="py-2.5 px-2">
                        <input
                          type="tel"
                          placeholder="Tél parent"
                          value={row.parent_phone}
                          onChange={(e) => handleUpdateRow(row.id, 'parent_phone', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-[#FF6B00]"
                        />
                      </td>
                      <td className="py-2.5 px-2">
                        <select
                          value={row.payment_plan}
                          onChange={(e) => handleUpdateRow(row.id, 'payment_plan', e.target.value)}
                          className="w-full px-1.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                        >
                          <option value="tranches">Tranches</option>
                          <option value="mensuel">Mensuel</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            title="Dupliquer"
                            onClick={() => handleDuplicateRow(row)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                          >
                            <Copy size={13} />
                          </button>
                          {rows.length > 1 && (
                            <button
                              type="button"
                              title="Supprimer la ligne"
                              onClick={() => handleRemoveRow(row.id)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pied de tableau avec bouton d'enregistrement */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-xs text-slate-500">
                Astuce : Les matricules uniques et QR codes sont générés automatiquement pour chaque étudiant.
              </div>

              <button
                type="button"
                onClick={handleSubmitGrid}
                disabled={submittingGrid}
                className="px-6 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                {submittingGrid ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Création de la promotion en cours...
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    Enregistrer les {rows.filter(r => r.first_name.trim() || r.last_name.trim()).length} étudiants
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Rapport de résultat Grille */}
          {gridImportResult && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">Bilan de l'enregistrement</h3>
                <span className="text-xs font-medium text-slate-500">Total : {gridImportResult.total} étudiant(s)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="text-xs font-bold text-emerald-700 uppercase">Créés avec succès</div>
                  <div className="text-2xl font-black text-emerald-700 mt-1">{gridImportResult.created_count}</div>
                </div>
                <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                  <div className="text-xs font-bold text-red-700 uppercase">Erreurs</div>
                  <div className="text-2xl font-black text-red-700 mt-1">{gridImportResult.errors_count}</div>
                </div>
              </div>

              {gridImportResult.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-red-700 uppercase">Détail des erreurs :</h4>
                  <ul className="text-xs text-red-600 space-y-1 list-disc pl-5">
                    {gridImportResult.errors.map((e, idx) => (
                      <li key={idx}>Ligne {e.row} ({e.email}) : {e.error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
