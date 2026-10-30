'use client';

import { useState } from 'react';
import { X, FileText, CheckCircle, CreditCard, Shield, ShieldCheck } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';
import { getApiErrorMessage } from '@/lib/errorHandler';

interface AddStaffModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

// ✅ VALEURS CORRIGÉES : "censor" (comme ton backend), ajout de "admin"
const roles = [
    { value: 'admin', label: 'Administrateur', icon: ShieldCheck, color: 'bg-red-500', lightColor: 'bg-red-50 text-red-700 border-red-500' },
    { value: 'secretary', label: 'Secrétaire', icon: FileText, color: 'bg-blue-500', lightColor: 'bg-blue-50 text-blue-700 border-blue-500' },
    { value: 'censeur', label: 'Censeur', icon: CheckCircle, color: 'bg-green-500', lightColor: 'bg-green-50 text-green-700 border-green-500' },
    { value: 'accountant', label: 'Comptable', icon: CreditCard, color: 'bg-yellow-500', lightColor: 'bg-yellow-50 text-yellow-700 border-purple-500' },
    { value: 'guard', label: 'Gardien', icon: Shield, color: 'bg-orange-500', lightColor: 'bg-orange-50 text-orange-700 border-orange-500' },
];

export default function AddStaffModal({ isOpen, onClose, onSuccess }: AddStaffModalProps) {
    const [loading, setLoading] = useState(false);
    const [selectedRole, setSelectedRole] = useState('');
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        password: ''
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRole) {
            toast.error('Veuillez sélectionner un rôle');
            return;
        }

        setLoading(true);
        try {
            await api.post('/api/v1/staff/', {
                ...formData,
                role: selectedRole
            });

            toast.success(`${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} ajouté avec succès !`);
            setFormData({ full_name: '', email: '', password: '' });
            setSelectedRole('');
            onSuccess();
            onClose();
        } catch (error: any) {
          toast.error(getApiErrorMessage(error, 'Erreur lors de la création'));
        } finally {
            setLoading(false);
        }
    };

    const selectedRoleData = roles.find(r => r.value === selectedRole);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 my-auto">

                {/* Header */}
                <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 flex-shrink-0 bg-slate-50/50">
                    <div>
                        <h2 className="text-base sm:text-lg font-bold text-slate-900">Ajouter un membre du personnel</h2>
                        <p className="text-xs sm:text-sm text-slate-500">Choisissez un rôle et renseignez les informations</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200/60 rounded-lg transition-colors text-slate-500">
                        <X size={20} />
                    </button>
                </div>

                {/* Contenu responsive (colonne sur mobile, 2 colonnes sur tablette/desktop) */}
                <form onSubmit={handleSubmit} className="flex flex-col md:flex-row flex-1 overflow-y-auto">

                    {/* SECTION 1 : CHOISIR UN RÔLE */}
                    <div className="w-full md:w-5/12 bg-slate-50 p-4 sm:p-6 border-b md:border-b-0 md:border-r border-slate-100 flex flex-col">
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
                            1. Choisir un rôle
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-1 gap-2 w-full">
                            {roles.map((role) => {
                                const Icon = role.icon;
                                const isSelected = selectedRole === role.value;
                                return (
                                    <button
                                        key={role.value}
                                        type="button"
                                        onClick={() => setSelectedRole(role.value)}
                                        className={`w-full p-2.5 rounded-xl border-2 transition-all flex items-center gap-2.5 text-left ${
                                            isSelected
                                                ? role.lightColor + ' shadow-sm'
                                                : 'border-slate-200 bg-white hover:border-slate-300'
                                        }`}
                                    >
                                        <div className={`w-8 h-8 rounded-lg ${role.color} flex items-center justify-center flex-shrink-0`}>
                                            <Icon size={16} className="text-white" />
                                        </div>
                                        <span className="font-semibold text-xs sm:text-sm truncate">{role.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* SECTION 2 : INFORMATIONS DU MEMBRE */}
                    <div className="w-full md:w-7/12 p-4 sm:p-6 flex flex-col justify-between">
                        <div className="space-y-4">
                            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                                2. Informations du membre
                            </label>

                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Nom complet</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00] text-sm"
                                    placeholder="ex: Marie Koné"
                                />
                            </div>

                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Email professionnel</label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00] text-sm"
                                    placeholder="ex: marie.kone@univ.edu"
                                />
                            </div>

                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Mot de passe temporaire</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.password}
                                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00] text-sm font-mono"
                                    placeholder="Minimum 6 caractères"
                                />
                                <p className="text-[11px] text-slate-500 mt-1">💡 L'utilisateur devra le changer à sa première connexion.</p>
                            </div>
                        </div>

                        {/* Actions boutons */}
                        <div className="flex items-center justify-end gap-3 pt-4 mt-6 border-t border-slate-100 flex-shrink-0">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !selectedRole}
                                className="px-4 py-2 text-xs sm:text-sm font-medium text-white bg-[#FF6B00] hover:bg-[#e55f00] rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
                            >
                                {loading ? (
                                    <>
                                        <X size={16} className="animate-spin" /> Création...
                                    </>
                                ) : (
                                    `Créer ${selectedRoleData?.label || 'le membre'}`
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}