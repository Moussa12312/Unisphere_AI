'use client';

import { useState, useEffect } from 'react';
import { Building2, Plus, Trash2, X, Save, Loader2, Search, Phone, Mail } from 'lucide-react';
import { accountingService, Supplier } from '@/services/accountingService';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/hooks/useConfirm';

const emptyForm = { name: '', category: '', contact_name: '', phone: '', email: '', address: '', notes: '' };

export default function SuppliersPage() {
  const toast = useToast();
  const confirm = useConfirm();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      setSuppliers(await accountingService.getSuppliers());
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name) {
      toast.error('Le nom du fournisseur est requis');
      return;
    }
    setSaving(true);
    try {
      await accountingService.createSupplier(formData);
      toast.success('Fournisseur ajouté');
      setShowModal(false);
      setFormData(emptyForm);
      load();
    } catch (error) {
      toast.error("Erreur lors de l'ajout");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (s: Supplier) => {
    const ok = await confirm({ title: 'Supprimer ce fournisseur ?', message: `Supprimer "${s.name}" ?`, confirmText: 'Supprimer', variant: 'danger' });
    if (!ok) return;
    try {
      await accountingService.deleteSupplier(s.id);
      toast.success('Fournisseur supprimé');
      load();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const filtered = suppliers.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B00] border-t-transparent"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Fournisseurs</h1>
          <p className="text-slate-500 mt-1">Annuaire des prestataires et fournisseurs</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-sm font-medium shadow-md">
          <Plus size={16} /> Ajouter
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un fournisseur..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Building2 className="mx-auto text-slate-300 mb-3" size={48} />
          <p className="text-slate-500">Aucun fournisseur enregistré</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(s => (
            <div key={s.id} className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-start justify-between mb-2">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Building2 className="text-blue-600" size={18} />
                </div>
                <button onClick={() => handleDelete(s)} className="text-slate-300 hover:text-red-500"><Trash2 size={15} /></button>
              </div>
              <h3 className="font-semibold text-slate-900">{s.name}</h3>
              {s.category && <p className="text-xs text-slate-400">{s.category}</p>}
              <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                {s.phone && <p className="text-xs text-slate-600 flex items-center gap-1.5"><Phone size={12} /> {s.phone}</p>}
                {s.email && <p className="text-xs text-slate-600 flex items-center gap-1.5"><Mail size={12} /> {s.email}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">Ajouter un fournisseur</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nom *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Catégorie</label>
                <input type="text" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Ex: Fournitures, Maintenance..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Personne à contacter</label>
                <input type="text" value={formData.contact_name} onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Téléphone</label>
                  <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Adresse</label>
                <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium">Annuler</button>
              <button onClick={handleCreate} disabled={saving} className="flex-1 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Ajout...' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
