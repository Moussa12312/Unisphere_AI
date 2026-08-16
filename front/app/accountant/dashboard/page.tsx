'use client';

import { useEffect, useState } from 'react';
import { 
  CreditCard, TrendingUp, AlertCircle, CheckCircle, 
  Clock, Plus, FileText, Users, ArrowUpRight, ArrowDownRight,
  Wallet
} from 'lucide-react';
import Link from 'next/link';
import financialService from '@/services/financialService';
import { accountingService } from '@/services/accountingService';
import { toast } from 'react-hot-toast';

export default function AccountantDashboard() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [installmentsStats, setInstallmentsStats] = useState<any>(null);
  const [accountingData, setAccountingData] = useState<any>(null);
  const [period, setPeriod] = useState('year');

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [overviewData, transactionsData, installmentsData, accountingDashboard] = await Promise.all([
        financialService.getOverview(period),
        financialService.getTransactions(5),
        financialService.getInstallmentsStats(),
        accountingService.getDashboard().catch(() => null)
      ]);
      setOverview(overviewData);
      setTransactions(transactionsData);
      setInstallmentsStats(installmentsData);
      setAccountingData(accountingDashboard);
    } catch (error) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      failed: 'bg-red-100 text-red-700',
      refunded: 'bg-slate-100 text-slate-700',
      partial: 'bg-orange-100 text-orange-700'
    };
    const labels: Record<string, string> = {
      completed: 'Payé',
      pending: 'En attente',
      failed: 'Échoué',
      refunded: 'Remboursé',
      partial: 'Partiel'
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}>
        {labels[status] || status}
      </span>
    );
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="mr-30">
          <h1 className="text-2xl font-bold text-slate-900">Tableau de bord financier</h1>
          <p className="text-slate-500 mt-1">Vue d'ensemble des finances de l'université</p>
        </div>
        <div className="flex items-center gap-1   rounded-lg p-1 ml-30 self-start md:self-auto">
          <button
            onClick={() => setPeriod('month')}
            title="Ce mois"
            className={`p-2 rounded-md transition-colors ${
              period === 'month' ? 'bg-[#FF6B00] text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            📅
          </button>
          <button
            onClick={() => setPeriod('quarter')}
            title="Ce trimestre"
            className={`p-2 rounded-md transition-colors ${
              period === 'quarter' ? 'bg-[#FF6B00] text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            📊
          </button>
          <button
            onClick={() => setPeriod('year')}
            title="Cette année"
            className={`p-2 rounded-md transition-colors ${
              period === 'year' ? 'bg-[#FF6B00] text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            📈
          </button>
        </div>
     
      </div>

      {/* ✅ NOUVEAU : Section Dépenses & Trésorerie (module comptable complet) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Vue d'ensemble comptable</h3>
          <Link href="/accountant/financial-statements" className="text-sm text-[#FF6B00] hover:underline">
            États financiers complets →
          </Link>
        </div>

        {accountingData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-xs text-green-600 mb-1">Recettes</p>
              <p className="text-lg font-bold text-green-700">{formatAmount(accountingData.total_income)}</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4">
              <p className="text-xs text-red-600 mb-1">Dépenses</p>
              <p className="text-lg font-bold text-red-700">{formatAmount(accountingData.total_expenses)}</p>
            </div>
            <div className={`rounded-xl p-4 ${accountingData.net_result >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
              <p className={`text-xs mb-1 ${accountingData.net_result >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>Résultat net</p>
              <p className={`text-lg font-bold ${accountingData.net_result >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>{formatAmount(accountingData.net_result)}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-1">Trésorerie</p>
              <p className="text-lg font-bold text-slate-900">{formatAmount(accountingData.treasury_balance)}</p>
            </div>
          </div>
        )}

        {accountingData && (accountingData.pending_expenses > 0 || accountingData.pending_payroll > 0) && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-4 text-sm text-amber-700 flex items-center gap-2">
            <AlertCircle size={16} />
            {accountingData.pending_expenses > 0 && <span>{accountingData.pending_expenses} dépense(s) en attente</span>}
            {accountingData.pending_expenses > 0 && accountingData.pending_payroll > 0 && <span>•</span>}
            {accountingData.pending_payroll > 0 && (
              <Link href="/accountant/payroll" className="underline">{accountingData.pending_payroll} salaire(s) à payer →</Link>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
          {[
            { href: '/accountant/expenses', label: 'Dépenses' },
            { href: '/accountant/suppliers', label: 'Fournisseurs' },
            { href: '/accountant/treasury', label: 'Trésorerie' },
            { href: '/accountant/payroll', label: 'Salaires' },
            { href: '/accountant/budget', label: 'Budget' },
            { href: '/accountant/fixed-assets', label: 'Immobilisations' },
            { href: '/accountant/ledger', label: 'Journal' },
            { href: '/accountant/trial-balance', label: 'Balance' },
          ].map(link => (
            <Link key={link.href} href={link.href} className="text-center px-2 py-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-medium text-slate-700 transition-colors">
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Stats Cards - 5 cartes maintenant */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
        {/* Total encaissé */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CreditCard size={20} className="text-green-600" />
            </div>
          </div>
          <p className="text-sm text-slate-500 mb-1">Total encaissé</p>
          <p className="text-xl font-bold text-slate-900">
            {overview ? formatAmount(overview.total_revenue) : '0 FCFA'}
          </p>
        </div>

        {/* Reliquats - NOUVELLE CARTE */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Wallet size={20} className="text-orange-600" />
            </div>
          </div>
          <p className="text-sm text-slate-500 mb-1">Reliquats en attente</p>
          <p className="text-xl font-bold text-slate-900">
            {installmentsStats ? formatAmount(installmentsStats.total_balance) : '0 FCFA'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {installmentsStats?.students_with_balance || 0} étudiant(s)
          </p>
        </div>

        {/* Impayés */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle size={20} className="text-red-600" />
            </div>
          </div>
          <p className="text-sm text-slate-500 mb-1">Impayés</p>
          <p className="text-xl font-bold text-slate-900">
            {overview ? formatAmount(overview.unpaid) : '0 FCFA'}
          </p>
        </div>

        {/* Taux de recouvrement */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp size={20} className="text-blue-600" />
            </div>
          </div>
          <p className="text-sm text-slate-500 mb-1">Taux recouvrement</p>
          <p className="text-xl font-bold text-slate-900">
            {overview ? `${overview.collection_rate}%` : '0%'}
          </p>
        </div>

        {/* Bloqués examens */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <AlertCircle size={20} className="text-purple-600" />
            </div>
          </div>
          <p className="text-sm text-slate-500 mb-1">Bloqués examens</p>
          <p className="text-xl font-bold text-slate-900">
            {installmentsStats?.blocked_count || 0}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            étudiant(s)
          </p>
        </div>
      </div>

      {/* Actions rapides + Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Actions rapides */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <FileText size={18} className="text-[#FF6B00]" /> Actions rapides
          </h3>
          <div className="space-y-4">
            <Link 
              href="/accountant/payments/create"
              className="flex items-center gap-3 p-3 bg-[#FF6B00]/5 hover:bg-[#FF6B00]/10 border border-[#FF6B00]/20 rounded-lg transition-colors"
            >
              <div className="w-10 h-10 bg-[#FF6B00] rounded-lg flex items-center justify-center">
                <Plus size={18} className="text-white" />
              </div>
              <div>
                <p className="font-medium text-slate-900 text-sm">Nouveau paiement</p>
                <p className="text-xs text-slate-500">Enregistrer un paiement</p>
              </div>
            </Link>

            <Link 
              href="/accountant/payments"
              className="flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
            >
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <FileText size={18} className="text-white" />
              </div>
              <div>
                <p className="font-medium text-slate-900 text-sm">Historique</p>
                <p className="text-xs text-slate-500">Voir tous les paiements</p>
              </div>
            </Link>

            <Link 
              href="/accountant/unpaid"
              className="flex items-center gap-3 p-3 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
            >
              <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                <AlertCircle size={18} className="text-white" />
              </div>
              <div>
                <p className="font-medium text-slate-900 text-sm">Impayés</p>
                <p className="text-xs text-slate-500">Étudiants en retard</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Transactions récentes */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Clock size={18} className="text-[#FF6B00]" /> Transactions récentes
            </h3>
            <Link href="/accountant/payments" className="text-sm text-[#FF6B00] hover:underline">
              Voir tout →
            </Link>
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <CreditCard size={40} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm">Aucune transaction récente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      t.status === 'completed' ? 'bg-green-100 text-green-600' :
                      t.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                      t.status === 'partial' ? 'bg-orange-100 text-orange-600' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {t.status === 'completed' ? <CheckCircle size={18} /> :
                       t.status === 'pending' ? <Clock size={18} /> :
                       <AlertCircle size={18} />}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{t.student}</p>
                      <p className="text-xs text-slate-500">{t.type} • {t.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900 text-sm">
                      {formatAmount(t.amount)}
                    </p>
                    {getStatusBadge(t.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}