'use client';

import { useState, useEffect } from 'react';
import { 
  AlertCircle, Search, DollarSign, Users, Mail, ArrowLeft, 
  Loader2, RefreshCw, Send, CheckCircle2, ChevronRight 
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function AccountantUnpaidPage() {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [sendingReminder, setSendingReminder] = useState<number | null>(null);

  const loadUnpaid = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/students/');
      const studentsList = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      
      const studentsWithBalance = await Promise.all(
        studentsList.map(async (s: any) => {
          try {
            const payRes = await api.get(`/api/v1/payments/student/${s.id}/summary`);
            const summary = payRes.data || {};
            const totalDue = Number(summary.total_amount || s.net_tuition_amount || 0);
            const totalPaid = Number(summary.total_paid || 0);
            const balance = Math.max(0, totalDue - totalPaid);
            return {
              ...s,
              totalDue,
              totalPaid,
              balance,
              isBlocked: s.status === 'blocked' || balance > 0
            };
          } catch {
            return {
              ...s,
              totalDue: Number(s.net_tuition_amount || 0),
              totalPaid: 0,
              balance: Number(s.net_tuition_amount || 0),
              isBlocked: false
            };
          }
        })
      );

      // Filter only students with remaining balance
      setStudents(studentsWithBalance.filter(s => s.balance > 0));
    } catch (err) {
      toast.error('Erreur chargement des impayés');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUnpaid();
  }, []);

  const handleSendReminder = async (student: any) => {
    if (!student.user_id) {
      toast.error('Étudiant sans compte utilisateur actif');
      return;
    }
    setSendingReminder(student.id);
    try {
      await api.post('/api/v1/messages/', {
        recipient_id: student.user_id,
        subject: 'Rappel de reliquat de scolarité',
        content: `Bonjour ${student.first_name} ${student.last_name}, nous vous rappelons qu'un solde de ${student.balance.toLocaleString()} FCFA reste à régulariser pour vos frais de scolarité. Veuillez vous rapprocher du service comptabilité.`
      });
      toast.success(`Rappel envoyé à ${student.first_name}`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Erreur d'envoi du rappel");
    } finally {
      setSendingReminder(null);
    }
  };

  const filtered = students.filter(s => 
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    (s.matricule && s.matricule.toLowerCase().includes(search.toLowerCase())) ||
    (s.filiere && s.filiere.toLowerCase().includes(search.toLowerCase()))
  );

  const totalOutstanding = students.reduce((acc, s) => acc + s.balance, 0);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link 
            href="/accountant/dashboard" 
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-2 font-medium"
          >
            <ArrowLeft size={14} /> Retour au tableau de bord
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <AlertCircle className="text-red-500" size={26} />
            Gestion des Impayés & Reliquats
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Suivi des étudiants en retard de paiement et relances financières directes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadUnpaid}
            className="p-2.5 text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-xs"
            title="Actualiser"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-red-600 uppercase">Montant total impayé</p>
            <DollarSign className="text-red-500" size={20} />
          </div>
          <p className="text-xl sm:text-2xl font-black text-red-700 mt-2">
            {totalOutstanding.toLocaleString()} FCFA
          </p>
          <p className="text-xs text-red-500 mt-1">Sur l'ensemble des cohortes</p>
        </div>

        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-orange-600 uppercase">Étudiants concernés</p>
            <Users className="text-orange-500" size={20} />
          </div>
          <p className="text-xl sm:text-2xl font-black text-orange-700 mt-2">
            {students.length}
          </p>
          <p className="text-xs text-orange-500 mt-1">Dossiers avec reliquat &gt; 0</p>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-blue-600 uppercase">Action recommandée</p>
            <Mail className="text-blue-500" size={20} />
          </div>
          <p className="text-sm font-bold text-blue-800 mt-2">
            Relances automatiques
          </p>
          <p className="text-xs text-blue-600 mt-1">Envoi instantané par messagerie et notifications</p>
        </div>
      </div>

      {/* Recherche */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par étudiant, matricule ou filière..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] shadow-xs"
        />
      </div>

      {/* Liste des impayés */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-[#FF6B00] mb-2" />
          <p className="text-sm">Calcul des impayés en cours...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 bg-white border border-slate-200 rounded-2xl text-center p-6 shadow-xs">
          <CheckCircle2 size={40} className="mx-auto text-emerald-500 mb-3" />
          <p className="text-base font-semibold text-slate-800">Aucun impayé trouvé</p>
          <p className="text-xs text-slate-400 mt-1">
            {search ? 'Aucun résultat ne correspond à votre filtre.' : 'Toutes les scolarités sont à jour pour cette période.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="py-3 px-4">Étudiant</th>
                  <th className="py-3 px-4">Filière / Niveau</th>
                  <th className="py-3 px-4 text-right">Dû</th>
                  <th className="py-3 px-4 text-right">Déjà versé</th>
                  <th className="py-3 px-4 text-right">Reste à payer</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{s.first_name} {s.last_name}</div>
                      <div className="text-xs text-slate-400">{s.matricule || 'N/A'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <div>{s.filiere || 'Général'}</div>
                      <div className="text-xs text-slate-400">{s.level || 'L1'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                      {s.totalDue.toLocaleString()} FCFA
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-emerald-600">
                      {s.totalPaid.toLocaleString()} FCFA
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="font-bold text-red-600 text-sm">
                        {s.balance.toLocaleString()} FCFA
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleSendReminder(s)}
                        disabled={sendingReminder === s.id}
                        className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-[#FF6B00] border border-orange-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        {sendingReminder === s.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Send size={13} />
                        )}
                        <span>Relancer</span>
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
  );
}
