'use client';

import { useState, useEffect } from 'react';
import { 
  MoreVertical, Shield, UserCog, Users, Plus, Search, 
  Calculator, Key, Info
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await api.get('/api/v1/users/');
      setAccounts(response.data);
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors du chargement des comptes');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Icônes pour les rôles administratifs uniquement
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield size={16} className="text-red-500" />;
      case 'censeur': return <UserCog size={16} className="text-purple-500" />;
      case 'secretary': return <Users size={16} className="text-blue-500" />;
      case 'accountant': return <Calculator size={16} className="text-emerald-600" />;
      case 'guard': return <Key size={16} className="text-orange-500" />;
      default: return <Users size={16} className="text-slate-500" />;
    }
  };

  // ✅ Traductions pour les rôles administratifs uniquement
  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      admin: 'Administrateur',
      secretary: 'Secrétaire',
      censeur: 'Censeur',
      accountant: 'Comptable',
      guard: 'Gardien'
    };
    return roles[role] || role;
  };

  const filteredAccounts = accounts.filter(acc => 
    acc.full_name.toLowerCase().includes(search.toLowerCase()) || 
    acc.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#FF6B00] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gestion des Comptes</h1>
          <p className="text-slate-500 mt-1">Gérez les accès du personnel administratif</p>
        </div>
        <Link href="/admin/accounts/create">
          <button className="flex items-center gap-2 px-4 py-2 bg-[#FF6B00] text-white rounded-lg text-sm font-medium hover:bg-[#e55f00] shadow-md transition-colors">
            <Plus size={16} /> Créer un compte
          </button>
        </Link>
      </div>

      {/* ✅ Message informatif */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Info size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold">Cette page gère uniquement le personnel administratif.</p>
          <p className="text-xs mt-1">
            Pour gérer les <strong>étudiants</strong>, utilisez la page <Link href="/admin/students" className="underline hover:text-blue-900">Étudiants</Link>. 
            Pour les <strong>enseignants</strong>, utilisez la page <Link href="/admin/teachers" className="underline hover:text-blue-900">Enseignants</Link>.
          </p>
        </div>
      </div>

      {/* Recherche */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Rechercher par nom ou email..." 
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-600">Utilisateur</th>
                <th className="px-6 py-4 font-semibold text-slate-600">Rôle</th>
                <th className="px-6 py-4 font-semibold text-slate-600">Statut</th>
                <th className="px-6 py-4 font-semibold text-slate-600">Dernière connexion</th>
                <th className="px-6 py-4 font-semibold text-slate-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAccounts.map((account) => (
                <tr key={account.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{account.full_name}</div>
                    <div className="text-xs text-slate-500">{account.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-700 font-medium">
                      {getRoleIcon(account.role)} 
                      <span>{getRoleLabel(account.role)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      account.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {account.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{account.last_login}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors">
                      <MoreVertical size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredAccounts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    Aucun compte administratif trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}