'use client';

import { useState, useEffect } from 'react';
import { Building2, FileText, Plus, X, Save, Loader2, Users, CheckCircle2, AlertTriangle, Mail, Phone, MapPin, Ban, Check } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/hooks/useConfirm';
import { useRouter } from 'next/navigation';

function formatFCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}

export default function SuperAdminUniversitiesPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const [universities, setUniversities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const [selectedUniv, setSelectedUniv] = useState<any>(null);
  const [invoiceForm, setInvoiceForm] = useState({
    title: '',
    description: '',
    amount: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: ''
  });
  const [savingInvoice, setSavingInvoice] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/v1/superadmin/universities');
      setUniversities(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des universités');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (item: any) => {
    const isCurrentlyActive = item.university.is_active !== false && item.university.status !== 'suspended';
    const newActiveState = !isCurrentlyActive;
    const actionLabel = newActiveState ? 'activer / débloquer' : 'suspendre / bloquer';

    const ok = await confirm({
      title: `${newActiveState ? 'Débloquer' : 'Bloquer'} ${item.university.name} ?`,
      message: newActiveState
        ? `L'accès à la plateforme sera réactivé pour tous les utilisateurs de "${item.university.name}".`
        : `L'accès à la plateforme sera immédiatement BLOQUÉ pour tous les membres de "${item.university.name}". Ils ne pourront plus se connecter tant qu me l'université n'est pas débloquée.`,
      confirmText: newActiveState ? 'Débloquer l\'accès' : 'Bloquer l\'université',
      variant: newActiveState ? 'info' : 'danger'
    });

    if (!ok) return;

    setTogglingId(item.university.id);
    try {
      const response = await api.put(`/api/v1/superadmin/universities/${item.university.id}/status`, {
        is_active: newActiveState
      });
      toast.success(response.data.message);
      load();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors du changement de statut');
    } finally {
      setTogglingId(null);
    }
  };

  const handleCreateInvoiceForUniv = async () => {
    if (!selectedUniv || !invoiceForm.title || !invoiceForm.amount) {
      toast.error('Objet et montant requis');
      return;
    }
    setSavingInvoice(true);
    try {
      await api.post('/api/v1/superadmin/invoices', {
        university_id: selectedUniv.university.id,
        title: invoiceForm.title,
        description: invoiceForm.description || undefined,
        amount: parseFloat(invoiceForm.amount),
        issue_date: invoiceForm.issue_date,
        due_date: invoiceForm.due_date,
        notes: invoiceForm.notes || undefined
      });
      toast.success(`Facture émise avec succès pour ${selectedUniv.university.name}`);
      setSelectedUniv(null);
      setInvoiceForm({
        title: '',
        description: '',
        amount: '',
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: ''
      });
      load();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la création');
    } finally {
      setSavingInvoice(false);
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
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Universités Clients</h1>
        <p className="text-slate-500 mt-1">Vue consolidée des institutions partenaires, gestion d'accès et facturation</p>
      </div>

      <div className="space-y-4">
        {universities.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
            <Building2 className="mx-auto text-slate-300 mb-2" size={48} />
            Aucune université partenaire enregistrée
          </div>
        ) : (
          universities.map((item) => {
            const isActive = item.university.is_active !== false && item.university.status !== 'suspended';
            return (
              <div
                key={item.university.id}
                className={`bg-white rounded-2xl border p-5 shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  !isActive ? 'border-red-200 bg-red-50/20' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isActive ? 'bg-blue-50 text-blue-600' : 'bg-red-100 text-red-600'
                  }`}>
                    <Building2 size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-lg">{item.university.name}</h3>
                      {isActive ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200 flex items-center gap-1">
                          <CheckCircle2 size={12} /> Accès Actif
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200 flex items-center gap-1">
                          <Ban size={12} /> Université Bloquée
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                      {item.university.email && (
                        <span className="flex items-center gap-1">
                          <Mail size={12} /> {item.university.email}
                        </span>
                      )}
                      {item.university.country && (
                        <span className="flex items-center gap-1">
                          <MapPin size={12} /> {item.university.country}
                        </span>
                      )}
                      <span className="flex items-center gap-1 font-medium text-slate-700">
                        <Users size={12} /> {item.student_count} étudiants ({item.user_count} utilisateurs)
                      </span>
                    </div>

                    {/* Financial metrics bar */}
                    <div className="flex items-center gap-4 text-xs mt-3 pt-2 border-t border-slate-100">
                      <div>
                        <span className="text-slate-400">Total Facturé : </span>
                        <span className="font-semibold text-slate-800">{formatFCFA(item.total_invoiced)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Encaissé : </span>
                        <span className="font-semibold text-green-600">{formatFCFA(item.total_paid)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Solde Dû : </span>
                        <span className={`font-semibold ${item.balance_due > 0 ? 'text-amber-600' : 'text-slate-600'}`}>
                          {formatFCFA(item.balance_due)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 border-t md:border-t-0 border-slate-100 pt-3 md:pt-0">
                  <button
                    onClick={() => setSelectedUniv(item)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-xs font-semibold shadow-sm transition-all whitespace-nowrap"
                  >
                    <FileText size={14} /> Facturer
                  </button>

                  <button
                    onClick={() => handleToggleStatus(item)}
                    disabled={togglingId === item.university.id}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                        : 'bg-green-50 hover:bg-green-100 text-green-700 border border-green-200'
                    }`}
                  >
                    {togglingId === item.university.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : isActive ? (
                      <>
                        <Ban size={14} /> Bloquer
                      </>
                    ) : (
                      <>
                        <Check size={14} /> Activer
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => router.push(`/superadmin/invoices?university_id=${item.university.id}`)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all whitespace-nowrap"
                  >
                    Historique
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Émettre Facture pour cette université */}
      {selectedUniv && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Émettre une Facture</h2>
                <p className="text-xs text-slate-500">{selectedUniv.university.name}</p>
              </div>
              <button onClick={() => setSelectedUniv(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Objet / Libellé de la facture *</label>
                <input
                  type="text"
                  value={invoiceForm.title}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, title: e.target.value })}
                  placeholder="ex: Licence annuelle UniSphere AI 2026"
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
                    placeholder="Montant FCFA"
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Notes</label>
                <textarea
                  value={invoiceForm.description}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })}
                  placeholder="Détails des prestations facturées..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#FF6B00] outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedUniv(null)}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateInvoiceForUniv}
                disabled={savingInvoice}
                className="flex-1 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingInvoice ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Créer Facture
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
