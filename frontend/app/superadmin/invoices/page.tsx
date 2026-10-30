'use client';

import { useState, useEffect } from 'react';
import {
  FileText, Plus, X, Save, Loader2, DollarSign, Calendar,
  Building2, CheckCircle2, AlertTriangle, Clock, Printer, Check, CreditCard
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

function formatFCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'En attente', color: 'text-amber-700 bg-amber-50 border-amber-200', icon: Clock },
  paid: { label: 'Soldée / Payée', color: 'text-green-700 bg-green-50 border-green-200', icon: CheckCircle2 },
  overdue: { label: 'En retard', color: 'text-red-700 bg-red-50 border-red-200', icon: AlertTriangle },
  cancelled: { label: 'Annulée', color: 'text-slate-600 bg-slate-100 border-slate-200', icon: X },
};

const INVOICE_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  subscription: { label: 'Abonnement SaaS', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  direct_sale: { label: 'Vente Directe', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  maintenance: { label: 'Maintenance (6 mois)', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  feature_request: { label: 'Fonctionnalité Sur-Mesure', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  other: { label: 'Autre prestation', color: 'bg-slate-100 text-slate-700 border-slate-300' },
};

const emptyInvoiceForm = {
  university_id: '',
  title: '',
  description: '',
  amount: '',
  invoice_type: 'subscription',
  issue_date: new Date().toISOString().split('T')[0],
  due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  notes: ''
};

export default function SuperAdminInvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [universities, setUniversities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState(emptyInvoiceForm);
  const [savingInvoice, setSavingInvoice] = useState(false);

  // Modal Solder facture directement
  const [settlingInvoice, setSettlingInvoice] = useState<any | null>(null);
  const [settleMethod, setSettleMethod] = useState('virement');
  const [settleRef, setSettleRef] = useState('');
  const [settleNotes, setSettleNotes] = useState('');
  const [processingSettle, setProcessingSettle] = useState(false);

  // Modal Impression Reçu Officiel Entreprise
  const [receiptInvoice, setReceiptInvoice] = useState<any | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [invRes, unisRes] = await Promise.all([
        api.get('/api/v1/superadmin/invoices'),
        api.get('/api/v1/superadmin/universities')
      ]);
      setInvoices(invRes.data || []);
      setUniversities(unisRes.data || []);
    } catch (error) {
      toast.error('Erreur lors du chargement des factures');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (!invoiceForm.university_id || !invoiceForm.title || !invoiceForm.amount) {
      toast.error('Université, objet et montant sont requis');
      return;
    }
    setSavingInvoice(true);
    try {
      await api.post('/api/v1/superadmin/invoices', {
        university_id: parseInt(invoiceForm.university_id),
        title: invoiceForm.title,
        description: invoiceForm.description || undefined,
        amount: parseFloat(invoiceForm.amount),
        issue_date: invoiceForm.issue_date,
        due_date: invoiceForm.due_date,
        invoice_type: invoiceForm.invoice_type || 'subscription',
        notes: invoiceForm.notes || undefined
      });
      toast.success('Facture client émise avec succès');
      setShowCreateModal(false);
      setInvoiceForm(emptyInvoiceForm);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la création');
    } finally {
      setSavingInvoice(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!settlingInvoice) return;
    setProcessingSettle(true);
    try {
      const res = await api.post(`/api/v1/superadmin/invoices/${settlingInvoice.id}/mark-paid`, {
        payment_method: settleMethod,
        reference: settleRef.trim() || undefined,
        notes: settleNotes.trim() || undefined,
        payment_date: new Date().toISOString().split('T')[0]
      });
      toast.success(res.data.message || 'Facture marquée comme soldée !');
      const updatedInv = { ...settlingInvoice, status: 'paid', balance: 0, total_paid: settlingInvoice.amount };
      setSettlingInvoice(null);
      setSettleRef('');
      setSettleNotes('');
      loadData();
      // Proposer directement l'impression du reçu officiel
      setReceiptInvoice(updatedInv);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la validation du solde');
    } finally {
      setProcessingSettle(false);
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    if (activeFilter === 'all') return true;
    return inv.status === activeFilter;
  });

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <ReceiptIcon className="text-[#FF6B00]" size={28} />
            Facturation & Recettes SaaS
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Émission des factures clients, validation des règlements directs et reçus officiels
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all self-start sm:self-auto"
        >
          <Plus size={16} /> Émettre une Facture
        </button>
      </div>

      {/* Onglets Filtres */}
      <div className="flex gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        {[
          { key: 'all', label: 'Toutes', count: invoices.length },
          { key: 'pending', label: 'En attente', count: invoices.filter(i => i.status === 'pending').length },
          { key: 'overdue', label: 'En retard', count: invoices.filter(i => i.status === 'overdue').length },
          { key: 'paid', label: 'Soldées / Payées', count: invoices.filter(i => i.status === 'paid').length },
          { key: 'cancelled', label: 'Annulées', count: invoices.filter(i => i.status === 'cancelled').length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeFilter === tab.key
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {tab.label}
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeFilter === tab.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Table responsive */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 size={32} className="animate-spin text-[#FF6B00]" />
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
          Aucune facture pour ce filtre.
        </div>
      ) : (
        <>
          {/* Vue Mobile Cards (< 768px) */}
          <div className="block md:hidden space-y-3">
            {filteredInvoices.map((inv) => {
              const conf = STATUS_CONFIG[inv.status] || STATUS_CONFIG.pending;
              const typeConf = INVOICE_TYPE_CONFIG[inv.invoice_type] || INVOICE_TYPE_CONFIG.subscription;
              const Icon = conf.icon;
              const isPaid = inv.status === 'paid';

              return (
                <div key={inv.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-slate-900 text-sm">{inv.invoice_number}</span>
                      <p className="text-[11px] text-slate-400">Émise le {new Date(inv.issue_date).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${conf.color}`}>
                      <Icon size={12} />
                      {conf.label}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                      <Building2 size={14} className="text-slate-400 flex-shrink-0" />
                      <span>{inv.university_name}</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-900 mt-0.5">{inv.title}</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold border ${typeConf.color}`}>
                      {typeConf.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Montant Total</span>
                      <span className="font-black text-slate-900">{formatFCFA(inv.amount)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 text-[10px] block">Reste Dû</span>
                      {isPaid || inv.balance <= 0 ? (
                        <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          Soldée (0 FCFA)
                        </span>
                      ) : (
                        <span className="text-amber-600 font-bold">{formatFCFA(inv.balance)}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    {!isPaid && inv.status !== 'cancelled' && (
                      <button
                        onClick={() => {
                          setSettlingInvoice(inv);
                          setSettleMethod('virement');
                          setSettleRef(`REG-${inv.invoice_number}`);
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                      >
                        <Check size={14} />
                        Solder la facture
                      </button>
                    )}
                    <button
                      onClick={() => setReceiptInvoice(inv)}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all"
                    >
                      <Printer size={14} />
                      Reçu officiel
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Vue Table Bureau (>= 768px) */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[780px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">N° Facture</th>
                    <th className="p-3.5">Université Client</th>
                    <th className="p-3.5">Objet & Catégorie</th>
                    <th className="p-3.5 text-right">Montant Total</th>
                    <th className="p-3.5 text-center">Statut</th>
                    <th className="p-3.5 text-right">Reste Dû</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.map((inv) => {
                    const conf = STATUS_CONFIG[inv.status] || STATUS_CONFIG.pending;
                    const typeConf = INVOICE_TYPE_CONFIG[inv.invoice_type] || INVOICE_TYPE_CONFIG.subscription;
                    const Icon = conf.icon;
                    const isPaid = inv.status === 'paid';

                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-slate-900">
                          <div>{inv.invoice_number}</div>
                          <div className="text-[10px] text-slate-400 font-normal">
                            Émise le {new Date(inv.issue_date).toLocaleDateString('fr-FR')}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5 font-bold text-slate-800">
                            <Building2 size={14} className="text-slate-400 flex-shrink-0" />
                            <span className="truncate max-w-[200px]">{inv.university_name}</span>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-900">{inv.title}</div>
                          <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold border ${typeConf.color}`}>
                            {typeConf.label}
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-black text-slate-900">
                          {formatFCFA(inv.amount)}
                        </td>
                        <td className="p-3.5 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${conf.color}`}>
                            <Icon size={12} />
                            {conf.label}
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-black">
                          {isPaid || inv.balance <= 0 ? (
                            <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                              Soldée (0 FCFA)
                            </span>
                          ) : (
                            <span className="text-amber-600 font-bold">
                              {formatFCFA(inv.balance)}
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-right space-x-1.5">
                          {!isPaid && inv.status !== 'cancelled' && (
                            <button
                              onClick={() => {
                                setSettlingInvoice(inv);
                                setSettleMethod('virement');
                                setSettleRef(`REG-${inv.invoice_number}`);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                            >
                              <Check size={13} />
                              Marquer comme soldée
                            </button>
                          )}

                          <button
                            onClick={() => setReceiptInvoice(inv)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition-all"
                            title="Imprimer Reçu Officiel"
                          >
                            <Printer size={13} />
                            Reçu
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modal: Émettre une Facture */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">Émettre une Facture Client</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Université Client *</label>
                <select
                  value={invoiceForm.university_id}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, university_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-[#FF6B00] outline-none"
                >
                  <option value="">Sélectionner une université...</option>
                  {universities.map(u => (
                    <option key={u.university.id} value={u.university.id}>
                      {u.university.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Type de Prestation / Modèle *</label>
                <select
                  value={invoiceForm.invoice_type}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, invoice_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-[#FF6B00] outline-none"
                >
                  <option value="subscription">Abonnement SaaS (Mensuel / Annuel)</option>
                  <option value="direct_sale">Vente Directe (Licence Définitive)</option>
                  <option value="maintenance">Maintenance Semestrielle (6 mois)</option>
                  <option value="feature_request">Fonctionnalité Sur-Mesure</option>
                  <option value="other">Autre prestation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Objet / Libellé de la facture *</label>
                <input
                  type="text"
                  value={invoiceForm.title}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, title: e.target.value })}
                  placeholder="ex: Abonnement Annuel Plateforme UniSphere AI 2026-2027"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#FF6B00] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Montant Total (FCFA) *</label>
                  <input
                    type="number"
                    value={invoiceForm.amount}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })}
                    placeholder="Montant en FCFA"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#FF6B00] outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date d'Échéance *</label>
                  <input
                    type="date"
                    value={invoiceForm.due_date}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#FF6B00] outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateInvoice}
                disabled={savingInvoice}
                className="flex-1 px-4 py-2 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md"
              >
                {savingInvoice ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Créer la Facture
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Marquer la Facture comme Soldée */}
      {settlingInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Marquer comme Payée / Soldée</h3>
                <p className="text-xs text-slate-500">{settlingInvoice.university_name} • Facture {settlingInvoice.invoice_number}</p>
              </div>
              <button onClick={() => setSettlingInvoice(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-xs text-emerald-900 space-y-1">
              <div className="flex justify-between">
                <span>Montant facture :</span>
                <span className="font-bold">{formatFCFA(settlingInvoice.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Reste à solder :</span>
                <span className="font-black text-emerald-700">{formatFCFA(settlingInvoice.balance)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mode de règlement reçu *</label>
                <select
                  value={settleMethod}
                  onChange={(e) => setSettleMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                >
                  <option value="cheque">Chèque bancaire</option>
                  <option value="especes">Espèces (Paiement direct en main propre)</option>
                  <option value="virement">Virement bancaire</option>
                  <option value="mobile_money">Mobile Money (Wave / Orange Money)</option>
                  <option value="carte">Carte bancaire</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">N° de chèque ou Référence transaction</label>
                <input
                  type="text"
                  value={settleRef}
                  onChange={(e) => setSettleRef(e.target.value)}
                  placeholder="ex: CHQ-849202 ou REF-OM-99238"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Observation / Note (optionnel)</label>
                <textarea
                  rows={2}
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  placeholder="Solder par le directeur administratif..."
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setSettlingInvoice(null)}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                onClick={handleMarkAsPaid}
                disabled={processingSettle}
                className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {processingSettle ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Confirmer le Solde
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal / Vue Imprimable du Reçu Officiel Entreprise */}
      {receiptInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 print:p-0">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[95vh] overflow-y-auto print:max-h-none print:shadow-none print:border-none print:p-0">
            {/* Action Bar (masquée à l'impression) */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6 print:hidden">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Aperçu du Reçu Officiel de Paiement
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-xs font-bold shadow-md transition-all"
                >
                  <Printer size={14} /> Imprimer le Reçu
                </button>
                <button
                  onClick={() => setReceiptInvoice(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Document imprimable */}
            <div className="space-y-6 text-slate-800 print:text-black">
              {/* Header avec Logo Entreprise & Mention Officielle */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
                <div className="flex items-center gap-3">
                  <img
                    src="/logo.png"
                    alt="Logo Entreprise UniSphere AI"
                    className="h-12 w-12 object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">UNISPHERE AI ENTERPRISE</h2>
                    <p className="text-[11px] text-slate-500 font-medium">Éditeur & Fournisseur de Solutions Universitaires Intelligentes</p>
                    <p className="text-[10px] text-slate-400">Direction Générale SaaS • Mali / Afrique de l'Ouest</p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="inline-block px-3 py-1 bg-emerald-100 border border-emerald-300 text-emerald-800 font-black rounded-lg text-xs uppercase tracking-wider">
                    REÇU OFFICIEL DE RÈGLEMENT
                  </div>
                  <div className="text-xs font-mono font-bold text-slate-700 mt-1">
                    N° {receiptInvoice.invoice_number}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Date : {new Date().toLocaleDateString('fr-FR')}
                  </div>
                </div>
              </div>

              {/* Informations Client */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Émis au bénéfice de :</span>
                  <div className="font-black text-slate-900 text-sm mt-0.5">{receiptInvoice.university_name}</div>
                  <div className="text-slate-500 mt-0.5">Établissement Enseignement Supérieur Partenaire</div>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Prestation facturée :</span>
                  <div className="font-bold text-slate-900 mt-0.5">{receiptInvoice.title}</div>
                  <div className="text-slate-500 mt-0.5">{receiptInvoice.invoice_type || 'Licence Logicielle'}</div>
                </div>
              </div>

              {/* Détails du Montant & Statut */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 font-bold text-slate-700">
                    <tr>
                      <th className="p-3 text-left">Désignation</th>
                      <th className="p-3 text-right">Montant Facturé</th>
                      <th className="p-3 text-right">Montant Encaissé</th>
                      <th className="p-3 text-right">Solde Restant</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-slate-200">
                      <td className="p-3 font-semibold text-slate-900">
                        Règlement définitif des droits de licence / abonnement
                      </td>
                      <td className="p-3 text-right font-bold text-slate-900">
                        {formatFCFA(receiptInvoice.amount)}
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-700">
                        {formatFCFA(receiptInvoice.amount)}
                      </td>
                      <td className="p-3 text-right font-bold text-slate-500">
                        0 FCFA
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Cachet & Signature */}
              <div className="pt-6 flex items-end justify-between border-t border-slate-200">
                <div className="text-[11px] text-slate-500 space-y-0.5">
                  <p className="font-bold text-slate-700">Certifié conforme par la Direction Financière</p>
                  <p>UniSphere AI Entreprise • Tous droits réservés</p>
                  <p className="text-[10px] text-slate-400 font-mono">Authentification SHA-256 certifiée</p>
                </div>

                <div className="text-center p-3 border border-dashed border-emerald-400 rounded-xl bg-emerald-50/50 min-w-[180px]">
                  <div className="text-[11px] font-black text-emerald-800 uppercase tracking-wider">
                    ★ FACTURE INTÉGRALEMENT SOLDÉE ★
                  </div>
                  <div className="text-[10px] text-emerald-700 font-mono mt-1">
                    Validé le {new Date().toLocaleDateString('fr-FR')}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-1 italic">
                    Signature & Cachet Super-Admin
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReceiptIcon(props: any) {
  return <FileText {...props} />;
}
