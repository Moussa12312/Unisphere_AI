'use client';

import { useState, useEffect } from 'react';
import { 
  Printer, Search, Filter, Calendar, Receipt, CreditCard, 
  ArrowUpRight, ArrowDownRight, Users, Building2, Wallet, 
  CheckCircle2, Eye, X, Loader2, Download, AlertCircle, RefreshCw, FileText
} from 'lucide-react';
import api, { API_BASE_URL } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import ReceiptTemplate from '@/components/ReceiptTemplate';

/* ---------- Conversion d'un montant en toutes lettres ---------- */
function enLettres(n: number): string {
  const units = ['zéro','un','deux','trois','quatre','cinq','six','sept','huit','neuf','dix','onze','douze','treize','quatorze','quinze','seize','dix-sept','dix-huit','dix-neuf'];
  const tens = ['','dix','vingt','trente','quarante','cinquante','soixante','soixante','quatre-vingt','quatre-vingt'];
  const under100 = (x: number): string => {
    if (x < 20) return units[x];
    const t = Math.floor(x / 10), r = x % 10;
    if (t === 7 || t === 9) return tens[t] + '-' + units[10 + r];
    if (r === 0) return tens[t] + (t === 8 ? 's' : '');
    if (r === 1 && t !== 8) return tens[t] + ' et un';
    return tens[t] + '-' + units[r];
  };
  const under1000 = (x: number): string => {
    const c = Math.floor(x / 100), r = x % 100;
    let s = '';
    if (c > 0) s = c === 1 ? 'cent' : units[c] + ' cent' + (r === 0 && c > 1 ? 's' : '');
    if (r > 0) s = s ? s + ' ' + under100(r) : under100(r);
    return s;
  };
  n = Math.round(Math.abs(n));
  if (n === 0) return 'zéro';
  const M = Math.floor(n / 1000000), K = Math.floor((n % 1000000) / 1000), R = n % 1000;
  let out = '';
  if (M) out += M === 1 ? 'un million' : units[M] + ' millions';
  if (K) out += (out ? ' ' : '') + (K === 1 ? 'mille' : under1000(K) + ' mille');
  if (R) out += (out ? ' ' : '') + under1000(R);
  return out;
}

function formatFCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(amount || 0) + ' FCFA';
}

function formatDateFr(d: string | null | undefined) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  } catch {
    return d;
  }
}

interface ReceiptItem {
  id: string;
  original_id: number;
  type: 'tuition' | 'expense' | 'payroll' | 'cash';
  type_label: string;
  receipt_number: string;
  reference: string;
  party_name: string;
  party_detail: string;
  party_matricule: string;
  amount: number;
  direction: 'credit' | 'debit';
  payment_method: string;
  date: string;
  status: string;
  description: string;
  student_id?: number;
  expense_id?: number;
  payroll_id?: number;
  cash_id?: number;
  print_url: string;
}

