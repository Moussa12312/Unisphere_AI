'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Eye, EyeOff, Mail, Lock, User, Building2, Globe, Phone, Upload, X, CheckCircle2, ArrowRight, ArrowLeft, ShieldCheck, MailCheck
} from 'lucide-react';
import AuthBranding from '@/components/auth/AuthBranding';
import { useToast } from '@/components/ToastProvider';
import authService from '@/services/authService';
import api from '@/lib/api';

type FormData = {
  university_name: string;
  country: string;
  institution_type: string;
  university_email: string;
  admin_full_name: string;
  admin_email: string;
  admin_phone: string;
  admin_password: string;
  admin_password_confirm: string;
};

type FieldErrors = Partial<Record<keyof FormData | 'logo' | 'terms', string>>;

const COUNTRIES = [
  'Sénégal', 'Côte d\'Ivoire', 'Cameroun', 'Mali', 'Burkina Faso',
  'Bénin', 'Togo', 'Niger', 'Gabon', 'Congo', 'RD Congo', 'Tchad',
  'Madagascar', 'Haïti', 'France', 'Belgique', 'Suisse', 'Canada', 'Autre',
];

const INSTITUTION_TYPES = [
  'Université publique',
  'Université privée',
  'Institut supérieur',
  'École de formation',
  'Autre',
];

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 25, label: 'Faible', color: 'bg-red-500' };
  if (score === 2) return { score: 50, label: 'Moyen', color: 'bg-orange-500' };
  if (score === 3) return { score: 75, label: 'Bon', color: 'bg-yellow-500' };
  return { score: 100, label: 'Fort', color: 'bg-green-500' };
}

