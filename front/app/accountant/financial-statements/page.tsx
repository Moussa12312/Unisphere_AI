'use client';

import { useState, useEffect } from 'react';
import { FileBarChart, TrendingUp, TrendingDown, Scale, Calendar } from 'lucide-react';
import { accountingService } from '@/services/accountingService';
import { useToast } from '@/components/ToastProvider';

function formatFCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}

interface IncomeStatement {
  total_income: number;
  total_expenses: number;
  net_result: number;
  expenses_by_category: Record<string, number>;
  income_count: number;
  expense_count: number;
}

export default function FinancialStatementsPage() {
  const toast = useToast();
  const [data, setData] = useState<IncomeStatement | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const result = await accountingService.getIncomeStatement({
        start_date: startDate || undefined,
        end_date: endDate || undefined
      });
      setData(result);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const categoryEntries = data ? Object.entries(data.expenses_by_category).sort((a, b) => b[1] - a[1]) : [];
  const maxCategoryValue = categoryEntries.length > 0 ? categoryEntries[0][1] : 1;

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B00] border-t-transparent"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">États financiers</h1>
        <p className="text-slate-500 mt-1">Compte de résultat : recettes vs dépenses</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center gap-3">
        <Calendar size={16} className="text-slate-400" />
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
        <span className="text-slate-400 text-sm">à</span>
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
        <button onClick={load} className="px-4 py-2 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-sm font-medium">
          Filtrer
        </button>
        {(startDate || endDate) && (
          <button onClick={() => { setStartDate(''); setEndDate(''); load(); }} className="px-4 py-2 text-slate-500 hover:text-slate-700 text-sm">
            Réinitialiser
          </button>
        )}
      </div>

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-100 rounded-2xl p-5">
              <div className="flex items-center gap-2 text-green-600 mb-2">
                <TrendingUp size={18} />
                <p className="text-sm font-medium">Total des recettes</p>
              </div>
              <p className="text-2xl font-bold text-green-700">{formatFCFA(data.total_income)}</p>
              <p className="text-xs text-green-600 mt-1">{data.income_count} paiement(s)</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
              <div className="flex items-center gap-2 text-red-600 mb-2">
                <TrendingDown size={18} />
                <p className="text-sm font-medium">Total des dépenses</p>
              </div>
              <p className="text-2xl font-bold text-red-700">{formatFCFA(data.total_expenses)}</p>
              <p className="text-xs text-red-600 mt-1">{data.expense_count} dépense(s)</p>
            </div>
            <div className={`rounded-2xl p-5 border ${data.net_result >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
              <div className={`flex items-center gap-2 mb-2 ${data.net_result >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                <Scale size={18} />
                <p className="text-sm font-medium">Résultat net</p>
              </div>
              <p className={`text-2xl font-bold ${data.net_result >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                {data.net_result >= 0 ? '+' : ''}{formatFCFA(data.net_result)}
              </p>
              <p className={`text-xs mt-1 ${data.net_result >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                {data.net_result >= 0 ? 'Excédent' : 'Déficit'}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <FileBarChart size={18} className="text-slate-400" />
              Répartition des dépenses par catégorie
            </h3>
            {categoryEntries.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">Aucune dépense sur cette période</p>
            ) : (
              <div className="space-y-3">
                {categoryEntries.map(([name, amount]) => (
                  <div key={name}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-slate-700">{name}</span>
                      <span className="font-semibold text-slate-900">{formatFCFA(amount)}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="h-full bg-[#FF6B00] rounded-full" style={{ width: `${(amount / maxCategoryValue) * 100}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
