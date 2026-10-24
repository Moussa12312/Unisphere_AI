'use client';

import React, { useState, useEffect } from 'react';
import { Users, Search, Plus, Phone, Mail, UserCheck, Edit2, X, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface StudentRecord {
  id: number;
  first_name: string;
  last_name: string;
  matricule: string;
  filiere?: string;
  level?: string;
  parent_name?: string;
  parent_phone?: string;
  parent_email?: string;
}

export default function AdminGuardiansPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    parent_name: '',
    parent_phone: '',
    parent_email: ''
  });

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/students/');
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setStudents(data);
    } catch (err) {
      console.error('Erreur chargement:', err);
      toast.error('Impossible de charger les étudiants');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (student: StudentRecord) => {
    setEditingStudent(student);
    setFormData({
      parent_name: student.parent_name || '',
      parent_phone: student.parent_phone || '',
      parent_email: student.parent_email || ''
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setSaving(true);
    try {
      await api.put(`/api/v1/students/${editingStudent.id}`, {
        ...editingStudent,
        parent_name: formData.parent_name,
        parent_phone: formData.parent_phone,
        parent_email: formData.parent_email
      });
      toast.success('Informations du tuteur mises à jour !');
      setEditingStudent(null);
      loadStudents();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = students.filter(s => {
    const parent = (s.parent_name || '').toLowerCase();
    const student = `${s.first_name} ${s.last_name}`.toLowerCase();
    const matricule = (s.matricule || '').toLowerCase();
    const q = searchTerm.toLowerCase();
    return parent.includes(q) || student.includes(q) || matricule.includes(q);
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-600" /> Gestion des Tuteurs & Parents
          </h1>
          <p className="text-slate-500 text-sm">Registre des responsables légaux des étudiants inscrits.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Rechercher par tuteur, étudiant ou matricule..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent border-none focus:outline-none text-slate-900 dark:text-white text-sm"
        />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-[#FF6B00]" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-4">Tuteur / Parent</th>
                  <th className="p-4">Contact</th>
                  <th className="p-4">Étudiant Associé</th>
                  <th className="p-4">Filière / Niveau</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 font-medium text-slate-900 dark:text-white">
                      {s.parent_name || <span className="text-slate-400 italic font-normal">Non renseigné</span>}
                    </td>
                    <td className="p-4 space-y-1">
                      {s.parent_phone ? (
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                          <Phone className="w-3.5 h-3.5 text-slate-400" /> {s.parent_phone}
                        </div>
                      ) : null}
                      {s.parent_email ? (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Mail className="w-3.5 h-3.5 text-slate-400" /> {s.parent_email}
                        </div>
                      ) : null}
                      {!s.parent_phone && !s.parent_email && (
                        <span className="text-slate-400 text-xs italic">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-slate-900 dark:text-white">{s.first_name} {s.last_name}</p>
                      <p className="text-xs font-mono text-slate-500">{s.matricule || `ID #${s.id}`}</p>
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-300">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        {s.filiere || 'Filière N/A'} • {s.level || 'L1'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => openEditModal(s)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <Edit2 size={13} /> {s.parent_name ? 'Modifier' : 'Ajouter'}
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      Aucun tuteur ou étudiant trouvé.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal d'édition */}
      {editingStudent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                Tuteur de {editingStudent.first_name} {editingStudent.last_name}
              </h3>
              <button onClick={() => setEditingStudent(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nom complet du tuteur / parent
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Mamadou Diallo"
                  value={formData.parent_name}
                  onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Téléphone du tuteur
                </label>
                <input
                  type="tel"
                  placeholder="Ex: +224 620 12 34 56"
                  value={formData.parent_phone}
                  onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email du tuteur
                </label>
                <input
                  type="email"
                  placeholder="Ex: parent@gmail.com"
                  value={formData.parent_email}
                  onChange={(e) => setFormData({ ...formData, parent_email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow flex items-center gap-2 disabled:opacity-50"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
