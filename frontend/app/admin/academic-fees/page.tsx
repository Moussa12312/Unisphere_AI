'use client';

import React, { useState, useEffect } from 'react';
import {
  Banknote, Calendar, ShieldCheck, Lock, Unlock, Plus, Edit2,
  Trash2, AlertCircle, CheckCircle2, Clock, DollarSign, Layers,
  ChevronRight, Save, X, Loader2, ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import { academicFeeService } from '@/services/academicFeeService';
import { toast } from 'react-hot-toast';

export default function AdminAcademicFeesPage() {
  const [activeTab, setActiveTab] = useState<'fees' | 'tranches' | 'deadlines'>('fees');
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [loading, setLoading] = useState(true);

  // Données
  const [fees, setFees] = useState<any[]>([]);
  const [tranches, setTranches] = useState<any[]>([]);
  const [deadlines, setDeadlines] = useState<any[]>([]);

  // Modals
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [showTrancheModal, setShowTrancheModal] = useState(false);
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [feeForm, setFeeForm] = useState({
    level: 'L1',
    payment_type: 'scolarite',
    amount: '',
    academic_year: '2026-2027'
  });

  const [trancheForm, setTrancheForm] = useState({
    level: 'L1',
    payment_type: 'scolarite',
    academic_year: '2026-2027',
    tranche_number: '1',
    tranche_name: 'Tranche 1 - Rentrée',
    percentage: '40',
    amount: '',
    due_date: '2026-10-15'
  });

  const [deadlineForm, setDeadlineForm] = useState({
    deadline_type: 'tranche_1',
    deadline_date: '2026-10-15',
    academic_year: '2026-2027',
    description: 'Paiement de la Tranche 1 obligatoire avant le 15 Octobre'
  });

  useEffect(() => {
    loadAll();
  }, [academicYear]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [feesData, tranchesData, deadlinesData] = await Promise.all([
        academicFeeService.getFees(academicYear),
        academicFeeService.getTranches(academicYear),
        academicFeeService.getDeadlines(academicYear)
      ]);
      setFees(Array.isArray(feesData) ? feesData : []);
      setTranches(Array.isArray(tranchesData) ? tranchesData : []);
      setDeadlines(Array.isArray(deadlinesData) ? deadlinesData : []);
    } catch (err) {
      console.error('Erreur chargement frais/tranches:', err);
      toast.error('Erreur lors du chargement des données tarifaires');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feeForm.amount || Number(feeForm.amount) <= 0) {
      toast.error('Veuillez saisir un montant valide');
      return;
    }
    setSaving(true);
    try {
      await academicFeeService.createOrUpdateFee({
        level: feeForm.level,
        payment_type: feeForm.payment_type,
        amount: Number(feeForm.amount),
        academic_year: feeForm.academic_year
      });
      toast.success('Tarif configuré avec succès !');
      setShowFeeModal(false);
      loadAll();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTranche = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await academicFeeService.createTranche({
        level: trancheForm.level,
        payment_type: trancheForm.payment_type,
        academic_year: trancheForm.academic_year,
        tranche_number: Number(trancheForm.tranche_number),
        tranche_name: trancheForm.tranche_name,
        percentage: Number(trancheForm.percentage),
        amount: trancheForm.amount ? Number(trancheForm.amount) : null,
        due_date: trancheForm.due_date
      });
      toast.success('Tranche configurée avec succès !');
      setShowTrancheModal(false);
      loadAll();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la création de la tranche');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await academicFeeService.createOrUpdateDeadline({
        deadline_type: deadlineForm.deadline_type,
        deadline_date: deadlineForm.deadline_date,
        academic_year: deadlineForm.academic_year,
        description: deadlineForm.description
      });
      toast.success('Date limite configurée avec succès !');
      setShowDeadlineModal(false);
      loadAll();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTranche = async (id: number) => {
    if (!confirm('Voulez-vous vraiment supprimer cette tranche ?')) return;
    try {
      await academicFeeService.deleteTranche(id);
      toast.success('Tranche supprimée');
      loadAll();
    } catch (err) {
      toast.error('Impossible de supprimer la tranche');
    }
  };

  const handleDeleteDeadline = async (id: number) => {
    if (!confirm('Voulez-vous vraiment supprimer cette échéance ?')) return;
    try {
      await academicFeeService.deleteDeadline(id);
      toast.success('Échéance supprimée');
      loadAll();
    } catch (err) {
      toast.error('Impossible de supprimer l\'échéance');
    }
  };

  // Niveaux et groupement
  const levels = ['L1', 'L2', 'L3', 'M1', 'M2'];
  const lockedCountTotal = fees.reduce((sum, f) => sum + (f.locked_count || 0), 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
            <Link href="/admin/payments" className="hover:text-slate-800 flex items-center gap-1">
              <ArrowLeft size={14} /> Retour Paiements
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-semibold">Grille Tarifaire & Échéanciers</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Banknote className="w-7 h-7 text-[#FF6B00]" />
            Configuration des Scolarités & Tranches
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Définissez les frais académiques par niveau, les dates limites officielles et les tranches de paiement exigibles.
          </p>
        </div>

        {/* Sélecteur Année Académique */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-500 uppercase">Année :</label>
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 shadow-sm focus:ring-2 focus:ring-[#FF6B00]"
          >
            <option value="2026-2027">2026-2027 (En cours)</option>
            <option value="2025-2026">2025-2026</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Tarifs Définis</span>
            <Layers size={18} className="text-[#FF6B00]" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{fees.length} tarifs</div>
          <p className="text-xs text-slate-500 mt-1">Inscriptions & scolarités L1-M2</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Tranches Actives</span>
            <Calendar size={18} className="text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{tranches.length} tranches</div>
          <p className="text-xs text-slate-500 mt-1">Échelonnements configurés</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Dates Limites</span>
            <Clock size={18} className="text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{deadlines.length} échéances</div>
          <p className="text-xs text-slate-500 mt-1">Calendrier officiel de paiement</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Statut Verrouillage</span>
            <ShieldCheck size={18} className="text-emerald-600" />
          </div>
          <div className="text-base font-bold text-emerald-700 flex items-center gap-1.5">
            <Lock size={16} /> Verrouillé & Sécurisé
          </div>
          <p className="text-xs text-slate-500 mt-1">{lockedCountTotal} étudiants rattachés</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row border-b border-slate-200 bg-white rounded-xl p-1 shadow-sm gap-1">
        <button
          onClick={() => setActiveTab('fees')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'fees'
              ? 'bg-[#FF6B00] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Banknote size={16} /> Grille Tarifaire (Scolarités & Inscriptions)
        </button>

        <button
          onClick={() => setActiveTab('tranches')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'tranches'
              ? 'bg-[#FF6B00] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Calendar size={16} /> Tranches de Paiement ({tranches.length})
        </button>

        <button
          onClick={() => setActiveTab('deadlines')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'deadlines'
              ? 'bg-[#FF6B00] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Clock size={16} /> Échéanciers & Dates Limites ({deadlines.length})
        </button>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200">
          <Loader2 size={36} className="animate-spin text-[#FF6B00] mb-3" />
          <p className="text-slate-500 text-sm">Chargement de la configuration financière...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: GRILLE TARIFAIRE */}
          {activeTab === 'fees' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Grille Officielle des Frais ({academicYear})</h2>
                  <p className="text-xs text-slate-500">Les montants configurés ici sont appliqués aux étudiants lors de leur inscription.</p>
                </div>
                <button
                  onClick={() => setShowFeeModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#FF6B00] hover:bg-[#e55f00] text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
                >
                  <Plus size={16} /> Configurer un Tarif
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {levels.map((lvl) => {
                  const scolarite = fees.find(f => f.level === lvl && f.payment_type === 'scolarite');
                  const inscription = fees.find(f => f.level === lvl && f.payment_type === 'inscription');
                  const total = (scolarite?.amount || 0) + (inscription?.amount || 0);

                  return (
                    <div key={lvl} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-orange-200 transition-colors">
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2.5">
                          <span className="w-10 h-10 rounded-xl bg-orange-100 text-[#FF6B00] font-bold text-base flex items-center justify-center">
                            {lvl}
                          </span>
                          <div>
                            <h3 className="font-bold text-slate-900 text-sm">Niveau {lvl}</h3>
                            <p className="text-[11px] text-slate-500">{academicYear}</p>
                          </div>
                        </div>
                        {scolarite?.is_locked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Lock size={10} /> Verrouillé
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Unlock size={10} /> Brouillon
                          </span>
                        )}
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center py-1">
                          <span className="text-slate-500">Frais d'inscription :</span>
                          <span className="font-semibold text-slate-800 font-mono">
                            {inscription ? `${Number(inscription.amount).toLocaleString('fr-FR')} FCFA` : 'Non configuré'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-slate-500">Scolarité annuelle :</span>
                          <span className="font-bold text-[#FF6B00] font-mono text-sm">
                            {scolarite ? `${Number(scolarite.amount).toLocaleString('fr-FR')} FCFA` : 'Non configuré'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-slate-100 font-bold">
                          <span className="text-slate-900">Total Annuel :</span>
                          <span className="text-slate-900 font-mono text-sm">
                            {total > 0 ? `${total.toLocaleString('fr-FR')} FCFA` : '-'}
                          </span>
                        </div>
                      </div>

                      {scolarite && (
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                          <span>Étudiants rattachés : <strong className="text-slate-700 font-mono">{scolarite.locked_count || 0}</strong></span>
                          <button
                            onClick={() => {
                              setFeeForm({
                                level: lvl,
                                payment_type: 'scolarite',
                                amount: scolarite.amount.toString(),
                                academic_year: academicYear
                              });
                              setShowFeeModal(true);
                            }}
                            className="text-[#FF6B00] hover:underline font-semibold"
                          >
                            Modifier
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: TRANCHES DE PAIEMENT */}
          {activeTab === 'tranches' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Échéancier des Tranches ({academicYear})</h2>
                  <p className="text-xs text-slate-500">Découpage des frais de scolarité par tranche et pourcentage exigible.</p>
                </div>
                <button
                  onClick={() => setShowTrancheModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#FF6B00] hover:bg-[#e55f00] text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
                >
                  <Plus size={16} /> Ajouter une Tranche
                </button>
              </div>

              {tranches.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
                  <Calendar size={36} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">Aucune tranche configurée pour cette année académique.</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 whitespace-nowrap">
                        <tr>
                          <th className="py-3 px-4">Niveau</th>
                          <th className="py-3 px-4">N° Tranche</th>
                          <th className="py-3 px-4">Libellé Officiel</th>
                          <th className="py-3 px-4">Quote-Part (%)</th>
                          <th className="py-3 px-4">Montant Exigible</th>
                          <th className="py-3 px-4">Date Limite de Paiement</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 whitespace-nowrap">
                        {tranches.map((tr) => (
                          <tr key={tr.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-900">{tr.level}</td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-semibold rounded-full text-[10px]">
                                Tranche {tr.tranche_number}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-medium text-slate-800">{tr.tranche_name}</td>
                            <td className="py-3 px-4 font-mono font-bold text-[#FF6B00]">{tr.percentage}%</td>
                            <td className="py-3 px-4 font-mono text-slate-700">
                              {tr.amount ? `${Number(tr.amount).toLocaleString('fr-FR')} FCFA` : '-'}
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                              {tr.due_date ? new Date(tr.due_date).toLocaleDateString('fr-FR') : 'Non définie'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => handleDeleteTranche(tr.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Supprimer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DATES LIMITES */}
          {activeTab === 'deadlines' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Échéanciers & Dates Butoirs ({academicYear})</h2>
                  <p className="text-xs text-slate-500">Dates limites officielles au-delà desquelles l'accès aux examens est verrouillé.</p>
                </div>
                <button
                  onClick={() => setShowDeadlineModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#FF6B00] hover:bg-[#e55f00] text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
                >
                  <Plus size={16} /> Ajouter une Échéance
                </button>
              </div>

              {deadlines.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
                  <Clock size={36} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">Aucune date limite officielle configurée.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {deadlines.map((dl) => (
                    <div key={dl.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg font-mono text-[11px] font-bold">
                          {dl.deadline_type}
                        </span>
                        <button
                          onClick={() => handleDeleteDeadline(dl.id)}
                          className="text-slate-400 hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 font-medium">Date d'échéance officielle :</p>
                        <p className="text-lg font-bold text-slate-900 mt-0.5 flex items-center gap-2">
                          <Calendar size={18} className="text-[#FF6B00]" />
                          {dl.deadline_date ? new Date(dl.deadline_date).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          }) : '-'}
                        </p>
                      </div>
                      <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        {dl.description || 'Pas de consigne particulière'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* MODAL CONFIGURER TARIF */}
      {showFeeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Configurer un Frais Académique</h2>
              <button onClick={() => setShowFeeModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveFee} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Niveau d'étude *</label>
                <select
                  value={feeForm.level}
                  onChange={(e) => setFeeForm({ ...feeForm, level: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#FF6B00]"
                >
                  <option value="L1">L1 (Licence 1)</option>
                  <option value="L2">L2 (Licence 2)</option>
                  <option value="L3">L3 (Licence 3)</option>
                  <option value="M1">M1 (Master 1)</option>
                  <option value="M2">M2 (Master 2)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Type de Frais *</label>
                <select
                  value={feeForm.payment_type}
                  onChange={(e) => setFeeForm({ ...feeForm, payment_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#FF6B00]"
                >
                  <option value="scolarite">Scolarité Annuelle</option>
                  <option value="inscription">Frais d'Inscription</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Montant Exigible (FCFA) *</label>
                <input
                  type="number"
                  placeholder="Ex: 750000"
                  value={feeForm.amount}
                  onChange={(e) => setFeeForm({ ...feeForm, amount: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowFeeModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL AJOUT TRANCHE */}
      {showTrancheModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Ajouter une Tranche de Paiement</h2>
              <button onClick={() => setShowTrancheModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveTranche} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Niveau *</label>
                  <select
                    value={trancheForm.level}
                    onChange={(e) => setTrancheForm({ ...trancheForm, level: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                  >
                    <option value="L1">L1</option>
                    <option value="L2">L2</option>
                    <option value="L3">L3</option>
                    <option value="M1">M1</option>
                    <option value="M2">M2</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">N° Tranche *</label>
                  <select
                    value={trancheForm.tranche_number}
                    onChange={(e) => setTrancheForm({ ...trancheForm, tranche_number: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                  >
                    <option value="1">1ère Tranche</option>
                    <option value="2">2ème Tranche</option>
                    <option value="3">3ème Tranche</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Libellé Officiel *</label>
                <input
                  type="text"
                  value={trancheForm.tranche_name}
                  onChange={(e) => setTrancheForm({ ...trancheForm, tranche_name: e.target.value })}
                  required
                  placeholder="Ex: Tranche 1 - Rentrée Universitaire"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Pourcentage (%) *</label>
                  <input
                    type="number"
                    value={trancheForm.percentage}
                    onChange={(e) => setTrancheForm({ ...trancheForm, percentage: e.target.value })}
                    required
                    placeholder="Ex: 40"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date d'échéance *</label>
                  <input
                    type="date"
                    value={trancheForm.due_date}
                    onChange={(e) => setTrancheForm({ ...trancheForm, due_date: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowTrancheModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Créer la Tranche
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL AJOUT DATE LIMITE */}
      {showDeadlineModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Configurer une Échéance Officielle</h2>
              <button onClick={() => setShowDeadlineModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveDeadline} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Type d'Échéance *</label>
                <select
                  value={deadlineForm.deadline_type}
                  onChange={(e) => setDeadlineForm({ ...deadlineForm, deadline_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                >
                  <option value="tranche_1">Tranche 1 (Octobre)</option>
                  <option value="tranche_2">Tranche 2 (Janvier)</option>
                  <option value="tranche_3">Tranche 3 (Avril)</option>
                  <option value="exams_s1">Accès Examens Semestre 1</option>
                  <option value="exams_s2">Accès Examens Semestre 2</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Date Butoir *</label>
                <input
                  type="date"
                  value={deadlineForm.deadline_date}
                  onChange={(e) => setDeadlineForm({ ...deadlineForm, deadline_date: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Consigne</label>
                <textarea
                  rows={2}
                  value={deadlineForm.description}
                  onChange={(e) => setDeadlineForm({ ...deadlineForm, description: e.target.value })}
                  placeholder="Ex: Paiement obligatoire pour l'édition de la carte d'examen"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowDeadlineModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
