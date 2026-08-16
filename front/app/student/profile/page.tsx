'use client';

import { useState, useEffect } from 'react';
import { 
  User, Mail, Phone, Shield, Save, Camera, Briefcase, Calendar, Bell,
  GraduationCap, Award, BookOpen, TrendingUp, CreditCard, MapPin,
  Loader2, CheckCircle
} from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

export default function StudentProfilePage() {
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);
  
  const [userData, setUserData] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: 'student'
  });
  
  const [studentData, setStudentData] = useState<any>(null);
  
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  
  const [stats, setStats] = useState({
    average_grade: 0,
    attendance_rate: 0,
    courses_count: 0,
    payments_count: 0
  });

  useEffect(() => {
    fetchProfile();
    fetchStats();
  }, []);

  const fetchProfile = async () => {
    try {
      // Récupérer les infos du user
      const userRes = await api.get('/api/v1/auth/me');
      setUserData({
        full_name: userRes.data.full_name || '',
        email: userRes.data.email || '',
        phone: userRes.data.phone || '',
        role: userRes.data.role || 'student'
      });
      
      // Récupérer les infos de l'étudiant
      const studentRes = await api.get('/api/v1/students/me');
      setStudentData(studentRes.data);
      
      // Mettre à jour avec les infos étudiant si disponibles
      if (studentRes.data) {
        setUserData(prev => ({
          ...prev,
          phone: studentRes.data.phone || prev.phone
        }));
      }
    } catch (error) {
      toast.error('Erreur de chargement du profil');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const dashboardRes = await api.get('/api/v1/students/me/dashboard');
      const data = dashboardRes.data;
      
      setStats({
        average_grade: data.average_grade || 0,
        attendance_rate: data.attendance_rate || 0,
        courses_count: data.recent_grades?.length || 0,
        payments_count: 0
      });
      
      // Récupérer les paiements
      try {
        const paymentsRes = await api.get('/api/v1/students/me/payments');
        setStats(prev => ({
          ...prev,
          payments_count: Array.isArray(paymentsRes.data) ? paymentsRes.data.length : 0
        }));
      } catch (e) {
        console.error('Erreur paiements:', e);
      }
    } catch (error) {
      console.error('Erreur stats:', error);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      // Mettre à jour le téléphone via l'endpoint étudiant
      const formData = new FormData();
      formData.append('phone', userData.phone);
      
      await api.put('/api/v1/students/me', formData);
      
      // Mettre à jour le localStorage
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      storedUser.phone = userData.phone;
      localStorage.setItem('user', JSON.stringify(storedUser));
      
      toast.success('Profil mis à jour avec succès');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur de mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passwordData.current || !passwordData.new || !passwordData.confirm) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    
    if (passwordData.new !== passwordData.confirm) {
      toast.error('Les nouveaux mots de passe ne correspondent pas');
      return;
    }
    
    if (passwordData.new.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    
    setChangingPwd(true);
    try {
      const formData = new FormData();
      formData.append('current_password', passwordData.current);
      formData.append('new_password', passwordData.new);
      
      await api.post('/api/v1/students/me/change-password', formData);
      
      toast.success('Mot de passe modifié avec succès !');
      setPasswordData({ current: '', new: '', confirm: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors du changement de mot de passe');
    } finally {
      setChangingPwd(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      await api.post('/api/v1/students/me/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Photo mise à jour avec succès');
      fetchProfile();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'upload');
    }
  };

  const getInitials = () => {
    return userData.full_name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2) || 'E';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B00] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Mon Profil</h1>
        <p className="text-slate-500 mt-1">Gérez vos informations personnelles</p>
      </div>

      {/* Carte de profil en haut */}
      <div className="bg-gradient-to-r from-[#FF6B00] to-orange-500 rounded-2xl p-6 text-white shadow-lg shadow-orange-500/30">
        <div className="flex items-center gap-5">
          <div className="relative group">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-3xl font-bold border-2 border-white/30 overflow-hidden">
              {studentData?.photo ? (
                <img 
                  src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/uploads/${studentData.photo}`}
                  alt="Photo de profil"
                  className="w-full h-full object-cover"
                />
              ) : (
                getInitials()
              )}
            </div>
            <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer">
              <Camera size={24} />
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold">{userData.full_name}</h2>
            <p className="text-white/90 flex items-center gap-2 mt-1">
              <GraduationCap size={14} />
              Étudiant{studentData?.filiere ? ` - ${studentData.filiere}` : ''}
            </p>
            <p className="text-white/80 text-sm flex items-center gap-2 mt-1">
              <Mail size={14} />
              {userData.email}
            </p>
            {studentData?.matricule && (
              <p className="text-white/80 text-sm flex items-center gap-2 mt-1">
                <CreditCard size={14} />
                {studentData.matricule}
              </p>
            )}
          </div>
          <div className="hidden md:flex gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center min-w-[100px]">
              <TrendingUp size={18} className="mx-auto mb-1" />
              <p className="text-2xl font-bold">{stats.average_grade.toFixed(1)}</p>
              <p className="text-xs opacity-80">Moyenne</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center min-w-[100px]">
              <Calendar size={18} className="mx-auto mb-1" />
              <p className="text-2xl font-bold">{stats.attendance_rate}%</p>
              <p className="text-xs opacity-80">Présence</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center min-w-[100px]">
              <BookOpen size={18} className="mx-auto mb-1" />
              <p className="text-2xl font-bold">{stats.courses_count}</p>
              <p className="text-xs opacity-80">Cours</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informations personnelles */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <User size={20} className="text-[#FF6B00]" />
            Informations personnelles
          </h3>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nom complet</label>
                <input
                  type="text"
                  value={userData.full_name}
                  disabled
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-500"
                />
                <p className="text-xs text-slate-400 mt-1">Le nom ne peut pas être modifié</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Matricule</label>
                <input
                  type="text"
                  value={studentData?.matricule || ''}
                  disabled
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <Mail size={14} className="inline mr-1" /> Email
                </label>
                <input
                  type="email"
                  value={userData.email}
                  disabled
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-500"
                />
                <p className="text-xs text-slate-400 mt-1">L'email ne peut pas être modifié</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <Phone size={14} className="inline mr-1" /> Téléphone
                </label>
                <input
                  type="tel"
                  value={userData.phone}
                  onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
                  placeholder="+223 7X XX XX XX"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Filière</label>
                <input
                  type="text"
                  value={studentData?.filiere || ''}
                  disabled
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Niveau</label>
                <input
                  type="text"
                  value={studentData?.level || ''}
                  disabled
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-500"
                />
              </div>
            </div>

            {studentData?.address !== undefined && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <MapPin size={14} className="inline mr-1" /> Adresse
                </label>
                <input
                  type="text"
                  value={studentData?.address || ''}
                  disabled
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-500"
                />
              </div>
            )}

            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#FF6B00] text-white rounded-lg font-medium hover:bg-[#e55f00] disabled:opacity-50 transition-colors shadow-md shadow-orange-500/20"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Save size={16} />
              )}
              {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </div>
        </div>

        {/* Changer mot de passe */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Shield size={20} className="text-[#FF6B00]" />
            Sécurité
          </h3>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Mot de passe actuel</label>
              <input
                type="password"
                value={passwordData.current}
                onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Nouveau mot de passe</label>
              <input
                type="password"
                value={passwordData.new}
                onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirmer</label>
              <input
                type="password"
                value={passwordData.confirm}
                onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
              />
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-700">
                💡 Le mot de passe doit contenir au moins 6 caractères
              </p>
            </div>

            <button
              type="submit"
              disabled={changingPwd}
              className="w-full px-4 py-2.5 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {changingPwd ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Shield size={16} />
              )}
              Changer le mot de passe
            </button>
          </form>
        </div>
      </div>

      {/* Statistiques sur mobile */}
      <div className="md:hidden grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <TrendingUp size={20} className="text-[#FF6B00] mx-auto mb-1" />
          <p className="text-2xl font-bold text-slate-900">{stats.average_grade.toFixed(1)}</p>
          <p className="text-xs text-slate-500">Moyenne</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <Calendar size={20} className="text-blue-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-slate-900">{stats.attendance_rate}%</p>
          <p className="text-xs text-slate-500">Présence</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <BookOpen size={20} className="text-green-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-slate-900">{stats.courses_count}</p>
          <p className="text-xs text-slate-500">Cours</p>
        </div>
      </div>
    </div>
  );
}