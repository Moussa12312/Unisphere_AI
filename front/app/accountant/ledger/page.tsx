'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Plus, X, Save, Loader2, Trash2, Filter } from 'lucide-react';
import { ledgerService, JournalEntry, Account } from '@/services/ledgerService';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/hooks/useConfirm';

function formatFCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}

const SOURCE_LABELS: Record<string, string> = {
  manual: 'Manuelle',
  payment: 'Encaissement',
  expense: 'Dépense',
};

interface Line { account_id: string; debit: string; credit: string; description: string }
const emptyLine = (): Line => ({ account_id: '', debit: '', credit: '', description: '' });

export default function JournalPage() {
  const toast = useToast();
  const confirm = useConfirm();

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<Line[]>([emptyLine(), emptyLine()]);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [j, a] = await Promise.all([ledgerService.getJournal(), ledgerService.getAccounts()]);
      setEntries(j);
      setAccounts(a);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const totalDebit = lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);
  const isBalanced = totalDebit > 0 && totalDebit === totalCredit;

  const updateLine = (index: number, field: keyof Line, value: string) => {
    const newLines = [...lines];
    newLines[index][field] = value;
    setLines(newLines);
  };

  const handleCreate = async () => {
    if (!description || !isBalanced) {
      toast.error(!isBalanced ? 'Le débit doit être égal au crédit' : 'Veuillez remplir la description');
      return;
    }
    const validLines = lines.filter(l => l.account_id && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0));
    if (validLines.length < 2) {
      toast.error('Au moins 2 lignes valides sont requises');
      return;
    }
    setSaving(true);
    try {
      await ledgerService.createManualEntry({
        entry_date: entryDate,
        description,
        lines: validLines.map(l => ({
          account_id: parseInt(l.account_id),
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0,
          description: l.description || undefined
        }))
      });
      toast.success('Écriture enregistrée avec succès');
      setShowModal(false);
      setDescription('');
      setLines([emptyLine(), emptyLine()]);
      load();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (entry: JournalEntry) => {
    if (entry.source !== 'manual') {
      toast.error("Impossible de supprimer une écriture générée automatiquement — supprimez l'opération d'origine (dépense/paiement)");
      return;
    }
    const ok = await confirm({ title: "Supprimer cette écriture ?", message: entry.description, confirmText: 'Supprimer', variant: 'danger' });
    if (!ok) return;
    try {
      await ledgerService.deleteEntry(entry.id);
      toast.success('Écriture supprimée');
      load();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B00] border-t-transparent"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Journal comptable</h1>
          <p className="text-slate-500 mt-1">Toutes les écritures en partie double (générées automatiquement ou saisies manuellement)</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-sm font-medium shadow-md">
          <Plus size={16} /> Écriture manuelle
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <BookOpen className="mx-auto text-slate-300 mb-3" size={48} />
          <p className="text-slate-500">Aucune écriture pour le moment</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map(entry => (
            <div key={entry.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 font-medium">
                    {SOURCE_LABELS[entry.source] || entry.source}
                  </span>
                  <div>
                    <p className="font-medium text-slate-900">{entry.description}</p>
                    <p className="text-xs text-slate-400">{entry.reference} • {new Date(entry.entry_date).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-semibold text-slate-700">
                    {formatFCFA(entry.lines.reduce((s, l) => s + l.debit, 0))}
                  </p>
                  {entry.source === 'manual' && (
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(entry); }} className="text-slate-300 hover:text-red-500">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </button>
              {expandedId === entry.id && (
                <div className="border-t border-slate-100 px-4 py-3 bg-slate-50">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-slate-500">
                        <th className="text-left py-1 font-medium">Compte</th>
                        <th className="text-right py-1 font-medium">Débit</th>
                        <th className="text-right py-1 font-medium">Crédit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entry.lines.map((l, i) => (
                        <tr key={i} className="border-t border-slate-200">
                          <td className="py-1.5 text-slate-700">{l.account.code} — {l.account.name}</td>
                          <td className="py-1.5 text-right text-slate-900">{l.debit > 0 ? formatFCFA(l.debit) : ''}</td>
                          <td className="py-1.5 text-right text-slate-900">{l.credit > 0 ? formatFCFA(l.credit) : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">Nouvelle écriture manuelle</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Date</label>
                  <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Description *</label>
                  <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-slate-600">Compte</th>
                      <th className="text-right px-3 py-2 font-medium text-slate-600 w-28">Débit</th>
                      <th className="text-right px-3 py-2 font-medium text-slate-600 w-28">Crédit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="px-3 py-2">
                          <select value={line.account_id} onChange={(e) => updateLine(i, 'account_id', e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm bg-white">
                            <option value="">Sélectionner...</option>
                            {accounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" value={line.debit} onChange={(e) => updateLine(i, 'debit', e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm text-right" />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" value={line.credit} onChange={(e) => updateLine(i, 'credit', e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm text-right" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={() => setLines([...lines, emptyLine()])} className="text-xs text-[#FF6B00] hover:underline">
                + Ajouter une ligne
              </button>

              <div className={`rounded-lg p-3 flex items-center justify-between text-sm ${isBalanced ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                <span>Débit : {formatFCFA(totalDebit)} — Crédit : {formatFCFA(totalCredit)}</span>
                <span className="font-medium">{isBalanced ? '✓ Équilibrée' : 'Non équilibrée'}</span>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium">Annuler</button>
              <button onClick={handleCreate} disabled={saving || !isBalanced} className="flex-1 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
