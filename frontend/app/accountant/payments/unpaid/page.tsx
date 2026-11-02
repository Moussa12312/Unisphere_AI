'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  AlertCircle, Phone, MessageSquare, Send, CheckCircle2,
  RefreshCw, Search, Filter, Users, DollarSign, ExternalLink,
  Clock, ShieldCheck, History, ArrowRight, UserCheck, AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface OverdueStudent {
  student_id: number;
  student_name: string;
  matricule: string;
  filiere: string;
  level: string;
  phone?: string | null;
  parent_name?: string | null;
  parent_phone?: string | null;
  total_due: number;
  total_paid: number;
  balance: number;
  reminder_count: number;
  last_reminder_at?: string | null;
  whatsapp_student_url?: string | null;
  whatsapp_parent_url?: string | null;
}

interface ReminderHistoryItem {
  id: number;
  student_id: number;
  student_name: string;
  matricule: string;
  channel: string;
  target: string;
  recipient_phone: string;
  recipient_name: string;
  amount_due: number;
  message: string;
  status: string;
  created_at: string;
}

export default function AccountantUnpaidPage() {
  const [students, setStudents] = useState<OverdueStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalUnpaidAmount, setTotalUnpaidAmount] = useState(0);
  const [withPhoneCount, setWithPhoneCount] = useState(0);
  const [withParentPhoneCount, setWithParentPhoneCount] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedFiliere, setSelectedFiliere] = useState('ALL');
  
  // Modale SMS Individuelle
  const [selectedStudentForSms, setSelectedStudentForSms] = useState<OverdueStudent | null>(null);
  const [smsTarget, setSmsTarget] = useState<'both' | 'parent' | 'student'>('both');
  const [customSmsMessage, setCustomSmsMessage] = useState('');
  const [isSendingSms, setIsSendingSms] = useState(false);

  // Modale Campagne Groupée
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkTarget, setBulkTarget] = useState<'both' | 'parent' | 'student'>('both');
  const [isSendingBulk, setIsSendingBulk] = useState(false);

  // Historique
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<ReminderHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [allFilieres, setAllFilieres] = useState<string[]>([]);
  const reqIdRef = useRef(0);

  useEffect(() => {
    loadUnpaidStudents();
  }, [selectedFiliere]);

  const loadUnpaidStudents = async () => {
    const curId = ++reqIdRef.current;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedFiliere !== 'ALL') params.append('filiere', selectedFiliere);
      if (search.trim()) params.append('search', search.trim());

      const res = await api.get(`/api/v1/reminders/unpaid-students?${params.toString()}`);
      if (curId !== reqIdRef.current) return; // Discard stale response
      const data = res.data;
      setStudents(data.students || []);
      setTotalUnpaidAmount(data.total_unpaid_amount || 0);
      setWithPhoneCount(data.with_student_phone_count || 0);
      setWithParentPhoneCount(data.with_parent_phone_count || 0);
      if (Array.isArray(data.all_filieres) && data.all_filieres.length > 0) {
        setAllFilieres(data.all_filieres);
      } else if (allFilieres.length === 0 && Array.isArray(data.students)) {
        const discovered = Array.from(new Set(data.students.map((s: any) => s.filiere).filter(Boolean)));
        if (discovered.length > 0) setAllFilieres(discovered as string[]);
      }
    } catch (err: any) {
      if (curId === reqIdRef.current) {
        toast.error('Erreur lors du chargement des impayés');
        setStudents([]);
      }
    } finally {
      if (curId === reqIdRef.current) {
        setLoading(false);
      }
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadUnpaidStudents();
  };

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      setIsHistoryModalOpen(true);
      const res = await api.get('/api/v1/reminders/history?limit=50');
      setHistoryItems(res.data || []);
    } catch (err) {
      toast.error("Impossible de charger l'historique des relances");
    } finally {
      setLoadingHistory(false);
    }
  };

  const openSmsModal = (student: OverdueStudent) => {
    setSelectedStudentForSms(student);
    setSmsTarget(student.parent_phone ? 'parent' : 'student');
    setCustomSmsMessage(
      `Rappel scolarité : Cher parent, un reliquat de ${new Intl.NumberFormat('fr-FR').format(student.balance)} FCFA reste dû pour ${student.student_name} (${student.filiere}). Merci de régulariser auprès du service comptabilité.`
    );
  };

  const handleSendSingleSms = async () => {
    if (!selectedStudentForSms) return;
    try {
      setIsSendingSms(true);
      const res = await api.post('/api/v1/reminders/send', {
        student_id: selectedStudentForSms.student_id,
        channel: 'sms',
        target: smsTarget,
        custom_message: customSmsMessage.trim() || undefined
      });
      toast.success(res.data?.message || 'Relance envoyée avec succès');
      setSelectedStudentForSms(null);
      loadUnpaidStudents();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message;
      toast.error(`Échec envoi : ${msg}`);
    } finally {
      setIsSendingSms(false);
    }
  };

  const handleSendBulkSms = async () => {
    try {
      setIsSendingBulk(true);
      const res = await api.post('/api/v1/reminders/bulk', {
        channel: 'sms',
        target: bulkTarget
      });
      toast.success(res.data?.message || 'Campagne groupée achevée avec succès');
      setIsBulkModalOpen(false);
      loadUnpaidStudents();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message;
      toast.error(`Échec campagne groupée : ${msg}`);
    } finally {
      setIsSendingBulk(false);
    }
  };

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('fr-FR').format(Math.round(val)) + ' FCFA';
  };

  const filieres = allFilieres.length > 0 
    ? allFilieres 
    : Array.from(new Set(students.map((s) => s.filiere).filter(Boolean)));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* En-tête de Page */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FF6B00] to-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20">
              <DollarSign size={22} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Relance des Impayés & Passerelle SMS / WhatsApp
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                Détection automatique des retards de scolarité et relance directe des parents et étudiants
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={loadHistory}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <History size={15} />
            <span>Historique des Envois</span>
          </button>

          <button
            onClick={() => setIsBulkModalOpen(true)}
            disabled={students.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-r from-[#FF6B00] to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-md shadow-orange-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <Send size={15} />
            <span>Campagne SMS Groupée ({students.length})</span>
          </button>
        </div>
      </div>

      {/* Cartes KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Total Reliquat Impayé</span>
            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950/40 text-red-600 flex items-center justify-center">
              <AlertCircle size={17} />
            </div>
          </div>
          <div className="text-2xl font-black text-red-600 dark:text-red-400">
            {formatMoney(totalUnpaidAmount)}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-medium">
            Sur l'ensemble des tranches et scolarités en retard
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Étudiants Concernés</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
              <Users size={17} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {students.length}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-medium">
            Étudiants avec solde débiteur &gt; 0 FCFA
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Parents Joignables</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
              <UserCheck size={17} />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {withParentPhoneCount} / {students.length}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-medium">
            {students.length > 0 ? Math.round((withParentPhoneCount / students.length) * 100) : 0}% des dossiers ont un contact parent
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Passerelle Télécom</span>
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
              <ShieldCheck size={17} />
            </div>
          </div>
          <div className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5 pt-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            SMS &amp; WhatsApp Actifs
          </div>
          <div className="text-xs text-slate-500 mt-1 font-medium">
            Format UEMOA (+223 Mali) &amp; international
          </div>
        </div>
      </div>

      {/* Barre de Recherche et Filtres */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom d'étudiant, prénom ou matricule..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 dark:bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Filtrer
          </button>
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={selectedFiliere}
            onChange={(e) => setSelectedFiliere(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            <option value="ALL">Toutes les filières</option>
            {filieres.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>

          <button
            onClick={loadUnpaidStudents}
            className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Rafraîchir"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-[#FF6B00]' : ''} />
          </button>
        </div>
      </div>

      {/* Tableau des Étudiants avec Impayés */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400 gap-3">
            <RefreshCw size={32} className="animate-spin text-[#FF6B00]" />
            <p className="text-sm font-semibold">Analyse comptable des impayés en cours...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            <CheckCircle2 size={44} className="mx-auto text-emerald-500 mb-3" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Aucun impayé détecté</h3>
            <p className="text-xs text-slate-400 mt-1">Tous les étudiants inscrits sont à jour de leurs règlements ou aucun critère ne correspond.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="px-5 py-4">Étudiant &amp; Matricule</th>
                  <th className="px-5 py-4">Filière / Niveau</th>
                  <th className="px-5 py-4">Contacts (Étudiant / Parent)</th>
                  <th className="px-5 py-4 text-right">Scolarité</th>
                  <th className="px-5 py-4 text-right">Reste à Payer</th>
                  <th className="px-5 py-4 text-center">Historique Relance</th>
                  <th className="px-5 py-4 text-right">Actions Rapides</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {students.map((st) => (
                  <tr key={st.student_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    
                    {/* Étudiant */}
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {st.student_name}
                      </div>
                      <div className="text-xs text-slate-400 font-mono">
                        {st.matricule}
                      </div>
                    </td>

                    {/* Filière & Niveau */}
                    <td className="px-5 py-4">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {st.filiere}
                      </span>
                      <div className="text-[11px] text-slate-400 font-medium">
                        {st.level}
                      </div>
                    </td>

                    {/* Contacts Téléphone */}
                    <td className="px-5 py-4 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400 w-12">Étu :</span>
                        {st.phone ? (
                          <span className="font-mono text-xs text-slate-800 dark:text-slate-200 font-semibold">
                            {st.phone}
                          </span>
                        ) : (
                          <span className="text-[11px] text-red-400 italic">Non renseigné</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] uppercase font-bold text-[#FF6B00] w-12">Parent :</span>
                        {st.parent_phone ? (
                          <span className="font-mono text-xs text-slate-800 dark:text-slate-200 font-semibold" title={st.parent_name || 'Parent'}>
                            {st.parent_phone}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Aucun parent</span>
                        )}
                      </div>
                    </td>

                    {/* Scolarité vs Payé */}
                    <td className="px-5 py-4 text-right">
                      <div className="text-xs text-slate-500 font-medium">
                        Dû : {formatMoney(st.total_due)}
                      </div>
                      <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                        Payé : {formatMoney(st.total_paid)}
                      </div>
                    </td>

                    {/* Reste à payer */}
                    <td className="px-5 py-4 text-right">
                      <span className="inline-block px-2.5 py-1 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 font-black text-xs sm:text-sm">
                        {formatMoney(st.balance)}
                      </span>
                    </td>

                    {/* Relances précédentes */}
                    <td className="px-5 py-4 text-center">
                      {st.reminder_count > 0 ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                            <Clock size={10} />
                            {st.reminder_count} relance{st.reminder_count > 1 ? 's' : ''}
                          </span>
                          {st.last_reminder_at && (
                            <div className="text-[10px] text-slate-400">
                              {new Date(st.last_reminder_at).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit'
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">
                          Jamais relancé
                        </span>
                      )}
                    </td>

                    {/* Actions de Relance */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        
                        {/* WhatsApp Parent */}
                        {st.whatsapp_parent_url ? (
                          <a
                            href={st.whatsapp_parent_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-2xs transition-colors cursor-pointer"
                            title={`Ouvrir WhatsApp direct pour relancer le parent (${st.parent_name || 'Parent'})`}
                          >
                            <MessageSquare size={13} />
                            <span>WhatsApp Parent</span>
                          </a>
                        ) : st.whatsapp_student_url ? (
                          <a
                            href={st.whatsapp_student_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-2xs transition-colors cursor-pointer"
                            title="Ouvrir WhatsApp direct étudiant"
                          >
                            <MessageSquare size={13} />
                            <span>WhatsApp</span>
                          </a>
                        ) : null}

                        {/* Modal SMS */}
                        <button
                          onClick={() => openSmsModal(st)}
                          disabled={!st.phone && !st.parent_phone}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-[#FF6B00] dark:bg-slate-800 dark:hover:bg-[#FF6B00] shadow-2xs transition-colors cursor-pointer disabled:opacity-40"
                          title="Envoyer un SMS personnalisé"
                        >
                          <Phone size={13} />
                          <span>SMS</span>
                        </button>

                        {/* Encaisser */}
                        <Link
                          href={`/accountant/payments?student_id=${st.student_id}`}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Encaisser un paiement"
                        >
                          <ArrowRight size={15} />
                        </Link>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ==================================================== */}
      {/* MODALE D'ENVOI SMS INDIVIDUEL */}
      {/* ==================================================== */}
      {selectedStudentForSms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 shadow-2xl space-y-4">
            
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Envoyer un SMS de Relance
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedStudentForSms.student_name} ({selectedStudentForSms.matricule}) • Solde : {formatMoney(selectedStudentForSms.balance)}
                </p>
              </div>
              <button
                onClick={() => setSelectedStudentForSms(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Choix Destinataire */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Destinataire(s) du SMS :
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setSmsTarget('parent')}
                  disabled={!selectedStudentForSms.parent_phone}
                  className={`p-2 rounded-xl border text-center font-bold cursor-pointer transition-all ${
                    smsTarget === 'parent'
                      ? 'border-[#FF6B00] bg-orange-50 text-[#FF6B00] dark:bg-orange-950/30'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  } disabled:opacity-40`}
                >
                  Parent seul
                  <div className="text-[10px] font-normal truncate">{selectedStudentForSms.parent_phone || 'N/A'}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSmsTarget('student')}
                  disabled={!selectedStudentForSms.phone}
                  className={`p-2 rounded-xl border text-center font-bold cursor-pointer transition-all ${
                    smsTarget === 'student'
                      ? 'border-[#FF6B00] bg-orange-50 text-[#FF6B00] dark:bg-orange-950/30'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  } disabled:opacity-40`}
                >
                  Étudiant seul
                  <div className="text-[10px] font-normal truncate">{selectedStudentForSms.phone || 'N/A'}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSmsTarget('both')}
                  disabled={!selectedStudentForSms.phone && !selectedStudentForSms.parent_phone}
                  className={`p-2 rounded-xl border text-center font-bold cursor-pointer transition-all ${
                    smsTarget === 'both'
                      ? 'border-[#FF6B00] bg-orange-50 text-[#FF6B00] dark:bg-orange-950/30'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  } disabled:opacity-40`}
                >
                  Les deux (Parent + Étu)
                </button>
              </div>
            </div>

            {/* Contenu du message */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Message SMS officiel :
                </label>
                <span className="text-slate-400 font-mono text-[11px]">
                  {customSmsMessage.length} car. ({Math.ceil(customSmsMessage.length / 160)} SMS)
                </span>
              </div>
              <textarea
                rows={4}
                value={customSmsMessage}
                onChange={(e) => setCustomSmsMessage(e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              />
            </div>

            {/* Boutons d'action */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedStudentForSms(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSendSingleSms}
                disabled={isSendingSms || !customSmsMessage.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-[#FF6B00] transition-colors shadow-md disabled:opacity-50 cursor-pointer"
              >
                {isSendingSms ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Envoi en cours...</span>
                  </>
                ) : (
                  <>
                    <Send size={13} />
                    <span>Envoyer le SMS maintenant</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODALE CAMPAGNE GROUPÉE (BULK SMS) */}
      {/* ==================================================== */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 shadow-2xl space-y-4">
            
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Send size={18} className="text-[#FF6B00]" />
                  Campagne SMS de Relance Groupée
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Envoi automatique à tous les débiteurs détectés
                </p>
              </div>
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-orange-50 dark:bg-orange-950/30 p-4 rounded-2xl border border-orange-200 dark:border-orange-900/40 text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
              <div className="font-bold text-[#FF6B00]">Récapitulatif de la campagne :</div>
              <div>• <strong>{students.length}</strong> étudiants avec solde débiteur</div>
              <div>• Montant total en attente : <strong>{formatMoney(totalUnpaidAmount)}</strong></div>
              <div>• Passerelle SMS : Expéditeur institutionnel de l'université</div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Cible prioritaire des SMS :
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setBulkTarget('both')}
                  className={`p-2.5 rounded-xl border text-center font-bold cursor-pointer transition-all ${
                    bulkTarget === 'both'
                      ? 'border-[#FF6B00] bg-orange-50 text-[#FF6B00] dark:bg-orange-950/30'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Parents &amp; Étudiants
                  <div className="text-[10px] font-normal text-slate-500">Relance maximale</div>
                </button>
                <button
                  type="button"
                  onClick={() => setBulkTarget('parent')}
                  className={`p-2.5 rounded-xl border text-center font-bold cursor-pointer transition-all ${
                    bulkTarget === 'parent'
                      ? 'border-[#FF6B00] bg-orange-50 text-[#FF6B00] dark:bg-orange-950/30'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Parents en priorité
                  <div className="text-[10px] font-normal text-slate-500">Tuteurs financiers</div>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSendBulkSms}
                disabled={isSendingBulk}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-[#FF6B00] to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-md shadow-orange-500/25 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSendingBulk ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Diffusion des SMS en cours...</span>
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span>Lancer la Campagne ({students.length} SMS)</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODALE HISTORIQUE DES RELANCES */}
      {/* ==================================================== */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <History size={18} className="text-[#FF6B00]" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Historique des Relances Envoyées (Derniers 50)
                </h3>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {loadingHistory ? (
                <div className="p-8 text-center text-slate-400">
                  <RefreshCw size={24} className="animate-spin mx-auto text-[#FF6B00] mb-2" />
                  <span>Chargement de l'historique...</span>
                </div>
              ) : historyItems.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-medium">
                  Aucune relance enregistrée dans l'historique.
                </div>
              ) : (
                historyItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs flex flex-col md:flex-row md:items-center justify-between gap-2"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {item.student_name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {item.matricule}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-100 text-[#FF6B00] dark:bg-orange-950/60">
                          {item.channel.toUpperCase()} • {item.target}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        Destinataire : <strong>{item.recipient_name}</strong> ({item.recipient_phone}) • Reliquat : <strong>{formatMoney(item.amount_due)}</strong>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 italic line-clamp-1">
                        "{item.message}"
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        {item.status}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-1">
                        {new Date(item.created_at).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 text-right border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
              >
                Fermer
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
