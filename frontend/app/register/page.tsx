'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  GraduationCap, RefreshCw, User, Mail, Lock, Phone, MapPin,
  Calendar, FileText, Upload, CheckCircle2, AlertCircle, ArrowRight,
  Shield, Check, Loader2, Sparkles, X, Paperclip, QrCode
} from 'lucide-react';
import api from '@/lib/api';
import { filiereService } from '@/services/filiereService';
import { toast } from 'react-hot-toast';

export default function RegisterPortalPage() {
  const router = useRouter();
  const [studentType, setStudentType] = useState<'new' | 'returning'>('new');
  const [loading, setLoading] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState<any>(null);

  // Filières et domaines
  const [filieres, setFilieres] = useState<any[]>([]);
  const [domaines, setDomaines] = useState<string[]>([]);
  const [filieresByDomaine, setFilieresByDomaine] = useState<any[]>([]);

  // Photo
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  // Formulaire
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    password_confirm: '',
    phone: '',
    date_of_birth: '',
    place_of_birth: '',
    gender: 'M',
    nationality: 'Malienne',
    address: '',
    level: 'L1',
    domain: '',
    filiere: 'Tronc commun',
    existing_matricule: '',
    parent_name: '',
    parent_phone: '',
    parent_email: '',
  });

  // Fichiers du dossier
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

  useEffect(() => {
    loadFilieres();
  }, []);

  const loadFilieres = async () => {
    try {
      const data: any[] = await filiereService.getAll() || [];
      setFilieres(data);
      const domainesUniques: string[] = Array.from(new Set(data.map((f: any) => f.domain).filter(Boolean)));
      setDomaines(domainesUniques);
      if (domainesUniques.length > 0) {
        setFormData(prev => ({ ...prev, domain: domainesUniques[0] }));
      }
    } catch (e) {
      console.error('Erreur chargement filières:', e);
    }
  };

  useEffect(() => {
    if (formData.level === 'L1') {
      const tronc = filieres.filter((f: any) => f.name === 'Tronc commun');
      setFilieresByDomaine(tronc);
      setFormData(prev => ({ ...prev, filiere: 'Tronc commun' }));
    } else if (formData.domain) {
      const filtered = filieres.filter((f: any) => f.domain === formData.domain && f.name !== 'Tronc commun');
      setFilieresByDomaine(filtered);
      if (filtered.length > 0 && formData.filiere === 'Tronc commun') {
        setFormData(prev => ({ ...prev, filiere: filtered[0].name }));
      }
    }
  }, [formData.domain, formData.level, filieres]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('La photo ne doit pas dépasser 5 Mo');
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleDossierFileChange = (key: string, file: File | null) => {
    if (file && file.size > 10 * 1024 * 1024) {
      toast.error('Le fichier ne doit pas dépasser 10 Mo');
      return;
    }
    setDossierFiles(prev => ({ ...prev, [key]: file }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.first_name || !formData.last_name || !formData.email || !formData.password) {
      toast.error('Veuillez renseigner les champs obligatoires.');
      return;
    }

    if (formData.password !== formData.password_confirm) {
      toast.error('Les deux mots de passe ne correspondent pas.');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    // Validation des pièces selon le profil
    if (studentType === 'new') {
      if (!dossierFiles.birth_certificate || !dossierFiles.bac_diploma || !dossierFiles.bac_transcript || !dossierFiles.id_document) {
        toast.error('Veuillez joindre toutes les 4 pièces obligatoires du dossier nouvel étudiant.');
        return;
      }
    } else {
      if (!dossierFiles.previous_transcript || !dossierFiles.success_certificate || !dossierFiles.financial_clearance) {
        toast.error('Veuillez joindre toutes les 3 pièces obligatoires du dossier de réinscription.');
        return;
      }
    }

    try {
      setLoading(true);
      const submitData = new FormData();
      submitData.append('student_type', studentType);

      Object.entries(formData).forEach(([k, v]) => {
        if (k !== 'password_confirm' && v && v.toString().trim() !== '') {
          submitData.append(k, v);
        }
      });

      if (photoFile) submitData.append('photo', photoFile);

      Object.entries(dossierFiles).forEach(([k, f]) => {
        if (f) submitData.append(k, f);
      });

      const res = await api.post('/api/v1/students/public-register', submitData);
      setSubmittedSuccess(res.data);
      toast.success('🎉 Dossier d\'inscription transmis avec succès !');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Erreur lors de l\'enregistrement';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (submittedSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl max-w-xl w-full p-8 shadow-2xl text-center space-y-6">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={44} />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#FF6B00] bg-orange-50 px-3 py-1 rounded-full">
              Dossier Réceptionné
            </span>
            <h1 className="text-2xl font-bold text-slate-900 mt-3">Inscription transmise avec succès !</h1>
            <p className="text-sm text-slate-500 mt-2">
              Votre dossier administratif a bien été enregistré. L'administration va procéder à la vérification de vos pièces justificatives.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Matricule attribué :</span>
              <span className="font-mono font-bold text-slate-900 bg-white px-2.5 py-1 rounded border border-slate-200">
                {submittedSuccess.matricule}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Identifiant de connexion :</span>
              <span className="font-semibold text-slate-900">{submittedSuccess.email}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Statut du dossier :</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                {submittedSuccess.file_status === 'complete' ? 'Complet (en vérification)' : 'En attente de pièces'}
              </span>
            </div>
          </div>

          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 w-full py-3.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white font-semibold rounded-xl shadow-md transition-colors"
            >
              Accéder à l'espace de connexion <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 py-10 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between text-white/80 text-sm">
          <Link href="/" className="flex items-center gap-2 hover:text-white transition-colors">
            <div className="w-8 h-8 rounded-lg bg-[#FF6B00] flex items-center justify-center text-white font-bold text-lg">
              U
            </div>
            <span className="font-bold tracking-tight text-white text-base">UniSphere AI</span>
          </Link>
          <div className="flex items-center gap-4 text-xs sm:text-sm">
            <span>Déjà inscrit ?</span>
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
            >
              Se connecter
            </Link>
          </div>
        </div>

        {/* Hero Title */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Portail d'Admission & Inscription
          </h1>
          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto">
            Remplissez votre dossier et transmettez vos pièces justificatives directement en ligne. Votre dossier est traité numériquement par la scolarité.
          </p>
        </div>

        {/* Liens annexes (Alumni & Scan Mobile) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/register-alumni"
            className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-[#FF6B00]/50 hover:bg-white/10 transition-all flex items-center gap-4 group"
          >
            <div className="w-12 h-12 rounded-xl bg-[#FF6B00]/20 text-[#FF6B00] flex items-center justify-center group-hover:scale-105 transition-transform">
              <GraduationCap size={24} />
            </div>
            <div>
              <p className="font-bold text-white text-sm">Vous êtes un ancien Diplômé (Alumni) ?</p>
              <p className="text-xs text-slate-400 mt-0.5">Rejoignez le réseau Alumni avec votre lien ou token d'invitation →</p>
            </div>
          </Link>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <QrCode size={24} />
            </div>
            <div>
              <p className="font-bold text-white text-sm">Session de Scan Mobile à distance</p>
              <p className="text-xs text-slate-400 mt-0.5">Utilisez le lien unique ou QR code reçu par email pour photographier vos pièces.</p>
            </div>
          </div>
        </div>

        {/* Formulaire Principal */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8">
          {/* Sélection Profil : Nouveau vs Ancien */}
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
              <GraduationCap size={20} className="text-[#FF6B00]" />
              Choisissez votre catégorie d'inscription
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Le dossier et les pièces justificatives demandées s'adaptent automatiquement à votre situation.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  setStudentType('new');
                  setFormData(prev => ({ ...prev, level: 'L1', filiere: 'Tronc commun' }));
                }}
                className={`p-5 rounded-2xl border-2 text-left flex items-start gap-4 transition-all ${
                  studentType === 'new'
                    ? 'border-[#FF6B00] bg-orange-50/40 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className={`p-3 rounded-xl ${studentType === 'new' ? 'bg-[#FF6B00] text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <GraduationCap size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">🎓 Nouvel Étudiant</span>
                    {studentType === 'new' && (
                      <span className="text-xs bg-[#FF6B00] text-white px-2 py-0.5 rounded-full font-semibold">
                        Sélectionné
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Première inscription à l'université (L1 ou nouveau transfert). Requis : Acte de naissance, Diplôme Bac, Relevé de notes Bac, CNI.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStudentType('returning');
                  setFormData(prev => ({ ...prev, level: 'L2' }));
                }}
                className={`p-5 rounded-2xl border-2 text-left flex items-start gap-4 transition-all ${
                  studentType === 'returning'
                    ? 'border-[#FF6B00] bg-orange-50/40 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className={`p-3 rounded-xl ${studentType === 'returning' ? 'bg-[#FF6B00] text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <RefreshCw size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">🔄 Ancien Étudiant (Réinscription)</span>
                    {studentType === 'returning' && (
                      <span className="text-xs bg-[#FF6B00] text-white px-2 py-0.5 rounded-full font-semibold">
                        Sélectionné
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Poursuite d'études vers l'année supérieure (L2, L3, Master). Requis : Relevé de notes N-1, Attestation de réussite, Quitus financier.
                  </p>
                </div>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* 1. Informations Personnelles */}
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <User size={18} className="text-[#FF6B00]" />
                1. Identité de l'étudiant
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Prénom *</label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                    placeholder="Moussa"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nom *</label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                    placeholder="Coulibaly"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date de naissance *</label>
                  <input
                    type="date"
                    name="date_of_birth"
                    value={formData.date_of_birth}
                    onChange={handleChange}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Lieu de naissance</label>
                  <input
                    type="text"
                    name="place_of_birth"
                    value={formData.place_of_birth}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                    placeholder="Bamako"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Genre</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-white"
                  >
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nationalité</label>
                  <input
                    type="text"
                    name="nationality"
                    value={formData.nationality}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                    placeholder="Malienne"
                  />
                </div>
              </div>
            </div>

            {/* 2. Coordonnées & Sécurité */}
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Lock size={18} className="text-[#FF6B00]" />
                2. Compte & Coordonnées de contact
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Adresse Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                    placeholder="moussa.coulibaly@email.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Numéro de téléphone *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                    placeholder="+223 7X XX XX XX"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mot de passe pour votre espace *</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                    placeholder="Au moins 6 caractères"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Confirmer le mot de passe *</label>
                  <input
                    type="password"
                    name="password_confirm"
                    value={formData.password_confirm}
                    onChange={handleChange}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                    placeholder="Répétez le mot de passe"
                  />
                </div>
              </div>
            </div>

            {/* 3. Inscription Académique */}
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <GraduationCap size={18} className="text-[#FF6B00]" />
                3. Orientation académique
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Niveau d'études *</label>
                  <select
                    name="level"
                    value={formData.level}
                    onChange={handleChange}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-white"
                  >
                    {studentType === 'new' ? (
                      <>
                        <option value="L1">Licence 1 (L1)</option>
                        <option value="L2">Licence 2 (Transfert L2)</option>
                        <option value="L3">Licence 3 (Transfert L3)</option>
                        <option value="M1">Master 1 (Transfert M1)</option>
                      </>
                    ) : (
                      <>
                        <option value="L2">Licence 2 (L2)</option>
                        <option value="L3">Licence 3 (L3)</option>
                        <option value="M1">Master 1 (M1)</option>
                        <option value="M2">Master 2 (M2)</option>
                        <option value="Doctorat">Doctorat</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Domaine d'études *</label>
                  <select
                    name="domain"
                    value={formData.domain}
                    onChange={handleChange}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-white"
                  >
                    {domaines.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Filière *</label>
                  <select
                    name="filiere"
                    value={formData.filiere}
                    onChange={handleChange}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-white"
                  >
                    {formData.level === 'L1' ? (
                      <option value="Tronc commun">Tronc commun</option>
                    ) : (
                      filieresByDomaine.map(f => (
                        <option key={f.id} value={f.name}>{f.name}</option>
                      ))
                    )}
                  </select>
                </div>

                {studentType === 'returning' && (
                  <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Matricule de l'année précédente (recommandé)
                    </label>
                    <input
                      type="text"
                      name="existing_matricule"
                      value={formData.existing_matricule}
                      onChange={handleChange}
                      placeholder="Ex: UN-2024-0042"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 4. Dépôt des pièces du dossier */}
            <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <FileText size={18} className="text-[#FF6B00]" />
                    4. Dépôt des pièces justificatives du dossier
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {studentType === 'new'
                      ? 'Fournissez les documents obligatoires du Baccalauréat et d\'état civil'
                      : 'Fournissez vos justificatifs de validation académique et de scolarité passée'}
                  </p>
                </div>
                <span className="text-xs font-semibold text-[#FF6B00] bg-orange-100/60 px-3 py-1 rounded-full self-start sm:self-center">
                  PDF ou Image (max 10 Mo)
                </span>
              </div>

              {/* Pièces Nouvel Étudiant */}
              {studentType === 'new' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {/* Acte de naissance */}
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">Extrait d'acte de naissance *</span>
                      {dossierFiles.birth_certificate ? (
                        <span className="text-[11px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                          <CheckCircle2 size={11} /> Joint
                        </span>
                      ) : (
                        <span className="text-[11px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">
                          Obligatoire
                        </span>
                      )}
                    </div>
                    <label className="flex items-center justify-between p-2.5 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-[#FF6B00] transition-colors bg-slate-50/50">
                      <span className="text-xs text-slate-600 truncate max-w-[200px]">
                        {dossierFiles.birth_certificate ? dossierFiles.birth_certificate.name : 'Sélectionner un fichier...'}
                      </span>
                      <span className="text-xs font-semibold text-[#FF6B00] bg-orange-50 px-2 py-1 rounded">Parcourir</span>
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        onChange={e => handleDossierFileChange('birth_certificate', e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Diplôme Bac */}
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">Diplôme ou Attestation du Bac *</span>
                      {dossierFiles.bac_diploma ? (
                        <span className="text-[11px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                          <CheckCircle2 size={11} /> Joint
                        </span>
                      ) : (
                        <span className="text-[11px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">
                          Obligatoire
                        </span>
                      )}
                    </div>
                    <label className="flex items-center justify-between p-2.5 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-[#FF6B00] transition-colors bg-slate-50/50">
                      <span className="text-xs text-slate-600 truncate max-w-[200px]">
                        {dossierFiles.bac_diploma ? dossierFiles.bac_diploma.name : 'Sélectionner un fichier...'}
                      </span>
                      <span className="text-xs font-semibold text-[#FF6B00] bg-orange-50 px-2 py-1 rounded">Parcourir</span>
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        onChange={e => handleDossierFileChange('bac_diploma', e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Relevé de notes Bac */}
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">Relevé de notes du Baccalauréat *</span>
                      {dossierFiles.bac_transcript ? (
                        <span className="text-[11px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                          <CheckCircle2 size={11} /> Joint
                        </span>
                      ) : (
                        <span className="text-[11px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">
                          Obligatoire
                        </span>
                      )}
                    </div>
                    <label className="flex items-center justify-between p-2.5 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-[#FF6B00] transition-colors bg-slate-50/50">
                      <span className="text-xs text-slate-600 truncate max-w-[200px]">
                        {dossierFiles.bac_transcript ? dossierFiles.bac_transcript.name : 'Sélectionner un fichier...'}
                      </span>
                      <span className="text-xs font-semibold text-[#FF6B00] bg-orange-50 px-2 py-1 rounded">Parcourir</span>
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        onChange={e => handleDossierFileChange('bac_transcript', e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* CNI / Passeport */}
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">Pièce d'identité (CNI / Passeport) *</span>
                      {dossierFiles.id_document ? (
                        <span className="text-[11px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                          <CheckCircle2 size={11} /> Joint
                        </span>
                      ) : (
                        <span className="text-[11px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">
                          Obligatoire
                        </span>
                      )}
                    </div>
                    <label className="flex items-center justify-between p-2.5 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-[#FF6B00] transition-colors bg-slate-50/50">
                      <span className="text-xs text-slate-600 truncate max-w-[200px]">
                        {dossierFiles.id_document ? dossierFiles.id_document.name : 'Sélectionner un fichier...'}
                      </span>
                      <span className="text-xs font-semibold text-[#FF6B00] bg-orange-50 px-2 py-1 rounded">Parcourir</span>
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        onChange={e => handleDossierFileChange('id_document', e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Certificat médical (optionnel) */}
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">Certificat médical d'aptitude</span>
                      <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                        Optionnel
                      </span>
                    </div>
                    <label className="flex items-center justify-between p-2.5 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-[#FF6B00] transition-colors bg-slate-50/50">
                      <span className="text-xs text-slate-600 truncate max-w-[300px]">
                        {dossierFiles.medical_certificate ? dossierFiles.medical_certificate.name : 'Sélectionner un fichier...'}
                      </span>
                      <span className="text-xs font-semibold text-[#FF6B00] bg-orange-50 px-2 py-1 rounded">Parcourir</span>
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        onChange={e => handleDossierFileChange('medical_certificate', e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              ) : (
                /* Pièces Ancien Étudiant (Réinscription) */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {/* Relevé N-1 */}
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">Relevé de notes de l'année précédente (N-1) *</span>
                      {dossierFiles.previous_transcript ? (
                        <span className="text-[11px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                          <CheckCircle2 size={11} /> Joint
                        </span>
                      ) : (
                        <span className="text-[11px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">
                          Obligatoire
                        </span>
                      )}
                    </div>
                    <label className="flex items-center justify-between p-2.5 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-[#FF6B00] transition-colors bg-slate-50/50">
                      <span className="text-xs text-slate-600 truncate max-w-[200px]">
                        {dossierFiles.previous_transcript ? dossierFiles.previous_transcript.name : 'Sélectionner un fichier...'}
                      </span>
                      <span className="text-xs font-semibold text-[#FF6B00] bg-orange-50 px-2 py-1 rounded">Parcourir</span>
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        onChange={e => handleDossierFileChange('previous_transcript', e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Attestation passage/réussite */}
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">Attestation de passage ou réussite *</span>
                      {dossierFiles.success_certificate ? (
                        <span className="text-[11px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                          <CheckCircle2 size={11} /> Joint
                        </span>
                      ) : (
                        <span className="text-[11px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">
                          Obligatoire
                        </span>
                      )}
                    </div>
                    <label className="flex items-center justify-between p-2.5 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-[#FF6B00] transition-colors bg-slate-50/50">
                      <span className="text-xs text-slate-600 truncate max-w-[200px]">
                        {dossierFiles.success_certificate ? dossierFiles.success_certificate.name : 'Sélectionner un fichier...'}
                      </span>
                      <span className="text-xs font-semibold text-[#FF6B00] bg-orange-50 px-2 py-1 rounded">Parcourir</span>
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        onChange={e => handleDossierFileChange('success_certificate', e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Quitus financier */}
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">Quitus financier / Solde scolarité *</span>
                      {dossierFiles.financial_clearance ? (
                        <span className="text-[11px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                          <CheckCircle2 size={11} /> Joint
                        </span>
                      ) : (
                        <span className="text-[11px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">
                          Obligatoire
                        </span>
                      )}
                    </div>
                    <label className="flex items-center justify-between p-2.5 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-[#FF6B00] transition-colors bg-slate-50/50">
                      <span className="text-xs text-slate-600 truncate max-w-[200px]">
                        {dossierFiles.financial_clearance ? dossierFiles.financial_clearance.name : 'Sélectionner un fichier...'}
                      </span>
                      <span className="text-xs font-semibold text-[#FF6B00] bg-orange-50 px-2 py-1 rounded">Parcourir</span>
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        onChange={e => handleDossierFileChange('financial_clearance', e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Carte étudiant N-1 */}
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">Ancienne carte d'étudiant / CNI</span>
                      <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                        Optionnel
                      </span>
                    </div>
                    <label className="flex items-center justify-between p-2.5 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-[#FF6B00] transition-colors bg-slate-50/50">
                      <span className="text-xs text-slate-600 truncate max-w-[200px]">
                        {dossierFiles.id_document ? dossierFiles.id_document.name : 'Sélectionner un fichier...'}
                      </span>
                      <span className="text-xs font-semibold text-[#FF6B00] bg-orange-50 px-2 py-1 rounded">Parcourir</span>
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        onChange={e => handleDossierFileChange('id_document', e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Fiche réinscription signée */}
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">Fiche de réinscription signée</span>
                      <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                        Optionnel
                      </span>
                    </div>
                    <label className="flex items-center justify-between p-2.5 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-[#FF6B00] transition-colors bg-slate-50/50">
                      <span className="text-xs text-slate-600 truncate max-w-[300px]">
                        {dossierFiles.reenrollment_form ? dossierFiles.reenrollment_form.name : 'Sélectionner un fichier...'}
                      </span>
                      <span className="text-xs font-semibold text-[#FF6B00] bg-orange-50 px-2 py-1 rounded">Parcourir</span>
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        onChange={e => handleDossierFileChange('reenrollment_form', e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Photo de profil (Optionnel) */}
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <User size={18} className="text-[#FF6B00]" />
                5. Photo d'identité (Optionnel)
              </h3>
              <div className="flex items-center gap-6">
                <div className="relative">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Aperçu"
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-[#FF6B00]"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                      <User size={28} />
                    </div>
                  )}
                </div>
                <div>
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors">
                    <Upload size={14} /> Choisir une photo
                    <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                  </label>
                  <p className="text-[11px] text-slate-500 mt-1">Format carré conseillé (JPG ou PNG, max 5 Mo)</p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-slate-500">
                En soumettant ce formulaire, vous attestez sur l'honneur l'exactitude des informations fournies.
              </p>
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-8 py-3.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white font-bold rounded-xl shadow-lg hover:shadow-orange-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Transmission du dossier...
                  </>
                ) : (
                  <>
                    <Check size={18} /> Transmettre mon dossier d'inscription
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