export default function RegisterPage() {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [emailSentNotice, setEmailSentNotice] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    university_name: '',
    country: '',
    institution_type: '',
    university_email: '',
    admin_full_name: '',
    admin_email: '',
    admin_phone: '',
    admin_password: '',
    admin_password_confirm: '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (authService.isAuthenticated()) {
      const user = authService.getCurrentUser();
      if (user?.role) {
        router.replace(authService.getDashboardRoute(user.role));
      }
    }
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name as keyof FieldErrors]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Le logo ne doit pas dépasser 2 Mo');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Le fichier doit être une image (JPG, PNG)');
      return;
    }

    setLogoFile(file);
    setFieldErrors((prev) => ({ ...prev, logo: undefined }));
    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  // ✅ Validation Étape 1 : Administrateur
  const validateStep1 = () => {
    const errors: FieldErrors = {};
    if (!formData.admin_full_name.trim()) errors.admin_full_name = 'Nom requis';

    if (!formData.admin_email.trim()) {
      errors.admin_email = 'Email requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.admin_email)) {
      errors.admin_email = 'Email invalide';
    }

    if (!formData.admin_phone.trim()) {
      errors.admin_phone = 'Téléphone requis';
    } else if (!/^\+?[\d\s\-().]{8,}$/.test(formData.admin_phone)) {
      errors.admin_phone = 'Numéro invalide';
    }

    if (!formData.admin_password) {
      errors.admin_password = 'Mot de passe requis';
    } else if (formData.admin_password.length < 8) {
      errors.admin_password = 'Minimum 8 caractères';
    }

    if (formData.admin_password !== formData.admin_password_confirm) {
      errors.admin_password_confirm = 'Les mots de passe ne correspondent pas';
    }

    if (!acceptedTerms) errors.terms = 'Vous devez accepter les conditions';

    return errors;
  };

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateStep1();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error('Veuillez corriger les champs administrateur');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/v1/auth/register-step1', {
        admin_full_name: formData.admin_full_name,
        admin_email: formData.admin_email,
        admin_phone: formData.admin_phone,
        admin_password: formData.admin_password,
      });

      if (response.data.email_verification_required) {
        setEmailSentNotice(true);
        toast.success('Compte administrateur validé ! Un email de confirmation a été envoyé.');
      } else {
        setStep(2);
        toast.success('Compte administrateur validé ! Passez à la configuration de l\'université.');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la validation de l\'étape 1');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Finalisation Étape 2 : Université
  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: FieldErrors = {};
    if (!formData.university_name.trim()) errors.university_name = 'Nom de l\'université requis';
    if (!formData.country) errors.country = 'Pays requis';
    if (!formData.institution_type) errors.institution_type = 'Type requis';
    if (!formData.university_email.trim()) errors.university_email = 'Email officiel requis';
    if (!logoFile) errors.logo = 'Logo de l\'université obligatoire';

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error('Veuillez compléter toutes les informations de l\'université');
      return;
    }

    if (!logoFile) return;

    setLoading(true);

    try {
      await authService.register({
        university_name: formData.university_name,
        country: formData.country,
        institution_type: formData.institution_type,
        university_email: formData.university_email,
        admin_full_name: formData.admin_full_name,
        admin_email: formData.admin_email,
        admin_phone: formData.admin_phone,
        admin_password: formData.admin_password,
        logo: logoFile,
      });

      toast.success('Inscription réussie ! Votre compte et votre université sont prêts.', { duration: 8000 });
      router.push(`/login?message=${encodeURIComponent('Votre inscription est finalisée ! Connectez-vous avec vos identifiants.')}`);
    } catch (error) {
      toast.error(authService.parseError(error, "Erreur lors de l'enregistrement de l'université"));
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = formData.admin_password
    ? getPasswordStrength(formData.admin_password)
    : null;

  const inputClass = (field: keyof FieldErrors) =>
    `w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00] text-sm ${fieldErrors[field] ? 'border-red-400 bg-red-50' : 'border-slate-200'
    }`;

  return (
    <div
      className="min-h-screen flex relative overflow-hidden -mt-10"
      style={{ background: 'linear-gradient(135deg, #0a1628 0%, #1e3a8a 50%, #3b82f6 100%)' }}
    >
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/login.png')" }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a1628]/90 via-[#0a1628]/70 to-transparent" />
      </div>

      {/* Colonne gauche branding */}
      <AuthBranding
        badgeText="NOUVELLE UNIVERSITÉ"
        headline="Digitalisez la gestion de votre université dès aujourd'hui"
        subheadline="Inscription en 2 étapes rapides pour un accès illimité à UniSphere AI."
      />

      {/* Formulaire droit */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative z-10 my-auto">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-8 max-h-[90vh] overflow-y-auto">

          {/* Stepper Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step === 1 ? 'bg-[#FF6B00] text-white' : 'bg-emerald-500 text-white'}`}>
                {step === 1 ? '1' : <CheckCircle2 size={18} />}
              </div>
              <span className={`text-xs font-semibold ${step === 1 ? 'text-slate-900' : 'text-slate-400'}`}>Compte Admin</span>
            </div>
            <div className="h-0.5 flex-1 mx-4 bg-slate-200" />
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step === 2 ? 'bg-[#FF6B00] text-white' : 'bg-slate-200 text-slate-600'}`}>
                2
              </div>
              <span className={`text-xs font-semibold ${step === 2 ? 'text-slate-900' : 'text-slate-400'}`}>Université</span>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-900">
            {step === 1 ? 'Étape 1 : Vos accès administrateur' : 'Étape 2 : Votre Université'}
          </h2>
          <p className="text-slate-500 text-sm mt-1 mb-6">
            {step === 1
              ? 'Renseignez vos identifiants administrateur pour valider votre compte.'
              : 'Configurez les détails de votre établissement et téléversez votre logo.'}
          </p>

          {/* NOTICE VÉRIFICATION EMAIL S'IL ENVOIE UN LIEN */}
          {emailSentNotice ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-6 text-center space-y-4">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-600">
                <MailCheck size={28} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Vérifiez votre boîte mail</h3>
              <p className="text-sm text-slate-600">
                Un email de confirmation a été envoyé à <strong className="text-slate-900">{formData.admin_email}</strong>.
                Consultez votre boîte mail et suivez le lien pour débloquer la suite.
              </p>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white font-semibold rounded-xl text-sm transition-all"
              >
                J'ai confirmé mon email — Continuer à l'étape 2 <ArrowRight size={16} className="inline ml-1" />
              </button>
            </div>
          ) : step === 1 ? (
            /* ==========================================
               ÉTAPE 1 : COMPTE ADMIN
               ========================================== */
            <form onSubmit={handleStep1Submit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nom complet administrateur *</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    name="admin_full_name"
                    value={formData.admin_full_name}
                    onChange={handleChange}
                    placeholder="Dr. Moussa Coulibaly"
                    className={inputClass('admin_full_name')}
                  />
                </div>
                {fieldErrors.admin_full_name && <p className="text-xs text-red-500 mt-1">{fieldErrors.admin_full_name}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Email administrateur *</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    name="admin_email"
                    value={formData.admin_email}
                    onChange={handleChange}
                    placeholder="admin@universite.edu"
                    className={inputClass('admin_email')}
                  />
                </div>
                {fieldErrors.admin_email && <p className="text-xs text-red-500 mt-1">{fieldErrors.admin_email}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Téléphone mobile *</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    name="admin_phone"
                    value={formData.admin_phone}
                    onChange={handleChange}
                    placeholder="+221 77 000 00 00"
                    className={inputClass('admin_phone')}
                  />
                </div>
                {fieldErrors.admin_phone && <p className="text-xs text-red-500 mt-1">{fieldErrors.admin_phone}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Mot de passe secret *</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="admin_password"
                    value={formData.admin_password}
                    onChange={handleChange}
                    placeholder="Minimum 8 caractères"
                    className={inputClass('admin_password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {passwordStrength && (
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1 flex-1 bg-slate-200 rounded-full overflow-hidden">
                      <div className={`h-full ${passwordStrength.color}`} style={{ width: `${passwordStrength.score}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">{passwordStrength.label}</span>
                  </div>
                )}
                {fieldErrors.admin_password && <p className="text-xs text-red-500 mt-1">{fieldErrors.admin_password}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Confirmer le mot de passe *</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="admin_password_confirm"
                    value={formData.admin_password_confirm}
                    onChange={handleChange}
                    placeholder="Répétez le mot de passe"
                    className={inputClass('admin_password_confirm')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {fieldErrors.admin_password_confirm && <p className="text-xs text-red-500 mt-1">{fieldErrors.admin_password_confirm}</p>}
              </div>

              <div className="flex items-start gap-2 pt-2">
                <input
                  type="checkbox"
                  id="terms"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 rounded text-[#FF6B00] focus:ring-[#FF6B00]"
                />
                <label htmlFor="terms" className="text-xs text-slate-600">
                  J'accepte les <Link href="#" className="text-[#FF6B00] hover:underline">conditions d'utilisation</Link> et la politique de confidentialité.
                </label>
              </div>
              {fieldErrors.terms && <p className="text-xs text-red-500">{fieldErrors.terms}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 flex items-center justify-center gap-2 bg-gradient-to-r from-[#FF6B00] to-blue-600 hover:from-[#e55f00] hover:to-blue-700 text-white font-semibold py-3 rounded-xl transition-all shadow-lg text-sm"
              >
                {loading ? 'Validation en cours...' : 'Continuer vers l\'étape 2'}
                <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            /* ==========================================
               ÉTAPE 2 : CONFIGURATION UNIVERSITÉ
               ========================================== */
            <form onSubmit={handleStep2Submit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nom officiel de l'université *</label>
                <div className="relative">
                  <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    name="university_name"
                    value={formData.university_name}
                    onChange={handleChange}
                    placeholder="Université Cheikh Anta Diop"
                    className={inputClass('university_name')}
                  />
                </div>
                {fieldErrors.university_name && <p className="text-xs text-red-500 mt-1">{fieldErrors.university_name}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Pays *</label>
                  <select
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    className={inputClass('country')}
                  >
                    <option value="">Sélectionner...</option>
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  {fieldErrors.country && <p className="text-xs text-red-500 mt-1">{fieldErrors.country}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Type d'établissement *</label>
                  <select
                    name="institution_type"
                    value={formData.institution_type}
                    onChange={handleChange}
                    className={inputClass('institution_type')}
                  >
                    <option value="">Sélectionner...</option>
                    {INSTITUTION_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  {fieldErrors.institution_type && <p className="text-xs text-red-500 mt-1">{fieldErrors.institution_type}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Email officiel de l'établissement *</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    name="university_email"
                    value={formData.university_email}
                    onChange={handleChange}
                    placeholder="contact@ucad.edu.sn"
                    className={inputClass('university_email')}
                  />
                </div>
                {fieldErrors.university_email && <p className="text-xs text-red-500 mt-1">{fieldErrors.university_email}</p>}
              </div>

              {/* UPLOAD LOGO */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Logo officiel de l'université *</label>
                {logoPreview ? (
                  <div className="relative w-full h-24 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center p-2">
                    <img src={logoPreview} alt="Logo preview" className="max-h-full object-contain" />
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-200 hover:border-[#FF6B00] rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer bg-slate-50 transition-colors">
                    <Upload size={24} className="text-[#FF6B00] mb-1" />
                    <span className="text-xs font-medium text-slate-700">Cliquez pour importer le logo</span>
                    <span className="text-[10px] text-slate-400">PNG, JPG (Max 2 Mo)</span>
                    <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                  </label>
                )}
                {fieldErrors.logo && <p className="text-xs text-red-500 mt-1">{fieldErrors.logo}</p>}
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-1"
                >
                  <ArrowLeft size={16} /> Étape précédente
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-gradient-to-r from-[#FF6B00] to-blue-600 hover:from-[#e55f00] hover:to-blue-700 text-white font-semibold rounded-xl text-sm transition-all shadow-lg"
                >
                  {loading ? 'Création de l\'université...' : 'Finaliser l\'inscription'}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center text-xs text-slate-500">
            Déjà inscrit ?{' '}
            <Link href="/login" className="text-[#FF6B00] font-semibold hover:underline">
              Se connecter à mon espace
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}