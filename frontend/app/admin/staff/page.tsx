'use client';
import { useState, useEffect } from 'react';
import { Users, FileText, CheckCircle, CreditCard, Shield, Plus, Search, ShieldCheck, Trash2 } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/hooks/useConfirm';
import AddStaffModal from '@/components/admin/AddStaffModal';
import EditStaffModal from '@/components/admin/EditStaffModal';

interface StaffMember {
  id: number;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface StaffStats {
  admin: number;
  secretary: number;
  censeur: number;
  accountant: number;
  guard: number;
  total: number;
}

const roleConfig: Record<string, { icon: any; color: string; label: string; permissions: string[] }> = {
  admin: {
    icon: ShieldCheck,
    color: 'bg-red-100 text-red-600',
    label: 'Administrateur',
    permissions: ['Gérer tout', 'Créer comptes', 'Voir rapports']
  },
  secretary: {
    icon: FileText,
    color: 'bg-blue-100 text-blue-600',
    label: 'Secrétaire',
    permissions: ['Gérer étudiants', 'Saisir notes', 'Gérer présences']
  },
  censeur: {
    icon: CheckCircle,
    color: 'bg-green-100 text-green-600',
    label: 'Censeur',
    permissions: ['Valider notes', 'Publier résultats', 'Voir rapports']
  },
  accountant: {
    icon: CreditCard,
    color: 'bg-purple-100 text-purple-600',
    label: 'Comptable',
    permissions: ['Enregistrer paiements', 'Gérer reçus', 'Voir impayés']
  },
  guard: {
    icon: Shield,
    color: 'bg-orange-100 text-orange-600',
    label: 'Gardien',
    permissions: ['Scanner QR codes', 'Voir présences']
  }
};

export default function StaffPage() {
  const toast = useToast();
  const { confirm } = useConfirm();
  
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [stats, setStats] = useState<StaffStats>({ admin: 0, secretary: 0, censeur: 0, accountant: 0, guard: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);

  useEffect(() => {
    loadStaff();
    loadStats();
  }, []);

  const loadStaff = async () => {
    try {
      const response = await api.get('/api/v1/staff/');
      setStaff(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement du personnel');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get('/api/v1/staff/stats/summary');
      setStats(response.data);
    } catch (error) {
      console.error('Erreur stats:', error);
    }
  };

  const filteredStaff = staff.filter(member =>
    member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B00]"></div>
      </div>
    );
  }

  const handleEdit = (staff: any) => {
    setEditingStaff(staff);
    setShowEditModal(true);
  };

  const handleDelete = async (member: any) => {
    const ok = await confirm({
      title: 'Supprimer ce membre ?',
      message: `Voulez-vous vraiment supprimer ${member.full_name} ? Cette action est irréversible. Le compte utilisateur sera définitivement supprimé.`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
      icon: 'trash'
    });
    
    if (ok) {
      try {
        await api.delete(`/api/v1/staff/${member.id}`);
        toast.success(`${member.full_name} supprimé avec succès`);
        loadStaff();
        loadStats();
      } catch (error: any) {
        toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
      }
    }
  };

  const handleToggleStatus = async (staffId: number, currentStatus: boolean) => {
    try {
      await api.patch(`/api/v1/staff/${staffId}/toggle-status`);
      const action = currentStatus ? 'désactivé' : 'activé';
      toast.success(`Membre ${action} avec succès`);
      await loadStaff();
      await loadStats();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la modification du statut');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Équipe administrative</h1>
          <p className="text-slate-500 mt-1">Gérez les membres de votre université</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#FF6B00] hover:bg-[#e55f00] text-white px-6 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <Plus size={18} />
          Ajouter un membre
        </button>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <ShieldCheck size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.admin}</p>
              <p className="text-xs text-slate-500">Admins</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.secretary}</p>
              <p className="text-xs text-slate-500">Secrétaires</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.censeur}</p>
              <p className="text-xs text-slate-500">Censeurs</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <CreditCard size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.accountant}</p>
              <p className="text-xs text-slate-500">Comptables</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Shield size={20} className="text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.guard}</p>
              <p className="text-xs text-slate-500">Gardiens</p>
            </div>
          </div>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Rechercher par nom ou email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          />
        </div>
      </div>

      {/* Grille des membres */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStaff.map((member) => {
          const config = roleConfig[member.role];
          const Icon = config?.icon || Users;
          return (
            <div key={member.id} className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 ${config?.color || 'bg-slate-100'} rounded-full flex items-center justify-center`}>
                    <Icon size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{member.full_name}</h3>
                    <p className="text-sm text-slate-500">{config?.label || member.role}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  member.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {member.is_active ? 'Actif' : 'Inactif'}
                </span>
              </div>
              <div className="space-y-2 mb-4">
                <p className="text-sm text-slate-600">{member.email}</p>
                <div className="flex flex-wrap gap-1">
                  {config?.permissions.slice(0, 3).map((perm, idx) => (
                    <span key={idx} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                      {perm}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-4 border-t border-slate-100">
                <button
                  onClick={() => handleEdit(member)}
                  className="flex-1 py-2 text-sm text-[#FF6B00] border border-[#FF6B00] rounded-lg hover:bg-orange-50 transition-colors"
                >
                  Modifier
                </button>
                <button
                  onClick={() => handleToggleStatus(member.id, member.is_active)}
                  className={`flex-1 py-2 text-sm rounded-lg transition-colors ${
                    member.is_active
                      ? 'text-red-600 border border-red-600 hover:bg-red-50'
                      : 'text-green-600 border border-green-600 hover:bg-green-50'
                  }`}
                >
                  {member.is_active ? 'Désactiver' : 'Activer'}
                </button>
                <button
                  onClick={() => handleDelete(member)}
                  className="py-2 px-3 text-sm text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredStaff.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <Users size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">Aucun membre du personnel trouvé</p>
        </div>
      )}

      {/* Modale d'ajout */}
      <AddStaffModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => {
          loadStaff();
          loadStats();
        }}
      />

      {/* Modale d'édition */}
      <EditStaffModal
        isOpen={showEditModal}
        staff={editingStaff}
        onClose={() => {
          setShowEditModal(false);
          setEditingStaff(null);
        }}
        onSuccess={() => {
          loadStaff();
          loadStats();
        }}
      />
    </div>
  );
}