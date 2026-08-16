'use client';

import { useState, useEffect } from 'react';
import {
  Search, Eye, Plus, DollarSign, TrendingUp, Users,
  AlertCircle, CheckCircle, Clock, Lock, Receipt,
  Loader2, Filter, Download
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

export default function PaymentsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFiliere, setFilterFiliere] = useState('');
  const [stats, setStats] = useState({
    total_due: 0,
    total_paid: 0,
    total_remaining: 0,
    students_count: 0,
    paid_students: 0,
    late_students: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [studentsRes, paymentsRes] = await Promise.all([
        api.get('/api/v1/students/').catch(() => ({ data: [] })),
        api.get('/api/v1/payments/summary').catch(() => ({ data: null }))
      ]);
      
      const studentsData = Array.isArray(studentsRes.data) 
        ? studentsRes.data 
        : (studentsRes.data?.data || []);
      
      // Charger les détails de paiement pour chaque étudiant
      const studentsWithPayments = await Promise.all(
        studentsData.map(async (student: any) => {
          try {
            const paymentRes = await api.get(`/api/v1/payments/student/${student.id}/summary`);
            return {
              ...student,
              payment_summary: paymentRes.data
            };
          } catch (error) {
            // Si pas de paiements, retourner des valeurs par défaut
            return {
              ...student,
              payment_summary: {
                total_amount: 0,
                total_paid: 0,
                total_remaining: 0,
                paid_percentage: 0,
                status: 'unpaid',
                tranches: []
              }
            };
          }
        })
      );
      
      setStudents(studentsWithPayments);
      
      // Calculer les stats globales
      const totalDue = studentsWithPayments.reduce((sum, s) => sum + (s.payment_summary?.total_amount || 0), 0);
      const totalPaid = studentsWithPayments.reduce((sum, s) => sum + (s.payment_summary?.total_paid || 0), 0);
      const totalRemaining = studentsWithPayments.reduce((sum, s) => sum + (s.payment_summary?.total_remaining || 0), 0);
      const paidStudents = studentsWithPayments.filter(s => s.payment_summary?.status === 'paid').length;
      const lateStudents = studentsWithPayments.filter(s => 
        s.payment_summary?.status === 'partial' && s.payment_summary?.has_late
      ).length;
      
      setStats({
        total_due: totalDue,
        total_paid: totalPaid,
        total_remaining: totalRemaining,
        students_count: studentsWithPayments.length,
        paid_students: paidStudents,
        late_students: lateStudents
      });
      
    } catch (error) {
      console.error('Erreur chargement:', error);
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const formatFCFA = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  const getStatusBadge = (status: string, percentage: number) => {
    if (status === 'paid' || percentage >= 100) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-green-100 text-green-700 rounded-full border border-green-200">
          <CheckCircle size={10} />
          SOLDÉ ✅
        </span>
      );
    }
    if (status === 'unpaid' || percentage === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded-full border border-red-200">
          <AlertCircle size={10} />
          1ère TRANCHE
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-orange-100 text-orange-700 rounded-full border border-orange-200">
        <Clock size={10} />
        RELIQUAT
      </span>
    );
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    if (percentage >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const filieres = [...new Set(students.map(s => s.filiere).filter(Boolean))];

  const filteredStudents = students.filter(s => {
    const name = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase();
    const matricule = (s.matricule || '').toLowerCase();
    const matchSearch = name.includes(search.toLowerCase()) || matricule.includes(search.toLowerCase());
    const matchFiliere = !filterFiliere || s.filiere === filterFiliere;
    const matchStatus = !filterStatus || s.payment_summary?.status === filterStatus;
    return matchSearch && matchFiliere && matchStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-[#FF6B00]" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <DollarSign size={24} className="text-white" />
            </div>
            Gestion des Paiements
          </h1>
          <p className="text-slate-500 mt-1">Suivez les paiements des étudiants par tranches</p>
        </div>
        <Link
          href="/accountant/payments/create"
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#FF6B00] to-orange-500 hover:from-[#e55f00] hover:to-orange-600 text-white rounded-xl text-sm font-medium transition-all shadow-md"
        >
          <Plus size={16} />
          Nouveau paiement
        </Link>
      </div>

      {/* Stats globales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <DollarSign size={24} className="text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-1">Total dû</p>
          <p className="text-xl font-bold text-slate-900">{formatFCFA(stats.total_due)}</p>
          <p className="text-xs text-slate-400 mt-1">{stats.students_count} étudiants</p>
        </div>

        <div className="bg-white rounded-xl border border-green-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle size={24} className="text-green-600" />
            </div>
            <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
              {stats.total_due > 0 ? Math.round((stats.total_paid / stats.total_due) * 100) : 0}%
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-1">Total payé</p>
          <p className="text-xl font-bold text-green-700">{formatFCFA(stats.total_paid)}</p>
          <p className="text-xs text-slate-400 mt-1">{stats.paid_students} payés</p>
        </div>

        <div className="bg-white rounded-xl border border-orange-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <TrendingUp size={24} className="text-orange-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-1">Reste à payer</p>
          <p className="text-xl font-bold text-orange-700">{formatFCFA(stats.total_remaining)}</p>
          <p className="text-xs text-slate-400 mt-1">À recouvrer</p>
        </div>

        <div className="bg-white rounded-xl border border-red-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertCircle size={24} className="text-red-600" />
            </div>
            {stats.late_students > 0 && (
              <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full animate-pulse">
                Urgent
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mb-1">En retard</p>
          <p className="text-xl font-bold text-red-700">{stats.late_students}</p>
          <p className="text-xs text-slate-400 mt-1">étudiants</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="🔍 Rechercher un étudiant..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>
          <select
            value={filterFiliere}
            onChange={(e) => setFilterFiliere(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          >
            <option value="">Toutes les filières</option>
            {filieres.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          >
            <option value="">Tous les statuts</option>
            <option value="paid">✅ Soldés</option>
            <option value="partial">🟠 Reliquats</option>
            <option value="unpaid">🔴 Non payés</option>
          </select>
        </div>
      </div>

      {/* Liste des étudiants */}
      <div className="space-y-4">
        {filteredStudents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
            <Users size={48} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Aucun étudiant trouvé</p>
          </div>
        ) : (
          filteredStudents.map((student) => {
            const summary = student.payment_summary || {
              total_amount: 0,
              total_paid: 0,
              total_remaining: 0,
              paid_percentage: 0,
              status: 'unpaid',
              tranches: []
            };
            
            const paidTranches = summary.tranches?.filter((t: any) => t.status === 'paid') || [];
            const availableTranches = summary.tranches?.filter((t: any) => t.status === 'available') || [];
            const lockedTranches = summary.tranches?.filter((t: any) => t.status === 'locked') || [];

            return (
              <div key={student.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-14 h-14 bg-gradient-to-br from-[#FF6B00] to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {(student.first_name?.[0] || '') + (student.last_name?.[0] || '')}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-slate-900">
                          {student.first_name} {student.last_name}
                        </h3>
                        {getStatusBadge(summary.status, summary.paid_percentage)}
                      </div>
                      <p className="text-sm text-slate-500 mb-3">
                        🎓 {student.matricule} • {student.filiere} {student.level}
                      </p>

                      {/* Récapitulatif */}
                      <div className="bg-slate-50 rounded-xl p-4 mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-slate-700">📊 RÉCAPITULATIF</span>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <p className="text-xs text-slate-500">Montant total dû</p>
                            <p className="text-base font-bold text-slate-900">{formatFCFA(summary.total_amount)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Montant payé</p>
                            <p className="text-base font-bold text-green-600">
                              {formatFCFA(summary.total_paid)}
                              <span className="text-xs text-slate-500 ml-1">({summary.paid_percentage}%)</span>
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Reste à payer</p>
                            <p className={`text-base font-bold ${summary.total_remaining > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                              {formatFCFA(summary.total_remaining)}
                            </p>
                          </div>
                        </div>
                        {/* Barre de progression */}
                        <div className="mt-3">
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${getProgressBarColor(summary.paid_percentage)}`}
                              style={{ width: `${Math.min(100, summary.paid_percentage)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      {/* Tranches */}
                      <div>
                        <p className="text-xs font-semibold text-slate-700 mb-2">📋 TRANCHES</p>
                        <div className="space-y-1.5">
                          {paidTranches.map((tranche: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded-lg">
                              <div className="flex items-center gap-2">
                                <CheckCircle size={14} className="text-green-600" />
                                <span className="text-xs font-medium text-green-800">{tranche.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-green-700">{formatFCFA(tranche.amount)}</span>
                                <span className="text-[10px] px-1.5 py-0.5 bg-green-200 text-green-800 rounded">PAYÉE ✓</span>
                              </div>
                            </div>
                          ))}
                          {availableTranches.map((tranche: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="flex items-center gap-2">
                                <Clock size={14} className="text-blue-600" />
                                <span className="text-xs font-medium text-blue-800">{tranche.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-blue-700">{formatFCFA(tranche.amount)}</span>
                                <span className="text-[10px] px-1.5 py-0.5 bg-blue-200 text-blue-800 rounded">À PAYER</span>
                              </div>
                            </div>
                          ))}
                          {lockedTranches.map((tranche: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg opacity-60">
                              <div className="flex items-center gap-2">
                                <Lock size={14} className="text-slate-400" />
                                <span className="text-xs font-medium text-slate-600">{tranche.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-500">{formatFCFA(tranche.amount)}</span>
                                <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded">VERROUILLÉE 🔒</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <Link
                      href={`/accountant/payments/student/${student.id}`}
                      className="px-4 py-2 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-sm font-medium flex items-center gap-1 transition-colors"
                    >
                      <DollarSign size={14} />
                      Payer
                    </Link>
                    <Link
                      href={`/accountant/payments/student/${student.id}`}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors"
                    >
                      <Eye size={14} />
                      Voir
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}