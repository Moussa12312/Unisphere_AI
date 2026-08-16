'use client';

import { useState, useEffect } from 'react';
import { User, Mail, Phone, Shield, Save, Camera, Briefcase, Calendar, Bell } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

export default function SecretaryProfilePage() {
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: 'secretary'
  });
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [stats, setStats] = useState({
    messages_unread: 0,
    announcements: 0,
    students: 0
  });

  useEffect(() => {
    fetchProfile();
    fetchStats();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/api/v1/auth/me');
      setUserData({
        full_name: response.data.full_name || '',
        email: response.data.email || '',
        phone: response.data.phone || '',
        role: response.data.role || 'secretary'
      });
    } catch (error) {
      toast.error('Erreur de chargement du profil');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const [msgRes, annRes, stuRes] = await Promise.all([
        api.get('/api/v1/messages/unread').catch(() => ({ data: { unread_count: 0 } })),
        api.get('/api/v1/announcements/').catch(() => ({ data: [] })),
        api.get('/api/v1/students/').catch(() => ({ data: [] }))
      ]);
      
      setStats({
        messages_unread: msgRes.data?.unread_count || 0,
        announcements: Array.isArray(annRes.data) ? annRes.data.length : (annRes.data?.data?.length || 0),
        students: Array.isArray(stuRes.data) ? stuRes.data.length : (stuRes.data?.data?.length || 0)
      });
    } catch (error) {
      console.error('Erreur stats:', error);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await api.put('/api/v1/auth/me', {
        full_name: userData.full_name,
        phone: userData.phone
      });
      
      // Mettre à jour le localStorage
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      storedUser.full_name = userData.full_name;
      storedUser.phone = userData.phone;
      localStorage.setItem('user', JSON.stringify(storedUser));
      
      toast.success('Profil mis à jour');
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
      toast.error('Les nouveaux mots de passe ne correspondent pas.');
      return;
    }
    
    if (passwordData.new.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    
    try {
      await api.put('/api/v1/users/password', {
        current_password: passwordData.current,
        new_password: passwordData.new
      });
      toast.success('Mot de passe modifié avec succès !');
      setPasswordData({ current: '', new: '', confirm: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors du changement de mot de passe');
    }
  };

  const getInitials = () => {
    return userData.full_name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2) || 'S';
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
          <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-3xl font-bold border-2 border-white/30">
            {getInitials()}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold">{userData.full_name}</h2>
            <p className="text-white/90 flex items-center gap-2 mt-1">
              <Briefcase size={14} />
              Secrétaire
            </p>
            <p className="text-white/80 text-sm flex items-center gap-2 mt-1">
              <Mail size={14} />
              {userData.email}
            </p>
          </div>
          <div className="hidden md:flex gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center min-w-[100px]">
              <Bell size={18} className="mx-auto mb-1" />
              <p className="text-2xl font-bold">{stats.messages_unread}</p>
              <p className="text-xs opacity-80">Messages</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center min-w-[100px]">
              <Bell size={18} className="mx-auto mb-1" />
              <p className="text-2xl font-bold">{stats.announcements}</p>
              <p className="text-xs opacity-80">Annonces</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center min-w-[100px]">
              <User size={18} className="mx-auto mb-1" />
              <p className="text-2xl font-bold">{stats.students}</p>
              <p className="text-xs opacity-80">Étudiants</p>
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
                  onChange={(e) => setUserData({ ...userData, full_name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Rôle</label>
                <input
                  type="text"
                  value="Secrétaire"
                  disabled
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-500"
                />
              </div>
            </div>

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
              className="w-full px-4 py-2.5 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
            >
              <Shield size={16} />
              Changer le mot de passe
            </button>
          </form>
        </div>
      </div>

      {/* Statistiques sur mobile */}
      <div className="md:hidden grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <Bell size={20} className="text-[#FF6B00] mx-auto mb-1" />
          <p className="text-2xl font-bold text-slate-900">{stats.messages_unread}</p>
          <p className="text-xs text-slate-500">Messages</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <Bell size={20} className="text-blue-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-slate-900">{stats.announcements}</p>
          <p className="text-xs text-slate-500">Annonces</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <User size={20} className="text-green-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-slate-900">{stats.students}</p>
          <p className="text-xs text-slate-500">Étudiants</p>
        </div>
      </div>
    </div>
  );
}