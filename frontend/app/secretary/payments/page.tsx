'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, Search, CheckCircle, Clock, Loader2 } from 'lucide-react';
import paymentService from '@/services/paymentService';
import { toast } from 'react-hot-toast';

export default function SecretaryPaymentsPage() {
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
      console.error(err);
      toast.error('Impossible de charger les paiements');
    } finally {
      setLoading(false);
    }
  };

  const filtered = payments.filter(p => {
    const student = (p.student_name || `${p.student?.first_name || ''} ${p.student?.last_name || ''}`).toLowerCase();
    const matricule = (p.matricule || p.student?.matricule || '').toLowerCase();
    const ref = (p.reference || p.receipt_number || p.id?.toString() || '').toLowerCase();
    const q = searchTerm.toLowerCase();
    return student.includes(q) || matricule.includes(q) || ref.includes(q);
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-emerald-600" /> Encaissement & Suivi des Frais (Secrétariat)
          </h1>
          <p className="text-slate-500 text-sm">Vérification de l’état de paiement pour la délivrance des documents.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Rechercher par reçu, étudiant ou matricule..."
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
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-4">N° Reçu</th>
                <th className="p-4">Étudiant</th>
                <th className="p-4">Type de Paiement</th>
                <th className="p-4">Montant</th>
                <th className="p-4">Date</th>
                <th className="p-4">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filtered.map((p) => {
                const isPaid = p.status === 'completed' || p.status === 'Payé';
                return (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 font-mono font-medium text-slate-900 dark:text-white">{p.reference || p.receipt_number || `REC-${p.id}`}</td>
                    <td className="p-4">
                      <p className="font-medium text-slate-900 dark:text-white">{p.student_name || `${p.student?.first_name || ''} ${p.student?.last_name || ''}`.trim() || `Étudiant #${p.student_id}`}</p>
                      <p className="text-xs font-mono text-slate-500">{p.matricule || p.student?.matricule || `ID #${p.student_id}`}</p>
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-300 capitalize">{p.payment_type || 'Scolarité'}</td>
                    <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">{Number(p.amount || 0).toLocaleString('fr-FR')} {p.currency || 'FCFA'}</td>
                    <td className="p-4 text-slate-500 text-xs">{p.payment_date || (p.created_at ? new Date(p.created_at).toLocaleDateString('fr-FR') : 'N/A')}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        isPaid
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        {isPaid ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {isPaid ? 'Payé' : 'En attente'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Aucun paiement trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
