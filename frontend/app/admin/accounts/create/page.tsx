'use client';

import { useState } from 'react';
import { ArrowLeft, Save, User, Mail, Phone, Lock, Shield } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function CreateAccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '', email: '', phone: '', role: 'gardien', password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/api/v1/users/', formData);
      toast.success('Compte créé avec succès !');
      router.push('/admin/accounts');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link href="/admin/accounts" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#FF6B00] transition-colors">
        <ArrowLeft size={16} /> Retour à la gestion des comptes
      </Link>

      <div>
        <h1 className="text-3xl font-bold text-slate-900">Créer un nouveau compte</h1>
        <p className="text-slate-500 mt-1">Ajoutez un membre du personnel avec des droits d'accès spécifiques.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm max-w-3xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">Nom complet</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input required type="text" value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" placeholder="Ex: Jean Dupont" />
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">Adresse email professionnelle</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input required type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" placeholder="nom@universite.cm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Téléphone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" placeholder="+237 6XX XXX XXX" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Rôle</label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select 
                value={formData.role} 
                onChange={(e) => setFormData({...formData, role: e.target.value})} 
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              >
                <option value="admin">Administrateur</option>
                <option value="accountant">Comptable</option>
                <option value="secretary">Secrétaire</option>
                <option value="censeur">Censeur</option>
                <option value="guard">Gardien</option>
              </select>
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">Mot de passe temporaire</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input required type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" placeholder="Minimum 8 caractères" minLength={8} />
            </div>
          </div>
        </div>
        <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
          <Link href="/admin/accounts" className="px-6 py-3 border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50">Annuler</Link>
          <button type="submit" disabled={loading} className="flex items-center gap-2 px-6 py-3 bg-[#FF6B00] text-white rounded-xl text-sm font-medium hover:bg-[#e55f00] shadow-md disabled:opacity-50">
            <Save size={16} /> {loading ? 'Création...' : 'Créer le compte'}
          </button>
        </div>
      </form>
    </div>
  );
}