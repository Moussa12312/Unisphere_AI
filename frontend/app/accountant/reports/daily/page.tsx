'use client';
import { useState, useEffect } from 'react';
import { FileText, Printer, Download, Calendar, DollarSign, Receipt, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '@/lib/api';

export default function DailyReportPage() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => { loadReport(); }, [selectedDate]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/v1/financials/overview?date=${selectedDate}`);
      setReport(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => { window.print(); };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B00] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Rapport Journalier</h1>
          <p className="text-slate-500 mt-1">Résumé des opérations financières du jour</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg"
          />
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-[#FF6B00] text-white rounded-lg hover:bg-[#e55f00] transition-colors"
          >
            <Printer size={16} />
            Imprimer
          </button>
        </div>
      </div>

      {/* Résumé */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign size={20} className="text-green-600" />
            </div>
          </div>
          <p className="text-sm text-slate-500">Recettes du jour</p>
          <p className="text-2xl font-bold text-green-600">
            {report?.daily_revenue?.toLocaleString('fr-FR') || 0} XOF
          </p>
          <p className="text-xs text-slate-400 mt-1">{report?.daily_transactions || 0} transaction(s)</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Receipt size={20} className="text-blue-600" />
            </div>
          </div>
          <p className="text-sm text-slate-500">Paiements reçus</p>
          <p className="text-2xl font-bold text-blue-600">{report?.payments_count || 0}</p>
          <p className="text-xs text-slate-400 mt-1">Paiements enregistrés</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <TrendingUp size={20} className="text-red-600" />
            </div>
          </div>
          <p className="text-sm text-slate-500">Impayés du jour</p>
          <p className="text-2xl font-bold text-red-600">{report?.new_overdue || 0}</p>
          <p className="text-xs text-slate-400 mt-1">Nouvelles échéances en retard</p>
        </div>
      </div>

      {/* Transactions récentes */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">Transactions du jour</h3>
        </div>
        {report?.transactions?.length === 0 ? (
          <div className="text-center py-12 text-slate-500">Aucune transaction aujourd'hui</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Heure</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Référence</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Étudiant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Montant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Méthode</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {report?.transactions?.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(tx.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-slate-900">{tx.reference}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{tx.student_name}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                        {tx.payment_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-green-600">
                      +{tx.amount?.toLocaleString('fr-FR')} {tx.currency}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{tx.payment_method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}