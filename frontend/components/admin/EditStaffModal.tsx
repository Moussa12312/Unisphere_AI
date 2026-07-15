'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, FileText, CheckCircle, CreditCard, Shield, ShieldCheck } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';
import { getApiErrorMessage } from '@/lib/errorHandler';

interface EditStaffModalProps {
    isOpen: boolean;
    staff: {
        id: number;
        full_name: string;
        email: string;
        role: string;
    } | null;
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

export default function EditStaffModal({ isOpen, staff, onClose, onSuccess }: EditStaffModalProps) {
    const [loading, setLoading] = useState(false);
    const [selectedRole, setSelectedRole] = useState('');
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        password: ''
    });

    useEffect(() => {
        if (staff) {
            setSelectedRole(staff.role);
            setFormData({
                full_name: staff.full_name,
                email: staff.email,
                password: ''
            });
        }
    }, [staff]);

    if (!isOpen || !staff) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setLoading(true);
        try {
            const payload: any = {
                full_name: formData.full_name,
                email: formData.email,
                role: selectedRole
            };

            if (formData.password) {
                payload.password = formData.password;
            }

            await api.put(`/api/v1/staff/${staff.id}`, payload);

            toast.success('Membre modifié avec succès !');
            onSuccess();
            onClose();
        } catch (error: any) {
          toast.error(getApiErrorMessage(error, 'Erreur lors de la modification'));
        } finally {
            setLoading(false);
        }
    };

    const selectedRoleData = roles.find(r => r.value === selectedRole);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-400 overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between px-8 py-4 border-b border-slate-100">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Modifier un membre</h2>
                        <p className="text-sm text-slate-500">Mettre à jour les informations</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                {/* Contenu en 2 colonnes */}
                <form onSubmit={handleSubmit} className="flex">

                    {/* COLONNE GAUCHE */}
                    <div className="w-1/3 bg-slate-50 p-6 pl-8 border-r border-slate-100 flex flex-col items-center">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 text-center">
                            1. Rôle
                        </label>
                        <div className="space-y-2 w-full">
                            {roles.map((role) => {
                                const Icon = role.icon;
                                const isSelected = selectedRole === role.value;
                                return (
                                    <button
                                        key={role.value}
                                        type="button"
                                        onClick={() => setSelectedRole(role.value)}
                                        className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-4 ${
                                            isSelected
                                                ? role.lightColor + ' shadow-md'
                                                : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                                        }`}
                                    >
                                        <div className={`w-10 h-10 rounded-lg ${role.color} flex items-center justify-center flex-shrink-0 text-xl`}>
                                            <Icon size={20} className="text-white" />
                                        </div>
                                        <span className="font-semibold text-base">{role.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* COLONNE DROITE */}
                    <div className="w-2/3 p-8 flex flex-col items-center">
                        <div className="w-full max-w-md">
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 text-center">
                                2. Informations
                            </label>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Nom complet</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00] text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00] text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Nouveau mot de passe <span className="text-slate-400 font-normal">(optionnel)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.password}
                                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00] text-sm"
                                        placeholder="Laisser vide pour ne pas changer"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">💡 Laissez vide pour conserver le mot de passe actuel.</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-center gap-3 pt-5 mt-6 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-4 py-2 text-sm font-medium text-white bg-[#FF6B00] hover:bg-[#e55f00] rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" /> Enregistrement...
                                        </>
                                    ) : (
                                        'Enregistrer les modifications'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}