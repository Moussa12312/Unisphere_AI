'use client';

import { useState, useEffect } from 'react';
import { 
  DollarSign, Building2, Calendar, Clock, CheckCircle2, 
  AlertTriangle, Plus, Edit3, FileText, Wrench, Sparkles, 
  Loader2, Search, ArrowRight, ShieldCheck, Tag, X, RefreshCw
} from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

function formatFCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}

const BILLING_MODELS: Record<string, { label: string; color: string; badge: string }> = {
  monthly: { label: 'Abonnement Mensuel', color: 'text-blue-700 bg-blue-50 border-blue-200', badge: 'Mensuel' },
  yearly: { label: 'Abonnement Annuel', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', badge: 'Annuel' },
  direct_sale: { label: 'Vente Directe (Licence)', color: 'text-purple-700 bg-purple-50 border-purple-200', badge: 'Vente Directe' },
};

const FEATURE_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  approved: { label: 'Validée', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  in_development: { label: 'En développement', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
  completed: { label: 'Terminée / Livrée', color: 'text-green-700 bg-green-50 border-green-200' },
  billed: { label: 'Facturée', color: 'text-slate-700 bg-slate-100 border-slate-300' },
};

export default function SuperAdminPlansPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'contracts' | 'features'>('contracts');
  const [configs, setConfigs] = useState<any[]>([]);
  const [features, setFeatures] = useState<any[]>([]);
  const [universities, setUniversities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals state
  const [editingConfig, setEditingConfig] = useState<any>(null);
  const [configForm, setConfigForm] = useState<any>({});
  const [savingConfig, setSavingConfig] = useState(false);

  const [invoiceGenModal, setInvoiceGenModal] = useState<any>(null); // { university_id, university_name, category }
  const [genDueDays, setGenDueDays] = useState('30');
  const [genNotes, setGenNotes] = useState('');
  const [generatingInvoice, setGeneratingInvoice] = useState(false);

  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [featureForm, setFeatureForm] = useState({
    university_id: '',
    title: '',
    description: '',
    amount: '',
    status: 'pending',
    notes: ''
  });
  const [editingFeature, setEditingFeature] = useState<any>(null);
  const [savingFeature, setSavingFeature] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cfgRes, featRes, univRes] = await Promise.all([
        api.get('/api/v1/superadmin/billing-configs'),
        api.get('/api/v1/superadmin/feature-requests'),
        api.get('/api/v1/superadmin/universities')
      ]);
      setConfigs(cfgRes.data);
      setFeatures(featRes.data);
      setUniversities(univRes.data);
    } catch (err: any) {
      toast.error('Erreur lors du chargement des configurations tarifaires');
    } finally {
      setLoading(false);
    }
  };

  const openEditConfig = (cfg: any) => {
    setEditingConfig(cfg);
    setConfigForm({
      billing_model: cfg.billing_model,
      amount: cfg.amount,
      maintenance_enabled: cfg.maintenance_enabled,
      maintenance_interval_months: cfg.maintenance_interval_months || 6,
      maintenance_amount: cfg.maintenance_amount || 0,
      next_maintenance_date: cfg.next_maintenance_date || '',
      contract_start_date: cfg.contract_start_date || '',
      contract_end_date: cfg.contract_end_date || '',
      notes: cfg.notes || ''
    });
  };

  const handleSaveConfig = async () => {
    if (!editingConfig) return;
    setSavingConfig(true);
    try {
      await api.put(`/api/v1/superadmin/billing-configs/${editingConfig.university_id}`, {
        billing_model: configForm.billing_model,
        amount: parseFloat(configForm.amount) || 0,
        maintenance_enabled: Boolean(configForm.maintenance_enabled),
        maintenance_interval_months: parseInt(configForm.maintenance_interval_months) || 6,
        maintenance_amount: parseFloat(configForm.maintenance_amount) || 0,
        next_maintenance_date: configForm.next_maintenance_date || null,
        contract_start_date: configForm.contract_start_date || null,
        contract_end_date: configForm.contract_end_date || null,
        notes: configForm.notes || null
      });
      toast.success('Configuration tarifaire enregistrée');
      setEditingConfig(null);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la mise à jour');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleGenerateInvoice = async () => {
    if (!invoiceGenModal) return;
    setGeneratingInvoice(true);
    try {
      const res = await api.post(`/api/v1/superadmin/billing-configs/${invoiceGenModal.university_id}/generate-invoice`, {
        category: invoiceGenModal.category,
        due_days: parseInt(genDueDays) || 30,
        notes: genNotes || undefined
      });
      toast.success(res.data.message || 'Facture générée avec succès');
      setInvoiceGenModal(null);
      setGenNotes('');
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la génération de facture');
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const handleSaveFeature = async () => {
    if (!featureForm.title || !featureForm.amount) {
      toast.error('Titre et montant sont requis');
      return;
    }
    setSavingFeature(true);
    try {
      if (editingFeature) {
        await api.put(`/api/v1/superadmin/feature-requests/${editingFeature.id}`, {
          title: featureForm.title,
          description: featureForm.description,
          amount: parseFloat(featureForm.amount) || 0,
          status: featureForm.status,
          notes: featureForm.notes
        });
        toast.success('Fonctionnalité mise à jour');
      } else {
        if (!featureForm.university_id) {
          toast.error('Veuillez sélectionner une université');
          setSavingFeature(false);
          return;
        }
        await api.post('/api/v1/superadmin/feature-requests', {
          university_id: parseInt(featureForm.university_id),
          title: featureForm.title,
          description: featureForm.description,
          amount: parseFloat(featureForm.amount) || 0,
          status: featureForm.status,
          notes: featureForm.notes
        });
        toast.success('Nouvelle demande de fonctionnalité enregistrée');
      }
      setShowFeatureModal(false);
      setEditingFeature(null);
      setFeatureForm({ university_id: '', title: '', description: '', amount: '', status: 'pending', notes: '' });
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Erreur lors de l'enregistrement");
    } finally {
      setSavingFeature(false);
    }
  };

  const handleBillFeature = async (feat: any) => {
    try {
      const res = await api.post(`/api/v1/superadmin/feature-requests/${feat.id}/generate-invoice`, {
        due_days: 30
      });
      toast.success(res.data.message || 'Facture émise avec succès');
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la facturation');
    }
  };

  const filteredConfigs = configs.filter(c => 
    c.university_name.toLowerCase().includes(search.toLowerCase()) ||
    c.university_email?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredFeatures = features.filter(f =>
    f.title.toLowerCase().includes(search.toLowerCase()) ||
    f.university_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <DollarSign className="text-[#FF6B00]" size={28} />
            Tarification & Facturation Universités
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gestion des abonnements (mensuel, annuel, vente directe), maintenance semestrielle et fonctionnalités spécifiques payantes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Actualiser
          </button>
          {activeTab === 'features' && (
            <button
              onClick={() => {
                setEditingFeature(null);
                setFeatureForm({ university_id: universities[0]?.id?.toString() || '', title: '', description: '', amount: '', status: 'pending', notes: '' });
                setShowFeatureModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#FF6B00] hover:bg-[#e05e00] rounded-xl shadow-md transition-all"
            >
              <Plus size={18} /> Nouvelle Demande
            </button>
          )}
        </div>
      </div>

      {/* Onglets */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('contracts')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'contracts'
              ? 'border-[#FF6B00] text-[#FF6B00]'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Building2 size={18} />
          Modèles Tarifaires & Maintenance ({configs.length})
        </button>
        <button
          onClick={() => setActiveTab('features')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'features'
              ? 'border-[#FF6B00] text-[#FF6B00]'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Sparkles size={18} />
          Fonctionnalités Spécifiques Sur-Mesure ({features.length})
        </button>
      </div>

      {/* Barre de recherche */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par université ou intitulé..."
          className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="animate-spin text-[#FF6B00]" size={36} />
        </div>
      ) : activeTab === 'contracts' ? (
        /* TAB 1: MODÈLES TARIFAIRES ET MAINTENANCE */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredConfigs.map((cfg) => {
            const modelInfo = BILLING_MODELS[cfg.billing_model] || BILLING_MODELS.monthly;
            return (
              <div
                key={cfg.id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col justify-between"
              >
                <div className="p-5 border-b border-slate-100 dark:border-slate-700/60">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                        <Building2 className="text-[#FF6B00]" size={20} />
                        {cfg.university_name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{cfg.university_email || 'Email non renseigné'}</p>
                    </div>
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${modelInfo.color}`}>
                      {modelInfo.label}
                    </span>
                  </div>

                  {/* Détails financiers */}
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                      <span className="text-xs text-slate-500 dark:text-slate-400 block">Tarif de base</span>
                      <span className="text-base font-bold text-slate-900 dark:text-white">{formatFCFA(cfg.amount)}</span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {cfg.billing_model === 'monthly' ? '/ mois' : cfg.billing_model === 'yearly' ? '/ an' : 'Paiement unique'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                      <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Wrench size={12} className="text-[#FF6B00]" /> Suivi & Maintenance (6 mois)
                      </span>
                      <span className="text-base font-bold text-slate-900 dark:text-white">
                        {cfg.maintenance_enabled ? formatFCFA(cfg.maintenance_amount) : 'Désactivé'}
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {cfg.next_maintenance_date ? `Prochaine : ${cfg.next_maintenance_date}` : 'Tous les 6 mois'}
                      </span>
                    </div>
                  </div>

                  {/* Facturation globale */}
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                    <span>Total facturé : <strong>{formatFCFA(cfg.total_invoiced)}</strong></span>
                    <span>Encaissé : <strong className="text-green-600">{formatFCFA(cfg.total_paid)}</strong></span>
                    <span>Reste dû : <strong className="text-amber-600">{formatFCFA(cfg.balance_due)}</strong></span>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-4 bg-slate-50/70 dark:bg-slate-900/30 flex flex-wrap items-center justify-between gap-2">
                  <button
                    onClick={() => openEditConfig(cfg)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Edit3 size={14} /> Configurer le contrat
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setInvoiceGenModal({
                        university_id: cfg.university_id,
                        university_name: cfg.university_name,
                        category: cfg.billing_model
                      })}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#0a1628] hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <FileText size={14} /> Facturer Abonnement
                    </button>

                    {cfg.maintenance_enabled && (
                      <button
                        onClick={() => setInvoiceGenModal({
                          university_id: cfg.university_id,
                          university_name: cfg.university_name,
                          category: 'maintenance'
                        })}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors"
                      >
                        <Wrench size={14} /> Facturer Maintenance (6m)
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TAB 2: DEMANDES DE NOUVELLES FONCTIONNALITÉS SPÉCIFIQUES */
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-5 py-3.5">Université</th>
                  <th className="px-5 py-3.5">Fonctionnalité demandée</th>
                  <th className="px-5 py-3.5">Montant convenu</th>
                  <th className="px-5 py-3.5">Statut</th>
                  <th className="px-5 py-3.5">Facture liée</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredFeatures.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                      Aucune demande de fonctionnalité spécifique enregistrée.
                    </td>
                  </tr>
                ) : (
                  filteredFeatures.map((feat) => {
                    const st = FEATURE_STATUS[feat.status] || FEATURE_STATUS.pending;
                    return (
                      <tr key={feat.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white">
                          {feat.university_name}
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-medium text-slate-900 dark:text-white block">{feat.title}</span>
                          {feat.description && (
                            <span className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{feat.description}</span>
                          )}
                        </td>
                        <td className="px-5 py-4 font-bold text-[#FF6B00]">
                          {formatFCFA(feat.amount)}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${st.color}`}>
                            {st.label}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {feat.invoice_number ? (
                            <span className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                              {feat.invoice_number} ({feat.invoice_status})
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Non facturée</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right space-x-2">
                          <button
                            onClick={() => {
                              setEditingFeature(feat);
                              setFeatureForm({
                                university_id: feat.university_id.toString(),
                                title: feat.title,
                                description: feat.description || '',
                                amount: feat.amount.toString(),
                                status: feat.status,
                                notes: feat.notes || ''
                              });
                              setShowFeatureModal(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                            title="Modifier"
                          >
                            <Edit3 size={16} />
                          </button>
                          {!feat.invoice_id && (
                            <button
                              onClick={() => handleBillFeature(feat)}
                              className="px-2.5 py-1 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm"
                            >
                              Émettre Facture
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL EDIT CONFIGURATION CONTRAT */}
      {editingConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Configuration Tarifaire - {editingConfig.university_name}
              </h2>
              <button onClick={() => setEditingConfig(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Modèle de facturation principal
                </label>
                <select
                  value={configForm.billing_model}
                  onChange={(e) => setConfigForm({ ...configForm, billing_model: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="monthly">Abonnement Mensuel (Récurrent)</option>
                  <option value="yearly">Abonnement Annuel (Récurrent)</option>
                  <option value="direct_sale">Vente Directe (Licence Définitive / Perpétuelle)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Montant de base (FCFA)
                </label>
                <input
                  type="number"
                  value={configForm.amount}
                  onChange={(e) => setConfigForm({ ...configForm, amount: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              {/* Suivi et Maintenance 6 mois */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl space-y-3 border border-slate-200/60 dark:border-slate-700/60">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Wrench size={16} className="text-[#FF6B00]" /> Suivi & Maintenance (tous les 6 mois)
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={configForm.maintenance_enabled}
                      onChange={(e) => setConfigForm({ ...configForm, maintenance_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF6B00]"></div>
                  </label>
                </div>

                {configForm.maintenance_enabled && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Montant semestriel (FCFA)</label>
                      <input
                        type="number"
                        value={configForm.maintenance_amount}
                        onChange={(e) => setConfigForm({ ...configForm, maintenance_amount: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Prochaine échéance maintenance</label>
                      <input
                        type="date"
                        value={configForm.next_maintenance_date}
                        onChange={(e) => setConfigForm({ ...configForm, next_maintenance_date: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Notes du contrat</label>
                <textarea
                  rows={2}
                  value={configForm.notes}
                  onChange={(e) => setConfigForm({ ...configForm, notes: e.target.value })}
                  placeholder="Conditions particulières, clauses..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => setEditingConfig(null)}
                className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveConfig}
                disabled={savingConfig}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-[#FF6B00] hover:bg-[#e05e00] rounded-xl shadow-md disabled:opacity-50"
              >
                {savingConfig ? <Loader2 size={16} className="animate-spin" /> : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL GÉNÉRATION DE FACTURE RAPIDE */}
      {invoiceGenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Générer une Facture Client
            </h2>
            <p className="text-sm text-slate-500">
              Établissement : <strong>{invoiceGenModal.university_name}</strong>
              <br />
              Type : <strong>{invoiceGenModal.category === 'maintenance' ? 'Maintenance Semestrielle (6 mois)' : 'Abonnement / Vente'}</strong>
            </p>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Délai de paiement (jours)
                </label>
                <input
                  type="number"
                  value={genDueDays}
                  onChange={(e) => setGenDueDays(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes ou instructions particulières
                </label>
                <textarea
                  rows={2}
                  value={genNotes}
                  onChange={(e) => setGenNotes(e.target.value)}
                  placeholder="Préciser les modalités de virement..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => setInvoiceGenModal(null)}
                className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
              >
                Annuler
              </button>
              <button
                onClick={handleGenerateInvoice}
                disabled={generatingInvoice}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl shadow-md disabled:opacity-50"
              >
                {generatingInvoice ? <Loader2 size={16} className="animate-spin" /> : 'Confirmer & Émettre'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOUVELLE / ÉDITION DEMANDE DE FONCTIONNALITÉ */}
      {showFeatureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingFeature ? 'Modifier la Fonctionnalité Sur-Mesure' : 'Nouvelle Demande de Fonctionnalité'}
              </h2>
              <button onClick={() => setShowFeatureModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              {!editingFeature && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Université demanderesse
                  </label>
                  <select
                    value={featureForm.university_id}
                    onChange={(e) => setFeatureForm({ ...featureForm, university_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    {universities.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Intitulé de la fonctionnalité
                </label>
                <input
                  type="text"
                  placeholder="Ex : Passerelle de paiement Wave / Orange Money..."
                  value={featureForm.title}
                  onChange={(e) => setFeatureForm({ ...featureForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Montant convenu (FCFA) - Configurable
                </label>
                <input
                  type="number"
                  placeholder="Ex : 750000"
                  value={featureForm.amount}
                  onChange={(e) => setFeatureForm({ ...featureForm, amount: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Statut de développement
                </label>
                <select
                  value={featureForm.status}
                  onChange={(e) => setFeatureForm({ ...featureForm, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="pending">En attente de cadrage</option>
                  <option value="approved">Validée / Approuvée</option>
                  <option value="in_development">En cours de développement</option>
                  <option value="completed">Terminée & Livrée</option>
                  <option value="billed">Facturée</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Cahier des charges / Spécifications
                </label>
                <textarea
                  rows={3}
                  placeholder="Détails techniques et périmètre convenu..."
                  value={featureForm.description}
                  onChange={(e) => setFeatureForm({ ...featureForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => setShowFeatureModal(false)}
                className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveFeature}
                disabled={savingFeature}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-[#FF6B00] hover:bg-[#e05e00] rounded-xl shadow-md disabled:opacity-50"
              >
                {savingFeature ? <Loader2 size={16} className="animate-spin" /> : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
