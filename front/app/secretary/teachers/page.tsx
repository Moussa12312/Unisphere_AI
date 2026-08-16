'use client';
import { useState, useEffect } from 'react';
import {
  GraduationCap, Plus, Search, Edit3, Trash2, Eye, X, Save,
  Loader2, Mail, Phone, BookOpen
} from 'lucide-react';
import { teacherService } from '@/services/teacherService';
import { filiereService } from '@/services/filiereService';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/hooks/useConfirm';

export default function SecretaryTeachersPage() {
  const toast = useToast();
  const { confirm } = useConfirm();
  
  const [teachers, setTeachers] = useState<any[]>([]);
  const [filieres, setFilieres] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterFiliere, setFilterFiliere] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    speciality: '',
    filiere_id: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [teachersData, filieresData] = await Promise.all([
        teacherService.getAll(),
        filiereService.getAll()
      ]);
      setTeachers(teachersData);
      setFilieres(filieresData);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      speciality: '',
      filiere_id: '',
    });
  };

  const handleCreate = async () => {
    if (!formData.first_name || !formData.last_name || !formData.email) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    setSaving(true);
    try {
      const submitData = new FormData();
      submitData.append('first_name', formData.first_name);
      submitData.append('last_name', formData.last_name);
      submitData.append('email', formData.email);
      if (formData.phone) submitData.append('phone', formData.phone);
      if (formData.speciality) submitData.append('speciality', formData.speciality);
      if (formData.filiere_id) submitData.append('filiere_id', formData.filiere_id);
      
      await teacherService.create(submitData);
      toast.success('Enseignant créé avec succès !');
      setShowCreateModal(false);
      resetForm();
      loadAll();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedTeacher) return;
    
    if (!formData.first_name || !formData.last_name || !formData.email) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    
    setSaving(true);
    try {
      // ✅ ENVOYER EN JSON (pas FormData)
      const submitData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone || null,
        speciality: formData.speciality || null,
        filiere_id: formData.filiere_id ? parseInt(formData.filiere_id) : null,
      };
      
      await teacherService.update(selectedTeacher.id, submitData);
      toast.success('Enseignant modifié avec succès !');
      setShowEditModal(false);
      setSelectedTeacher(null);
      resetForm();
      loadAll();
    } catch (error: any) {
      console.error('Erreur modification:', error);
      toast.error(
        error.response?.data?.detail || 
        'Erreur lors de la modification'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (teacher: any) => {
    const ok = await confirm({
      title: 'Supprimer cet enseignant ?',
      message: `Voulez-vous vraiment supprimer ${teacher.first_name} ${teacher.last_name} ? Cette action est irréversible.`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
      icon: 'trash'
    });
    
    if (ok) {
      try {
        await teacherService.delete(teacher.id);
        toast.success('Enseignant supprimé avec succès !');
        loadAll();
      } catch (error: any) {
        toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
      }
    }
  };

  const openEditModal = (teacher: any) => {
    setSelectedTeacher(teacher);
    setFormData({
      first_name: teacher.first_name || '',
      last_name: teacher.last_name || '',
      email: teacher.email || '',
      phone: teacher.phone || '',
      speciality: teacher.speciality || '',
      filiere_id: teacher.filiere_id?.toString() || '',
    });
    setShowEditModal(true);
  };

  const filteredTeachers = teachers.filter(teacher => {
    const fullName = `${teacher.first_name} ${teacher.last_name}`.toLowerCase();
    const matchSearch =
      fullName.includes(search.toLowerCase()) ||
      (teacher.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (teacher.speciality || '').toLowerCase().includes(search.toLowerCase());
    const matchFiliere = !filterFiliere || teacher.filiere_id === parseInt(filterFiliere);
    return matchSearch && matchFiliere;
  });

  const uniqueFilieres = [...new Set(teachers.map(t => t.filiere_name).filter(Boolean))];
  const stats = {
    total: teachers.length,
    filieres: uniqueFilieres.length,
    withEmail: teachers.filter(t => t.email).length,
    withPhone: teachers.filter(t => t.phone).length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B00] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-slate-500">Gérez le corps enseignant de l'université</p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-sm font-medium transition-all shadow-md"
        >
          <Plus size={16} />
          Nouvel enseignant
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <GraduationCap size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <BookOpen size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Filières</p>
              <p className="text-2xl font-bold text-slate-900">{stats.filieres}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Mail size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Avec email</p>
              <p className="text-2xl font-bold text-slate-900">{stats.withEmail}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Phone size={20} className="text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Avec téléphone</p>
              <p className="text-2xl font-bold text-slate-900">{stats.withPhone}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="🔍 Rechercher par nom, email, spécialité..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>
          <select
            value={filterFiliere}
            onChange={(e) => setFilterFiliere(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          >
            <option value="">Toutes les filières</option>
            {filieres.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredTeachers.length === 0 ? (
          <div className="text-center py-16">
            <GraduationCap size={48} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Aucun enseignant trouvé</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-block mt-4 text-sm text-[#FF6B00] hover:underline"
            >
              Créer le premier enseignant →
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Nom</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Email</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Téléphone</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Spécialité</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Filière</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTeachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-[#FF6B00]/10 rounded-full flex items-center justify-center text-[#FF6B00] font-semibold text-sm">
                          {teacher.first_name?.charAt(0)}{teacher.last_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">
                            {teacher.first_name} {teacher.last_name}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">{teacher.email || '-'}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{teacher.phone || '-'}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{teacher.speciality || '-'}</td>
                    <td className="py-3 px-4">
                      {teacher.filiere_name ? (
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded">
                          {teacher.filiere_name}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Non assignée</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setSelectedTeacher(teacher); setShowDetailModal(true); }}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Voir"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => openEditModal(teacher)}
                          className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(teacher)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL CRÉATION */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">Nouvel enseignant</h2>
              <button onClick={() => { setShowCreateModal(false); resetForm(); }} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Prénom *</label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    placeholder="Ex: Amadou"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Nom *</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    placeholder="Ex: Traoré"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="ex: amadou.traore@universite.com"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Téléphone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+223 73 34 34 93"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Spécialité</label>
                <input
                  type="text"
                  value={formData.speciality}
                  onChange={(e) => setFormData({ ...formData, speciality: e.target.value })}
                  placeholder="Ex: Mathématiques, Informatique..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Filière</label>
                <select
                  value={formData.filiere_id}
                  onChange={(e) => setFormData({ ...formData, filiere_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  <option value="">Non assignée</option>
                  {filieres.map((f: any) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Création...' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MODIFICATION */}
      {showEditModal && selectedTeacher && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">Modifier l'enseignant</h2>
              <button onClick={() => { setShowEditModal(false); resetForm(); }} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Prénom *</label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Nom *</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Téléphone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+223 73 34 34 93"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Spécialité</label>
                <input
                  type="text"
                  value={formData.speciality}
                  onChange={(e) => setFormData({ ...formData, speciality: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Filière</label>
                <select
                  value={formData.filiere_id}
                  onChange={(e) => setFormData({ ...formData, filiere_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  <option value="">Non assignée</option>
                  {filieres.map((f: any) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => { setShowEditModal(false); resetForm(); }}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleEdit}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DÉTAIL */}
      {showDetailModal && selectedTeacher && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">Détails de l'enseignant</h2>
              <button onClick={() => setShowDetailModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-[#FF6B00]/10 rounded-full flex items-center justify-center text-[#FF6B00] font-bold text-xl overflow-hidden border border-slate-200">
                  {selectedTeacher.photo ? (
                    <img src={`/uploads/${selectedTeacher.photo}`} alt="Photo" className="w-full h-full object-cover" />
                  ) : (
                    <span>{selectedTeacher.first_name?.charAt(0)}{selectedTeacher.last_name?.charAt(0)}</span>
                  )}
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-900">
                    {selectedTeacher.first_name} {selectedTeacher.last_name}
                  </p>
                  <p className="text-sm text-slate-500">{selectedTeacher.speciality || 'Non spécifié'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Email</p>
                  <p className="text-sm text-slate-900">{selectedTeacher.email || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Téléphone</p>
                  <p className="text-sm text-slate-900">{selectedTeacher.phone || '-'}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Filière</p>
                <p className="text-sm text-slate-900">{selectedTeacher.filiere_name || 'Non assignée'}</p>
              </div>

              {/* QR Code */}
              <div className="border-t border-slate-100 pt-3 text-center">
                <p className="text-xs font-semibold text-slate-500 mb-2">QR Code</p>
                {selectedTeacher.qr_code ? (
                  <img
                    src={`/qr_codes/${selectedTeacher.qr_code}`}
                    alt="QR Code Enseignant"
                    className="w-32 h-32 mx-auto bg-slate-50 p-2 border border-slate-200 rounded-xl object-contain"
                  />
                ) : (
                  <div className="w-32 h-32 mx-auto bg-slate-100 rounded-xl flex items-center justify-center text-xs text-slate-400">
                    Pas de QR Code
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowDetailModal(false)}
              className="w-full mt-5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}