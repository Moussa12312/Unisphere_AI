'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Award, Users, Search, GraduationCap, Briefcase,
  MapPin, Building2, CheckCircle, Handshake, Star,
  Loader2, Filter, ChevronRight, MessageSquare,
  Calendar, Target
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface Alumni {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  photo: string | null;
  filiere: string | null;
  domain: string | null;
  level: string | null;
  graduation_year: number | null;
  promotion: string | null;
  current_position: string | null;
  company: string | null;
  activity_domain: string | null;
  location: string | null;
  is_verified: boolean;
  is_open_to_mentoring: boolean;
  is_open_to_internship: boolean;
  skills: string[];
  mentor_count: number;
  mentor_slots_available: number;
  connection_status: string | null;
  connection_type: string | null;
}

export default function StudentAlumniPage() {
  const [alumniList, setAlumniList] = useState<Alumni[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPromotion, setSelectedPromotion] = useState<string>('');
  const [requestingId, setRequestingId] = useState<number | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedAlumni, setSelectedAlumni] = useState<Alumni | null>(null);
  const [requestType, setRequestType] = useState('mentor');
  const [requestMessage, setRequestMessage] = useState('');

  useEffect(() => {
    loadData();
  }, [selectedPromotion]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [alumniRes, promoRes] = await Promise.all([
        api.get(`/api/v1/alumni/community${selectedPromotion ? `?promotion=${selectedPromotion}` : ''}`),
        api.get('/api/v1/alumni/promotions')
      ]);
      setAlumniList(alumniRes.data || []);
      setPromotions(promoRes.data || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedPromotion) params.append('promotion', selectedPromotion);
      if (search) params.append('search', search);
      
      const res = await api.get(`/api/v1/alumni/community?${params.toString()}`);
      setAlumniList(res.data || []);
    } catch (error) {
      toast.error('Erreur de recherche');
    } finally {
      setLoading(false);
    }
  };

  const openRequestModal = (alumni: Alumni) => {
    setSelectedAlumni(alumni);
    setRequestType('mentor');
    setRequestMessage('');
    setShowRequestModal(true);
  };

  const sendRequest = async () => {
    if (!selectedAlumni) return;
    
    setRequestingId(selectedAlumni.id);
    try {
      await api.post('/api/v1/alumni/connections/request', {
        alumni_id: selectedAlumni.id,
        connection_type: requestType,
        message: requestMessage || null
      });
      toast.success('✅ Demande envoyée !');
      setShowRequestModal(false);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setRequestingId(null);
    }
  };

  // Grouper par promotion
  const groupedByPromotion = alumniList.reduce((acc: Record<string, Alumni[]>, alumni) => {
    const key = alumni.promotion || `Promotion ${alumni.graduation_year || 'N/A'}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(alumni);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-600 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Award size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Communauté Alumni</h1>
            <p className="text-orange-100">
              Découvrez le parcours de nos anciens et trouvez un mentor
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur">
            <div className="flex items-center gap-2">
              <Users size={20} />
              <span className="text-2xl font-bold">{alumniList.length}</span>
            </div>
            <p className="text-sm text-orange-100 mt-1">Alumni disponibles</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur">
            <div className="flex items-center gap-2">
              <Target size={20} />
              <span className="text-2xl font-bold">
                {alumniList.filter(a => a.is_open_to_mentoring).length}
              </span>
            </div>
            <p className="text-sm text-orange-100 mt-1">Mentors disponibles</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur">
            <div className="flex items-center gap-2">
              <Calendar size={20} />
              <span className="text-2xl font-bold">{promotions.length}</span>
            </div>
            <p className="text-sm text-orange-100 mt-1">Promotions</p>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher par nom, entreprise, domaine..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>
          <select
            value={selectedPromotion}
            onChange={(e) => setSelectedPromotion(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          >
            <option value="">Toutes les promotions</option>
            {promotions.map((p: any) => (
              <option key={p.promotion} value={p.promotion}>
                {p.promotion} ({p.count})
              </option>
            ))}
          </select>
          <button
            onClick={handleSearch}
            className="px-6 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-sm font-medium"
          >
            Rechercher
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="animate-spin text-[#FF6B00]" />
        </div>
      )}

      {/* Empty state */}
      {!loading && alumniList.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <Users size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">Aucun alumni trouvé</p>
        </div>
      )}

      {/* Listes groupées par promotion */}
      {!loading && Object.entries(groupedByPromotion).map(([promotion, alumni]) => (
        <div key={promotion} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#FF6B00] rounded-lg flex items-center justify-center">
                <GraduationCap size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-white font-semibold">{promotion}</h2>
                <p className="text-slate-400 text-sm">{alumni.length} alumni</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {alumni.map((alumn) => (
              <div
                key={alumn.id}
                className="bg-slate-50 hover:bg-orange-50/50 rounded-xl p-4 border border-slate-200 hover:border-orange-300 transition-all"
              >
                {/* Avatar + Nom */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-bold">
                    {alumn.first_name[0]}{alumn.last_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold text-slate-900 truncate">
                        {alumn.first_name} {alumn.last_name}
                      </h3>
                      {alumn.is_verified && (
                        <CheckCircle size={14} className="text-blue-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-slate-500 truncate">
                      {alumn.current_position || 'Poste non renseigné'}
                    </p>
                  </div>
                </div>

                {/* Infos */}
                <div className="space-y-1.5 mb-3">
                  {alumn.company && (
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Building2 size={12} className="text-slate-400" />
                      <span className="truncate">{alumn.company}</span>
                    </div>
                  )}
                  {alumn.activity_domain && (
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Briefcase size={12} className="text-slate-400" />
                      <span className="truncate">{alumn.activity_domain}</span>
                    </div>
                  )}
                  {alumn.location && (
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <MapPin size={12} className="text-slate-400" />
                      <span className="truncate">{alumn.location}</span>
                    </div>
                  )}
                </div>

                {/* Skills */}
                {alumn.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {alumn.skills.slice(0, 3).map((skill, i) => (
                      <span key={i} className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] rounded-full">
                        {skill.trim()}
                      </span>
                    ))}
                    {alumn.skills.length > 3 && (
                      <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[10px] rounded-full">
                        +{alumn.skills.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Status connection */}
                {alumn.connection_status === 'accepted' ? (
                  <div className="flex gap-2">
                    <span className="flex-1 text-center px-3 py-2 bg-green-100 text-green-700 text-xs font-medium rounded-lg">
                      ✅ Connecté
                    </span>
                    <Link
                      href={`/alumni/messages?to=${alumn.user_id}`}
                      className="flex items-center gap-1 px-3 py-2 bg-[#FF6B00] text-white text-xs rounded-lg hover:bg-[#e55f00]"
                    >
                      <MessageSquare size={12} />
                      Chat
                    </Link>
                  </div>
                ) : alumn.connection_status === 'pending' ? (
                  <span className="block text-center px-3 py-2 bg-orange-100 text-orange-700 text-xs font-medium rounded-lg">
                    ⏳ Demande en attente
                  </span>
                ) : (
                  <div className="flex gap-2">
                    <Link
                      href={`/student/alumni/${alumn.id}`}
                      className="flex-1 text-center px-3 py-2 bg-slate-100 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-200"
                    >
                      Voir profil
                    </Link>
                    {alumn.is_open_to_mentoring && alumn.mentor_slots_available > 0 && (
                      <button
                        onClick={() => openRequestModal(alumn)}
                        disabled={requestingId === alumn.id}
                        className="flex items-center gap-1 px-3 py-2 bg-[#FF6B00] text-white text-xs rounded-lg hover:bg-[#e55f00] disabled:opacity-50"
                      >
                        <Handshake size={12} />
                        Mentor
                      </button>
                    )}
                  </div>
                )}

                {/* Mentor slots */}
                {alumn.is_open_to_mentoring && (
                  <p className="text-[10px] text-slate-400 text-center mt-2">
                    {alumn.mentor_slots_available}/5 places disponibles
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Modal demande mentorat */}
      {showRequestModal && selectedAlumni && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              Demander {selectedAlumni.first_name} comme...
            </h2>

            <div className="space-y-2 mb-4">
              <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                requestType === 'mentor' ? 'border-[#FF6B00] bg-orange-50' : 'border-slate-200'
              }`}>
                <input
                  type="radio"
                  name="type"
                  value="mentor"
                  checked={requestType === 'mentor'}
                  onChange={(e) => setRequestType(e.target.value)}
                  className="text-[#FF6B00]"
                />
                <div>
                  <p className="font-medium text-slate-900">🎓 Mentor</p>
                  <p className="text-xs text-slate-500">Conseils carrière et orientation</p>
                </div>
              </label>

              <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                requestType === 'directeur_memoire' ? 'border-[#FF6B00] bg-orange-50' : 'border-slate-200'
              }`}>
                <input
                  type="radio"
                  name="type"
                  value="directeur_memoire"
                  checked={requestType === 'directeur_memoire'}
                  onChange={(e) => setRequestType(e.target.value)}
                  className="text-[#FF6B00]"
                />
                <div>
                  <p className="font-medium text-slate-900">📚 Directeur de mémoire</p>
                  <p className="text-xs text-slate-500">Accompagnement pour votre mémoire</p>
                </div>
              </label>

              <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                requestType === 'ami' ? 'border-[#FF6B00] bg-orange-50' : 'border-slate-200'
              }`}>
                <input
                  type="radio"
                  name="type"
                  value="ami"
                  checked={requestType === 'ami'}
                  onChange={(e) => setRequestType(e.target.value)}
                  className="text-[#FF6B00]"
                />
                <div>
                  <p className="font-medium text-slate-900">🤝 Ami / Réseau</p>
                  <p className="text-xs text-slate-500">Échange et networking</p>
                </div>
              </label>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Message (optionnel)
              </label>
              <textarea
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                rows={3}
                placeholder="Présentez-vous et expliquez pourquoi vous souhaitez cette connexion..."
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRequestModal(false)}
                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium"
              >
                Annuler
              </button>
              <button
                onClick={sendRequest}
                disabled={requestingId === selectedAlumni.id}
                className="flex-1 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl font-medium disabled:opacity-50"
              >
                {requestingId === selectedAlumni.id ? (
                  <Loader2 size={16} className="animate-spin mx-auto" />
                ) : (
                  'Envoyer la demande'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}