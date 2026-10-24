'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Upload, X, Save, User, Mail, Phone,
  MapPin, Calendar, GraduationCap, CreditCard, Loader2,
  CheckCircle2, AlertCircle, Building2
} from 'lucide-react';
import Link from 'next/link';
import api, { API_BASE_URL, getMediaUrl } from '@/lib/api';
import { filiereService } from '@/services/filiereService';
import { getApiErrorMessage } from '@/lib/errorHandler';
import { toast } from 'react-hot-toast';

export default function AdminEditStudentPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params?.id as string;

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Photo
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  // Données académiques réelles issues de la base
  const [filieres, setFilieres] = useState<any[]>([]);
  const [domaines, setDomaines] = useState<string[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    matricule: '',
    email: '',
    phone: '',
    date_of_birth: '',
    place_of_birth: '',
    gender: 'M',
    nationality: 'Malienne',
    address: '',
    domain: '',
    filiere: '',
    level: 'L1',
    parent_name: '',
    parent_phone: '',
    parent_email: '',
    payment_plan: 'tranches',
    monthly_deposit: '',
    monthly_installment: '',
    monthly_months_count: '5',
  });

  useEffect(() => {
    if (studentId) {
      loadInitialData();
    }
  }, [studentId]);

  const loadInitialData = async () => {
    if (!studentId || isNaN(Number(studentId))) {
      setError('ID étudiant invalide');
      setLoadingData(false);
      return;
    }

    setLoadingData(true);
    setError(null);

    try {
      // 1. Charger en parallèle l'étudiant et toutes les filières réelles de la base
      const [studentRes, filieresData] = await Promise.all([
        api.get(`/api/v1/students/${studentId}`),
        filiereService.getAll()
      ]);

      const s = studentRes.data;
      const realFilieres: any[] = Array.isArray(filieresData) ? filieresData : [];
      setFilieres(realFilieres);

      // Extraire les domaines uniques réels
      const uniqueDomaines = Array.from(
        new Set(realFilieres.map((f: any) => f.domain).filter(Boolean))
      ).sort() as string[];
      setDomaines(uniqueDomaines);

      // Si le domaine est absent dans la fiche de l'étudiant, le retrouver via sa filière
      let resolvedDomain = s.domain || '';
      if (!resolvedDomain && s.filiere) {
        const match = realFilieres.find((f: any) => f.name.toLowerCase() === s.filiere.toLowerCase());
        if (match?.domain) {
          resolvedDomain = match.domain;
        }
      }

      setFormData({
        first_name: s.first_name || '',
        last_name: s.last_name || '',
        matricule: s.matricule || '',
        email: s.email || '',
        phone: s.phone || '',
        date_of_birth: s.date_of_birth ? s.date_of_birth.split('T')[0] : '',
        place_of_birth: s.place_of_birth || '',
        gender: s.gender || 'M',
        nationality: s.nationality || 'Malienne',
        address: s.address || '',
        domain: resolvedDomain,
        filiere: s.filiere || (realFilieres[0]?.name || ''),
        level: s.level || 'L1',
        parent_name: s.parent_name || '',
        parent_phone: s.parent_phone || '',
        parent_email: s.parent_email || '',
        payment_plan: s.payment_plan || 'tranches',
        monthly_deposit: s.monthly_deposit != null ? s.monthly_deposit.toString() : '',
        monthly_installment: s.monthly_installment != null ? s.monthly_installment.toString() : '',
        monthly_months_count: s.monthly_months_count != null ? s.monthly_months_count.toString() : '5',
      });

      if (s.photo) {
        setPhotoPreview(getMediaUrl(s.photo));
      }
    } catch (err: any) {
      console.error('Erreur chargement étudiant:', err);
      if (err.response?.status === 404) {
        setError('Étudiant non trouvé');
      } else {
        setError(err.response?.data?.detail || 'Erreur lors du chargement des données');
      }
    } finally {
      setLoadingData(false);
    }
  };

  // Filières filtrées selon le domaine sélectionné
  const availableFilieres = useMemo(() => {
    if (!formData.domain) return filieres;
    return filieres.filter((f: any) => f.domain === formData.domain);
  }, [formData.domain, filieres]);

  // Niveaux disponibles pour la filière sélectionnée
  const availableLevels = useMemo(() => {
    const selectedObj = filieres.find((f: any) => f.name === formData.filiere);
    if (selectedObj?.levels) {
      const parsed = selectedObj.levels.split(',').map((l: string) => l.trim()).filter(Boolean);
      if (parsed.length > 0) return parsed;
    }
    return ['L1', 'L2', 'L3', 'M1', 'M2'];
  }, [formData.filiere, filieres]);

  // Gestion du changement de domaine
  const handleDomainChange = (newDomain: string) => {
    const matchingFilieres = newDomain
      ? filieres.filter((f: any) => f.domain === newDomain)
      : filieres;

    const nextFiliere = matchingFilieres.length > 0
      ? matchingFilieres[0].name
      : formData.filiere;

    setFormData(prev => ({
      ...prev,
      domain: newDomain,
      filiere: nextFiliere
    }));
  };

  // Gestion du changement de filière
  const handleFiliereChange = (newFiliereName: string) => {
    const filiereObj = filieres.find((f: any) => f.name === newFiliereName);
    const newDomain = filiereObj?.domain || formData.domain;

    let nextLevel = formData.level;
    if (filiereObj?.levels) {
      const validLevels = filiereObj.levels.split(',').map((l: string) => l.trim()).filter(Boolean);
      if (validLevels.length > 0 && !validLevels.includes(nextLevel)) {
        nextLevel = validLevels[0];
      }
    }

    setFormData(prev => ({
      ...prev,
      filiere: newFiliereName,
      domain: newDomain,
      level: nextLevel
    }));
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
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.first_name || !formData.last_name || !formData.email || !formData.filiere || !formData.level) {
      toast.error('Veuillez remplir tous les champs obligatoires (*)');
      return;
    }

    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('first_name', formData.first_name.trim());
      formDataToSend.append('last_name', formData.last_name.trim());
      formDataToSend.append('email', formData.email.trim());
      formDataToSend.append('filiere', formData.filiere);
      formDataToSend.append('level', formData.level);
      if (formData.domain) formDataToSend.append('domain', formData.domain);
      if (formData.phone) formDataToSend.append('phone', formData.phone);
      if (formData.date_of_birth) formDataToSend.append('date_of_birth', formData.date_of_birth);
      if (formData.place_of_birth) formDataToSend.append('place_of_birth', formData.place_of_birth);
      if (formData.gender) formDataToSend.append('gender', formData.gender);
      if (formData.nationality) formDataToSend.append('nationality', formData.nationality);
      if (formData.address) formDataToSend.append('address', formData.address);
      if (formData.parent_name) formDataToSend.append('parent_name', formData.parent_name);
      if (formData.parent_phone) formDataToSend.append('parent_phone', formData.parent_phone);
      if (formData.parent_email) formDataToSend.append('parent_email', formData.parent_email);

      // Modalité de paiement
      formDataToSend.append('payment_plan', formData.payment_plan);
      if (formData.payment_plan === 'mensuel') {
        if (formData.monthly_deposit) formDataToSend.append('monthly_deposit', formData.monthly_deposit);
        if (formData.monthly_installment) formDataToSend.append('monthly_installment', formData.monthly_installment);
        if (formData.monthly_months_count) formDataToSend.append('monthly_months_count', formData.monthly_months_count);
      }

      // Photo
      if (photoFile) {
        formDataToSend.append('photo', photoFile);
      }

      await api.put(`/api/v1/students/${studentId}`, formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Informations de l\'étudiant mises à jour avec succès !');
      router.push(`/admin/students/${studentId}`);
    } catch (err: any) {
      console.error('Erreur mise à jour étudiant:', err);
      toast.error(getApiErrorMessage(err, 'Erreur lors de la modification'));
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B00]"></div>
        <p className="text-slate-500 font-medium">Chargement des données de l'étudiant...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Étudiant introuvable</h2>
        <p className="text-sm text-slate-500 mt-2">{error}</p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={loadInitialData}
            className="px-4 py-2 bg-[#FF6B00] text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors"
          >
            Réessayer
          </button>
          <Link
            href="/admin/students"
            className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            Retour à la liste
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Fil d'Ariane & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href={`/admin/students/${studentId}`}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-[#FF6B00] transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Retour à la fiche étudiant</span>
        </Link>
        {formData.matricule && (
          <span className="font-mono text-xs font-bold px-3 py-1 bg-slate-100 text-slate-800 rounded-lg border border-slate-200">
            Matricule : {formData.matricule}
          </span>
        )}
      </div>

      {/* Titre */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Modifier {formData.first_name} {formData.last_name}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Modifiez et synchronisez les informations personnelles, académiques et tarifaires.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photo de profil */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-4 flex items-center gap-2">
            <User size={18} className="text-[#FF6B00]" />
            Photo d'identité
          </h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="relative">
              {photoPreview ? (
                <div className="relative">
                  <img
                    src={photoPreview}
                    alt="Aperçu"
                    className="w-24 h-24 rounded-2xl object-cover border-2 border-orange-200 shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => { setPhotoPreview(null); setPhotoFile(null); }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md transition-colors"
                    title="Supprimer la sélection"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center">
                  <User size={36} className="text-slate-400" />
                </div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-sm">
                <Upload size={14} />
                <span>Changer la photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-slate-500">
                Formats acceptés : JPG, PNG ou WebP (max 5 MB).
              </p>
            </div>
          </div>
        </div>

        {/* Section 1 : Informations Académiques (100% connectées aux filières réelles) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 border-b border-slate-100 pb-3">
            <GraduationCap size={18} className="text-[#FF6B00]" />
            Affectation Académique (Données réelles de l'établissement)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Domaine académique */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Domaine académique
              </label>
              <select
                value={formData.domain}
                onChange={(e) => handleDomainChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              >
                <option value="">🌟 Tous les domaines académiques</option>
                {domaines.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Filière académique (chargée depuis SQLite/PostgreSQL) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Filière académique *
              </label>
              <select
                value={formData.filiere}
                onChange={(e) => handleFiliereChange(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              >
                {!formData.domain ? (
                  // Groupement par domaine si aucun filtre de domaine n'est fixé
                  domaines.map((dom) => {
                    const filsInDom = filieres.filter((f: any) => f.domain === dom);
                    if (filsInDom.length === 0) return null;
                    return (
                      <optgroup key={dom} label={dom}>
                        {filsInDom.map((f: any) => (
                          <option key={f.id} value={f.name}>
                            {f.name}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })
                ) : (
                  availableFilieres.map((f: any) => (
                    <option key={f.id} value={f.name}>
                      {f.name}
                    </option>
                  ))
                )}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                {availableFilieres.length} filière(s) disponible(s) dans votre université
              </p>
            </div>

            {/* Niveau d'études */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Niveau d'études *
              </label>
              <select
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              >
                {availableLevels.map((lvl: string) => (
                  <option key={lvl} value={lvl}>{lvl}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 2 : Identité & Informations Personnelles */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 border-b border-slate-100 pb-3">
            <User size={18} className="text-[#FF6B00]" />
            Identité & Informations Personnelles
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Prénom *</label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
                placeholder="Ex: Moussa"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nom de famille *</label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
                placeholder="Ex: Coulibaly"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Sexe</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              >
                <option value="M">Masculin (M)</option>
                <option value="F">Féminin (F)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Date de naissance</label>
              <input
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Lieu de naissance</label>
              <input
                type="text"
                value={formData.place_of_birth}
                onChange={(e) => setFormData({ ...formData, place_of_birth: e.target.value })}
                placeholder="Ex: Bamako"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nationalité</label>
              <input
                type="text"
                value={formData.nationality}
                onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                placeholder="Ex: Malienne"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              />
            </div>
          </div>
        </div>

        {/* Section 3 : Coordonnées de contact */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Mail size={18} className="text-[#FF6B00]" />
            Coordonnées & Contact de l'Étudiant
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Adresse Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                placeholder="etudiant@domaine.com"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Téléphone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+223 00 00 00 00"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Adresse de résidence</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Quartier, Rue, Ville"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              />
            </div>
          </div>
        </div>

        {/* Section 4 : Parent / Tuteur Légal */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Phone size={18} className="text-[#FF6B00]" />
            Parent ou Tuteur Légal
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nom complet du tuteur</label>
              <input
                type="text"
                value={formData.parent_name}
                onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                placeholder="Ex: Dr. Mamadou Coulibaly"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Téléphone du tuteur</label>
              <input
                type="tel"
                value={formData.parent_phone}
                onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                placeholder="+223 00 00 00 00"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email du tuteur</label>
              <input
                type="email"
                value={formData.parent_email}
                onChange={(e) => setFormData({ ...formData, parent_email: e.target.value })}
                placeholder="tuteur@email.com"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              />
            </div>
          </div>
        </div>

        {/* Section 5 : Modalité de Paiement de la Scolarité */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <CreditCard size={18} className="text-[#FF6B00]" />
              Modalité de Paiement de la Scolarité
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Formule Financière
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, payment_plan: 'tranches' })}
              className={`p-4 rounded-2xl border text-left transition-all ${
                formData.payment_plan === 'tranches'
                  ? 'border-[#FF6B00] bg-orange-50/70 text-slate-900 shadow-sm ring-2 ring-[#FF6B00]/20'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <p className="text-sm font-bold flex items-center gap-2">
                🏛️ Paiement par Tranches Académiques
              </p>
              <p className="text-xs text-slate-500 mt-1">
                3 versements conventionnels (Tranche 1, Tranche 2, Tranche 3).
              </p>
            </button>

            <button
              type="button"
              onClick={() => setFormData({ ...formData, payment_plan: 'mensuel' })}
              className={`p-4 rounded-2xl border text-left transition-all ${
                formData.payment_plan === 'mensuel'
                  ? 'border-emerald-600 bg-emerald-50/70 text-slate-900 shadow-sm ring-2 ring-emerald-600/20'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <p className="text-sm font-bold flex items-center gap-2">
                📅 Modalité Mensuelle
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Acompte à l'inscription + mensualités étalées sur l'année.
              </p>
            </button>
          </div>

          {formData.payment_plan === 'mensuel' && (
            <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-3">
              <span className="text-xs font-bold text-emerald-900">
                Paramètres d'échelonnement mensuel :
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Acompte Inscription (FCFA)
                  </label>
                  <input
                    type="number"
                    value={formData.monthly_deposit}
                    onChange={(e) => setFormData({ ...formData, monthly_deposit: e.target.value })}
                    placeholder="Ex: 350000"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mensualité (FCFA / mois)
                  </label>
                  <input
                    type="number"
                    value={formData.monthly_installment}
                    onChange={(e) => setFormData({ ...formData, monthly_installment: e.target.value })}
                    placeholder="Ex: 100000"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Durée (Nombre de mois)
                  </label>
                  <select
                    value={formData.monthly_months_count}
                    onChange={(e) => setFormData({ ...formData, monthly_months_count: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {[3, 4, 5, 6, 7, 8, 9, 10].map((m) => (
                      <option key={m} value={m}>{m} mois</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Boutons d'Action */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Link
            href={`/admin/students/${studentId}`}
            className="px-5 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            Annuler
          </Link>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#FF6B00] hover:bg-orange-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>{loading ? 'Enregistrement...' : 'Enregistrer les modifications'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}