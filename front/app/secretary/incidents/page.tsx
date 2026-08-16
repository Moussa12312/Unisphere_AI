'use client';

import { useState, useEffect } from 'react';
import {
  AlertTriangle, Search, Eye, CheckCircle,
  Clock, XCircle, Loader2, MapPin, User, Calendar
} from 'lucide-react';
import api, { API_BASE_URL } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

interface Incident {
  id: number;
  title: string;
  description: string;
  incident_type: string;
  severity: string;
  location?: string;
  status: string;
  photo?: string;
  reported_by: string;
  reported_by_role?: string;
  student_name?: string;
  student_matricule?: string;
  created_at: string;
}

export default function IncidentsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  useEffect(() => {
    loadIncidents();
  }, []);

  const loadIncidents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      
      const response = await api.get(`/api/v1/incidents/?${params.toString()}`);
      setIncidents(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (incidentId: number, newStatus: string) => {
    try {
      await api.put(`/api/v1/incidents/${incidentId}/status`, { status: newStatus });
      toast.success('Statut mis à jour');
      loadIncidents();
      if (selectedIncident?.id === incidentId) {
        setSelectedIncident({ ...selectedIncident, status: newStatus });
      }
    } catch (error) {
      toast.error('Erreur de mise à jour');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <XCircle size={16} className="text-red-600" />;
      case 'in_progress': return <Clock size={16} className="text-orange-600" />;
      case 'resolved': return <CheckCircle size={16} className="text-green-600" />;
      case 'closed': return <CheckCircle size={16} className="text-slate-600" />;
      default: return <AlertTriangle size={16} className="text-slate-600" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return 'Ouvert';
      case 'in_progress': return 'En cours';
      case 'resolved': return 'Résolu';
      case 'closed': return 'Fermé';
      default: return status;
    }
  };

  const filteredIncidents = incidents.filter(inc => {
    const matchSearch = !filter || 
      inc.title.toLowerCase().includes(filter.toLowerCase()) ||
      inc.description.toLowerCase().includes(filter.toLowerCase()) ||
      inc.reported_by.toLowerCase().includes(filter.toLowerCase());
    return matchSearch;
  });

  const stats = {
    total: incidents.length,
    open: incidents.filter(i => i.status === 'open').length,
    in_progress: incidents.filter(i => i.status === 'in_progress').length,
    resolved: incidents.filter(i => i.status === 'resolved').length
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
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
            <AlertTriangle size={24} className="text-white" />
          </div>
          Incidents signalés
        </h1>
        <p className="text-slate-500 mt-1">Gérez les incidents de votre université</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 mb-1">Total</p>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-5">
          <p className="text-xs text-red-600 mb-1">Ouverts</p>
          <p className="text-2xl font-bold text-red-600">{stats.open}</p>
        </div>
        <div className="bg-white rounded-xl border border-orange-200 p-5">
          <p className="text-xs text-orange-600 mb-1">En cours</p>
          <p className="text-2xl font-bold text-orange-600">{stats.in_progress}</p>
        </div>
        <div className="bg-white rounded-xl border border-green-200 p-5">
          <p className="text-xs text-green-600 mb-1">Résolus</p>
          <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="🔍 Rechercher un incident..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          >
            <option value="">Tous les statuts</option>
            <option value="open">Ouvert</option>
            <option value="in_progress">En cours</option>
            <option value="resolved">Résolu</option>
            <option value="closed">Fermé</option>
          </select>
        </div>
      </div>

      {/* Liste */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {filteredIncidents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <AlertTriangle size={48} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Aucun incident trouvé</p>
            </div>
          ) : (
            filteredIncidents.map((incident) => (
              <div
                key={incident.id}
                onClick={() => setSelectedIncident(incident)}
                className={`bg-white rounded-xl border-2 p-5 cursor-pointer transition-all hover:shadow-md ${
                  selectedIncident?.id === incident.id 
                    ? 'border-[#FF6B00] shadow-md' 
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getSeverityColor(incident.severity)}`}>
                        {incident.severity.toUpperCase()}
                      </span>
                      <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
                        {incident.incident_type}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-lg">{incident.title}</h3>
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    {getStatusIcon(incident.status)}
                    <span className="font-medium text-slate-700">{getStatusLabel(incident.status)}</span>
                  </div>
                </div>

                <p className="text-sm text-slate-600 mb-3 line-clamp-2">{incident.description}</p>

                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <User size={12} />
                    {incident.reported_by}
                  </div>
                  {incident.location && (
                    <div className="flex items-center gap-1">
                      <MapPin size={12} />
                      {incident.location}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(incident.created_at).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Détails */}
        <div className="lg:col-span-1">
          {selectedIncident ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sticky top-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Détails de l'incident</h2>
              
              {selectedIncident.photo && (
                <img
                  src={`${API_BASE_URL}/uploads/incidents/${selectedIncident.photo}`}
                  alt={selectedIncident.title}
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
              )}

              <div className="space-y-3 mb-4">
                <div>
                  <p className="text-xs text-slate-500">Titre</p>
                  <p className="font-semibold text-slate-900">{selectedIncident.title}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Description</p>
                  <p className="text-sm text-slate-700">{selectedIncident.description}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Signalé par</p>
                  <p className="text-sm text-slate-700">{selectedIncident.reported_by}</p>
                </div>
                {selectedIncident.student_name && (
                  <div>
                    <p className="text-xs text-slate-500">Étudiant impliqué</p>
                    <p className="text-sm text-slate-700">{selectedIncident.student_name}</p>
                    <p className="text-xs text-slate-500 font-mono">{selectedIncident.student_matricule}</p>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 pt-4">
                <p className="text-xs text-slate-500 mb-2">Changer le statut</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => updateStatus(selectedIncident.id, 'open')}
                    disabled={selectedIncident.status === 'open'}
                    className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-medium disabled:opacity-50"
                  >
                    Ouvrir
                  </button>
                  <button
                    onClick={() => updateStatus(selectedIncident.id, 'in_progress')}
                    disabled={selectedIncident.status === 'in_progress'}
                    className="px-3 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg text-xs font-medium disabled:opacity-50"
                  >
                    En cours
                  </button>
                  <button
                    onClick={() => updateStatus(selectedIncident.id, 'resolved')}
                    disabled={selectedIncident.status === 'resolved'}
                    className="px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-medium disabled:opacity-50 col-span-2"
                  >
                    ✓ Résolu
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <AlertTriangle size={48} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Sélectionnez un incident pour voir les détails</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}