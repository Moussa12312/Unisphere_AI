'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Save, User, Mail, GraduationCap,
  Upload, X, Loader2, Camera, FileText, CheckCircle2,
  AlertCircle, RefreshCw, FileUp, Paperclip, Calendar
} from 'lucide-react';
import api from '@/lib/api';
import { filiereService } from '@/services/filiereService';
import { useToast } from '@/components/ToastProvider';
import DocumentScanner from '@/components/DocumentScanner';

export default function SecretaryEnrollmentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [studentType, setStudentType] = useState<'new' | 'returning'>('new');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const toast = useToast();

  const [dossierFiles, setDossierFiles] = useState<{ [key: string]: File | null }>({
    birth_certificate: null,
    bac_diploma: null,
    bac_transcript: null,
    id_document: null,
    medical_certificate: null,
    previous_transcript: null,
    success_certificate: null,
    financial_clearance: null,
    reenrollment_form: null,
  });

  const [filieres, setFilieres] = useState<any[]>([]);
  const [domaines, setDomaines] = useState<string[]>([]);
  const [filieresByDomaine, setFilieresByDomaine] = useState<any[]>([]);
  const [levelsOfFiliere, setLevelsOfFiliere] = useState<string[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [scannedFilePath, setScannedFilePath] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    place_of_birth: '',
    gender: '',
    nationality: 'Malienne',
    email: '',
    phone: '',
    address: '',
    level: '',
    filiere: '',
    domain: '',
    parent_name: '',
    parent_phone: '',
    parent_email: '',
    id_number: '',
    payment_plan: 'tranches',
    monthly_deposit: '',
    monthly_installment: '',
    monthly_months_count: '5'
  });

  useEffect(() => {
    loadFilieres();
  }, []);

  const loadFilieres = async () => {
    setLoadingData(true);
    try {
      const data: any[] = await filiereService.getAll() || [];
      setFilieres(data);
      const domainesUniques: string[] = Array.from(
        new Set(data.map((f: any) => f.domain).filter(Boolean))
      );
      setDomaines(domainesUniques);
    } catch (error) {
      toast.error('Erreur lors du chargement des filières');
    } finally {
      setLoadingData(false);
    }
  };

  // ✅ Quand niveau = L1, forcer filière = Tronc commun
  const handleLevelChange = (newLevel: string) => {
    if (newLevel === 'L1') {
      setFormData({ 
        ...formData, 
        level: newLevel,
        filiere: "Tronc commun",
        domain: formData.domain || ''
      });
    } else {
      setFormData({ ...formData, level: newLevel, filiere: '' });
    }
  };

  // ✅ Quand domaine change : si L1, garder Tronc commun
  const handleDomainChange = (newDomain: string) => {
    if (formData.level === 'L1') {
      setFormData({ 
        ...formData, 
        domain: newDomain,
        filiere: "Tronc commun"
      });
    } else {
      setFormData({ ...formData, domain: newDomain, filiere: '', level: '' });
    }
  };

  // ✅ Filtrer les filières selon le domaine (ou Tronc commun si L1)
  useEffect(() => {
    if (formData.level === 'L1') {
      const tronc = filieres.filter((f: any) => f.name === "Tronc commun");
      setFilieresByDomaine(tronc);
    } else if (formData.domain) {
      const filtered: any[] = filieres.filter((f: any) => f.domain === formData.domain);
      setFilieresByDomaine(filtered);
    } else {
      setFilieresByDomaine([]);
    }
  }, [formData.domain, formData.level, filieres]);

  // ✅ Charger les niveaux de la filière sélectionnée
  useEffect(() => {
    if (formData.filiere && formData.domain) {
      const filiere = filieres.find((f: any) => 
        f.domain === formData.domain && f.name === formData.filiere
      );
      if (filiere?.levels) {
        const levels: string[] = filiere.levels.split(',').map((l: string) => l.trim()).filter(Boolean);
        setLevelsOfFiliere(levels);
      } else {
        setLevelsOfFiliere([]);
      }
    } else {
      setLevelsOfFiliere([]);
    }
  }, [formData.filiere, formData.domain, filieres]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('La photo ne doit pas dépasser 5MB');
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhotoPreview(null);
    setPhotoFile(null);
  };

  const handleScanComplete = (scanData: any) => {
    const info = scanData.extracted_info;
    
    // ✅ Sauvegarder le chemin du fichier pour l'envoi au backend
    setScannedFilePath(scanData.file_path);
  
    // Auto-remplissage
    setFormData(prev => ({
      ...prev,
      last_name: info.nom || prev.last_name,
      first_name: info.prenom || prev.first_name,
      date_of_birth: info.date_naissance || prev.date_of_birth,
      place_of_birth: info.lieu_naissance || prev.place_of_birth,
    }));
  
    toast.success("Formulaire pré-rempli et document prêt à être enregistré !");
  };

  const handleDossierFileChange = (docKey: string, file: File | null) => {
    if (file && file.size > 15 * 1024 * 1024) {
      toast.error('Le fichier ne doit pas dépasser 15MB');
      return;
    }
    setDossierFiles(prev => ({ ...prev, [docKey]: file }));
    if (file) {
      toast.success(`Fichier ${file.name} joint`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.first_name || !formData.last_name || !formData.email || !formData.level || !formData.filiere || !formData.domain) {
      toast.error('Veuillez remplir tous les champs obligatoires (*)');
      return;
    }

    setLoading(true);
    try {
      const submitData = new FormData();
      
      Object.entries(formData).forEach(([key, value]) => {
        if (value && value.toString().trim() !== '') {
          submitData.append(key, value);
        }
      });

      submitData.append('student_type', studentType);

      if (photoFile) {
        submitData.append('photo', photoFile);
      }

      if (scannedFilePath) {
        submitData.append('scanned_file_path', scannedFilePath);
      }

      // Ajout des pièces du dossier selon le type d'inscription
      Object.entries(dossierFiles).forEach(([key, file]) => {
        if (file) {
          submitData.append(key, file);
        }
      });

      await api.post('/api/v1/students/', submitData);
      toast.success('Étudiant créé avec succès et dossier enregistré !');
      router.push('/secretary/students');
    } catch (error: any) {
      const msg = error.response?.data?.detail || error.message || 'Erreur lors de la création';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B00] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      <div className="flex items-center text-sm text-slate-500">
        <Link href="/secretary/dashboard" className="hover:text-[#FF6B00]">Dashboard</Link>
        <span className="mx-2">›</span>
        <Link href="/secretary/students" className="hover:text-[#FF6B00]">Étudiants</Link>
        <span className="mx-2">›</span>
        <span className="text-slate-900 font-medium">Nouveau</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Inscription d'un étudiant</h1>
          <p className="text-slate-500 mt-1">Remplissez les informations pour créer un nouveau dossier</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="w-full flex items-center justify-center gap-3 p-4 mb-6 border-2 border-dashed border-green-500 bg-green-50 hover:bg-green-100 rounded-xl transition-colors group"
          >
            <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <Camera size={20} className="text-white" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-green-700">Scanner les documents d'inscription</p>
              <p className="text-xs text-slate-500">CNI ou Acte de naissance (Remplissage automatique)</p>
            </div>
          </button>
        </div>

          
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sélecteur de type d'étudiant */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
            <GraduationCap size={20} className="text-[#FF6B00]" />
            Type d'inscription & Profil de l'étudiant
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            Sélectionnez la catégorie d'inscription pour adapter automatiquement les pièces justificatives demandées.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setStudentType('new')}
              className={`p-4 rounded-xl border-2 text-left flex items-start gap-4 transition-all ${
                studentType === 'new'
                  ? 'border-[#FF6B00] bg-orange-50/50 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className={`p-3 rounded-lg ${studentType === 'new' ? 'bg-[#FF6B00] text-white' : 'bg-slate-100 text-slate-500'}`}>
                <GraduationCap size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">🎓 Nouvel Étudiant</span>
                  {studentType === 'new' && <span className="text-xs bg-[#FF6B00] text-white px-2 py-0.5 rounded-full font-medium">Sélectionné</span>}
                </div>
                <p className="text-xs text-slate-500 mt-1">Première inscription à l'université (L1 ou nouveau transfert). Collecte : Acte de naissance, Diplôme Bac, Relevé Bac, CNI.</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setStudentType('returning')}
              className={`p-4 rounded-xl border-2 text-left flex items-start gap-4 transition-all ${
                studentType === 'returning'
                  ? 'border-[#FF6B00] bg-orange-50/50 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className={`p-3 rounded-lg ${studentType === 'returning' ? 'bg-[#FF6B00] text-white' : 'bg-slate-100 text-slate-500'}`}>
                <RefreshCw size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">🔄 Ancien Étudiant (Réinscription)</span>
                  {studentType === 'returning' && <span className="text-xs bg-[#FF6B00] text-white px-2 py-0.5 rounded-full font-medium">Sélectionné</span>}
                </div>
                <p className="text-xs text-slate-500 mt-1">Étudiant réinscrit pour l'année supérieure (L2, L3, M1, M2). Collecte : Relevé N-1, Attestation de réussite, Quitus financier.</p>
              </div>
            </button>
          </div>
        </div>

        {/* Photo */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <User size={20} className="text-[#FF6B00]" />
            Photo de profil
          </h2>
          <div className="flex items-center gap-6">
            <div className="relative">
              {photoPreview ? (
                <div className="relative">
                  <img src={photoPreview} alt="Aperçu" className="w-32 h-32 rounded-full object-cover border-4 border-[#FF6B00]/20" />
                  <button type="button" onClick={removePhoto} className="absolute top-0 right-0 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="w-32 h-32 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center">
                  <User size={48} className="text-slate-400" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-sm font-medium cursor-pointer">
                
                Choisir une photo
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              </label>
              <p className="text-xs text-slate-500 mt-2">JPG, PNG ou GIF (max 5MB) - Optionnel</p>
            </div>
          </div>
        </div>

        {/* Infos personnelles */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <User size={20} className="text-[#FF6B00]" />
            Informations personnelles
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Prénom <span className="text-red-500">*</span></label>
              <input type="text" name="first_name" value={formData.first_name} onChange={handleChange} required className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" placeholder="Amadou" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Nom <span className="text-red-500">*</span></label>
              <input type="text" name="last_name" value={formData.last_name} onChange={handleChange} required className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" placeholder="Traoré" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Date de naissance</label>
              <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Lieu de naissance</label>
              <input type="text" name="place_of_birth" value={formData.place_of_birth} onChange={handleChange} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" placeholder="Bamako" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Genre</label>
              <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-white">
                <option value="">Sélectionner...</option>
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Nationalité</label>
              <input type="text" name="nationality" value={formData.nationality} onChange={handleChange} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" placeholder="Malienne" />
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Mail size={20} className="text-[#FF6B00]" />
            Informations de contact
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email <span className="text-red-500">*</span></label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" placeholder="amadou.traore@email.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Téléphone</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" placeholder="+223 73 34 34 93" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Adresse</label>
              <textarea name="address" value={formData.address} onChange={handleChange} rows={2} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00] resize-none" placeholder="Quartier, Ville" />
            </div>
          </div>
        </div>

        {/* ✅ Académique - ORDRE : Niveau → Domaine → Filière */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <GraduationCap size={20} className="text-[#FF6B00]" />
            Informations académiques
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ✅ NIVEAU EN PREMIER */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Niveau <span className="text-red-500">*</span></label>
              <select 
                name="level" 
                value={formData.level} 
                onChange={(e) => handleLevelChange(e.target.value)}
                required 
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-white"
              >
                <option value="">Sélectionner un niveau...</option>
                <option value="L1">L1</option>
                <option value="L2">L2</option>
                <option value="L3">L3</option>
                <option value="M1">M1</option>
                <option value="M2">M2</option>
              </select>
              {formData.level === 'L1' && (
                <p className="text-xs text-blue-600 mt-1">
                </p>
              )}
            </div>

            {/* ✅ Domaine LIBRE (même pour L1) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Domaine <span className="text-red-500">*</span></label>
              <select 
                name="domain" 
                value={formData.domain} 
                onChange={(e) => handleDomainChange(e.target.value)}
                required 
                disabled={!formData.level}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-white disabled:bg-slate-100"
              >
                <option value="">Sélectionner un domaine...</option>
                {domaines.map((d: string) => (<option key={d} value={d}>{d}</option>))}
              </select>
            </div>

            {/* ✅ Filière : Tronc commun si L1, sinon liste normale */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Filière <span className="text-red-500">*</span>
                {formData.level === 'L1' && <span className="text-blue-600 ml-2"></span>}
              </label>
              <select 
                name="filiere" 
                value={formData.filiere} 
                onChange={handleChange}
                required 
                disabled={formData.level === 'L1' || !formData.domain || filieresByDomaine.length === 0}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-white disabled:bg-slate-100"
              >
                {formData.level === 'L1' ? (
                  <option value="Tronc commun">Tronc commun (automatique)</option>
                ) : (
                  <>
                    <option value="">
                      {!formData.domain 
                        ? 'Choisissez d\'abord un domaine...' 
                        : filieresByDomaine.length === 0 
                          ? 'Aucune filière dans ce domaine' 
                          : 'Sélectionner une filière...'}
                    </option>
                    {filieresByDomaine.map((f: any) => (<option key={f.id} value={f.name}>{f.name}</option>))}
                  </>
                )}
              </select>
            </div>
          </div>
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs text-green-700">ℹ️ Le <strong>matricule</strong> sera généré automatiquement après l'enregistrement</p>
          </div>
        </div>

        {/* Dossier d'inscription & Pièces jointes */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText size={20} className="text-[#FF6B00]" />
                Dossier administratif & Pièces justificatives
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Toutes les pièces ci-dessous sont <strong>facultatives</strong> lors de l'enregistrement. L'inscription peut être finalisée immédiatement.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-700">
              <Paperclip size={14} className="text-[#FF6B00]" />
              {studentType === 'new'
                ? `${[dossierFiles.birth_certificate, dossierFiles.bac_diploma, dossierFiles.bac_transcript, dossierFiles.id_document].filter(Boolean).length} pièce(s) jointe(s)`
                : `${[dossierFiles.previous_transcript, dossierFiles.success_certificate, dossierFiles.financial_clearance].filter(Boolean).length} pièce(s) jointe(s)`
              }
            </div>
          </div>

          {/* Grille des pièces selon le type */}
          {studentType === 'new' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Acte de naissance */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Facultatif</span>
                    <h3 className="text-sm font-semibold text-slate-900">Extrait d'acte de naissance</h3>
                    <p className="text-xs text-slate-500">Document d'état civil original ou légalisé</p>
                  </div>
                  {dossierFiles.birth_certificate ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                      <CheckCircle2 size={12} /> Joint
                    </span>
                  ) : (
                    <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-medium">
                      Non renseigné
                    </span>
                  )}
                </div>
                <div className="mt-3">
                  <label className="flex items-center justify-between p-2.5 bg-white border border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-[#FF6B00] transition-colors">
                    <span className="text-xs text-slate-600 truncate max-w-[200px]">
                      {dossierFiles.birth_certificate ? dossierFiles.birth_certificate.name : 'Sélectionner un fichier (PDF, JPG, PNG)'}
                    </span>
                    <span className="text-xs font-semibold text-[#FF6B00] bg-orange-50 px-2.5 py-1 rounded">Parcourir</span>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => handleDossierFileChange('birth_certificate', e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                  {dossierFiles.birth_certificate && (
                    <button
                      type="button"
                      onClick={() => handleDossierFileChange('birth_certificate', null)}
                      className="text-xs text-red-500 hover:underline mt-1 inline-block"
                    >
                      Supprimer ce fichier
                    </button>
                  )}
                </div>
              </div>

              {/* Diplôme / Attestation du Bac */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Facultatif</span>
                    <h3 className="text-sm font-semibold text-slate-900">Diplôme ou Attestation du Bac</h3>
                    <p className="text-xs text-slate-500">Attestation de réussite ou diplôme officiel du Bac</p>
                  </div>
                  {dossierFiles.bac_diploma ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                      <CheckCircle2 size={12} /> Joint
                    </span>
                  ) : (
                    <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-medium">
                      Non renseigné
                    </span>
                  )}
                </div>
                <div className="mt-3">
                  <label className="flex items-center justify-between p-2.5 bg-white border border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-[#FF6B00] transition-colors">
                    <span className="text-xs text-slate-600 truncate max-w-[200px]">
                      {dossierFiles.bac_diploma ? dossierFiles.bac_diploma.name : 'Sélectionner un fichier (PDF, JPG, PNG)'}
                    </span>
                    <span className="text-xs font-semibold text-[#FF6B00] bg-orange-50 px-2.5 py-1 rounded">Parcourir</span>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => handleDossierFileChange('bac_diploma', e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                  {dossierFiles.bac_diploma && (
                    <button
                      type="button"
                      onClick={() => handleDossierFileChange('bac_diploma', null)}
                      className="text-xs text-red-500 hover:underline mt-1 inline-block"
                    >
                      Supprimer ce fichier
                    </button>
                  )}
                </div>
              </div>

              {/* Relevé de notes du Bac */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Facultatif</span>
                    <h3 className="text-sm font-semibold text-slate-900">Relevé de notes du Bac</h3>
                    <p className="text-xs text-slate-500">Relevé officiel des notes de l'examen</p>
                  </div>
                  {dossierFiles.bac_transcript ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                      <CheckCircle2 size={12} /> Joint
                    </span>
                  ) : (
                    <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-medium">
                      Non renseigné
                    </span>
                  )}
                </div>
                <div className="mt-3">
                  <label className="flex items-center justify-between p-2.5 bg-white border border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-[#FF6B00] transition-colors">
                    <span className="text-xs text-slate-600 truncate max-w-[200px]">
                      {dossierFiles.bac_transcript ? dossierFiles.bac_transcript.name : 'Sélectionner un fichier (PDF, JPG, PNG)'}
                    </span>
                    <span className="text-xs font-semibold text-[#FF6B00] bg-orange-50 px-2.5 py-1 rounded">Parcourir</span>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => handleDossierFileChange('bac_transcript', e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                  {dossierFiles.bac_transcript && (
                    <button
                      type="button"
                      onClick={() => handleDossierFileChange('bac_transcript', null)}
                      className="text-xs text-red-500 hover:underline mt-1 inline-block"
                    >
                      Supprimer ce fichier
                    </button>
                  )}
                </div>
              </div>

              {/* Pièce d'identité */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Facultatif</span>
                    <h3 className="text-sm font-semibold text-slate-900">Pièce d'identité (CNI / Passeport)</h3>
                    <p className="text-xs text-slate-500">Carte d'identité nationale, passeport ou attestation</p>
                  </div>
                  {dossierFiles.id_document ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                      <CheckCircle2 size={12} /> Joint
                    </span>
                  ) : (
                    <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-medium">
                      Non renseigné
                    </span>
                  )}
                </div>
                <div className="mt-3">
                  <label className="flex items-center justify-between p-2.5 bg-white border border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-[#FF6B00] transition-colors">
                    <span className="text-xs text-slate-600 truncate max-w-[200px]">
                      {dossierFiles.id_document ? dossierFiles.id_document.name : 'Sélectionner un fichier (PDF, JPG, PNG)'}
                    </span>
                    <span className="text-xs font-semibold text-[#FF6B00] bg-orange-50 px-2.5 py-1 rounded">Parcourir</span>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => handleDossierFileChange('id_document', e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                  {dossierFiles.id_document && (
                    <button
                      type="button"
                      onClick={() => handleDossierFileChange('id_document', null)}
                      className="text-xs text-red-500 hover:underline mt-1 inline-block"
                    >
                      Supprimer ce fichier
                    </button>
                  )}
                </div>
              </div>

              {/* Certificat médical */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors md:col-span-2">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Optionnel</span>
                    <h3 className="text-sm font-semibold text-slate-900">Certificat médical d'aptitude</h3>
                    <p className="text-xs text-slate-500">Certificat d'aptitude physique et médicale délivré par un médecin</p>
                  </div>
                  {dossierFiles.medical_certificate ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                      <CheckCircle2 size={12} /> Joint
                    </span>
                  ) : (
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">Non renseigné</span>
                  )}
                </div>
                <div className="mt-3">
                  <label className="flex items-center justify-between p-2.5 bg-white border border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-[#FF6B00] transition-colors">
                    <span className="text-xs text-slate-600 truncate max-w-[300px]">
                      {dossierFiles.medical_certificate ? dossierFiles.medical_certificate.name : 'Sélectionner un fichier (PDF, JPG, PNG)'}
                    </span>
                    <span className="text-xs font-semibold text-[#FF6B00] bg-orange-50 px-2.5 py-1 rounded">Parcourir</span>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => handleDossierFileChange('medical_certificate', e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                  {dossierFiles.medical_certificate && (
                    <button
                      type="button"
                      onClick={() => handleDossierFileChange('medical_certificate', null)}
                      className="text-xs text-red-500 hover:underline mt-1 inline-block"
                    >
                      Supprimer ce fichier
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Grille pour Ancien Étudiant (Réinscription) */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Relevé de notes N-1 */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Facultatif</span>
                    <h3 className="text-sm font-semibold text-slate-900">Relevé de notes de l'année précédente (N-1)</h3>
                    <p className="text-xs text-slate-500">Relevé académique officiel attestant des UE validées</p>
                  </div>
                  {dossierFiles.previous_transcript ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                      <CheckCircle2 size={12} /> Joint
                    </span>
                  ) : (
                    <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-medium">
                      Non renseigné
                    </span>
                  )}
                </div>
                <div className="mt-3">
                  <label className="flex items-center justify-between p-2.5 bg-white border border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-[#FF6B00] transition-colors">
                    <span className="text-xs text-slate-600 truncate max-w-[200px]">
                      {dossierFiles.previous_transcript ? dossierFiles.previous_transcript.name : 'Sélectionner un fichier (PDF, JPG, PNG)'}
                    </span>
                    <span className="text-xs font-semibold text-[#FF6B00] bg-orange-50 px-2.5 py-1 rounded">Parcourir</span>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => handleDossierFileChange('previous_transcript', e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                  {dossierFiles.previous_transcript && (
                    <button
                      type="button"
                      onClick={() => handleDossierFileChange('previous_transcript', null)}
                      className="text-xs text-red-500 hover:underline mt-1 inline-block"
                    >
                      Supprimer ce fichier
                    </button>
                  )}
                </div>
              </div>

              {/* Attestation de passage / réussite */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Facultatif</span>
                    <h3 className="text-sm font-semibold text-slate-900">Attestation de passage ou réussite</h3>
                    <p className="text-xs text-slate-500">Décision du jury autorisant l'accès au niveau supérieur</p>
                  </div>
                  {dossierFiles.success_certificate ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                      <CheckCircle2 size={12} /> Joint
                    </span>
                  ) : (
                    <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-medium">
                      Non renseigné
                    </span>
                  )}
                </div>
                <div className="mt-3">
                  <label className="flex items-center justify-between p-2.5 bg-white border border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-[#FF6B00] transition-colors">
                    <span className="text-xs text-slate-600 truncate max-w-[200px]">
                      {dossierFiles.success_certificate ? dossierFiles.success_certificate.name : 'Sélectionner un fichier (PDF, JPG, PNG)'}
                    </span>
                    <span className="text-xs font-semibold text-[#FF6B00] bg-orange-50 px-2.5 py-1 rounded">Parcourir</span>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => handleDossierFileChange('success_certificate', e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                  {dossierFiles.success_certificate && (
                    <button
                      type="button"
                      onClick={() => handleDossierFileChange('success_certificate', null)}
                      className="text-xs text-red-500 hover:underline mt-1 inline-block"
                    >
                      Supprimer ce fichier
                    </button>
                  )}
                </div>
              </div>

              {/* Quitus financier */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Facultatif</span>
                    <h3 className="text-sm font-semibold text-slate-900">Quitus financier / Solde N-1</h3>
                    <p className="text-xs text-slate-500">Attestation ou reçu prouvant le solde de la scolarité passée</p>
                  </div>
                  {dossierFiles.financial_clearance ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                      <CheckCircle2 size={12} /> Joint
                    </span>
                  ) : (
                    <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-medium">
                      Non renseigné
                    </span>
                  )}
                </div>
                <div className="mt-3">
                  <label className="flex items-center justify-between p-2.5 bg-white border border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-[#FF6B00] transition-colors">
                    <span className="text-xs text-slate-600 truncate max-w-[200px]">
                      {dossierFiles.financial_clearance ? dossierFiles.financial_clearance.name : 'Sélectionner un fichier (PDF, JPG, PNG)'}
                    </span>
                    <span className="text-xs font-semibold text-[#FF6B00] bg-orange-50 px-2.5 py-1 rounded">Parcourir</span>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => handleDossierFileChange('financial_clearance', e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                  {dossierFiles.financial_clearance && (
                    <button
                      type="button"
                      onClick={() => handleDossierFileChange('financial_clearance', null)}
                      className="text-xs text-red-500 hover:underline mt-1 inline-block"
                    >
                      Supprimer ce fichier
                    </button>
                  )}
                </div>
              </div>

              {/* Carte étudiant précédente */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Optionnel</span>
                    <h3 className="text-sm font-semibold text-slate-900">Ancienne carte d'étudiant / CNI</h3>
                    <p className="text-xs text-slate-500">Carte d'étudiant UniSphere ou pièce d'identité</p>
                  </div>
                  {dossierFiles.id_document ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                      <CheckCircle2 size={12} /> Joint
                    </span>
                  ) : (
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">Non renseigné</span>
                  )}
                </div>
                <div className="mt-3">
                  <label className="flex items-center justify-between p-2.5 bg-white border border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-[#FF6B00] transition-colors">
                    <span className="text-xs text-slate-600 truncate max-w-[200px]">
                      {dossierFiles.id_document ? dossierFiles.id_document.name : 'Sélectionner un fichier (PDF, JPG, PNG)'}
                    </span>
                    <span className="text-xs font-semibold text-[#FF6B00] bg-orange-50 px-2.5 py-1 rounded">Parcourir</span>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => handleDossierFileChange('id_document', e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                  {dossierFiles.id_document && (
                    <button
                      type="button"
                      onClick={() => handleDossierFileChange('id_document', null)}
                      className="text-xs text-red-500 hover:underline mt-1 inline-block"
                    >
                      Supprimer ce fichier
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Parent/Tuteur */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <User size={20} className="text-[#FF6B00]" />
            Contact parent/tuteur (optionnel)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Nom complet</label>
              <input type="text" name="parent_name" value={formData.parent_name} onChange={handleChange} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" placeholder="Nom du parent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Téléphone</label>
              <input type="tel" name="parent_phone" value={formData.parent_phone} onChange={handleChange} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" placeholder="+223 73 34 34 93" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
              <input type="email" name="parent_email" value={formData.parent_email} onChange={handleChange} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" placeholder="parent@email.com" />
            </div>
          </div>
        </div>

        {/* Modalité de Paiement de la Scolarité */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar size={20} className="text-[#FF6B00]" />
              Modalité de Paiement de la Scolarité
            </h2>
            <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
              Formule de règlement
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Choisissez si l'étudiant s'acquitte de sa scolarité selon l'échéancier classique par tranches ou selon la modalité mensuelle (acompte + mensualités étalées).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, payment_plan: 'tranches' })}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                formData.payment_plan === 'tranches'
                  ? 'border-[#FF6B00] bg-orange-50/40 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">🏛️ Paiement par Tranches</span>
                {formData.payment_plan === 'tranches' && (
                  <span className="text-[11px] bg-[#FF6B00] text-white px-2 py-0.5 rounded-full font-semibold">
                    Sélectionné
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1.5">
                Règlement standard en 3 tranches (P1, P2, P3 selon les dates limites académiques).
              </p>
            </button>

            <button
              type="button"
              onClick={() => setFormData({ ...formData, payment_plan: 'mensuel' })}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                formData.payment_plan === 'mensuel'
                  ? 'border-emerald-500 bg-emerald-50/40 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">📅 Modalité Mensuelle</span>
                {formData.payment_plan === 'mensuel' && (
                  <span className="text-[11px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-semibold">
                    Sélectionné
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1.5">
                Acompte à l'inscription + mensualités étalées sur les mois académiques (ex: 5 mois).
              </p>
            </button>
          </div>

          {formData.payment_plan === 'mensuel' && (
            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                  Paramètres de l'échelonnement mensuel :
                </span>
                <span className="text-[11px] text-emerald-700 italic">
                  (Laissez vide pour appliquer les montants par défaut configurés pour le niveau)
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Acompte Inscription (FCFA)</label>
                  <input
                    type="number"
                    name="monthly_deposit"
                    value={formData.monthly_deposit}
                    onChange={handleChange}
                    placeholder="Auto ou ex: 350000"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mensualité (FCFA / mois)</label>
                  <input
                    type="number"
                    name="monthly_installment"
                    value={formData.monthly_installment}
                    onChange={handleChange}
                    placeholder="Défaut: 100000"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre de mois</label>
                  <input
                    type="number"
                    name="monthly_months_count"
                    min="1"
                    max="12"
                    value={formData.monthly_months_count}
                    onChange={handleChange}
                    placeholder="Défaut: 5"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <p className="text-[11px] text-emerald-800">
                💡 Exemple : Pour une scolarité de 850 000 F, 350 000 F à l'inscription puis 100 000 F × 5 mois.
              </p>
            </div>
          )}
        </div>

        {/* Boutons */}
        <div className="flex flex-col-reverse md:flex-row items-center justify-end gap-3 sticky bottom-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <Link href="/secretary/students" className="w-full md:w-auto text-center px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium">Annuler</Link>
          <button type="submit" disabled={loading} className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-sm font-medium disabled:opacity-50 shadow-md">
            {loading ? (<><Loader2 size={16} className="animate-spin" /> Création en cours...</>) : (<><Save size={16} /> Enregistrer l'étudiant</>)}
          </button>
        </div>
      </form>

      <DocumentScanner 
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanComplete={handleScanComplete}
        mode="new" // Indique qu'on est en mode "Nouvelle inscription"
      />
    </div>
  );
}