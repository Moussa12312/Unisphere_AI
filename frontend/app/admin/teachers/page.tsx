'use client';

import { useState, useEffect } from 'react';
import {
  Users, Plus, Search, Edit3, Trash2, Key, Mail, Phone,
  GraduationCap, Loader2, X, Upload, Save, Eye, Filter,
  Download, QrCode, RefreshCw, AlertCircle, BookOpen
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

interface Teacher {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  department: string;
  speciality: string;
  photo?: string;
  qr_code?: string;
  filiere_id?: number;
  created_at: string;
}

export default function AdminTeachersPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [search, setSearch] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [filieres, setFilieres] = useState<any[]>([]);
  
  // États pour création
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    department: '',
    speciality: '',
    filiere_id: null as number | null,
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  // États pour mot de passe
  const [newPassword, setNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  useEffect(() => {
    loadTeachers();
    loadFilieres();
  }, []);

  const loadTeachers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/v1/teachers/');
      setTeachers(Array.isArray(response.data) ? response.data : []);
    } catch (error: any) {
      toast.error('Erreur de chargement');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadFilieres = async () => {
    try {
      const response = await api.get('/api/v1/filieres/');
      setFilieres(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error(error);
    }
  };

  const filteredTeachers = teachers.filter(teacher => {
    const fullName = `${teacher.first_name} ${teacher.last_name}`.toLowerCase();
    const matchSearch = 
      fullName.includes(search.toLowerCase()) ||
      teacher.email.toLowerCase().includes(search.toLowerCase()) ||
      teacher.speciality.toLowerCase().includes(search.toLowerCase());
    const matchDepartment = !filterDepartment || teacher.department === filterDepartment;
    return matchSearch && matchDepartment;
  });

  const departments = [...new Set(teachers.map(t => t.department).filter(Boolean))];

  // ✅ CRÉATION D'UN ENSEIGNANT
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('first_name', formData.first_name);
      formDataUpload.append('last_name', formData.last_name);
      formDataUpload.append('email', formData.email);
      formDataUpload.append('phone', formData.phone || '');
      formDataUpload.append('department', formData.department);
      formDataUpload.append('speciality', formData.speciality);
      if (formData.filiere_id) {
        formDataUpload.append('filiere_id', formData.filiere_id.toString());
      }
      if (photoFile) {
        formDataUpload.append('photo', photoFile);
      }

      const response = await api.post('/api/v1/teachers/', formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success(`Enseignant créé ! Mot de passe temporaire : ${response.data.temp_password}`);
      setShowCreateModal(false);
      resetForm();
      loadTeachers();
    } catch (error: any) {
      console.error('Erreur création:', error.response?.data || error);
      toast.error(error.response?.data?.detail || 'Erreur de création');
    } finally {
      setCreating(false);
    }
  };

  // ✅ SUPPRESSION
  const handleDelete = async () => {
    if (!selectedTeacher) return;
    
    try {
      await api.delete(`/api/v1/teachers/${selectedTeacher.id}`);
      toast.success('Enseignant supprimé');
      setShowDeleteModal(false);
      setSelectedTeacher(null);
      loadTeachers();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur de suppression');
    }
  };

  // ✅ RÉINITIALISER MOT DE PASSE
  const handleResetPassword = async () => {
    if (!selectedTeacher || !newPassword) return;
    
    setResettingPassword(true);
    try {
      await api.put(`/api/v1/teachers/${selectedTeacher.id}/password`, {
        password: newPassword
      });
      toast.success('Mot de passe modifié avec succès');
      setShowPasswordModal(false);
      setNewPassword('');
      setSelectedTeacher(null);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setResettingPassword(false);
    }
  };

  // ✅ GÉNÉRER MOT DE PASSE ALÉATOIRE
  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(password);
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      department: '',
      speciality: '',
      filiere_id: null,
    });
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 5 Mo');
      return;
    }
    
    setPhotoFile(file);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-[#FF6B00]" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <GraduationCap size={24} className="text-white" />
            </div>
            Enseignants
          </h1>
          <p className="text-slate-500 mt-1">
            {teachers.length} enseignant{teachers.length > 1 ? 's' : ''} enregistré{teachers.length > 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#FF6B00] to-orange-500 hover:from-[#e55f00] text-white rounded-xl text-sm font-medium shadow-md"
        >
          <Plus size={16} />
          Nouvel enseignant
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users size={20} className="text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-1">Total</p>
          <p className="text-2xl font-bold text-slate-900">{teachers.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Mail size={20} className="text-green-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-1">Avec email</p>
          <p className="text-2xl font-bold text-green-600">
            {teachers.filter(t => t.email).length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <BookOpen size={20} className="text-purple-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-1">Départements</p>
          <p className="text-2xl font-bold text-purple-600">{departments.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Filter size={20} className="text-orange-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-1">Filtrés</p>
          <p className="text-2xl font-bold text-orange-600">{filteredTeachers.length}</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="🔍 Rechercher par nom, email ou spécialité..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          >
            <option value="">Tous les départements</option>
            {departments.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Liste */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredTeachers.length === 0 ? (
          <div className="p-16 text-center">
            <Users size={48} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Aucun enseignant trouvé</p>
            <p className="text-xs text-slate-400 mt-1">
              {search || filterDepartment ? 'Modifiez vos filtres' : 'Créez votre premier enseignant'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 pl-13 text-xs font-semibold text-slate-500 uppercase">Enseignant</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Téléphone</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Spécialité</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Département</th>
                  <th className="text-left py-3 pl-15 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTeachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {teacher.photo ? (
                          <img
                          src={teacher.photo ? `http://localhost:8000/uploads/${teacher.photo}?t=${Date.now()}` : `https://ui-avatars.com/api/?name=${teacher.first_name}+${teacher.last_name}&background=FF6B00&color=fff&size=64`}
                            alt={`${teacher.first_name} ${teacher.last_name}`}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gradient-to-br from-[#FF6B00] to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {getInitials(teacher.first_name, teacher.last_name)}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">
                            {teacher.first_name} {teacher.last_name}
                          </p>
                          {teacher.email && (
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                              <a
                                href={`mailto:${teacher.email}`}
                                className="text-sm text-blue-600 hover:underline"
                              >{teacher.email}</a>
                              
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-5 px-4 text-sm flex items-center gap-1">
                      {teacher.phone}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                        {teacher.speciality}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {teacher.department}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/teachers/${teacher.id}`}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Voir"
                        >
                          <Eye size={16} />
                        </Link>
                        <Link
                          href={`/admin/teachers/${teacher.id}/edit`}
                          className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit3 size={16} />
                        </Link>
                        <button
                          onClick={() => {
                            setSelectedTeacher(teacher);
                            setShowPasswordModal(true);
                          }}
                          className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Changer mot de passe"
                        >
                          <Key size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTeacher(teacher);
                            setShowDeleteModal(true);
                          }}
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

      {/* Modal Création */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Nouvel enseignant</h2>
              <button onClick={() => { setShowCreateModal(false); resetForm(); }} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              {/* Photo */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Photo de profil</label>
                <div className="flex items-center gap-4">
                  {photoPreview ? (
                    <div className="relative">
                      <img src={photoPreview} alt="Aperçu" className="w-24 h-24 rounded-xl object-cover" />
                      <button
                        type="button"
                        onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center">
                      <Users size={32} className="text-slate-400" />
                    </div>
                  )}
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                      id="create-photo"
                    />
                    <label
                      htmlFor="create-photo"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium cursor-pointer"
                    >
                      <Upload size={16} />
                      Choisir une photo
                    </label>
                    <p className="text-xs text-slate-500 mt-1">JPG, PNG • Max 5 Mo</p>
                  </div>
                </div>
              </div>

              {/* Infos */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Prénom *</label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nom *</label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Téléphone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Spécialité *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Programmation, Mathématiques, Marketing..."
                  value={formData.speciality}
                  onChange={(e) => setFormData({ ...formData, speciality: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Domaine d'expertise ou matière principale enseignée
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Filière</label>
                <select
                  value={formData.filiere_id || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    filiere_id: e.target.value ? parseInt(e.target.value) : null,
                    department: e.target.value ? filieres.find(f => f.id === parseInt(e.target.value))?.name || '' : ''
                  })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  <option value="">Sélectionner une filière</option>
                  {filieres.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-xs text-blue-900">
                  <strong>ℹ️ Note :</strong> Un mot de passe temporaire sera généré automatiquement et affiché après la création.
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); resetForm(); }}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creating ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {creating ? 'Création...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Suppression */}
      {showDeleteModal && selectedTeacher && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle size={24} className="text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Supprimer l'enseignant ?</h2>
            </div>
            <p className="text-slate-600 mb-6">
              Voulez-vous vraiment supprimer <strong>{selectedTeacher.first_name} {selectedTeacher.last_name}</strong> ? 
              Cette action est irréversible.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setSelectedTeacher(null); }}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Mot de passe */}
      {showPasswordModal && selectedTeacher && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Key size={24} className="text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Changer le mot de passe</h2>
            </div>
            <p className="text-slate-600 mb-4">
              Pour <strong>{selectedTeacher.first_name} {selectedTeacher.last_name}</strong>
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nouveau mot de passe</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Entrez un mot de passe"
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  />
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm"
                    title="Générer"
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">Minimum 6 caractères</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowPasswordModal(false); setSelectedTeacher(null); setNewPassword(''); }}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleResetPassword}
                disabled={resettingPassword || !newPassword || newPassword.length < 6}
                className="flex-1 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {resettingPassword ? 'En cours...' : 'Modifier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}