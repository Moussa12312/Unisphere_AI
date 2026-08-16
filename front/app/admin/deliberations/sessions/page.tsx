'use client';

import { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, X, Save, Loader2, Users, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { deliberationService, DeliberationSession, DeliberationRule } from '@/services/deliberationService';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/hooks/useConfirm';

const emptyForm = {
  title: '', filiere: '', level: '', academic_year: '',
  session_date: '', jury_members: '', rule_id: undefined as number | undefined
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Brouillon', color: 'bg-slate-100 text-slate-600' },
  in_progress: { label: 'En cours', color: 'bg-amber-100 text-amber-700' },
  completed: { label: 'Clôturée', color: 'bg-green-100 text-green-700' },
};

export default function DeliberationSessionsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();

  const [sessions, setSessions] = useState<DeliberationSession[]>([]);
  const [rules, setRules] = useState<DeliberationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sessionsData, rulesData] = await Promise.all([
        deliberationService.getSessions(),
        deliberationService.getRules()
      ]);
      setSessions(sessionsData);
      setRules(rulesData);
    } catch (error) {
      toast.error('Erreur lors du chargement des sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.title || !formData.filiere || !formData.level || !formData.academic_year) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    setSaving(true);
    try {
      await deliberationService.createSession(formData);
      toast.success('Session créée avec succès');
      setShowModal(false);
      setFormData(emptyForm);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (s: DeliberationSession) => {
    const ok = await confirm({
      title: 'Supprimer cette session ?',
      message: `Supprimer la session "${s.title}" et toutes ses décisions associées ?`,
      confirmText: 'Supprimer',
      variant: 'danger'
    });
    if (!ok) return;
    try {
      await deliberationService.deleteSession(s.id);
      toast.success('Session supprimée');
      loadData();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
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
          <h1 className="text-3xl font-bold text-slate-900">Sessions de jury</h1>
          <p className="text-slate-500 mt-1">Organisez les délibérations par filière et niveau</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-sm font-medium transition-all shadow-md"
        >
          <Plus size={16} /> Nouvelle session
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Calendar className="mx-auto text-slate-300 mb-3" size={48} />
          <p className="text-slate-500">Aucune session de délibération créée</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => {
            const statusConfig = STATUS_LABELS[s.status] || STATUS_LABELS.draft;
            return (
              <div key={s.id} className="bg-white rounded-xl border border-slate-200 p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Calendar className="text-blue-600" size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900 truncate">{s.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {s.filiere} • {s.level} • {s.academic_year}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                      <Users size={12} /> {s.decisions_count} décision(s) enregistrée(s)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => router.push(`/admin/deliberations/decisions?session=${s.id}`)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#0a1628] hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Gérer <ArrowRight size={14} />
                  </button>
                  <button onClick={() => handleDelete(s)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">Nouvelle session</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Titre *</label>
                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Délibération L3 Info - Session normale"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Filière *</label>
                  <input type="text" value={formData.filiere} onChange={(e) => setFormData({ ...formData, filiere: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Niveau *</label>
                  <input type="text" value={formData.level} onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    placeholder="Ex: L3"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Année académique *</label>
                  <input type="text" value={formData.academic_year} onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                    placeholder="2025-2026"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Date de session</label>
                  <input type="date" value={formData.session_date} onChange={(e) => setFormData({ ...formData, session_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Règle de validation</label>
                <select value={formData.rule_id ?? ''} onChange={(e) => setFormData({ ...formData, rule_id: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]">
                  <option value="">Aucune (valeurs par défaut : moyenne ≥ 10)</option>
                  {rules.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Membres du jury</label>
                <textarea value={formData.jury_members} onChange={(e) => setFormData({ ...formData, jury_members: e.target.value })}
                  placeholder="Noms des membres du jury..."
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium">
                Annuler
              </button>
              <button onClick={handleCreate} disabled={saving}
                className="flex-1 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Création...' : 'Créer la session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
