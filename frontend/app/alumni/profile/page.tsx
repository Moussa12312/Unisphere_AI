'use client';
import { useState, useEffect } from 'react';
import {
  Save, User, Briefcase, Award, MapPin, Link, Globe,
  GraduationCap, Star, Lightbulb, AlertTriangle, Heart,
  Loader2, CheckCircle
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function AlumniProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await api.get('/api/v1/alumni/me/profile');
      setProfile(res.data);
      setFormData({
        current_position: res.data.current_position || '',
        company: res.data.company || '',
        activity_domain: res.data.activity_domain || '',
        location: res.data.location || '',
        linkedin_url: res.data.linkedin_url || '',
        website: res.data.website || '',
        career_path: res.data.career_path || '',
        difficulties: res.data.difficulties || '',
        advice: res.data.advice || '',
        skills: res.data.skills || '',
        is_open_to_mentoring: res.data.is_open_to_mentoring || false,
        is_open_to_internship: res.data.is_open_to_internship || false,
        is_visible: res.data.is_visible !== false,
      });
    } catch (error) {
      toast.error('Erreur de chargement du profil');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/v1/alumni/me/profile', formData);
      toast.success('✅ Profil mis à jour !');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={40} className="animate-spin text-[#FF6B00]" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mon profil Alumni</h1>
          <p className="text-slate-500 mt-1">Complétez votre profil pour inspirer les étudiants</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl font-medium transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          Sauvegarder
        </button>
      </div>

      {/* Section Parcours Professionnel */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Briefcase size={20} className="text-[#FF6B00]" />
          Parcours professionnel
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Poste actuel</label>
            <input
              type="text"
              value={formData.current_position || ''}
              onChange={(e) => updateField('current_position', e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              placeholder="Ex: Développeur Full Stack"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Entreprise</label>
            <input
              type="text"
              value={formData.company || ''}
              onChange={(e) => updateField('company', e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              placeholder="Ex: Google"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Domaine d'activité</label>
            <input
              type="text"
              value={formData.activity_domain || ''}
              onChange={(e) => updateField('activity_domain', e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              placeholder="Ex: Technologies"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Localisation</label>
            <input
              type="text"
              value={formData.location || ''}
              onChange={(e) => updateField('location', e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              placeholder="Ex: Bamako, Mali"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">LinkedIn</label>
            <input
              type="url"
              value={formData.linkedin_url || ''}
              onChange={(e) => updateField('linkedin_url', e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              placeholder="https://linkedin.com/in/..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Site web</label>
            <input
              type="url"
              value={formData.website || ''}
              onChange={(e) => updateField('website', e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              placeholder="https://..."
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Compétences (séparées par des virgules)</label>
          <input
            type="text"
            value={formData.skills || ''}
            onChange={(e) => updateField('skills', e.target.value)}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            placeholder="Python, React, Management, Leadership"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Parcours professionnel</label>
          <textarea
            value={formData.career_path || ''}
            onChange={(e) => updateField('career_path', e.target.value)}
            rows={4}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00] resize-none"
            placeholder="Décrivez votre parcours depuis la diplomation..."
          />
        </div>
      </div>

      {/* Section Conseils */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Lightbulb size={20} className="text-[#FF6B00]" />
          Conseils & Expérience
        </h2>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
            <AlertTriangle size={14} />
            Difficultés rencontrées
          </label>
          <textarea
            value={formData.difficulties || ''}
            onChange={(e) => updateField('difficulties', e.target.value)}
            rows={3}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00] resize-none"
            placeholder="Les obstacles que vous avez surmontés..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
            <Star size={14} />
            Conseils aux étudiants
          </label>
          <textarea
            value={formData.advice || ''}
            onChange={(e) => updateField('advice', e.target.value)}
            rows={3}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00] resize-none"
            placeholder="Vos meilleurs conseils pour réussir..."
          />
        </div>
      </div>

      {/* Section Disponibilités */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Heart size={20} className="text-[#FF6B00]" />
          Disponibilités
        </h2>

        <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-50 rounded-xl hover:bg-slate-100">
          <input
            type="checkbox"
            checked={formData.is_open_to_mentoring || false}
            onChange={(e) => updateField('is_open_to_mentoring', e.target.checked)}
            className="w-5 h-5 text-[#FF6B00] rounded focus:ring-[#FF6B00]"
          />
          <div>
            <p className="font-medium text-slate-900">Accepter le mentorat</p>
            <p className="text-sm text-slate-500">Maximum 5 étudiants simultanément</p>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-50 rounded-xl hover:bg-slate-100">
          <input
            type="checkbox"
            checked={formData.is_open_to_internship || false}
            onChange={(e) => updateField('is_open_to_internship', e.target.checked)}
            className="w-5 h-5 text-[#FF6B00] rounded focus:ring-[#FF6B00]"
          />
          <div>
            <p className="font-medium text-slate-900">Proposer des stages</p>
            <p className="text-sm text-slate-500">Signalez que vous pouvez accueillir des stagiaires</p>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-50 rounded-xl hover:bg-slate-100">
          <input
            type="checkbox"
            checked={formData.is_visible || false}
            onChange={(e) => updateField('is_visible', e.target.checked)}
            className="w-5 h-5 text-[#FF6B00] rounded focus:ring-[#FF6B00]"
          />
          <div>
            <p className="font-medium text-slate-900">Profil visible</p>
            <p className="text-sm text-slate-500">Les étudiants peuvent voir votre profil</p>
          </div>
        </label>
      </div>

      {/* Bouton sauvegarder en bas */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl font-medium transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
          Sauvegarder les modifications
        </button>
      </div>
    </div>
  );
}