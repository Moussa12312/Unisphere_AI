'use client';

import { useState, useEffect } from 'react';
import { Calendar, AlertCircle, CheckCircle, Clock, Search, Users, CreditCard, X, Loader2, Check, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/hooks/useConfirm';

export default function InstallmentsPage() {
  const toast = useToast();
  const { confirm } = useConfirm();

  const [installments, setInstallments] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    installment: any | null;
  }>({ open: false, installment: null });
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [installmentsRes, statsRes] = await Promise.all([
        api.get('/api/v1/financials/installments'),
        api.get('/api/v1/financials/installments/stats')
      ]);
      setInstallments(Array.isArray(installmentsRes.data) ? installmentsRes.data : []);
      setStats(statsRes.data || {});
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = installments.filter(inst => {
    const matchSearch = `${inst.student_name} ${inst.student_matricule || inst.matricule}`
      .toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || inst.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed': 
        return { label: 'Payé', color: 'bg-green-100 text-green-700', icon: CheckCircle };
      case 'partial': 
        return { label: 'Partiel', color: 'bg-blue-100 text-blue-700', icon: Clock };
      case 'pending': 
        return { label: 'En attente', color: 'bg-orange-100 text-orange-700', icon: Clock };
      case 'overdue': 
        return { label: 'En retard', color: 'bg-red-100 text-red-700', icon: AlertCircle };
      default: 
        return { label: status, color: 'bg-slate-100 text-slate-700', icon: Clock };
    }
  };

  const formatFCFA = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  const handleMarkAsPaid = async (installment: any) => {
    const ok = await confirm({
      title: 'Confirmer le paiement',
      message: `Voulez-vous enregistrer le paiement de ${formatFCFA(installment.balance || installment.amount_due)} pour ${installment.student_name} ?`,
      confirmText: 'Confirmer le paiement',
      cancelText: 'Annuler',
      variant: 'success',
      icon: 'check'
    });
    
    if (ok) {
      try {
        await api.post(`/api/v1/financials/installments/${installment.id}/pay`, {
          amount: installment.balance || installment.amount_due,
          payment_method: 'cash',
          description: `Paiement marqué par le comptable`
        });
        toast.success(`✅ Paiement de ${installment.student_name} enregistré !`);
        loadData();
      } catch (error: any) {
        toast.error(error.message || 'Erreur lors du paiement');
      }
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
    <div className="space-y-4">
      {/* Header avec navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Échéances & Reliquats</h1>
          <p className="text-slate-500 mt-1 text-sm">Suivi des paiements échelonnés</p>
        </div>
        
        {/* ✅ NAVIGATION VERS IMPAYÉS */}
        <Link
          href="/accountant/payments/unpaid"
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <AlertCircle size={16} />
          Voir les impayés
        </Link>
      </div>

      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users size={16} className="text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-slate-500">Total échéances</p>
            <p className="text-xl font-bold text-slate-900">{stats.total || 0}</p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle size={16} className="text-green-600" />
              </div>
            </div>
            <p className="text-xs text-slate-500">Payées</p>
            <p className="text-xl font-bold text-green-600">{stats.paid || 0}</p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock size={16} className="text-orange-600" />
              </div>
            </div>
            <p className="text-xs text-slate-500">En attente</p>
            <p className="text-xl font-bold text-orange-600">{stats.pending || 0}</p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertCircle size={16} className="text-red-600" />
              </div>
            </div>
            <p className="text-xs text-slate-500">En retard</p>
            <p className="text-xl font-bold text-red-600">{stats.overdue || 0}</p>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Rechercher étudiant..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 text-sm"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 text-sm"
          >
            <option value="">Tous les statuts</option>
            <option value="completed">✅ Payé</option>
            <option value="partial">🟠 Partiel</option>
            <option value="pending">⏳ En attente</option>
            <option value="overdue">🔴 En retard</option>
          </select>
        </div>
      </div>

      {/* TABLEAU */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500">Aucune échéance trouvée</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Étudiant</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Montant dû</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Reliquat</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Échéance</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500 uppercase">Statut</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {filtered.map((inst) => {
                  const status = getStatusConfig(inst.status);
                  const StatusIcon = status.icon;
                  return (
                    <tr key={inst.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-[#FF6B00]/10 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-[#FF6B00]">
                              {inst.student_name?.charAt(0) || '?'}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate max-w-[180px]">
                              {inst.student_name}
                            </p>
                            <p className="text-xs text-slate-500 font-mono">
                              {inst.matricule || inst.student_matricule}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-2 text-left">
                        <span className="text-sm font-semibold text-slate-900">
                          {formatFCFA(inst.amount_due || inst.amount || 0)}
                        </span>
                      </td>

                      <td className="px-3 py-2 text-left">
                        <span className="text-sm font-bold text-orange-600">
                          {formatFCFA(inst.balance || 0)}
                        </span>
                      </td>

                      <td className="px-3 py-2">
                        <span className="text-xs text-slate-600">
                          {inst.due_date ? new Date(inst.due_date).toLocaleDateString('fr-FR') : '-'}
                        </span>
                      </td>

                      <td className="px-3 py-2 text-center">
                        <div className="flex flex-col items-center gap-1.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${status.color}`}>
                            <StatusIcon size={11} />
                            {status.label}
                          </span>

                          {(inst.status !== 'paid' && inst.status !== 'completed') ? (
                            <button
                            onClick={() => handleMarkAsPaid(inst)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#FF6B00] hover:bg-[#e55f00] text-white text-xs font-medium rounded-md transition-colors"
                          >
                              <Check size={11} />
                              Marquer payé
                            </button>
                          ) : (
                            <span className="text-xs text-green-600 font-medium">✓ Soldé</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}