'use client';

import { useState, useEffect } from 'react';
import {
  User, Mail, Phone, GraduationCap, BookOpen,
  Save, Lock, Loader2, Award, Calendar
} from 'lucide-react';
import api from '@/lib/api';
import { API_BASE_URL } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

export default function TeacherProfilePage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/v1/teacher/profile');
      setProfile(response.data);
    } catch (error) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.old_password || !passwordData.new_password) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    if (passwordData.new_password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setSavingPassword(true);
    try {
      await api.put('/api/v1/teacher/password', {
        old_password: passwordData.old_password,
        new_password: passwordData.new_password
      });
      toast.success('Mot de passe modifié avec succès !');
      setShowPasswordModal(false);
      setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-[#FF6B00]" size={32} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Profil non trouvé</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <User size={24} className="text-white" />
          </div>
          Mon profil
        </h1>
        <p className="text-slate-500 mt-1">Vos informations personnelles</p>
      </div>

      {/* Carte profil */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Bannière */}
        <div className="h-32 bg-gradient-to-r from-[#FF6B00] to-orange-500 relative">
          <div className="absolute -bottom-12 left-6">
            <div className="w-24 h-24 bg-white rounded-2xl border-4 border-white shadow-lg flex items-center justify-center">
              {profile.photo ? (
                <img src={`${API_BASE_URL}/uploads/${profile.photo}`} alt="Photo" className="w-full h-full object-cover rounded-xl" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#FF6B00] to-orange-500 rounded-xl flex items-center justify-center text-white text-3xl font-bold">
                  {profile.first_name?.charAt(0)}{profile.last_name?.charAt(0)}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pt-16 p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                {profile.first_name} {profile.last_name}
              </h2>
              <p className="text-slate-500 mt-1">{profile.speciality}</p>
            </div>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"
            >
              <Lock size={16} />
              Changer mot de passe
            </button>
          </div>

          {/* Informations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <Mail size={16} className="text-[#FF6B00]" />
                <p className="text-xs font-medium text-slate-500 uppercase">Email</p>
              </div>
              <p className="text-sm font-semibold text-slate-900">{profile.email}</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <Phone size={16} className="text-[#FF6B00]" />
                <p className="text-xs font-medium text-slate-500 uppercase">Téléphone</p>
              </div>
              <p className="text-sm font-semibold text-slate-900">{profile.phone || 'Non renseigné'}</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <BookOpen size={16} className="text-[#FF6B00]" />
                <p className="text-xs font-medium text-slate-500 uppercase">Département</p>
              </div>
              <p className="text-sm font-semibold text-slate-900">{profile.department}</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <Award size={16} className="text-[#FF6B00]" />
                <p className="text-xs font-medium text-slate-500 uppercase">Spécialité</p>
              </div>
              <p className="text-sm font-semibold text-slate-900">{profile.speciality}</p>
            </div>
          </div>

          {/* QR Code */}
          {profile.qr_code && (
            <div className="mt-6 p-6 bg-slate-50 rounded-xl border border-slate-200">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <GraduationCap size={18} className="text-[#FF6B00]" />
                Mon QR Code
              </h3>
              <div className="flex items-center gap-6">
                <img
                  src={`${API_BASE_URL}/qr_codes/${profile.qr_code}`}
                  alt="QR Code"
                  className="w-32 h-32 bg-white p-2 rounded-xl border border-slate-200"
                />
                <div>
                  <p className="text-sm text-slate-600 mb-2">
                    Ce QR code vous identifie dans l'université. Vous pouvez l'utiliser pour :
                  </p>
                  <ul className="text-xs text-slate-500 space-y-1">
                    <li>• Marquer votre présence</li>
                    <li>• Accéder aux salles</li>
                    <li>• Vous identifier rapidement</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal changement mot de passe */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">Changer le mot de passe</h2>
              <button onClick={() => setShowPasswordModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Ancien mot de passe</label>
                <input
                  type="password"
                  value={passwordData.old_password}
                  onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nouveau mot de passe</label>
                <input
                  type="password"
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Confirmer le mot de passe</label>
                <input
                  type="password"
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowPasswordModal(false)}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleChangePassword}
                disabled={savingPassword}
                className="flex-1 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {savingPassword ? 'En cours...' : 'Modifier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}