'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, Search, Download, CheckCircle2, Clock, Loader2, ArrowUpRight, Banknote, FileSpreadsheet } from 'lucide-react';
import api from '@/lib/api';
import paymentService from '@/services/paymentService';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { exportToExcel } from '@/lib/exportExcel';

export default function AdminPaymentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const res = await paymentService.getAll({ page_size: 100 });
      const data = Array.isArray(res) ? res : (res.data || res.items || []);
      setPayments(data);
    } catch (err) {
      console.error('Erreur chargement paiements:', err);
      toast.error('Impossible de charger les paiements');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (payments.length === 0) {
      toast.error('Aucune donnée à exporter');
      return;
    }
    const dataToExport = payments.map(p => ({
      id: p.id,
      reference: p.reference || p.receipt_number || `PAY-${p.id}`,
      student_name: p.student_name || `${p.student?.first_name || ''} ${p.student?.last_name || ''}`.trim() || 'N/A',
      matricule: p.matricule || p.student?.matricule || 'N/A',
      filiere: p.student?.filiere || 'N/A',
      amount: p.amount,
      currency: p.currency || 'FCFA',
      payment_type: p.payment_type || 'Scolarité',
      payment_method: p.payment_method || 'Virement',
      status: p.status === 'completed' ? 'Validé' : (p.status || 'En attente'),
      date: p.payment_date || p.created_at || ''
    }));

    exportToExcel(dataToExport, {
      filename: `gestion_paiements_${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: 'Paiements',
      headerMapping: {
        id: 'ID',
        reference: 'Référence Reçu',
        student_name: 'Nom de l\'Étudiant',
        matricule: 'Matricule',
        filiere: 'Filière',
        amount: 'Montant (FCFA)',
        currency: 'Devise',
        payment_type: 'Type de Frais',
        payment_method: 'Mode de Paiement',
        status: 'Statut',
        date: 'Date'
      }
    });
    toast.success('Fichier Excel (.xlsx) téléchargé avec succès !');
  };

  const filteredPayments = payments.filter(p => {
    const studentName = (p.student_name || `${p.student?.first_name || ''} ${p.student?.last_name || ''}`).toLowerCase();
    const matricule = (p.matricule || p.student?.matricule || '').toLowerCase();
    const ref = (p.reference || p.receipt_number || p.id?.toString() || '').toLowerCase();
    const q = searchTerm.toLowerCase();
    return studentName.includes(q) || matricule.includes(q) || ref.includes(q);
  });

  const totalAmount = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const completedCount = payments.filter(p => p.status === 'completed' || p.status === 'Payé').length;
  const pendingCount = payments.filter(p => p.status === 'pending' || p.status === 'En attente').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-emerald-600" /> Gestion Globale des Paiements
          </h1>
          <p className="text-slate-500 text-sm">Vue d'ensemble des règlements et encaissements de l'université.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/academic-fees"
            className="flex items-center gap-2 bg-[#FF6B00] hover:bg-[#e55f00] text-white px-4 py-2 rounded-lg font-medium shadow transition-colors text-sm"
          >
            <Banknote className="w-4 h-4" /> Configurer Frais & Tranches
          </Link>
          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium shadow transition-colors text-sm"
          >
            <FileSpreadsheet className="w-4 h-4" /> Exporter (Excel)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs text-slate-500 font-medium uppercase">Total Encaissé</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1 font-mono">
            {totalAmount.toLocaleString('fr-FR')} FCFA
          </p>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs text-slate-500 font-medium uppercase">Paiements Validés</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{completedCount}</p>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs text-slate-500 font-medium uppercase">En Attente de Validation</p>
          <p className="text-2xl font-bold text-amber-500 mt-1">{pendingCount}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Rechercher un paiement, étudiant ou N° reçu..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent border-none focus:outline-none text-slate-900 dark:text-white text-sm"
        />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-4">N° Transaction</th>
                  <th className="p-4">Étudiant</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Montant</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredPayments.map((p) => {
                  const studentName = p.student_name || `${p.student?.first_name || ''} ${p.student?.last_name || ''}`.trim() || `Étudiant #${p.student_id}`;
                  const matricule = p.matricule || p.student?.matricule || `ID #${p.student_id}`;
                  const isPaid = p.status === 'completed' || p.status === 'Payé';
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="p-4 font-mono font-medium text-slate-900 dark:text-white">
                        {p.reference || p.receipt_number || `PAY-${p.id}`}
                      </td>
                      <td className="p-4">
                        <p className="font-medium text-slate-900 dark:text-white">{studentName}</p>
                        <p className="text-xs font-mono text-slate-500">{matricule}</p>
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-300 capitalize">{p.payment_type || 'Scolarité'}</td>
                      <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">
                        {Number(p.amount).toLocaleString('fr-FR')} {p.currency || 'FCFA'}
                      </td>
                      <td className="p-4 text-slate-500 text-xs">
                        {p.payment_date || (p.created_at ? new Date(p.created_at).toLocaleDateString('fr-FR') : 'N/A')}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          isPaid
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {isPaid ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {isPaid ? 'Payé' : 'En attente'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredPayments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      Aucun paiement enregistré pour le moment.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