export default function AllReceiptsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);
  const [stats, setStats] = useState({
    total_count: 0,
    total_credit: 0,
    total_debit: 0,
    tuition_count: 0,
    expense_count: 0,
    payroll_count: 0,
    cash_count: 0
  });

  // Filtres
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modales d'impression
  const [activeModal, setActiveModal] = useState<null | {
    type: 'tuition' | 'expense' | 'payroll' | 'cash';
    data: any;
  }>(null);
  const [loadingModal, setLoadingModal] = useState(false);

  useEffect(() => {
    loadReceipts();
  }, [typeFilter, periodFilter]);

  const loadReceipts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (typeFilter && typeFilter !== 'all') params.append('type_filter', typeFilter);
      if (periodFilter && periodFilter !== 'all') params.append('period', periodFilter);
      if (searchQuery) params.append('search', searchQuery);

      const res = await api.get(`/api/v1/financials/all-receipts?${params.toString()}`);
      setReceipts(res.data.receipts || []);
      setStats({
        total_count: res.data.total_count || 0,
        total_credit: res.data.total_credit || 0,
        total_debit: res.data.total_debit || 0,
        tuition_count: res.data.tuition_count || 0,
        expense_count: res.data.expense_count || 0,
        payroll_count: res.data.payroll_count || 0,
        cash_count: res.data.cash_count || 0
      });
    } catch (error) {
      console.error('Erreur chargement reçus:', error);
      toast.error('Erreur lors du chargement des reçus');
    } finally {
      setLoading(false);
    }
  };

  // Filtrage local immédiat sur la recherche et la méthode
  const filteredReceipts = receipts.filter(item => {
    if (methodFilter !== 'all' && item.payment_method !== methodFilter) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const match = (
        item.receipt_number.toLowerCase().includes(q) ||
        item.party_name.toLowerCase().includes(q) ||
        item.party_detail.toLowerCase().includes(q) ||
        item.reference.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      );
      if (!match) return false;
    }
    return true;
  });

  // Ouvrir la modale d'impression correspondante
  const handleOpenReceipt = async (item: ReceiptItem) => {
    setLoadingModal(true);
    try {
      if (item.type === 'tuition') {
        const res = await api.get(`/api/v1/financials/receipt/${item.original_id}`);
        setActiveModal({ type: 'tuition', data: res.data.receipt });
      } else if (item.type === 'expense') {
        const res = await api.get(`/api/v1/financials/expense-receipt/${item.original_id}`);
        setActiveModal({ type: 'expense', data: res.data });
      } else if (item.type === 'payroll') {
        const res = await api.get(`/api/v1/financials/payroll-receipt/${item.original_id}`);
        setActiveModal({ type: 'payroll', data: res.data });
      } else {
        // Bon de caisse
        setActiveModal({
          type: 'cash',
          data: {
            voucher: {
              voucher_number: item.receipt_number,
              reference: item.reference,
              amount: item.amount,
              date: item.date,
              description: item.description,
              party_name: item.party_name,
              direction: item.direction
            }
          }
        });
      }
    } catch (err) {
      console.error('Erreur ouverture reçu:', err);
      toast.error('Impossible de charger les détails du reçu');
    } finally {
      setLoadingModal(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 print:p-0 print:m-0 print:max-w-none">
      
      {/* ===== CONTENU DE LA PAGE MASQUÉ LORS DE L'IMPRESSION QUAND UN REÇU EST OUVERT ===== */}
      <div className={`space-y-6 ${activeModal ? 'print:hidden' : ''}`}>
        {/* ===== EN-TÊTE DE LA PAGE ===== */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-orange-100 text-[#FF6B00] flex items-center justify-center font-bold shadow-inner">
              <Printer size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Reçus & Justificatifs Officiels
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-orange-50 text-[#FF6B00] border border-orange-200">
                  Imprimables
                </span>
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Consultez, recherchez et imprimez en un clic tous les reçus de scolarité, bons de décaissement et bulletins de paie.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => loadReceipts()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-all"
            title="Rafraîchir"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Actualiser
          </button>
        </div>
      </div>

      {/* ===== CARTES STATISTIQUES (KPIs) ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Reçus */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Receipt size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Reçus Émis</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{stats.total_count}</p>
            <p className="text-xs text-slate-400 mt-0.5">Toutes opérations confondues</p>
          </div>
        </div>

        {/* Scolarité (Encaissements) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ArrowDownRight size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Reçus Scolarité ({stats.tuition_count})</p>
            <p className="text-xl font-black text-emerald-600 mt-0.5">{formatFCFA(stats.total_credit)}</p>
            <p className="text-xs text-emerald-700 font-medium mt-0.5">Recettes encaissées</p>
          </div>
        </div>

        {/* Dépenses / Décaissements */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <ArrowUpRight size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Bons de Dépense ({stats.expense_count})</p>
            <p className="text-xl font-black text-rose-600 mt-0.5">{formatFCFA(stats.total_debit)}</p>
            <p className="text-xs text-rose-700 font-medium mt-0.5">Décaissements réglés</p>
          </div>
        </div>

        {/* Bulletins de Salaire */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Bulletins de Paie ({stats.payroll_count})</p>
            <p className="text-xl font-black text-purple-700 mt-0.5">{stats.payroll_count} bulletins</p>
            <p className="text-xs text-purple-600 font-medium mt-0.5">Personnel & Enseignants</p>
          </div>
        </div>

      </div>

      {/* ===== ONGLETS ET BARRE DE FILTRES ===== */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        
        {/* Onglets de types */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
          {[
            { id: 'all', label: 'Tous les Reçus', count: stats.total_count, icon: Receipt },
            { id: 'tuition', label: 'Scolarité (Étudiants)', count: stats.tuition_count, icon: CreditCard },
            { id: 'expense', label: 'Bons de Décaissement', count: stats.expense_count, icon: Building2 },
            { id: 'payroll', label: 'Bulletins de Paie', count: stats.payroll_count, icon: Users },
            { id: 'cash', label: 'Bons de Caisse', count: stats.cash_count, icon: Wallet },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = typeFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setTypeFilter(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  active 
                    ? 'bg-[#FF6B00] text-white shadow-md shadow-orange-500/20' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  active ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filtres de recherche et de sélection */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          
          {/* Recherche textuelle */}
          <div className="md:col-span-6 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Rechercher par N° reçu, nom étudiant, matricule, fournisseur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#FF6B00] focus:bg-white transition-all text-slate-800"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filtre de période */}
          <div className="md:col-span-3">
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-[#FF6B00]"
            >
              <option value="all">📅 Période : Toute l'année</option>
              <option value="today">Aujourd'hui</option>
              <option value="week">7 derniers jours</option>
              <option value="month">Ce mois-ci</option>
              <option value="year">Cette année civile</option>
            </select>
          </div>

          {/* Filtre de mode de paiement */}
          <div className="md:col-span-3">
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-[#FF6B00]"
            >
              <option value="all">💳 Mode : Tous les règlements</option>
              <option value="especes">Espèces (Cash)</option>
              <option value="virement">Virement bancaire</option>
              <option value="wave">Wave</option>
              <option value="orange_money">Orange Money</option>
              <option value="cheque">Chèque</option>
            </select>
          </div>

        </div>

      </div>

      {/* ===== TABLEAU DES REÇUS ===== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="animate-spin text-[#FF6B00] mb-3" size={32} />
            <p className="text-sm font-medium">Chargement des reçus...</p>
          </div>
        ) : filteredReceipts.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <Receipt className="mx-auto text-slate-300 mb-3" size={48} />
            <p className="text-base font-bold text-slate-700">Aucun reçu trouvé</p>
            <p className="text-xs text-slate-400 mt-1">Modifiez vos filtres ou effectuez une autre recherche.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* VUE MOBILE : Cartes soignées comme le bulletin de notes */}
            <div className="grid grid-cols-1 gap-3.5 md:hidden p-4">
              {filteredReceipts.map((item) => {
                const isCredit = item.direction === 'credit';
                return (
                  <div
                    key={item.id}
                    onClick={() => handleOpenReceipt(item)}
                    className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:border-[#FF6B00] transition-all cursor-pointer space-y-3"
                  >
                    {/* Ligne 1 : N° Pièce + Type + Date */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 flex items-center gap-1">
                          <Receipt size={12} className="text-[#FF6B00]" />
                          {item.receipt_number}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                          item.type === 'tuition'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : item.type === 'expense'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : item.type === 'payroll'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {item.type_label}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 shrink-0 font-medium">
                        {formatDateFr(item.date)}
                      </span>
                    </div>

                    {/* Ligne 2 : Tiers / Bénéficiaire */}
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{item.party_name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{item.party_detail}</p>
                    </div>

                    {/* Ligne 3 : Mode & Montant */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="capitalize px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold text-[11px] flex items-center gap-1">
                        <CreditCard size={12} />
                        {item.payment_method.replace('_', ' ')}
                      </span>
                      <span className={`font-mono font-black text-base ${
                        isCredit ? 'text-emerald-600' : 'text-slate-900'
                      }`}>
                        {isCredit ? '+' : '-'}{formatFCFA(item.amount)}
                      </span>
                    </div>

                    {/* Bouton d'action */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenReceipt(item);
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-orange-50 hover:bg-[#FF6B00] text-[#FF6B00] hover:text-white border border-orange-200 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98]"
                    >
                      <Printer size={14} />
                      Visualiser / Imprimer ce reçu
                    </button>
                  </div>
                );
              })}
            </div>

            {/* VUE TABLETTE & DESKTOP */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4">N° Reçu / Pièce</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Bénéficiaire / Tiers</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Mode</th>
                    <th className="py-3.5 px-4 text-right">Montant</th>
                    <th className="py-3.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReceipts.map((item) => {
                    const isCredit = item.direction === 'credit';
                    return (
                      <tr 
                        key={item.id} 
                        className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                        onClick={() => handleOpenReceipt(item)}
                      >
                        {/* N° Reçu */}
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100 group-hover:bg-orange-50 group-hover:text-[#FF6B00] transition-colors">
                            <Receipt size={13} className="text-[#FF6B00]" />
                            {item.receipt_number}
                          </span>
                        </td>

                        {/* Type de pièce */}
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                            item.type === 'tuition' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : item.type === 'expense'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : item.type === 'payroll'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {item.type_label}
                          </span>
                        </td>

                        {/* Bénéficiaire / Tiers */}
                        <td className="py-3.5 px-4">
                          <div>
                            <p className="font-bold text-slate-900 text-[13px]">{item.party_name}</p>
                            <p className="text-[11px] text-slate-500">{item.party_detail}</p>
                          </div>
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-4 text-slate-600 font-medium">
                          {formatDateFr(item.date)}
                        </td>

                        {/* Mode de paiement */}
                        <td className="py-3.5 px-4">
                          <span className="capitalize px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">
                            {item.payment_method.replace('_', ' ')}
                          </span>
                        </td>

                        {/* Montant */}
                        <td className="py-3.5 px-4 text-right">
                          <span className={`font-mono font-bold text-sm ${
                            isCredit ? 'text-emerald-600' : 'text-slate-900'
                          }`}>
                            {isCredit ? '+' : '-'}{formatFCFA(item.amount)}
                          </span>
                        </td>

                        {/* Action Imprimer */}
                        <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleOpenReceipt(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-[#FF6B00] text-[#FF6B00] hover:text-white border border-orange-200 font-bold text-xs transition-all shadow-sm"
                            title="Imprimer ce reçu"
                          >
                            <Printer size={13} />
                            Imprimer
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pied de tableau */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>
            Affichage de <span className="font-bold text-slate-800">{filteredReceipts.length}</span> reçu(s) sur <span className="font-bold text-slate-800">{receipts.length}</span>
          </p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Encaissements : {formatFCFA(stats.total_credit)}
            </span>
            <span className="inline-flex items-center gap-1 text-rose-700 font-bold">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              Décaissements : {formatFCFA(stats.total_debit)}
            </span>
        </div>

      </div>
      {/* Fin du tableau des reçus */}
    </div>
    {/* Fin du contenu masqué à l'impression */}
    </div>

      {/* ============================================================== */}
      {/* 🖨️ MODALE D'IMPRESSION HAUTE DÉFINITION UNIFIÉE               */}
      {/* ============================================================== */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible print:inset-auto print:z-auto print:w-full print:h-auto print:block">
          
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto border border-slate-200 shadow-2xl p-3 sm:p-6 print:border-none print:shadow-none print:max-w-none print:w-full print:p-0 print:overflow-visible print:max-h-none print:m-0 relative voucher-sheet">
            
            {/* Barre d'action supérieure (masquée à l'impression) */}
            <div className="flex items-center justify-between pb-3 sm:pb-4 mb-4 sm:mb-6 border-b border-slate-100 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="text-[#FF6B00]" size={18} />
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  {activeModal.type === 'tuition' && 'Reçu Officiel de Scolarité'}
                  {activeModal.type === 'expense' && 'Bon de Décaissement Officiel'}
                  {activeModal.type === 'payroll' && 'Bulletin de Paie & Salaire'}
                  {activeModal.type === 'cash' && 'Bon d\'Opération de Caisse'}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 bg-[#FF6B00] text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-[#e55f00] shadow-md shadow-orange-500/20 transition-all"
                >
                  <Printer size={15} />
                  <span>Imprimer</span>
                </button>
                <button
                  onClick={() => setActiveModal(null)}
                  className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* ===== CAS 1 : REÇU DE SCOLARITÉ (ÉTUDIANT) ===== */}
            {activeModal.type === 'tuition' && (
              <ReceiptTemplate 
                receipt={activeModal.data} 
                showBackButton={false} 
              />
            )}

            {/* ===== CAS 2 : BON DE DÉCAISSEMENT (DÉPENSE) ===== */}
            {activeModal.type === 'expense' && (
              <div className="bg-white p-4 sm:p-8 border border-slate-300 rounded-xl print:border-none print:p-0 text-slate-900 text-xs">
                
                {/* En-tête de l'université */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 sm:pb-5 mb-4 sm:mb-6 border-b-2 border-rose-500 gap-3">
                  <div className="flex items-center gap-3 sm:gap-4">
                    {activeModal.data.university?.logo && (
                      <img 
                        src={`${API_BASE_URL}/uploads/logos/${activeModal.data.university.logo}`} 
                        alt="Logo" 
                        className="w-12 h-12 sm:w-16 sm:h-16 object-contain" 
                      />
                    )}
                    <div>
                      <p className="font-black text-sm sm:text-base uppercase text-slate-900">{activeModal.data.university?.name || 'UNIVERSITÉ'}</p>
                      {activeModal.data.university?.address && <p className="text-[10px] sm:text-[11px] text-slate-500">{activeModal.data.university.address}</p>}
                      {activeModal.data.university?.phone && <p className="text-[10px] sm:text-[11px] text-slate-500">Tél : {activeModal.data.university.phone}</p>}
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="font-black text-base sm:text-lg text-rose-600 uppercase">BON DE DÉCAISSEMENT</p>
                    <p className="font-mono font-bold text-xs mt-0.5">N° {activeModal.data.voucher?.voucher_number}</p>
                    <p className="text-[11px] text-slate-500">Date : {formatDateFr(activeModal.data.voucher?.date)}</p>
                  </div>
                </div>

                {/* Détails du décaissement */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div className="border border-slate-200 rounded-xl p-3 sm:p-4 bg-slate-50/50">
                    <p className="font-bold text-[11px] text-slate-400 uppercase mb-1 sm:mb-2">Bénéficiaire / Prestataire</p>
                    <p className="font-bold text-sm text-slate-900">{activeModal.data.voucher?.supplier_name}</p>
                    {activeModal.data.voucher?.supplier_phone && (
                      <p className="text-slate-600 mt-1">Tél : {activeModal.data.voucher.supplier_phone}</p>
                    )}
                    {activeModal.data.voucher?.supplier_address && (
                      <p className="text-slate-600">{activeModal.data.voucher.supplier_address}</p>
                    )}
                  </div>

                  <div className="border border-slate-200 rounded-xl p-3 sm:p-4 bg-slate-50/50">
                    <p className="font-bold text-[11px] text-slate-400 uppercase mb-1 sm:mb-2">Motif de la Dépense</p>
                    <p className="font-bold text-sm text-slate-900">{activeModal.data.voucher?.title}</p>
                    <p className="text-slate-600 mt-1">Catégorie : <span className="font-semibold">{activeModal.data.voucher?.category_name}</span></p>
                    <p className="text-slate-600">Mode : <span className="font-semibold capitalize">{activeModal.data.voucher?.payment_method}</span></p>
                  </div>
                </div>

                {/* Montant */}
                <div className="border-2 border-slate-800 rounded-xl p-4 sm:p-5 mb-6 sm:mb-8 bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase font-bold text-slate-500">Montant décaissé</p>
                    <p className="text-xl sm:text-2xl font-black font-mono text-slate-900 mt-1">
                      {formatFCFA(activeModal.data.voucher?.amount)}
                    </p>
                    <p className="text-xs text-slate-600 italic mt-1 capitalize">
                      Soit : « {enLettres(activeModal.data.voucher?.amount)} francs CFA »
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="px-3 py-1 bg-rose-100 text-rose-800 font-bold rounded-lg uppercase text-[11px] sm:text-xs">
                      Sortie de caisse / banque
                    </span>
                  </div>
                </div>

                {/* Signatures officielles */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 pt-4 sm:pt-6 border-t border-slate-200 text-center">
                  <div className="border border-dashed border-slate-300 rounded-xl p-3 sm:p-4 min-h-[90px] sm:min-h-[110px] flex flex-col justify-between">
                    <p className="font-bold text-xs text-slate-700">Le Comptable (Émetteur)</p>
                    <p className="text-[10px] text-slate-400 italic">Signature & Cachet</p>
                  </div>

                  <div className="border border-dashed border-slate-300 rounded-xl p-3 sm:p-4 min-h-[90px] sm:min-h-[110px] flex flex-col justify-between">
                    <p className="font-bold text-xs text-slate-700">L'Ordonnateur / Recteur</p>
                    <p className="text-[10px] text-slate-400 italic">Pour Accord (Visa)</p>
                  </div>

                  <div className="border border-dashed border-slate-300 rounded-xl p-3 sm:p-4 min-h-[90px] sm:min-h-[110px] flex flex-col justify-between">
                    <p className="font-bold text-xs text-slate-700">Le Bénéficiaire</p>
                    <p className="text-[10px] text-slate-400 italic">Pour Acquit (Reçu)</p>
                  </div>
                </div>

              </div>
            )}

            {/* ===== CAS 3 : BULLETIN / REÇU DE SALAIRE ===== */}
            {activeModal.type === 'payroll' && (
              <div className="bg-white p-4 sm:p-8 border border-slate-300 rounded-xl print:border-none print:p-0 text-slate-900 text-xs">
                
                {/* En-tête */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 sm:pb-5 mb-4 sm:mb-6 border-b-2 border-purple-500 gap-3">
                  <div className="flex items-center gap-3 sm:gap-4">
                    {activeModal.data.university?.logo && (
                      <img 
                        src={`${API_BASE_URL}/uploads/logos/${activeModal.data.university.logo}`} 
                        alt="Logo" 
                        className="w-12 h-12 sm:w-16 sm:h-16 object-contain" 
                      />
                    )}
                    <div>
                      <p className="font-black text-sm sm:text-base uppercase text-slate-900">{activeModal.data.university?.name || 'UNIVERSITÉ'}</p>
                      {activeModal.data.university?.address && <p className="text-[10px] sm:text-[11px] text-slate-500">{activeModal.data.university.address}</p>}
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="font-black text-base sm:text-lg text-purple-700 uppercase">BULLETIN & REÇU DE SALAIRE</p>
                    <p className="font-mono font-bold text-xs mt-0.5">N° {activeModal.data.payslip?.slip_number}</p>
                    <p className="text-[11px] text-slate-500">Période : {activeModal.data.payslip?.period}</p>
                  </div>
                </div>

                {/* Infos salarié */}
                <div className="border border-slate-200 rounded-xl p-3 sm:p-4 bg-slate-50/50 mb-4 sm:mb-6">
                  <p className="font-bold text-[11px] text-slate-400 uppercase mb-1 sm:mb-2">Bénéficiaire (Salarié)</p>
                  <p className="font-bold text-sm text-slate-900">{activeModal.data.staff?.name}</p>
                  <p className="text-slate-600 mt-1">Fonction : <span className="font-semibold">{activeModal.data.staff?.role}</span></p>
                  {activeModal.data.staff?.email && <p className="text-slate-600">Email : {activeModal.data.staff.email}</p>}
                </div>

                {/* Tableau de rémunération */}
                <div className="border border-slate-200 rounded-xl overflow-hidden mb-4 sm:mb-6">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 font-bold text-slate-700">
                      <tr>
                        <th className="py-2.5 px-3 sm:px-4">Rubrique</th>
                        <th className="py-2.5 px-3 sm:px-4 text-right">Montant (FCFA)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-2.5 px-3 sm:px-4 font-semibold">Salaire Brut</td>
                        <td className="py-2.5 px-3 sm:px-4 text-right font-mono font-bold">{formatFCFA(activeModal.data.payslip?.gross_salary)}</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 sm:px-4 text-slate-500">Retenues & Déductions</td>
                        <td className="py-2.5 px-3 sm:px-4 text-right font-mono text-rose-600">-{formatFCFA(activeModal.data.payslip?.deductions)}</td>
                      </tr>
                      <tr className="bg-purple-50 font-black text-purple-900 text-xs sm:text-sm">
                        <td className="py-3 px-3 sm:px-4">NET PAYÉ</td>
                        <td className="py-3 px-3 sm:px-4 text-right font-mono text-purple-800">{formatFCFA(activeModal.data.payslip?.net_salary)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p className="text-xs text-slate-700 italic mb-6 sm:mb-8 capitalize">
                  Montant en lettres : « {enLettres(activeModal.data.payslip?.net_salary)} francs CFA »
                </p>

                {/* Signatures */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 pt-4 sm:pt-6 border-t border-slate-200 text-center">
                  <div className="border border-dashed border-slate-300 rounded-xl p-3 sm:p-4 min-h-[90px] sm:min-h-[110px] flex flex-col justify-between">
                    <p className="font-bold text-xs text-slate-700">Le Service Financier</p>
                    <p className="text-[10px] text-slate-400 italic">Visa & Cachet</p>
                  </div>

                  <div className="border border-dashed border-slate-300 rounded-xl p-3 sm:p-4 min-h-[90px] sm:min-h-[110px] flex flex-col justify-between">
                    <p className="font-bold text-xs text-slate-700">L'Employé(e)</p>
                    <p className="text-[10px] text-slate-400 italic">Signature pour Réception</p>
                  </div>
                </div>

              </div>
            )}

            {/* ===== CAS 4 : BON DE CAISSE ===== */}
            {activeModal.type === 'cash' && (
              <div className="bg-white p-4 sm:p-8 border border-slate-300 rounded-xl print:border-none print:p-0 text-slate-900 text-xs">
                <div className="pb-3 sm:pb-4 mb-4 border-b-2 border-blue-500 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <h3 className="font-black text-base sm:text-lg uppercase text-blue-700">BON D'OPÉRATION DE TRÉSORERIE</h3>
                  <p className="font-mono font-bold text-xs">N° {activeModal.data.voucher?.voucher_number}</p>
                </div>
                <div className="space-y-3 mb-4 sm:mb-6 bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-200">
                  <p><span className="font-bold text-slate-500">Compte / Caisse :</span> <span className="font-bold">{activeModal.data.voucher?.party_name}</span></p>
                  <p><span className="font-bold text-slate-500">Description :</span> {activeModal.data.voucher?.description}</p>
                  <p><span className="font-bold text-slate-500">Date :</span> {formatDateFr(activeModal.data.voucher?.date)}</p>
                  <p className="text-base sm:text-lg font-black text-slate-900 font-mono mt-2">
                    Montant : {formatFCFA(activeModal.data.voucher?.amount)}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-4 sm:pt-6 border-t border-slate-200 text-center">
                  <div className="border border-dashed border-slate-300 rounded-xl p-3 sm:p-4 min-h-[80px] sm:min-h-[90px] flex flex-col justify-between">
                    <p className="font-bold text-xs text-slate-700">Le Caissier</p>
                  </div>
                  <div className="border border-dashed border-slate-300 rounded-xl p-3 sm:p-4 min-h-[80px] sm:min-h-[90px] flex flex-col justify-between">
                    <p className="font-bold text-xs text-slate-700">Le Responsable Financier</p>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}
