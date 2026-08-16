'use client';

import { useState, useEffect } from 'react';
import {
  AlertTriangle, Plus, Search, Loader2,
  Calendar, Clock, User, FileText, X, Save,
  CheckCircle, AlertCircle
} from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

export default function GuardIncidentsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    student_matricule: '',
    type: 'absence',
    severity: 'medium',
    description: '',
    location: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadIncidents();
  }, []);

  const loadIncidents = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/v1/incidents/');
      const data = Array.isArray(response.data) 
        ? response.data 
        : (response.data?.data || []);
      setIncidents(data);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.student_matricule || !formData.description) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    setSaving(true);
    try {
      await api.post('/api/v1/incidents/', formData);
      toast.success('Incident signalé avec succès');
      setShowCreateModal(false);
      setFormData({
        student_matricule: '',
        type: 'absence',
        severity: 'medium',
        description: '',
        location: ''
      });
      loadIncidents();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const filteredIncidents = incidents.filter(incident => {
    const matchSearch = 
      (incident.student_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (incident.student_matricule || '').toLowerCase().includes(search.toLowerCase()) ||
      (incident.description || '').toLowerCase().includes(search.toLowerCase());
    const matchSeverity = !filterSeverity || incident.severity === filterSeverity;
    return matchSearch && matchSeverity;
  });

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'low':
        return { label: 'Faible', color: 'text-blue-700 bg-blue-100 border-blue-200', icon: AlertCircle };
      case 'medium':
        return { label: 'Moyen', color: 'text-orange-700 bg-orange-100 border-orange-200', icon: AlertTriangle };
      case 'high':
        return { label: 'Élevé', color: 'text-red-700 bg-red-100 border-red-200', icon: AlertTriangle };
      default:
        return { label: severity, color: 'text-slate-700 bg-slate-100 border-slate-200', icon: AlertCircle };
    }
  };

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'absence': 'Absence',
      'retard': 'Retard',
      'comportement': 'Comportement',
      'autre': 'Autre'
    };
    return types[type] || type;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const stats = {
    total: incidents.length,
    low: incidents.filter(i => i.severity === 'low').length,
    medium: incidents.filter(i => i.severity === 'medium').length,
    high: incidents.filter(i => i.severity === 'high').length
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
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/30">
              <AlertTriangle size={24} className="text-white" />
            </div>
            Incidents
          </h1>
          <p className="text-slate-500 mt-1">Signalez et consultez les incidents</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#FF6B00] to-orange-500 hover:from-[#e55f00] hover:to-orange-600 text-white rounded-xl text-sm font-medium transition-all shadow-md"
        >
          <Plus size={16} />
          Signaler un incident
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText size={20} className="text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-1">Total</p>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>

        <div className="bg-white rounded-xl border border-blue-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <AlertCircle size={20} className="text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-1">Faibles</p>
          <p className="text-2xl font-bold text-blue-600">{stats.low}</p>
        </div>

        <div className="bg-white rounded-xl border border-orange-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <AlertTriangle size={20} className="text-orange-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-1">Moyens</p>
          <p className="text-2xl font-bold text-orange-600">{stats.medium}</p>
        </div>

        <div className="bg-white rounded-xl border border-red-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-1">Élevés</p>
          <p className="text-2xl font-bold text-red-600">{stats.high}</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="🔍 Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          >
            <option value="">Toutes les sévérités</option>
            <option value="low">🔵 Faible</option>
            <option value="medium">🟠 Moyen</option>
            <option value="high">🔴 Élevé</option>
          </select>
        </div>
      </div>

      {/* Liste */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredIncidents.length === 0 ? (
          <div className="text-center py-16">
            <AlertTriangle size={48} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Aucun incident trouvé</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-block mt-4 text-sm text-[#FF6B00] hover:underline"
            >
              Signaler le premier incident →
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredIncidents.map((incident) => {
              const severityConfig = getSeverityConfig(incident.severity);
              const SeverityIcon = severityConfig.icon;
              return (
                <div key={incident.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${severityConfig.color}`}>
                      <SeverityIcon size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-slate-900">
                          {incident.student_name || 'Étudiant'}
                        </p>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${severityConfig.color}`}>
                          {severityConfig.label}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">
                        {incident.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <User size={12} />
                          {incident.student_matricule}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {formatDate(incident.created_at)}
                        </span>
                        {incident.location && (
                          <span className="flex items-center gap-1">
                            📍 {incident.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal création */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">Signaler un incident</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Matricule étudiant *</label>
                <input
                  type="text"
                  value={formData.student_matricule}
                  onChange={(e) => setFormData({ ...formData, student_matricule: e.target.value })}
                  placeholder="Ex: EC-2026-0001"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  <option value="absence">Absence</option>
                  <option value="retard">Retard</option>
                  <option value="comportement">Comportement</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Sévérité *</label>
                <select
                  value={formData.severity}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  <option value="low">🔵 Faible</option>
                  <option value="medium">🟠 Moyen</option>
                  <option value="high">🔴 Élevé</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Lieu</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Ex: Salle 101"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  placeholder="Décrivez l'incident..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowCreateModal(false)}
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
                {saving ? 'Envoi...' : 'Signaler'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}