'use client';
import { useState, useEffect } from 'react';
import {
  Award, Users, Link2, Copy, CheckCircle, XCircle, Clock,
  Loader2, Trash2, Eye, Bell, Plus, Calendar, Search,
  GraduationCap, Briefcase, Mail, Phone, ChevronDown
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface Alumni {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  filiere: string | null;
  graduation_year: number | null;
  promotion: string | null;
  current_position: string | null;
  company: string | null;
  status: string;
  is_verified: boolean;
  created_at: string;
}

interface Invitation {
  id: number;
  token: string;
  url: string;
  max_uses: number;
  used_count: number;
  is_active: boolean;
  expires_at: string;
  created_at: string;
}

export default function AdminAlumniPage() {
  const [alumniList, setAlumniList] = useState<Alumni[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [copiedToken, setCopiedToken] = useState<number | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedToken, setSelectedToken] = useState<string>('');
  const [emailData, setEmailData] = useState({ email: '', first_name: '', last_name: '' });
  const [sendingEmail, setSendingEmail] = useState(false);


  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [alumniRes, inviteRes, statsRes] = await Promise.all([
        api.get('/api/v1/alumni/admin/list'),
        api.get('/api/v1/alumni/invitations'),
        api.get('/api/v1/alumni/admin/stats'),
      ]);
      setAlumniList(alumniRes.data || []);
      setInvitations(inviteRes.data || []);
      setStats(statsRes.data);
    } catch (error) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const createInvitation = async () => {
    setCreatingInvite(true);
    try {
      const res = await api.post('/api/v1/alumni/invite?max_uses=100&expires_days=30');
      toast.success('✅ Lien d\'invitation créé !');
      setInvitations(prev => [res.data, ...prev]);
      setShowInviteModal(false);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setCreatingInvite(false);
    }
  };

  const revokeInvitation = async (id: number) => {
    if (!confirm('Révoquer ce lien d\'invitation ?')) return;
    try {
      await api.delete(`/api/v1/alumni/invitations/${id}`);
      toast.success('Lien révoqué');
      setInvitations(prev => prev.map(inv => 
        inv.id === id ? { ...inv, is_active: false } : inv
      ));
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const activateAlumni = async (id: number) => {
    try {
      await api.put(`/api/v1/alumni/admin/${id}/activate`);
      toast.success('✅ Alumni activé !');
      loadAll();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  };

  const rejectAlumni = async (id: number) => {
    if (!confirm('Rejeter cet alumni ?')) return;
    try {
      await api.put(`/api/v1/alumni/admin/${id}/reject`);
      toast.success('Alumni rejeté');
      loadAll();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const sendByEmail = async () => {
    if (!emailData.email || !emailData.first_name || !emailData.last_name) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    
    setSendingEmail(true);
    try {
      const res = await api.post('/api/v1/alumni/invite/send-email', {
        email: emailData.email,
        first_name: emailData.first_name,
        last_name: emailData.last_name,
        token: selectedToken,
      });
      
      if (res.data.email_sent) {
        toast.success(res.data.message);
      } else {
        // SMTP non configuré, on affiche le lien
        toast.success('Lien copié ! (SMTP non configuré)');
        navigator.clipboard.writeText(res.data.invitation_url);
      }
      
      setShowEmailModal(false);
      setEmailData({ email: '', first_name: '', last_name: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setSendingEmail(false);
    }
  };
  

  const copyLink = async (token: string, id: number) => {
    const fullUrl = `${window.location.origin}/register-alumni?token=${token}`;
    
    try {
      // Méthode 1 : API moderne
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(fullUrl);
        toast.success('📋 Lien copié !');
      } else {
        // Méthode 2 : Fallback pour anciens navigateurs
        const textArea = document.createElement('textarea');
        textArea.value = fullUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast.success('📋 Lien copié !');
      }
      
      setCopiedToken(id);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch (error) {
      console.error('Erreur copie:', error);
      // Méthode 3 : Afficher le lien pour copie manuelle
      prompt('Copiez ce lien manuellement :', fullUrl);
    }
  };

  const filteredAlumni = alumniList.filter(a => {
    const matchSearch = !search || 
      `${a.first_name} ${a.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'En attente' },
      active: { bg: 'bg-green-100', text: 'text-green-700', label: 'Actif' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejeté' },
    };
    const config = configs[status] || configs.pending;
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={40} className="animate-spin text-[#FF6B00]" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
        
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <Users size={16} />
              Total
              <button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl font-medium transition-colors"
              >
                <Plus size={18} />
              </button>
            </div>

            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-orange-200 p-4">
            <div className="flex items-center gap-2 text-orange-600 text-sm">
              <Clock size={16} />
              En attente
            </div>
            <p className="text-2xl font-bold text-orange-600 mt-1">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-xl border border-green-200 p-4">
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle size={16} />
              Actifs
            </div>
            <p className="text-2xl font-bold text-green-600 mt-1">{stats.active}</p>
          </div>
          <div className="bg-white rounded-xl border border-blue-200 p-4">
            <div className="flex items-center gap-2 text-blue-600 text-sm">
              <GraduationCap size={16} />
              Mentors
            </div>
            <p className="text-2xl font-bold text-blue-600 mt-1">{stats.mentors}</p>
          </div>
          <div className="bg-white rounded-xl border border-purple-200 p-4">
            <div className="flex items-center gap-2 text-purple-600 text-sm">
              <Link2 size={16} />
              Connections
            </div>
            <p className="text-2xl font-bold text-purple-600 mt-1">{stats.active_connections}</p>
          </div>
        </div>
      )}

      {/* Liens d'invitation actifs - VERSION CORRIGÉE */}
      {invitations.filter(i => i.is_active).length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Link2 size={18} className="text-[#FF6B00]" />
            Liens d'invitation actifs
            </h2>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
            <p className="text-sm text-blue-800">
                💡 <strong>Comment ça marche ?</strong> Copiez le lien et partagez-le dans votre groupe WhatsApp.
            </p>
            </div>

            <div className="space-y-4">
            {invitations.filter(i => i.is_active).map(inv => {
                const fullUrl = `${window.location.origin}/register-alumni?token=${inv.token}`;
                const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`🎓 Rejoignez la communauté Alumni !\n\nInscrivez-vous ici : ${fullUrl}`)}`;
                
                return (
                <div key={inv.id} className="border border-slate-200 rounded-xl p-4 hover:border-[#FF6B00] transition-colors">
                    {/* Stats du lien */}
                    <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                        <Link2 size={18} className="text-[#FF6B00]" />
                        </div>
                        <div>
                        <p className="text-sm font-medium text-slate-900">
                            {inv.used_count} / {inv.max_uses} utilisations
                        </p>
                        <p className="text-xs text-slate-500">
                            Expire le {new Date(inv.expires_at).toLocaleDateString('fr-FR')}
                        </p>
                        </div>
                    </div>
                    <button
                        onClick={() => revokeInvitation(inv.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Révoquer"
                    >
                        <Trash2 size={16} />
                    </button>
                    </div>

                    {/* ✅ LIEN AFFICHÉ EN CLAIR - Sélectionnable */}
                    <div className="mb-3">
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                        📎 Lien d'invitation :
                    </label>
                    <div className="flex items-stretch gap-2">
                        {/* Champ de texte avec le lien complet */}
                        <input
                        type="text"
                        readOnly
                        value={fullUrl}
                        onClick={(e) => {
                            e.currentTarget.select();
                            document.execCommand('copy');
                            toast.success('📋 Lien sélectionné et copié !');
                        }}
                        className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#FF6B00] cursor-pointer"
                        title="Cliquez pour sélectionner et copier"
                        />
                        
                        {/* Bouton copier principal */}
                        <button
                        onClick={() => copyLink(inv.token, inv.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                            copiedToken === inv.id
                            ? 'bg-green-600 text-white'
                            : 'bg-[#FF6B00] hover:bg-[#e55f00] text-white'
                        }`}
                        >
                        {copiedToken === inv.id ? (
                            <>
                            <CheckCircle size={16} />
                            Copié !
                            </>
                        ) : (
                            <>
                            <Copy size={16} />
                            Copier
                            </>
                        )}
                        </button>
                    </div>
                    
                    {/* Message d'aide */}
                    <p className="text-xs text-slate-400 mt-1.5">
                        💡 Cliquez sur le champ pour sélectionner le lien, ou utilisez le bouton "Copier"
                    </p>
                    </div>

                    {/* Boutons d'action */}
                    <div className="grid grid-cols-2 gap-2">
                    {/* Ouvrir le lien pour tester */}
                    <a
                        href={fullUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                    >
                        <Eye size={16} />
                        Tester le lien
                    </a>

                    <button
                      onClick={() => {
                        setSelectedToken(inv.token);
                        setShowEmailModal(true);
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <Mail size={14} />
                      Email
                    </button>

                    {/* WhatsApp */}
                    <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        WhatsApp
                    </a>
                    </div>
                </div>
                );
            })}
            </div>
        </div>
      )}

      {/* Liste des alumni */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Rechercher un alumni..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          >
            <option value="all">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="active">Actifs</option>
            <option value="rejected">Rejetés</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Alumni</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Formation</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Poste</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Statut</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAlumni.map(alumni => (
                <tr key={alumni.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-bold">
                        {alumni.first_name[0]}{alumni.last_name[0]}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{alumni.first_name} {alumni.last_name}</p>
                        <p className="text-xs text-slate-500">{alumni.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-slate-700">{alumni.filiere || 'N/A'}</p>
                    <p className="text-xs text-slate-500">
                      {alumni.graduation_year ? `Promo ${alumni.graduation_year}` : ''}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-slate-700">{alumni.current_position || 'N/A'}</p>
                    <p className="text-xs text-slate-500">{alumni.company || ''}</p>
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(alumni.status)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {alumni.status === 'pending' && (
                        <>
                          <button
                            onClick={() => activateAlumni(alumni.id)}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Activer"
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button
                            onClick={() => rejectAlumni(alumni.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Rejeter"
                          >
                            <XCircle size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredAlumni.length === 0 && (
          <div className="text-center py-12">
            <Users size={40} className="mx-auto text-slate-300 mb-2" />
            <p className="text-slate-500">Aucun alumni trouvé</p>
          </div>
        )}
      </div>

      {/* Modal création invitation */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Link2 className="text-[#FF6B00]" size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Nouveau lien d'invitation</h2>
                <p className="text-sm text-slate-500">Partagez ce lien dans votre groupe WhatsApp</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 mb-4">
              <p className="text-sm text-slate-700">
                <strong>Paramètres par défaut :</strong>
              </p>
              <ul className="text-sm text-slate-600 mt-2 space-y-1">
                <li>• 100 utilisations maximum</li>
                <li>• Valide 30 jours</li>
                <li>• Lien unique partageable</li>
              </ul>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowInviteModal(false)}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={createInvitation}
                disabled={creatingInvite}
                className="flex-1 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {creatingInvite ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <Plus size={16} />
                    Créer le lien
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Mail className="text-[#FF6B00]" size={24} />
                </div>
                <div>
                <h2 className="text-lg font-bold text-slate-900">Envoyer par email</h2>
                <p className="text-sm text-slate-500">L'alumni recevra un email personnalisé</p>
                </div>
            </div>

            <div className="space-y-3">
                <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Prénom</label>
                <input
                    type="text"
                    value={emailData.first_name}
                    onChange={(e) => setEmailData(prev => ({ ...prev, first_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    placeholder="Jean"
                />
                </div>
                <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Nom</label>
                <input
                    type="text"
                    value={emailData.last_name}
                    onChange={(e) => setEmailData(prev => ({ ...prev, last_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    placeholder="Dupont"
                />
                </div>
                <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Email</label>
                <input
                    type="email"
                    value={emailData.email}
                    onChange={(e) => setEmailData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    placeholder="jean.dupont@email.com"
                />
                </div>
            </div>

            <div className="flex gap-3 mt-6">
                <button
                onClick={() => setShowEmailModal(false)}
                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium"
                >
                Annuler
                </button>
                <button
                onClick={sendByEmail}
                disabled={sendingEmail}
                className="flex-1 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                {sendingEmail ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                Envoyer
                </button>
            </div>
            </div>
        </div>
      )}
    </div>
  );
}