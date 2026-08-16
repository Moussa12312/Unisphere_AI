'use client';

import { useState, useEffect } from 'react';
import { Building2, CheckCircle2, Clock, XCircle, TrendingUp } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

function formatFCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: 'Actif', color: 'text-green-600 bg-green-50' },
  trial: { label: 'Essai', color: 'text-blue-600 bg-blue-50' },
  expired: { label: 'Expiré', color: 'text-red-600 bg-red-50' },
  cancelled: { label: 'Annulé', color: 'text-slate-600 bg-slate-100' },
  suspended: { label: 'Suspendu', color: 'text-amber-600 bg-amber-50' },
};

export default function SuperAdminDashboard() {
  const toast = useToast();
  const [universities, setUniversities] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [unisRes, paysRes] = await Promise.all([
        api.get('/api/v1/subscriptions/universities'),
        api.get('/api/v1/subscriptions/payments')
      ]);
      setUniversities(unisRes.data);
      setPayments(paysRes.data);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B00] border-t-transparent"></div></div>;
  }

  const active = universities.filter(u => u.subscription?.status === 'active').length;
  const trial = universities.filter(u => u.subscription?.status === 'trial').length;
  const expired = universities.filter(u => u.subscription?.status === 'expired').length;
  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalStudents = universities.reduce((sum, u) => sum + u.student_count, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Vue d'ensemble de la plateforme</h1>
        <p className="text-slate-500 mt-1">Toutes les universités abonnées à UniSphere AI</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <Building2 className="text-slate-400 mb-2" size={20} />
          <p className="text-2xl font-bold text-slate-900">{universities.length}</p>
          <p className="text-xs text-slate-500">Universités</p>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-100 p-4">
          <CheckCircle2 className="text-green-500 mb-2" size={20} />
          <p className="text-2xl font-bold text-green-700">{active}</p>
          <p className="text-xs text-green-600">Actives</p>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
          <Clock className="text-blue-500 mb-2" size={20} />
          <p className="text-2xl font-bold text-blue-700">{trial}</p>
          <p className="text-xs text-blue-600">En essai</p>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-100 p-4">
          <XCircle className="text-red-500 mb-2" size={20} />
          <p className="text-2xl font-bold text-red-700">{expired}</p>
          <p className="text-xs text-red-600">Expirées</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <TrendingUp className="text-[#FF6B00] mb-2" size={20} />
          <p className="text-lg font-bold text-slate-900">{formatFCFA(totalRevenue)}</p>
          <p className="text-xs text-slate-500">Revenus totaux</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Universités</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Université</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Plan</th>
              <th className="text-center px-4 py-3 font-medium text-slate-600">Statut</th>
              <th className="text-center px-4 py-3 font-medium text-slate-600">Étudiants</th>
              <th className="text-center px-4 py-3 font-medium text-slate-600">Expire le</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {universities.map((u, i) => {
              const config = u.subscription ? STATUS_CONFIG[u.subscription.status] : null;
              return (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{u.university.name}</td>
                  <td className="px-4 py-3 text-slate-600">{u.subscription?.plan_name || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    {config ? (
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${config.color}`}>{config.label}</span>
                    ) : (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">Aucun abonnement</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600">{u.student_count}</td>
                  <td className="px-4 py-3 text-center text-slate-500">
                    {u.subscription ? new Date(u.subscription.end_date).toLocaleDateString('fr-FR') : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
