'use client';

import { useState, useEffect } from 'react';
import { Building2, Users, FileText, CheckCircle2, Clock, AlertTriangle, TrendingUp, DollarSign } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import Link from 'next/link';

function formatFCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}

export default function SuperAdminDashboard() {
  const toast = useToast();
  const [stats, setStats] = useState<any>(null);
  const [universities, setUniversities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [statsRes, unisRes] = await Promise.all([
        api.get('/api/v1/superadmin/dashboard-stats'),
        api.get('/api/v1/superadmin/universities')
      ]);
      setStats(statsRes.data);
      setUniversities(unisRes.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
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
        <h1 className="text-3xl font-bold text-slate-900">Vue d'ensemble de la plateforme</h1>
        <p className="text-slate-500 mt-1">Supervision globale et facturation des universités partenaires</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 font-medium">Universités Clients</span>
            <Building2 className="text-blue-600" size={20} />
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats?.total_universities || 0}</p>
          <p className="text-xs text-slate-400 mt-1">{stats?.total_students || 0} étudiants inscrits</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 font-medium">Total Facturé</span>
            <FileText className="text-[#FF6B00]" size={20} />
          </div>
          <p className="text-xl font-bold text-slate-900">{formatFCFA(stats?.total_invoiced || 0)}</p>
          <p className="text-xs text-slate-400 mt-1">Toutes prestations confondues</p>
        </div>

        <div className="bg-green-50 rounded-xl border border-green-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-green-700 font-medium">Total Encaissé</span>
            <CheckCircle2 className="text-green-600" size={20} />
          </div>
          <p className="text-xl font-bold text-green-800">{formatFCFA(stats?.total_paid || 0)}</p>
          <p className="text-xs text-green-600 mt-1">Recouvrement effectué</p>
        </div>

        <div className="bg-amber-50 rounded-xl border border-amber-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-amber-700 font-medium">Reste à Recouvrir</span>
            <AlertTriangle className="text-amber-600" size={20} />
          </div>
          <p className="text-xl font-bold text-amber-800">{formatFCFA(stats?.balance_due || 0)}</p>
          <p className="text-xs text-amber-600 mt-1">
            {stats?.pending_invoices_count || 0} en attente • {stats?.overdue_invoices_count || 0} en retard
          </p>
        </div>
      </div>

      {/* Main Grid: Universities list & Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Universities Status */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Situation des Universités Partner</h3>
            <Link href="/superadmin/universities" className="text-xs text-[#FF6B00] hover:underline font-medium">Voir tout →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Université</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">Étudiants</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Facturé</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Encaissé</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Solde Dû</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {universities.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">Aucune université enregistrée</td>
                  </tr>
                ) : (
                  universities.map((u, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        <div>{u.university.name}</div>
                        <div className="text-xs text-slate-400 font-normal">{u.university.email || u.university.country}</div>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-600">{u.student_count}</td>
                      <td className="px-4 py-3 text-right text-slate-700 font-medium">{formatFCFA(u.total_invoiced)}</td>
                      <td className="px-4 py-3 text-right text-green-600 font-medium">{formatFCFA(u.total_paid)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-amber-600">
                        {u.balance_due > 0 ? formatFCFA(u.balance_due) : <span className="text-green-600 text-xs bg-green-50 px-2 py-0.5 rounded-full">À jour</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Recent Payments */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Derniers Encaissements</h3>
            <Link href="/superadmin/payments" className="text-xs text-[#FF6B00] hover:underline font-medium">Voir tout →</Link>
          </div>
          <div className="p-4 space-y-3 flex-1 overflow-y-auto">
            {!stats?.recent_payments || stats.recent_payments.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Aucun encaissement récent</p>
            ) : (
              stats.recent_payments.map((p: any) => (
                <div key={p.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{p.university_name}</p>
                    <p className="text-xs text-slate-500">Facture {p.invoice_number} • {new Date(p.payment_date).toLocaleDateString('fr-FR')}</p>
                    <span className="text-[10px] text-slate-400 capitalize">{p.payment_method}</span>
                  </div>
                  <span className="font-bold text-green-600 text-sm">{formatFCFA(p.amount)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
