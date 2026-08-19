'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building2, User, Mail, Phone, Lock, Globe, CheckCircle2, Copy, ArrowLeft, Loader2, KeyRound } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

const COUNTRIES = ['Sénégal', "Côte d'Ivoire", 'Cameroun', 'Mali', 'Burkina Faso', 'Bénin', 'Togo', 'Niger', 'Gabon', 'Congo', 'RD Congo', 'Tchad', 'Madagascar', 'Haïti', 'France', 'Belgique', 'Suisse', 'Canada', 'Autre'];
const INSTITUTION_TYPES = ['Université publique', 'Université privée', 'Institut supérieur', 'École de formation', 'Lycée privé', 'Autre'];

const EMPTY = {
  university_name: '', country: '', institution_type: '', university_email: '', phone: '', custom_domain: '',
  admin_full_name: '', admin_email: '', admin_phone: '', admin_password: '',
};

export default function NewUniversityPage() {
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{ email: string; password: string; name: string } | null>(null);
  const [form, setForm] = useState(EMPTY);

  const set = (name: string, value: string) => setForm((p) => ({ ...p, [name]: value }));

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let pwd = 'Aa1!';
    for (let i = 0; i < 8; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    set('admin_password', pwd);
    toast.success('Mot de passe généré !');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.admin_password.length < 8) { toast.error('Mot de passe : 8 caractères minimum'); return; }
    setLoading(true);
    try {
      await api.post('/api/v1/superadmin/universities', {
        university_name: form.university_name,
        country: form.country || null,
        institution_type: form.institution_type || null,
        university_email: form.university_email || null,
        phone: form.phone || null,
        custom_domain: form.custom_domain || null,
        admin_full_name: form.admin_full_name,
        admin_email: form.admin_email,
        admin_phone: form.admin_phone || null,
        admin_password: form.admin_password,
      });
      setCreated({ email: form.admin_email, password: form.admin_password, name: form.university_name });
      toast.success('Université créée !');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success('Copié !'); };

  const inputClass = 'w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  if (created) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="text-emerald-600" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Université {created.name} créée !</h2>
          <p className="text-sm text-slate-500 mb-6">Partagez ces identifiants avec votre client. Ils ne seront plus affichés ensuite.</p>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-left space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div><p className="text-xs text-slate-500">Email administrateur</p><p className="font-semibold text-slate-900">{created.email}</p></div>
              <button onClick={() => copy(created.email)} className="p-2 hover:bg-slate-200 rounded-lg"><Copy size={16} /></button>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div><p className="text-xs text-slate-500">Mot de passe</p><p className="font-semibold text-slate-900 font-mono">{created.password}</p></div>
              <button onClick={() => copy(created.password)} className="p-2 hover:bg-slate-200 rounded-lg"><Copy size={16} /></button>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div><p className="text-xs text-slate-500">URL de connexion</p><p className="font-semibold text-slate-900">{origin}/login</p></div>
              <button onClick={() => copy(origin + '/login')} className="p-2 hover:bg-slate-200 rounded-lg"><Copy size={16} /></button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <button onClick={() => { setCreated(null); setForm(EMPTY); }} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50">Créer une autre université</button>
            <Link href="/superadmin/universities" className="flex-1 py-2.5 bg-[#FF6B00] text-white rounded-xl text-sm font-semibold hover:bg-[#e55f00] text-center">Voir la liste</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/superadmin/universities" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-4"><ArrowLeft size={16} /> Retour</Link>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Créer une université</h2>
        <p className="text-sm text-slate-500 mb-6">Créez l'espace universitaire et les identifiants administrateur de votre client.</p>

        <form onSubmit={submit} className="space-y-8">
          <div>
            <h3 className="text-xs font-bold text-[#FF6B00] uppercase tracking-widest mb-3 flex items-center gap-2"><Building2 size={15} /> Université</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 relative">
                <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={form.university_name} onChange={(e) => set('university_name', e.target.value)} placeholder="Nom officiel (ex: École de Commerce EcoB)" className={inputClass} required />
              </div>
              <div className="relative">
                <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select value={form.country} onChange={(e) => set('country', e.target.value)} className={inputClass}>
                  <option value="">Pays...</option>
                  {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="relative">
                <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select value={form.institution_type} onChange={(e) => set('institution_type', e.target.value)} className={inputClass}>
                  <option value="">Type...</option>
                  {INSTITUTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="email" value={form.university_email} onChange={(e) => set('university_email', e.target.value)} placeholder="Email officiel (contact@ecob.com)" className={inputClass} />
              </div>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+221 77 000 00 00" className={inputClass} />
              </div>
              <div className="sm:col-span-2 relative">
                <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={form.custom_domain} onChange={(e) => set('custom_domain', e.target.value)} placeholder="Domaine personnalisé (ex: ecob.com) — optionnel" className={inputClass} />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-[#FF6B00] uppercase tracking-widest mb-3 flex items-center gap-2"><User size={15} /> Compte administrateur</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={form.admin_full_name} onChange={(e) => set('admin_full_name', e.target.value)} placeholder="Nom complet (ex: Dr. Moussa Coulibaly)" className={inputClass} required />
              </div>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="email" value={form.admin_email} onChange={(e) => set('admin_email', e.target.value)} placeholder="Email de connexion (admin@ecob.com)" className={inputClass} required />
              </div>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={form.admin_phone} onChange={(e) => set('admin_phone', e.target.value)} placeholder="+221 77 000 00 00" className={inputClass} />
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={form.admin_password} onChange={(e) => set('admin_password', e.target.value)} placeholder="Mot de passe (8 car. min)" className={inputClass} required />
                <button type="button" onClick={generatePassword} title="Générer un mot de passe" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#FF6B00]"><KeyRound size={16} /></button>
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full py-3 bg-gradient-to-r from-[#FF6B00] to-blue-600 hover:from-[#e55f00] hover:to-blue-700 text-white font-semibold rounded-xl text-sm transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            {loading ? 'Création en cours...' : "Créer l'université et ses accès"}
          </button>
        </form>
      </div>
    </div>
  );
}
