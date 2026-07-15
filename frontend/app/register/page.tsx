'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, User, Building2, Globe, Briefcase, Phone, Upload, X, Image as ImageIcon } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
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
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Le logo ne doit pas dépasser 2MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Le fichier doit être une image');
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ✅ VALIDATION : Logo obligatoire
    if (!logoFile) {
      toast.error('⚠️ Veuillez uploader le logo de votre université');
      return;
    }

    if (formData.admin_password !== formData.admin_password_confirm) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (formData.admin_password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);

    try {
      // ✅ Construire le FormData avec tous les champs + logo
      const formDataToSend = new FormData();
      formDataToSend.append('university_name', formData.university_name);
      formDataToSend.append('country', formData.country);
      formDataToSend.append('institution_type', formData.institution_type);
      formDataToSend.append('university_email', formData.university_email);
      formDataToSend.append('admin_full_name', formData.admin_full_name);
      formDataToSend.append('admin_email', formData.admin_email);
      formDataToSend.append('admin_phone', formData.admin_phone);
      formDataToSend.append('admin_password', formData.admin_password);
      
      // ✅ Logo obligatoire
      if (logoFile) {
        formDataToSend.append('logo', logoFile);
      }

      await api.post('/api/v1/auth/register', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('✅ Inscription réussie ! Vous pouvez maintenant vous connecter.');
      router.push('/login');
    } catch (error: any) {
      let message = "Erreur lors de l'inscription";
      
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        
        if (Array.isArray(detail)) {
          message = detail.map((err: any) => err.msg).join(', ');
        } else if (typeof detail === 'string') {
          message = detail;
        } else if (detail.msg) {
          message = detail.msg;
        }
      }
      
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      title: 'Sécurisé',
      description: 'Vos données sont protégées'
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      title: 'Intelligent',
      description: "L'IA au service de votre réussite"
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'Accessible',
      description: 'Disponible partout, à tout moment'
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      title: 'Collaboratif',
      description: 'Échangez, collaborez, progressez'
    }
  ];

  const countries = [
    'Sénégal', 'Côte d\'Ivoire', 'Cameroun', 'Mali', 'Burkina Faso',
    'Bénin', 'Togo', 'Niger', 'Gabon', 'Congo', 'RD Congo', 'Tchad',
    'Madagascar', 'Haïti', 'France', 'Belgique', 'Suisse', 'Canada', 'Autre'
  ];

  return (
    <div className="min-h-screen flex relative overflow-hidden" style={{
      background: 'linear-gradient(135deg, #0a1628 0%, #1e3a8a 50%, #3b82f6 100%)'
    }}>
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('/login.png')` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a1628]/90 via-[#0a1628]/70 to-transparent"></div>
      </div>

      {/* Left Side - Content */}
      <div className="hidden lg:flex lg:w-1/2.5 flex-col justify-center p-6 relative z-10 mr-25 -mt-13">
        <div className="flex items-center gap-3 mb-4">
          <img src="/logo.png" alt="UniSphere AI" width={100} height={50} className="rounded-lg" />
          <h1 className="text-4xl font-bold text-white">
            UniSphere <span className="text-[#FF6B00]">AI</span>
          </h1>
        </div>

        <h2 className="text-2xl font-bold text-white mb-4 leading-tight">
          L'intelligence du Savoir,<br />
          <span className="text-[#FF6B00]">La puissance du Numérique</span>
        </h2>

        <p className="text-x0.5 text-slate-300 mb-6 max-w-lg">
          "L'éducation est l'arme la plus puissante qu'on puisse utiliser pour changer le monde."
          <span className="text-[#FF6B00]"> Nelson Mandela</span>
        </p>

        <div className="space-y-6">
          {features.map((feature, idx) => (
            <div key={idx} className="flex items-start gap-4 -mt-3">
              <div className="w-12 h-12 bg-[#FF6B00]/20 rounded-xl flex items-center justify-center text-[#FF6B00] flex-shrink-0">
                {feature.icon}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-0">{feature.title}</h3>
                <p className="text-slate-400 text-sm">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Side - Register Form */}
      <div className="w-full lg:w-5/5 flex items-center justify-center p-5 relative z-10 mt-5 mr-4 overflow-y-auto">
        <div className="w-full max-w-7xl bg-white rounded-3xl shadow-2xl p-8 lg:p-7 my-8">
          <div className="text-center mb-4 -mt-4">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Créer un compte</h2>
            <p className="text-slate-500">Inscrivez votre université en 2 minutes</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* ✅ LAYOUT EN PAYSAGE : 2 colonnes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              
              {/* ========== COLONNE GAUCHE : Université ========== */}
              <div className="space-y-4 mr-8">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 pb-2 border-b border-slate-200">
                  <Building2 size={16} className="text-[#FF6B00]" />
                  Informations de l'université
                </h3>
                
                {/* Logo */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Logo <span className="text-red-500">*</span>
                  </label>
                  
                  {logoPreview ? (
                    <div className="relative inline-block">
                      <img 
                        src={logoPreview} 
                        alt="Preview" 
                        className="w-12 h-12 rounded-lg object-cover border-2 border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={removeLogo}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-md"
                      >
                        <X size={14} />
                      </button>
                      <label className="block mt-1 cursor-pointer">
                        <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                        <span className="text-xs text-[#FF6B00] hover:underline font-medium">Changer</span>
                      </label>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-slate-200 rounded-lg p-2 text-center hover:border-[#FF6B00] transition-colors cursor-pointer block">
                      <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                      <Upload className="mx-auto text-slate-400 mb-1" size={20} />
                      <p className="text-xs text-slate-500">Cliquez pour ajouter </p>
                      <p className="text-xs text-slate-400 mt-1">JPG, PNG (max 2MB)</p>
                    </label>
                  )}
                </div>

                {/* Nom université */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Nom de l'université *</label>
                  <div className="relative">
                    <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      name="university_name"
                      value={formData.university_name}
                      onChange={handleChange}
                      placeholder="Ex: UniSphere_AI"
                      required
                      className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00] text-sm"
                    />
                  </div>
                </div>

                {/* Pays */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Pays *</label>
                  <div className="relative">
                    <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      required
                      className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00] text-sm bg-white appearance-none"
                    >
                      <option value="">Sélectionnez *</option>
                      {countries.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* ========== COLONNE DROITE : Admin + Email ========== */}
              {/* ========== COLONNE DROITE : Admin divisé en 2 ========== */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 pb-2 border-b border-slate-200">
                  <User size={16} className="text-[#FF6B00]" />
                  Compte administrateur
                </h3>

                {/* ✅ Sous-grid : 2 colonnes pour admin */}
                <div className="grid grid-cols-2 gap-4">
                  
                  {/* Sous-colonne gauche : Contact */}
                  <div className="space-y-4">
                    {/* Email université */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Email université *</label>
                      <div className="relative">
                        <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="email"
                          name="university_email"
                          value={formData.university_email}
                          onChange={handleChange}
                          placeholder="contact@universite.com"
                          required
                          className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00] text-sm"
                        />
                      </div>
                    </div>

                    {/* Nom complet admin */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Nom complet *</label>
                      <div className="relative">
                        <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          name="admin_full_name"
                          value={formData.admin_full_name}
                          onChange={handleChange}
                          placeholder="Nom et prénom"
                          required
                          className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00] text-sm"
                        />
                      </div>
                    </div>

                    {/* Email admin */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Email connexion *</label>
                      <div className="relative">
                        <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="email"
                          name="admin_email"
                          value={formData.admin_email}
                          onChange={handleChange}
                          placeholder="admin@universite.com"
                          required
                          className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00] text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sous-colonne droite : Sécurité */}
                  <div className="space-y-4">

                    {/* Téléphone */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Téléphone *</label>
                      <div className="relative">
                        <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="tel"
                          name="admin_phone"
                          value={formData.admin_phone}
                          onChange={handleChange}
                          placeholder="+223 73 34 34 93"
                          required
                          className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00] text-sm"
                        />
                      </div>
                    </div>

                    {/* Mot de passe */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Mot de passe *</label>
                      <div className="relative">
                        <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="admin_password"
                          value={formData.admin_password}
                          onChange={handleChange}
                          placeholder="Min. 6 caractères"
                          required
                          className="w-full pl-10 pr-9 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00] text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* Confirmer mot de passe */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Confirmer *</label>
                      <div className="relative">
                        <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          name="admin_password_confirm"
                          value={formData.admin_password_confirm}
                          onChange={handleChange}
                          placeholder="Retapez le mot de passe"
                          required
                          className="w-full pl-10 pr-9 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00] text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bouton Submit - Pleine largeur en bas */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#FF6B00] to-blue-600 hover:from-[#e55f00] hover:to-blue-700 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg mt-6"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Inscription en cours...
                </span>
              ) : (
                'Créer mon espace universitaire'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Déjà un compte ?{' '}
            <a href="/login" className="text-[#FF6B00] hover:underline font-medium">
              Se connecter
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}