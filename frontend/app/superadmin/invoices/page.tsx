'use client';

import { useState, useEffect } from 'react';
import { FileText, Plus, X, Save, Loader2, DollarSign, Calendar, Building2, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/hooks/useConfirm';

function formatFCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'En attente', color: 'text-amber-700 bg-amber-50 border-amber-200', icon: Clock },
  paid: { label: 'Payée', color: 'text-green-700 bg-green-50 border-green-200', icon: CheckCircle2 },
  overdue: { label: 'En retard', color: 'text-red-700 bg-red-50 border-red-200', icon: AlertTriangle },
  cancelled: { label: 'Annulée', color: 'text-slate-600 bg-slate-100 border-slate-200', icon: X },
};

const emptyInvoiceForm = {
  university_id: '',
  title: '',
  description: '',
  amount: '',
  issue_date: new Date().toISOString().split('T')[0],
  due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  notes: ''
};

const emptyPayForm = {
  amount: '',
  payment_date: new Date().toISOString().split('T')[0],
  payment_method: 'virement',
  reference: '',
  notes: ''
};

export default function SuperAdminInvoicesPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [universities, setUniversities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState(emptyInvoiceForm);
  const [savingInvoice, setSavingInvoice] = useState(false);

  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [payForm, setPayForm] = useState(emptyPayForm);
  const [savingPayment, setSavingPayment] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [invRes, unisRes] = await Promise.all([
        api.get('/api/v1/superadmin/invoices'),
        api.get('/api/v1/superadmin/universities')
      ]);
      setInvoices(invRes.data);
      setUniversities(unisRes.data);
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
        notes: invoiceForm.notes || undefined
      });
      toast.success('Facture client créée avec succès');
      setShowCreateModal(false);
      setInvoiceForm(emptyInvoiceForm);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la création');
    } finally {
      setSavingInvoice(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedInvoice || !payForm.amount) {
      toast.error('Le montant du règlement est requis');
      return;
    }
    setSavingPayment(true);
    try {
      await api.post('/api/v1/superadmin/payments', {
        invoice_id: selectedInvoice.id,
        amount: parseFloat(payForm.amount),
        payment_date: payForm.payment_date,
        payment_method: payForm.payment_method,
        reference: payForm.reference || undefined,
        notes: payForm.notes || undefined
      });
      toast.success('Règlement enregistré avec succès');
      setSelectedInvoice(null);
      setPayForm(emptyPayForm);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors du règlement');
    } finally {
      setSavingPayment(false);
    }
  };

  const handleCancelInvoice = async (inv: any) => {
    const ok = await confirm({
      title: `Annuler la facture ${inv.invoice_number} ?`,
      message: `Cette facture pour "${inv.university_name}" sera marquée comme annulée.`,
      confirmText: 'Annuler la facture',
      variant: 'danger'
    });
    if (!ok) return;

    try {
      await api.delete(`/api/v1/superadmin/invoices/${inv.id}`);
      toast.success('Facture annulée');
      loadData();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    if (activeFilter === 'all') return true;
    return inv.status === activeFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B00] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Factures Clients</h1>
          <p className="text-slate-500 mt-1">Gestion et émission des factures de services pour les universités</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-sm font-medium shadow-md transition-all"
        >
          <Plus size={18} /> Nouvelle Facture
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        {[
          { key: 'all', label: 'Toutes les factures', count: invoices.length },
          { key: 'pending', label: 'En attente', count: invoices.filter(i => i.status === 'pending').length },
          { key: 'overdue', label: 'En retard', count: invoices.filter(i => i.status === 'overdue').length },
          { key: 'paid', label: 'Payées', count: invoices.filter(i => i.status === 'paid').length },
          { key: 'cancelled', label: 'Annulées', count: invoices.filter(i => i.status === 'cancelled').length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeFilter === tab.key
                ? 'bg-[#0a1628] text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {tab.label}
            <span className={`px-2 py-0.5 rounded-full text-xs ${activeFilter === tab.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3.5 font-medium text-slate-600">Facture</th>
              <th className="text-left px-4 py-3.5 font-medium text-slate-600">Client (Université)</th>
              <th className="text-[#0a1628] text-left px-4 py-3.5 font-medium text-slate-600">Objet</th>
              <th className="text-right px-4 py-3.5 font-medium text-slate-600">Montant Total</th>
              <th className="text-center px-4 py-3.5 font-medium text-slate-600">Statut</th>
              <th className="text-right px-4 py-3.5 font-medium text-slate-600">Reste Dû</th>
              <th className="text-center px-4 py-3.5 font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                  <FileText className="mx-auto text-slate-300 mb-2" size={40} />
                  Aucune facture trouvée pour ce filtre
                </td>
              </tr>
            ) : (
              filteredInvoices.map((inv) => {
                const conf = STATUS_CONFIG[inv.status] || STATUS_CONFIG.pending;
                const Icon = conf.icon;
                return (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-slate-900">
                      <div>{inv.invoice_number}</div>
                      <div className="text-xs text-slate-400 font-normal">Émise le {new Date(inv.issue_date).toLocaleDateString('fr-FR')}</div>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-800">
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-slate-400" />
                        {inv.university_name}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 font-medium">
                      <div>{inv.title}</div>
                      <div className="text-xs text-slate-400 font-normal">Échéance : {new Date(inv.due_date).toLocaleDateString('fr-FR')}</div>
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                      {formatFCFA(inv.amount)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${conf.color}`}>
                        <Icon size={13} />
                        {conf.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold text-amber-600">
                      {inv.balance > 0 ? formatFCFA(inv.balance) : <span className="text-green-600 text-xs bg-green-50 px-2 py-0.5 rounded-full font-medium">Solié</span>}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                          <button
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setPayForm({ ...emptyPayForm, amount: String(inv.balance) });
                            }}
                            className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-semibold transition-colors"
                          >
                            Encaisse
                          </button>
                        )}
                        {inv.status !== 'cancelled' && (
                          <button
                            onClick={() => handleCancelInvoice(inv)}
                            className="px-2.5 py-1.5 text-slate-400 hover:text-red-500 rounded-lg text-xs transition-colors"
                            title="Annuler facture"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Nouvelle Facture */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h2 className="text-xl font-bold text-slate-900">Émettre une Facture Client</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Université Client *</label>
                <select
                  value={invoiceForm.university_id}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, university_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#FF6B00] outline-none"
                >
                  <option value="">Sélectionner une université...</option>
                  {universities.map(u => (
                    <option key={u.university.id} value={u.university.id}>
                      {u.university.name} ({u.student_count} étudiants)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Objet / Libellé de la facture *</label>
                <input
                  type="text"
                  value={invoiceForm.title}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, title: e.target.value })}
                  placeholder="ex: Licence Annuelle UniSphere AI 2026"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#FF6B00] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Montant Total (FCFA) *</label>
                  <input
                    type="number"
                    value={invoiceForm.amount}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })}
                    placeholder="Montant en FCFA"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#FF6B00] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date d'Échéance *</label>
                  <input
                    type="date"
                    value={invoiceForm.due_date}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#FF6B00] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Détails des services</label>
                <textarea
                  value={invoiceForm.description}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })}
                  placeholder="Détails complémentaires de la prestation..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#FF6B00] outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateInvoice}
                disabled={savingInvoice}
                className="flex-1 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingInvoice ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Créer Facture
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Enregistrer un Règlement */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Enregistrer un Règlement</h2>
                <p className="text-xs text-slate-500">{selectedInvoice.university_name} • Facture {selectedInvoice.invoice_number}</p>
              </div>
              <button onClick={() => setSelectedInvoice(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl mb-4 text-xs space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Montant Facture :</span>
                <span className="font-semibold">{formatFCFA(selectedInvoice.amount)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Déjà Encaissé :</span>
                <span className="font-semibold text-green-600">{formatFCFA(selectedInvoice.total_paid)}</span>
              </div>
              <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-1">
                <span>Reste à payer :</span>
                <span className="text-amber-600">{formatFCFA(selectedInvoice.balance)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Montant encaissé (FCFA) *</label>
                <input
                  type="number"
                  value={payForm.amount}
                  onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                  placeholder="Montant du versement"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date de Règlement</label>
                  <input
                    type="date"
                    value={payForm.payment_date}
                    onChange={(e) => setPayForm({ ...payForm, payment_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mode de Paiement</label>
                  <select
                    value={payForm.payment_method}
                    onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-green-500 outline-none"
                  >
                    <option value="virement">Virement bancaire</option>
                    <option value="mobile_money">Mobile Money</option>
                    <option value="cheque">Chèque bancaire</option>
                    <option value="especes">Espèces</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Référence / N° de transaction</label>
                <input
                  type="text"
                  value={payForm.reference}
                  onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })}
                  placeholder="ex: VIR-84920492"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleRecordPayment}
                disabled={savingPayment}
                className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingPayment ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Confirmer Encroisement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
