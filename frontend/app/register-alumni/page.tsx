'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  GraduationCap, Briefcase, User, Mail, Phone, MapPin, Link,
  Globe, Award, CheckCircle, AlertCircle, Loader2, Shield, Heart,
  BookOpen, Calendar, Star, Lightbulb, ChevronRight
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function AlumniRegisterPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [step, setStep] = useState(1); // 1: Identité, 2: Parcours, 3: Pro, 4: Conditions

  const [formData, setFormData] = useState({
    // Étape 1 : Identité
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    password_confirm: '',
    phone: '',
    
    // Étape 2 : Parcours académique
    filiere: '',
    domain: '',
    level: '',
    graduation_year: '',
    promotion: '',
    
    // Étape 3 : Parcours professionnel
    current_position: '',
    company: '',
    activity_domain: '',
    location: '',
    linkedin_url: '',
    career_path: '',
    difficulties: '',
    advice: '',
    skills: '',
    
    // Disponibilités
    is_open_to_mentoring: false,
    is_open_to_internship: false,
    
    // Conditions
    accepted_conditions: false,
  });

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    if (!token) {
      toast.error('Lien d\'invitation invalide');
      setLoading(false);
      return;
    }

    try {
      const res = await api.get(`/api/v1/alumni/invite/${token}`);
      if (res.data.valid) {
        setTokenValid(true);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Lien d\'invitation invalide ou expiré');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep = (currentStep: number) => {
    if (currentStep === 1) {
      if (!formData.first_name || !formData.last_name || !formData.email || !formData.password) {
        toast.error('Veuillez remplir tous les champs obligatoires');
        return false;
      }
      if (formData.password !== formData.password_confirm) {
        toast.error('Les mots de passe ne correspondent pas');
        return false;
      }
      if (formData.password.length < 6) {
        toast.error('Le mot de passe doit contenir au moins 6 caractères');
        return false;
      }
    }
    if (currentStep === 2) {
      if (!formData.filiere || !formData.graduation_year) {
        toast.error('Veuillez renseigner votre filière et année de diplomation');
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!formData.accepted_conditions) {
      toast.error('Vous devez accepter les conditions d\'utilisation');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/api/v1/alumni/register?token=${token}`, {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone || null,
        filiere: formData.filiere || null,
        domain: formData.domain || null,
        level: formData.level || null,
        graduation_year: formData.graduation_year ? parseInt(formData.graduation_year) : null,
        promotion: formData.promotion || null,
        current_position: formData.current_position || null,
        company: formData.company || null,
        activity_domain: formData.activity_domain || null,
        location: formData.location || null,
        linkedin_url: formData.linkedin_url || null,
        career_path: formData.career_path || null,
        difficulties: formData.difficulties || null,
        advice: formData.advice || null,
        skills: formData.skills || null,
        is_open_to_mentoring: formData.is_open_to_mentoring,
        is_open_to_internship: formData.is_open_to_internship,
        accepted_conditions: true,
      });

      toast.success('🎉 Inscription réussie ! Votre profil est en attente de validation.');
      setTimeout(() => router.push('/login'), 2000);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'inscription');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
        <Loader2 size={40} className="animate-spin text-[#FF6B00]" />
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Lien invalide</h2>
          <p className="text-slate-600">
            Ce lien d'invitation est invalide, expiré ou a atteint sa limite d'utilisations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-[#FF6B00] to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Award size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Rejoignez la communauté Alumni</h1>
          <p className="text-slate-600 mt-2">Partagez votre expérience et mentoriez les étudiants</p>
        </div>

        {/* Progress bar */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  step >= s ? 'bg-[#FF6B00] text-white' : 'bg-slate-200 text-slate-500'
                }`}>
                  {step > s ? <CheckCircle size={16} /> : s}
                </div>
                {s < 4 && (
                  <div className={`w-16 sm:w-24 h-1 mx-2 ${step > s ? 'bg-[#FF6B00]' : 'bg-slate-200'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-slate-500">
            <span>Identité</span>
            <span>Parcours</span>
            <span>Carrière</span>
            <span>Conditions</span>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8">
          
          {/* ÉTAPE 1 : Identité */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <User size={20} className="text-[#FF6B00]" />
                Informations personnelles
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Prénom *</label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => handleChange('first_name', e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                    placeholder="Jean"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nom *</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => handleChange('last_name', e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                    placeholder="Dupont"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  placeholder="jean.dupont@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Téléphone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  placeholder="+223 7X XX XX XX"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mot de passe *</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Confirmer *</label>
                  <input
                    type="password"
                    value={formData.password_confirm}
                    onChange={(e) => handleChange('password_confirm', e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ÉTAPE 2 : Parcours académique */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <GraduationCap size={20} className="text-[#FF6B00]" />
                Parcours académique
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Filière *</label>
                  <input
                    type="text"
                    value={formData.filiere}
                    onChange={(e) => handleChange('filiere', e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                    placeholder="Informatique"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Domaine</label>
                  <input
                    type="text"
                    value={formData.domain}
                    onChange={(e) => handleChange('domain', e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                    placeholder="Sciences & Technologies"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Niveau obtenu</label>
                  <select
                    value={formData.level}
                    onChange={(e) => handleChange('level', e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  >
                    <option value="">Sélectionner...</option>
                    <option value="L1">Licence 1</option>
                    <option value="L2">Licence 2</option>
                    <option value="L3">Licence 3</option>
                    <option value="M1">Master 1</option>
                    <option value="M2">Master 2</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Année de diplomation *</label>
                  <input
                    type="number"
                    value={formData.graduation_year}
                    onChange={(e) => handleChange('graduation_year', e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                    placeholder="2023"
                    min="1990"
                    max="2026"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nom de promotion</label>
                <input
                  type="text"
                  value={formData.promotion}
                  onChange={(e) => handleChange('promotion', e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  placeholder="Promotion 2023 - Les Innovateurs"
                />
              </div>
            </div>
          )}

          {/* ÉTAPE 3 : Parcours professionnel */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Briefcase size={20} className="text-[#FF6B00]" />
                Parcours professionnel
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Poste actuel</label>
                  <input
                    type="text"
                    value={formData.current_position}
                    onChange={(e) => handleChange('current_position', e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                    placeholder="Développeur Full Stack"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Entreprise</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => handleChange('company', e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                    placeholder="Google"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Domaine d'activité</label>
                  <input
                    type="text"
                    value={formData.activity_domain}
                    onChange={(e) => handleChange('activity_domain', e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                    placeholder="Technologies de l'information"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Localisation</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => handleChange('location', e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                    placeholder="Bamako, Mali"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">LinkedIn</label>
                  <input
                    type="url"
                    value={formData.linkedin_url}
                    onChange={(e) => handleChange('linkedin_url', e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Compétences (virgule)</label>
                  <input
                    type="text"
                    value={formData.skills}
                    onChange={(e) => handleChange('skills', e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                    placeholder="Python, React, Management"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Parcours professionnel</label>
                <textarea
                  value={formData.career_path}
                  onChange={(e) => handleChange('career_path', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00] resize-none"
                  placeholder="Décrivez votre parcours depuis la diplomation..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Lightbulb size={14} className="inline mr-1" />
                  Difficultés rencontrées
                </label>
                <textarea
                  value={formData.difficulties}
                  onChange={(e) => handleChange('difficulties', e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00] resize-none"
                  placeholder="Les obstacles que vous avez surmontés..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Star size={14} className="inline mr-1" />
                  Conseils aux étudiants
                </label>
                <textarea
                  value={formData.advice}
                  onChange={(e) => handleChange('advice', e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00] resize-none"
                  placeholder="Vos conseils pour réussir..."
                />
              </div>

              {/* Disponibilités */}
              <div className="bg-orange-50 rounded-xl p-4 space-y-3">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Heart size={16} className="text-[#FF6B00]" />
                  Disponibilités
                </h3>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_open_to_mentoring}
                    onChange={(e) => handleChange('is_open_to_mentoring', e.target.checked)}
                    className="w-5 h-5 text-[#FF6B00] rounded focus:ring-[#FF6B00]"
                  />
                  <span className="text-sm text-slate-700">Je suis ouvert au mentorat (max 5 étudiants)</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_open_to_internship}
                    onChange={(e) => handleChange('is_open_to_internship', e.target.checked)}
                    className="w-5 h-5 text-[#FF6B00] rounded focus:ring-[#FF6B00]"
                  />
                  <span className="text-sm text-slate-700">Je peux proposer des stages</span>
                </label>
              </div>
            </div>
          )}

          {/* ÉTAPE 4 : Conditions */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Shield size={20} className="text-[#FF6B00]" />
                Conditions d'utilisation
              </h2>

              <div className="bg-slate-50 rounded-xl p-4 space-y-3 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">En rejoignant la communauté Alumni, vous acceptez :</p>
                
                <div className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Confidentialité :</strong> Ne pas divulguer les données des étudiants à des tiers</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Respect :</strong> Pas de propos inappropriés, harcèlement ou discrimination</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Rôle limité :</strong> Vous ne pouvez PAS modifier les notes ou données des étudiants</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Mentorat bénévole :</strong> Aucune transaction financière via la plateforme</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Signalement :</strong> L'université peut révoquer votre accès à tout moment</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                  <span><strong>RGPD :</strong> Acceptation du traitement de vos données personnelles</span>
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer bg-orange-50 p-4 rounded-xl">
                <input
                  type="checkbox"
                  checked={formData.accepted_conditions}
                  onChange={(e) => handleChange('accepted_conditions', e.target.checked)}
                  className="w-5 h-5 text-[#FF6B00] rounded focus:ring-[#FF6B00]"
                />
                <span className="text-sm font-medium text-slate-900">
                  J'ai lu et j'accepte les conditions d'utilisation
                </span>
              </label>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-800">
                  <AlertCircle size={16} className="inline mr-2" />
                  <strong>Note :</strong> Votre profil sera validé par l'administration avant d'être visible par les étudiants.
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
            {step > 1 ? (
              <button
                onClick={prevStep}
                className="px-6 py-2.5 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
              >
                Précédent
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                onClick={nextStep}
                className="px-6 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
              >
                Suivant
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting || !formData.accepted_conditions}
                className="px-8 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Inscription...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    Finaliser l'inscription
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}