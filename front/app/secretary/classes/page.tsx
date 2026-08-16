'use client';
import { useState, useEffect } from 'react';
import {
  Users, Plus, Search, Edit3, Trash2, Eye, X, Save,
  Loader2, Building2, MapPin, UserCheck
} from 'lucide-react';
import { classService, ClassRoom } from '@/services/classService';
import { teacherService } from '@/services/teacherService';
import { filiereService } from '@/services/filiereService';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/hooks/useConfirm';

export default function SecretaryClassesPage() {
  const toast = useToast();
  const { confirm } = useConfirm();
  
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [filieres, setFilieres] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [filterFiliere, setFilterFiliere] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassRoom | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    filiere_id: '',
    level: '',
    room: '',
    building: '',
    capacity: '',
    academic_year: '2025-2026',
    main_teacher_id: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [classesData, teachersData, filieresData] = await Promise.all([
        classService.getAll(),
        teacherService.getAll(),
        filiereService.getAll()
      ]);
      setClasses(classesData);
      setTeachers(teachersData);
      setFilieres(filieresData);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const domains = [...new Set(filieres.map(f => f.domain))].sort();
  const filieresOfDomain = formData.level === 'L1'
    ? filieres.filter(f => f.name === "Tronc commun")
    : filieres.filter(f => f.domain === formData.domain);
  const selectedFiliere = filieres.find(f => f.id === parseInt(formData.filiere_id));
  const teachersOfFiliere = teachers;

  const resetForm = () => {
    setFormData({
      name: '',
      domain: '',
      filiere_id: '',
      level: '',
      room: '',
      building: '',
      capacity: '',
      academic_year: '2025-2026',
      main_teacher_id: '',
    });
  };

  const handleLevelChange = (newLevel: string) => {
    if (newLevel === 'L1') {
      const tronc = filieres.find(f => f.name === "Tronc commun");
      setFormData({
        ...formData,
        level: newLevel,
        filiere_id: tronc ? tronc.id.toString() : ''
      });
    } else {
      setFormData({ ...formData, level: newLevel, filiere_id: '' });
    }
  };

  const handleDomainChange = (newDomain: string) => {
    if (formData.level === 'L1') {
      const tronc = filieres.find(f => f.name === "Tronc commun");
      setFormData({
        ...formData,
        domain: newDomain,
        filiere_id: tronc ? tronc.id.toString() : ''
      });
    } else {
      setFormData({ ...formData, domain: newDomain, filiere_id: '', level: '' });
    }
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.filiere_id || !formData.level) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    setSaving(true);
    try {
      await classService.create({
        name: formData.name,
        filiere_id: parseInt(formData.filiere_id),
        level: formData.level,
        room: formData.room || null,
        building: formData.building || null,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        academic_year: formData.academic_year,
        main_teacher_id: formData.main_teacher_id ? parseInt(formData.main_teacher_id) : null,
      });
      toast.success('Classe créée avec succès !');
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
    if (!selectedClass) return;
    setSaving(true);
    try {
      await classService.update(selectedClass.id, {
        name: formData.name,
        filiere_id: formData.filiere_id ? parseInt(formData.filiere_id) : null,
        level: formData.level,
        room: formData.room || null,
        building: formData.building || null,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        academic_year: formData.academic_year,
        main_teacher_id: formData.main_teacher_id ? parseInt(formData.main_teacher_id) : null,
      });
      toast.success('Classe modifiée avec succès !');
      setShowEditModal(false);
      resetForm();
      loadAll();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la modification');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (classRoom: ClassRoom) => {
    const ok = await confirm({
      title: 'Supprimer cette classe ?',
      message: `Voulez-vous vraiment supprimer la classe "${classRoom.name}" ? Cette action est irréversible.`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
      icon: 'trash'
    });
    
    if (ok) {
      try {
        await classService.delete(classRoom.id);
        toast.success('Classe supprimée avec succès !');
        loadAll();
      } catch (error: any) {
        toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
      }
    }
  };

  const openEditModal = (classRoom: ClassRoom) => {
    setSelectedClass(classRoom);
    const filiere = filieres.find(f => f.id === classRoom.filiere_id);
    const domain = filiere?.domain || '';
    setFormData({
      name: classRoom.name,
      domain: domain,
      filiere_id: classRoom.filiere_id?.toString() || '',
      level: classRoom.level,
      room: classRoom.room || '',
      building: classRoom.building || '',
      capacity: classRoom.capacity?.toString() || '',
      academic_year: classRoom.academic_year || '2025-2026',
      main_teacher_id: classRoom.main_teacher_id?.toString() || '',
    });
    setShowEditModal(true);
  };

  const filteredClasses = classes.filter(classRoom => {
    const matchSearch =
      classRoom.name.toLowerCase().includes(search.toLowerCase()) ||
      classRoom.filiere_name.toLowerCase().includes(search.toLowerCase()) ||
      (classRoom.room || '').toLowerCase().includes(search.toLowerCase());
    const matchLevel = !filterLevel || classRoom.level === filterLevel;
    const matchFiliere = !filterFiliere || classRoom.filiere_name === filterFiliere;
    return matchSearch && matchLevel && matchFiliere;
  });

  const uniqueLevels = [...new Set(classes.map(c => c.level).filter(Boolean))];
  const uniqueFilieres = [...new Set(classes.map(c => c.filiere_name).filter(Boolean))];
  const stats = {
    total: classes.length,
    levels: uniqueLevels.length,
    filieres: uniqueFilieres.length,
    withoutRoom: classes.filter(c => !c.room).length
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Classes</h1>
          <p className="text-slate-500 mt-1">Gérez les classes et leurs salles</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-sm font-medium transition-all shadow-md"
        >
          <Plus size={16} />
          Nouvelle classe
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users size={20} className="text-blue-600" />
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
              <UserCheck size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Niveaux</p>
              <p className="text-2xl font-bold text-slate-900">{stats.levels}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Building2 size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Filières</p>
              <p className="text-2xl font-bold text-slate-900">{stats.filieres}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <MapPin size={20} className="text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Sans salle</p>
              <p className="text-2xl font-bold text-slate-900">{stats.withoutRoom}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="🔍 Rechercher par nom, filière, salle..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          >
            <option value="">Tous les niveaux</option>
            {uniqueLevels.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <select
            value={filterFiliere}
            onChange={(e) => setFilterFiliere(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          >
            <option value="">Toutes les filières</option>
            {uniqueFilieres.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredClasses.length === 0 ? (
          <div className="text-center py-16">
            <Users size={48} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Aucune classe trouvée</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-block mt-4 text-sm text-[#FF6B00] hover:underline"
            >
              Créer la première classe →
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Nom</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Niveau</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Filière</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Salle</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Enseignant</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClasses.map((classRoom) => (
                  <tr key={classRoom.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900 text-sm">{classRoom.name}</p>
                      <p className="text-xs text-slate-500">{classRoom.academic_year}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded">
                        {classRoom.level}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">{classRoom.filiere_name}</td>
                    <td className="py-3 px-4">
                      {classRoom.room ? (
                        <div className="flex items-center gap-2">
                          <MapPin size={14} className="text-green-600" />
                          <div>
                            <p className="text-sm text-slate-900">{classRoom.room}</p>
                            {classRoom.building && (
                              <p className="text-xs text-slate-500">{classRoom.building}</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                          Non assignée
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {classRoom.main_teacher_name || 'Non assigné'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setSelectedClass(classRoom); setShowDetailModal(true); }}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Voir"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => openEditModal(classRoom)}
                          className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(classRoom)}
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
              <h2 className="text-xl font-bold text-slate-900">Nouvelle classe</h2>
              <button onClick={() => { setShowCreateModal(false); resetForm(); }} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nom de la classe *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: L1 Informatique A"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Niveau *</label>
                <select
                  value={formData.level}
                  onChange={(e) => handleLevelChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  <option value="">Sélectionner un niveau...</option>
                  <option value="L1">L1</option>
                  <option value="L2">L2</option>
                  <option value="L3">L3</option>
                  <option value="M1">M1</option>
                  <option value="M2">M2</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Domaine *</label>
                <select
                  value={formData.domain}
                  onChange={(e) => handleDomainChange(e.target.value)}
                  disabled={!formData.level}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white disabled:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  <option value="">Sélectionner un domaine...</option>
                  {domains.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Filière *</label>
                <select
                  value={formData.filiere_id}
                  onChange={(e) => setFormData({ ...formData, filiere_id: e.target.value })}
                  disabled={!formData.domain || formData.level === 'L1'}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white disabled:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  {formData.level === 'L1' ? (
                    <option value={filieres.find(f => f.name === "Tronc commun")?.id || ''}>
                      Tronc commun (automatique)
                    </option>
                  ) : (
                    <>
                      <option value="">Sélectionner une filière...</option>
                      {filieresOfDomain.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </>
                  )}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Salle</label>
                  <input
                    type="text"
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    placeholder="Ex: Salle 101"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Bâtiment</label>
                  <input
                    type="text"
                    value={formData.building}
                    onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                    placeholder="Ex: Bloc A"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Enseignant principal</label>
                <select
                  value={formData.main_teacher_id}
                  onChange={(e) => setFormData({ ...formData, main_teacher_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  <option value="">Non assigné</option>
                  {teachersOfFiliere.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.first_name} {t.last_name}
                    </option>
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
      {showEditModal && selectedClass && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">Modifier la classe</h2>
              <button onClick={() => { setShowEditModal(false); resetForm(); }} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nom de la classe *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Niveau *</label>
                <select
                  value={formData.level}
                  onChange={(e) => handleLevelChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  <option value="L1">L1</option>
                  <option value="L2">L2</option>
                  <option value="L3">L3</option>
                  <option value="M1">M1</option>
                  <option value="M2">M2</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Domaine *</label>
                <select
                  value={formData.domain}
                  onChange={(e) => handleDomainChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  {domains.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Filière *</label>
                <select
                  value={formData.filiere_id}
                  onChange={(e) => setFormData({ ...formData, filiere_id: e.target.value })}
                  disabled={!formData.domain || formData.level === 'L1'}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white disabled:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  {formData.level === 'L1' ? (
                    <option value={filieres.find(f => f.name === "Tronc commun")?.id || ''}>
                      Tronc commun (automatique)
                    </option>
                  ) : (
                    <>
                      <option value="">Sélectionner une filière...</option>
                      {filieresOfDomain.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </>
                  )}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Salle</label>
                  <input
                    type="text"
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Bâtiment</label>
                  <input
                    type="text"
                    value={formData.building}
                    onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Enseignant principal</label>
                <select
                  value={formData.main_teacher_id}
                  onChange={(e) => setFormData({ ...formData, main_teacher_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  <option value="">Non assigné</option>
                  {teachersOfFiliere.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.first_name} {t.last_name}
                    </option>
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
      {showDetailModal && selectedClass && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">Détails de la classe</h2>
              <button onClick={() => setShowDetailModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-500 mb-1">Nom</p>
                <p className="text-sm font-semibold text-slate-900">{selectedClass.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Niveau</p>
                  <p className="text-sm font-semibold text-slate-900">{selectedClass.level}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Filière</p>
                  <p className="text-sm text-slate-900">{selectedClass.filiere_name}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Salle</p>
                  <p className="text-sm font-semibold text-slate-900">{selectedClass.room || 'Non assignée'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Bâtiment</p>
                  <p className="text-sm font-semibold text-slate-900">{selectedClass.building || 'Non défini'}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Enseignant principal</p>
                <p className="text-sm text-slate-900">{selectedClass.main_teacher_name || 'Non assigné'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Année académique</p>
                <p className="text-sm text-slate-900">{selectedClass.academic_year}</p>
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